from sqlalchemy import String, Integer, Date, DateTime, Boolean, ForeignKey, func, Text
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base


class Premium(Base):
    __tablename__ = "premiums"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)
    amount: Mapped[int] = mapped_column(Integer)  # cents
    frequency: Mapped[str] = mapped_column(String(20))  # monthly, quarterly, semi_annual, annual
    due_date: Mapped[Date] = mapped_column(Date)
    paid_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)
    claim_number: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20))  # open, in_progress, closed, denied
    date_filed: Mapped[Date] = mapped_column(Date)
    date_resolved: Mapped[Date | None] = mapped_column(Date, nullable=True)
    amount_claimed: Mapped[int | None] = mapped_column(Integer, nullable=True)  # cents
    amount_paid: Mapped[int | None] = mapped_column(Integer, nullable=True)  # cents
    description: Mapped[str] = mapped_column(String(2000))
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class RenewalReminder(Base):
    __tablename__ = "renewal_reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)
    remind_at: Mapped[Date] = mapped_column(Date)
    dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(50))  # created, updated, deleted, uploaded, confirmed, filed
    entity_type: Mapped[str] = mapped_column(String(50))  # policy, document, claim, premium, etc.
    entity_id: Mapped[int] = mapped_column(Integer)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class PolicyShare(Base):
    __tablename__ = "policy_shares"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    shared_with_email: Mapped[str] = mapped_column(String(255))
    permission: Mapped[str] = mapped_column(String(10))  # view, edit
    role_label: Mapped[str | None] = mapped_column(String(30), nullable=True)  # spouse, child, cpa, attorney, caregiver, broker, other
    expires_at: Mapped[Date | None] = mapped_column(Date, nullable=True)
    accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())


class EmergencyCard(Base):
    """ICE (In Case of Emergency) shareable card with policy essentials."""
    __tablename__ = "emergency_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    access_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # URL-safe random code
    pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Optional PIN protection
    holder_name: Mapped[str] = mapped_column(String(200))  # Name displayed on card
    emergency_contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    include_coverage_amounts: Mapped[bool] = mapped_column(Boolean, default=True)
    include_deductibles: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[Date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class PremiumHistory(Base):
    """Track premium changes over time for price trend analysis."""
    __tablename__ = "premium_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    policy_id: Mapped[int] = mapped_column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), index=True)
    amount: Mapped[int] = mapped_column(Integer)  # dollars (annual premium)
    effective_date: Mapped[Date] = mapped_column(Date)  # When this premium took effect
    source: Mapped[str] = mapped_column(String(20), default="manual")  # manual, extraction, renewal
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
