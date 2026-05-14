"""
API principal de campanhas: cruza dados Meta Ads com transações do DB.
Retorna campanhas com métricas de Ad Spend + Vendas unificadas.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount
from database.models.facebook_cache import FacebookAdsCache
from database.models.transaction import Transaction, TransactionStatus
from database.core.timezone import now_sp
from datetime import timedelta
from api.auth.deps import get_current_user
from api.campaigns.helpers import (
    parse_utm_campaign, parse_utm_medium, parse_utm_content, safe_division,
)
from api.campaigns.merge import merge_campaigns, merge_ads
from integrations.meta_ads.service import MetaAdsService
from integrations.meta_ads.client import MetaAuthError
from integrations.meta_ads.http_factory import get_proxy_url
from integrations.vturb.plays_by_utm import fetch_vturb_stats_by_campaign

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("/data")
async def get_campaigns_data(
    date_start: str = Query(..., description="YYYY-MM-DD"),
    date_end: str = Query(..., description="YYYY-MM-DD"),
    account_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Endpoint principal: busca dados do Meta Ads + transações.
    Cruza campanhas com vendas pelo utm_campaign (name|id).
    Retorna hierarquia: campaigns -> adsets -> ads, cada um com métricas.
    """
    # 1. Selecionar conta(s) Facebook
    fb_accounts = []
    if account_id:
        acc = db.query(FacebookAccount).filter(FacebookAccount.id == account_id, FacebookAccount.token_valid.is_(True)).first()
        if acc: fb_accounts.append(acc)
    else:
        fb_accounts = db.query(FacebookAccount).filter(FacebookAccount.token_valid.is_(True)).all()

    if not fb_accounts:
        return {"campaigns": [], "unidentified": _build_unidentified(db, date_start, date_end)}

    # 2. Identificar se é um preset conhecido
    preset = _identify_preset(date_start, date_end)

    # 3. Buscar dados da Meta Ads (Cache Local ou On-Demand) para cada conta
    meta_campaigns, meta_adsets, meta_ads = [], [], []
    last_sync_at = None
    import logging
    logger = logging.getLogger(__name__)

    from integrations.meta_ads.schemas import CampaignInsights, AdSetInsights, AdInsights

    for fb_account in fb_accounts:
        used_cache = False

        if preset:
            cache = db.query(FacebookAdsCache).filter(
                FacebookAdsCache.account_id == fb_account.account_id,
                FacebookAdsCache.date_preset == preset
            ).first()
            
            if cache and cache.campaigns_data is not None:
                print(f"✅ [CACHE] Dados obtidos do Banco de Dados para a conta {fb_account.account_id} (Preset: {preset})", flush=True)
                meta_campaigns.extend([CampaignInsights.model_construct(**c) for c in cache.campaigns_data])
                meta_adsets.extend([AdSetInsights.model_construct(**c) for c in cache.adsets_data])
                meta_ads.extend([AdInsights.model_construct(**c) for c in cache.ads_data])
                used_cache = True
                if cache.updated_at:
                    last_sync_at = cache.updated_at.isoformat()

        if not used_cache:
            proxy = get_proxy_url(db, fb_account.id)
            service = MetaAdsService(fb_account.access_token, fb_account.account_id, proxy_url=proxy)
            try:
                print(f"🔥 [LIVE] Dados obtidos AO VIVO da Meta (On-Demand) para a conta {fb_account.account_id}", flush=True)
                c, ad, a = await service.get_all_levels(date_start, date_end)
                
                if status_filter and status_filter != "all":
                    c = [camp for camp in c if camp.status == status_filter]
                    valid_camp_ids = {camp.id for camp in c}
                    ad = [adset for adset in ad if adset.campaign_id in valid_camp_ids]
                    valid_adset_ids = {adset.id for adset in ad}
                    a = [ad_obj for ad_obj in a if ad_obj.ad_set_id in valid_adset_ids]

                meta_campaigns.extend(c)
                meta_adsets.extend(ad)
                meta_ads.extend(a)
            except MetaAuthError:
                # Token inválido: marcar no banco para suprimir futuras chamadas
                fb_account.token_valid = False
                db.commit()
                logger.warning(f"Token inválido para a conta {fb_account.account_id}")
            except Exception as e:
                logger.error(f"Erro ao buscar dados do Meta Ads para conta {fb_account.account_id}: {e}")
            finally:
                await service.close()

    # 4. Buscar transações aprovadas no período com utm_source=FB
    transactions = _get_fb_transactions(db, date_start, date_end)

    # 4. Fazer o merge
    campaigns = merge_campaigns(meta_campaigns, meta_adsets, meta_ads, transactions)

    # 5. Buscar stats (views/plays) do VTurb por utm_campaign
    campaign_ids = [c["id"] for c in campaigns]
    campaign_names = [c["name"] for c in campaigns]
    try:
        stats_map = await fetch_vturb_stats_by_campaign(
            db, date_start, date_end, campaign_ids, campaign_names,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Erro ao buscar stats do VTurb: {e}")
        stats_map = {}

    # Atribuir stats a cada campanha
    _apply_vturb_stats(campaigns, stats_map)

    # 6. Vendas sem UTM (não identificadas)
    unidentified = _build_unidentified(db, date_start, date_end)

    return {
        "campaigns": campaigns,
        "unidentified": unidentified,
        "last_sync_at": last_sync_at,
    }


def _get_fb_account(db: Session, account_id: Optional[int]) -> Optional[FacebookAccount]:
    """Retorna a conta FB selecionada ou a primeira com token válido."""
    if account_id:
        return db.query(FacebookAccount).filter(
            FacebookAccount.id == account_id,
            FacebookAccount.token_valid.is_(True),
        ).first()
    return db.query(FacebookAccount).filter(
        FacebookAccount.token_valid.is_(True)
    ).first()

def _identify_preset(date_start: str, date_end: str) -> Optional[str]:
    """Identifica se as datas correspondem a um preset para buscar no cache."""
    now = now_sp()
    now_str = now.strftime("%Y-%m-%d")
    yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    
    if date_end == now_str:
        if date_start == now_str: return "today"
        if date_start == (now - timedelta(days=3)).strftime("%Y-%m-%d"): return "3d"
        if date_start == (now - timedelta(days=7)).strftime("%Y-%m-%d"): return "7d"
        if date_start == (now - timedelta(days=14)).strftime("%Y-%m-%d"): return "14d"
        if date_start == (now - timedelta(days=30)).strftime("%Y-%m-%d"): return "30d"
        if date_start == (now - timedelta(days=90)).strftime("%Y-%m-%d"): return "90d"
        
    if date_end == yesterday_str and date_start == yesterday_str:
        return "yesterday"
        
    return None


def _get_fb_transactions(db: Session, date_start: str, date_end: str) -> list[Transaction]:
    """Busca transações aprovadas com utm_source FB no período."""
    query = db.query(Transaction).filter(
        Transaction.status == TransactionStatus.APPROVED,
        Transaction.created_at >= date_start,
        Transaction.created_at <= f"{date_end} 23:59:59",
    )
    return query.all()


def _apply_vturb_stats(
    campaigns: list[dict],
    stats_map: dict[str, dict[str, int]],
) -> None:
    """Atribui views e plays do VTurb a cada campanha por ID e nome (soma ambos)."""
    for camp in campaigns:
        views = 0
        plays = 0

        # Somar stats por ID
        by_id = stats_map.get(camp["id"])
        if by_id:
            views += by_id["views"]
            plays += by_id["plays"]

        # Somar stats por nome (pode ter vindo de UTMs sem pipe)
        by_name = stats_map.get(camp["name"])
        if by_name:
            views += by_name["views"]
            plays += by_name["plays"]

        camp["views_vsl"] = views
        camp["plays_vsl"] = plays
        
        # Real Play Rate = plays / views
        camp["play_rate"] = (
            round((plays / views) * 100, 1) if views > 0 and plays > 0 else 0
        )


def _build_unidentified(db: Session, date_start: str, date_end: str) -> dict:
    """Vendas aprovadas sem utm_campaign (não atribuídas a nenhuma campanha)."""
    unid = db.query(Transaction).filter(
        Transaction.status == TransactionStatus.APPROVED,
        Transaction.created_at >= date_start,
        Transaction.created_at <= f"{date_end} 23:59:59",
        (Transaction.utm_campaign.is_(None)) | (Transaction.utm_campaign == ""),
    ).all()

    revenue = sum(t.amount for t in unid)

    # Agrupar por produto para permitir filtro no frontend
    products_map: dict[str, dict] = {}
    for t in unid:
        pname = t.product_name or "Sem produto"
        if pname not in products_map:
            products_map[pname] = {"name": pname, "sales": 0, "revenue": 0.0}
        products_map[pname]["sales"] += 1
        products_map[pname]["revenue"] += t.amount

    return {
        "id": "unidentified",
        "name": "Não identificado",
        "status": "unidentified",
        "objective": "",
        "budget_type": "CBO",
        "sales": len(unid),
        "revenue": revenue,
        "profit": revenue,
        "spend": 0, "budget": 0, "clicks": 0, "impressions": 0,
        "cpc": 0, "ctr": 0, "cpa": 0, "roas": 0,
        "landing_page_views": 0, "initiate_checkout": 0,
        "connect_rate": 0, "no_id_sales": 0,
        "views_vsl": 0, "plays_vsl": 0, "play_rate": 0,
        "products": list(products_map.values()),
    }
