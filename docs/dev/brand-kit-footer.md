# Brand kit — "Powered by DojoLM" footer pattern

**Authority:** E1-A-RB-15 / EXP-08 substrate positioning items 1+2 (Master Plan v1.0).

## Why this exists

Per the 4-persona review (Marcus + Hélène + Élise + Anya):

DojoLM is the substrate UNDER GRC incumbents (OneTrust / ServiceNow / AuditBoard) — not a replacement. The footer pattern propagates the substrate position into every downstream consumer surface that renders a DojoLM verification result. Like Sigstore's "Verified by Sigstore" or in-toto's attestation envelope, the footer is the brand signal carrying the substrate claim.

Élise §2 (Big-4 buyer): customers' GRC consoles render DojoLM-attested rows with the footer; their own brand sits ABOVE; DojoLM sits AS-substrate BELOW. The footer is the durable brand surface.

Anya §7 (LF AI standards): the footer is the de-facto-first artefact that attaches DojoLM to every checkable attestation in the wild — without it, the substrate position erodes.

## The footer string

```
Powered by DojoLM — verifier root sha256:<hex>
```

Where `<hex>` is the current Rekor root the verifier validated the pack against. Truncated to 12 hex chars (96-bit prefix) in compact contexts; full 64-char SHA-256 in expanded contexts.

Example (compact):

```
Powered by DojoLM — verifier root sha256:9f86d081884c
```

Example (expanded):

```
Powered by DojoLM — verifier root sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
```

## SDK helper

Use the SDK's `poweredByFooter` helper:

```typescript
import { poweredByFooter } from '@dojolm/sdk';

const footer = poweredByFooter('sha256:9f86d081884c...');
// → 'Powered by DojoLM — verifier root sha256:9f86d081884c...'
```

## Placement rules

### Required placement

When a downstream consumer (GRC console, audit report, regulator export pack, dashboard widget) RENDERS a DojoLM-attested artefact:

1. **Footer visible** below the rendered artefact (table row, card, modal, report page) — not collapsed behind a "details" toggle.
2. **Verifier-root SHA visible** (truncated or full) — never elided to `<verifier root>` placeholder text.
3. **Brand stable** — the string "DojoLM" must appear verbatim (not "DojoLM™" or "DojoLM (Beta)" etc).

### Optional enhancements

- Hyperlink the SHA to the public transparency log: `https://<tenant>.dojolm.example/verify?root=<hex>` — lands at E1-PHASE-4-M5.
- Render an icon to the LEFT of "Powered by DojoLM" — see brand-kit logo files under `/docs/dev/brand-kit/` (added when brand kit ships at Stage 2 marketing-coordinated launch).
- Tooltip on hover: short explainer "This row was verified against a DojoLM-operated Rekor transparency log."

### Disallowed placement

- ❌ Inside a tooltip / popover only (must be on-page-default).
- ❌ Replaced with vendor-co-brand ("Powered by DojoLM + OneTrust") — the substrate position is exclusive to DojoLM. Co-brand exists at the PRODUCT level, not the substrate footer.
- ❌ Truncated to "Powered by DojoLM" alone without the verifier-root SHA — the SHA is what makes the footer verifiable, not decorative.

## Trademark

"DojoLM" and "BlackUnicorn" are trademarks of BlackUnicorn Security. The open-source licenses (Apache-2.0 for the community core, BUSL-1.1 for the enterprise tier) cover the code; trademarks are NOT licensed by them. Contact info@blackunicorn.tech for trademark use questions.

Use of "Powered by DojoLM — verifier root sha256:…" in customer GRC consoles, audit reports, regulator filings, marketing material, and similar substrate-rendering contexts is EXPRESSLY PERMITTED without separate trademark license, on the condition that:

- The string appears verbatim.
- The verifier-root SHA is real (the customer actually verified the pack) — not a decorative placeholder.
- Use is in factual reference to a real DojoLM verification, not endorsement (e.g., "DojoLM endorses this finding" is NOT permitted).

## Brand kit assets (future)

Pending Stage 2 marketing-coordinated launch (per E1-A-RB-15 acceptance):

- `/docs/dev/brand-kit/logo-light.svg` — light-mode logo
- `/docs/dev/brand-kit/logo-dark.svg` — dark-mode logo
- `/docs/dev/brand-kit/color-tokens.css` — official brand colors
- `/docs/dev/brand-kit/typography.css` — official typography stack
- `/docs/dev/brand-kit/usage-guidelines.pdf` — brand usage guidelines

## Compliance with master plan

This footer is one of two substrate-positioning surfaces per EXP-08:

1. **Public API + SDK first** in documentation (RB-15 — this PR ships `@dojolm/sdk` + OpenAPI 3.1).
2. **Powered-by-DojoLM footer pattern** in brand kit + docs (this file).

Per Pop-8 master plan decision: items 3 (GRC integration patterns as data publishers) lands at Stage 2 with the M-10 customer integration. Items 4 (ServiceNow channel partnership) + 5 (CISA engagement) deferred to month 6+ per founder direction.