# backend/app/routers/address_lookup.py
from fastapi import APIRouter, HTTPException, Query

from app.services.address_lookup import (
    find_addresses,
    find_addresses_by_postcode,
    retrieve_address,
)

router = APIRouter(prefix="/address-lookup", tags=["Address Lookup"])

# Deliberately public/no-auth — registration forms are filled out by
# people who don't have an account yet. A 502 here is an expected,
# non-fatal outcome: the frontend catches it and falls back to manual
# address entry, so there's no need to gate this behind auth just to
# protect it from being called.


@router.get("/find")
def find(q: str = Query(..., min_length=2, description="Partial address text to search")):
    results = find_addresses(q)
    if results is None:
        raise HTTPException(status_code=502, detail="Address lookup unavailable — use manual entry")
    return {"suggestions": results}


@router.get("/postcode")
def by_postcode(postcode: str = Query(..., description="UK postcode to list addresses for")):
    results = find_addresses_by_postcode(postcode)
    if results is None:
        raise HTTPException(status_code=502, detail="Address lookup unavailable — use manual entry")
    return {"suggestions": results}


@router.get("/retrieve/{uprn}")
def retrieve(uprn: str):
    result = retrieve_address(uprn)
    if result is None:
        raise HTTPException(status_code=502, detail="Address lookup unavailable — use manual entry")
    return result
