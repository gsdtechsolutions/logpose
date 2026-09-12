"""
Busca dados da Meta Ads para o dashboard.
Usa tabelas daily como fonte principal, com lazy-sync inteligente sob demanda.
"""
import logging
from typing import Optional
from sqlalchemy.orm import Session

from database.models.facebook_account import FacebookAccount
from integrations.meta_ads.schemas import AccountInsightsSummary, CampaignInsights
from jobs.query_facebook_daily import query_account_summary, query_campaigns
from jobs.sync_facebook_ondemand import sync_facebook_if_needed

logger = logging.getLogger(__name__)


def get_fb_account(db: Session) -> Optional[FacebookAccount]:
    """Retorna a primeira conta FB com token válido."""
    return (
        db.query(FacebookAccount)
        .filter(FacebookAccount.token_valid.is_(True))
        .first()
    )


def _mark_token_invalid(db: Session, account: FacebookAccount) -> None:
    account.token_valid = False
    db.commit()
    logger.warning(
        f"Token da conta Facebook '{account.label}' ({account.account_id}) "
        "marcado como inválido. Atualize o token na página de integrações."
    )


async def fetch_meta_account_summary(
    db: Session,
    preset: str,
    date_start: str,
    date_end: str,
) -> tuple[Optional[AccountInsightsSummary], Optional[str]]:
    """Busca métricas agregadas da conta usando sincronização sob demanda."""
    fb_accounts = db.query(FacebookAccount).filter(
        FacebookAccount.token_valid.is_(True)
    ).all()
    if not fb_accounts:
        has_invalid = db.query(FacebookAccount).filter(
            FacebookAccount.token_valid.is_(False)
        ).first()
        return (None, "token_invalid") if has_invalid else (None, None)

    # Garante que os dados de hoje estão frescos (se hoje estiver no range)
    await sync_facebook_if_needed(db, fb_accounts, date_start, date_end)

    account_ids = [fb.account_id for fb in fb_accounts]
    summary = query_account_summary(db, account_ids, date_start, date_end)
    return summary, None


async def fetch_meta_campaigns_for_dashboard(
    db: Session,
    preset: str,
    date_start: str,
    date_end: str,
) -> list[CampaignInsights]:
    """Busca top campanhas para o dashboard usando sincronização sob demanda."""
    fb_accounts = db.query(FacebookAccount).filter(
        FacebookAccount.token_valid.is_(True)
    ).all()
    if not fb_accounts:
        return []

    # Garante que os dados de hoje estão frescos (se hoje estiver no range)
    await sync_facebook_if_needed(db, fb_accounts, date_start, date_end)

    account_ids = [fb.account_id for fb in fb_accounts]
    return query_campaigns(db, account_ids, date_start, date_end)
