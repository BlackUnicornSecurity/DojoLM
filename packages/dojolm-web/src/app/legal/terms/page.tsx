// SPDX-License-Identifier: Apache-2.0
/**
 * /legal/terms — Terms of Service (E6.S2; replaces the E6.S1 LegalPlaceholder).
 *
 * FOUNDER SIGN-OFF 2026-07-05 (the operator, QMS 574754de) — the operator accepted
 * this text as APPROVED for the OSS release; external privacy/commercial counsel
 * ratification was WAIVED by founder decision. Entity facts (registry code,
 * registered office, contact) are taken verbatim from `/legal/privacy` (the
 * entity-confirmed source of truth) and must NOT diverge. The clause notes below
 * record what external counsel would otherwise have reviewed (founder-accepted):
 *
 *   - §5 Warranties & liability — the disclaimer is the Apache-2.0 "AS IS"
 *     baseline (factual, from the licence); the jurisdiction-specific
 *     limitation/exclusion of liability and any consumer-law carve-outs are
 *     counsel's to finalise.
 *   - §6 Governing law & disputes — Estonia is the entity's seat; the binding
 *     choice-of-law, forum, and dispute-resolution clause is counsel's.
 *   - §2 Licence — confirm the inbound=outbound DCO statement and the
 *     Apache-2.0 / BUSL-1.1 split wording matches CONTRIBUTING.md + the
 *     LICENSE headers.
 *
 * Operator grep marker for the pre-P7 sweep: `FOUNDER-APPROVED-2026-07-05`.
 */

import type { Metadata } from 'next';

import { LegalDocument, type LegalSection } from '../LegalDocument';

export const metadata: Metadata = {
  title: 'Terms · DojoLM',
  description:
    'The terms of service between operators and DojoLM, an adversarial-evaluation platform operated by BlackUnicorn OÜ.',
};

const SECTIONS: readonly LegalSection[] = [
  {
    n: 1,
    title: 'Who these terms are between',
    paras: [
      `These Terms of Service ("Terms") govern your use of DojoLM, an adversarial-evaluation platform for AI systems operated by BlackUnicorn OÜ, a private limited company (osaühing) registered in Estonia — registry code 16604183, registered office Tornimäe tn 5, 10145 Tallinn, Estonia. BlackUnicorn OÜ is not VAT-registered. In these Terms "BlackUnicorn", "we" and "us" mean BlackUnicorn OÜ; "you" means the operator running, or the organisation on whose behalf you run, a DojoLM deployment.`,
      `DojoLM ships in two build channels, and the relationship differs by channel. For self-hosted deployments you run the software on your own hardware and you are responsible for your installation and your users. For the cloud edition, BlackUnicorn operates the service under separate cloud terms and a Data Processing Agreement, which take precedence over these Terms for that channel.`,
    ],
  },
  {
    n: 2,
    title: 'The software and your licence',
    paras: [
      `The DojoLM community edition is free and open-source software licensed under the Apache License, Version 2.0. Your rights to use, modify, and redistribute the community edition are granted by, and subject to, that licence; nothing in these Terms narrows the rights the Apache-2.0 licence grants you.`,
      // FOUNDER-APPROVED-2026-07-05 — F-QA-015: confirm the inbound=outbound DCO
      // statement and the Apache-2.0 / BUSL-1.1 channel split match
      // CONTRIBUTING.md and the per-tier SPDX/LICENSE headers before P7.
      `Enterprise and cloud capabilities are licensed separately under the Business Source License 1.1 and are not part of the Apache-2.0 community edition. Contributions you submit to the community project are accepted under the project's Developer Certificate of Origin on an inbound-equals-outbound basis (Apache-2.0); see CONTRIBUTING.md in the repository.`,
    ],
    bullets: [
      `Self-hosted operators retain ownership and control of their own installations and the data those installations process.`,
      `BlackUnicorn does not operate, monitor, or hold the accounts of your self-hosted deployment.`,
      `Trademarks and brand assets ("DojoLM", "Black Unicorn") are not licensed by Apache-2.0 and remain ours.`,
    ],
  },
  {
    n: 3,
    title: 'Acceptable use',
    paras: [
      `DojoLM is a security tool that generates and runs adversarial test cases against AI systems. You may use it only against models and systems you own or are explicitly authorised to test. You are solely responsible for obtaining that authorisation and for complying with the terms of any third-party model provider whose system you evaluate.`,
    ],
    bullets: [
      `Do not use DojoLM to probe, attack, or disrupt systems you do not own or are not authorised to test.`,
      `Do not use DojoLM to develop, stage, or deliver real-world harm, or to violate any applicable law, export control, or third-party terms.`,
      `Do not represent DojoLM output as an endorsement, certification, or guarantee by BlackUnicorn of any third party's model.`,
    ],
    parasAfter: [
      `We may describe additional acceptable-use rules in a separate Acceptable Use Policy; where one applies to your channel, it forms part of these Terms.`,
    ],
  },
  {
    n: 4,
    title: 'Data, telemetry, and privacy',
    paras: [
      `How DojoLM handles personal data — including the anonymised platform-telemetry corpus, its lawful basis, retention, and your rights — is described in full in our Privacy policy, which forms part of these Terms. Telemetry is processed on the basis of our legitimate interests, the corpus is anonymised before use, and you can object at any time, at no cost; telemetry is not a condition of using the community edition.`,
    ],
    bullets: [
      `For self-hosted deployments you are the controller of your own users' data; BlackUnicorn is the controller of the anonymised research corpus described in the Privacy policy.`,
      `Model credentials and secrets stay in your environment and are never collected by telemetry.`,
    ],
  },
  {
    n: 5,
    title: 'Warranties and limitation of liability',
    paras: [
      // FOUNDER-APPROVED-2026-07-05 — F-QA-015: the sentence below is the
      // Apache-2.0 "AS IS" baseline (factual, from the licence). The
      // jurisdiction-specific limitation/exclusion of liability, the
      // consumer-law carve-outs, and the cloud-tier liability cap are
      // counsel's to finalise — do NOT treat this section as final.
      `The community edition is provided on an "AS IS" and "AS AVAILABLE" basis, without warranties or conditions of any kind, to the fullest extent permitted by law, as set out in the Apache License 2.0. You are responsible for evaluating whether DojoLM is suitable for your use.`,
      `To the maximum extent permitted by applicable law, BlackUnicorn is not liable for indirect, incidental, special, consequential, or exemplary damages arising from your use of the community edition. Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited, including for death or personal injury caused by negligence or for fraud. Cloud-edition liability is governed by the separate cloud terms.`,
    ],
  },
  {
    n: 6,
    title: 'Governing law, changes, and contact',
    paras: [
      // FOUNDER-APPROVED-2026-07-05 — F-QA-015: Estonia is the entity's
      // registered seat; the binding governing-law, forum, and
      // dispute-resolution clause (and any mandatory consumer-jurisdiction
      // carve-outs) are counsel's to finalise before P7.
      `These Terms are governed by the laws of Estonia, where BlackUnicorn OÜ is established, without prejudice to any mandatory consumer-protection rights you have under the law of your own country of residence. The competent courts and any dispute-resolution mechanism will be confirmed in the final, counsel-ratified text.`,
      `We may update these Terms; material changes will be announced via the repository release notes and the in-app notice, and the "Last updated" date revised. Your continued use after a change takes effect means you accept the updated Terms.`,
    ],
    bullets: [
      `General contact: info@blackunicorn.tech`,
      `Privacy / data-protection contact: info@blackunicorn.tech`,
      `Related policies: the Privacy policy, the Cookie disclosure, and the Accessibility statement, linked in the footer below.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Terms of service"
      title="Terms of Service — DojoLM"
      meta="Effective 16 June 2026 · Last updated 16 June 2026"
      lede="The terms between operators and DojoLM across the self-hosted and cloud editions."
      sections={SECTIONS}
      testId="legal-terms-page"
    />
  );
}
