import LegalPageLayout from '../components/LegalPageLayout';

const MARKDOWN = `# EEB — Cookie Policy

**DRAFT — NOT LEGAL ADVICE**
This document is a working blueprint produced to help EEB's founder brief
a solicitor. It is not a finished legal document.

**Important note:** based on the platform as currently built, EEB's
authentication uses a bearer token returned at login (stored and sent by
the client, not a browser session cookie). That means the assumption
behind a typical cookie policy — that essential cookies are used for
login sessions — may not currently be accurate for EEB. A real technical
audit of what the website and app actually set (cookies, localStorage, or
otherwise) must be carried out before this policy is finalised.

---

## 1. What this policy covers

This policy explains how EEB uses cookies and similar technologies (such
as local storage) when you use our website and app.

## 2. What are cookies

Cookies are small files stored on your device that help a website
function, remember information, or understand how it's used. "Similar
technologies" includes browser local storage, which EEB's login system
currently appears to use to hold your session token.

## 3. Categories we may use

**[TO BE CONFIRMED BY TECHNICAL AUDIT]**

| Category | Purpose | Can you opt out? |
|---|---|---|
| Strictly necessary | Keeping you logged in | No — needed for the site to function |
| Functional | Remembering preferences | Yes |
| Analytics | Understanding how the site is used | Yes |
| Marketing | Not currently used | N/A |

## 4. Managing cookies

Most browsers let you control or delete cookies through their settings.
Blocking strictly necessary cookies (or clearing local storage) may
prevent you from staying logged in.

## 5. Changes to this policy

We'll update this policy once the technical audit referenced above is
complete, and again whenever what we actually use changes.

## 6. Contact

**[Contact details.]**
`;

export default function CookiePolicy() {
  return <LegalPageLayout markdown={MARKDOWN} />;
}
