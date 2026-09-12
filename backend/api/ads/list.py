"""
API principal de anúncios: agrupa e consolida métricas de anúncios por nome
cruzando dados do Meta Ads com transações do DB.
"""
import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount
from database.models.facebook_daily_campaign import FacebookDailyCampaign
from database.models.transaction import Transaction, TransactionStatus
from api.auth.deps import get_current_user
from api.ads.helpers import group_ads_by_name
from jobs.sync_facebook_ondemand import sync_facebook_if_needed
from jobs.query_facebook_daily import query_campaigns, query_adsets, query_ads

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ads", tags=["ads"])


@router.get("/data")
async def get_ads_data(
    date_start: str = Query(..., description="YYYY-MM-DD"),
    date_end: str = Query(..., description="YYYY-MM-DD"),
    account_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    force_sync: bool = Query(False, description="Forçar sincronização na Meta"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Retorna anúncios consolidados por nome com métricas de gasto e vendas."""
    fb_accounts = _get_fb_accounts(db, account_id)
    if not fb_accounts:
        return {"ads": [], "last_sync_at": None}

    account_ids = [acc.account_id for acc in fb_accounts]

    await sync_facebook_if_needed(db, fb_accounts, date_start, date_end, force=force_sync)

    meta_campaigns = query_campaigns(db, account_ids, date_start, date_end)
    meta_adsets = query_adsets(db, account_ids, date_start, date_end)
    meta_ads = query_ads(db, account_ids, date_start, date_end)
    last_sync_at = _get_last_sync(db, account_ids)

    if status_filter and status_filter != "all":
        meta_ads = [a for a in meta_ads if a.status == status_filter]

    adset_map = {a.id: a for a in meta_adsets}
    campaign_map = {c.id: c for c in meta_campaigns}
    transactions = _get_fb_transactions(db, date_start, date_end)

    ads = group_ads_by_name(meta_ads, adset_map, campaign_map, transactions)

    return {
        "ads": ads,
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
