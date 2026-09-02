# backend/app/schemas/merchant_settlement.py
from pydantic import BaseModel
from typing import Optional


class MarkSettlementPaidRequest(BaseModel):
    paid_reference: Optional[str] = None
