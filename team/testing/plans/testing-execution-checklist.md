# Testing Execution Checklist

Run this checklist under the control of [../QA/QA-MASTER-PLAN.md](../QA/QA-MASTER-PLAN.md).

---

## Local Dev Execution

### Before Running

- install dependencies
- start any required local services
- confirm the ports you expect are free
- if deployment/provisioning code changed, run non-mutating preflight checks first

If deployment/provisioning changed, run this dry-run preflight before any real deploy:

```bash
./deploy/deploy-dojo.sh --dry-run
bash -n deploy/deploy-dojo.sh
docker compose -f deploy/docker-compose.yml config >/tmp/dojolm-compose.resolved.yml
```

### Run

```bash
npm test
npm run type-check --workspace=dojolm-web
npm test --workspace=dojolm-web -- --run
npm run build --workspace=dojolm-web
npm run test:e2e --workspace=dojolm-web
node team/testing/tools/generate-coverage-matrix.mjs
node team/testing/tools/generate-uat-ux-matrix.mjs
npm run verify:docs
```

For auth, CORS, origin-trust, or rate-limit work:

- verify protected routes deny unauthenticated access
- verify explicit public browser-readable `GET` routes still load the UI surfaces that depend on them
- verify normal dashboard or page-load fan-out does not trigger self-inflicted 429s

If validating the standalone scanner API:

```bash
curl "http://localhost:8089/api/run-tests"
```

---

## Production Execution

### Before Running

- [ ] Voyager is reachable: `ssh paultinp@192.168.70.120 "echo ok"`
- [ ] Container is healthy: `ssh paultinp@192.168.70.120 "docker ps --filter name=dojolm-web"`
- [ ] API responds: `curl -sk https://dojo.bucc.internal/api/stats | jq .`
- [ ] `.env.e2e.prod` exists in `packages/dojolm-web/` (gitignored, contains no real admin creds for automated runs)
- [ ] Confirm test scope is read-only (no data mutations against prod unless explicitly approved)

### Run — Production Smoke

```bash
# Health check
curl -sk https://dojo.bucc.internal/api/stats | jq .

# App loads (expect 200 or 302)
curl -sk -o /dev/null -w '%{http_code}\n' https://dojo.bucc.internal/

# Protected route denies unauthenticated (expect 401 or 403)
curl -sk -o /dev/null -w '%{http_code}\n' https://dojo.bucc.internal/api/admin/settings

# Container logs clean
ssh paultinp@192.168.70.120 "docker logs --tail 50 dojolm-web 2>&1 | grep -ciE 'error|fatal|panic'"
```

### Run — Production E2E (Playwright)

```bash
# Full prod E2E suite (desktop + mobile, screenshots + video on)
E2E_TARGET=prod npm run test:e2e --workspace=dojolm-web

# Single spec for targeted validation
E2E_TARGET=prod npx playwright test navigation.spec.ts

# Headed mode for manual observation
E2E_TARGET=prod npx playwright test --headed --project=chromium
```

### Run — Production Auth / Security Spot Checks

- verify protected routes deny unauthenticated access against the live deployment
- verify explicit public browser-readable `GET` routes still load the UI surfaces that depend on them
- verify normal dashboard or page-load fan-out does not trigger self-inflicted 429s against the live Caddy reverse proxy
- verify CORS headers match `TPI_CORS_ORIGINS` value in production `.env`

---

## After Running (both environments)

- record QA findings in `team/testing/QA/QA-Log/` — clearly label the environment (local-dev or production)
- record security-specific findings in `team/testing/QA/security/audit-results/`
- for production runs, archive Playwright HTML report and `e2e-results/prod-results.json` as evidence
- update docs if counts, routes, or product surface changed
- run an adversarial reconciliation pass: compare matrix counts, executed test evidence, and CI/workflow assumptions; resolve any mismatches before sign-off
