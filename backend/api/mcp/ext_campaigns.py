"""
External API: Campanhas via API Key.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from database.core.connection import get_db
from database.models.admin import Admin
from database.models.transaction import Transaction, TransactionStatus
from api.mcp.auth import get_api_key_user
from api.campaigns.merge import merge_campaigns, merge_ads
from api.campaigns.helpers import safe_division
from integrations.meta_ads.service import MetaAdsService
from integrations.meta_ads.client import MetaAuthError
from integrations.meta_ads.http_factory import get_proxy_url
from database.models.facebook_account import FacebookAccount

router = APIRouter(prefix="/external/campaigns", tags=["external"])


@router.get("/data")
async def ext_campaigns_data(
    date_start: str = Query(..., description="YYYY-MM-DD"),
    date_end: str = Query(..., description="YYYY-MM-DD"),
    account_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, description="ACTIVE | PAUSED | ARCHIVED"),
    db: Session = Depends(get_db),
    _user: Admin = Depends(get_api_key_user),
):
    """Lista campanhas com métricas de Meta Ads + vendas cruzadas."""
    fb_account = db.query(FacebookAccount).filter(
        FacebookAccount.token_valid.is_(True)
    ).first() if not account_id else db.query(FacebookAccount).filter(
        FacebookAccount.id == account_id,
        FacebookAccount.token_valid.is_(True),
    ).first()

    if not fb_account:
        return {"campaigns": [], "error": "no_account"}

    proxy = get_proxy_url(db, fb_account.id)
    service = MetaAdsService(fb_account.access_token, fb_account.account_id, proxy_url=proxy)
    try:
        meta_campaigns, meta_adsets, meta_ads = await service.get_all_levels(date_start, date_end)
    except MetaAuthError:
        await service.close()
        return {"campaigns": [], "error": "token_invalid"}
    except Exception as e:
        await service.close()
        return {"campaigns": [], "error": str(e)}
    finally:
        await service.close()

    transactions = db.query(Transaction).filter(
        Transaction.status == TransactionStatus.APPROVED,
        Transaction.created_at >= date_start,
        Transaction.created_at <= f"{date_end} 23:59:59",
    ).all()

    campaigns = merge_campaigns(meta_campaigns, meta_adsets, meta_ads, transactions)

    if status_filter and status_filter != "all":
        campaigns = [c for c in campaigns if c["status"] == status_filter]

    return {"campaigns": campaigns}


@router.get("/summary")
def ext_campaigns_summary(
    date_start: str = Query(...),
    date_end: str = Query(...),
    db: Session = Depends(get_db),
    _user: Admin = Depends(get_api_key_user),
):
    """Resumo agregado de todas as campanhas no período."""
    approved = db.query(Transaction).filter(
        Transaction.status == TransactionStatus.APPROVED,
        Transaction.created_at >= date_start,
        Transaction.created_at <= f"{date_end} 23:59:59",
    ).all()

    total_revenue = sum(t.amount for t in approved)
    by_campaign: dict[str, dict] = {}
    for t in approved:
        key = t.utm_campaign or "sem_campanha"
        if key not in by_campaign:
            by_campaign[key] = {"campaign": key, "sales": 0, "revenue": 0.0}
        by_campaign[key]["sales"] += 1
        by_campaign[key]["revenue"] += t.amount

    return {
        "total_sales": len(approved),
        "total_revenue": total_revenue,
        "by_campaign": sorted(by_campaign.values(), key=lambda x: x["revenue"], reverse=True),
    }
