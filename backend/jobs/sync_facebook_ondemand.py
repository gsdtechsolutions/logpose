"""
Sincronização sob demanda (Lazy Sync) com TTL de 10 minutos para o Facebook Ads.
Elimina polling desnecessário e busca apenas dados de hoje (ou ontem+hoje na virada do dia).
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.core.timezone import now_sp
from database.models.facebook_account import FacebookAccount
from database.models.facebook_daily_campaign import FacebookDailyCampaign
from integrations.meta_ads.client import MetaAdsClient, MetaAuthError, MetaAccountBlockedError
from integrations.meta_ads.fetch_daily import (
    fetch_daily_campaigns, fetch_daily_adsets, fetch_daily_ads,
)
from jobs.sync_facebook_upsert import upsert_campaigns, upsert_adsets, upsert_ads

logger = logging.getLogger(__name__)

DEFAULT_TTL_MINUTES = 10


def get_last_sync_info(db: Session, account_ids: list[str]) -> tuple[Optional[datetime], Optional[str]]:
    """Retorna (último_timestamp_sync, data_do_registro_mais_recente)."""
    row = db.query(
        func.max(FacebookDailyCampaign.updated_at).label("last_updated"),
        func.max(FacebookDailyCampaign.date).label("last_date"),
    ).filter(
        FacebookDailyCampaign.account_id.in_(account_ids)
    ).first()

    if not row or not row.last_updated:
        return None, None

    last_date_str = row.last_date.strftime("%Y-%m-%d") if row.last_date else None
    return row.last_updated, last_date_str


def _minutes_since(dt: datetime) -> float:
    now = now_sp()
    if dt.tzinfo is not None and now.tzinfo is None:
        dt = dt.replace(tzinfo=None)
    elif dt.tzinfo is None and now.tzinfo is not None:
        now = now.replace(tzinfo=None)
    return (now - dt).total_seconds() / 60.0


async def _sync_single_account(
    db: Session, account: FacebookAccount, start_date: str, end_date: str,
) -> None:
    """Busca dados de uma conta diretamente na Meta (sem proxy) e salva via upsert."""
    client = MetaAdsClient(account.access_token, account.account_id, proxy_url=None)
    try:
        logger.info(f"⚡ [LAZY-SYNC] {account.account_id}: {start_date} → {end_date}")
        campaigns, adsets, ads = await asyncio.gather(
            fetch_daily_campaigns(client, start_date, end_date),
            fetch_daily_adsets(client, start_date, end_date),
            fetch_daily_ads(client, start_date, end_date),
        )

        if campaigns:
            upsert_campaigns(db, account.account_id, campaigns)
        if adsets:
            upsert_adsets(db, account.account_id, adsets)
        if ads:
            upsert_ads(db, account.account_id, ads)

        db.commit()
    except MetaAuthError:
        logger.warning(f"Token inválido: {account.account_id} — desativando conta")
        account.token_valid = False
        db.commit()
    except MetaAccountBlockedError:
        logger.error(f"Conta bloqueada na Meta: {account.account_id}")
    except Exception as e:
        logger.error(f"Erro no lazy-sync da conta {account.account_id}: {e}")
        db.rollback()
    finally:
        await client.close()


async def sync_facebook_if_needed(
    db: Session,
    fb_accounts: list[FacebookAccount],
    date_start: str,
    date_end: str,
    force: bool = False,
    ttl_minutes: int = DEFAULT_TTL_MINUTES,
) -> None:
    """
    Executa sincronização inteligente sob demanda:
    - Período puramente histórico (< hoje): usa dados do PostgreSQL (não bate na Meta).
    - Período inclui 'hoje' ou force=True:
      - Se sync recente (< 10 min): usa cache/banco.
      - Se expirado ou virada do dia: busca apenas hoje (ou ontem+hoje na 1ª abertura).
    """
    if not fb_accounts:
        return

    today = now_sp().date()
    today_str = today.strftime("%Y-%m-%d")
    yesterday_str = (today - timedelta(days=1)).strftime("%Y-%m-%d")

    # Se a consulta é estritamente no passado e não foi forçado, dados do banco são definitivos
    if date_end < today_str and not force:
        return

    account_ids = [acc.account_id for acc in fb_accounts]
    last_updated, last_date_str = get_last_sync_info(db, account_ids)

    # Verifica se o cache ainda é válido
    if not force and last_updated:
        mins = _minutes_since(last_updated)
        if mins < ttl_minutes and last_date_str == today_str:
            return

    # Determina o intervalo cirúrgico da busca
    if not last_updated or not last_date_str:
        # Primeira vez que sincroniza: busca desde date_start (ou até 90 dias atrás)
        ninety_days_ago = (today - timedelta(days=90)).strftime("%Y-%m-%d")
        sync_start = min(date_start, ninety_days_ago)
        sync_end = today_str
    elif last_date_str < today_str:
        # Virada de dia: inclui ontem para fechar os centavos/conversões finais e hoje
        sync_start = yesterday_str
        sync_end = today_str
    else:
        # Mesmo dia: atualiza apenas a data de hoje
        sync_start = today_str
        sync_end = today_str

    for account in fb_accounts:
        if account.token_valid:
            await _sync_single_account(db, account, sync_start, sync_end)
