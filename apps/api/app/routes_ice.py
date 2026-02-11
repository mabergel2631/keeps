"""
ICE (In Case of Emergency) Emergency Card routes.
Provides shareable emergency access to policy essentials.
"""

import secrets
import hashlib
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from .auth import get_current_user
from .db import get_db
from .models import Policy, Contact, User
from .models_features import EmergencyCard

router = APIRouter(tags=["emergency-card"])


class EmergencyCardCreate(BaseModel):
    holder_name: str
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    pin: Optional[str] = None  # 4-6 digit PIN
    include_coverage_amounts: bool = True
    include_deductibles: bool = True
    expires_at: Optional[str] = None  # YYYY-MM-DD


class EmergencyCardUpdate(BaseModel):
    holder_name: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    pin: Optional[str] = None
    remove_pin: bool = False
    include_coverage_amounts: Optional[bool] = None
    include_deductibles: Optional[bool] = None
    expires_at: Optional[str] = None
    is_active: Optional[bool] = None


class PinVerify(BaseModel):
    pin: str


def hash_pin(pin: str) -> str:
    """Hash a PIN for storage."""
    return hashlib.sha256(pin.encode()).hexdigest()


def generate_access_code() -> str:
    """Generate a URL-safe random access code."""
    return secrets.token_urlsafe(12)


# ═══════════════════════════════════════════════════════════════
# Authenticated routes (user managing their card)
# ═══════════════════════════════════════════════════════════════

@router.get("/emergency-card")
def get_my_emergency_card(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get the current user's emergency card (if exists)."""
    card = db.execute(
        select(EmergencyCard).where(EmergencyCard.user_id == user.id)
    ).scalar_one_or_none()

    if not card:
        return {"card": None}

    return {
        "card": {
            "id": card.id,
            "access_code": card.access_code,
            "holder_name": card.holder_name,
            "emergency_contact_name": card.emergency_contact_name,
            "emergency_contact_phone": card.emergency_contact_phone,
            "has_pin": card.pin_hash is not None,
            "include_coverage_amounts": card.include_coverage_amounts,
            "include_deductibles": card.include_deductibles,
            "expires_at": str(card.expires_at) if card.expires_at else None,
            "is_active": card.is_active,
            "created_at": str(card.created_at),
            "share_url": f"/ice/{card.access_code}",
        }
    }


@router.post("/emergency-card")
def create_emergency_card(
    payload: EmergencyCardCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create an emergency card for the current user."""
    # Check if user already has a card
    existing = db.execute(
        select(EmergencyCard).where(EmergencyCard.user_id == user.id)
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Emergency card already exists. Use PUT to update.")

    card = EmergencyCard(
        user_id=user.id,
        access_code=generate_access_code(),
        holder_name=payload.holder_name,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        pin_hash=hash_pin(payload.pin) if payload.pin else None,
        include_coverage_amounts=payload.include_coverage_amounts,
        include_deductibles=payload.include_deductibles,
        expires_at=date.fromisoformat(payload.expires_at) if payload.expires_at else None,
    )
    db.add(card)
    db.commit()
    db.refresh(card)

    return {
        "id": card.id,
        "access_code": card.access_code,
        "share_url": f"/ice/{card.access_code}",
    }


@router.put("/emergency-card")
def update_emergency_card(
    payload: EmergencyCardUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update the current user's emergency card."""
    card = db.execute(
        select(EmergencyCard).where(EmergencyCard.user_id == user.id)
    ).scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="No emergency card found")

    if payload.holder_name is not None:
        card.holder_name = payload.holder_name
    if payload.emergency_contact_name is not None:
        card.emergency_contact_name = payload.emergency_contact_name
    if payload.emergency_contact_phone is not None:
        card.emergency_contact_phone = payload.emergency_contact_phone
    if payload.pin is not None:
        card.pin_hash = hash_pin(payload.pin)
    if payload.remove_pin:
        card.pin_hash = None
    if payload.include_coverage_amounts is not None:
        card.include_coverage_amounts = payload.include_coverage_amounts
    if payload.include_deductibles is not None:
        card.include_deductibles = payload.include_deductibles
    if payload.expires_at is not None:
        card.expires_at = date.fromisoformat(payload.expires_at) if payload.expires_at else None
    if payload.is_active is not None:
        card.is_active = payload.is_active

    db.commit()
    return {"ok": True}


@router.post("/emergency-card/regenerate")
def regenerate_access_code(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Generate a new access code (invalidates old links)."""
    card = db.execute(
        select(EmergencyCard).where(EmergencyCard.user_id == user.id)
    ).scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="No emergency card found")

    card.access_code = generate_access_code()
    db.commit()

    return {
        "access_code": card.access_code,
        "share_url": f"/ice/{card.access_code}",
    }


@router.delete("/emergency-card")
def delete_emergency_card(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Delete the current user's emergency card."""
    card = db.execute(
        select(EmergencyCard).where(EmergencyCard.user_id == user.id)
    ).scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="No emergency card found")

    db.delete(card)
    db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════
# Public routes (no auth required - for emergency access)
# ═══════════════════════════════════════════════════════════════

@router.get("/ice/{access_code}")
def get_emergency_card_public(access_code: str, db: Session = Depends(get_db)):
    """
    Public endpoint to view an emergency card.
    Returns card metadata (to check if PIN required) without sensitive data.
    """
    card = db.execute(
        select(EmergencyCard).where(EmergencyCard.access_code == access_code)
    ).scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="Emergency card not found")

    if not card.is_active:
        raise HTTPException(status_code=403, detail="This emergency card has been deactivated")

    if card.expires_at and card.expires_at < date.today():
        raise HTTPException(status_code=403, detail="This emergency card has expired")

    # If PIN protected, return metadata only
    if card.pin_hash:
        return {
            "requires_pin": True,
            "holder_name": card.holder_name,
        }

    # No PIN - return full data
    return _build_emergency_card_data(card, db)


@router.post("/ice/{access_code}/verify")
def verify_pin_and_get_card(access_code: str, payload: PinVerify, db: Session = Depends(get_db)):
    """Verify PIN and return emergency card data."""
    card = db.execute(
        select(EmergencyCard).where(EmergencyCard.access_code == access_code)
    ).scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="Emergency card not found")

    if not card.is_active:
        raise HTTPException(status_code=403, detail="This emergency card has been deactivated")

    if card.expires_at and card.expires_at < date.today():
        raise HTTPException(status_code=403, detail="This emergency card has expired")

    if not card.pin_hash:
        # No PIN required
        return _build_emergency_card_data(card, db)

    if hash_pin(payload.pin) != card.pin_hash:
        raise HTTPException(status_code=401, detail="Incorrect PIN")

    return _build_emergency_card_data(card, db)


def _build_emergency_card_data(card: EmergencyCard, db: Session) -> dict:
    """Build the full emergency card data with policies."""
    # Get all policies for this user
    policies = db.execute(
        select(Policy).where(Policy.user_id == card.user_id)
    ).scalars().all()

    policy_data = []
    for p in policies:
        # Skip placeholder policies
        if p.carrier == "Pending extraction...":
            continue

        # Get claims contact
        claims_contact = db.execute(
            select(Contact)
            .where(Contact.policy_id == p.id)
            .where(Contact.role == "claims")
        ).scalar_one_or_none()

        # Get agent contact
        agent_contact = db.execute(
            select(Contact)
            .where(Contact.policy_id == p.id)
            .where(Contact.role.in_(["agent", "broker"]))
        ).scalars().first()

        policy_info = {
            "id": p.id,
            "policy_type": p.policy_type,
            "carrier": p.carrier,
            "policy_number": p.policy_number,
            "claims_phone": claims_contact.phone if claims_contact else None,
            "agent_name": agent_contact.name if agent_contact else None,
            "agent_phone": agent_contact.phone if agent_contact else None,
        }

        if card.include_coverage_amounts:
            policy_info["coverage_amount"] = p.coverage_amount

        if card.include_deductibles:
            policy_info["deductible"] = p.deductible

        policy_data.append(policy_info)

    return {
        "requires_pin": False,
        "holder_name": card.holder_name,
        "emergency_contact_name": card.emergency_contact_name,
        "emergency_contact_phone": card.emergency_contact_phone,
        "policies": policy_data,
        "last_updated": str(card.updated_at),
    }


@router.get("/ice/{access_code}/offline-bundle")
def get_offline_bundle(access_code: str, db: Session = Depends(get_db)):
    """
    Get emergency card data with cache metadata for offline use.
    Returns the full card data plus cache-control headers.
    """
    card = db.execute(
        select(EmergencyCard).where(EmergencyCard.access_code == access_code)
    ).scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=404, detail="Emergency card not found")

    if not card.is_active:
        raise HTTPException(status_code=403, detail="This emergency card has been deactivated")

    if card.expires_at and card.expires_at < date.today():
        raise HTTPException(status_code=403, detail="This emergency card has expired")

    # If PIN protected, don't return full data
    if card.pin_hash:
        return {
            "requires_pin": True,
            "holder_name": card.holder_name,
            "cache_timestamp": str(card.updated_at),
            "can_cache": False,
        }

    data = _build_emergency_card_data(card, db)
    return {
        **data,
        "cache_timestamp": str(card.updated_at),
        "can_cache": True,
    }
