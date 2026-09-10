# backend/app/core/document_versions.py
"""
The version stamp recorded on every new consent for each document.
Update the relevant line here whenever that document is meaningfully
revised — existing ConsentRecord rows are never touched or rewritten;
only new consents (new registrations, from that point on) pick up the
new version. This gives an honest historical trail: exactly which
version of a document a given person actually agreed to, even years
after that document has since changed.
"""

CURRENT_DOCUMENT_VERSIONS = {
    "employee_terms": "2026-09-10",
    "employer_agreement": "2026-09-10",
    "merchant_agreement": "2026-09-10",
    "privacy_policy": "2026-09-10",
}
