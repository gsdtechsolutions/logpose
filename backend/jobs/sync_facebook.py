"""
Job de sync Facebook Ads com time_increment=1.
Busca dados de HOJE para cada conta ativa e faz upsert daily.
Sem activity gate — a Meta retorna vazio se não houver gasto.
"""
import asyncio
import logging

from celery_app import celery_app
from database.core.connection import SessionLocal
from database.core.timezone import now_sp
from database.models.facebook_account import FacebookAccount
from integrations.meta_ads.client import MetaAdsClient, MetaAccountBlockedError, MetaAuthError
from integrations.meta_ads.http_factory import get_proxy_url
from integrations.meta_ads.fetch_daily import (
    fetch_daily_campaigns, fetch_daily_adsets, fetch_daily_ads,
)
from jobs.sync_facebook_upsert import upsert_campaigns, upsert_adsets, upsert_ads

logger = logging.getLogger(__name__)


async def _sync_account_today(account: FacebookAccount, start_str: str, end_str: str) -> None:
    """
    Busca dados dos últimos dias para uma conta e faz upsert.
    Se não há gasto, a Meta retorna vazio — nada é salvo e segue em frente.
    """
    db = SessionLocal()
    client = MetaAdsClient(account.access_token, account.account_id, proxy_url=None)

    try:
        # 3 requests em paralelo (campaigns + adsets + ads) com time_increment=1
        campaigns, adsets, ads = await asyncio.gather(
            fetch_daily_campaigns(client, start_str, end_str),
            fetch_daily_adsets(client, start_str, end_str),
            fetch_daily_ads(client, start_str, end_str),
        )

        if not campaigns and not adsets and not ads:
            logger.info(f"⏭️  {account.account_id}: sem dados hoje, skipping upsert")
            return

        upsert_campaigns(db, account.account_id, campaigns)
        upsert_adsets(db, account.account_id, adsets)
        upsert_ads(db, account.account_id, ads)
        db.commit()

        logger.info(
            f"💾 {account.account_id}: "
            f"{len(campaigns)} camps | {len(adsets)} adsets | {len(ads)} ads"
        )

    except MetaAuthError:
        logger.warning(f"Token inválido: {account.account_id} — marcando como inválido")
        account.token_valid = False
        db.commit()
    except MetaAccountBlockedError:
        logger.error(f"Conta bloqueada: {account.account_id}")
    except Exception as e:
        logger.error(f"Erro sync {account.account_id}: {e}")
        db.rollback()
    finally:
        await client.close()
        db.close()


async def async_sync_today():
    """Sincroniza os últimos 3 dias para todas as contas ativas (3 requests por conta)."""
    from datetime import timedelta
    db = SessionLocal()
    end_str = now_sp().strftime("%Y-%m-%d")
    start_str = (now_sp() - timedelta(days=3)).strftime("%Y-%m-%d")

    try:
        accounts = db.query(FacebookAccount).filter(
            FacebookAccount.token_valid.is_(True)
        ).all()
        logger.info(f"🔄 Sync daily (3 dias): {len(accounts)} contas | {start_str} a {end_str}")

        for account in accounts:
            await _sync_account_today(account, start_str, end_str)
            await asyncio.sleep(1)  # Delay entre contas para respeitar rate limit

    except Exception as e:
        logger.error(f"Erro no job sync_today: {e}")
    finally:
        db.close()


@celery_app.task(name="jobs.sync_facebook.sync_all_facebook_accounts")
def sync_all_facebook_accounts():
    """Tarefa Celery que roda a cada 30 minutos."""
    asyncio.run(async_sync_today())
