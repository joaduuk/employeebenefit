import LegalPageLayout from '../components/LegalPageLayout';

const MARKDOWN = `# EEB — Employee Terms & Conditions

**DRAFT — NOT LEGAL ADVICE**
This document is a working blueprint produced to help EEB's founder brief a
solicitor. It is not a finished legal document, has not been reviewed by a
qualified lawyer, and must not be published, relied upon, or presented to
any employee, employer, or merchant until a solicitor with UK consumer
credit / fintech regulatory experience has reviewed and revised it. Several
clauses below are flagged **[LEGAL REVIEW NEEDED]** where the drafting
depends on an unresolved regulatory question — see EEB's internal
regulatory-status notes for context.

---

## 1. Who this agreement is between

These Terms are an agreement between:

- **You** — an individual employee of a company that has been approved to
  offer the EEB benefit (your "**Employer**"); and
- **[EEB Limited]**, a company registered in England and Wales
  (company number **[XXXXXXX]**), of **[registered address]** ("**EEB**",
  "**we**", "**us**").

By registering for an EEB account, you accept these Terms.

## 2. What EEB is

EEB (Employee Essential Benefit) is a workplace benefit made available to
you by your Employer. It lets you use part of an agreed spending limit to
pay for essential everyday purchases — such as groceries, pharmacy items,
and baby supplies — at merchants approved by EEB, before your next payday.
The amount you use is subsequently accounted for through your Employer's
payroll process, as described in Section 6.

**[LEGAL REVIEW NEEDED]** — the correct regulatory characterisation of
this arrangement (e.g. earned wage access, employer-guaranteed commercial
credit, or another category) has not yet been confirmed by a qualified
advisor and materially affects the drafting of this entire document.

## 3. Eligibility

To use EEB you must:

- be a current employee of an Employer that has been approved by EEB;
- be approved individually by your Employer through the EEB platform;
- be at least 18 years old; and
- provide accurate registration details, including a work email your
  Employer can use to verify your employment.

Your Employer decides whether to approve your registration and sets the
limits described in Section 5. EEB does not independently assess your
personal financial circumstances.

## 4. Your account

You're responsible for keeping your login details secure and for all
activity approved from your account. Tell us immediately if you believe
your account has been accessed without your permission.

## 5. Your spending limit

**5.1** Your Employer sets your spending limit and may also set a maximum
amount per purchase, a daily limit, and/or a weekly limit. These may
differ from other employees' limits — your Employer decides them based on
their own judgement of what's appropriate for you.

**5.2** The amount available to you at any time is your spending limit
minus your current outstanding balance (amounts you've used that haven't
yet been cleared through payroll — see Section 6).

**5.3** You may use up to your available amount, at approved merchants,
for eligible categories only (Section 7). You may not exceed your
spending limit, and the EEB app will not approve a purchase that would do
so.

**5.4** Your full outstanding balance for a given billing cycle is settled
in one amount through your Employer's payroll process, not through
partial or instalment payments. Once that amount has been cleared, your
full spending limit becomes available again for the next cycle. If it is
not cleared, your available amount remains at zero until it is.

## 6. Payroll deduction — your authorisation

**6.1** By accepting these Terms, you authorise your Employer to deduct
from your salary, on each occasion described below, an amount equal to
your outstanding EEB balance for the relevant billing cycle, and to remit
that amount in accordance with your Employer's arrangements for the EEB
benefit.

**6.2** This authorisation is given for the purposes of section 13 of the
Employment Rights Act 1996 (deductions from wages) and applies to each
billing cycle for as long as you continue to use the EEB benefit. You may
withdraw this authorisation at any time by ceasing to use EEB and
notifying your Employer, though this does not affect deductions already
authorised for amounts already used.

**6.3** **[LEGAL REVIEW NEEDED]** — the precise legal relationship between
you, your Employer, and EEB regarding this deduction (i.e. whether your
repayment obligation runs to your Employer only, with your Employer
separately responsible to EEB, or whether you owe EEB directly) is a
structural choice that needs to be confirmed by a solicitor and reflected
consistently across this document and the Employer Agreement.

**6.4** National Minimum Wage: your Employer will not make a deduction
under this clause that would reduce your pay below the National Minimum
Wage where such a deduction is not permitted by law. **[LEGAL REVIEW
NEEDED — confirm which deduction category this falls into.]**

## 7. What you can use EEB for

**7.1** EEB may only be used for essential everyday purchases at merchants
approved by EEB, within the categories your Employer has enabled for you.
Typical categories include groceries, pharmacy items, and baby supplies.

**7.2** You must not use EEB to withdraw cash, to make purchases on behalf
of someone else, for any unlawful purpose, or to circumvent your spending
limit (for example, by asking a merchant to split a purchase into smaller
transactions).

**7.3** We and your Employer may decline any purchase that doesn't meet
these requirements, without needing to give a detailed reason at the point
of sale.

## 8. If your employment ends

**8.1** Your access to EEB ends when your employment with your Employer
ends. Any outstanding balance at that point is handled as part of your
final pay, to the extent permitted by law, or by such other arrangement as
your Employer puts in place.

**8.2** As between you and your Employer, your Employer remains
responsible for resolving any shortfall with EEB — see the Employer
Agreement. This does not remove your own obligation to your Employer to
repay amounts you've used, to the extent set out in your employment
contract or company policy.

## 9. Fees

EEB is free for you to use. We do not charge you any fee, interest, or
other charge for using the benefit, and we never will.

## 10. If you're struggling financially

If you're finding it difficult to manage your EEB usage or your wider
finances, please tell us and your Employer as soon as possible — we'd
rather help you find a workable solution than have you struggle in
silence. **[LEGAL REVIEW NEEDED — consider whether a formal vulnerable
customer / financial difficulty policy should be incorporated by
reference, particularly given the unresolved regulatory classification.]**

## 11. Your data

We handle your personal data in accordance with our Privacy Policy
**[link]**, which explains what we collect, why, and your rights.

## 12. Suspending or ending your access

We or your Employer may suspend or end your access to EEB — for example,
if we reasonably believe these Terms have been breached, your account is
being misused, or your Employer's participation in EEB ends. We'll tell
you where reasonably practicable.

## 13. Complaints

If something's gone wrong, contact us at **[complaints email]**. See our
Complaints Handling Procedure **[link]** for how we deal with complaints
and your right to escalate.

## 14. Liability

**[LEGAL REVIEW NEEDED — standard liability/limitation clauses to be
drafted by a solicitor, calibrated to the confirmed regulatory
classification of the service.]**

## 15. Changes to these Terms

We may update these Terms from time to time. We'll give you reasonable
notice of material changes before they take effect.

## 16. Governing law

These Terms are governed by the laws of England and Wales, and the
courts of England and Wales have exclusive jurisdiction over any dispute
arising from them. **[Confirm whether Scots/Northern Irish law variants
are needed depending on where Employers/Employees are based.]**

---

**Regulatory status note (for internal reference, not final copy):** EEB
has not yet confirmed whether it requires FCA authorisation for this
activity, or whether an applicable exemption exists. This document must
not be published or used with real employees until that question is
resolved and this draft has been reviewed accordingly.
`;

export default function EmployeeTerms() {
  return <LegalPageLayout markdown={MARKDOWN} />;
}
