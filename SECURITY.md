# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in DojoLM, please report it privately:

- **Email:** security@blackunicorn.tech (preferred for confidential disclosure)
- **GitHub:** use the "Report a vulnerability" link under the repository's Security tab (privately reports to maintainers)

Do **not** open public issues for security vulnerabilities. We will acknowledge receipt within 72 hours and provide a coordinated-disclosure timeline within 7 days of the initial report.

## Supported versions

Only the `main` branch receives security updates. Tagged releases prior to the 2026 open-source relicense (to Apache-2.0 / BUSL-1.1) are NOT supported and should not be used in production.

## Scope

This policy covers:

- The DojoLM core (Atemi probe runner, /admin/eval Wilson-CI store, Onigaeshi audit substrate, Bushido sign-off ritual, Hattori guard modes, Kotoba prompt rules, Mitsuke threat feed, Amaterasu attack DNA, Kagami mirror test, Yamabushi scanner)
- The `dojolm-verify` CLI verifier
- The cross-framework crosswalk dataset (separate repo)
- The `dojolm.eval/v1` predicate schema (separate repo)
- Reference deploy templates

This policy does NOT cover:

- SaaS commercial deployments (private repository; report via security@blackunicorn.tech for any concern)
- Third-party integrations or downstream consumer applications

## Coordinated disclosure

We commit to:

- Acknowledging your report within 72 hours.
- Providing a fix or mitigation within 90 days for confirmed vulnerabilities (faster for critical).
- Crediting reporters in release notes (opt-in).
- Coordinating CVE assignment where applicable.

We ask reporters to:

- Provide sufficient detail to reproduce the vulnerability.
- Allow us reasonable time to fix before public disclosure.
- Do not exfiltrate, modify, or destroy data during testing.
- Do not use the vulnerability to access data beyond what's necessary to demonstrate the issue.

## Hall of fame

Reporters who follow coordinated disclosure are credited in the release notes for the fix release. Anonymous reporting accepted.

## Out of scope

- Issues in dependencies (report upstream).
- Issues requiring physical access to the host or root-shell-already-compromised threat models.
- Brute-force or rate-limit-tolerance issues on rate-limited endpoints.
- Self-XSS or social-engineering scenarios.
