# Kotoba

Kotoba is the prompt hardening workspace. Use it to review a system or role prompt against the platform's current security rubric, identify weak spots, and generate a safer prompt structure.

## What It Does

The current Kotoba surface gives you a guided prompt-review flow:

- paste a prompt into the editor
- load a built-in secure, insecure, or minimal example
- score the prompt against six categories
- review issues grouped by severity
- read the suggested fixes
- generate a hardened prompt variant

### Status (Wave 4, 2026-04-19)

The rubric engine and hardening generator are live (ADR-0017 Wave 2).
The dashboard also surfaces an optional **LLM second-opinion panel**
(ADR-0022 Wave 3 + ADR-0031 Wave 4) when the `kotoba.llm` feature flag
is configured, showing `strengths` / `risks` bullets beside the
deterministic rubric. Advisory caveat on the panel: the deterministic
rubric remains authoritative.

Current note:

- Kotoba is best understood as a structured hardening studio. It helps you review prompt structure and apply safer patterns before you move into live model testing.

## Main Areas

### Prompt Input

Use the main textarea to paste the prompt you want to review. The current UI:

- shows a character counter
- caps input at `5,000` characters
- enables `Score Prompt` once the prompt is at least `20` characters long

### Example Loader

Use `Load Example...` when you want a quick baseline or comparison sample. The current examples are:

- `Secure System Prompt`
- `Insecure System Prompt`
- `Minimal Prompt`

### Score Output

After scoring, Kotoba shows:

- an overall score out of `100`
- a letter grade
- per-category bars
- issue cards with severity, explanation, and recommended fix text

### Hardened Output

Use the hardening action after reviewing the issues. The output area gives you a rewritten prompt structure that emphasizes boundaries, role definition, safety rules, and output constraints.

### LLM Insights Panel (optional)

When operators have configured `KOTOBA_LLM_PROVIDER` / `KOTOBA_LLM_MODEL` / `KOTOBA_LLM_API_KEY` and flipped the `kotoba.llm` feature flag on, the Score response includes an additive `llmInsights` block rendered below the issues list:

- `provider · model` caption identifies which LLM produced the advisory.
- `Strengths` bullets summarise what the model considers robust.
- `Risks` bullets summarise what the model considers weak.
- Token / duration usage surfaces under the panel when present (ADR-0035 Wave 4).

The panel hides when the flag is off, the env vars are missing, or the LLM call failed silently. All bullets render as escaped text — no raw HTML sink.

### LLM call budget

Kotoba shares a per-minute rolling LLM call budget with Sengoku (ADR-0036 Wave 4). When `LLM_CALL_LIMIT_PER_MIN` is set and the budget is exhausted, the Score action still returns the deterministic rubric — only the `llmInsights` field is omitted for that call. One `LLM_BUDGET_EXCEEDED` audit entry lands per saturation event.

## Current Scoring Categories

| Category | What Kotoba Checks |
|--------|----------------|
| Boundary Definition | Whether the prompt clearly defines the system boundary and scope of authority |
| Role Clarity | Whether the assistant identity and task domain are explicit |
| Priority Ordering | Whether safety rules appear before task instructions |
| Output Constraints | Whether format, tone, and length expectations are defined |
| Defense Layers | Whether the prompt contains multiple anti-injection or refusal safeguards |
| Input Handling | Whether user input is treated as untrusted content |

## Typical Workflow

1. Paste the system or role prompt you want to review, or load one of the built-in examples.
2. Run `Score Prompt`.
3. Review the overall score, grade, and category bars.
4. Inspect the high, medium, and low severity issues.
5. Apply the suggested fixes to understand what is missing.
6. Generate the hardened output.
7. Move to [Jutsu (Model Lab)](LLM_DASHBOARD.md) when you want to test the revised prompt against actual models.

## Best Use Cases

- improving a system prompt before deployment
- comparing a weak prompt against a stronger prompt structure
- documenting why a prompt needs stronger boundaries or output controls
- preparing prompts before guarded execution or batch testing

## Related Docs

- [Jutsu (Model Lab)](LLM_DASHBOARD.md)
- [Hattori Guard](HATTORI_GUARD.md)
- [Common Workflows](../COMMON_WORKFLOWS.md)
