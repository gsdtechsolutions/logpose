"""
Endpoint para listar as ações registradas como memória da AI,
paginado e filtrado por tipo de ação.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional

from database.core.connection import get_db
from database.models.campaign_action import CampaignAction, ActionType
from api.auth.deps import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

ACTION_LABELS = {
    ActionType.BUDGET_INCREASE: "Aumento de Orçamento",
    ActionType.BUDGET_DECREASE: "Redução de Orçamento",
    ActionType.PAUSE: "Pausar",
    ActionType.ACTIVATE: "Ativar",
}

ENTITY_LABELS = {
    "campaign": "Campanha",
    "adset": "Conjunto",
    "ad": "Anúncio",
}


def _serialize(action: CampaignAction) -> dict:
    return {
        "id": action.id,
        "entity_id": action.entity_id,
        "entity_type": action.entity_type,
        "entity_type_label": ENTITY_LABELS.get(action.entity_type, action.entity_type),
        "entity_name": action.entity_name,
        "action_type": action.action_type,
        "action_label": ACTION_LABELS.get(action.action_type, str(action.action_type)),
        "budget_before": action.budget_before,
        "budget_after": action.budget_after,
        "spend": action.spend,
        "revenue": action.revenue,
        "profit": action.profit,
        "sales": action.sales,
        "roas": action.roas,
        "cpa": action.cpa,
        "cpc": action.cpc,
        "ctr": action.ctr,
        "clicks": action.clicks,
        "impressions": action.impressions,
        "connect_rate": action.connect_rate,
        "created_at": action.created_at.isoformat() if action.created_at else None,
    }


@router.get("/activities")
def list_activities(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    action_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Lista paginada das ações registradas para treinamento da AI."""
    query = db.query(CampaignAction)

    if action_type:
        try:
            query = query.filter(CampaignAction.action_type == ActionType(action_type))
        except ValueError:
            pass

    if entity_type:
        query = query.filter(CampaignAction.entity_type == entity_type)

    total = query.count()
    items = (
        query
        .order_by(desc(CampaignAction.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, -(-total // per_page)),
        "items": [_serialize(a) for a in items],
    }
