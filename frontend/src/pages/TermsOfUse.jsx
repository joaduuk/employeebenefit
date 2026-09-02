import LegalPageLayout from '../components/LegalPageLayout';

const MARKDOWN = `# EEB — Website Terms of Use

**DRAFT — NOT LEGAL ADVICE**
This document is a working blueprint produced to help EEB's founder brief
a solicitor. It is not a finished legal document and must not be relied
upon as EEB's final terms. Sections marked **[LEGAL REVIEW NEEDED]** mark
unresolved questions.

---

## 1. About these Terms

These Website Terms of Use govern your use of the EEB website and app as
a general visitor. If you register as an Employee, Employer, or Merchant,
your use of the actual benefit, payroll, or payment features is governed
by the relevant agreement (the Employee Terms, Employer Agreement, or
Merchant Agreement), which take precedence over these Terms where they
conflict.

## 2. Who can use this site

You must be at least 18 years old to register for an EEB account. General
informational pages (About, FAQ) are available to anyone.

## 3. Acceptable use

You agree not to:

- use the site or app for any unlawful purpose;
- attempt to gain unauthorised access to any account or system;
- interfere with or disrupt the site's operation;
- scrape, copy, or reproduce the site's content without permission;
- attempt to circumvent the registration, approval, or spending-limit
  mechanisms described in the role-specific agreements.

## 4. Accounts

You're responsible for keeping your login credentials secure. Tell us
immediately if you suspect unauthorised access to your account.

## 5. Intellectual property

The EEB name, logo, and site content belong to EEB or its licensors. You
may not use them without permission, other than as necessary to use the
service as intended.

## 6. Third-party links

The site may link to third-party websites we don't control. We're not
responsible for their content or practices.

## 7. Availability

We aim to keep the site and app available, but don't guarantee
uninterrupted access. We may suspend access for maintenance or other
reasons.

## 8. Liability

**[LEGAL REVIEW NEEDED — standard liability/limitation clauses to be
drafted, distinguishing this general site-use liability position from the
role-specific liability provisions in the Employee Terms, Employer
Agreement, and Merchant Agreement.]**

## 9. Changes to these Terms

We may update these Terms from time to time. Continued use of the site
after a change means you accept the updated Terms.

## 10. Governing law

These Terms are governed by the laws of England and Wales, and the courts
of England and Wales have exclusive jurisdiction over any dispute arising
from them.

## 11. Contact

**[Contact details.]**
`;

export default function TermsOfUse() {
  return <LegalPageLayout markdown={MARKDOWN} />;
}
