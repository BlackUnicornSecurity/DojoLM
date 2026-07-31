# Mitsuke

Mitsuke is the threat intelligence library module.

## Current tabs

- `Threats` — live-wired to `/api/mitsuke/entries`.
- `Sources` — live-wired to `/api/mitsuke/sources`.

Threat entry severity, confidence, linked indicator references, and
publication date are rendered from stored feed data. When no data has
been ingested yet, each tab renders an empty state with guidance to
configure a source.

## Settings

Click `Settings` in the Mitsuke header to open the source configuration
panel. The panel supports adding, toggling, and removing threat
intelligence sources. URL inputs are validated against an SSRF
allow-list (blocks private IPs, localhost, cloud metadata endpoints,
and DNS-rebinding hosts). Only HTTPS URLs are accepted.

## Indicators

Indicator metadata currently ships with each threat entry as an array
of references. A dedicated browsing surface with full indicator
metadata (type, value, confidence, context) is tracked as a follow-up
ADR — the 2026-04-18 Wave 1 ADR-0011 cut scope to ship threats and
sources first.

## Current notes

- All entries + sources data is read from the server file store at
  `<TPI_DATA_DIR>/mitsuke/` (default: `data/mitsuke/`).
- The read endpoints are public by design (threat feed is
  world-readable). Rate limiting is handled at the middleware tier.
- `MitsukeSourceConfig` persists to `localStorage` (client-only) today;
  migration to the POST `/api/mitsuke/sources` endpoint is scoped in
  ADR-0007.

## Related docs

- [Bushido Book](BUSHIDO_BOOK.md)
- [Amaterasu DNA](AMATERASU_DNA.md)
- [The Kumite](THE_KUMITE.md)
