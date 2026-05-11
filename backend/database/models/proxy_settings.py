from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from database.core.connection import Base
from database.core.timezone import CREATED_AT_DEFAULT


class ProxySettings(Base):
    """
    Configuração de proxy para requisições à Meta API.
    Se facebook_account_id for NULL, é um proxy global.
    """
    __tablename__ = "proxy_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    proxy_url = Column(String(500), nullable=False)
    proxy_type = Column(String(10), nullable=False, default="http")
    enabled = Column(Boolean, nullable=False, default=True, server_default="true")
    facebook_account_id = Column(
        Integer,
        ForeignKey("facebook_accounts.id", ondelete="CASCADE"),
        nullable=True,
    )
    created_at = Column(DateTime, server_default=CREATED_AT_DEFAULT)
