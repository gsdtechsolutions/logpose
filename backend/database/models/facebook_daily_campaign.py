from sqlalchemy import Column, Integer, String, Float, Date, DateTime, func, UniqueConstraint
from database.core.connection import Base


class FacebookDailyCampaign(Base):
    __tablename__ = "facebook_daily_campaigns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(String(100), nullable=False, index=True)
    campaign_id = Column(String(100), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)

    name = Column(String(500), nullable=False, default="")
    status = Column(String(50), nullable=False, default="paused")
    objective = Column(String(100), nullable=False, default="")
    bid_strategy = Column(String(100), nullable=False, default="volume")
    budget = Column(Float, nullable=False, default=0.0)

    spend = Column(Float, nullable=False, default=0.0)
    impressions = Column(Integer, nullable=False, default=0)
    clicks = Column(Integer, nullable=False, default=0)
    cpc = Column(Float, nullable=False, default=0.0)
    ctr = Column(Float, nullable=False, default=0.0)
    landing_page_views = Column(Integer, nullable=False, default=0)
    initiate_checkout = Column(Integer, nullable=False, default=0)
    connect_rate = Column(Float, nullable=False, default=0.0)

    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), default=func.now())

    __table_args__ = (
        UniqueConstraint("account_id", "campaign_id", "date", name="uq_daily_campaign"),
    )
