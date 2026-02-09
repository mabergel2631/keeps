"""
Gap Analysis API routes.
Analyzes user's policies and identifies coverage gaps.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import Policy, PolicyDetail, Contact, User
from .coverage_taxonomy import analyze_coverage_gaps, get_coverage_summary

router = APIRouter(prefix="/gaps", tags=["gap-analysis"])


@router.get("")
def get_gap_analysis(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Analyze the user's policies and return identified coverage gaps.
    """
    # Fetch all user's policies with details
    policies = db.execute(
        select(Policy).where(Policy.user_id == user.id)
    ).scalars().all()

    # Build policy dicts with details and contacts
    policy_data = []
    for p in policies:
        details = db.execute(
            select(PolicyDetail).where(PolicyDetail.policy_id == p.id)
        ).scalars().all()

        contacts = db.execute(
            select(Contact).where(Contact.policy_id == p.id)
        ).scalars().all()

        policy_data.append({
            "id": p.id,
            "policy_type": p.policy_type,
            "carrier": p.carrier,
            "policy_number": p.policy_number,
            "coverage_amount": p.coverage_amount,
            "deductible": p.deductible,
            "premium_amount": p.premium_amount,
            "renewal_date": str(p.renewal_date) if p.renewal_date else None,
            "created_at": str(p.created_at) if p.created_at else None,
            "details": [{"field_name": d.field_name, "field_value": d.field_value} for d in details],
            "contacts": [{"role": c.role, "phone": c.phone, "email": c.email} for c in contacts]
        })

    # TODO: In the future, we could store user context (has_dependents, is_homeowner, etc.)
    # For now, we'll infer what we can from their policies
    user_context = {}

    # Run gap analysis
    gaps = analyze_coverage_gaps(policy_data, user_context)

    # Get coverage summary
    summary = get_coverage_summary(policy_data)

    return {
        "gaps": gaps,
        "summary": summary,
        "policy_count": len(policies)
    }


@router.get("/summary")
def get_coverage_summary_only(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Get just the coverage summary without gap analysis.
    Lighter endpoint for dashboard widgets.
    """
    policies = db.execute(
        select(Policy).where(Policy.user_id == user.id)
    ).scalars().all()

    policy_data = [{
        "id": p.id,
        "policy_type": p.policy_type,
        "coverage_amount": p.coverage_amount,
        "premium_amount": p.premium_amount,
    } for p in policies]

    return get_coverage_summary(policy_data)
