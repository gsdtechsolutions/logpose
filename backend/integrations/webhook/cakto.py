from typing import Any, Dict, Optional
import logging
import urllib.parse
from integrations.webhook.schemas import StandardizedWebhookEvent
from database.models.transaction import TransactionStatus, PaymentPlatform

logger = logging.getLogger(__name__)


def _map_cakto_status(event: str, raw_status: str) -> TransactionStatus:
    evt = (event or "").lower()
    st = (raw_status or "").lower()

    if evt == "purchase_approved" or st in ["paid", "approved"]:
        return TransactionStatus.APPROVED
    if evt == "refund" or st in ["refund", "refunded"]:
        return TransactionStatus.REFUNDED
    if evt == "chargeback" or st in ["chargeback", "chargedback"]:
        return TransactionStatus.CHARGEBACK
    if st == "trial":
        return TransactionStatus.TRIAL
    return TransactionStatus.PENDING


def _extract_tracking(item: Dict[str, Any]) -> Dict[str, Optional[str]]:
    url = item.get("checkoutUrl") or ""
    query_params: Dict[str, list[str]] = {}
    if url and "?" in url:
        try:
            query_params = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        except Exception:
            pass

    def get_val(direct_key: str, qp_keys: list[str]) -> Optional[str]:
        val = item.get(direct_key)
        if val:
            return str(val)
        for k in qp_keys:
            if k in query_params and query_params[k]:
                return str(query_params[k][0])
        return None

    return {
        "utm_source": get_val("utm_source", ["utm_source", "source"]),
        "utm_medium": get_val("utm_medium", ["utm_medium", "medium"]),
        "utm_campaign": get_val("utm_campaign", ["utm_campaign", "campaign"]),
        "utm_content": get_val("utm_content", ["utm_content", "content"]),
        "utm_term": get_val("utm_term", ["utm_term", "term"]),
        "src": get_val("sck", ["sck", "src", "SCK"]),
        "checkout_url": url or None,
    }


def parse_cakto_webhook(payload: Dict[str, Any]) -> Optional[StandardizedWebhookEvent]:
    """
    Parsea webhook enviado pela Cakto.
    Suporta eventos:
      - purchase_approved
      - refund
      - chargeback
      - pix_gerado
      - purchase_refused
      - checkout_abandonment
    """
    try:
        event = payload.get("event", "")
        data_list = payload.get("data") or []
        if isinstance(data_list, dict):
            data_list = [data_list]
        if not data_list or not isinstance(data_list, list):
            return None

        item = data_list[0]
        customer = item.get("customer") or {}
        customer_email = customer.get("email")
        if not customer_email:
            return None

        raw_status = item.get("status") or ""
        status = _map_cakto_status(event, raw_status)

        # Determinar original_status
        if event == "checkout_abandonment":
            original_status = "abandoned"
        elif event == "purchase_refused":
            original_status = "refused"
        elif event == "pix_gerado":
            original_status = "waiting_payment"
        elif event in ["purchase_approved", "refund", "chargeback"]:
            original_status = event
        else:
            original_status = raw_status or event

        # Comissão do produtor (já vem em reais na Cakto)
        producer_amount = 0.0
        for comm in item.get("commissions") or []:
            if isinstance(comm, dict) and comm.get("type") in ["producer", "seller"]:
                producer_amount = float(comm.get("totalAmount") or 0.0)
                break

        if event == "checkout_abandonment":
            final_amount = 0.0
        elif producer_amount > 0.0:
            final_amount = producer_amount
        else:
            final_amount = float(item.get("amount") or item.get("baseAmount") or 0.0)

        product = item.get("product") or {}
        offer = item.get("offer") or {}
        product_price = float(item.get("baseAmount") or item.get("amount") or offer.get("price") or 0.0)

        tracking = _extract_tracking(item)
        tx_id = item.get("id") or item.get("refId") or f"cakto_{customer_email}"

        return StandardizedWebhookEvent(
            external_id=str(tx_id),
            platform=PaymentPlatform.CAKTO,
            status=status,
            amount=final_amount,
            original_status=original_status,
            payment_method=item.get("paymentMethod") or "",
            payment_status=raw_status or original_status,
            product_external_id=str(product.get("id") or product.get("short_id") or ""),
            product_name=product.get("name") or "Produto Cakto",
            product_price=product_price,
            customer_external_id=str(item.get("id") or "") or None,
            customer_email=customer_email,
            customer_name=customer.get("name") or None,
            customer_cpf=customer.get("docNumber"),
            customer_phone=customer.get("phone"),
            utm_source=tracking["utm_source"],
            utm_medium=tracking["utm_medium"],
            utm_campaign=tracking["utm_campaign"],
            utm_content=tracking["utm_content"],
            utm_term=tracking["utm_term"],
            src=tracking["src"],
            checkout_url=tracking["checkout_url"],
            order_bumps=[],
        )

    except Exception as e:
        logger.error(f"Erro ao parsear webhook da Cakto: {e}", exc_info=True)
        return None
