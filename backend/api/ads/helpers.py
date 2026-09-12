"""
Helpers de agregação e cruzamento de dados de Anúncios.
Agrupa anúncios pelo nome através de campanhas e conjuntos diferentes.
"""
from collections import defaultdict
from typing import Any
from api.campaigns.helpers import parse_utm_content, safe_division
from database.models.transaction import Transaction


def group_ads_by_name(
    meta_ads: list[Any],
    adset_map: dict[str, Any],
    campaign_map: dict[str, Any],
    transactions: list[Transaction],
) -> list[dict[str, Any]]:
    """Agrupa anúncios com o mesmo nome e cruza com transações."""
    tx_by_id: dict[str, list[Transaction]] = defaultdict(list)
    tx_by_name: dict[str, list[Transaction]] = defaultdict(list)

    for tx in transactions:
        ad_name, ad_id = parse_utm_content(tx.utm_content)
        if ad_id:
            tx_by_id[ad_id].append(tx)
        elif ad_name:
            tx_by_name[ad_name.strip().lower()].append(tx)

    ads_grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for ad in meta_ads:
        adset = adset_map.get(ad.ad_set_id)
        campaign = campaign_map.get(adset.campaign_id) if adset else None
        camp_name = campaign.name if campaign else "Campanha"
        camp_id = campaign.id if campaign else ""
        adset_name = adset.name if adset else "Conjunto"
        act_id = getattr(campaign, "account_id", "") or getattr(ad, "account_id", "")

        matched_txs = list(tx_by_id.get(ad.id, []))
        sales = len(matched_txs)
        rev = sum(t.amount for t in matched_txs)
        inst_profit = rev - ad.spend
        inst_roas = safe_division(rev, ad.spend)
        inst_cpa = safe_division(ad.spend, sales) if sales > 0 else 0.0

        instance_data = {
            "id": ad.id,
            "name": ad.name,
            "status": ad.status,
            "ad_set_id": ad.ad_set_id,
            "ad_set_name": adset_name,
            "campaign_id": camp_id,
            "campaign_name": camp_name,
            "account_id": act_id,
            "spend": ad.spend,
            "clicks": ad.clicks,
            "impressions": ad.impressions,
            "cpc": ad.cpc,
            "ctr": ad.ctr,
            "landing_page_views": ad.landing_page_views,
            "initiate_checkout": ad.initiate_checkout,
            "connect_rate": ad.connect_rate,
            "sales": sales,
            "revenue": rev,
            "profit": inst_profit,
            "roas": inst_roas,
            "cpa": inst_cpa,
            "budget": getattr(ad, "budget", 0.0),
        }

        group_key = ad.name.strip().lower() if ad.name else f"ad_{ad.id}"
        ads_grouped[group_key].append(instance_data)

    results: list[dict[str, Any]] = []

    for group_key, instances in ads_grouped.items():
        primary_name = instances[0]["name"]
        primary_id = instances[0]["id"]
        group_ids = {inst["id"] for inst in instances}
        camp_names = list(dict.fromkeys(i["campaign_name"] for i in instances if i["campaign_name"]))

        all_tx_set: set[int] = set()
        matched_tx_list: list[Transaction] = []

        for ad_id in group_ids:
            for t in tx_by_id.get(ad_id, []):
                if t.id not in all_tx_set:
                    all_tx_set.add(t.id)
                    matched_tx_list.append(t)

        for t in tx_by_name.get(group_key, []):
            if t.id not in all_tx_set:
                all_tx_set.add(t.id)
                matched_tx_list.append(t)

        sales = len(matched_tx_list)
        rev = sum(t.amount for t in matched_tx_list)

        spend = sum(i["spend"] for i in instances)
        clicks = sum(i["clicks"] for i in instances)
        impressions = sum(i["impressions"] for i in instances)
        lpv = sum(i["landing_page_views"] for i in instances)
        ic = sum(i["initiate_checkout"] for i in instances)

        profit = rev - spend
        roas = safe_division(rev, spend)
        cpa = safe_division(spend, sales) if sales > 0 else 0.0
        cpc = safe_division(spend, clicks) if clicks > 0 else 0.0
        ctr = safe_division(clicks * 100, impressions) if impressions > 0 else 0.0
        connect_rate = safe_division(lpv * 100, clicks) if clicks > 0 else 0.0
        is_active = any(i["status"] == "active" for i in instances)

        results.append({
            "id": f"adgroup_{group_key.replace(' ', '_')[:40]}",
            "name": primary_name,
            "status": "active" if is_active else "paused",
            "spend": round(spend, 2),
            "revenue": round(rev, 2),
            "profit": round(profit, 2),
            "sales": sales,
            "roas": roas,
            "cpa": cpa,
            "cpc": cpc,
            "ctr": ctr,
            "clicks": clicks,
            "impressions": impressions,
            "landing_page_views": lpv,
            "initiate_checkout": ic,
            "connect_rate": connect_rate,
            "budget": sum(i["budget"] for i in instances),
            "instances_count": len(instances),
            "campaigns_count": len(camp_names),
            "campaign_names": camp_names,
            "instances": instances,
            "account_id": instances[0]["account_id"],
        })

    return results
