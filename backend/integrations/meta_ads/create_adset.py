"""
Criação de Ad Set via Facebook Business SDK oficial.
Suporte a targeting, pixel, scheduling e bid amount.
Compatível com CBO (Campaign Budget Optimization).
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


async def create_adset(
    access_token: str,
    account_id: str,
    campaign_id: str,
    name: str,
    bid_strategy: str,
    bid_amount: float | None,
    roas_floor: float | None,
    pixel_id: str,
    start_time: str,
    targeting: dict,
    status: str = "PAUSED",
    proxy_url: str | None = None,
) -> dict:
    """Cria um Ad Set vinculado a uma campanha CBO via SDK oficial."""
    api_bid_strategy = BID_STRATEGY_MAP.get(bid_strategy, "LOWEST_COST_WITHOUT_CAP")
    api_targeting = _build_targeting(targeting)

    logger.info(
        f"Targeting enviado à Meta: {api_targeting}"
    )

    params: dict = {
        "name": name,
        "campaign_id": campaign_id,
        "bid_strategy": api_bid_strategy,
        "optimization_goal": "OFFSITE_CONVERSIONS",
        "billing_event": "IMPRESSIONS",
        "status": status,
        "start_time": start_time,
        "promoted_object": {
            "pixel_id": pixel_id,
            "custom_event_type": "PURCHASE",
        },
        "targeting": api_targeting,
    }

    # Bid amount para BID_CAP / COST_CAP (em centavos)
    if bid_strategy in ("BID_CAP", "COST_CAP") and bid_amount:
        params["bid_amount"] = str(int(bid_amount * 100))

    # ROAS floor
    if bid_strategy == "ROAS" and roas_floor:
        roas_int = int(roas_floor * 100)
        params["bid_constraints"] = {"roas_average_floor": roas_int}

    logger.info(f"Criando Ad Set: {name} | Campaign: {campaign_id} | Strategy: {api_bid_strategy}")

    sdk = MetaSdkClient(access_token, account_id, proxy_url=proxy_url)
    result = await sdk.create_adset(params)

    if result["success"]:
        logger.info(f"Ad Set criado: {result['adset_id']}")
    else:
        logger.error(f"Erro ao criar Ad Set: {result['error']}")

    return result


def _build_targeting(targeting: dict) -> dict:
    """Constrói o objeto targeting para a API da Meta."""
    api_targeting: dict = {
        "age_min": targeting.get("age_min", 18),
        "age_max": targeting.get("age_max", 65),
    }

    # Países que exigem declaração regulatória e serão excluídos do worldwide
    EXCLUDED_COUNTRIES = ["TW", "SG", "IN"]  # Taiwan, Singapura, Índia

    # País: "WORLDWIDE" usa country_groups, caso contrário filtra por país
    country = targeting.get("country", "BR")
    if country and country != "WORLDWIDE":
        api_targeting["geo_locations"] = {"countries": [country]}
    else:
        api_targeting["geo_locations"] = {"country_groups": ["worldwide"]}
        api_targeting["excluded_geo_locations"] = {"countries": EXCLUDED_COUNTRIES}

    # Locales (idioma): lista vazia = todos os idiomas (não envia)
    locales = targeting.get("locales", [])
    if locales:
        api_targeting["locales"] = locales

    # Gênero: 0=all, 1=male, 2=female
    gender = targeting.get("genders", 0)
    if gender and gender != 0:
        api_targeting["genders"] = [gender]

    # Interesses (opcional)
    interests = targeting.get("interests", [])
    if interests:
        api_targeting["flexible_spec"] = [{
            "interests": [
                {"id": str(i["id"]), "name": i["name"]}
                for i in interests
            ]
        }]

    # Posicionamentos manuais (Ex: se não tiver ator do Instagram)
    if "publisher_platforms" in targeting:
        api_targeting["publisher_platforms"] = targeting["publisher_platforms"]
        if "facebook_positions" in targeting:
            api_targeting["facebook_positions"] = targeting["facebook_positions"]

    # Obrigatório desde a API v19+: habilitar ou desabilitar Advantage Audience
    # 1 = habilitado (Advantage+ audience ON), 0 = desabilitado (manual targeting)
    advantage_audience = targeting.get("advantage_audience", 1)
    api_targeting["targeting_automation"] = {"advantage_audience": advantage_audience}

    return api_targeting
