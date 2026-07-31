// SPDX-License-Identifier: Apache-2.0
/**
 * /legal/cookies — Cookie disclosure (E6.S2; replaces the E6.S1
 * LegalPlaceholder).
 *
 * FOUNDER SIGN-OFF 2026-07-05 (the operator, QMS 574754de) — APPROVED for the OSS
 * release; external counsel ratification WAIVED by founder decision. The cookie
 * inventory is CODE-GROUNDED, not invented: the two cookies and their
 * attributes are taken from the auth layer
 * (`lib/auth/route-guard.ts` / `lib/auth/session-claim.ts`):
 *   - `tpi_session` : HttpOnly; Secure (when served over HTTPS); SameSite=Strict;
 *                     Path=/; Max-Age set from the session lifetime.
 *   - `tpi_csrf`    : Secure (when served over HTTPS); SameSite=Strict; Path=/;
 *                     Max-Age set from the session lifetime. Not HttpOnly by
 *                     design (the double-submit CSRF token must be readable by
 *                     the client to echo it back in the x-csrf-token header).
 * Both are cleared (Max-Age=0) on sign-out. If the auth layer ever sets a new
 * cookie, this page MUST be updated in the same change.
 *
 * Founder-accepted clause note (external counsel would otherwise review):
 *   - §3 Legal basis — the "strictly necessary → no consent banner required"
 *     conclusion under ePrivacy Art. 5(3) / PECR (founder-accepted).
 *
 * Entity contact facts match `/legal/privacy`. Operator grep marker:
 * `FOUNDER-APPROVED-2026-07-05`.
 */

import type { Metadata } from 'next';

import { LegalDocument, type LegalSection } from '../LegalDocument';

export const metadata: Metadata = {
  title: 'Cookies · DojoLM',
  description:
    'The cookies DojoLM sets — purpose, attributes, expiry, legal basis, and how to control them.',
};

const SECTIONS: readonly LegalSection[] = [
  {
    n: 1,
    title: 'What this disclosure covers',
    paras: [
      `This disclosure explains the cookies and similar browser storage that the DojoLM interface sets, operated by BlackUnicorn OÜ (registry code 16604183, Tornimäe tn 5, 10145 Tallinn, Estonia). It complements our Privacy policy, which describes how we handle personal data more broadly.`,
      `DojoLM sets only strictly necessary cookies. It does not set advertising, marketing, cross-site tracking, or third-party analytics cookies, and it does not embed third-party trackers in the application.`,
    ],
    // Wave-H inline steel cross-link (§1 → Privacy policy).
    links: [{ label: 'Privacy policy', href: '/legal/privacy' }],
  },
  {
    n: 2,
    title: 'Cookies we set',
    paras: [
      `The two cookies below are required to sign in and to use the application securely. They are set only after you authenticate.`,
    ],
    table: {
      head: ['Cookie', 'Purpose', 'Type', 'Attributes & expiry'],
      rows: [
        [
          'tpi_session',
          'Keeps you signed in by carrying your authenticated session. Without it you cannot stay logged in.',
          'Strictly necessary',
          'HttpOnly; SameSite=Strict; Secure when served over HTTPS; Path=/. Expires at the end of the session lifetime and is cleared when you sign out.',
        ],
        [
          'tpi_csrf',
          'Protects state-changing requests against cross-site request forgery using a double-submit token.',
          'Strictly necessary',
          'SameSite=Strict; Secure when served over HTTPS; Path=/. Readable by the page (not HttpOnly) so it can be echoed in the x-csrf-token header. Cleared when you sign out.',
        ],
      ],
    },
    parasAfter: [
      `We do not use localStorage or sessionStorage to persist personal data beyond the non-secret wizard draft you create during first-boot setup, which stays in your own browser and is never transmitted.`,
    ],
  },
  {
    n: 3,
    title: 'Legal basis',
    paras: [
      // FOUNDER-APPROVED-2026-07-05 — F-QA-015: confirm the strictly-necessary
      // classification and the "no consent banner required" conclusion under
      // ePrivacy Art. 5(3) / ICO PECR for the deployment regions in scope.
      `Both cookies are strictly necessary to provide the service you have asked for (a secure, authenticated session). Under ePrivacy Directive Art. 5(3) and the UK PECR, strictly necessary cookies are exempt from the prior-consent requirement, so DojoLM does not display a cookie-consent banner. Because no optional, analytics, or advertising cookies are set, there is nothing to consent to or refuse.`,
    ],
  },
  {
    n: 4,
    title: 'Managing cookies',
    paras: [
      `You can view, block, or delete cookies through your browser settings. Because the cookies above are strictly necessary, blocking or deleting them will sign you out and prevent you from using the authenticated parts of DojoLM.`,
    ],
    bullets: [
      `Clearing the tpi_session cookie ends your session immediately.`,
      `Signing out clears both cookies for you (they are set to expire immediately).`,
    ],
  },
  {
    n: 5,
    title: 'Changes and contact',
    paras: [
      `If the application begins setting any new cookie, this disclosure is updated in the same change and the "Last updated" date is revised. Material changes are also announced via the repository release notes and the in-app notice.`,
    ],
    bullets: [
      `General contact: info@blackunicorn.tech`,
      `Privacy / data-protection contact: info@blackunicorn.tech`,
    ],
  },
];

export default function CookiesPage() {
  return (
    <LegalDocument
      eyebrow="Cookie disclosure"
      title="Cookie Disclosure — DojoLM"
      meta="Effective 16 June 2026 · Last updated 16 June 2026"
      lede="The cookies DojoLM sets, why they are needed, and how to control them."
      sections={SECTIONS}
      testId="legal-cookies-page"
    />
  );
}
