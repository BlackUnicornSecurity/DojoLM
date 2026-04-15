#!/usr/bin/env bash
# DojoLM — Voyager Production Deployment Script
# Deploys DojoLM web app to Voyager (192.168.70.120)
#
# Usage (from dev machine):
#   ./deploy/deploy-dojo.sh
#   ./deploy/deploy-dojo.sh --dry-run
#
# Prerequisites:
#   - SSH access: ssh paultinp@192.168.70.120
#   - /opt/dojolm/.env populated with secrets
#   - Docker running on Voyager
#   - Caddy configured with dojo.bucc.internal

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
LOG_PREFIX="[$(date -u '+%Y-%m-%dT%H:%M:%SZ')]"

VOYAGER_IP="192.168.70.120"
VOYAGER_USER="paultinp"
REMOTE_DIR="/opt/dojolm"
DRY_RUN=0

PASS=0
FAIL=0
WARN=0

pass() { PASS=$((PASS + 1)); echo "${LOG_PREFIX} [PASS] $1"; }
fail() { FAIL=$((FAIL + 1)); echo "${LOG_PREFIX} [FAIL] $1"; }
warn() { WARN=$((WARN + 1)); echo "${LOG_PREFIX} [WARN] $1"; }
info() { echo "${LOG_PREFIX} [INFO] $1"; }
skip() { echo "${LOG_PREFIX} [INFO] [DRY-RUN] $1"; }

usage() {
    cat <<EOF
Usage:
  ./deploy/deploy-dojo.sh [--dry-run] [--help]

Options:
  --dry-run    Execute non-mutating preflight checks only
  --help       Show this help
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        --dry-run)
            DRY_RUN=1
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            fail "Unknown argument: $1"
            usage
            exit 1
            ;;
    esac
    shift
done

echo "================================================================"
echo "  DojoLM — Voyager Deployment"
echo "  Target: ${VOYAGER_IP}:${REMOTE_DIR}"
if [ "${DRY_RUN}" -eq 1 ]; then
    echo "  Mode: DRY-RUN (non-mutating preflight)"
fi
echo "================================================================"
echo ""

# ── Phase 1: Local Validation ────────────────────────────────────────────────

info "=== Phase 1: Local Validation ==="

# Check Dockerfile exists
if [ -f "${PROJECT_ROOT}/Dockerfile" ]; then
    pass "Dockerfile found"
else
    fail "Dockerfile not found at ${PROJECT_ROOT}/Dockerfile"
    exit 1
fi

# Check docker-compose exists
if [ -f "${SCRIPT_DIR}/docker-compose.yml" ]; then
    pass "docker-compose.yml found"
else
    fail "docker-compose.yml not found"
    exit 1
fi

# Validate docker-compose resolves locally (dry-run safe preflight artifact)
if docker compose -f "${SCRIPT_DIR}/docker-compose.yml" config >/tmp/dojolm-compose.resolved.yml; then
    pass "docker-compose resolves cleanly (/tmp/dojolm-compose.resolved.yml)"
else
    fail "docker-compose config validation failed"
    exit 1
fi

# Verify local build artifacts exist
if [ -d "${PROJECT_ROOT}/packages/dojolm-web/.next" ]; then
    pass "Next.js build artifacts present"
else
    warn "Next.js build not found — will build on remote"
fi

# ── Phase 2: SSH Connectivity ─────────────────────────────────────────────────

info ""
info "=== Phase 2: SSH Connectivity ==="

if ssh -o ConnectTimeout=5 -o BatchMode=yes "${VOYAGER_USER}@${VOYAGER_IP}" "echo ok" &>/dev/null; then
    pass "SSH to Voyager reachable"
else
    fail "Cannot SSH to ${VOYAGER_USER}@${VOYAGER_IP}"
    echo "  Fix: Ensure SSH key is configured and Voyager is online"
    exit 1
fi

# ── Phase 3: Remote Prerequisites ─────────────────────────────────────────────

info ""
info "=== Phase 3: Remote Prerequisites ==="

# Check Docker on remote
REMOTE_DOCKER=$(ssh "${VOYAGER_USER}@${VOYAGER_IP}" "docker --version 2>/dev/null || echo MISSING")
if [[ "${REMOTE_DOCKER}" != "MISSING" ]]; then
    pass "Docker available on Voyager: ${REMOTE_DOCKER}"
else
    fail "Docker not installed on Voyager"
    exit 1
fi

# Check remote directory
if [ "${DRY_RUN}" -eq 1 ]; then
    if ssh "${VOYAGER_USER}@${VOYAGER_IP}" "[ -d ${REMOTE_DIR} ]"; then
        pass "Remote directory ${REMOTE_DIR} exists"
    else
        warn "Remote directory ${REMOTE_DIR} missing (would be created in deploy mode)"
    fi
else
    ssh "${VOYAGER_USER}@${VOYAGER_IP}" "mkdir -p ${REMOTE_DIR}" && \
        pass "Remote directory ${REMOTE_DIR} ready" || \
        fail "Cannot create ${REMOTE_DIR}"
fi

# Check .env on remote
if ssh "${VOYAGER_USER}@${VOYAGER_IP}" "[ -f ${REMOTE_DIR}/.env ]"; then
    pass ".env file present on Voyager"
else
    if [ "${DRY_RUN}" -eq 1 ]; then
        warn ".env not found — would copy template in deploy mode"
    else
        warn ".env not found — copying template"
        scp "${SCRIPT_DIR}/.env.example" "${VOYAGER_USER}@${VOYAGER_IP}:${REMOTE_DIR}/.env"
        warn "IMPORTANT: SSH to Voyager and fill in ${REMOTE_DIR}/.env with real secrets"
    fi
fi

# ── Phase 4: Sync Files ───────────────────────────────────────────────────────

info ""
info "=== Phase 4: Sync Files ==="

if [ "${DRY_RUN}" -eq 1 ]; then
    skip "Skipping rsync/scp sync operations."
else
    info "Syncing project to Voyager (excluding node_modules, .next, team, artifacts)..."
    rsync -az --delete \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude '.git' \
        --exclude 'team' \
        --exclude '.env' \
        --exclude '.env.*' \
        --exclude '*.db' \
        --exclude '*.png' \
        --exclude '*.jpg' \
        --exclude '*.pptx' \
        --exclude '.playwright-mcp' \
        --exclude '.claude' \
        --exclude '/coverage' \
        --exclude 'packages/bmad-cybersec' \
        "${PROJECT_ROOT}/" "${VOYAGER_USER}@${VOYAGER_IP}:${REMOTE_DIR}/app/" && \
        pass "Files synced to Voyager" || \
        fail "rsync failed"

    # Copy docker-compose to deploy root
    scp "${SCRIPT_DIR}/docker-compose.yml" "${VOYAGER_USER}@${VOYAGER_IP}:${REMOTE_DIR}/" && \
        pass "docker-compose.yml deployed" || \
        fail "docker-compose.yml copy failed"

    # Seed validation module corpus into running container (OI-R3-001)
    if [ -d "${SCRIPT_DIR}/validation-seed" ]; then
        info "Seeding validation module corpus into container..."
        # Copy seed files to remote /tmp first, then docker cp into container
        rsync -az "${SCRIPT_DIR}/validation-seed/" \
            "${VOYAGER_USER}@${VOYAGER_IP}:/tmp/dojolm-validation-seed/" && \
        ssh "${VOYAGER_USER}@${VOYAGER_IP}" \
            'for dir in /tmp/dojolm-validation-seed/*/; do module=$(basename "$dir"); docker cp "$dir" dojolm-web:/app/data/validation/modules/"$module" 2>/dev/null; done' && \
        pass "Validation corpus seeded (29 modules → /app/data/validation/modules/)" || \
        warn "Validation corpus seed failed — check container status"
    fi
fi

# ── Phase 5: Build & Start ────────────────────────────────────────────────────

info ""
info "=== Phase 5: Build & Start ==="

# Capture git SHA for build label
BUILD_SHA=$(cd "${PROJECT_ROOT}" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

if [ "${DRY_RUN}" -eq 1 ]; then
    skip "Skipping docker tag/build/compose restart operations."
else
    # Tag current image as :previous for rollback BEFORE building new one
    ssh "${VOYAGER_USER}@${VOYAGER_IP}" "docker tag dojolm-web:latest dojolm-web:previous 2>/dev/null || true"

    info "Building Docker image on Voyager (SHA: ${BUILD_SHA})..."
    ssh "${VOYAGER_USER}@${VOYAGER_IP}" "cd ${REMOTE_DIR}/app && docker build \
        --build-arg BUILD_SHA=\"${BUILD_SHA}\" \
        --build-arg BUILD_DATE=\"${BUILD_DATE}\" \
        --build-arg NEXT_PUBLIC_APP_URL=https://dojo.bucc.internal \
        --build-arg NEXT_PUBLIC_API_URL=https://dojo.bucc.internal \
        -t dojolm-web:latest \
        -t dojolm-web:${BUILD_SHA} \
        -f Dockerfile ." && \
        pass "Docker image built (tagged: latest + ${BUILD_SHA})" || \
        fail "Docker build failed"

    info "Starting services..."
    ssh "${VOYAGER_USER}@${VOYAGER_IP}" "cd ${REMOTE_DIR} && docker compose down 2>/dev/null; docker compose up -d" && \
        pass "Services started" || \
        fail "docker compose up failed"

    # Wait for container to be healthy
    info "Waiting for health check (30s)..."
    sleep 10
fi

# ── Phase 6: Verification ─────────────────────────────────────────────────────

info ""
info "=== Phase 6: Verification ==="

if [ "${DRY_RUN}" -eq 1 ]; then
    skip "Skipping post-deploy runtime verification checks."
else
    # Check container running
    CONTAINER_STATUS=$(ssh "${VOYAGER_USER}@${VOYAGER_IP}" "docker ps --filter name=dojolm-web --format '{{.Status}}' 2>/dev/null || echo DOWN")
    if [[ "${CONTAINER_STATUS}" == *"Up"* ]]; then
        pass "Container running: ${CONTAINER_STATUS}"
    else
        fail "Container not running: ${CONTAINER_STATUS}"
    fi

    # Check API health
    API_RESPONSE=$(ssh "${VOYAGER_USER}@${VOYAGER_IP}" "curl -s -m 5 http://localhost:3001/api/health 2>/dev/null || echo FAIL")
    # Note: Caddy proxies dojo.bucc.internal -> localhost:3001 -> container:42001
    if [[ "${API_RESPONSE}" != "FAIL" ]] && [[ "${API_RESPONSE}" == *"{"* ]]; then
        pass "API responding on :3001"
    else
        warn "API not responding yet — check: ssh ${VOYAGER_USER}@${VOYAGER_IP} 'docker logs dojolm-web'"
    fi

    # Check Caddy proxy
    # Use '; true' so curl exit code never contaminates the output with a second echo
    CADDY_CHECK=$(ssh "${VOYAGER_USER}@${VOYAGER_IP}" "curl -sk -m 5 -o /dev/null -w '%{http_code}' https://dojo.bucc.internal/ 2>/dev/null; true")
    if [[ "${CADDY_CHECK}" == "200" ]] || [[ "${CADDY_CHECK}" == "302" ]]; then
        pass "Caddy reverse proxy working (dojo.bucc.internal -> :3001)"
    else
        warn "Caddy proxy returned ${CADDY_CHECK} — verify Caddyfile includes dojo.bucc.internal"
    fi

    # Check container logs for errors
    # grep -c exits 1 when no matches; '; true' prevents || echo from doubling the output
    ERRORS=$(ssh "${VOYAGER_USER}@${VOYAGER_IP}" "docker logs dojolm-web 2>&1 | grep -ci 'error\|fatal\|panic'; true")
    ERRORS="${ERRORS:-0}"
    if [ "${ERRORS}" -eq 0 ]; then
        pass "No errors in container logs"
    else
        warn "${ERRORS} error(s) found in container logs — check: docker logs dojolm-web"
    fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "================================================================"
echo "  DojoLM Deployment Summary"
echo "================================================================"
echo "  PASS: ${PASS}"
echo "  FAIL: ${FAIL}"
echo "  WARN: ${WARN}"
echo ""
echo "  Container: dojolm-web"
echo "  Internal:  http://localhost:3001"
echo "  External:  https://dojo.bucc.internal"
echo "  Data vol:  dojolm_data -> /app/data"
echo "================================================================"

echo "  Rollback:  ssh ${VOYAGER_USER}@${VOYAGER_IP} 'docker tag dojolm-web:previous dojolm-web:latest && cd ${REMOTE_DIR} && docker compose up -d'"
echo "================================================================"

if [ "${FAIL}" -gt 0 ]; then
    echo "  STATUS: INCOMPLETE — address ${FAIL} failure(s) above"
    exit 1
else
    if [ "${DRY_RUN}" -eq 1 ]; then
        echo "  STATUS: DRY-RUN OK (${BUILD_SHA})"
    else
        echo "  STATUS: DEPLOYED (${BUILD_SHA})"
    fi
    exit 0
fi
