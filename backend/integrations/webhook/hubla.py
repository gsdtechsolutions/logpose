from typing import Any, Dict, Optional
import logging
import urllib.parse
from integrations.webhook.schemas import StandardizedWebhookEvent
from database.models.transaction import TransactionStatus, PaymentPlatform

logger = logging.getLogger(__name__)


def _map_invoice_status(event_type: str, invoice_status: str) -> TransactionStatus:
    inv_st, evt = (invoice_status or "").lower(), (event_type or "").lower()
    if evt == "invoice.payment_succeeded" or inv_st == "paid":
        return TransactionStatus.APPROVED
    if evt == "invoice.refunded" or inv_st == "refunded":
        return TransactionStatus.REFUNDED
    if inv_st in ["chargeback", "disputed"]:
        return TransactionStatus.CHARGEBACK
    if inv_st == "trial":
        return TransactionStatus.TRIAL
    return TransactionStatus.PENDING


def _extract_session_data(session: Dict[str, Any]) -> Dict[str, Optional[str]]:
    utm = session.get("utm") if isinstance(session.get("utm"), dict) else {}
    params = session.get("params") if isinstance(session.get("params"), dict) else {}
    url = session.get("url") or ""
    query_params: Dict[str, list[str]] = {}
    if url and "?" in url:
        try:
            query_params = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        except Exception:
            pass

    def get_val(key: str) -> Optional[str]:
        if key in utm and utm[key]:
            return str(utm[key])
        if key in params and params[key]:
            return str(params[key])
        if key in query_params and query_params[key]:
            return str(query_params[key][0])
        return None

    return {
        "utm_source": get_val("source") or get_val("utm_source"),
        "utm_medium": get_val("medium") or get_val("utm_medium"),
        "utm_campaign": get_val("campaign") or get_val("utm_campaign"),
        "utm_content": get_val("content") or get_val("utm_content"),
        "utm_term": get_val("term") or get_val("utm_term"),
        "src": get_val("src") or get_val("sck") or get_val("SCK"),
        "checkout_url": url or None,
    }


def _parse_lead_event(event: Dict[str, Any]) -> Optional[StandardizedWebhookEvent]:
    lead = event.get("lead") or {}
    products = event.get("products") or []
    first_prod = products[0] if products and isinstance(products, list) else {}
    lead_email = lead.get("email") or ""
    if not lead_email:
        return None

    session_data = _extract_session_data(lead.get("session") or {})
    lead_id = lead.get("id") or f"lead_{lead_email}"

    return StandardizedWebhookEvent(
        external_id=str(lead_id),
        platform=PaymentPlatform.HUBLA,
        status=TransactionStatus.PENDING,
        amount=0.0,
        original_status="abandoned",
        payment_method="",
        payment_status="abandoned",
        product_external_id=str(first_prod.get("id") or ""),
        product_name=first_prod.get("name") or "Produto Hubla",
        product_price=0.0,
        customer_external_id=str(lead.get("id") or "") or None,
        customer_email=lead_email,
        customer_name=lead.get("fullName"),
        customer_cpf=None,
        customer_phone=lead.get("phone"),
        utm_source=session_data["utm_source"],
        utm_medium=session_data["utm_medium"],
        utm_campaign=session_data["utm_campaign"],
        utm_content=session_data["utm_content"],
        utm_term=session_data["utm_term"],
        src=session_data["src"],
        checkout_url=session_data["checkout_url"],
        order_bumps=[],
    )


def _parse_invoice_event(event_type: str, event: Dict[str, Any]) -> Optional[StandardizedWebhookEvent]:
    invoice = event.get("invoice") or {}
    payer = invoice.get("payer") or event.get("user") or {}
    customer_email = payer.get("email")
    if not customer_email:
        return None

    raw_status = invoice.get("status") or ""
    status = _map_invoice_status(event_type, raw_status)

    seller_cents = 0.0
    for rec in invoice.get("receivers") or []:
        if isinstance(rec, dict) and rec.get("role") == "seller":
            seller_cents = float(rec.get("totalCents") or 0.0)
            break

    amount_obj = invoice.get("amount") or {}
    total_cents = float(amount_obj.get("totalCents") or 0.0)
    final_amount = (seller_cents if seller_cents > 0 else total_cents) / 100.0
    subtotal_cents = float(amount_obj.get("subtotalCents") or total_cents)

    prod = event.get("product") or {}
    products_list = event.get("products") or []
    if not prod and products_list and isinstance(products_list, list):
        prod = products_list[0]

    order_bumps = [
        {"id": p.get("id"), "name": p.get("name", "")}
        for p in (products_list[1:] if isinstance(products_list, list) and len(products_list) > 1 else [])
        if isinstance(p, dict)
    ]

    first_name, last_name = payer.get("firstName") or "", payer.get("lastName") or ""
    full_name = f"{first_name} {last_name}".strip() or payer.get("fullName")

    session = (
        invoice.get("paymentSession")
        or invoice.get("firstPaymentSession")
        or event.get("session")
        or {}
    )
    session_data = _extract_session_data(session if isinstance(session, dict) else {})
    tx_id = invoice.get("id") or invoice.get("orderId") or f"hubla_{customer_email}"

    return StandardizedWebhookEvent(
        external_id=str(tx_id),
        platform=PaymentPlatform.HUBLA,
        status=status,
        amount=final_amount,
        original_status=raw_status or event_type,
        payment_method=invoice.get("paymentMethod") or "",
        payment_status=raw_status,
        product_external_id=str(prod.get("id") or ""),
        product_name=prod.get("name") or "Produto Hubla",
        product_price=subtotal_cents / 100.0,
        customer_external_id=str(payer.get("id") or "") or None,
        customer_email=customer_email,
        customer_name=full_name or None,
        customer_cpf=payer.get("document"),
        customer_phone=payer.get("phone"),
        utm_source=session_data["utm_source"],
        utm_medium=session_data["utm_medium"],
        utm_campaign=session_data["utm_campaign"],
        utm_content=session_data["utm_content"],
        utm_term=session_data["utm_term"],
        src=session_data["src"],
        checkout_url=session_data["checkout_url"],
        order_bumps=order_bumps,
    )


def parse_hubla_webhook(payload: Dict[str, Any]) -> Optional[StandardizedWebhookEvent]:
    """Parsea os webhooks enviados pela Hubla (fatura e lead de carrinho abandonado)."""
    try:
        event_type = payload.get("type", "")
        event = payload.get("event") or {}
        if event_type == "lead.abandoned_checkout" or "lead" in event:
            return _parse_lead_event(event)
        return _parse_invoice_event(event_type, event)
    except Exception as e:
        logger.error(f"Erro ao parsear webhook da Hubla: {e}", exc_info=True)
        return None
