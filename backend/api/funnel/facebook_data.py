import logging
from sqlalchemy.orm import Session
from integrations.meta_ads.service import MetaAdsService
from integrations.meta_ads.http_factory import get_proxy_url
from database.models.facebook_account import FacebookAccount
from database.models.facebook_cache import FacebookAdsCache

logger = logging.getLogger(__name__)


async def fetch_facebook_aggregated(
    db: Session,
    preset: str,
    accounts: list[FacebookAccount],
    date_start: str,
    date_end: str,
    campaign_ids: list[str] | None = None,
) -> dict:
    """
    Busca insights de todas as contas do Facebook e soma
    as métricas (reach, impressions, clicks, lpv, initiate_checkout, spend, ctr, cpm).
    Se campaign_ids for fornecido, filtra apenas essas campanhas.
    """
    totals = {
        "reach": 0, "impressions": 0, "clicks": 0,
        "lpv": 0, "checkout": 0, "spend": 0.0,
    }

    for account in accounts:
        try:
            used_cache = False
            metrics = None

            if preset != "custom":
                cache = db.query(FacebookAdsCache).filter(
                    FacebookAdsCache.account_id == account.account_id,
                    FacebookAdsCache.date_preset == preset
                ).first()
                
                if cache:
                    if campaign_ids:
                        if cache.campaigns_data is not None:
                            print(f"✅ [CACHE] Funil obtido do Banco de Dados para a conta {account.account_id} (Filtrado)", flush=True)
                            metrics = {
                                "reach": 0, "impressions": 0, "clicks": 0,
                                "lpv": 0, "checkout": 0, "spend": 0.0,
                            }
                            ids_set = set(campaign_ids)
                            for c in cache.campaigns_data:
                                if c.get("id") in ids_set:
                                    metrics["reach"] += c.get("impressions", 0)
                                    metrics["impressions"] += c.get("impressions", 0)
                                    metrics["clicks"] += c.get("clicks", 0)
                                    metrics["lpv"] += c.get("landing_page_views", 0)
                                    metrics["checkout"] += c.get("initiate_checkout", 0)
                                    metrics["spend"] += c.get("spend", 0.0)
                            used_cache = True
                    else:
                        if cache.summary_data is not None:
                            print(f"✅ [CACHE] Funil obtido do Banco de Dados para a conta {account.account_id} (Geral)", flush=True)
                            s = cache.summary_data if cache.summary_data else {}
                            metrics = {
                                "reach": s.get("impressions", 0),
                                "impressions": s.get("impressions", 0),
                                "clicks": s.get("clicks", 0),
                                "lpv": s.get("landing_page_views", 0),
                                "checkout": s.get("initiate_checkout", 0),
                                "spend": s.get("spend", 0.0),
                            }
                            used_cache = True

            if not used_cache:
                print(f"🔥 [LIVE] Funil obtido AO VIVO da Meta para a conta {account.account_id}", flush=True)
                proxy = get_proxy_url(db, account.id)
                service = MetaAdsService(account.access_token, account.account_id, proxy_url=proxy)
                if campaign_ids:
                    metrics = await _fetch_filtered_by_campaigns(
                        service, date_start, date_end, campaign_ids,
                    )
                else:
                    summary = await service.get_account_summary(date_start, date_end)
                    metrics = {
                        "reach": summary.impressions,
                        "impressions": summary.impressions,
                        "clicks": summary.clicks,
                        "lpv": summary.landing_page_views,
                        "checkout": summary.initiate_checkout,
                        "spend": summary.spend,
                    }
                await service.close()

            if metrics:
                for key in totals:
                    totals[key] += metrics.get(key, 0)

        except Exception as e:
            logger.warning(
                f"Falha ao buscar dados do Facebook para {account.label}: {e}"
            )
            continue

    # Calcular CTR e CPM derivados
    totals["ctr"] = (
        (totals["clicks"] / totals["impressions"]) * 100
        if totals["impressions"] > 0 else 0
    )
    totals["cpm"] = (
        (totals["spend"] / totals["impressions"]) * 1000
        if totals["impressions"] > 0 else 0
    )
    totals["cpc"] = (
        totals["spend"] / totals["clicks"]
        if totals["clicks"] > 0 else 0
    )

    return totals


async def _fetch_filtered_by_campaigns(
    service: MetaAdsService,
    date_start: str,
    date_end: str,
    campaign_ids: list[str],
) -> dict:
    """Busca métricas somadas apenas das campanhas especificadas."""
    campaigns = await service.get_campaigns(date_start, date_end)

    filtered = [c for c in campaigns if c.id in set(campaign_ids)]
    result = {
        "reach": 0, "impressions": 0, "clicks": 0,
        "lpv": 0, "checkout": 0, "spend": 0.0,
    }

    for c in filtered:
        result["reach"] += c.impressions
        result["impressions"] += c.impressions
        result["clicks"] += c.clicks
        result["lpv"] += c.landing_page_views
        result["checkout"] += c.initiate_checkout
        result["spend"] += c.spend

    return result
