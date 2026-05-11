"""
Criação de Ad Creative + Ad via Facebook Business SDK oficial.
Suporte a imagem e vídeo com object_story_spec.
"""
import logging
from integrations.meta_ads.sdk_client import MetaSdkClient
from integrations.meta_ads.http_factory import create_http_client
from integrations.meta_ads.client import GRAPH_API_BASE

logger = logging.getLogger(__name__)


async def create_ad_creative(
    access_token: str,
    account_id: str,
    name: str,
    page_id: str,
    instagram_actor_id: str | None,
    link: str,
    primary_text: str,
    headline: str,
    description: str,
    cta_type: str,
    image_hash: str | None = None,
    image_url: str | None = None,
    video_id: str | None = None,
    url_tags: str = "",
    display_url: str = "",
    proxy_url: str | None = None,
) -> dict:
    """Cria um Ad Creative com imagem ou vídeo via SDK oficial."""
    # Resolve Instagram user ID
    ig_user_id = await _resolve_ig_id(
        access_token, account_id, instagram_actor_id, proxy_url,
    )

    story_spec: dict = {"page_id": page_id}
    if ig_user_id:
        story_spec["instagram_user_id"] = ig_user_id

    cta_value = {"link": link}
    if display_url:
        cta_value["link_caption"] = display_url

    if video_id:
        video_data: dict = {
            "video_id": video_id,
            "message": primary_text,
            "title": headline,
            "link_description": description,
            "call_to_action": {"type": cta_type, "value": cta_value},
        }
        if image_hash:
            video_data["image_hash"] = image_hash
        elif image_url:
            video_data["image_url"] = image_url
            
        story_spec["video_data"] = video_data
    else:
        link_data: dict = {
            "image_hash": image_hash,
            "link": link,
            "message": primary_text,
            "name": headline,
            "description": description,
            "call_to_action": {"type": cta_type, "value": cta_value},
        }
        story_spec["link_data"] = link_data

    params: dict = {
        "name": name,
        "object_story_spec": story_spec,
    }
    if url_tags:
        params["url_tags"] = url_tags

    logger.info(f"Criando Creative: {name} | Page: {page_id} | Video: {bool(video_id)}")

    sdk = MetaSdkClient(access_token, account_id, proxy_url=proxy_url)
    return await sdk.create_ad_creative(params)


async def create_ad(
    access_token: str,
    account_id: str,
    name: str,
    adset_id: str,
    creative_id: str,
    status: str = "PAUSED",
    proxy_url: str | None = None,
) -> dict:
    """Cria um Ad vinculado a um Ad Set e Creative via SDK oficial."""
    params = {
        "name": name,
        "adset_id": adset_id,
        "creative": {"creative_id": creative_id},
        "status": status,
    }

    logger.info(f"Criando Ad: {name} | AdSet: {adset_id} | Creative: {creative_id}")

    sdk = MetaSdkClient(access_token, account_id, proxy_url=proxy_url)
    return await sdk.create_ad(params)


async def _resolve_ig_id(
    access_token: str,
    account_id: str,
    instagram_actor_id: str | None,
    proxy_url: str | None,
) -> str | None:
    """Resolve o instagram_user_id a partir do actor_id fornecido."""
    if instagram_actor_id in ("", "none"):
        return None
    if instagram_actor_id and str(instagram_actor_id).isdigit():
        return instagram_actor_id
    if instagram_actor_id is not None:
        return None

    # Fallback: busca primeiro IG vinculado à conta
    act_id = account_id if account_id.startswith("act_") else f"act_{account_id}"
    url = f"{GRAPH_API_BASE}/{act_id}/instagram_accounts"
    params = {"access_token": access_token, "fields": "id,username", "limit": "1"}

    try:
        async with create_http_client(timeout=10.0, proxy_url=proxy_url) as http:
            resp = await http.get(url, params=params)
            if resp.status_code == 200:
                ig_list = resp.json().get("data", [])
                if ig_list:
                    ig_id = ig_list[0].get("id", "")
                    logger.info(f"Fallback IG: {ig_list[0].get('username')} ({ig_id})")
                    return ig_id
    except Exception as e:
        logger.warning(f"Erro ao buscar Instagram accounts: {e}")
    return None
