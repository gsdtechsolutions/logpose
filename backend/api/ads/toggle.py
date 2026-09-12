"""
API para ligar/desligar anúncios no Meta Ads.
Permite alternar instâncias individuais ou todas as instâncias de um criativo.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount
from database.models.campaign_action import ActionType
from api.auth.deps import get_current_user
from api.campaigns.actions import record_campaign_action
from integrations.meta_ads.manage import toggle_entity_status
from integrations.meta_ads.http_factory import get_proxy_url

router = APIRouter(prefix="/ads", tags=["ads"])


class AdToggleRequest(BaseModel):
    account_id: int
    ad_id: str
    active: bool
    ad_ids: Optional[list[str]] = None
    entity_name: str = ""
    metrics: dict = {}
    budget: float = 0


@router.post("/toggle")
async def toggle_ad_status(
    payload: AdToggleRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Liga ou desliga anúncio(s) na Meta."""
    fb_account = db.query(FacebookAccount).filter(
        FacebookAccount.id == payload.account_id
    ).first()

    if not fb_account:
        raise HTTPException(status_code=404, detail="Conta Facebook não encontrada")

    new_status = "ACTIVE" if payload.active else "PAUSED"
    proxy = get_proxy_url(db, fb_account.id)
    target_ids = payload.ad_ids if payload.ad_ids else [payload.ad_id]

    errors = []
    for aid in target_ids:
        res = await toggle_entity_status(
            access_token=fb_account.access_token,
            entity_id=aid,
            entity_type="ad",
            new_status=new_status,
            account_id=fb_account.account_id,
            proxy_url=proxy,
        )
        if not res.get("success"):
            errors.append(f"{aid}: {res.get('error')}")

    if errors and len(errors) == len(target_ids):
        raise HTTPException(status_code=400, detail="; ".join(errors))

    action_type = ActionType.ACTIVATE if payload.active else ActionType.PAUSE
    try:
        record_campaign_action(
            db=db,
            entity_id=payload.ad_id,
            entity_type="ad",
            entity_name=payload.entity_name or payload.ad_id,
            action_type=action_type,
            metrics=payload.metrics,
            budget_before=payload.budget,
            budget_after=payload.budget,
        )
    except Exception:
        pass

    return {"status": "ok", "new_status": new_status.lower()}
