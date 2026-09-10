import LegalPageLayout from '../components/LegalPageLayout';

const MARKDOWN = `# EEB — Merchant Agreement

**DRAFT — NOT LEGAL ADVICE**
This document is a working blueprint produced to help EEB's founder brief
a solicitor. It is not a finished legal document and must not be
published, relied upon, or presented to any merchant until a solicitor
has reviewed and revised it. Clauses flagged **[LEGAL REVIEW NEEDED]** or
**[COMMERCIAL DECISION NEEDED]** mark points that haven't yet been
finalised — see eeb-regulatory-status.md for the underlying context.

---

## 1. Parties

This Agreement is between **[EEB Limited]** ("**EEB**", "**we**", "**us**")
and **[Merchant legal name]** ("**you**", "**Merchant**").

## 2. What this Agreement covers

This Agreement governs your participation as an approved merchant on the
EEB platform, under which eligible employees of participating employers
may pay for essential purchases at your business using the EEB app, with
payment to you settled as set out below.

## 3. Becoming an approved merchant

**3.1** You must apply and be approved by EEB before accepting EEB
payments. EEB may approve, reject, or later suspend your account at its
discretion, including where your business falls outside EEB's permitted
merchant categories.

**3.2** Approval as a merchant (an "approved business") is separate from
being enabled to receive payouts. Payouts are enabled only once your bank
account details have been separately verified.

**3.3** You must accurately represent your business category at
registration. EEB and participating employers rely on this to enforce
category restrictions on employee spending.

## 4. How a transaction works

**4.1** To accept an EEB payment, you enter the purchase amount into the
EEB merchant app, which generates a short code (and, where applicable, a
QR code) for the customer.

**4.2** The customer enters or scans the code in their own EEB app and
either approves or the transaction is declined (including where it
would exceed the customer's spending limit). You will only be shown a
clear "approved" or "not approved" result — you don't need to know why a
purchase was or wasn't approved.

**4.3** You may only release goods or services once your screen confirms
the transaction as approved. EEB is not responsible for goods released
against a transaction that was not shown as approved.

**4.4** You may optionally tag a transaction with a general category note
for your own records before presenting the code to the customer. This
note is for your own reconciliation only and is never shown to the
customer.

## 5. Payment to you

**5.1 Guaranteed payment.** Once a transaction is shown as **approved**,
you are entitled to be paid the transaction amount by EEB in accordance
with this Section, regardless of whether EEB successfully recovers the
corresponding amount from the relevant employer or employee. This is not
conditional on any later event.

**5.2 Settlement timing.** **[COMMERCIAL DECISION NEEDED]** — EEB's
current working proposal is that transactions approved within a calendar
month are totalled and paid to you on the last day of the following
calendar month (for example, transactions from 1–30 June are paid on 31
July). This has not yet been finalised against EEB's own cash-flow
position relative to when it collects payment from employers, and may be
adjusted — see eeb-regulatory-status.md and the underlying settlement
design discussion for context. Any change will be notified to you in
advance.

**5.3** Payment is made to the bank account details you've provided and
verified.

## 6. Refunds and disputes

**[COMMERCIAL DECISION NEEDED]** — EEB has not yet finalised how a
disputed or refunded purchase is handled after you've already been
settled for it (for example, whether EEB adjusts a future payout to you,
or whether refunds are handled entirely outside the platform between you
and the customer). This section must be completed, and reflected
consistently in the Employee Terms, before this Agreement is finalised.

## 7. Fees

**[Fee structure to be confirmed.]**

## 8. Your obligations

**8.1** You agree to accept EEB payments on the same basis as other
accepted payment methods, honour approved transactions promptly, and not
discriminate against customers paying via EEB.

**8.2** You agree not to process a transaction for any purpose other than
a genuine sale of goods or services actually provided, and not to permit
cash-back, transaction splitting, or any other means of circumventing a
customer's spending limit.

## 9. Suspension and termination

EEB may suspend or terminate your approval at any time, including for
breach of this Agreement, suspected misuse, or a change in your business
that takes it outside EEB's permitted merchant categories.

## 10. Data protection

We handle personal data associated with running the EEB payment flow
(including limited details about the employees who transact with you) in
accordance with our Privacy Policy. **[LEGAL REVIEW NEEDED — confirm the
data protection role of each party for data shared during a transaction,
e.g. employee name/work email shown to you once a transaction is
approved.]**

## 11. Liability

**[LEGAL REVIEW NEEDED — standard liability/indemnity clauses, calibrated
to reflect the guaranteed-payment commitment in Section 5.]**

## 12. Term and termination

**[Standard term/termination boilerplate to be drafted.]**

## 13. Governing law

This Agreement is governed by the laws of England and Wales, and the
courts of England and Wales have exclusive jurisdiction over any dispute
arising from it.

---

**Regulatory status note (for internal reference, not final copy):** the
guaranteed-payment commitment in Section 5.1 is a deliberate commercial
position (similar to standard card-network settlement models) rather than
a source of regulatory risk in itself, but it does mean EEB carries
settlement-timing and credit risk that must be matched by adequate
working capital — see eeb-regulatory-status.md for the wider context.
`;

export default function MerchantAgreement() {
  return <LegalPageLayout markdown={MARKDOWN} />;
}
