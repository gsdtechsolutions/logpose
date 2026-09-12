"""
Módulo de leitura dos dados daily do Facebook.
Agrega rows por date range e retorna no formato esperado pelos schemas existentes.
Substitui a leitura direta do FacebookAdsCache (JSONB).
"""
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.models.facebook_daily_campaign import FacebookDailyCampaign
from database.models.facebook_daily_adset import FacebookDailyAdset
from database.models.facebook_daily_ad import FacebookDailyAd
from integrations.meta_ads.schemas import (
    CampaignInsights, AdSetInsights, AdInsights, AccountInsightsSummary,
)
from integrations.meta_ads.helpers import calc_connect_rate


def query_campaigns(
    db: Session, account_ids: list[str], date_start: str, date_end: str,
) -> list[CampaignInsights]:
    """Agrega campanhas por date range, somando métricas daily."""
    rows = db.query(
        FacebookDailyCampaign.campaign_id,
        func.max(FacebookDailyCampaign.account_id).label("account_id"),
        func.max(FacebookDailyCampaign.name).label("name"),
        func.max(FacebookDailyCampaign.status).label("status"),
        func.max(FacebookDailyCampaign.objective).label("objective"),
        func.max(FacebookDailyCampaign.bid_strategy).label("bid_strategy"),
        func.max(FacebookDailyCampaign.budget).label("budget"),
        func.sum(FacebookDailyCampaign.spend).label("spend"),
        func.sum(FacebookDailyCampaign.impressions).label("impressions"),
        func.sum(FacebookDailyCampaign.clicks).label("clicks"),
        func.sum(FacebookDailyCampaign.landing_page_views).label("landing_page_views"),
        func.sum(FacebookDailyCampaign.initiate_checkout).label("initiate_checkout"),
    ).filter(
        FacebookDailyCampaign.account_id.in_(account_ids),
        FacebookDailyCampaign.date >= date_start,
        FacebookDailyCampaign.date <= date_end,
    ).group_by(
        FacebookDailyCampaign.campaign_id,
    ).all()

    results = []
    for r in rows:
        clicks = r.clicks or 0
        spend = r.spend or 0.0
        impressions = r.impressions or 0
        lpv = r.landing_page_views or 0

        results.append(CampaignInsights(
            id=r.campaign_id,
            account_id=r.account_id or "",
            name=r.name or "",
            status=r.status or "paused",
            objective=r.objective or "",
            bid_strategy=r.bid_strategy or "volume",
            budget=r.budget or 0.0,
            spend=spend,
            clicks=clicks,
            impressions=impressions,
            cpc=round(spend / clicks, 2) if clicks > 0 else 0.0,
            ctr=round((clicks / impressions) * 100, 2) if impressions > 0 else 0.0,
            landing_page_views=lpv,
            initiate_checkout=r.initiate_checkout or 0,
            connect_rate=calc_connect_rate(lpv, clicks),
        ))
    return results


def query_adsets(
    db: Session, account_ids: list[str], date_start: str, date_end: str,
) -> list[AdSetInsights]:
    """Agrega adsets por date range."""
    rows = db.query(
        FacebookDailyAdset.adset_id,
        func.max(FacebookDailyAdset.campaign_id).label("campaign_id"),
        func.max(FacebookDailyAdset.name).label("name"),
        func.max(FacebookDailyAdset.status).label("status"),
        func.max(FacebookDailyAdset.budget).label("budget"),
        func.sum(FacebookDailyAdset.spend).label("spend"),
        func.sum(FacebookDailyAdset.impressions).label("impressions"),
        func.sum(FacebookDailyAdset.clicks).label("clicks"),
        func.sum(FacebookDailyAdset.landing_page_views).label("landing_page_views"),
        func.sum(FacebookDailyAdset.initiate_checkout).label("initiate_checkout"),
    ).filter(
        FacebookDailyAdset.account_id.in_(account_ids),
        FacebookDailyAdset.date >= date_start,
        FacebookDailyAdset.date <= date_end,
    ).group_by(
        FacebookDailyAdset.adset_id,
    ).all()

    results = []
    for r in rows:
        clicks = r.clicks or 0
        spend = r.spend or 0.0
        impressions = r.impressions or 0
        lpv = r.landing_page_views or 0

        results.append(AdSetInsights(
            id=r.adset_id,
            campaign_id=r.campaign_id or "",
            name=r.name or "",
            status=r.status or "paused",
            budget=r.budget or 0.0,
            spend=spend,
            clicks=clicks,
            impressions=impressions,
            cpc=round(spend / clicks, 2) if clicks > 0 else 0.0,
            ctr=round((clicks / impressions) * 100, 2) if impressions > 0 else 0.0,
            landing_page_views=lpv,
            initiate_checkout=r.initiate_checkout or 0,
            connect_rate=calc_connect_rate(lpv, clicks),
        ))
    return results


def query_ads(
    db: Session, account_ids: list[str], date_start: str, date_end: str,
) -> list[AdInsights]:
    """Agrega ads por date range."""
    rows = db.query(
        FacebookDailyAd.ad_id,
        func.max(FacebookDailyAd.adset_id).label("adset_id"),
        func.max(FacebookDailyAd.name).label("name"),
        func.max(FacebookDailyAd.status).label("status"),
        func.sum(FacebookDailyAd.spend).label("spend"),
        func.sum(FacebookDailyAd.impressions).label("impressions"),
        func.sum(FacebookDailyAd.clicks).label("clicks"),
        func.sum(FacebookDailyAd.landing_page_views).label("landing_page_views"),
        func.sum(FacebookDailyAd.initiate_checkout).label("initiate_checkout"),
    ).filter(
        FacebookDailyAd.account_id.in_(account_ids),
        FacebookDailyAd.date >= date_start,
        FacebookDailyAd.date <= date_end,
    ).group_by(
        FacebookDailyAd.ad_id,
    ).all()

    results = []
    for r in rows:
        clicks = r.clicks or 0
        spend = r.spend or 0.0
        impressions = r.impressions or 0
        lpv = r.landing_page_views or 0

        results.append(AdInsights(
            id=r.ad_id,
            ad_set_id=r.adset_id or "",
            name=r.name or "",
            status=r.status or "paused",
            spend=spend,
            clicks=clicks,
            impressions=impressions,
            cpc=round(spend / clicks, 2) if clicks > 0 else 0.0,
            ctr=round((clicks / impressions) * 100, 2) if impressions > 0 else 0.0,
            landing_page_views=lpv,
            initiate_checkout=r.initiate_checkout or 0,
            connect_rate=calc_connect_rate(lpv, clicks),
        ))
    return results


def query_account_summary(
    db: Session, account_ids: list[str], date_start: str, date_end: str,
) -> AccountInsightsSummary:
    """Agrega todas as campanhas para resumo de conta."""
    row = db.query(
        func.sum(FacebookDailyCampaign.spend).label("spend"),
        func.sum(FacebookDailyCampaign.impressions).label("impressions"),
        func.sum(FacebookDailyCampaign.clicks).label("clicks"),
        func.sum(FacebookDailyCampaign.landing_page_views).label("lpv"),
        func.sum(FacebookDailyCampaign.initiate_checkout).label("checkout"),
    ).filter(
        FacebookDailyCampaign.account_id.in_(account_ids),
        FacebookDailyCampaign.date >= date_start,
        FacebookDailyCampaign.date <= date_end,
    ).first()

    if not row or not row.spend:
        return AccountInsightsSummary()

    clicks = row.clicks or 0
    spend = row.spend or 0.0
    impressions = row.impressions or 0

    return AccountInsightsSummary(
        spend=spend,
        clicks=clicks,
        impressions=impressions,
        cpc=round(spend / clicks, 2) if clicks > 0 else 0.0,
        ctr=round((clicks / impressions) * 100, 2) if impressions > 0 else 0.0,
        landing_page_views=row.lpv or 0,
        initiate_checkout=row.checkout or 0,
    )
