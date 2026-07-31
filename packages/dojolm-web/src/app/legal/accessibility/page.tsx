// SPDX-License-Identifier: Apache-2.0
/**
 * /legal/accessibility — Accessibility statement (E6.S2; replaces the E6.S1
 * LegalPlaceholder).
 *
 * FOUNDER SIGN-OFF 2026-07-05 (the operator, QMS 574754de) — APPROVED for the OSS
 * release; external counsel + a11y-audit ratification WAIVED by founder decision.
 * The conformance posture is written honestly against what the codebase
 * verifiably does today (WCAG annotations in the components, automated axe checks
 * in the e2e suite, no completed formal third-party audit); the founder-accepted
 * clause notes below record what external counsel would otherwise have reviewed:
 *
 *   - §2 Conformance status — the "partially conformant" claim and the formal
 *     WCAG 2.1 AA conformance assertion need a completed accessibility audit to
 *     stand behind them; counsel + a11y lead confirm the exact wording.
 *   - §4 Feedback — any statutory response-time commitment (e.g. EN 301 549 /
 *     national equivalents) is counsel's to set.
 *   - §6 Enforcement — the jurisdiction-specific enforcement/complaint route is
 *     counsel's to name.
 *
 * Entity contact facts match `/legal/privacy`. Operator grep marker:
 * `FOUNDER-APPROVED-2026-07-05`.
 */

import type { Metadata } from "next";

import { LegalDocument, type LegalSection } from "../LegalDocument";

export const metadata: Metadata = {
  title: "Accessibility · DojoLM",
  description:
    "DojoLM accessibility statement — our WCAG 2.1 AA target, current conformance posture, known gaps, and how to give feedback.",
};

const SECTIONS: readonly LegalSection[] = [
  {
    n: 1,
    title: "Our commitment",
    paras: [
      `BlackUnicorn OÜ is committed to making DojoLM usable by as many people as possible, including people who rely on assistive technology. We design and build the DojoLM interface to target conformance with the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA.`,
      `Accessibility is treated as part of the product, not an afterthought: interface components carry explicit WCAG annotations (for example, status messages use live regions per WCAG 4.1.3, and every form control has a visible label per WCAG 3.3.2), and the interactive surfaces are exercised by automated accessibility checks in our test suite.`,
    ],
  },
  {
    n: 2,
    title: "Conformance status",
    paras: [
      // FOUNDER-APPROVED-2026-07-05 — F-QA-015: the "partially conformant"
      // posture is written to match the current state (per-component WCAG
      // annotations + automated axe checks, no completed formal third-party
      // audit). The formal conformance assertion needs a finished audit to
      // stand behind it — counsel + a11y lead confirm the final wording.
      `DojoLM is partially conformant with WCAG 2.1 level AA. "Partially conformant" means that some parts of the interface do not yet fully meet the standard. We assess conformance through a combination of automated checks and developer review; a completed independent audit is the tracked next step before we assert full conformance.`,
    ],
    bullets: [
      `Keyboard operability and visible focus order are exercised across the admin shell and setup wizard.`,
      `Colour and contrast derive from a single validated design-token system rather than ad-hoc values.`,
      `Status and error messages are announced to screen readers via ARIA live regions.`,
    ],
  },
  {
    n: 3,
    title: "Known limitations",
    paras: [
      `We are transparent about where we fall short today. We are actively working to resolve the following, and this list is updated as items close:`,
    ],
    bullets: [
      `Some data-dense visualisations (graphs and matrices) need richer text alternatives for non-visual users.`,
      `Full conformance has not yet been independently audited; until it is, treat the AA claim as a target rather than a certification.`,
    ],
  },
  {
    n: 4,
    title: "Feedback and contact",
    paras: [
      // FOUNDER-APPROVED-2026-07-05 — F-QA-015: any binding response-time
      // commitment (EN 301 549 / national equivalents) is counsel's to set.
      `If you encounter an accessibility barrier in DojoLM, please tell us — your reports directly shape our remediation priorities. We aim to acknowledge accessibility feedback promptly; the specific response-time commitment will be confirmed in the final, counsel-ratified statement.`,
    ],
    bullets: [
      `Accessibility feedback: info@blackunicorn.tech`,
      `Please include the page or feature, what you expected, and the assistive technology or browser you were using.`,
    ],
  },
  {
    n: 5,
    title: "How we assess accessibility",
    paras: [
      `We evaluate DojoLM using automated tooling integrated into our test suite (including axe-based accessibility assertions run against the live interface), keyboard-only walkthroughs of the primary flows, and manual developer review against the WCAG 2.1 AA success criteria. A completed independent audit is planned to validate and extend this self-assessment.`,
    ],
  },
  {
    n: 6,
    title: "Enforcement and formal complaints",
    paras: [
      // FOUNDER-APPROVED-2026-07-05 — F-QA-015: the jurisdiction-specific
      // enforcement / complaint route (and whether a public-sector
      // accessibility regime applies to this product) is counsel's to name.
      `If you are not satisfied with how we respond to your accessibility feedback, you may have the right to escalate to the accessibility-enforcement body in your jurisdiction. The applicable body and escalation route will be named in the final, counsel-ratified statement. This statement does not waive any statutory right you have.`,
    ],
  },
];

export default function AccessibilityPage() {
  return (
    <LegalDocument
      eyebrow="Accessibility statement"
      title="Accessibility Statement — DojoLM"
      meta="Effective 16 June 2026 · Last updated 16 June 2026"
      lede="Our WCAG 2.1 AA target, current conformance posture, known gaps, and how to give feedback."
      sections={SECTIONS}
      testId="legal-accessibility-page"
    />
  );
}
