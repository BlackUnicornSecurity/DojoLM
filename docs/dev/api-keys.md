# API keys — secret-managed storage

> **Status (2026-06-16): scaffolding only.** This document defines the at-rest storage convention + provider/model selection for the real-measurement harness (RB-2). **No keys are provisioned and no spend is authorized yet** — both await maintainer sign-off. Provider model ids below were refreshed from the late-2024 defaults to the current frontier.

## Why

DojoLM needs API access to ≥3 commercial models (Anthropic + OpenAI + 1 open-weight provider) to execute the real-measurement harness ("wire one real measurement end-to-end" via Promptfoo or Garak) — populating bypass-matrix cells with real Wilson confidence intervals against real frontier models.

## Where keys live

- **NEVER** committed to the repo. Pre-commit `gitleaks` workflow + `.gitignore` prevent.
- **Local dev:** `.env` file at repo root (gitignored). Format:

  ```
  ANTHROPIC_API_KEY=sk-ant-...
  OPENAI_API_KEY=sk-...
  DEEPSEEK_API_KEY=...        # or TOGETHER_API_KEY=... / MISTRAL_API_KEY=... / REPLICATE_API_TOKEN=...
  ```

- **Production:** `/opt/dojolm/.env` on the deploy host (file-permission 0o600, owned by the dojolm user). Provisioned by the operator's deploy tooling; secrets in production differ from dev.

## How to provision

1. Sign up at https://console.anthropic.com (Anthropic).
2. Sign up at https://platform.openai.com (OpenAI).
3. Pick ONE open-weight provider:
   - DeepSeek (https://platform.deepseek.com) — current open-weight frontier family (independently evaluated by NIST CAISI, May 2026)
   - Together.ai (https://api.together.xyz) — broad open-weight inventory incl. Llama + DeepSeek + Mistral
   - Mistral La Plateforme (https://console.mistral.ai) — Mistral Large
   - Replicate (https://replicate.com) — model-by-model pricing
4. Generate API key at each provider's console.
5. Save to `.env` (local dev) with the variable names above.
6. Verify keys work via a quick curl to each provider's models endpoint.
7. Log the spend ceiling + the pinned model ids in the API-spend ledger.

## Model selection (current frontier)

Hardcoded snapshot ids go stale fast — a frontier adversarial-eval seed must run against each provider's **current** frontier model or it undercuts its own credibility. This guide names the provider + the model *tier* to target, never a frozen id; resolve the exact dated id at the provider console at run time.

**Reproducibility rule:** always **pin the exact dated/versioned model id at run time** (not a `-latest` alias) and record it in the spend ledger alongside the run, so a leaderboard cell is reproducible. The families below name the current flagship tier; resolve the exact id at the provider console at run time.

### Anthropic

- API key: starts `sk-ant-api03-...`
- Models: the **current flagship tier** for the strongest target + the **cost-balanced tier** for higher-volume judging. Resolve the exact dated id at console.anthropic.com at run time and pin it in the ledger.
- Billing: pay-as-you-go; usage dashboard at console.

### OpenAI

- API key: starts `sk-proj-...` or `sk-...`.
- Model: use the **current flagship** listed at platform.openai.com at run time — do not hardcode an older id. Pin the exact dated id you actually call into the ledger.
- Billing: prepaid credits OR pay-as-you-go.

### Open-weight provider (pick one)

- **DeepSeek** (recommended) — its current open-weight frontier model carries third-party evaluation (a NIST CAISI assessment), which gives the leaderboard cell external validity. Via the DeepSeek API or Together.ai. Resolve + pin the exact id at run time.
- **Mistral** — via Mistral La Plateforme; resolve + pin the current dated id at run time.
- **Llama (current generation)** — via Together.ai; cheap + fast.

## Spend ceiling

Month-1 ceiling: **€100-200** for an OWASP LLM01 probe set against 3 models × ~30 prompts × a judge model = ~€20-100 typical.

If a probe-set run threatens to exceed, pause + escalate. Treat over-spend as a scope signal. Track every run in the API-spend ledger (`team/QA/stage-1-api-spend.md`, private).

## Rotation policy

- Quarterly key rotation. Calendar reminder.
- On any suspected leak: rotate within 24h.
- Rotation log in the API-spend ledger.

## Future (SaaS)

When the SaaS commercial product ships, the customer-side BYO-API-key model takes over (DojoLM does NOT hold customer model keys; the customer configures their own gateway endpoint).
