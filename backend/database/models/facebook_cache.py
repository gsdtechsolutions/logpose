from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB

from database.core.connection import Base

class FacebookAdsCache(Base):
    __tablename__ = "facebook_ads_cache"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String, index=True, nullable=False)
    date_preset = Column(String, index=True, nullable=False)
    
    # Store the raw JSON list/dict responses from Meta API
    campaigns_data = Column(JSONB, default=list)
    adsets_data = Column(JSONB, default=list)
    ads_data = Column(JSONB, default=list)
    summary_data = Column(JSONB, default=dict)

    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), default=func.now())
