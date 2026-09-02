import LegalPageLayout from '../components/LegalPageLayout';

const MARKDOWN = `# EEB — Privacy Policy

**DRAFT — NOT LEGAL ADVICE**
This document is a working blueprint produced to help EEB's founder brief
a solicitor or data protection specialist. It is not a finished legal
document and must not be relied upon as EEB's final privacy commitments.
Sections marked **[LEGAL REVIEW NEEDED]** mark unresolved questions.

---

## 1. Who we are

**EEB Limited** ("EEB", "we", "us") is the data controller for personal
data processed through the EEB platform, except where stated otherwise
below. **[LEGAL REVIEW NEEDED — confirm whether participating Employers
are joint controllers or independent controllers for any category of
data, particularly payroll-deduction-related data.]**

## 2. What personal data we collect

We collect different data depending on your role on the platform:

**If you're an Employee:** full name, login email, phone number, work
email, employee number, department, job title, your spending limits (set
by your Employer), your transaction history, and, if you grant
permission, your approximate device location at the moment you approve a
transaction.

**If you're an Employer administrator:** your name, login email, phone
number, company details, registration number, payroll schedule, and the
limits and category settings you configure for your employees.

**If you're a Merchant:** your name, login email, phone number, business
name and address, business category, registration number, bank payout
details, business location, and your transaction history.

## 3. Location data — a specific note

When approving a purchase, the EEB app may ask your device for your
current location. This is currently collected for future reference only
and does **not** affect whether a purchase is approved. **[LEGAL REVIEW
NEEDED — confirm the correct legal basis and retention approach given
this is collected ahead of any confirmed operational use.]**

## 4. How we use your data and our legal basis

| Purpose | Data used | Legal basis |
|---|---|---|
| Creating and managing your account | Registration details | Performance of a contract |
| Approving and administering the benefit | Employee/Employer configuration | Performance of a contract |
| Processing and approving transactions | Transaction data | Performance of a contract |
| Payroll deduction and settlement | Transaction totals, billing cycle data | Performance of a contract / legal obligation |
| Preventing fraud and misuse | Transaction patterns, location | Legitimate interests |
| Responding to complaints and disputes | Relevant account/transaction data | Legitimate interests / legal obligation |

## 5. Who we share your data with

- **Employers** can see an Employee's application status and the limits
  they've set for them, but not an individual Employee's specific
  purchase history.
- **Merchants** can see the relevant Employee's name and work email once
  a transaction is approved or declined, for reconciliation purposes.
- **Service providers** who host our infrastructure or send emails on our
  behalf, under contracts requiring them to protect your data.
- **Regulators and legal authorities**, where required by law.

We do not sell personal data.

## 6. Your rights

Under UK data protection law, you have the right to access, correct, or
ask us to erase your data; restrict or object to certain processing;
receive your data in a portable format; and complain to the Information
Commissioner's Office (ICO) if you're unhappy with how we've handled your
data.

To exercise any of these rights, contact us at **[contact email]**.

## 7. Security

**[Description of technical/organisational security measures to be
added.]**

## 8. Children

EEB is not intended for use by anyone under 18.

## 9. Changes to this policy

We may update this policy from time to time. We'll notify you of material
changes.
`;

export default function PrivacyPolicy() {
  return <LegalPageLayout markdown={MARKDOWN} />;
}
