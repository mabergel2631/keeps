"""
Coverage Score API routes.
Calculates and returns coverage scores by category.
"""

import json
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user
from .db import get_db
from .models import Policy, PolicyDetail, Contact, User
from .models_features import CoverageScore

router = APIRouter(prefix="/coverage-scores", tags=["scores"])


# ═══════════════════════════════════════════════════════════════
# Scoring weights per category
# ═══════════════════════════════════════════════════════════════

SCORING_WEIGHTS = {
    "auto": {
        "has_policy": 30,
        "liability_adequate": 25,  # >= $100k
        "comprehensive": 15,
        "collision": 15,
        "uninsured_motorist": 15,
    },
    "home": {
        "has_policy": 30,
        "dwelling_adequate": 25,  # Coverage >= estimated rebuild
        "liability": 20,
        "property": 15,
        "recent_review": 10,  # Updated within 2 years
    },
    "life": {
        "has_policy": 40,
        "coverage_adequate": 40,  # >= 10x annual income (we estimate)
        "term_appropriate": 20,
    },
    "umbrella": {
        "has_policy": 50,
        "limit_adequate": 50,  # >= $1M
    },
    # Business types
    "general_liability": {
        "has_policy": 40,
        "limit_adequate": 35,  # >= $1M per occurrence
        "aggregate_adequate": 25,  # >= $2M aggregate
    },
    "professional_liability": {
        "has_policy": 50,
        "limit_adequate": 50,
    },
    "commercial_property": {
        "has_policy": 50,
        "coverage_adequate": 50,
    },
    "cyber": {
        "has_policy": 60,
        "limit_adequate": 40,
    },
    "renters": {
        "has_policy": 50,
        "property_adequate": 30,
        "liability": 20,
    },
}

# Thresholds for adequate coverage
ADEQUACY_THRESHOLDS = {
    "auto_liability": 100000,
    "umbrella_limit": 1000000,
    "home_dwelling": 250000,  # Minimum recommended
    "gl_per_occurrence": 1000000,
    "gl_aggregate": 2000000,
    "professional_liability": 1000000,
    "cyber_limit": 1000000,
}


def calculate_category_score(policies: list[dict], category: str, all_details: dict) -> dict:
    """Calculate score for a specific category."""
    weights = SCORING_WEIGHTS.get(category, {})
    if not weights:
        return {"score": 0, "breakdown": {}, "insights": []}

    breakdown = {}
    insights = []
    total_weight = sum(weights.values())

    # Filter policies for this category
    cat_policies = [p for p in policies if p.get("policy_type", "").lower() == category]

    # Has policy?
    has_policy = len(cat_policies) > 0
    if "has_policy" in weights:
        breakdown["has_policy"] = weights["has_policy"] if has_policy else 0
        if not has_policy:
            insights.append(f"No {category} policy found")

    if not has_policy:
        score = (sum(breakdown.values()) / total_weight) * 100 if total_weight > 0 else 0
        return {"score": round(score), "breakdown": breakdown, "insights": insights}

    # Category-specific checks
    if category == "auto":
        # Check liability limit
        max_liability = max((p.get("coverage_amount") or 0) for p in cat_policies)
        if "liability_adequate" in weights:
            if max_liability >= ADEQUACY_THRESHOLDS["auto_liability"]:
                breakdown["liability_adequate"] = weights["liability_adequate"]
            else:
                breakdown["liability_adequate"] = int(weights["liability_adequate"] * (max_liability / ADEQUACY_THRESHOLDS["auto_liability"]))
                insights.append(f"Consider increasing liability to $100k+")

        # Check for comprehensive/collision via details
        policy_ids = [p["id"] for p in cat_policies]
        has_comp = any(
            "comprehensive" in (all_details.get(pid, {}).get("coverage_type", "") or "").lower()
            for pid in policy_ids
        )
        has_coll = any(
            "collision" in (all_details.get(pid, {}).get("coverage_type", "") or "").lower()
            for pid in policy_ids
        )
        has_um = any(
            "uninsured" in (all_details.get(pid, {}).get("coverage_type", "") or "").lower()
            for pid in policy_ids
        )

        # Give partial credit if we can't determine
        breakdown["comprehensive"] = weights.get("comprehensive", 0) if has_comp else int(weights.get("comprehensive", 0) * 0.5)
        breakdown["collision"] = weights.get("collision", 0) if has_coll else int(weights.get("collision", 0) * 0.5)
        breakdown["uninsured_motorist"] = weights.get("uninsured_motorist", 0) if has_um else int(weights.get("uninsured_motorist", 0) * 0.5)

        if not has_um:
            insights.append("Verify uninsured motorist coverage")

    elif category == "home":
        max_dwelling = max((p.get("coverage_amount") or 0) for p in cat_policies)
        if "dwelling_adequate" in weights:
            if max_dwelling >= ADEQUACY_THRESHOLDS["home_dwelling"]:
                breakdown["dwelling_adequate"] = weights["dwelling_adequate"]
            else:
                breakdown["dwelling_adequate"] = int(weights["dwelling_adequate"] * 0.5)
                insights.append("Review dwelling coverage amount")

        breakdown["liability"] = weights.get("liability", 0)  # Assume included
        breakdown["property"] = weights.get("property", 0)  # Assume included

        # Check recency
        newest_policy = max(cat_policies, key=lambda p: p.get("created_at", ""))
        try:
            created = datetime.fromisoformat(str(newest_policy.get("created_at", ""))[:10])
            years_old = (datetime.now() - created).days / 365
            if years_old <= 2:
                breakdown["recent_review"] = weights.get("recent_review", 0)
            else:
                breakdown["recent_review"] = 0
                insights.append("Policy hasn't been reviewed in 2+ years")
        except:
            breakdown["recent_review"] = int(weights.get("recent_review", 0) * 0.5)

    elif category == "life":
        max_coverage = max((p.get("coverage_amount") or 0) for p in cat_policies)
        if "coverage_adequate" in weights:
            # Assume $500k is "adequate" as baseline
            if max_coverage >= 500000:
                breakdown["coverage_adequate"] = weights["coverage_adequate"]
            elif max_coverage >= 250000:
                breakdown["coverage_adequate"] = int(weights["coverage_adequate"] * 0.7)
            else:
                breakdown["coverage_adequate"] = int(weights["coverage_adequate"] * 0.4)
                insights.append("Consider increasing life coverage")

        breakdown["term_appropriate"] = weights.get("term_appropriate", 0)  # Assume appropriate

    elif category == "umbrella":
        max_limit = max((p.get("coverage_amount") or 0) for p in cat_policies)
        if "limit_adequate" in weights:
            if max_limit >= ADEQUACY_THRESHOLDS["umbrella_limit"]:
                breakdown["limit_adequate"] = weights["limit_adequate"]
            else:
                breakdown["limit_adequate"] = int(weights["limit_adequate"] * (max_limit / ADEQUACY_THRESHOLDS["umbrella_limit"]))
                insights.append("Consider $1M+ umbrella coverage")

    elif category == "general_liability":
        max_coverage = max((p.get("coverage_amount") or 0) for p in cat_policies)
        if "limit_adequate" in weights:
            threshold = ADEQUACY_THRESHOLDS["gl_per_occurrence"]
            if max_coverage >= threshold:
                breakdown["limit_adequate"] = weights["limit_adequate"]
            else:
                breakdown["limit_adequate"] = int(weights["limit_adequate"] * min(1.0, max_coverage / threshold))
                insights.append("Consider $1M+ per-occurrence GL limit")
        breakdown["aggregate_adequate"] = weights.get("aggregate_adequate", 0)  # Assume adequate if policy exists

    elif category in ("professional_liability", "commercial_property", "cyber"):
        max_coverage = max((p.get("coverage_amount") or 0) for p in cat_policies)
        threshold = ADEQUACY_THRESHOLDS.get(f"{category}_limit", ADEQUACY_THRESHOLDS.get(category, 1000000))
        if "limit_adequate" in weights:
            if max_coverage >= threshold:
                breakdown["limit_adequate"] = weights["limit_adequate"]
            else:
                breakdown["limit_adequate"] = int(weights["limit_adequate"] * min(1.0, max_coverage / threshold)) if max_coverage > 0 else int(weights["limit_adequate"] * 0.5)
        if "coverage_adequate" in weights:
            breakdown["coverage_adequate"] = weights["coverage_adequate"] if max_coverage > 0 else int(weights["coverage_adequate"] * 0.5)

    elif category == "renters":
        breakdown["property_adequate"] = weights.get("property_adequate", 0)
        breakdown["liability"] = weights.get("liability", 0)

    score = (sum(breakdown.values()) / total_weight) * 100 if total_weight > 0 else 0
    return {"score": round(score), "breakdown": breakdown, "insights": insights}


def calculate_overall_score(category_scores: dict) -> dict:
    """Calculate weighted overall score from category scores."""
    # Weight categories by importance
    category_weights = {
        "auto": 25,
        "home": 25,
        "life": 20,
        "umbrella": 15,
        "renters": 15,  # Alternative to home
        "general_liability": 20,
        "professional_liability": 15,
        "commercial_property": 15,
        "cyber": 15,
    }

    total_weight = 0
    weighted_sum = 0
    all_insights = []

    for cat, data in category_scores.items():
        weight = category_weights.get(cat, 10)
        if data["score"] > 0:  # Only count categories with policies
            weighted_sum += data["score"] * weight
            total_weight += weight
        all_insights.extend(data.get("insights", []))

    overall = round(weighted_sum / total_weight) if total_weight > 0 else 0

    return {
        "score": overall,
        "breakdown": {cat: data["score"] for cat, data in category_scores.items()},
        "insights": all_insights[:5],  # Top 5 insights
    }


@router.get("")
def get_coverage_scores(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get all coverage scores for the current user."""
    # Get user's policies
    policies = db.execute(
        select(Policy).where(Policy.user_id == user.id)
    ).scalars().all()

    # Skip placeholder policies
    policy_list = [
        {
            "id": p.id,
            "policy_type": p.policy_type,
            "carrier": p.carrier,
            "coverage_amount": p.coverage_amount,
            "deductible": p.deductible,
            "premium_amount": p.premium_amount,
            "created_at": str(p.created_at) if p.created_at else None,
        }
        for p in policies
        if p.carrier != "Pending extraction..."
    ]

    # Get all policy details
    all_details = {}
    for p in policies:
        details = db.execute(
            select(PolicyDetail).where(PolicyDetail.policy_id == p.id)
        ).scalars().all()
        all_details[p.id] = {d.field_name.lower(): d.field_value for d in details}

    # Calculate scores for each category
    categories = ["auto", "home", "life", "umbrella", "general_liability", "professional_liability", "commercial_property", "cyber"]
    category_scores = {}

    for cat in categories:
        category_scores[cat] = calculate_category_score(policy_list, cat, all_details)

    # Check for renters as alternative to home
    renters_policies = [p for p in policy_list if p.get("policy_type", "").lower() == "renters"]
    if renters_policies and not any(p.get("policy_type", "").lower() == "home" for p in policy_list):
        category_scores["renters"] = calculate_category_score(policy_list, "renters", all_details)
        # Give renters similar scoring to home but simplified
        category_scores["renters"] = {
            "score": 70 if renters_policies else 0,
            "breakdown": {"has_policy": 70 if renters_policies else 0},
            "insights": [] if renters_policies else ["No renters insurance"],
        }

    # Calculate overall score
    overall = calculate_overall_score(category_scores)

    # Save scores to database for caching
    for cat, data in category_scores.items():
        existing = db.execute(
            select(CoverageScore).where(
                CoverageScore.user_id == user.id,
                CoverageScore.category == cat
            )
        ).scalar_one_or_none()

        if existing:
            existing.score_total = data["score"]
            existing.score_breakdown = json.dumps(data["breakdown"])
            existing.insights = json.dumps(data["insights"])
            existing.last_calculated = datetime.now()
        else:
            score = CoverageScore(
                user_id=user.id,
                category=cat,
                score_total=data["score"],
                score_breakdown=json.dumps(data["breakdown"]),
                insights=json.dumps(data["insights"]),
            )
            db.add(score)

    # Save overall score
    overall_existing = db.execute(
        select(CoverageScore).where(
            CoverageScore.user_id == user.id,
            CoverageScore.category == "overall"
        )
    ).scalar_one_or_none()

    if overall_existing:
        overall_existing.score_total = overall["score"]
        overall_existing.score_breakdown = json.dumps(overall["breakdown"])
        overall_existing.insights = json.dumps(overall["insights"])
        overall_existing.last_calculated = datetime.now()
    else:
        score = CoverageScore(
            user_id=user.id,
            category="overall",
            score_total=overall["score"],
            score_breakdown=json.dumps(overall["breakdown"]),
            insights=json.dumps(overall["insights"]),
        )
        db.add(score)

    db.commit()

    return {
        "overall": overall,
        "categories": category_scores,
        "policy_count": len(policy_list),
    }


@router.post("/recalculate")
def recalculate_scores(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Force recalculation of coverage scores."""
    # Delete existing scores
    existing = db.execute(
        select(CoverageScore).where(CoverageScore.user_id == user.id)
    ).scalars().all()

    for score in existing:
        db.delete(score)

    db.commit()

    # Recalculate
    return get_coverage_scores(db=db, user=user)
