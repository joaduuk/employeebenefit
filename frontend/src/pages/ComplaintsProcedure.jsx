import LegalPageLayout from '../components/LegalPageLayout';

const MARKDOWN = `# EEB — Complaints Handling Procedure

**DRAFT — NOT LEGAL ADVICE**
This document is a working blueprint produced to help EEB's founder brief
a solicitor. It is not a finished legal document.

---

## 1. Our commitment

We want to know if something's gone wrong. This procedure explains how
to raise a complaint about EEB, and what you can expect from us in
response — whether you're an Employee, an Employer, or a Merchant.

## 2. How to complain

You can complain to us by email at **[complaints email]**, through the
app or website's contact form, or in writing to **[registered address]**.
Please include your account details and as much information as possible
about what's gone wrong.

## 3. What happens next

**Acknowledgement.** We'll acknowledge your complaint within
**[X business days]**.

**Investigation.** We'll investigate and aim to give you a full response
within **[X business days/weeks]**. If it's going to take longer, we'll
tell you why and give you a new expected timeframe.

**Our response.** We'll explain what we found, what we're doing about it,
and — if we can't resolve things the way you'd like — your options for
taking it further.

## 4. If you're still not happy

**[LEGAL REVIEW NEEDED]** — whether you have a right to refer an
unresolved complaint to the Financial Ombudsman Service, or any other
formal escalation route, depends on EEB's confirmed regulatory
classification. This section deliberately does not name any escalation
route until that's been established.

## 5. Complaints about a specific transaction

If your complaint relates to a specific purchase, please also see the
relevant terms for your role — the Employee Terms, Employer Agreement, or
Merchant Agreement.

## 6. Contact

**[Contact details.]**
`;

export default function ComplaintsProcedure() {
  return <LegalPageLayout markdown={MARKDOWN} />;
}
