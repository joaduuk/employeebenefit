# EEB — Employee Essential Benefit

Day 1 scaffold. Same stack as RoscaApp: Python/FastAPI + PostgreSQL on the
backend, React (Vite) + Tailwind on the frontend.

## What's in this scaffold

- **Auth (JWT + password reset)** — register, login, email verification,
  forgot/reset password. The reset-password endpoint takes the new password
  in a POST body from day 1 (a bug we hit and fixed later in RoscaApp —
  starting eeb with it already correct).
- **4-module role model** — `User.role` is one of `super_admin` (Platform),
  `company_admin` (Company), `merchant` (Merchant), `employee` (Employee).
  `require_roles(...)` in `app/core/dependencies.py` gates endpoints by module.
- **Frontend auth wiring** — `AuthContext`, `api.js` (with the
  "don't log out on a failed login" 401 fix baked in), a role-aware
  `ProtectedRoute`, and a single `Dashboard` placeholder that shows which
  module the logged-in user belongs to.
- **Wildcard route placed last** in `App.jsx` — another bug hit later in
  RoscaApp (a `*` route swallowing `/blog`); starting eeb with it correct.

## Not yet built (from your Day 1 notes — next steps)

- Employer / Merchant / Employee data models beyond `User`
- Billing-cycle engine (per-employer payroll day, cutoff date, settlement delay)
- QR code generation + dynamic challenge flow, GPS-location match
- Semi-manual transaction-code fallback flow
- Merchant category restrictions
- Settlement/payout logic (Open Banking / Direct Debit / Faster Payments)

## Backend setup

```
cd backend
python -m venv venv
venv\Scripts\activate          # PowerShell
pip install -r requirements.txt --break-system-packages
copy .env.example .env         # then fill in real values
uvicorn app.main:app --reload
```

Create the Postgres database first (`eeb_db` by default — matches `.env.example`).

## Frontend setup

```
cd frontend
npm install
npm run dev
```

Create a `.env` in `frontend/` with:
```
VITE_API_URL=http://localhost:8000
```
