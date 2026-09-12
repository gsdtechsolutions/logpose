"""
Upsert de dados daily do Facebook Ads no banco de dados.
Usa (account_id, entity_id, date) como chave para insert ou update.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.models.facebook_daily_campaign import FacebookDailyCampaign
from database.models.facebook_daily_adset import FacebookDailyAdset
from database.models.facebook_daily_ad import FacebookDailyAd


def upsert_campaigns(db: Session, account_id: str, rows: list[dict]) -> None:
    for row in rows:
        date_val = _parse_date(row["date"])
        existing = db.query(FacebookDailyCampaign).filter(
            FacebookDailyCampaign.account_id == account_id,
            FacebookDailyCampaign.campaign_id == row["campaign_id"],
            FacebookDailyCampaign.date == date_val,
        ).first()

        if existing:
            _update_campaign(existing, row)
        else:
            db.add(FacebookDailyCampaign(
                account_id=account_id,
                campaign_id=row["campaign_id"],
                date=date_val,
                name=row["name"],
                status=row["status"],
                objective=row.get("objective", ""),
                bid_strategy=row.get("bid_strategy", "volume"),
                budget=row.get("budget", 0.0),
                spend=row["spend"],
                impressions=row["impressions"],
                clicks=row["clicks"],
                cpc=row["cpc"],
                ctr=row["ctr"],
                landing_page_views=row["landing_page_views"],
                initiate_checkout=row["initiate_checkout"],
                connect_rate=row["connect_rate"],
            ))


def upsert_adsets(db: Session, account_id: str, rows: list[dict]) -> None:
    for row in rows:
        date_val = _parse_date(row["date"])
        existing = db.query(FacebookDailyAdset).filter(
            FacebookDailyAdset.account_id == account_id,
            FacebookDailyAdset.adset_id == row["adset_id"],
            FacebookDailyAdset.date == date_val,
        ).first()

        if existing:
            _update_adset(existing, row)
        else:
            db.add(FacebookDailyAdset(
                account_id=account_id,
                adset_id=row["adset_id"],
                campaign_id=row["campaign_id"],
                date=date_val,
                name=row["name"],
                status=row["status"],
                budget=row.get("budget", 0.0),
                spend=row["spend"],
                impressions=row["impressions"],
                clicks=row["clicks"],
                cpc=row["cpc"],
                ctr=row["ctr"],
                landing_page_views=row["landing_page_views"],
                initiate_checkout=row["initiate_checkout"],
                connect_rate=row["connect_rate"],
            ))


def upsert_ads(db: Session, account_id: str, rows: list[dict]) -> None:
    for row in rows:
        date_val = _parse_date(row["date"])
        existing = db.query(FacebookDailyAd).filter(
            FacebookDailyAd.account_id == account_id,
            FacebookDailyAd.ad_id == row["ad_id"],
            FacebookDailyAd.date == date_val,
        ).first()

        if existing:
            _update_ad(existing, row)
        else:
            db.add(FacebookDailyAd(
                account_id=account_id,
                ad_id=row["ad_id"],
                adset_id=row["adset_id"],
                date=date_val,
                name=row["name"],
                status=row["status"],
                spend=row["spend"],
                impressions=row["impressions"],
                clicks=row["clicks"],
                cpc=row["cpc"],
                ctr=row["ctr"],
                landing_page_views=row["landing_page_views"],
                initiate_checkout=row["initiate_checkout"],
                connect_rate=row["connect_rate"],
            ))


def _update_campaign(entry: FacebookDailyCampaign, row: dict) -> None:
    entry.name = row["name"]
    entry.status = row["status"]
    entry.objective = row.get("objective", "")
    entry.bid_strategy = row.get("bid_strategy", "volume")
    entry.budget = row.get("budget", 0.0)
    entry.updated_at = func.now()
    _update_metrics(entry, row)


def _update_adset(entry: FacebookDailyAdset, row: dict) -> None:
    entry.name = row["name"]
    entry.status = row["status"]
    entry.campaign_id = row["campaign_id"]
    entry.budget = row.get("budget", 0.0)
    entry.updated_at = func.now()
    _update_metrics(entry, row)


def _update_ad(entry: FacebookDailyAd, row: dict) -> None:
    entry.name = row["name"]
    entry.status = row["status"]
    entry.adset_id = row["adset_id"]
    entry.updated_at = func.now()
    _update_metrics(entry, row)


def _update_metrics(entry, row: dict) -> None:
    entry.spend = row["spend"]
    entry.impressions = row["impressions"]
    entry.clicks = row["clicks"]
    entry.cpc = row["cpc"]
    entry.ctr = row["ctr"]
    entry.landing_page_views = row["landing_page_views"]
    entry.initiate_checkout = row["initiate_checkout"]
    entry.connect_rate = row["connect_rate"]


def _parse_date(date_str: str):
    return datetime.strptime(date_str, "%Y-%m-%d").date()
