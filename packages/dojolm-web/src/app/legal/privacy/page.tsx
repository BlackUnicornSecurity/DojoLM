// SPDX-License-Identifier: Apache-2.0
/**
 * /legal/privacy — the canonical DojoLM privacy policy (E6.S2; replaces the
 * E6.S1 LegalPlaceholder).
 *
 * FOUNDER SIGN-OFF 2026-07-05 (the operator, QMS 574754de) — APPROVED for the OSS
 * release; the §5 lawful-basis (master-plan RB-10a/b) external privacy-counsel
 * ratification was WAIVED by founder decision. A DPIA remains an owed document
 * (founder approval does not create it). Entity facts are
 * from the BlackUnicorn OÜ Business Register company card. The §3/§4/§6
 * data-behaviour statements are code-grounded in docs/telemetry/disclosure.md
 * and must be re-verified whenever the telemetry transport changes. Internal
 * record + counsel reference: docs/legal/privacy-policy-2026-06-16.md.
 *
 * Layout reuses the validated legal chrome (`sys-fullpage-eyebrow` / `-title`)
 * + `<LegalFooter>`; the long-form body uses a page-scoped module
 * (legal-prose.module.css) built only from validated tokens. Long-form legal is
 * not yet in the design corpus — a hallmark/frontend-design polish pass is the
 * tracked design follow-up.
 */

import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "../LegalDocument";

export const metadata: Metadata = {
  title: "Privacy · DojoLM",
  description:
    "How BlackUnicorn OÜ handles personal data in DojoLM — platform telemetry, lawful basis, retention, transfers, and your rights.",
};

const SECTIONS: readonly LegalSection[] = [
  {
    n: 1,
    title: "Who we are",
    paras: [
      `DojoLM is an adversarial-evaluation platform for AI systems, operated by BlackUnicorn OÜ, a private limited company (osaühing) registered in Estonia — registry code 16604183, registered office Tornimäe tn 5, 10145 Tallinn, Estonia. BlackUnicorn OÜ is not VAT-registered. In this policy “BlackUnicorn”, “we” and “us” mean BlackUnicorn OÜ; the trading style “Black Unicorn” refers to the same entity.`,
      `For self-hosted deployments, you (the operator) are the controller of your own users’ data; BlackUnicorn is the controller of the telemetry corpus described in section 3. For the cloud edition, BlackUnicorn is the controller (see section 2).`,
    ],
    bullets: [
      `General contact: info@blackunicorn.tech`,
      `Privacy / data-protection contact: info@blackunicorn.tech. We have appointed a Data Protection Officer, contactable at that address; we publish the DPO’s contact details (GDPR Art. 37(7)); the DPO’s name is not published.`,
      `EU representative: not required — BlackUnicorn OÜ is established in the EU (Estonia).`,
    ],
  },
  {
    n: 2,
    title: "Scope — which deployments this covers",
    paras: [
      `DojoLM ships in two build channels, and the data relationship differs:`,
    ],
    table: {
      head: [
        "Channel",
        "Who runs the server",
        "Who controls operator / member data",
      ],
      rows: [
        [
          "Self-hosted (default)",
          "You, on your own hardware",
          "You. BlackUnicorn does not run your server or hold your operators’ / members’ accounts.",
        ],
        [
          "Cloud (BlackUnicorn-hosted)",
          "BlackUnicorn",
          "BlackUnicorn, under the separate cloud terms / Data Processing Agreement.",
        ],
      ],
    },
    parasAfter: [
      `In both channels, BlackUnicorn collects the platform telemetry in section 3 for the research corpus.`,
    ],
  },
  {
    n: 3,
    title: "What we collect (platform telemetry)",
    paras: [
      `The first-run notice discloses exactly these categories (grounded in our public Telemetry disclosure):`,
    ],
    bullets: [
      `Adversarial probe outcomes — which test cases ran and which models scored what.`,
      `Model-registration metadata — provider name and model id. No API keys.`,
      `Anonymised platform usage signals — page navigations and error rates.`,
    ],
    parasAfter: [
      `Before any signal enters the research corpus it is aggregated and de-identified (a k-anonymity threshold is enforced and an upload-side PII sanitiser runs); in that aggregated form it does not identify you. Each event also carries a thin install-scoped envelope: a per-install identifier (a salted, user-resettable hash — not tied to a person), an opaque server-issued install token, the deployment tier (community on the free edition), an SDK version, and — only on multi-tenant cloud deployments — a tenant id. By design these identify an installation, not an individual.`,
    ],
  },
  {
    n: 4,
    title: "What we never collect",
    bullets: [
      `No prompts you submit to models. No model responses. No API keys or secrets (model credentials stay in your .env).`,
      `No PII about your operators or members — no names, emails, free-form text, or IP addresses. Where a user id is needed to correlate events within one deployment, it is a one-way salted HMAC (user_hash), never the id itself, and it cannot be correlated across deployments.`,
    ],
  },
  {
    n: 5,
    title: "Why we collect it, and our lawful basis",
    paras: [
      `Purpose: aggregated, de-identified adversarial-evaluation signals improve model safety and fund the free, Apache-2.0 community edition through open industry benchmarks.`,
      `The corpus is anonymous. Telemetry is aggregated and de-identified (k-anonymity threshold + upload-side PII sanitisation) before it enters the research corpus. In that aggregated form it does not identify any individual and is not personal data — so GDPR Article 6 does not apply to the corpus itself.`,
      `Lawful basis for the thin per-install envelope (the salted install hash and opaque token that accompany events, to the extent they are personal data): legitimate interests (GDPR Art. 6(1)(f)) — operating and securing the platform and producing the de-identified research corpus — balanced against your interests and rights, and subject to your right to object at no cost (Art. 21). Telemetry is not a condition of using the community edition; you can object and continue to use the product.`,
    ],
  },
  {
    n: 6,
    title: "How telemetry is transmitted (current build)",
    paras: [
      `Telemetry is produced through a pluggable sink (DOJO_TELEMETRY_SINK). The network transport that would egress telemetry to the BlackUnicorn corpus over HTTPS is not wired into the current community build. Until it lands, a self-hosted deployment does not transmit telemetry off-box by default — events are discarded (no-op) or written to a local JSON-Lines file you choose and can inspect. When the corpus uplink ships, it will be operator-visible and transmitted over HTTPS.`,
    ],
  },
  {
    n: 7,
    title: "Sharing and sub-processors",
    paras: [
      `We do not sell personal data. Because the current build performs no telemetry egress (section 6), no sub-processor currently processes your telemetry. Before any corpus uplink ships, the infrastructure sub-processors will be listed here.`,
    ],
  },
  {
    n: 8,
    title: "International data transfers",
    paras: [
      `No international transfers occur in the current build (no egress). When the corpus uplink ships, BlackUnicorn intends to host the corpus within the EU where feasible (avoiding EU-to-non-EU transfers); any transfer that does occur will rely on appropriate safeguards (EU Standard Contractual Clauses, the UK IDTA, or an adequacy decision).`,
    ],
  },
  {
    n: 9,
    title: "Data retention",
    paras: [
      `We retain telemetry and the derived corpus for 5 years, after which it is deleted or further aggregated / anonymised. The first-run acknowledgement record is retained for as long as needed to evidence the lawful basis and any applicable limitation period. We may apply a shorter retention to raw event-level data as part of data minimisation.`,
    ],
  },
  {
    n: 10,
    title: "Your rights",
    paras: [
      `Depending on your jurisdiction you may have rights to access, rectify, erase, restrict or object to processing, and to data portability (GDPR Ch. III), and rights to know / delete / opt-out and non-discrimination (CCPA / CPRA).`,
    ],
    bullets: [
      `Self-service today: reset your install identity (the installId is a user-resettable salted hash), point the telemetry sink at a local file to inspect every event, and object to processing of the install envelope at no cost — the community edition keeps working either way.`,
      `To exercise statutory rights: contact info@blackunicorn.tech. Because operator / member PII is not collected by telemetry, most operator / member data requests on a self-hosted deployment are handled by you, the operator, on your own instance.`,
    ],
  },
  {
    n: 11,
    title: "Security",
    paras: [
      `Model credentials and secrets stay in your environment, never in telemetry; the telemetry envelope contains no PII; user correlation uses a one-way salted HMAC; and when the corpus transport ships it operates over HTTPS. We keep these statements to what the software verifiably does.`,
    ],
  },
  {
    n: 12,
    title: "Children",
    paras: [
      `DojoLM is a business security tool, not directed to children and not intended for anyone under 16. We do not knowingly collect data from children.`,
    ],
  },
  {
    n: 13,
    title: "Changes to this policy",
    paras: [
      `We may update this policy; material changes will be announced via the repository release notes and the in-app notice, and the “Last updated” date revised.`,
    ],
  },
  {
    n: 14,
    title: "Contact",
    bullets: [
      `General: info@blackunicorn.tech`,
      `Privacy / DPO: info@blackunicorn.tech`,
      `Plain-language companion: the public Telemetry disclosure (docs/telemetry/disclosure).`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Privacy policy"
      title="Privacy Policy — DojoLM"
      meta="Effective 16 June 2026 · Last updated 16 June 2026"
      lede="How DojoLM handles personal data across the self-hosted and cloud editions and the platform telemetry corpus."
      sections={SECTIONS}
      testId="legal-privacy-page"
    />
  );
}
