// SPDX-License-Identifier: Apache-2.0
/**
 * LegalFooter — public-route legal/policy navigation primitive.
 *
 * E6.S1 (2026-05-08) — promoted from the E0.S11 minimal stub to the
 * full primitive declared by `audit/REMEDIATION-PLAN.md:662-666`.
 * Retires:
 *   - F-8-005 (P1): "Login page has no Privacy/Terms/Accessibility-
 *     statement link in any state" — now mounted on /login, /setup,
 *     /forbidden, /members/sign-in, /members/request-invite.
 *   - F-9-004 (P0 partial): the 4-link footer carries Yamabushi
 *     branding (no legacy-placeholder remnants); full retirement closes when
 *     E6.S2 ships final reviewed legal copy.
 *
 * Plan §663 ALSO listed F-3-007 (P1) under E6.S1, but the register
 * entry for F-3-007 reads "Kill-switch FIRE form sits on the same
 * screen as flag-toggle table" (Fitts + Nielsen #5, /admin/flags
 * KillSwitchPanel) — that is an admin-layout finding, NOT a public-
 * route legal-link finding. The plan's grouping appears to be a
 * miscategorization. F-3-007 is NOT retired by this PR; it remains
 * open against /admin/flags + future story (admin-layout fix).
 *
 * E0.S11 → E6.S1 swap-readiness contract preserved end-to-end:
 *   - Default export === named `LegalFooter` (LF-001).
 *   - <footer role="contentinfo"> landmark — WCAG 2.4.1 (LF-002).
 *   - data-testid="legal-footer" default + overridable via testId
 *     prop (LF-003).
 *   - Privacy / Terms / Accessibility links rendered in a stable
 *     leading order (LF-004) — E6.S1 appends Cookie as the 4th
 *     entry, so the existing 3 selectors keep their absolute
 *     position.
 *   - Each link carries data-testid="legal-footer-{key}" (LF-005),
 *     extended to legal-footer-cookies for the new entry.
 *   - className composes alongside .legal-footer (LF-006).
 *   - Re-exported through the @/design/system barrel (LF-007).
 *
 * Token-driven CSS only (G10): the `.legal-footer*` class chain in
 * `src/design/styles/system.css` uses `var(--fg-mute)` / `var(--b-1)`
 * / `var(--torii-hi)` / `var(--mono)`. No hex literals or Tailwind
 * utility classes inside `src/design/`. The mobile-collapse rule at
 * 320px lives next to the base ruleset in system.css so all variants
 * stay token-driven.
 *
 * Targets `/legal/{privacy,terms,accessibility,cookies}` exist as
 * minimal placeholder pages today; E6.S2 swaps them for the
 * Legal-reviewed canonical content (audit plan §E6.S2).
 */

'use client';

import Link from 'next/link';

export interface LegalFooterProps {
  /** Override `data-testid="legal-footer"` default. */
  readonly testId?: string;
  /** Compose extra layout context (e.g. `.sys-fullpage-footer`). */
  readonly className?: string;
}

/**
 * Stable link order — append-only contract. Privacy/Terms/Accessibility
 * keep their leading positions so the LF-004 ordering test (Privacy →
 * Terms → Accessibility) still passes after E6.S1 adds Cookie at the
 * tail. Mutating the leading 3 entries WILL break consumer e2e
 * selectors and the LegalFooter contract tests.
 */
const LEGAL_LINKS: ReadonlyArray<{
  readonly key: 'privacy' | 'terms' | 'accessibility' | 'cookies';
  readonly href: string;
  readonly label: string;
}> = Object.freeze([
  Object.freeze({ key: 'privacy', href: '/legal/privacy', label: 'Privacy' }),
  Object.freeze({ key: 'terms', href: '/legal/terms', label: 'Terms' }),
  Object.freeze({
    key: 'accessibility',
    href: '/legal/accessibility',
    label: 'Accessibility',
  }),
  // E6.S1 — Cookie link appended for consumer-bar §16 + GDPR/ePrivacy
  // disclosure parity. Path mirrors the singular labels pattern of the
  // sibling routes; the destination stub is created by E6.S1 so the
  // link does not 404 today.
  Object.freeze({ key: 'cookies', href: '/legal/cookies', label: 'Cookies' }),
]);

export function LegalFooter({ testId, className }: LegalFooterProps = {}) {
  const rootClass = ['legal-footer', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <footer
      role="contentinfo"
      aria-label="Legal"
      className={rootClass}
      data-testid={testId ?? 'legal-footer'}
    >
      <ul className="legal-footer-list">
        {LEGAL_LINKS.map((link) => (
          <li key={link.key} className="legal-footer-item">
            <Link
              href={link.href}
              className="legal-footer-link"
              data-testid={`legal-footer-${link.key}`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  );
}

export default LegalFooter;
