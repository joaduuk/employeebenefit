# backend/app/routers/public.py
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.approval import ApplicationStatus
from app.schemas.public import (
    PublicMerchantMapView,
    PublicMerchantStatsView,
    PublicMerchantCategoryCount,
)

router = APIRouter(prefix="/public", tags=["Public — Merchant Directory"])


def _postcode_area(postcode: str | None) -> str | None:
    """
    Returns the outward code of a UK postcode (e.g. "SW1A" from
    "SW1A 1AA") for a coarse public-facing area label — never the full
    postcode, to avoid pinpointing a merchant's exact address any more
    precisely than the map marker itself already does.
    """
    if not postcode:
        return None
    cleaned = postcode.strip().upper()
    if " " in cleaned:
        return cleaned.split(" ")[0]
    # No space in the stored value — UK inward codes are always 3
    # characters (digit + 2 letters), so everything before that is the
    # outward code.
    return cleaned[:-3] if len(cleaned) > 3 else cleaned


@router.get("/merchants/map", response_model=List[PublicMerchantMapView])
def public_merchants_map(db: Session = Depends(get_db)):
    """
    No auth required. Only approved merchants with payments enabled and
    known coordinates are shown — this powers the public "find a
    merchant" map and is also usable as a marketing/coverage signal for
    prospective employers.
    """
    merchants = (
        db.query(Merchant)
        .filter(
            Merchant.application_status == ApplicationStatus.APPROVED,
            Merchant.payments_enabled == True,  # noqa: E712
            Merchant.latitude.isnot(None),
            Merchant.longitude.isnot(None),
        )
        .all()
    )
    return [
        PublicMerchantMapView(
            business_name=m.business_name,
            category=m.category.value,
            area=_postcode_area(m.postcode),
            latitude=m.latitude,
            longitude=m.longitude,
        )
        for m in merchants
    ]


@router.get("/merchants/stats", response_model=PublicMerchantStatsView)
def public_merchants_stats(db: Session = Depends(get_db)):
    """
    No auth required. Coverage numbers for marketing pages and employer
    sales conversations — e.g. "150+ approved merchants across the UK".
    Counts ALL approved + payments-enabled merchants, not just the ones
    with coordinates, so this stays accurate even before every merchant
    is geocoded.
    """
    base_query = db.query(Merchant).filter(
        Merchant.application_status == ApplicationStatus.APPROVED,
        Merchant.payments_enabled == True,  # noqa: E712
    )
    total = base_query.count()

    category_rows = (
        db.query(Merchant.category, func.count(Merchant.id))
        .filter(
            Merchant.application_status == ApplicationStatus.APPROVED,
            Merchant.payments_enabled == True,  # noqa: E712
        )
        .group_by(Merchant.category)
        .all()
    )

    return PublicMerchantStatsView(
        total_approved_merchants=total,
        by_category=[
            PublicMerchantCategoryCount(category=cat.value, count=count)
            for cat, count in category_rows
        ],
    )
