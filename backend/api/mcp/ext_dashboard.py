"""
External API: Dashboard overview via API Key (para MCP / integrações externas).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from database.core.connection import get_db
from database.models.admin import Admin
from api.mcp.auth import get_api_key_user
from api.dashboard.overview import (
    _parse_date_range, _apply_filters, _date_range_strings,
)
from api.dashboard.aggregations import _daily_revenue, _platform_dist, _hourly_sales
from api.dashboard.meta_data import fetch_meta_account_summary, fetch_meta_campaigns_for_dashboard
from api.dashboard.kpis import calc_kpis
from api.dashboard.top_campaigns import build_top_campaigns
from database.models.transaction import Transaction

router = APIRouter(prefix="/external/dashboard", tags=["external"])


@router.get("/overview")
async def ext_dashboard_overview(
    preset: str = Query("30d"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    account_slug: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _user: Admin = Depends(get_api_key_user),
):
    """Resumo geral do dashboard (KPIs, receita diária, top campanhas)."""
    base = db.query(Transaction)
    base = _apply_filters(base, db, preset, start_date, end_date, platform, product_id, account_slug)

    ds, de = _date_range_strings(preset, start_date, end_date)
    meta_summary, meta_error = await fetch_meta_account_summary(db, ds, de)
    meta_campaigns = await fetch_meta_campaigns_for_dashboard(db, ds, de)

    kpis = calc_kpis(base, meta_summary)
    daily = _daily_revenue(base, db, meta_campaigns, ds, de)
    platforms = _platform_dist(base, db)
    top_campaigns = build_top_campaigns(base, meta_campaigns)
    hourly = _hourly_sales(base, db)

    return {
        "kpis": kpis,
        "daily_revenue": daily,
        "platform_distribution": platforms,
        "top_campaigns": top_campaigns,
        "hourly_sales": hourly,
        "meta_error": meta_error,
    }
