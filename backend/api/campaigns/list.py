"""
API principal de campanhas: cruza dados Meta Ads com transações do DB.
Retorna campanhas com métricas de Ad Spend + Vendas unificadas.
"""
import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount
from database.models.facebook_daily_campaign import FacebookDailyCampaign
from database.models.transaction import Transaction, TransactionStatus
from database.core.timezone import now_sp
from datetime import timedelta
from api.auth.deps import get_current_user
from api.campaigns.helpers import (
    parse_utm_campaign, parse_utm_medium, parse_utm_content, safe_division,
)
from api.campaigns.merge import merge_campaigns, merge_ads
from integrations.meta_ads.service import MetaAdsService
from integrations.meta_ads.client import MetaAuthError
from integrations.meta_ads.http_factory import get_proxy_url
from integrations.vturb.plays_by_utm import fetch_vturb_stats_by_campaign
from jobs.sync_facebook_ondemand import sync_facebook_if_needed
from jobs.query_facebook_daily import query_campaigns, query_adsets, query_ads

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("/data")
async def get_campaigns_data(
    date_start: str = Query(..., description="YYYY-MM-DD"),
    date_end: str = Query(..., description="YYYY-MM-DD"),
    account_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    force_sync: bool = Query(False, description="Forçar sincronização na Meta"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    fb_accounts = _get_fb_accounts(db, account_id)
    if not fb_accounts:
        return {"campaigns": [], "unidentified": _build_unidentified(db, date_start, date_end)}

    account_ids = [acc.account_id for acc in fb_accounts]

    # Sincronização inteligente sob demanda (respeita TTL e busca apenas o necessário)
    await sync_facebook_if_needed(db, fb_accounts, date_start, date_end, force=force_sync)

    meta_campaigns = query_campaigns(db, account_ids, date_start, date_end)
    meta_adsets = query_adsets(db, account_ids, date_start, date_end)
    meta_ads = query_ads(db, account_ids, date_start, date_end)
    last_sync_at = _get_last_sync(db, account_ids)

    if status_filter and status_filter != "all":
        meta_campaigns = [c for c in meta_campaigns if c.status == status_filter]
        valid_camp_ids = {c.id for c in meta_campaigns}
        meta_adsets = [a for a in meta_adsets if a.campaign_id in valid_camp_ids]
        valid_adset_ids = {a.id for a in meta_adsets}
        meta_ads = [a for a in meta_ads if a.ad_set_id in valid_adset_ids]

    transactions = _get_fb_transactions(db, date_start, date_end)
    campaigns = merge_campaigns(meta_campaigns, meta_adsets, meta_ads, transactions)

    # VTurb stats
    campaign_ids = [c["id"] for c in campaigns]
    campaign_names = [c["name"] for c in campaigns]
    try:
        stats_map = await fetch_vturb_stats_by_campaign(db, date_start, date_end, campaign_ids, campaign_names)
    except Exception as e:
        logger.warning(f"Erro ao buscar stats do VTurb: {e}")
        stats_map = {}

    _apply_vturb_stats(campaigns, stats_map)

    return {
        "campaigns": campaigns,
        "unidentified": _build_unidentified(db, date_start, date_end),
        "last_sync_at": last_sync_at,
    }


def _get_fb_accounts(db: Session, account_id: Optional[int]) -> list[FacebookAccount]:
    if account_id:
        acc = db.query(FacebookAccount).filter(
            FacebookAccount.id == account_id, FacebookAccount.token_valid.is_(True)
        ).first()
        return [acc] if acc else []
    return db.query(FacebookAccount).filter(FacebookAccount.token_valid.is_(True)).all()


def _get_last_sync(db: Session, account_ids: list[str]) -> Optional[str]:
    row = db.query(FacebookDailyCampaign.updated_at).filter(
        FacebookDailyCampaign.account_id.in_(account_ids)
    ).order_by(FacebookDailyCampaign.updated_at.desc()).first()
    return row.updated_at.isoformat() if row and row.updated_at else None




def _get_fb_transactions(db: Session, date_start: str, date_end: str) -> list[Transaction]:
    return db.query(Transaction).filter(
        Transaction.status == TransactionStatus.APPROVED,
        Transaction.created_at >= date_start,
        Transaction.created_at <= f"{date_end} 23:59:59",
    ).all()


def _apply_vturb_stats(campaigns: list[dict], stats_map: dict) -> None:
    for camp in campaigns:
        views, plays = 0, 0
        by_id = stats_map.get(camp["id"])
        if by_id:
            views += by_id["views"]
            plays += by_id["plays"]
        by_name = stats_map.get(camp["name"])
        if by_name:
            views += by_name["views"]
            plays += by_name["plays"]

        camp["views_vsl"] = views
        camp["plays_vsl"] = plays
        camp["play_rate"] = round((plays / views) * 100, 1) if views > 0 and plays > 0 else 0


def _build_unidentified(db: Session, date_start: str, date_end: str) -> dict:
    unid = db.query(Transaction).filter(
        Transaction.status == TransactionStatus.APPROVED,
        Transaction.created_at >= date_start,
        Transaction.created_at <= f"{date_end} 23:59:59",
        (Transaction.utm_campaign.is_(None)) | (Transaction.utm_campaign == ""),
    ).all()

    revenue = sum(t.amount for t in unid)
    products_map: dict[str, dict] = {}
    for t in unid:
        pname = t.product_name or "Sem produto"
        if pname not in products_map:
            products_map[pname] = {"name": pname, "sales": 0, "revenue": 0.0}
        products_map[pname]["sales"] += 1
        products_map[pname]["revenue"] += t.amount

    return {
        "id": "unidentified", "name": "Não identificado",
        "status": "unidentified", "objective": "", "budget_type": "CBO",
        "sales": len(unid), "revenue": revenue, "profit": revenue,
        "spend": 0, "budget": 0, "clicks": 0, "impressions": 0,
        "cpc": 0, "ctr": 0, "cpa": 0, "roas": 0,
        "landing_page_views": 0, "initiate_checkout": 0,
        "connect_rate": 0, "no_id_sales": 0,
        "views_vsl": 0, "plays_vsl": 0, "play_rate": 0,
        "products": list(products_map.values()),
    }
