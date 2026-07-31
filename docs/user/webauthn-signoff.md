# WebAuthn step-up for Bushido sign-off

**Authority:** Master Plan v1.0 §4.1 RB-9 + epics doc E1-A-RB-9 (Hélène item E).
**Status:** Slice 2 shipped 2026-05-24. Backend complete (credential store + registration + assertion + sign-off integration). UI wiring in the Bushido sign-off panel lands in a follow-up PR after operators have registered their platform authenticators.
**Replaces:** the `Q-ATTEST` phrase confirmation modal that currently fronts the sign-off ceremony.

## Why

The `Q-ATTEST` phrase is a typed string. An admin token leak + UI screenshot lets an attacker forge a sign-off without ever touching the legitimate operator's hardware. WebAuthn step-up requires the operator to physically interact with the platform authenticator (TouchID / Windows Hello / FIDO2 hardware key) for every sign-off — the private key never leaves the device, so token leak alone cannot reproduce the assertion.

## Flow

```
┌─ Operator's browser ──────────────────────────────────────────────────┐
│                                                                       │
│  1. GET /admin/bushido/sign-off panel                                 │
│                                                                       │
│  2. Click "Sign as compliance for 2026Q2"                             │
│     ↓                                                                 │
│  3. POST /api/admin/webauthn/sign-off/options                         │
│     body: { quarterKey: "2026Q2", role: "compliance" }                │
│     ← returns PublicKeyCredentialRequestOptionsJSON (challenge)       │
│                                                                       │
│  4. navigator.credentials.get({ publicKey: <options> })               │
│     ↓ user touches TouchID / Windows Hello                            │
│     ← returns AuthenticationResponseJSON (assertion)                  │
│                                                                       │
│  5. POST /api/admin/webauthn/sign-off/verify                          │
│     body: { quarterKey, role, response: <assertion> }                 │
│     ← returns { stepUpToken: "..." } (60-second TTL, single-use)      │
│                                                                       │
│  6. POST /api/admin/bushido/sign-off                                  │
│     body: { quarterKey, role, phrase: "Q-ATTEST",                     │
│             webauthnStepUpToken: "..." }                              │
│     ← 200 with signature record + manifest hash (RB-4 Stage-A)        │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

The step-up token is bound to `(userId, quarterKey, role, credentialId)`. The sign-off POST consumes it (single-use) and verifies the binding matches before recording the signature.

## Registration ceremony (one-time per operator per quarter)

```
1. POST /api/admin/webauthn/register/options
   ← returns PublicKeyCredentialCreationOptionsJSON (challenge)

2. navigator.credentials.create({ publicKey: <options> })
   ↓ user enrols platform authenticator
   ← returns RegistrationResponseJSON

3. POST /api/admin/webauthn/register/verify
   body: <registration response>
   ← 200 { ok, credentialId, authenticatorGUID }
   ← emits WEBAUTHN_REGISTER audit event
```

A given user may register multiple platform authenticators (e.g. laptop TouchID + iPhone Face ID). Each gets its own credential ID + counter. The sign-off authentication flow surfaces all registered credentials via `allowCredentials` so the browser picks whichever the operator interacts with.

## Environment configuration

| Env var | Default | Notes |
|---|---|---|
| `WEBAUTHN_SIGNOFF_ENABLED` | `false` | Master enable flag. When OFF, all 4 WebAuthn endpoints return 503 `service-not-configured`. Flip ON after first operator registers. |
| `WEBAUTHN_SIGNOFF_REQUIRED` | `false` | When ON, `POST /api/admin/bushido/sign-off` REQUIRES `webauthnStepUpToken` in the body. Flip ON only AFTER every operator has registered, else sign-off is unavailable. |
| `WEBAUTHN_RP_ID` | `localhost` | Relying-Party ID — must match the domain the browser sees in the address bar. Production: e.g. `dojo.example.com`. |
| `WEBAUTHN_RP_NAME` | `DojoLM` | Display name shown by the platform authenticator's confirmation UI. |
| `WEBAUTHN_ORIGIN` | `http://localhost:3000` | Expected origin in the ClientDataJSON. Comma-separate to allow multiple origins during cutover (e.g. `https://dojo.example.com,http://192.0.2.10:3000`). |
| `WEBAUTHN_STORE` | (unset) | Set to `in-memory` for dev smoke testing without disk persistence. Production leaves unset to use the filesystem-backed store at `<DATA>/webauthn/<userId>.json`. |

## Migration runbook (Stage 1 single-Enterprise deploy)

| Week | Action | Operator |
|---|---|---|
| 0 | Phase 3 Slice 2 lands on `main` (this PR). `WEBAUTHN_SIGNOFF_ENABLED=false` in prod `/opt/dojolm/.env`. Existing phrase ceremony still load-bearing. | Eng |
| 1 | Flip `WEBAUTHN_SIGNOFF_ENABLED=true` in staging. Each operator runs the registration ceremony once via their normal browser. Verify the audit log shows one `WEBAUTHN_REGISTER` row per operator with the right AAGUID. | Founder + ops |
| 2 | Flip `WEBAUTHN_SIGNOFF_ENABLED=true` in production. Operators register their production authenticators. Phrase ceremony still works as the fallback. | Founder |
| 3-4 | Soak. Watch the audit log for `WEBAUTHN_REGISTER` + `WEBAUTHN_SIGNOFF_ATTEST` cadence. Confirm no operator gets stuck (lost device, browser quirks). | Founder |
| 5+ | Flip `WEBAUTHN_SIGNOFF_REQUIRED=true` in production. Sign-off now REQUIRES the step-up token. Phrase ceremony is dead-code on the wire (still validated as a defence-in-depth byte but the WebAuthn assertion is the load-bearing factor). | Founder |
| Stage 3 follow-up | Phrase ceremony removed from the route entirely; sign-off body schema drops the `phrase` field. | Eng |

Rollback: flip `WEBAUTHN_SIGNOFF_REQUIRED=false`. Sign-off route reverts to phrase-only. Operators that already registered keep their credentials persisted; they can resume step-up the moment the flag flips back on.

## Threat model

| Attack | Defence |
|---|---|
| Admin session token leak | WebAuthn assertion required; attacker without the operator's hardware cannot satisfy `navigator.credentials.get`. |
| UI screenshot leaks the phrase | Phrase becomes ceremonial; the load-bearing factor is the assertion that REQUIRED userVerification + platform attachment. |
| Phishing replay (capture + re-send assertion) | Step-up token is single-use + bound to (userId, quarterKey, role, credentialId) + 60s TTL. Counter increments + WebAuthn store rejects counter ≤ stored. |
| Cross-seat replay (assertion for compliance reused on redteam) | Challenge bound to (quarterKey, role) at issuance; mismatch on verify throws `WEBAUTHN_CHALLENGE_BINDING_MISMATCH`. |
| Cross-user replay (token issued for op1 used by op2) | Sign-off route asserts `consumed.userId === ctx.user.id`. |
| Authenticator cloning | Counter advance defends — when a cloned credential ever gets used, the original or clone's next assertion fails the counter check. |

## Endpoint reference

### `POST /api/admin/webauthn/register/options`
- Auth: admin role.
- Body: empty.
- 200 → `PublicKeyCredentialCreationOptionsJSON`.
- 503 → `service-not-configured` (flag off).
- 429 → `rate-limited`.

### `POST /api/admin/webauthn/register/verify`
- Auth: admin role.
- Body: `RegistrationResponseJSON`.
- 200 → `{ ok, credentialId, authenticatorGUID }` + emits `WEBAUTHN_REGISTER`.
- 400 → `invalid-body` / `invalid-payload` / `webauthn-registration-not-verified`.

### `POST /api/admin/webauthn/sign-off/options`
- Auth: admin role + seat claim (RB-8).
- Body: `{ quarterKey, role }`.
- 200 → `PublicKeyCredentialRequestOptionsJSON`.
- 403 → `seat-claim-missing` (RB-8 gate).
- 409 → `no-registered-credentials` (user hasn't run registration).

### `POST /api/admin/webauthn/sign-off/verify`
- Auth: admin role + seat claim.
- Body: `{ quarterKey, role, response: AuthenticationResponseJSON }`.
- 200 → `{ ok, stepUpToken }` + emits `WEBAUTHN_SIGNOFF_ATTEST`.
- 409 → `webauthn-counter-replay` (store rejected counter advance).
- 400 → `webauthn-challenge-binding-mismatch` / `webauthn-unknown-credential` / `webauthn-assertion-not-verified`.

### `POST /api/admin/bushido/sign-off` (extended)
- Body extension: `webauthnStepUpToken?: string`.
- When `WEBAUTHN_SIGNOFF_REQUIRED=true`, MUST be supplied + bound to right `(userId, quarterKey, role)`.
- 403 → `webauthn-step-up-required` (flag on + token missing).
- 403 → `webauthn-step-up-invalid` (token unknown / expired / bound to different seat or user).

## Implementation notes

- Credential persistence: `packages/bu-tpi/src/auth/webauthn-store.ts` (shared substrate interface + InMemory impl) + `packages/dojolm-web/src/lib/auth/webauthn-fs-store.ts` (FS adapter, per-user JSON file with tmp+rename atomic write + 0o600 perms).
- Challenge tracking: in-process Map with 5-min TTL inside `packages/dojolm-web/src/lib/auth/webauthn.ts`. Suitable for the Stage 1 single-Enterprise deploy; horizontally-scaled SaaS deploy (Stage 2) backs this with Redis or sticky sessions.
- Step-up tokens: 64-byte random base64url, single-use, 60s TTL, bound to (userId, quarterKey, role, credentialId, authenticatorGUID).
- Counter advance: stored counter must be strictly exceeded by every assertion. The 0→0 case is permitted (authenticators that do not implement the counter).

## License

Open core: Apache-2.0 (community core) / BUSL-1.1 (enterprise tier) — each source file's `SPDX-License-Identifier` header is authoritative. See [`LICENSE`](../../LICENSE) and [`LICENSE-BUSL-1.1.txt`](../../LICENSE-BUSL-1.1.txt).
