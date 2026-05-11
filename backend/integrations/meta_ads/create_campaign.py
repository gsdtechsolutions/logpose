"""
Criação de campanha via Facebook Business SDK oficial.
CBO (Campaign Budget Optimization) com orçamento diário.
"""
import logging
from integrations.meta_ads.sdk_client import MetaSdkClient

logger = logging.getLogger(__name__)

# Mapeamento de estratégias de lance (UI → API)
BID_STRATEGY_MAP = {
    "VOLUME": "LOWEST_COST_WITHOUT_CAP",
    "BID_CAP": "LOWEST_COST_WITH_BID_CAP",
    "COST_CAP": "COST_CAP",
    "ROAS": "LOWEST_COST_WITH_MIN_ROAS",
}


async def create_campaign(
    access_token: str,
    account_id: str,
    name: str,
    daily_budget_reais: float,
    bid_strategy: str,
    status: str = "PAUSED",
    proxy_url: str | None = None,
) -> dict:
    """
    Cria uma campanha CBO com objetivo de vendas via SDK oficial.

    Returns:
        {"success": True, "campaign_id": "123"} ou {"success": False, "error": "..."}
    """
    budget_cents = int(daily_budget_reais * 100)
    api_bid_strategy = BID_STRATEGY_MAP.get(bid_strategy, "LOWEST_COST_WITHOUT_CAP")

    params = {
        "name": name,
        "objective": "OUTCOME_SALES",
        "status": status,
        "special_ad_categories": [],
        "daily_budget": str(budget_cents),
        "bid_strategy": api_bid_strategy,
    }

    logger.info(f"Criando campanha: {name} | Budget: R${daily_budget_reais} | Strategy: {bid_strategy}")

    sdk = MetaSdkClient(access_token, account_id, proxy_url=proxy_url)
    result = await sdk.create_campaign(params)

    if result["success"]:
        logger.info(f"Campanha criada: {result['campaign_id']}")
    else:
        logger.error(f"Erro ao criar campanha: {result['error']}")

    return result
