from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from database.connection import Base


class SocialAccount(Base):
    __tablename__ = "social_accounts"
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_social_accounts_provider_user"),
        UniqueConstraint("user_id", "provider", name="uq_social_accounts_user_provider"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(String(32), nullable=False, index=True)
    provider_user_id = Column(String(255), nullable=False, index=True)
    provider_email = Column(String(255), nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SocialAccount(provider='{self.provider}', user_id={self.user_id}, provider_user_id='{self.provider_user_id}')>"