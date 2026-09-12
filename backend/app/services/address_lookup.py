# backend/app/services/address_lookup.py
"""
Thin wrapper around Homedata's address lookup API
(https://homedata.co.uk/address-lookup-api).

Kept server-side deliberately — the API key must never reach the
browser, both to protect it and because Homedata's free-tier billing
is call-weighted (find/postcode = 2 calls, retrieve = 5 calls), so a
leaked key could be hammered by anyone.

Every function returns None on any failure (bad request, no results,
network error, rate limit, quota exhausted) rather than raising —
callers (the router) turn that into a clean failure response, which
the frontend uses as its signal to fall back to manual address entry.
Address lookup failing is never fatal to registration; it's a
convenience layer on top of a form that always still works manually.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

HOMEDATA_BASE = "https://api.homedata.co.uk"


def _headers() -> dict:
    return {"Authorization": f"Api-Key {settings.HOMEDATA_API_KEY}"}


def find_addresses(query: str) -> list[dict] | None:
    """
    Type-ahead search. Returns a list of {address, postcode, uprn}
    suggestions, or None on failure.
    """
    if not query or len(query.strip()) < 2:
        return None
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                f"{HOMEDATA_BASE}/address/find/",
                params={"q": query.strip()},
                headers=_headers(),
            )
        if response.status_code == 200:
            return response.json().get("suggestions", [])
        logger.warning(f"Homedata find returned status {response.status_code}: {response.text[:200]}")
        return None
    except httpx.RequestError as exc:
        logger.error(f"Homedata find request failed: {exc}")
        return None


def find_addresses_by_postcode(postcode: str) -> list[dict] | None:
    """
    Lists all addresses at a given postcode. Returns a list of
    {address, postcode, uprn} entries, or None on failure.
    """
    if not postcode or not postcode.strip():
        return None
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                f"{HOMEDATA_BASE}/address/postcode/",
                params={"postcode": postcode.strip()},
                headers=_headers(),
            )
        if response.status_code == 200:
            return response.json().get("suggestions", [])
        logger.warning(f"Homedata postcode lookup returned status {response.status_code}: {response.text[:200]}")
        return None
    except httpx.RequestError as exc:
        logger.error(f"Homedata postcode lookup request failed: {exc}")
        return None


def retrieve_address(uprn: str) -> dict | None:
    """
    Full address detail for a UPRN returned by find/postcode above.
    Returns {address, postcode, town, uprn, latitude, longitude, ...}
    or None on failure.
    """
    if not uprn:
        return None
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                f"{HOMEDATA_BASE}/address/retrieve/{uprn}/",
                headers=_headers(),
            )
        if response.status_code == 200:
            return response.json()
        logger.warning(f"Homedata retrieve returned status {response.status_code}: {response.text[:200]}")
        return None
    except httpx.RequestError as exc:
        logger.error(f"Homedata retrieve request failed: {exc}")
        return None
