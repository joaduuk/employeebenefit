# backend/app/schemas/public.py
from pydantic import BaseModel
from typing import Optional


class PublicMerchantMapView(BaseModel):
    """
    Deliberately minimal — no owner details, no bank info, no exact
    business_address, no merchant id. Just enough for a prospective user
    or employer to see where participating merchants are located.
    """
    business_name: str
    category: str
    area: Optional[str] = None  # postcode outward code, e.g. "SW1A" — not the full postcode
    latitude: float
    longitude: float

    class Config:
        from_attributes = True


class PublicMerchantCategoryCount(BaseModel):
    category: str
    count: int


class PublicMerchantStatsView(BaseModel):
    total_approved_merchants: int
    by_category: list[PublicMerchantCategoryCount]
