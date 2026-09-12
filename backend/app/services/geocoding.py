# backend/app/services/geocoding.py
"""
UK postcode -> lat/lng geocoding via postcodes.io (free, no API key required).
Used to populate Merchant.latitude / Merchant.longitude for the merchant
search + map features.

Written as plain sync functions (using httpx.Client, not AsyncClient) to
match the rest of the codebase, which uses sync `def` routes with a sync
SQLAlchemy Session — no event loop to await into.
"""

import logging
import re

import httpx

logger = logging.getLogger(__name__)

POSTCODES_IO_BASE = "https://api.postcodes.io/postcodes"

# Standard UK postcode pattern (outward + inward code), case-insensitive.
# Matches formats like "SW1A 1AA", "M1 1AE", "B33 8TH", "EC1A1BB".
UK_POSTCODE_REGEX = re.compile(
    r"([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})", re.IGNORECASE
)


def extract_uk_postcode(text: str) -> str | None:
    """
    Best-effort extraction of a UK postcode from a free-text string
    (e.g. an old `business_address` value that was never split into a
    dedicated postcode field). Returns the matched postcode as found, or
    None if nothing postcode-shaped is present.
    """
    if not text:
        return None
    match = UK_POSTCODE_REGEX.search(text)
    return match.group(1).strip() if match else None


def geocode_uk_postcode(postcode: str) -> tuple[float, float] | None:
    """
    Look up a UK postcode and return (latitude, longitude), or None if the
    postcode is invalid/not found or the lookup fails.
    """
    if not postcode or not postcode.strip():
        return None

    normalized = postcode.strip().upper()

    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(f"{POSTCODES_IO_BASE}/{normalized}")

        if response.status_code == 200:
            data = response.json()
            result = data.get("result")
            if result:
                return result["latitude"], result["longitude"]
            return None

        if response.status_code == 404:
            logger.warning(f"Postcode not found by postcodes.io: {normalized}")
            return None

        logger.warning(
            f"postcodes.io returned unexpected status {response.status_code} "
            f"for postcode {normalized}"
        )
        return None

    except httpx.RequestError as exc:
        logger.error(f"Geocoding request failed for postcode {normalized}: {exc}")
        return None


def geocode_uk_postcodes_bulk(
    postcodes: list[str],
) -> dict[str, tuple[float, float] | None]:
    """
    Bulk version using postcodes.io's /postcodes bulk lookup endpoint
    (accepts up to 100 postcodes per request). Used by the one-off
    backfill script for merchants that registered before `postcode`
    existed as a dedicated field.

    Returns a dict mapping the original postcode string -> (lat, lng) or None.
    """
    results: dict[str, tuple[float, float] | None] = {}
    if not postcodes:
        return results

    chunk_size = 100
    with httpx.Client(timeout=10.0) as client:
        for i in range(0, len(postcodes), chunk_size):
            chunk = postcodes[i : i + chunk_size]
            try:
                response = client.post(POSTCODES_IO_BASE, json={"postcodes": chunk})
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("result", []):
                        original = item["query"]
                        result = item.get("result")
                        results[original] = (
                            (result["latitude"], result["longitude"])
                            if result
                            else None
                        )
                else:
                    logger.warning(
                        f"Bulk geocode request failed with status "
                        f"{response.status_code}"
                    )
                    for pc in chunk:
                        results[pc] = None
            except httpx.RequestError as exc:
                logger.error(f"Bulk geocoding request failed: {exc}")
                for pc in chunk:
                    results[pc] = None

    return results
