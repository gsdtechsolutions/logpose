"""
Dependency para autenticação via API Key (uso externo/MCP).
Aceita o header: X-API-Key: lp_xxxxx...
"""
import hashlib
from datetime import datetime, timezone

from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session

from database.core.connection import get_db
from database.models.api_key import ApiKey
from database.models.admin import Admin

def get_api_key_user(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> Admin:
    """Valida a API Key e retorna o Admin associado."""
    api_key = db.query(ApiKey).filter(
        ApiKey.key_hash == x_api_key,
        ApiKey.is_active.is_(True),
    ).first()

    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid or revoked API Key")

    # Update last used timestamp
    api_key.last_used_at = datetime.now(timezone.utc)
    db.commit()

    admin = db.query(Admin).filter(Admin.id == api_key.admin_id).first()
    if not admin:
        raise HTTPException(status_code=401, detail="User not found")

    return admin
