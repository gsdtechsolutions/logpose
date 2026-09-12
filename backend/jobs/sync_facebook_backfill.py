"""
Job de backfill: puxa os últimos 90 dias com time_increment=1.
Executado manualmente via API ou automaticamente na primeira vez.
"""
import asyncio
import logging
from datetime import timedelta

from celery_app import celery_app
from database.core.connection import SessionLocal
from database.core.timezone import now_sp
from database.models.facebook_account import FacebookAccount
from database.models.facebook_daily_campaign import FacebookDailyCampaign
from integrations.meta_ads.client import MetaAdsClient, MetaAccountBlockedError
from integrations.meta_ads.http_factory import get_proxy_url
from integrations.meta_ads.fetch_daily import (
    fetch_daily_campaigns, fetch_daily_adsets, fetch_daily_ads,
)
from jobs.sync_facebook_upsert import upsert_campaigns, upsert_adsets, upsert_ads

logger = logging.getLogger(__name__)

BACKFILL_DAYS = 90


async def _backfill_account(account: FacebookAccount, date_start: str, date_end: str):
    """Busca dados históricos de uma conta de forma direta e paralela."""
    db = SessionLocal()
    client = MetaAdsClient(account.access_token, account.account_id, proxy_url=None)

    try:
        logger.info(f"📦 Backfill {account.account_id}: {date_start} → {date_end}")

        campaigns, adsets, ads = await asyncio.gather(
            fetch_daily_campaigns(client, date_start, date_end),
            fetch_daily_adsets(client, date_start, date_end),
            fetch_daily_ads(client, date_start, date_end),
        )

        if campaigns:
            upsert_campaigns(db, account.account_id, campaigns)
        if adsets:
            upsert_adsets(db, account.account_id, adsets)
        if ads:
            upsert_ads(db, account.account_id, ads)

        db.commit()
        logger.info(
            f"  ✅ Backfill salvo: {len(campaigns)} camps, {len(adsets)} adsets, {len(ads)} ads"
        )

    except MetaAccountBlockedError:
        logger.error(f"Conta bloqueada no backfill: {account.account_id}")
    except Exception as e:
        logger.error(f"Erro backfill {account.account_id}: {e}")
        db.rollback()
    finally:
        await client.close()
        db.close()


async def async_backfill_all(days: int = BACKFILL_DAYS):
    """Backfill de todas as contas ativas."""
    db = SessionLocal()
    now = now_sp()
    date_end = now.strftime("%Y-%m-%d")
    date_start = (now - timedelta(days=days)).strftime("%Y-%m-%d")

    try:
        accounts = db.query(FacebookAccount).filter(
            FacebookAccount.token_valid.is_(True)
        ).all()
        logger.info(f"📦 Backfill iniciando: {len(accounts)} contas, {days} dias")

        for account in accounts:
            await _backfill_account(account, date_start, date_end)
            await asyncio.sleep(3)

    except Exception as e:
        logger.error(f"Erro geral no backfill: {e}")
    finally:
        db.close()


async def async_backfill_if_needed():
    """Backfill apenas se a tabela estiver vazia (primeira execução)."""
    db = SessionLocal()
    try:
        has_data = db.query(FacebookDailyCampaign).first()
        if has_data:
            logger.info("📦 Backfill: já existem dados, pulando")
            return
        await async_backfill_all()
    finally:
        db.close()


@celery_app.task(name="jobs.sync_facebook_backfill.backfill_facebook_accounts")
def backfill_facebook_accounts(days: int = BACKFILL_DAYS):
    """Task Celery para backfill manual."""
    asyncio.run(async_backfill_all(days))
