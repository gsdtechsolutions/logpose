"""
Endpoint para gerenciar o backfill de dados históricos do Facebook Ads.
Permite disparar o sync manual dos últimos N dias.
"""
import asyncio
import logging
from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import Optional

from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount
from api.auth.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/facebook", tags=["facebook"])


@router.post("/backfill")
async def trigger_backfill(
    background_tasks: BackgroundTasks,
    days: int = Query(default=90, ge=1, le=365),
    account_id: Optional[int] = Query(default=None, description="ID interno da conta. Se vazio, faz backfill de todas."),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Dispara backfill histórico em background.
    Busca dados diários dos últimos N dias para todas ou uma conta específica.
    """
    from jobs.sync_facebook_backfill import async_backfill_all, _backfill_account
    from database.core.timezone import now_sp
    from datetime import timedelta

    if account_id:
        account = db.query(FacebookAccount).filter(
            FacebookAccount.id == account_id,
            FacebookAccount.token_valid.is_(True),
        ).first()
        if not account:
            return {"error": "Conta não encontrada ou token inválido"}

        now = now_sp()
        date_end = now.strftime("%Y-%m-%d")
        date_start = (now - timedelta(days=days)).strftime("%Y-%m-%d")

        background_tasks.add_task(
            asyncio.run, _backfill_account(account, date_start, date_end)
        )

        return {
            "status": "started",
            "account_id": account.account_id,
            "days": days,
            "date_start": date_start,
            "date_end": date_end,
        }

    # Backfill de todas as contas
    background_tasks.add_task(asyncio.run, async_backfill_all(days))

    total_accounts = db.query(FacebookAccount).filter(
        FacebookAccount.token_valid.is_(True)
    ).count()

    return {
        "status": "started",
        "accounts": total_accounts,
        "days": days,
    }


@router.get("/backfill/status")
def backfill_status(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Retorna quantos dias de dados existem nas tabelas daily."""
    from database.models.facebook_daily_campaign import FacebookDailyCampaign
    from sqlalchemy import func

    row = db.query(
        func.min(FacebookDailyCampaign.date).label("oldest"),
        func.max(FacebookDailyCampaign.date).label("newest"),
        func.count(FacebookDailyCampaign.id).label("total_rows"),
    ).first()

    if not row or not row.oldest:
        return {"has_data": False, "total_rows": 0}

    return {
        "has_data": True,
        "oldest_date": str(row.oldest),
        "newest_date": str(row.newest),
        "total_rows": row.total_rows,
    }
