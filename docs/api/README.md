<!-- SPDX-License-Identifier: Apache-2.0 -->
# DojoLM API — client guide

The machine-readable contract is [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1).
This page documents the **request requirements every client must satisfy** —
in particular the trusted-origin and CSRF rules that trip up non-browser
clients (curl, scripts, SDKs, integration tests).

Replace `https://your-host.example` below with the origin your instance is
served on.

## Authentication

Two auth methods are accepted:

| Method | Used by | How |
|---|---|---|
| **Session cookie** | the browser UI and cookie-jar clients | `POST /api/auth/login`, then send the cookies back on every request |
| **API key** | programmatic / server-to-server callers | send `X-API-Key: <key>` (issue keys at `/admin/api-keys`) |

API-key requests are exempt from CSRF (the key proves intent). Everything below
is about the **cookie** path.

## The trusted-origin requirement (F-QA-009)

Every state-changing route — and most protected GETs — checks the request's
**`Origin`** header against the instance's own origin. A browser sets `Origin`
automatically; a non-browser client **does not**, so without it the request is
rejected (`401`/`403`) even with a valid session cookie.

> **Rule:** send `Origin: https://your-host.example` (the instance's own origin)
> on **every** API request from a non-browser client.

If your instance runs behind a trusted reverse proxy and you set `TRUSTED_PROXY`,
an `X-Forwarded-Host` may substitute for `Origin`; sending `Origin` explicitly
is the portable choice.

## The CSRF double-submit requirement

State-mutating methods (`POST`/`PUT`/`PATCH`/`DELETE`) on cookie-authed routes
also require a **double-submit CSRF token**: the value of the non-HttpOnly
`tpi_csrf` cookie must be echoed in the `x-csrf-token` request header. A
mismatch (or a missing header) returns `403`.

Cookies set by `POST /api/auth/login`:

| Cookie | HttpOnly | Purpose |
|---|---|---|
| `tpi_session` | yes | the session token |
| `tpi_csrf` | no | the CSRF token to echo in `x-csrf-token` |

`Content-Type: application/json` is required on requests that **carry a JSON
body**. Body-less state-changers (e.g. `POST /api/auth/logout`) need no
`Content-Type`, but still require the `x-csrf-token` header.

## Recipe (cookie jar + Origin + CSRF)

```bash
BASE=https://your-host.example
ORIGIN=$BASE

# 1. Log in → capture tpi_session + tpi_csrf into a cookie jar.
curl -s -c jar.txt -o /dev/null \
  -H "Origin: $ORIGIN" -H "Content-Type: application/json" \
  --data '{"username":"admin","password":"<password>"}' \
  "$BASE/api/auth/login"

# 2. Read the CSRF token out of the jar (Netscape cookie-file format).
CSRF=$(awk '/tpi_csrf/{print $NF}' jar.txt | tail -1)

# 3. Protected GET — cookie jar + Origin (no CSRF header needed on GET).
curl -s -b jar.txt -H "Origin: $ORIGIN" "$BASE/api/llm/models"

# 4. Protected POST — add the CSRF header + a JSON Content-Type for the body.
curl -s -b jar.txt \
  -H "Origin: $ORIGIN" -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  --data '{"text":"hello"}' \
  "$BASE/api/scan"

# 5. Logout — body-less POST: CSRF header, no Content-Type.
curl -s -b jar.txt -X POST \
  -H "Origin: $ORIGIN" -H "x-csrf-token: $CSRF" \
  "$BASE/api/auth/logout"
```

## Failure modes at a glance

| Symptom | Cause | Fix |
|---|---|---|
| `401 Authentication required` on a valid session | missing/foreign `Origin` | send `Origin: <instance origin>` |
| `403 CSRF validation failed` on a POST/PUT/PATCH/DELETE | missing/mismatched `x-csrf-token` | echo the `tpi_csrf` cookie value in `x-csrf-token` |
| `415 Unsupported Media Type` | a body without `Content-Type: application/json` | set the header (omit it only for body-less requests) |
| `429 Too Many Requests` | rate limit | honour `Retry-After`; programmatic callers should use an API key |
