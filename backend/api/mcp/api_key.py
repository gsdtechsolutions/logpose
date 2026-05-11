"""
Endpoints para gerenciar API Keys do usuário (1 por admin).
Permite gerar, visualizar e revogar a chave.
"""
import secrets
import hashlib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database.core.connection import get_db
from database.models.admin import Admin
from database.models.api_key import ApiKey
from api.auth.deps import get_current_user

router = APIRouter(prefix="/mcp", tags=["mcp"])

def _generate_raw_key() -> str:
    return "lp_" + secrets.token_urlsafe(40)


@router.get("/api-key")
def get_api_key(
    db: Session = Depends(get_db),
    current_user: Admin = Depends(get_current_user),
):
    """Retorna metadados da API key do usuário atual (sem revelar a chave completa)."""
    api_key = db.query(ApiKey).filter(ApiKey.admin_id == current_user.id).first()
    if not api_key:
        return {"has_key": False}

    return {
        "has_key": True,
        "prefix": api_key.key_prefix,
        "is_active": api_key.is_active,
        "created_at": api_key.created_at.isoformat() if api_key.created_at else None,
        "last_used_at": api_key.last_used_at.isoformat() if api_key.last_used_at else None,
        "full_key": api_key.key_hash,  # Return the raw key stored in key_hash
    }


@router.post("/api-key/generate")
def generate_api_key(
    db: Session = Depends(get_db),
    current_user: Admin = Depends(get_current_user),
):
    """Gera (ou regenera) a API key do usuário. Revoga a anterior."""
    raw_key = _generate_raw_key()
    key_prefix = raw_key[:10]

    existing = db.query(ApiKey).filter(ApiKey.admin_id == current_user.id).first()
    if existing:
        existing.key_hash = raw_key
        existing.key_prefix = key_prefix
        existing.is_active = True
        existing.created_at = datetime.now(timezone.utc)
        existing.last_used_at = None
    else:
        new_key = ApiKey(
            admin_id=current_user.id,
            key_hash=raw_key,
            key_prefix=key_prefix,
            is_active=True,
        )
        db.add(new_key)

    db.commit()

    return {"success": True, "full_key": raw_key, "prefix": key_prefix}


@router.delete("/api-key/revoke")
def revoke_api_key(
    db: Session = Depends(get_db),
    current_user: Admin = Depends(get_current_user),
):
    """Revoga (desativa) a API key do usuário."""
    api_key = db.query(ApiKey).filter(ApiKey.admin_id == current_user.id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key não encontrada")

    db.delete(api_key)
    db.commit()
    return {"success": True}
