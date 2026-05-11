"""
Funções de gerenciamento do Meta Ads via Facebook Business SDK oficial.
- Toggle status (ACTIVE/PAUSED) de campanhas, adsets e ads
- Update budget (daily_budget) de campanhas e adsets
"""
import asyncio
import logging
from integrations.meta_ads.sdk_client import MetaSdkClient
from integrations.meta_ads.client import INITIAL_BACKOFF

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


async def toggle_entity_status(
    access_token: str,
    entity_id: str,
    entity_type: str,
    new_status: str,
    account_id: str = "0",
    proxy_url: str | None = None,
) -> dict:
    """
    Altera o status de uma entidade (campaign, adset, ad) via SDK.
    new_status: 'ACTIVE' ou 'PAUSED'
    """
    return await _execute_with_retry(
        access_token=access_token,
        account_id=account_id,
        entity_id=entity_id,
        entity_type=entity_type,
        params={"status": new_status},
        proxy_url=proxy_url,
        label=f"Toggle {entity_type} {entity_id}",
    )


async def update_budget(
    access_token: str,
    entity_id: str,
    entity_type: str,
    daily_budget_reais: float,
    account_id: str = "0",
    proxy_url: str | None = None,
) -> dict:
    """Atualiza o orçamento diário. Meta API espera valor em centavos."""
    budget_cents = int(daily_budget_reais * 100)

    return await _execute_with_retry(
        access_token=access_token,
        account_id=account_id,
        entity_id=entity_id,
        entity_type=entity_type,
        params={"daily_budget": str(budget_cents)},
        proxy_url=proxy_url,
        label=f"Budget {entity_type} {entity_id}",
    )


async def _execute_with_retry(
    access_token: str,
    account_id: str,
    entity_id: str,
    entity_type: str,
    params: dict,
    proxy_url: str | None,
    label: str,
) -> dict:
    """Executa update via SDK com retry simples para rate limit."""
    sdk = MetaSdkClient(access_token, account_id, proxy_url=proxy_url)

    for attempt in range(MAX_RETRIES):
        result = await sdk.update_entity(entity_id, entity_type, params)

        if result["success"]:
            return result

        # Verifica se é rate limit (mensagem padrão da Meta)
        error_msg = result.get("error", "")
        is_rate_limit = any(
            kw in error_msg.lower()
            for kw in ["rate limit", "too many calls", "please reduce"]
        )

        if is_rate_limit and attempt < MAX_RETRIES - 1:
            wait = INITIAL_BACKOFF * (2 ** attempt)
            logger.warning(f"{label}: Rate limit (tentativa {attempt+1}). Aguardando {wait}s")
            await asyncio.sleep(wait)
            continue

        logger.error(f"{label}: {error_msg}")
        return result

    return {"success": False, "error": "Rate limit persistente após retries"}
