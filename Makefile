# DojoLM Deployment Makefile
# Usage:
#   make push-dev      — deploy current branch to Challenger (DEV/QA)
#   make push-prod     — deploy main branch to Voyager (PROD) — prompts for confirmation
#   make push-dev-dry  — preflight checks only, no changes to Challenger
#   make push-prod-dry — preflight checks only, no changes to Voyager
#   make status        — health check both servers
#   make logs-dev      — tail Challenger container logs
#   make logs-prod     — tail Voyager container logs
#   make rollback-dev  — roll Challenger back to :previous image
#   make rollback-prod — roll Voyager back to :previous image

CHALLENGER_IP   := 192.168.70.130
CHALLENGER_USER := dietpi
VOYAGER_IP      := 192.168.70.120
VOYAGER_USER    := paultinp

.PHONY: push-dev push-prod push-dev-dry push-prod-dry \
        status logs-dev logs-prod rollback-dev rollback-prod

# ── DEV/QA ───────────────────────────────────────────────────────────────────

push-dev:
	@echo "▶ Deploying to Challenger DEV/QA ($(CHALLENGER_IP))..."
	@bash deploy/deploy-challenger.sh

push-dev-dry:
	@echo "▶ Dry-run preflight for Challenger DEV/QA..."
	@bash deploy/deploy-challenger.sh --dry-run

logs-dev:
	@ssh $(CHALLENGER_USER)@$(CHALLENGER_IP) "docker logs -f dojolm-web"

rollback-dev:
	@echo "⚠ Rolling Challenger back to :previous image..."
	@ssh $(CHALLENGER_USER)@$(CHALLENGER_IP) \
	    "docker tag dojolm-web:previous dojolm-web:latest && \
	     cd /opt/dojolm && docker compose up -d && \
	     echo '✓ Rollback complete'"

# ── PROD ─────────────────────────────────────────────────────────────────────

push-prod:
	@echo ""
	@echo "⚠  PRODUCTION DEPLOY — Voyager ($(VOYAGER_IP))"
	@echo "   Branch: $$(git rev-parse --abbrev-ref HEAD)  SHA: $$(git rev-parse --short HEAD)"
	@echo ""
	@read -p "   Type 'yes' to continue: " CONFIRM && [ "$$CONFIRM" = "yes" ] || (echo "Aborted." && exit 1)
	@bash deploy/deploy-dojo.sh

push-prod-dry:
	@echo "▶ Dry-run preflight for Voyager PROD..."
	@bash deploy/deploy-dojo.sh --dry-run

logs-prod:
	@ssh $(VOYAGER_USER)@$(VOYAGER_IP) "docker logs -f dojolm-web"

rollback-prod:
	@echo ""
	@echo "⚠  PRODUCTION ROLLBACK — Voyager ($(VOYAGER_IP))"
	@read -p "   Type 'yes' to continue: " CONFIRM && [ "$$CONFIRM" = "yes" ] || (echo "Aborted." && exit 1)
	@ssh $(VOYAGER_USER)@$(VOYAGER_IP) \
	    "docker tag dojolm-web:previous dojolm-web:latest && \
	     cd /opt/dojolm && docker compose up -d && \
	     echo '✓ Rollback complete'"

# ── HEALTH ───────────────────────────────────────────────────────────────────

status:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  DojoLM Server Status"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@echo "── Challenger (DEV/QA) ── $(CHALLENGER_IP)"
	@ssh -o ConnectTimeout=4 $(CHALLENGER_USER)@$(CHALLENGER_IP) \
	    "CSTATUS=\$$(docker ps --filter name=dojolm-web --format '{{.Status}}' 2>/dev/null || echo DOWN); \
	     IMG=\$$(docker inspect dojolm-web --format '{{index .Config.Labels \"org.opencontainers.image.revision\"}}' 2>/dev/null || echo '?'); \
	     API=\$$(curl -s -m 3 http://localhost:3001/api/health 2>/dev/null | grep -o '\"status\":\"[^\"]*\"' | head -1 || echo 'no response'); \
	     echo \"   Container : \$$CSTATUS\"; echo \"   SHA       : \$$IMG\"; echo \"   Health    : \$$API\"" \
	    2>/dev/null || echo "   UNREACHABLE"
	@echo ""
	@echo "── Voyager (PROD) ──────── $(VOYAGER_IP)"
	@ssh -o ConnectTimeout=4 $(VOYAGER_USER)@$(VOYAGER_IP) \
	    "VSTATUS=\$$(docker ps --filter name=dojolm-web --format '{{.Status}}' 2>/dev/null || echo DOWN); \
	     IMG=\$$(docker inspect dojolm-web --format '{{index .Config.Labels \"org.opencontainers.image.revision\"}}' 2>/dev/null || echo '?'); \
	     API=\$$(curl -s -m 3 http://localhost:3001/api/health 2>/dev/null | grep -o '\"status\":\"[^\"]*\"' | head -1 || echo 'no response'); \
	     echo \"   Container : \$$VSTATUS\"; echo \"   SHA       : \$$IMG\"; echo \"   Health    : \$$API\"" \
	    2>/dev/null || echo "   UNREACHABLE"
	@echo ""
	@echo "═══════════════════════════════════════════════"
