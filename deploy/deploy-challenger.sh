#!/usr/bin/env bash
# DojoLM — DEV/QA Deployment Script
# Deploys DojoLM web app to your DEV/QA host (set CHALLENGER_IP / CHALLENGER_USER)
# for development and QA testing.
#
# Usage (from dev machine):
#   CHALLENGER_IP=192.0.2.10 CHALLENGER_USER=deploy ./deploy/deploy-challenger.sh
#   ./deploy/deploy-challenger.sh --dry-run
#
# Prerequisites:
#   - SSH access: ssh $CHALLENGER_USER@$CHALLENGER_IP
#   - /opt/dojolm/.env populated with secrets
#   - Docker running on the DEV/QA host
#   - Caddy configured with your dev hostname, e.g. dojo-dev.example.com (optional)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
LOG_PREFIX="[$(date -u '+%Y-%m-%dT%H:%M:%SZ')]"

CHALLENGER_IP="${CHALLENGER_IP:-dev-host.example.com}"
CHALLENGER_USER="${CHALLENGER_USER:-deploy}"
REMOTE_DIR="/opt/dojolm"
DRY_RUN=0
ALLOW_BEHIND=0
ALLOW_DIRTY=0

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
  ./deploy/deploy-challenger.sh [--dry-run] [--allow-behind] [--allow-dirty] [--help]

Options:
  --dry-run        Execute non-mutating preflight checks only
  --allow-behind   Bypass origin/main staleness check (NOT RECOMMENDED — ships old code)
  --allow-dirty    Bypass working-tree cleanliness check (warns instead of stopping)
  --help           Show this help
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        --dry-run)
            DRY_RUN=1
            ;;
        --allow-behind)
            ALLOW_BEHIND=1
            ;;
        --allow-dirty)
            ALLOW_DIRTY=1
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
echo "  DojoLM — Challenger DEV/QA Deployment"
echo "  Target: ${CHALLENGER_IP}:${REMOTE_DIR}"
if [ "${DRY_RUN}" -eq 1 ]; then
    echo "  Mode: DRY-RUN (non-mutating preflight)"
fi
echo "================================================================"
echo ""

# ── Phase 0.5: Source-of-Truth Validation ────────────────────────────────
# Without this, the script silently ships whatever happens to be checked out
# in ${PROJECT_ROOT}. In a worktree-heavy setup the main repo can be parked
# on a stale branch while real work lives on worktree HEADs, causing deploys
# to ship old code while reporting a stale SHA. Fail fast unless explicitly
# overridden.

info "=== Phase 0.5: Source-of-Truth Validation ==="
# Use `git rev-parse --git-dir` rather than `[ -d .git ]` — in a worktree the
# .git entry is a file pointer (not a directory), and a plain `-d` check
# would mis-classify worktree deploys as non-git and silently skip validation.
if ! git -C "${PROJECT_ROOT}" rev-parse --git-dir >/dev/null 2>&1; then
    warn "${PROJECT_ROOT} is not a git repo — skipping source-of-truth check"
else
    if ! git -C "${PROJECT_ROOT}" fetch origin --quiet 2>/dev/null; then
        warn "git fetch origin failed — proceeding without source-of-truth check (network?)"
    else
        HEAD_SHA=$(git -C "${PROJECT_ROOT}" rev-parse HEAD)
        ORIGIN_MAIN_SHA=$(git -C "${PROJECT_ROOT}" rev-parse origin/main 2>/dev/null || echo "")

        if [ -z "${ORIGIN_MAIN_SHA}" ]; then
            warn "Cannot resolve origin/main — skipping behind/ahead check"
        else
            BEHIND_COUNT=$(git -C "${PROJECT_ROOT}" rev-list --count HEAD..origin/main)
            AHEAD_COUNT=$(git -C "${PROJECT_ROOT}" rev-list --count origin/main..HEAD)

            if [ "${BEHIND_COUNT}" -gt 0 ] && [ "${ALLOW_BEHIND}" -eq 0 ]; then
                fail "Main repo ${PROJECT_ROOT} is ${BEHIND_COUNT} commit(s) BEHIND origin/main"
                echo "  HEAD:        ${HEAD_SHA}"
                echo "  origin/main: ${ORIGIN_MAIN_SHA}"
                echo ""
                echo "  Missing commits that would NOT be deployed:"
                git -C "${PROJECT_ROOT}" log --oneline HEAD..origin/main | head -20 | sed 's/^/    /'
                echo ""
                echo "  Fix:    git -C ${PROJECT_ROOT} pull origin main --ff-only"
                echo "  Bypass: ./deploy/$(basename "$0") --allow-behind   (NOT RECOMMENDED — ships old code)"
                exit 1
            fi

            if [ "${BEHIND_COUNT}" -gt 0 ]; then
                warn "Main repo is ${BEHIND_COUNT} commit(s) behind origin/main — proceeding under --allow-behind"
            else
                pass "Main repo at origin/main (HEAD=${HEAD_SHA:0:10})"
            fi

            if [ "${AHEAD_COUNT}" -gt 0 ]; then
                warn "Main repo has ${AHEAD_COUNT} commit(s) ahead of origin/main — deploying un-pushed code:"
                git -C "${PROJECT_ROOT}" log --oneline origin/main..HEAD | head -10 | sed 's/^/    /'
            fi
        fi
    fi

    # Only flag tracked-file modifications. Untracked entries are noisy
    # (node_modules, dist, .next show up here in worktrees even when gitignored)
    # and rsync already excludes the well-known build artifacts.
    DIRTY=$(git -C "${PROJECT_ROOT}" diff --name-only HEAD 2>/dev/null || true)
    if [ -n "${DIRTY}" ]; then
        DIRTY_COUNT=$(echo "${DIRTY}" | wc -l | tr -d ' ')
        if [ "${ALLOW_DIRTY}" -eq 1 ]; then
            warn "Working tree has ${DIRTY_COUNT} uncommitted tracked change(s) — proceeding under --allow-dirty"
        else
            warn "Working tree has ${DIRTY_COUNT} uncommitted tracked change(s) — deploy will ship them:"
            echo "${DIRTY}" | head -10 | sed 's/^/    /'
            echo "  Bypass:  ./deploy/$(basename "$0") --allow-dirty"
        fi
    else
        pass "Working tree clean (no tracked-file modifications)"
    fi
fi
echo ""

# ── Phase 1: Local Validation ────────────────────────────────────────────────

info "=== Phase 1: Local Validation ==="

if [ -f "${PROJECT_ROOT}/Dockerfile" ]; then
    pass "Dockerfile found"
else
    fail "Dockerfile not found at ${PROJECT_ROOT}/Dockerfile"
    exit 1
fi

if [ -f "${SCRIPT_DIR}/docker-compose.challenger.yml" ]; then
    pass "docker-compose.challenger.yml found"
else
    fail "docker-compose.challenger.yml not found"
    exit 1
fi

if docker compose -f "${SCRIPT_DIR}/docker-compose.challenger.yml" config >/tmp/dojolm-challenger.resolved.yml; then
    pass "docker-compose.challenger.yml resolves cleanly (/tmp/dojolm-challenger.resolved.yml)"
else
    fail "docker-compose.challenger.yml config validation failed"
    exit 1
fi

if [ -d "${PROJECT_ROOT}/packages/dojolm-web/.next" ]; then
    pass "Next.js build artifacts present"
else
    warn "Next.js build not found — will build on remote"
fi

# ── Phase 2: SSH Connectivity ─────────────────────────────────────────────────

info ""
info "=== Phase 2: SSH Connectivity ==="

if ssh -o ConnectTimeout=5 -o BatchMode=yes "${CHALLENGER_USER}@${CHALLENGER_IP}" "echo ok" &>/dev/null; then
    pass "SSH to Challenger reachable"
else
    fail "Cannot SSH to ${CHALLENGER_USER}@${CHALLENGER_IP}"
    echo "  Fix: Ensure SSH key is configured and the host is online"
    echo "  (the deploy user needs key-based SSH access; no password auth)"
    exit 1
fi

# ── Phase 3: Remote Prerequisites ─────────────────────────────────────────────

info ""
info "=== Phase 3: Remote Prerequisites ==="

REMOTE_DOCKER=$(ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" "docker --version 2>/dev/null || echo MISSING")
if [[ "${REMOTE_DOCKER}" != "MISSING" ]]; then
    pass "Docker available on Challenger: ${REMOTE_DOCKER}"
else
    fail "Docker not installed on Challenger"
    echo "  Fix: apt-get install docker.io docker-compose-plugin"
    exit 1
fi

if [ "${DRY_RUN}" -eq 1 ]; then
    if ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" "[ -d ${REMOTE_DIR} ]"; then
        pass "Remote directory ${REMOTE_DIR} exists"
    else
        warn "Remote directory ${REMOTE_DIR} missing (would be created in deploy mode)"
    fi
else
    ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" "mkdir -p ${REMOTE_DIR}" && \
        pass "Remote directory ${REMOTE_DIR} ready" || \
        fail "Cannot create ${REMOTE_DIR}"
fi

if ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" "[ -f ${REMOTE_DIR}/.env ]"; then
    pass ".env file present on Challenger"
else
    if [ "${DRY_RUN}" -eq 1 ]; then
        warn ".env not found — would copy template in deploy mode"
    else
        warn ".env not found — copying template"
        scp "${SCRIPT_DIR}/.env.example" "${CHALLENGER_USER}@${CHALLENGER_IP}:${REMOTE_DIR}/.env"
        warn "IMPORTANT: SSH to Challenger and fill in ${REMOTE_DIR}/.env with real secrets"
    fi
fi

# ── Phase 4: Sync Files ───────────────────────────────────────────────────────

info ""
info "=== Phase 4: Sync Files ==="

if [ "${DRY_RUN}" -eq 1 ]; then
    skip "Skipping rsync/scp sync operations."
else
    info "Syncing project to Challenger (excluding node_modules, .next, team, artifacts)..."
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
        "${PROJECT_ROOT}/" "${CHALLENGER_USER}@${CHALLENGER_IP}:${REMOTE_DIR}/app/" && \
        pass "Files synced to Challenger" || \
        fail "rsync failed"

    scp "${SCRIPT_DIR}/docker-compose.challenger.yml" "${CHALLENGER_USER}@${CHALLENGER_IP}:${REMOTE_DIR}/docker-compose.yml" && \
        pass "docker-compose.yml deployed" || \
        fail "docker-compose.yml copy failed"

    if [ -d "${SCRIPT_DIR}/validation-seed" ]; then
        info "Seeding validation module corpus into container..."
        rsync -az "${SCRIPT_DIR}/validation-seed/" \
            "${CHALLENGER_USER}@${CHALLENGER_IP}:/tmp/dojolm-validation-seed/" && \
        ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" \
            'for dir in /tmp/dojolm-validation-seed/*/; do module=$(basename "$dir"); docker cp "$dir" dojolm-web:/app/data/validation/modules/"$module" 2>/dev/null; done' && \
        pass "Validation corpus seeded (29 modules → /app/data/validation/modules/)" || \
        warn "Validation corpus seed failed — check container status"
    fi
fi

# ── Phase 5: Build & Start ────────────────────────────────────────────────────

info ""
info "=== Phase 5: Build & Start ==="

BUILD_SHA=$(cd "${PROJECT_ROOT}" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

if [ "${DRY_RUN}" -eq 1 ]; then
    skip "Skipping docker tag/build/compose restart operations."
else
    ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" "docker tag dojolm-web:latest dojolm-web:previous 2>/dev/null || true"

    # F-QA-022: do NOT bake NEXT_PUBLIC_APP_URL/API_URL — the Dockerfile builds an
    # origin-agnostic image (client uses relative URLs, server derives the trusted
    # origin from the request Host). Pin the origin at RUNTIME via TPI_APP_URL in
    # .env (compose reads it) if this deploy needs a fixed canonical origin.
    info "Building Docker image on Challenger (SHA: ${BUILD_SHA})..."
    ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" "cd ${REMOTE_DIR}/app && docker build \
        --build-arg BUILD_SHA=\"${BUILD_SHA}\" \
        --build-arg BUILD_DATE=\"${BUILD_DATE}\" \
        --build-arg NEXT_PUBLIC_GIT_SHA=\"${BUILD_SHA}\" \
        --build-arg NEXT_PUBLIC_APP_ENV=staging \
        -t dojolm-web:latest \
        -t dojolm-web:${BUILD_SHA} \
        -f Dockerfile ." && \
        pass "Docker image built (tagged: latest + ${BUILD_SHA})" || \
        fail "Docker build failed"

    info "Starting services..."
    ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" "cd ${REMOTE_DIR} && docker compose down 2>/dev/null; docker compose up -d" && \
        pass "Services started" || \
        fail "docker compose up failed"

    info "Waiting for health check (30s)..."
    sleep 10
fi

# ── Phase 6: Verification ─────────────────────────────────────────────────────

info ""
info "=== Phase 6: Verification ==="

if [ "${DRY_RUN}" -eq 1 ]; then
    skip "Skipping post-deploy runtime verification checks."
else
    CONTAINER_STATUS=$(ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" "docker ps --filter name=dojolm-web --format '{{.Status}}' 2>/dev/null || echo DOWN")
    if [[ "${CONTAINER_STATUS}" == *"Up"* ]]; then
        pass "Container running: ${CONTAINER_STATUS}"
    else
        fail "Container not running: ${CONTAINER_STATUS}"
    fi

    # Verify the running container is actually serving the SHA we just built.
    # The Dockerfile bakes BUILD_SHA into LABEL org.opencontainers.image.revision,
    # so the running image label is the ground truth for what code is in the container.
    RUNNING_SHA=$(ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" \
        "docker inspect dojolm-web --format '{{index .Config.Labels \"org.opencontainers.image.revision\"}}' 2>/dev/null || echo ''")
    RUNNING_SHA="${RUNNING_SHA:-unknown}"
    if [ "${RUNNING_SHA}" = "${BUILD_SHA}" ]; then
        pass "Container image SHA matches build: ${RUNNING_SHA}"
    elif [ "${RUNNING_SHA}" = "unknown" ]; then
        warn "Container image has no revision label — cannot verify deployed SHA"
    else
        fail "Container image SHA mismatch — expected ${BUILD_SHA}, running ${RUNNING_SHA}"
    fi

    API_RESPONSE=$(ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" "curl -s -m 5 http://localhost:3001/api/health 2>/dev/null || echo FAIL")
    if [[ "${API_RESPONSE}" != "FAIL" ]] && [[ "${API_RESPONSE}" == *"{"* ]]; then
        pass "API responding on :3001"
    else
        warn "API not responding yet — check: ssh ${CHALLENGER_USER}@${CHALLENGER_IP} 'docker logs dojolm-web'"
    fi

    ERRORS=$(ssh "${CHALLENGER_USER}@${CHALLENGER_IP}" "docker logs dojolm-web 2>&1 | grep -ci 'error\|fatal\|panic'; true")
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
echo "  DojoLM Challenger DEV/QA Deployment Summary"
echo "================================================================"
echo "  PASS: ${PASS}"
echo "  FAIL: ${FAIL}"
echo "  WARN: ${WARN}"
echo ""
echo "  Container: dojolm-web"
echo "  Internal:  http://localhost:3001"
echo "  External:  http://${CHALLENGER_IP}:3001  (no TLS on DEV/QA)"
echo "  Data vol:  dojolm_data -> /app/data"
echo "================================================================"

echo "  Rollback:  ssh ${CHALLENGER_USER}@${CHALLENGER_IP} 'docker tag dojolm-web:previous dojolm-web:latest && cd ${REMOTE_DIR} && docker compose up -d'"
echo "================================================================"

if [ "${FAIL}" -gt 0 ]; then
    echo "  STATUS: INCOMPLETE — address ${FAIL} failure(s) above"
    exit 1
else
    if [ "${DRY_RUN}" -eq 1 ]; then
        echo "  STATUS: DRY-RUN OK (${BUILD_SHA})"
    else
        REPORT_SHA="${RUNNING_SHA:-${BUILD_SHA}}"
        if [ -n "${RUNNING_SHA:-}" ] && [ "${RUNNING_SHA}" != "unknown" ] && [ "${RUNNING_SHA}" != "${BUILD_SHA}" ]; then
            echo "  STATUS: DEPLOYED (running=${REPORT_SHA}, built=${BUILD_SHA}) — SHA MISMATCH"
        else
            echo "  STATUS: DEPLOYED (${REPORT_SHA})"
        fi
    fi
    exit 0
fi
