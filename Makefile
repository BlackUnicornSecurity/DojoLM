# DojoLM Deployment Makefile
#
# WORKFLOW: branch → merge to main → make push-dev → test → make push-prod
#
# Both push-dev and push-prod ALWAYS deploy from main.
# push-dev will stash your work, switch to main, deploy, then restore.
#
# Commands:
#   make push-dev      — deploy main to Challenger (DEV/QA)
#   make push-prod     — deploy main to Voyager (PROD) — prompts for confirmation
#   make push-dev-dry  — preflight checks, no deploy
#   make push-prod-dry — preflight checks, no deploy
#   make status        — health of both servers
#   make logs-dev      — tail Challenger container logs
#   make logs-prod     — tail Voyager container logs
#   make rollback-dev  — roll Challenger back to :previous image
#   make rollback-prod — roll Voyager back to :previous image
#   make add-dev-key   — authorize a new dev's SSH key on Challenger
#
# Multi-dev: any dev who has their SSH key on Challenger can run push-dev.
# To add a dev: make add-dev-key KEY=~/.ssh/id_ed25519.pub

CHALLENGER_IP   := 192.168.70.130
CHALLENGER_USER := dietpi
VOYAGER_IP      := 192.168.70.120
VOYAGER_USER    := paultinp

.PHONY: push-dev push-prod push-dev-dry push-prod-dry \
        status logs-dev logs-prod rollback-dev rollback-prod \
        add-dev-key _ensure-main

# ── Branch guard — always deploy from main ───────────────────────────────────
# Stashes uncommitted work, switches to main, pulls, runs DEPLOY_CMD, restores.

_ensure-main:
	$(eval ORIG_BRANCH := $(shell git rev-parse --abbrev-ref HEAD))
	$(eval STASHED := $(shell git diff --quiet && git diff --cached --quiet && echo no || echo yes))
	@if [ "$(STASHED)" = "yes" ]; then \
	    echo "   Stashing uncommitted changes..."; \
	    git stash push -q -m "push-dev auto-stash"; \
	fi
	@if [ "$(ORIG_BRANCH)" != "main" ]; then \
	    echo "   Switching $(ORIG_BRANCH) → main..."; \
	    git checkout -q main; \
	fi
	@git pull --ff-only -q origin main 2>/dev/null || true

_restore-branch:
	@if [ "$(ORIG_BRANCH)" != "main" ]; then \
	    echo "   Restoring $(ORIG_BRANCH)..."; \
	    git checkout -q $(ORIG_BRANCH); \
	fi
	@if [ "$(STASHED)" = "yes" ]; then \
	    echo "   Restoring stash..."; \
	    git stash pop -q; \
	fi

# ── DEV/QA ───────────────────────────────────────────────────────────────────

push-dev: _ensure-main
	@echo ""
	@echo "▶ Deploying main ($(shell git rev-parse --short HEAD)) → Challenger DEV/QA ($(CHALLENGER_IP))"
	@echo ""
	@bash deploy/deploy-challenger.sh
	@$(MAKE) -s _restore-branch

push-dev-dry:
	@echo "▶ Dry-run preflight for Challenger DEV/QA..."
	@bash deploy/deploy-challenger.sh --dry-run

logs-dev:
	@ssh $(CHALLENGER_USER)@$(CHALLENGER_IP) "sudo docker logs -f dojolm-web"

rollback-dev:
	@echo "Rolling Challenger back to :previous image..."
	@ssh $(CHALLENGER_USER)@$(CHALLENGER_IP) \
	    "sudo docker tag dojolm-web:previous dojolm-web:latest && \
	     cd /opt/dojolm && sudo docker compose up -d && \
	     echo 'Rollback complete'"

# ── PROD ─────────────────────────────────────────────────────────────────────

push-prod: _ensure-main
	@echo ""
	@echo "PRODUCTION DEPLOY — Voyager ($(VOYAGER_IP))"
	@echo "   SHA: $(shell git rev-parse --short HEAD)"
	@echo ""
	@read -p "   Type 'yes' to continue: " CONFIRM && [ "$$CONFIRM" = "yes" ] || (echo "Aborted." && $(MAKE) -s _restore-branch && exit 1)
	@bash deploy/deploy-dojo.sh
	@$(MAKE) -s _restore-branch

push-prod-dry:
	@echo "▶ Dry-run preflight for Voyager PROD..."
	@bash deploy/deploy-dojo.sh --dry-run

logs-prod:
	@ssh $(VOYAGER_USER)@$(VOYAGER_IP) "docker logs -f dojolm-web"

rollback-prod:
	@echo ""
	@echo "PRODUCTION ROLLBACK — Voyager ($(VOYAGER_IP))"
	@read -p "   Type 'yes' to continue: " CONFIRM && [ "$$CONFIRM" = "yes" ] || (echo "Aborted." && exit 1)
	@ssh $(VOYAGER_USER)@$(VOYAGER_IP) \
	    "docker tag dojolm-web:previous dojolm-web:latest && \
	     cd /opt/dojolm && docker compose up -d && \
	     echo 'Rollback complete'"

# ── ACCESS ───────────────────────────────────────────────────────────────────

# Add a dev's SSH public key to Challenger so they can push-dev.
# Usage: make add-dev-key KEY=/path/to/id_ed25519.pub
add-dev-key:
ifndef KEY
	$(error KEY is required. Usage: make add-dev-key KEY=~/.ssh/id_ed25519.pub)
endif
	@echo "Adding $(KEY) to Challenger authorized_keys..."
	@cat $(KEY) | ssh $(CHALLENGER_USER)@$(CHALLENGER_IP) \
	    "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'Key added'"

# ── HEALTH ───────────────────────────────────────────────────────────────────

status:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo "  DojoLM Server Status"
	@echo "═══════════════════════════════════════════════"
	@echo ""
	@echo "── Challenger (DEV/QA) ── $(CHALLENGER_IP)"
	@ssh -o ConnectTimeout=4 $(CHALLENGER_USER)@$(CHALLENGER_IP) \
	    "CSTATUS=\$$(sudo docker ps --filter name=dojolm-web --format '{{.Status}}' 2>/dev/null || echo DOWN); \
	     IMG=\$$(sudo docker inspect dojolm-web --format '{{index .Config.Labels \"org.opencontainers.image.revision\"}}' 2>/dev/null || echo '?'); \
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
