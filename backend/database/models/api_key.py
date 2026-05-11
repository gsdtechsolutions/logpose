from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from database.core.connection import Base
from database.core.timezone import CREATED_AT_DEFAULT


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    admin_id = Column(Integer, ForeignKey("admins.id", ondelete="CASCADE"), nullable=False, unique=True)
    key_hash = Column(String(255), nullable=False)
    key_prefix = Column(String(10), nullable=False)  # first 8 chars, for display
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=CREATED_AT_DEFAULT)
    last_used_at = Column(DateTime, nullable=True)
