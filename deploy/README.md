# DojoLM — Deployment (`deploy/`)

Self-hosted, single-host Docker Compose deployment for the DojoLM web app
(`dojolm-web`).

| File | Purpose |
| --- | --- |
| `docker-compose.yml` | **Production** stack: `dojolm-db`, `dojolm-web`, and an **opt-in** `dojolm-edge` (behind the `edge` profile, default OFF). |
| `docker-compose.challenger.yml` | DEV/QA stack (build-from-source, no edge/TLS). |
| `deploy-challenger.sh` | DEV/QA deploy script. |
| `edge/Caddyfile` | **Reverse-proxy config for the public edge** (see below). |
| `secure-standalone-server.cjs` | Dockerfile entrypoint — secure wrapper proxy that blocks `TRACE`/`TRACK`. |
| `.env.example` | Template for the host `.env` (secrets + resource names). |

## Quick start

```bash
# 1. Configure your environment
cp deploy/.env.example .env
# fill in the REQUIRED secrets below (the app refuses to start without them)

# 2. Create the external Docker resources the production compose expects
docker network create edge-net
docker volume  create dojolm_data

# 3. Build the image + bring the stack up (db + web; edge-less by default)
docker build -t dojolm-web:latest -f Dockerfile .
docker compose -f deploy/docker-compose.yml up -d

# 4. First-boot admin (see "First-boot setup" below)
```

### Who serves the public hostname? (edge vs. edge-less)

The `dojolm-edge` Caddy is **opt-in**, behind the compose `edge` profile (default
OFF). Choose based on whether something **upstream** already terminates `:443`:

- **An upstream :443 terminator already serves your hostname** (a platform Caddy,
  a corporate load balancer, an ACME-fronted proxy that reverse-proxies straight
  to `dojolm-web:42001`) → **run edge-less.** Leave the profile OFF; the command
  in step 3 is all you need. A standalone edge would only collide on host `:443`
  with that upstream. *(For example, a platform reverse proxy on the same host can
  front `dojo.example.internal` this way.)*
- **Nothing fronts the app** → **run the standalone edge** so it answers the
  hostname on host `:80` + `:443`:

  ```bash
  # seed the HTTPS CA volume first (see "HTTPS / browser trust")
  docker compose -f deploy/docker-compose.yml --profile edge up -d
  # equivalently: COMPOSE_PROFILES=edge docker compose -f deploy/docker-compose.yml up -d
  ```

  With the profile OFF, the `dojolm-edge` service, its `:80`/`:443` publishes, and
  its external `dojolm_edge_data` volume are all omitted — so you do **not** need
  to create that volume unless you enable the edge.

## REQUIRED `.env` values

The app refuses to start if any of these are missing or invalid:

| Var | Value | Notes |
| --- | --- | --- |
| `TPI_COOKIE_SIGNING_KEY_CURRENT` | `openssl rand -hex 32` | 64 hex chars (32 bytes). Used to sign session-claim cookies — missing/short = startup error. |
| `TPI_DB_ENCRYPTION_KEY` | `openssl rand -base64 48` | 32+ chars. Encrypts at-rest secrets in the DB. |
| `DOJOLM_DB_PASSWORD` | `openssl rand -base64 24` | Postgres user password. |
| `TPI_API_KEY` | `openssl rand -hex 32` | API authentication key. (Legacy `NODA_API_KEY` still accepted.) |

Optional (sane defaults):

| Var | Default | When to set |
| --- | --- | --- |
| `TPI_STORAGE_BACKEND` | `db` | `json` for the file-storage path. **Any other value fails fast at boot.** |
| `TPI_APP_URL` | (unset) | Pin the trusted browser origin to one canonical URL (e.g. `https://dojo.example.com`). When unset, the app trusts whatever Host the request arrives with — fine for single-host deploys. |
| `TPI_COOKIE_SIGNING_KEY_PREVIOUS` | (unset) | Set during key rotation: the app accepts cookies signed by either key during the overlap. |

## First-boot setup

The image **does not bake in an admin user**. After the first `compose up`, the
DB is empty and the app routes to `/setup`. Provision the admin one of two ways:

**Option 1 — browser wizard.** Visit the app in a browser and follow the
`/setup` flow. The wizard creates the first admin and the telemetry-consent
record, then redirects to `/login`.

**Option 2 — headless.** `POST /api/setup/admin` with a JSON body:

```bash
curl -X POST http://localhost:3001/api/setup/admin \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3001' \
  -d '{"username":"admin","password":"<a-strong-password>"}'
```

The `Origin` header is required (CSRF defense). The password must satisfy:
≥ 12 chars, upper + lower + digit + special.

`/api/setup/admin` returns `400` if an admin already exists — it is a one-shot
provisioning endpoint, not an account-management API. To reset the admin
password later, use the `/admin/account` page or the password-reset CLI.

## Telemetry & opt-out

DojoLM collects **anonymised** platform telemetry to fund the free, open-source
edition. Per the [Privacy policy](../packages/dojolm-web/src/app/legal/privacy/page.tsx),
the corpus is anonymised (k-anonymity threshold + an upload-side PII sanitiser)
before use, so it is not personal data; the thin per-install envelope is
processed on a **legitimate-interest** basis (GDPR Art. 6(1)(f)) with a **free
right to object** (Art. 21). Telemetry is **not mandatory** and **not a
condition of using the community edition** — you can opt out and keep using the
product.

**Opting out (corpus-uplink config layer).** Telemetry is produced through a
pluggable sink selected by `DOJO_TELEMETRY_SINK`:

| `DOJO_TELEMETRY_SINK` | Behaviour |
|---|---|
| unset (production default) | `noop` — events are discarded; **nothing leaves the box**. |
| `noop` | Same as above, set explicitly. **This is the opt-out setting.** |
| `jsonl` | Events written to a local JSON-Lines file (`DOJO_TELEMETRY_JSONL_PATH`, default `./telemetry-events.jsonl`) so you can inspect exactly what would be collected. Still no off-box egress. |
| `console` | Events logged to stdout (dev default). |

The network transport that would egress telemetry to the BlackUnicorn corpus
over HTTPS is **not wired into the current community build**. A self-hosted
deployment therefore does **not** transmit telemetry off-box by default today.
When the corpus uplink ships it will be operator-visible, transmitted over
HTTPS, and disabling it (keeping the sink at `noop`) remains the no-cost opt-out.
The first-boot acknowledgement record (`acknowledged_telemetry_at`) is the
Art. 13/14 transparency evidence and is independent of the sink setting.

<!-- COUNSEL-PENDING-2026-06-17 — F-QA-018: the lawful-basis framing above
     mirrors /legal/privacy §5 (D-12). Privacy counsel ratifies the final
     wording; keep this table in sync with the emitter's sink kinds. -->

## Topology

**Default — edge-less** (`edge` profile OFF; an upstream terminator serves the
hostname):

```
              host :443 (upstream)                          edge-net
client ── dojo.example.internal ──▶ upstream terminator ──▶ dojolm-web:42001
              (e.g. platform Caddy)                             │  dojolm-net
                                                                ▼
                                                            dojolm-db:5432
```

**Standalone edge** (`--profile edge`; nothing upstream fronts the app):

```
                     host :80/:443                          edge-net
client ── dojo.example.internal ──▶ dojolm-edge (Caddy) ──▶ dojolm-web:42001
                                                                │  dojolm-net
                                                                ▼
                                                            dojolm-db:5432
```

- **`dojolm-web`** — the Next.js app. Publishes `0.0.0.0:3001 → 42001` on the
  host (direct/debug access) and joins the external edge network so a reverse
  proxy (upstream terminator or `dojolm-edge`) can reach it by container name.
- **`dojolm-db`** — Postgres, private on `dojolm-net` only.
- **`dojolm-edge`** — **opt-in** Caddy reverse proxy (`edge` profile); the thing
  that answers your public hostname **when nothing upstream does**.

### External resources

The compose references **external** Docker resources by name, overridable in `.env`:

| `.env` var | Default | Needed when |
| --- | --- | --- |
| `DOJOLM_EDGE_NETWORK` | `edge-net` | always — `dojolm-web` joins it so a proxy reaches it by name. |
| `DOJOLM_DATA_VOLUME` | `dojolm_data` | always — persistent app data. |
| `DOJOLM_EDGE_DATA_VOLUME` | `dojolm_edge_data` | **only with `--profile edge`** — Caddy's internal-CA storage. |

```bash
docker network create edge-net      # or rename via DOJOLM_EDGE_NETWORK
docker volume  create dojolm_data   # NEVER let compose create an empty one
# Only if you enable the standalone edge (see the cutover runbook for seeding):
docker volume  create dojolm_edge_data
```

## The public edge — `dojolm-edge` (opt-in)

`dojolm-edge` is gated behind the compose **`edge` profile, which defaults OFF**.
Enable it only on a host with **no upstream `:443` terminator** (see "Who serves
the public hostname?" above). Enable it with `--profile edge` or
`COMPOSE_PROFILES=edge`.

`edge/Caddyfile` configures Caddy to terminate `dojo.example.internal` /
`dojolm.example.internal` and reverse-proxy to `dojolm-web:42001`. Edit the
file to match your own hostnames before the first deploy.

- Image `caddy:2-alpine`, container name `dojolm-edge`, `restart: unless-stopped`.
- `profiles: ["edge"]` — omitted entirely (service + ports + `dojolm_edge_data`
  requirement) unless the profile is active.
- Joins the same external edge network as `dojolm-web`, so Docker embedded DNS
  resolves `dojolm-web:42001`.
- Publishes host `:80` (HTTP) and `:443` (HTTPS — see "HTTPS / browser trust"
  below).
- Mounts the repo-tracked config **`deploy/edge/Caddyfile`** read-only at
  `/etc/caddy/Caddyfile`.

## HTTPS / browser trust

The edge serves **both** `http://` on `:80` and `https://` on `:443`. The
HTTPS path uses Caddy's **internal CA** (`tls internal`) — it issues a
self-managed certificate authority on first start and signs leaf certs for
the hostnames in your Caddyfile.

**Browsers will REJECT that cert by default** (`ERR_CERT_AUTHORITY_INVALID`)
until you do one of the following:

1. **Trust Caddy's internal CA** (recommended for LAN deploys). Pull the root
   out of the `dojolm_edge_data` volume after first start and install it in
   each client's trust store:

   ```bash
   docker run --rm -v dojolm_edge_data:/data alpine \
     cat /data/caddy/pki/authorities/local/root.crt > caddy-internal-root.crt
   # then import caddy-internal-root.crt into your browser / OS keychain
   ```

2. **Front the app with a TLS terminator that already has a trusted cert**
   (a corporate load balancer, the platform Caddy, an ACME-issued
   certificate). Then you don't need `dojolm-edge` at all — **run edge-less**
   (leave the `edge` profile OFF) and point the upstream straight at
   `dojolm-web:42001`. This is the platform-fronted, edge-less shape.

3. **Use HTTP-only** for local/LAN testing. Enable the edge but strip the
   `https://` site block from `edge/Caddyfile` (and the `:443` port mapping
   from `docker-compose.yml`).

4. **Get a publicly-trusted cert via Let's Encrypt DNS-01** — the right choice
   when you own a domain but the host is **not reachable on inbound `:80`/`:443`**
   (LAN, NAT, private network), so HTTP-01/TLS-ALPN can't work. Caddy solves the
   ACME challenge by writing a DNS TXT record instead of serving a file, using a
   DNS-provider plugin. You need a Caddy build with your provider's DNS module
   (e.g. `caddy-dns/cloudflare`) and an API token in the edge env; then in
   `edge/Caddyfile`:

   ```caddyfile
   your-host.example.com {
     tls { dns cloudflare {env.CF_API_TOKEN} }
     reverse_proxy dojolm-web:42001
   }
   ```

   The leaf chains to a public root every browser already trusts — **no client CA
   import** (unlike option 1) and **no public inbound** (unlike a standard ACME
   HTTP-01 flow). This is the smoothest browser-trust path for a private-network
   deploy that still wants real certs.

**Which option maps to the origin strategy (F-QA-022):** the app derives its
trusted browser origin from the request `Host` when `TPI_APP_URL` is unset, so
whichever scheme/host you land on above just works — no rebuild, no baked URL.
Set `TPI_APP_URL` only if you want to pin one canonical origin.

The `dojolm_edge_data` volume is **external** on purpose: if you have a
chained internal-CA setup you want Caddy to *reuse* (so leaves chain to a
root your clients already trust), pre-seed the volume with that CA's
`root.{crt,key}` + `intermediate.{crt,key}` under
`caddy/pki/authorities/local/` *before* the first `compose up` — Caddy will
adopt the seeded CA and skip minting a parallel one.

The CA key lives **only** in the volume on the host — never commit it.

## Verification

After `compose up`:

```bash
# containers up?
docker ps --filter name=dojolm

# app responds directly?
curl -s http://localhost:3001/api/health

# edge routes the public hostname?
curl -s  http://<your-host>/api/health
curl -sk https://<your-host>/api/health   # -k: internal CA
```

## Rollback

```bash
docker tag dojolm-web:previous dojolm-web:latest
docker compose -f deploy/docker-compose.yml up -d
# add --profile edge if this host runs the standalone edge
```

(Tag the prior image `:previous` before each build to keep this option open.)
