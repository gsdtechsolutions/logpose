"""
Factory centralizada para criar httpx.AsyncClient com suporte a proxy.
Substitui todos os httpx.AsyncClient() espalhados pelo código.
"""
import httpx
from sqlalchemy.orm import Session
from database.models.proxy_settings import ProxySettings


def create_http_client(
    timeout: float = 30.0,
    proxy_url: str | None = None,
) -> httpx.AsyncClient:
    """Cria AsyncClient com proxy opcional (HTTP ou SOCKS5)."""
    kwargs: dict = {"timeout": timeout}
    if proxy_url:
        kwargs["proxy"] = proxy_url
    return httpx.AsyncClient(**kwargs)


def get_proxy_url(db: Session, account_id: int | None = None) -> str | None:
    """
    Busca proxy configurado. Prioridade:
    1. Proxy específico da conta (se account_id fornecido)
    2. Proxy global (facebook_account_id IS NULL)
    """
    if account_id:
        specific = db.query(ProxySettings).filter(
            ProxySettings.facebook_account_id == account_id,
            ProxySettings.enabled.is_(True),
        ).first()
        if specific:
            return specific.proxy_url

    global_proxy = db.query(ProxySettings).filter(
        ProxySettings.facebook_account_id.is_(None),
        ProxySettings.enabled.is_(True),
    ).first()
    return global_proxy.proxy_url if global_proxy else None
