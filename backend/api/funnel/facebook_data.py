"""
Busca dados agregados do Facebook para o funil.
Usa tabelas daily com sincronização inteligente sob demanda.
"""
import logging
from sqlalchemy.orm import Session
from database.models.facebook_account import FacebookAccount
from jobs.query_facebook_daily import query_account_summary, query_campaigns
from jobs.sync_facebook_ondemand import sync_facebook_if_needed

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
    Busca insights de todas as contas e soma métricas.
    Se campaign_ids fornecido, filtra apenas essas campanhas.
    """
    totals = {
        "reach": 0, "impressions": 0, "clicks": 0,
        "lpv": 0, "checkout": 0, "spend": 0.0,
    }

    if not accounts:
        return totals

    account_ids = [acc.account_id for acc in accounts]

    # Garante que os dados de hoje estão frescos (se hoje estiver no range)
    await sync_facebook_if_needed(db, accounts, date_start, date_end)

    if campaign_ids:
        metrics = _filter_by_campaigns_daily(db, account_ids, date_start, date_end, campaign_ids)
        if metrics:
            for key in totals:
                totals[key] += metrics.get(key, 0)
    else:
        summary = query_account_summary(db, account_ids, date_start, date_end)
        if summary.spend > 0:
            totals["reach"] = summary.impressions
            totals["impressions"] = summary.impressions
            totals["clicks"] = summary.clicks
            totals["lpv"] = summary.landing_page_views
            totals["checkout"] = summary.initiate_checkout
            totals["spend"] = summary.spend

    # Calcular derivados
    totals["ctr"] = (totals["clicks"] / totals["impressions"]) * 100 if totals["impressions"] > 0 else 0
    totals["cpm"] = (totals["spend"] / totals["impressions"]) * 1000 if totals["impressions"] > 0 else 0
    totals["cpc"] = totals["spend"] / totals["clicks"] if totals["clicks"] > 0 else 0

    return totals


def _filter_by_campaigns_daily(
    db: Session, account_ids: list[str], date_start: str, date_end: str,
    campaign_ids: list[str],
) -> dict | None:
    """Filtra campanhas daily por IDs e soma métricas."""
    campaigns = query_campaigns(db, account_ids, date_start, date_end)
    if not campaigns:
        return None

    ids_set = set(campaign_ids)
    result = {"reach": 0, "impressions": 0, "clicks": 0, "lpv": 0, "checkout": 0, "spend": 0.0}

    for c in campaigns:
        if c.id in ids_set:
            result["reach"] += c.impressions
            result["impressions"] += c.impressions
            result["clicks"] += c.clicks
            result["lpv"] += c.landing_page_views
            result["checkout"] += c.initiate_checkout
            result["spend"] += c.spend

    return result if result["spend"] > 0 else None
