"""
Wrapper do Facebook Business SDK oficial.
Usado para operações de ESCRITA (POST) — criação de campanhas, adsets, ads.
O SDK envia headers de telemetria que a Meta reconhece como "oficiais".

Como o SDK é síncrono (usa requests), todas as chamadas devem ser
executadas via asyncio.to_thread() para não bloquear o event loop.
"""
import os
import asyncio
import logging
import tempfile
import warnings
import requests as requests_lib
from typing import Any

# Suprimir avisos benignos da SDK da Meta sobre compatibilidade de tipos.
# O SDK valida contra seu schema interno mas ainda executa a chamada corretamente.
warnings.filterwarnings("ignore", category=UserWarning, module="facebook_business")

from facebook_business.api import FacebookAdsApi
from facebook_business.session import FacebookSession
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.adobjects.adimage import AdImage
from facebook_business.adobjects.advideo import AdVideo
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)

META_APP_ID = os.getenv("META_APP_ID", "")
META_APP_SECRET = os.getenv("META_APP_SECRET", "")


class MetaSdkClient:
    """
    Client baseado no SDK oficial da Meta.
    Cada instância é isolada (não usa global state).
    """

    def __init__(
        self,
        access_token: str,
        account_id: str,
        proxy_url: str | None = None,
    ):
        self._access_token = access_token
        self._account_id = (
            account_id if account_id.startswith("act_")
            else f"act_{account_id}"
        )
        self._proxy_url = proxy_url
        self._api = self._init_api()
        self._account = AdAccount(self._account_id, api=self._api)

    def _init_api(self) -> FacebookAdsApi:
        """Inicializa SDK com session isolada (não global) + proxy."""
        session = FacebookSession(
            META_APP_ID or None,
            META_APP_SECRET or None,
            self._access_token,
        )
        if self._proxy_url:
            # Cria uma requests.Session pré-configurada com proxy
            proxy_session = requests_lib.Session()
            proxy_session.proxies = {
                "http": self._proxy_url,
                "https": self._proxy_url,
            }
            # Injeta no FacebookSession via atributo interno
            session._requests = proxy_session
        return FacebookAdsApi(session)

    async def create_campaign(self, params: dict) -> dict:
        """Cria campanha via SDK. Retorna {success, campaign_id} ou {success, error}."""
        return await self._run(
            lambda: self._account.create_campaign(params=params),
            id_field="id",
            result_key="campaign_id",
            label="campanha",
        )

    async def create_adset(self, params: dict) -> dict:
        """Cria ad set via SDK."""
        return await self._run(
            lambda: self._account.create_ad_set(params=params),
            id_field="id",
            result_key="adset_id",
            label="ad set",
        )

    async def create_ad_creative(self, params: dict) -> dict:
        """Cria ad creative via SDK."""
        return await self._run(
            lambda: self._account.create_ad_creative(params=params),
            id_field="id",
            result_key="creative_id",
            label="creative",
        )

    async def create_ad(self, params: dict) -> dict:
        """Cria ad via SDK."""
        return await self._run(
            lambda: self._account.create_ad(params=params),
            id_field="id",
            result_key="ad_id",
            label="ad",
        )

    async def upload_image(self, file_bytes: bytes, filename: str) -> dict:
        """Upload de imagem via SDK. Retorna {success, image_hash}."""
        def _upload():
            with tempfile.NamedTemporaryFile(
                suffix=f".{filename.rsplit('.', 1)[-1]}", delete=False
            ) as f:
                f.write(file_bytes)
                temp_path = f.name

            try:
                image = self._account.create_ad_image(
                    params={"filename": temp_path}
                )
                img_hash = image.get("hash")
                if not img_hash and hasattr(image, "export_all_data"):
                    img_hash = image.export_all_data().get("hash")
                return img_hash or image.get("id")
            finally:
                import os as _os
                _os.unlink(temp_path)

        try:
            image_hash = await asyncio.to_thread(_upload)
            logger.info(f"Imagem uploaded via SDK: {filename} → {image_hash}")
            return {"success": True, "image_hash": image_hash}
        except FacebookRequestError as e:
            return {"success": False, "error": _parse_sdk_error(e)}
        except Exception as e:
            logger.error(f"Erro upload imagem SDK: {e}")
            return {"success": False, "error": str(e)}

    async def upload_video(self, file_bytes: bytes, filename: str) -> dict:
        """Upload de vídeo via SDK com Chunked Upload para evitar timeout. Retorna {success, video_id}."""
        def _upload():
            import os as _os
            file_size = len(file_bytes)
            
            # Start Phase
            try:
                res_start = self._account.create_ad_video(params={
                    "upload_phase": "start",
                    "file_size": file_size,
                })
                # Facebook SDK retorna um objeto com as propriedades
                session_id = res_start.get("upload_session_id")
                video_id = res_start.get("video_id")
                start_offset = int(res_start.get("start_offset", 0))
                end_offset = int(res_start.get("end_offset", file_size))
                
                # Se não retornou session_id, cai pro fallback
                if not session_id:
                    raise ValueError("Nenhum upload_session_id retornado na fase start")
                    
            except Exception as e:
                # Se falhar o start ou a API for incompatível, usa o upload tradicional de fallback
                logger.warning(f"Chunked upload start falhou ({e}), usando fallback tradicional...")
                with tempfile.NamedTemporaryFile(
                    suffix=f".{filename.rsplit('.', 1)[-1]}", delete=False
                ) as f:
                    f.write(file_bytes)
                    temp_path = f.name
                try:
                    video = self._account.create_ad_video(params={"filepath": temp_path})
                    vid_id = None
                    if hasattr(video, "get_id"):
                        vid_id = video.get_id()
                    if not vid_id:
                        vid_id = video.get("id")
                    if not vid_id and hasattr(video, "export_all_data"):
                        vid_id = video.export_all_data().get("id")
                    return vid_id or str(video)
                finally:
                    _os.unlink(temp_path)

            # Transfer Phase
            while start_offset < file_size:
                chunk_bytes = file_bytes[start_offset:end_offset]
                
                with tempfile.NamedTemporaryFile(delete=False) as f_chunk:
                    f_chunk.write(chunk_bytes)
                    chunk_path = f_chunk.name
                    
                try:
                    res_transfer = self._account.create_ad_video(params={
                        "upload_phase": "transfer",
                        "upload_session_id": session_id,
                        "start_offset": start_offset,
                        "video_file_chunk": chunk_path,
                    })
                    start_offset = int(res_transfer.get("start_offset", start_offset))
                    end_offset = int(res_transfer.get("end_offset", end_offset))
                finally:
                    _os.unlink(chunk_path)

            # Finish Phase
            self._account.create_ad_video(params={
                "upload_phase": "finish",
                "upload_session_id": session_id,
            })
            
            return video_id

        try:
            video_id = await asyncio.to_thread(_upload)
            
            # Gera um thumbnail em branco 1x1 (fallback) para satisfazer a API da Meta
            # que exige um image_hash ou image_url no video_data.
            import base64
            blank_png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")
            fallback_hash = None
            try:
                img_res = await self.upload_image(blank_png, "fallback_thumb.png")
                if img_res.get("success"):
                    fallback_hash = img_res.get("image_hash")
            except Exception:
                pass
                
            logger.info(f"Vídeo uploaded via SDK: {filename} → {video_id} (hash: {fallback_hash})")
            return {"success": True, "video_id": video_id, "image_hash": fallback_hash}
        except FacebookRequestError as e:
            return {"success": False, "error": _parse_sdk_error(e)}
        except Exception as e:
            logger.error(f"Erro upload vídeo SDK: {e}")
            return {"success": False, "error": str(e)}

    async def update_entity(
        self, entity_id: str, entity_type: str, params: dict,
    ) -> dict:
        """Atualiza status/budget de uma entidade via SDK."""
        entity_map = {"campaign": Campaign, "adset": AdSet, "ad": Ad}
        EntityClass = entity_map.get(entity_type)
        if not EntityClass:
            return {"success": False, "error": f"Tipo desconhecido: {entity_type}"}

        def _update():
            entity = EntityClass(entity_id, api=self._api)
            entity.api_update(params=params)

        try:
            await asyncio.to_thread(_update)
            return {"success": True}
        except FacebookRequestError as e:
            return {"success": False, "error": _parse_sdk_error(e)}

    async def _run(
        self, fn, id_field: str, result_key: str, label: str,
    ) -> dict:
        """Executa operação síncrona do SDK em thread separada."""
        try:
            result = await asyncio.to_thread(fn)
            
            obj_id = None
            if hasattr(result, "get_id"):
                obj_id = result.get_id()
                
            if not obj_id and hasattr(result, "get"):
                obj_id = result.get(id_field)
                
            if not obj_id:
                try:
                    obj_id = result[id_field]
                except (KeyError, TypeError, AttributeError):
                    pass
                    
            if not obj_id:
                # Caso extremo, extrai via json/export se disponivel
                if hasattr(result, "export_all_data"):
                    data = result.export_all_data()
                    obj_id = data.get(id_field)

            if not obj_id:
                obj_id = str(result)
            else:
                obj_id = str(obj_id)
                
            logger.info(f"{label} criado via SDK: {obj_id}")
            return {"success": True, result_key: obj_id}
        except FacebookRequestError as e:
            error_msg = _parse_sdk_error(e)
            logger.error(f"Erro SDK ao criar {label}: {error_msg}")
            return {"success": False, "error": error_msg}


def _parse_sdk_error(e: FacebookRequestError) -> str:
    """Extrai mensagem amigável do erro do SDK."""
    user_msg = e.api_error_message() or ""
    try:
        body = e.body()
        if isinstance(body, dict):
            user_msg = (
                body.get("error", {}).get("error_user_msg")
                or body.get("error", {}).get("message")
                or user_msg
            )
    except Exception:
        pass
    return user_msg or f"Erro {e.http_status()} da Meta API"
