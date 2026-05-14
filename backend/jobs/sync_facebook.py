import asyncio
import logging
import time
from datetime import timedelta
from sqlalchemy.orm import Session
from celery_app import celery_app

from database.core.connection import SessionLocal
from database.core.timezone import now_sp
from database.models.facebook_account import FacebookAccount
from database.models.facebook_cache import FacebookAdsCache
from integrations.meta_ads.service import MetaAdsService
from integrations.meta_ads.client import MetaAccountBlockedError
from integrations.meta_ads.http_factory import get_proxy_url

logger = logging.getLogger(__name__)

PRESETS = ["today", "yesterday", "3d", "7d", "14d", "30d", "90d"]

def _parse_date_range(preset: str):
    now = now_sp()
    if preset == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0), now
    elif preset == "yesterday":
        yesterday = now - timedelta(days=1)
        return yesterday.replace(hour=0, minute=0, second=0, microsecond=0), yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif preset == "3d":
        return now - timedelta(days=3), now
    elif preset == "7d":
        return now - timedelta(days=7), now
    elif preset == "14d":
        return now - timedelta(days=14), now
    elif preset == "30d":
        return now - timedelta(days=30), now
    elif preset == "90d":
        return now - timedelta(days=90), now
    return None, None

async def async_sync_all_accounts():
    db = SessionLocal()
    try:
        # Pega todas as contas ativas
        accounts = db.query(FacebookAccount).filter(FacebookAccount.token_valid.is_(True)).all()
        logger.info(f"Iniciando sync de {len(accounts)} contas Facebook Ads")

        for account in accounts:
            proxy = get_proxy_url(db, account.id)
            service = MetaAdsService(account.access_token, account.account_id, proxy_url=proxy)

            try:
                # Puxa para cada preset
                for preset in PRESETS:
                    d_start, d_end = _parse_date_range(preset)
                    if not d_start or not d_end:
                        continue
                    
                    ds_str = d_start.strftime("%Y-%m-%d")
                    de_str = d_end.strftime("%Y-%m-%d")

                    # Chama em paralelo os 3 níveis + account summary para esse preset
                    logger.info(f"Syncing account {account.account_id} for preset {preset} ({ds_str} to {de_str})")
                    
                    try:
                        # Timeout global de 120s para todo o processo de sync de um preset nesta conta.
                        # Evita Silent Hang caso a request congele de ponta a ponta sem disparar timeout http.
                        async def _fetch():
                            c, ad, a = await service.get_all_levels(ds_str, de_str)
                            s = await service.get_account_summary(ds_str, de_str)
                            return c, ad, a, s
                            
                        campaigns, adsets, ads, summary = await asyncio.wait_for(_fetch(), timeout=120.0)

                        # Converte Pydantic para dict
                        campaigns_data = [c.model_dump() for c in campaigns]
                        adsets_data = [a.model_dump() for a in adsets]
                        ads_data = [a.model_dump() for a in ads]
                        summary_data = summary.model_dump() if summary else {}

                        # Salva ou atualiza no banco
                        cache_entry = db.query(FacebookAdsCache).filter(
                            FacebookAdsCache.account_id == account.account_id,
                            FacebookAdsCache.date_preset == preset
                        ).first()

                        if not cache_entry:
                            cache_entry = FacebookAdsCache(
                                account_id=account.account_id,
                                date_preset=preset,
                            )
                            db.add(cache_entry)
                        
                        cache_entry.campaigns_data = campaigns_data
                        cache_entry.adsets_data = adsets_data
                        cache_entry.ads_data = ads_data
                        cache_entry.summary_data = summary_data
                        db.commit()

                    except MetaAccountBlockedError as e:
                        logger.error(f"Conta bloqueada/restrita: {account.account_id}. Parando sync para esta conta.")
                        break
                    except Exception as e:
                        logger.error(f"Erro ao fazer sync do preset {preset} para a conta {account.account_id}: {e}")

                    # Delay pequeno entre os presets para evitar bloqueio da conta
                    await asyncio.sleep(1)

                # Delay entre as contas
                await asyncio.sleep(2)

            finally:
                await service.close()
    except Exception as e:
        logger.error(f"Erro no job de sync_facebook: {e}")
    finally:
        db.close()


@celery_app.task(name="jobs.sync_facebook.sync_all_facebook_accounts")
def sync_all_facebook_accounts():
    """Tarefa Celery síncrona que roda a função assíncrona usando asyncio."""
    asyncio.run(async_sync_all_accounts())
