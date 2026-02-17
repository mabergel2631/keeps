import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Literal, Optional

from .auth import get_current_user
from .config import settings
from .db import get_db
from .models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])

# ── Plan limits ──────────────────────────────────────
PLAN_LIMITS = {
    "free": {"max_active_policies": 3},
    "trial": {"max_active_policies": 999},  # Trial = Pro access
    "basic": {"max_active_policies": 5},
    "pro": {"max_active_policies": 999},
}

PRICE_MAP = {
    "basic_monthly": lambda: settings.stripe_basic_monthly_price_id,
    "basic_annual": lambda: settings.stripe_basic_annual_price_id,
    "pro_monthly": lambda: settings.stripe_pro_monthly_price_id,
    "pro_annual": lambda: settings.stripe_pro_annual_price_id,
}


def get_effective_plan(user: User) -> str:
    """Return the effective plan, accounting for expired trials."""
    plan = user.plan or "free"
    if plan == "trial" and user.trial_ends_at:
        trial_end = user.trial_ends_at.replace(tzinfo=timezone.utc) if user.trial_ends_at.tzinfo is None else user.trial_ends_at
        if trial_end <= datetime.now(timezone.utc):
            return "free"
    return plan


def get_policy_limit(user: User) -> int:
    plan = get_effective_plan(user)
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])["max_active_policies"]


def _get_stripe():
    """Lazy import stripe to avoid import errors when not installed."""
    try:
        import stripe
        if not settings.stripe_secret_key:
            raise HTTPException(status_code=503, detail="Billing not configured")
        stripe.api_key = settings.stripe_secret_key
        return stripe
    except ImportError:
        raise HTTPException(status_code=503, detail="Billing not available")


# ── Status ───────────────────────────────────────────

@router.get("/status")
def billing_status(user: User = Depends(get_current_user)):
    plan = get_effective_plan(user)
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

    trial_active = False
    trial_days_left = 0
    if user.plan == "trial" and user.trial_ends_at:
        now = datetime.now(timezone.utc)
        trial_end = user.trial_ends_at.replace(tzinfo=timezone.utc) if user.trial_ends_at.tzinfo is None else user.trial_ends_at
        if trial_end > now:
            trial_active = True
            trial_days_left = max(0, (trial_end - now).days)

    return {
        "plan": plan,
        "max_active_policies": limits["max_active_policies"],
        "has_subscription": bool(user.stripe_subscription_id),
        "trial_active": trial_active,
        "trial_days_left": trial_days_left,
        "stripe_configured": bool(settings.stripe_secret_key),
    }


# ── Plans info (public, no auth needed) ──────────────

@router.get("/plans")
def list_plans():
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "description": "Get started with the basics",
                "max_active_policies": 3,
                "features": [
                    "Up to 3 active policies",
                    "Basic policy tracking",
                    "Emergency ICE card",
                    "Renewal reminders",
                ],
                "monthly_price": 0,
                "annual_price": 0,
            },
            {
                "id": "basic",
                "name": "Basic",
                "description": "For individuals managing their coverage",
                "max_active_policies": 5,
                "features": [
                    "Up to 5 active policies",
                    "Full policy tracking",
                    "Emergency ICE card",
                    "Renewal reminders",
                    "Coverage gap analysis",
                    "Policy sharing (2 people)",
                    "Document storage",
                ],
                "monthly_price": 249,
                "annual_price": 2000,
            },
            {
                "id": "pro",
                "name": "Pro",
                "description": "Complete insurance intelligence",
                "max_active_policies": 999,
                "features": [
                    "Unlimited active policies",
                    "AI document extraction",
                    "Full gap analysis with recommendations",
                    "Unlimited policy sharing",
                    "Premium tracking & history",
                    "Coverage score insights",
                    "Priority support",
                ],
                "monthly_price": 599,
                "annual_price": 5500,
            },
        ],
        "trial_days": 30,
    }


# ── Checkout ─────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: Literal["basic", "pro"]
    interval: Literal["monthly", "annual"]


@router.post("/checkout")
def create_checkout(payload: CheckoutRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stripe = _get_stripe()

    price_key = f"{payload.plan}_{payload.interval}"
    price_id = PRICE_MAP[price_key]()
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Price not configured for {price_key}")

    # Create or reuse Stripe customer
    if not user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"user_id": str(user.id)},
        )
        user.stripe_customer_id = customer.id
        db.commit()

    session = stripe.checkout.Session.create(
        customer=user.stripe_customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.app_url}/billing?success=true",
        cancel_url=f"{settings.app_url}/pricing?canceled=true",
        metadata={"user_id": str(user.id), "plan": payload.plan},
        subscription_data={"metadata": {"user_id": str(user.id), "plan": payload.plan}},
    )

    return {"checkout_url": session.url}


# ── Customer Portal ──────────────────────────────────

@router.post("/portal")
def create_portal(user: User = Depends(get_current_user)):
    stripe = _get_stripe()

    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")

    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{settings.app_url}/billing",
    )

    return {"portal_url": session.url}


# ── Webhook ──────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    stripe = _get_stripe()

    body = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(body, sig, settings.stripe_webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data, db)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data, db)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data, db)
    elif event_type == "invoice.payment_failed":
        logger.warning("Payment failed for customer %s", data.get("customer"))

    return {"ok": True}


def _find_user_by_customer(customer_id: str, db: Session) -> Optional[User]:
    from sqlalchemy import select
    return db.execute(
        select(User).where(User.stripe_customer_id == customer_id)
    ).scalar_one_or_none()


def _handle_checkout_completed(data: dict, db: Session):
    customer_id = data.get("customer")
    subscription_id = data.get("subscription")
    plan = data.get("metadata", {}).get("plan", "basic")

    user = _find_user_by_customer(customer_id, db)
    if not user:
        logger.error("Checkout completed but no user for customer %s", customer_id)
        return

    user.plan = plan
    user.stripe_subscription_id = subscription_id
    db.commit()
    logger.info("User %s upgraded to %s (sub: %s)", user.id, plan, subscription_id)


def _handle_subscription_updated(data: dict, db: Session):
    customer_id = data.get("customer")
    status = data.get("status")

    user = _find_user_by_customer(customer_id, db)
    if not user:
        return

    if status == "active":
        plan = data.get("metadata", {}).get("plan")
        if plan:
            user.plan = plan
    elif status in ("past_due", "unpaid"):
        logger.warning("Subscription %s is %s for user %s", data.get("id"), status, user.id)

    user.stripe_subscription_id = data.get("id")
    db.commit()


def _handle_subscription_deleted(data: dict, db: Session):
    customer_id = data.get("customer")

    user = _find_user_by_customer(customer_id, db)
    if not user:
        return

    user.plan = "free"
    user.stripe_subscription_id = None
    db.commit()
    logger.info("User %s downgraded to free (subscription canceled)", user.id)
