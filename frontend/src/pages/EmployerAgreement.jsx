import LegalPageLayout from '../components/LegalPageLayout';

const MARKDOWN = `# EEB — Employer Agreement

**DRAFT — NOT LEGAL ADVICE**
This document is a working blueprint produced to help EEB's founder brief
a solicitor. It is not a finished legal document, has not been reviewed by
a qualified lawyer, and must not be published, relied upon, or presented
to any employer until a solicitor with UK consumer credit / commercial
contract / fintech regulatory experience has reviewed and revised it.
Clauses flagged **[LEGAL REVIEW NEEDED]** depend on an unresolved
question — see EEB's internal regulatory-status notes for context.

---

## 1. Parties

This Agreement is between:

- **[EEB Limited]**, a company registered in England and Wales (company
  number **[XXXXXXX]**), of **[registered address]** ("**EEB**", "**we**",
  "**us**"); and
- **[Employer legal name]**, a company registered in England and Wales
  (company number **[XXXXXXX]**), of **[registered address]** ("**you**",
  "**Employer**").

## 2. What this Agreement covers

This Agreement governs your participation in EEB, under which your
employees ("**Employees**") who you approve may use a spending limit you
set to make essential purchases at merchants approved by EEB, with the
amounts used settled through your payroll process as set out below.

## 3. Your responsibilities as Employer

**3.1 Approving Employees.** You are responsible for reviewing and
approving each Employee's application, and for setting their spending
limit (and any per-purchase, daily, or weekly sub-limits) based on your
own knowledge of that Employee's role, pay, and circumstances. EEB does
not verify or second-guess these limits.

**3.2 Setting a responsible limit.** You agree to set spending limits that
you reasonably believe the relevant Employee can repay through payroll
without undue hardship. **[LEGAL REVIEW NEEDED — consider whether this
should be a defined contractual standard, e.g. referencing a specific
proportion of net pay, particularly if it strengthens the platform's
overall responsible-provision position.]**

**3.3 Payroll deduction.** You agree to operate payroll deductions for
each participating Employee, in the amount of that Employee's outstanding
EEB balance at the end of each billing cycle, in accordance with that
Employee's written authorisation obtained by EEB (see the Employee Terms).
You are responsible for ensuring these deductions comply with applicable
employment and wages legislation, including National Minimum Wage
protections.

**3.4 Remitting payment to EEB.** You agree to pay EEB the total amount
deducted (or due to be deducted) for each billing cycle by the payment due
date notified to you, calculated as set out in Section 5.

## 4. The Employer Guarantee

**4.1** You agree that you are liable to EEB for the full amount used by
your Employees in each billing cycle (the "**Cycle Amount**"), regardless
of whether you are able to recover that amount, in whole or in part, from
the relevant Employee — including where an Employee resigns, is
dismissed, disputes a deduction, has insufficient net pay in a given
period, or otherwise fails to repay you.

**4.2** Your obligation to pay EEB the Cycle Amount is not conditional on,
or reduced by, your own success or failure in recovering that amount from
your Employees. Recovery from your Employees, including via final pay on
termination of employment, is a matter between you and your Employees.

**4.3** **[LEGAL REVIEW NEEDED]** — this clause is the central commercial
term of the arrangement and needs careful drafting to (a) be enforceable
as a matter of English contract law, (b) correctly interface with the
Employee Terms so the two documents don't create inconsistent or
double-recovery positions, and (c) be assessed by a solicitor for its
effect on the overall regulatory characterisation of the product — see
EEB's internal regulatory-status notes.

## 5. Billing cycles and settlement

**5.1** Your payroll frequency, payroll date, and cutoff period are agreed
with EEB during onboarding and recorded in your account settings.

**5.2** A billing cycle for your organisation runs from the day after the
previous cycle's cutoff to your next cutoff date (the number of days
before your payroll date that you've agreed with EEB). Transactions
approved within that window fall into that cycle.

**5.3** You agree to remit the Cycle Amount to EEB within **[X]** days of
your payroll date for that cycle (the "**Payment Due Date**").

**5.4** **[LEGAL REVIEW NEEDED — consider late-payment interest/fees,
consistent with EEB's overall positioning; late fees on a B2B contract sit
differently, regulatorily, than similar fees charged to an individual.]**

## 6. Eligible spending categories

**6.1** You may set which categories of approved merchant your Employees
can use (for example, allowing supermarkets and pharmacies while blocking
others), and may set individual overrides for specific Employees.

**6.2** EEB reserves the right to exclude certain categories of merchant
from the platform altogether, regardless of your settings.

## 7. Employee offboarding

**7.1** You agree to promptly update an Employee's status in EEB when
their employment ends, so their access is revoked in a timely manner.

**7.2** Amounts outstanding at the point an Employee leaves remain subject
to Section 4 (the Employer Guarantee) regardless of the timing or outcome
of your own recovery process with that Employee.

## 8. Data protection

**[LEGAL REVIEW NEEDED]** — the data protection roles of EEB and Employer
(controller, joint controller, or processor, for different categories of
data involved in approval, limit-setting, and payroll deduction) need to
be properly analysed and documented, likely via a separate Data Processing
Agreement referenced here.

## 9. Fees

**[Fee structure to be confirmed — e.g. per-employee fee, percentage of
volume, or flat platform fee.]**

## 10. Term and termination

**10.1** This Agreement continues until terminated by either party on
**[X]** days' written notice, or immediately by EEB if you materially
breach this Agreement, including a failure to pay a Cycle Amount by its
Payment Due Date.

**10.2** Termination doesn't affect either party's obligations in respect
of billing cycles that began before the termination date, including your
obligation to pay any outstanding Cycle Amount under Section 4.

## 11. Confidentiality

Each party agrees to keep the other's confidential information
confidential and use it only for the purposes of this Agreement.
**[Standard confidentiality clause to be drafted.]**

## 12. Liability and indemnity

**[LEGAL REVIEW NEEDED — standard liability/indemnity clauses, calibrated
to reflect the risk allocation established in Section 4.]**

## 13. General

**[Standard boilerplate — assignment, notices, entire agreement,
severability, no partnership, force majeure — to be drafted.]**

## 14. Governing law

This Agreement is governed by the laws of England and Wales, and the
courts of England and Wales have exclusive jurisdiction over any dispute
arising from it.

---

**Regulatory status note (for internal reference, not final copy):** the
Employer Guarantee in Section 4 is intended to position EEB's primary
credit exposure as a B2B relationship with the Employer rather than a
direct consumer credit relationship with each Employee. Whether this
achieves that effect, and what further changes it requires elsewhere in
EEB's structure, has not yet been confirmed by a qualified regulatory
advisor. This document must not be published or used with a real
Employer until that review is complete.
`;

export default function EmployerAgreement() {
  return <LegalPageLayout markdown={MARKDOWN} />;
}
