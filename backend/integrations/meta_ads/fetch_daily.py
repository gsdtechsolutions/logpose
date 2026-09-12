"""
Busca insights diários com time_increment=1 para todos os níveis.
Retorna rows com date, permitindo armazenamento granular por dia.
"""
from integrations.meta_ads.client import MetaAdsClient
from integrations.meta_ads.helpers import (
    extract_action_value, safe_float, safe_int, calc_connect_rate,
)

CAMPAIGN_STRUCTURE = "id,name,status,daily_budget,lifetime_budget,objective,bid_strategy"
ADSET_STRUCTURE = "id,name,status,campaign_id,daily_budget,lifetime_budget"
AD_STRUCTURE = "id,name,status,adset_id"

INSIGHT_FIELDS = ",".join([
    "spend",
    "impressions",
    "inline_link_clicks",
    "inline_link_click_ctr",
    "cost_per_unique_inline_link_click",
    "actions",
    "date_start",
])


def _build_fields(structure: str, date_start: str, date_end: str) -> str:
    time_range = f'{{"since":"{date_start}","until":"{date_end}"}}'
    insights = (
        f"insights.time_range({time_range})"
        f".time_increment(1)"
        f"{{{INSIGHT_FIELDS}}}"
    )
    return f"{structure},{insights}"


async def fetch_daily_campaigns(
    client: MetaAdsClient, date_start: str, date_end: str,
) -> list[dict]:
    fields = _build_fields(CAMPAIGN_STRUCTURE, date_start, date_end)

    raw = await client._get_all_pages(
        f"{client.account_id}/campaigns",
        params={
            "fields": fields,
            "limit": "200",
            "effective_status": '["ACTIVE","PAUSED"]',
        },
    )

    results = []
    for camp in raw:
        insight_rows = camp.get("insights", {}).get("data", [])
        for row in insight_rows:
            results.append(_parse_campaign_row(camp, row))
    return results


async def fetch_daily_adsets(
    client: MetaAdsClient, date_start: str, date_end: str,
) -> list[dict]:
    fields = _build_fields(ADSET_STRUCTURE, date_start, date_end)

    raw = await client._get_all_pages(
        f"{client.account_id}/adsets",
        params={
            "fields": fields,
            "limit": "200",
            "effective_status": '["ACTIVE","PAUSED"]',
        },
    )

    results = []
    for adset in raw:
        insight_rows = adset.get("insights", {}).get("data", [])
        for row in insight_rows:
            results.append(_parse_adset_row(adset, row))
    return results


async def fetch_daily_ads(
    client: MetaAdsClient, date_start: str, date_end: str,
) -> list[dict]:
    fields = _build_fields(AD_STRUCTURE, date_start, date_end)

    raw = await client._get_all_pages(
        f"{client.account_id}/ads",
        params={
            "fields": fields,
            "limit": "200",
            "effective_status": '["ACTIVE","PAUSED"]',
        },
    )

    results = []
    for ad in raw:
        insight_rows = ad.get("insights", {}).get("data", [])
        for row in insight_rows:
            results.append(_parse_ad_row(ad, row))
    return results


def _parse_campaign_row(camp: dict, insight: dict) -> dict:
    actions = insight.get("actions", [])
    lpv = safe_int(extract_action_value(actions, "landing_page_view"))
    clicks = safe_int(insight.get("inline_link_clicks", 0))

    budget = safe_float(
        camp.get("daily_budget", 0) or camp.get("lifetime_budget", 0)
    ) / 100

    return {
        "campaign_id": camp.get("id", ""),
        "name": camp.get("name", ""),
        "status": _norm_status(camp.get("status", "")),
        "objective": _norm_objective(camp.get("objective", "")),
        "bid_strategy": _norm_bid(camp.get("bid_strategy", "")),
        "budget": budget,
        "date": insight.get("date_start", ""),
        "spend": safe_float(insight.get("spend", 0)),
        "impressions": safe_int(insight.get("impressions", 0)),
        "clicks": clicks,
        "cpc": safe_float(insight.get("cost_per_unique_inline_link_click", 0)),
        "ctr": safe_float(insight.get("inline_link_click_ctr", 0)),
        "landing_page_views": lpv,
        "initiate_checkout": safe_int(extract_action_value(actions, "omni_initiated_checkout")),
        "connect_rate": calc_connect_rate(lpv, clicks),
    }


def _parse_adset_row(adset: dict, insight: dict) -> dict:
    actions = insight.get("actions", [])
    lpv = safe_int(extract_action_value(actions, "landing_page_view"))
    clicks = safe_int(insight.get("inline_link_clicks", 0))

    budget = safe_float(
        adset.get("daily_budget", 0) or adset.get("lifetime_budget", 0)
    ) / 100

    return {
        "adset_id": adset.get("id", ""),
        "campaign_id": adset.get("campaign_id", ""),
        "name": adset.get("name", ""),
        "status": _norm_status(adset.get("status", "")),
        "budget": budget,
        "date": insight.get("date_start", ""),
        "spend": safe_float(insight.get("spend", 0)),
        "impressions": safe_int(insight.get("impressions", 0)),
        "clicks": clicks,
        "cpc": safe_float(insight.get("cost_per_unique_inline_link_click", 0)),
        "ctr": safe_float(insight.get("inline_link_click_ctr", 0)),
        "landing_page_views": lpv,
        "initiate_checkout": safe_int(extract_action_value(actions, "omni_initiated_checkout")),
        "connect_rate": calc_connect_rate(lpv, clicks),
    }


def _parse_ad_row(ad: dict, insight: dict) -> dict:
    actions = insight.get("actions", [])
    lpv = safe_int(extract_action_value(actions, "landing_page_view"))
    clicks = safe_int(insight.get("inline_link_clicks", 0))

    return {
        "ad_id": ad.get("id", ""),
        "adset_id": ad.get("adset_id", ""),
        "name": ad.get("name", ""),
        "status": _norm_status(ad.get("status", "")),
        "date": insight.get("date_start", ""),
        "spend": safe_float(insight.get("spend", 0)),
        "impressions": safe_int(insight.get("impressions", 0)),
        "clicks": clicks,
        "cpc": safe_float(insight.get("cost_per_unique_inline_link_click", 0)),
        "ctr": safe_float(insight.get("inline_link_click_ctr", 0)),
        "landing_page_views": lpv,
        "initiate_checkout": safe_int(extract_action_value(actions, "omni_initiated_checkout")),
        "connect_rate": calc_connect_rate(lpv, clicks),
    }


STATUS_MAP = {"ACTIVE": "active", "PAUSED": "paused", "DELETED": "completed", "ARCHIVED": "completed"}
OBJECTIVE_MAP = {
    "OUTCOME_SALES": "sales", "OUTCOME_TRAFFIC": "traffic",
    "OUTCOME_ENGAGEMENT": "engagement", "OUTCOME_LEADS": "leads",
    "OUTCOME_AWARENESS": "awareness", "OUTCOME_APP_PROMOTION": "app_promotion",
    "CONVERSIONS": "sales", "LINK_CLICKS": "traffic",
    "POST_ENGAGEMENT": "engagement", "LEAD_GENERATION": "leads",
    "BRAND_AWARENESS": "awareness", "REACH": "awareness",
    "VIDEO_VIEWS": "engagement", "MESSAGES": "engagement",
    "APP_INSTALLS": "app_promotion", "PRODUCT_CATALOG_SALES": "sales",
    "STORE_VISITS": "traffic",
}
BID_MAP = {
    "LOWEST_COST_WITHOUT_CAP": "volume", "LOWEST_COST_WITH_BID_CAP": "bid_cap",
    "COST_CAP": "cost_cap", "LOWEST_COST_WITH_MIN_ROAS": "roas",
}


def _norm_status(raw: str) -> str:
    return STATUS_MAP.get(raw, "paused")


def _norm_objective(raw: str) -> str:
    return OBJECTIVE_MAP.get(raw, raw.lower() if raw else "other")


def _norm_bid(raw: str) -> str:
    return BID_MAP.get(raw, raw.lower() if raw else "volume")
