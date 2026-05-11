"""
Upload de mídia (imagem/vídeo) via Facebook Business SDK oficial.
"""
import logging
from integrations.meta_ads.sdk_client import MetaSdkClient

logger = logging.getLogger(__name__)


async def upload_image(
    access_token: str,
    account_id: str,
    file_bytes: bytes,
    filename: str,
    proxy_url: str | None = None,
) -> dict:
    """
    Faz upload de uma imagem via SDK oficial.
    Retorna {"success": True, "image_hash": "..."} ou erro.
    """
    sdk = MetaSdkClient(access_token, account_id, proxy_url=proxy_url)
    return await sdk.upload_image(file_bytes, filename)


async def upload_video(
    access_token: str,
    account_id: str,
    file_bytes: bytes,
    filename: str,
    proxy_url: str | None = None,
) -> dict:
    """
    Faz upload de um vídeo via SDK oficial.
    Retorna {"success": True, "video_id": "..."} ou erro.
    """
    sdk = MetaSdkClient(access_token, account_id, proxy_url=proxy_url)
    return await sdk.upload_video(file_bytes, filename)
