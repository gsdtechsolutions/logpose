"""
Busca dados da Meta Ads para o dashboard.
Reutiliza MetaAdsService configurado em campanhas.
Captura erros de autenticação e invalida tokens no banco.
"""
import logging
from typing import Optional
from sqlalchemy.orm import Session

from database.models.facebook_account import FacebookAccount
from integrations.meta_ads.service import MetaAdsService
from integrations.meta_ads.client import MetaAuthError
from integrations.meta_ads.schemas import AccountInsightsSummary, CampaignInsights
from integrations.meta_ads.http_factory import get_proxy_url
from database.models.facebook_cache import FacebookAdsCache

logger = logging.getLogger(__name__)


def get_fb_account(db: Session) -> Optional[FacebookAccount]:
    """Retorna a primeira conta FB com token válido."""
    return (
        db.query(FacebookAccount)
        .filter(FacebookAccount.token_valid.is_(True))
        .first()
    )


def _mark_token_invalid(db: Session, account: FacebookAccount) -> None:
    """Marca a conta como token inválido para suprimir futuras chamadas."""
    account.token_valid = False
    db.commit()
    logger.warning(
        f"Token da conta Facebook '{account.label}' ({account.account_id}) "
        "marcado como inválido. Atualize o token na página de integrações."
    )


async def fetch_meta_account_summary(
    db: Session,
    preset: str,
    date_start: str,
    date_end: str,
) -> tuple[Optional[AccountInsightsSummary], Optional[str]]:
    """
    Busca métricas agregadas das contas Meta Ads usando cache local preferencialmente.
    Soma os valores de todas as contas ativas.
    """
    fb_accounts = db.query(FacebookAccount).filter(FacebookAccount.token_valid.is_(True)).all()
    if not fb_accounts:
        has_invalid = db.query(FacebookAccount).filter(FacebookAccount.token_valid.is_(False)).first()
        if has_invalid:
            return None, "token_invalid"
        return None, None

    total_summary = AccountInsightsSummary(
        spend=0.0, impressions=0, clicks=0,
        landing_page_views=0, initiate_checkout=0
    )
    
    error_msg = None

    for fb in fb_accounts:
        # Tenta usar cache local se não for custom e existir no banco
        if preset != "custom":
            cache = db.query(FacebookAdsCache).filter(
                FacebookAdsCache.account_id == fb.account_id,
                FacebookAdsCache.date_preset == preset
            ).first()
            if cache and cache.summary_data is not None:
                print(f"✅ [CACHE] Account Summary obtido do Banco de Dados para a conta {fb.account_id} (Preset: {preset})", flush=True)
                # Ensure we handle empty dictionaries properly by not throwing an error if it's completely empty
                s_data = cache.summary_data if cache.summary_data else {}
                s = AccountInsightsSummary(**s_data)
                total_summary.spend += s.spend
                total_summary.impressions += s.impressions
                total_summary.clicks += s.clicks
                total_summary.landing_page_views += s.landing_page_views
                total_summary.initiate_checkout += s.initiate_checkout
                continue

        # Fallback on-demand se for custom ou cache não existir
        proxy = get_proxy_url(db, fb.id)
        service = MetaAdsService(fb.access_token, fb.account_id, proxy_url=proxy)
        try:
            print(f"🔥 [LIVE] Account Summary obtido AO VIVO da Meta para a conta {fb.account_id}", flush=True)
            s = await service.get_account_summary(date_start, date_end)
            if s:
                total_summary.spend += s.spend
                total_summary.impressions += s.impressions
                total_summary.clicks += s.clicks
                total_summary.landing_page_views += s.landing_page_views
                total_summary.initiate_checkout += s.initiate_checkout
        except MetaAuthError:
            _mark_token_invalid(db, fb)
            error_msg = "token_invalid"
        except Exception as e:
            logger.error(f"Erro ao buscar account summary da Meta para a conta {fb.account_id}: {e}")
        finally:
            await service.close()

    return total_summary, error_msg


async def fetch_meta_campaigns_for_dashboard(
    db: Session,
    preset: str,
    date_start: str,
    date_end: str,
) -> list[CampaignInsights]:
    """Busca campanhas de TODAS as contas Meta Ads para top campaigns do dashboard (usando cache)."""
    fb_accounts = db.query(FacebookAccount).filter(FacebookAccount.token_valid.is_(True)).all()
    if not fb_accounts:
        return []

    all_campaigns = []

    for fb in fb_accounts:
        if preset != "custom":
            cache = db.query(FacebookAdsCache).filter(
                FacebookAdsCache.account_id == fb.account_id,
                FacebookAdsCache.date_preset == preset
            ).first()
            if cache and cache.campaigns_data is not None:
                print(f"✅ [CACHE] Campanhas do Dashboard obtidas do Banco de Dados para a conta {fb.account_id} (Preset: {preset})", flush=True)
                all_campaigns.extend([CampaignInsights(**c) for c in cache.campaigns_data])
                continue

        proxy = get_proxy_url(db, fb.id)
        service = MetaAdsService(fb.access_token, fb.account_id, proxy_url=proxy)
        try:
            print(f"🔥 [LIVE] Campanhas do Dashboard obtidas AO VIVO da Meta para a conta {fb.account_id}", flush=True)
            campaigns = await service.get_campaigns(date_start, date_end)
            all_campaigns.extend(campaigns)
        except MetaAuthError:
            _mark_token_invalid(db, fb)
        except Exception as e:
            logger.error(f"Erro ao buscar campanhas da Meta para a conta {fb.account_id}: {e}")
        finally:
            await service.close()

    return all_campaigns
