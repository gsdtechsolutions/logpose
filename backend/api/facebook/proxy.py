"""
CRUD de proxy para requisições à Meta API.
Suporta proxy global (sem vínculo com conta) ou por conta.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.core.connection import get_db
from database.models.proxy_settings import ProxySettings
from api.auth.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/facebook", tags=["facebook"])


class ProxyCreate(BaseModel):
    proxy_url: str
    proxy_type: str = "http"


class ProxyResponse(BaseModel):
    id: int
    proxy_url: str
    proxy_type: str
    enabled: bool

    class Config:
        from_attributes = True


@router.get("/proxy", response_model=ProxyResponse | None)
def get_proxy(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Retorna o proxy global configurado (ou None)."""
    proxy = db.query(ProxySettings).filter(
        ProxySettings.facebook_account_id.is_(None),
    ).first()
    return proxy


@router.post("/proxy", response_model=ProxyResponse)
def save_proxy(
    payload: ProxyCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Salva ou atualiza o proxy global (upsert)."""
    payload.proxy_url = _normalize_proxy_url(payload.proxy_url, payload.proxy_type)
    _validate_proxy_url(payload.proxy_url)

    existing = db.query(ProxySettings).filter(
        ProxySettings.facebook_account_id.is_(None),
    ).first()

    if existing:
        existing.proxy_url = payload.proxy_url
        existing.proxy_type = payload.proxy_type
        existing.enabled = True
    else:
        existing = ProxySettings(
            proxy_url=payload.proxy_url,
            proxy_type=payload.proxy_type,
            enabled=True,
        )
        db.add(existing)

    db.commit()
    db.refresh(existing)
    logger.info(f"Proxy salvo: {payload.proxy_type}://***@...")
    return existing


@router.delete("/proxy", status_code=204)
def delete_proxy(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Remove o proxy global."""
    proxy = db.query(ProxySettings).filter(
        ProxySettings.facebook_account_id.is_(None),
    ).first()
    if proxy:
        db.delete(proxy)
        db.commit()


@router.post("/proxy/test")
async def test_proxy(
    payload: ProxyCreate,
    _=Depends(get_current_user),
):
    """Testa conexão do proxy fazendo um GET simples à Graph API."""
    from integrations.meta_ads.http_factory import create_http_client

    url = _normalize_proxy_url(payload.proxy_url, payload.proxy_type)
    _validate_proxy_url(url)

    try:
        async with create_http_client(
            timeout=10.0, proxy_url=url,
        ) as client:
            resp = await client.get("https://graph.facebook.com/v25.0/me")
            return {
                "success": True,
                "status_code": resp.status_code,
                "message": "Proxy conectou com sucesso à Meta API",
            }
    except Exception as e:
        logger.warning(f"Teste de proxy falhou: {e}")
        return {
            "success": False,
            "message": f"Falha na conexão: {str(e)}",
        }


def _normalize_proxy_url(url: str, proxy_type: str = "http") -> str:
    """Auto-adiciona scheme se o usuário não informou."""
    url = url.strip()
    if not url:
        return url
    if not any(url.startswith(p) for p in ("http://", "https://", "socks5://")):
        scheme = "socks5" if proxy_type == "socks5" else "http"
        url = f"{scheme}://{url}"
    return url


def _validate_proxy_url(url: str) -> None:
    """Valida formato do proxy URL."""
    valid_prefixes = ("http://", "https://", "socks5://")
    if not url.startswith(valid_prefixes):
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Use: http://user:pass@host:port ou socks5://user:pass@host:port",
        )
