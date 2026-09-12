# backend/scripts/backfill_merchant_postcodes.py
"""
One-off backfill for merchants that predate the `postcode` column.

For every merchant with no `postcode` on file, this tries to extract a
UK postcode from their free-text `business_address` (e.g. "1 Test
Street, London, SW1A 1AA"), then bulk-geocodes whatever it found and
fills in `postcode` / `latitude` / `longitude`.

Merchants whose address has no postcode-shaped text in it are left
alone and printed out at the end — those need a postcode added by hand
via:
    PUT /admin/merchants/{id}/details   { "postcode": "..." }

Run from backend/ with the venv active:
    python -m scripts.backfill_merchant_postcodes
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.services.geocoding import extract_uk_postcode, geocode_uk_postcodes_bulk


def run():
    db = SessionLocal()
    try:
        merchants = db.query(Merchant).filter(Merchant.postcode.is_(None)).all()

        if not merchants:
            print("No merchants missing a postcode. Nothing to do.")
            return

        print(f"Found {len(merchants)} merchant(s) missing a postcode.\n")

        extracted_by_merchant_id = {}
        no_match = []

        for m in merchants:
            found = extract_uk_postcode(m.business_address or "")
            if found:
                extracted_by_merchant_id[m.id] = found
                print(f"  [found]   {m.business_name}: '{found}' (from \"{m.business_address}\")")
            else:
                no_match.append(m)
                print(f"  [skip]    {m.business_name}: no postcode-shaped text in \"{m.business_address}\"")

        if not extracted_by_merchant_id:
            print("\nNo postcodes could be extracted from any merchant's address.")
            print("Add postcodes manually via PUT /admin/merchants/{id}/details.")
            return

        unique_postcodes = list(set(extracted_by_merchant_id.values()))
        print(f"\nGeocoding {len(unique_postcodes)} unique postcode(s) via postcodes.io...")
        geocoded = geocode_uk_postcodes_bulk(unique_postcodes)

        fully_geocoded = 0
        postcode_only = 0

        for m in merchants:
            postcode = extracted_by_merchant_id.get(m.id)
            if not postcode:
                continue
            m.postcode = postcode
            coords = geocoded.get(postcode)
            if coords:
                m.latitude, m.longitude = coords
                fully_geocoded += 1
            else:
                postcode_only += 1
                print(f"  [warn]    Could not geocode '{postcode}' for {m.business_name} — postcode saved, coordinates left blank")

        db.commit()

        print(f"\nDone.")
        print(f"  {fully_geocoded} merchant(s) fully geocoded (postcode + coordinates)")
        print(f"  {postcode_only} merchant(s) got a postcode but failed to geocode — retry later via PUT /admin/merchants/{{id}}/geocode")
        print(f"  {len(no_match)} merchant(s) had no postcode-shaped text — need a postcode added manually")

    finally:
        db.close()


if __name__ == "__main__":
    run()
