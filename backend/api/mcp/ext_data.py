"""
External API: Vendas, Clientes, Reembolsos e Recuperação via API Key.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional

from database.core.connection import get_db
from database.models.admin import Admin
from database.models.transaction import Transaction, TransactionStatus, PaymentPlatform
from database.models.recovery import Recovery
from database.models.refund_reason import RefundReason
from api.mcp.auth import get_api_key_user
from api.sales.transactions import _apply_filters as sales_filter, _serialize as serialize_tx
from api.refunds.list import REFUND_STATUSES, _serialize as serialize_refund

router = APIRouter(prefix="/external", tags=["external"])


# ── VENDAS ────────────────────────────────────────────────────────────────────

@router.get("/sales")
def ext_sales(
    preset: str = Query("30d"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="approved | refunded | chargeback | pending | trial"),
    platform: Optional[str] = Query(None, description="kiwify | payt | api"),
    product_id: Optional[int] = Query(None),
    campaign: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Busca por email"),
    account_slug: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: Admin = Depends(get_api_key_user),
):
    """Lista transações de venda com filtros opcionais."""
    query = sales_filter(
        db.query(Transaction), db, preset, start_date, end_date,
        status, platform, product_id, campaign, search, account_slug,
    )
    total = query.count()
    items = query.order_by(Transaction.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"total": total, "page": page, "per_page": per_page, "items": [serialize_tx(t) for t in items]}


@router.get("/sales/summary")
def ext_sales_summary(
    preset: str = Query("30d"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    campaign: Optional[str] = Query(None),
    account_slug: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _user: Admin = Depends(get_api_key_user),
):
    """KPIs agregados de vendas."""
    query = sales_filter(
        db.query(Transaction), db, preset, start_date, end_date,
        None, platform, product_id, campaign, None, account_slug,
    )
    total = query.count()
    approved_q = query.filter(Transaction.status == TransactionStatus.APPROVED)
    approved = approved_q.count()
    revenue = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.id.in_([t.id for t in approved_q.all()])
    ).scalar()
    return {
        "total": total,
        "approved": approved,
        "refunded": query.filter(Transaction.status == TransactionStatus.REFUNDED).count(),
        "chargebacks": query.filter(Transaction.status == TransactionStatus.CHARGEBACK).count(),
        "pending": query.filter(Transaction.status == TransactionStatus.PENDING).count(),
        "revenue": float(revenue),
        "avg_ticket": round(float(revenue) / approved, 2) if approved > 0 else 0,
    }


# ── REEMBOLSOS ────────────────────────────────────────────────────────────────

@router.get("/refunds")
def ext_refunds(
    preset: str = Query("30d"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="refunded | chargeback"),
    platform: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    account_slug: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: Admin = Depends(get_api_key_user),
):
    """Lista reembolsos e chargebacks com filtros."""
    from api.refunds.list import _parse_date_range
    query = db.query(Transaction).filter(Transaction.status.in_(REFUND_STATUSES))
    ds, de = _parse_date_range(preset, start_date, end_date)
    if ds:
        query = query.filter(Transaction.created_at >= ds)
    if de:
        query = query.filter(Transaction.created_at <= de)
    if status and status != "all":
        try:
            query = query.filter(Transaction.status == TransactionStatus(status))
        except ValueError:
            pass
    if platform and platform != "all":
        try:
            query = query.filter(Transaction.platform == PaymentPlatform(platform))
        except ValueError:
            pass
    if product_id:
        from api.products.alias_helper import get_product_names_for_filter
        names = get_product_names_for_filter(db, product_id)
        if names:
            query = query.filter(Transaction.product_name.in_(names))
    if search:
        query = query.filter(
            or_(Transaction.customer_email.ilike(f"%{search}%"), Transaction.product_name.ilike(f"%{search}%"))
        )
    if account_slug and account_slug != "all":
        query = query.filter(Transaction.webhook_slug == account_slug)

    total = query.count()
    items = query.order_by(Transaction.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    tx_ids = [t.id for t in items]
    reasons_map = {}
    if tx_ids:
        reasons = db.query(RefundReason).filter(RefundReason.transaction_id.in_(tx_ids)).all()
        reasons_map = {r.transaction_id: r for r in reasons}

    return {"total": total, "page": page, "per_page": per_page, "items": [serialize_refund(t, reasons_map.get(t.id)) for t in items]}


# ── RECUPERAÇÃO ───────────────────────────────────────────────────────────────

@router.get("/recovery")
def ext_recovery(
    preset: str = Query("30d"),
    date_start: Optional[str] = Query(None),
    date_end: Optional[str] = Query(None),
    status_filter: str = Query("all", description="all | pending | recovered"),
    type_filter: str = Query("all", description="all | abandoned_cart | pix_pending | unidentified"),
    channel_filter: str = Query("all", description="all | whatsapp | email | sms | back_redirect | other"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: Admin = Depends(get_api_key_user),
):
    """Lista itens de recuperação (pendentes e recuperados)."""
    from api.recovery.list import (
        _get_channel_configs, _classify_src, _build_pending_query,
        _build_approved_with_src_query, _recovery_to_row, _tx_to_row,
    )
    from api.funnel.date_helpers import resolve_date_range

    dt_start, dt_end = resolve_date_range(preset, date_start, date_end)
    configs = _get_channel_configs(db)
    items = []

    if status_filter in ("all", "pending") and type_filter != "unidentified":
        pending_q = _build_pending_query(db, dt_start, dt_end)
        if type_filter != "all":
            pending_q = pending_q.filter(Recovery.type == type_filter)
        for r in pending_q.all():
            channel = _classify_src(r.src, configs)
            if channel_filter != "all" and channel != channel_filter:
                continue
            items.append(_recovery_to_row(r, channel))

    if status_filter in ("all", "recovered") and type_filter in ("all", "unidentified"):
        approved_q = _build_approved_with_src_query(db, configs, dt_start, dt_end)
        if approved_q is not None:
            for tx, customer_name in approved_q.all():
                channel = _classify_src(tx.src, configs)
                if channel_filter != "all" and channel != channel_filter:
                    continue
                items.append(_tx_to_row(tx, channel, customer_name))

    items.sort(key=lambda x: x.get("date") or "", reverse=True)
    total = len(items)
    start = (page - 1) * per_page
    return {"total": total, "page": page, "per_page": per_page, "items": items[start: start + per_page]}
