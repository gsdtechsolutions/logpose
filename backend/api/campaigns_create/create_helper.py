"""
Helper para criar campanha completa em uma única conta.
SEQUENCIAL: Campaign → AdSets → Ads, um de cada vez com delays.
Evita burst de POSTs que causam bloqueio de conta na Meta.
"""
import asyncio
import logging
from integrations.meta_ads.create_campaign import create_campaign
from integrations.meta_ads.create_adset import create_adset
from api.campaigns_create.ads_batch import create_ads_batch

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}

# Delay entre operações POST à Meta API (segundos)
POST_DELAY = 2.0


async def create_for_single_account(
    token: str,
    act_id: str,
    data: dict,
    file_bytes_list: list[tuple[bytes, str, bool]],
    status: str,
    account_label: str = "",
    account_id_db: int = 0,
    proxy_url: str | None = None,
) -> dict:
    """Cria campanhas sequencialmente em uma conta.

    Cada campanha/adset é independente: erros em uma estrutura não
    impedem a criação das seguintes.
    """
    all_errors: list[str] = []
    campaign_count = max(1, int(data.get("campaign_count", 1)))
    adset_count = max(1, int(data.get("adset_count", 1)))
    total_ads_created = 0
    campaigns_created = 0
    first_campaign_id: str | None = None
    first_adset_id: str | None = None
    uploaded_media_cache: dict = {}

    acc_label = f"[{account_label}]" if account_label else ""

    for camp_i in range(campaign_count):
        camp_label = f"{acc_label}[Camp {camp_i + 1}/{campaign_count}]"
        campaign_name = data["campaign_name"]
        if campaign_count > 1:
            campaign_name = f"{campaign_name} #{camp_i + 1:02d}"

        camp_result = await create_campaign(
            access_token=token,
            account_id=act_id,
            name=campaign_name,
            daily_budget_reais=data["daily_budget"],
            bid_strategy=data.get("bid_strategy", "VOLUME"),
            status=status,
            proxy_url=proxy_url,
        )

        if not camp_result["success"]:
            err = f"{camp_label} Erro na campanha: {camp_result['error']}"
            logger.error(err)
            all_errors.append(err)
            # Erro fatal de campanha — não há como criar adsets sem ela
            continue

        campaign_id = camp_result["campaign_id"]
        campaigns_created += 1
        logger.info(f"{camp_label} Campanha criada: {campaign_id}")
        if first_campaign_id is None:
            first_campaign_id = campaign_id

        await asyncio.sleep(POST_DELAY)

        for adset_i in range(adset_count):
            adset_label = f"{camp_label}[CJ {adset_i + 1}/{adset_count}]"
            # Erros de adsets/ads são coletados localmente e não impedem os próximos
            local_errors: list[str] = []

            ads_created, adset_id = await _create_adset_with_ads(
                token=token,
                act_id=act_id,
                campaign_id=campaign_id,
                data=data,
                adset_i=adset_i,
                adset_count=adset_count,
                file_bytes_list=file_bytes_list,
                status=status,
                errors=local_errors,
                label=adset_label,
                proxy_url=proxy_url,
                uploaded_media_cache=uploaded_media_cache,
            )

            all_errors.extend(local_errors)

            if adset_id and first_adset_id is None:
                first_adset_id = adset_id
            total_ads_created += ads_created

            if adset_i < adset_count - 1:
                await asyncio.sleep(POST_DELAY)

    return {
        "campaigns_created": campaigns_created,
        "ads_created": total_ads_created,
        "first_campaign_id": first_campaign_id,
        "first_adset_id": first_adset_id,
        "errors": all_errors,
        "account_id_db": account_id_db,
        "account_label": account_label,
    }


async def _create_adset_with_ads(
    token: str,
    act_id: str,
    campaign_id: str,
    data: dict,
    adset_i: int,
    adset_count: int,
    file_bytes_list: list[tuple[bytes, str, bool]],
    status: str,
    errors: list[str],
    label: str,
    proxy_url: str | None = None,
    uploaded_media_cache: dict | None = None,
) -> tuple[int, str | None]:
    """Cria um adset e todos os ads dentro dele. Retorna (ads_created, adset_id)."""
    adset_name = data.get("adset_name", "Conjunto")
    if adset_count > 1:
        adset_name = f"{adset_name} #{adset_i + 1:02d}"

    targeting = dict(data.get("targeting", {}))
    ig_actor_id = data.get("instagram_actor_id")

    if not ig_actor_id or ig_actor_id == "none":
        targeting["publisher_platforms"] = ["facebook", "audience_network", "messenger"]

    adset_result = await create_adset(
        access_token=token,
        account_id=act_id,
        campaign_id=campaign_id,
        name=adset_name,
        bid_strategy=data.get("bid_strategy", "VOLUME"),
        bid_amount=data.get("bid_amount"),
        roas_floor=data.get("roas_floor"),
        pixel_id=data["pixel_id"],
        start_time=data["start_time"],
        targeting=targeting,
        status=status,
        proxy_url=proxy_url,
    )

    if not adset_result["success"]:
        errors.append(f"{label} Erro no conjunto: {adset_result['error']}")
        return 0, None

    adset_id = adset_result["adset_id"]
    logger.info(f"{label} Conjunto criado: {adset_id}")

    await asyncio.sleep(POST_DELAY)

    ads_created = await create_ads_batch(
        token=token,
        act_id=act_id,
        adset_id=adset_id,
        ads=data.get("ads", []),
        file_bytes_list=file_bytes_list,
        page_id=data.get("page_id", ""),
        instagram_actor_id=ig_actor_id,
        status=status,
        errors=errors,
        label=label,
        proxy_url=proxy_url,
        uploaded_media_cache=uploaded_media_cache,
    )

    return ads_created, adset_id
