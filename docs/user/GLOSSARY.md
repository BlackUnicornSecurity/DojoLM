# Glossary

## Admin

The operational settings module for users, keys, validation, exports, health, and scanner-related configuration.

## Adversarial Lab

The adversarial testing dashboard for MCP and tool-integration attack simulation. Think of it as the platform's adversarial testing workspace. Previously called "Atemi Lab".

## Amaterasu DNA

A first-class module for attack lineage, clustering, and mutation analysis. Previously a subsystem inside the retired "The Kumite" hub.

## Arena

A first-class module for model-vs-model matchups. Previously a subsystem inside the retired "The Kumite" hub.

## Armory

Retired module — see **Buki (Payload Lab)**. Filename `modules/ARMORY.md` now redirects.

## Atemi Lab

Retired module — see **Adversarial Lab**. Filename `modules/ATEMI_LAB.md` kept for back-compat.

## Buki (Payload Lab)

The fixture and payload library used for browsing, previewing, comparing, and sending known inputs into scans. The Generator tab hosts SAGE. Previously called "Armory".

## Bushido Book

The user-facing compliance module. It covers framework summaries, gaps, evidence, checklists, and framework-scoped compliance views.
If you are looking for "compliance," this is the module you want.

## Calibration

In the Admin validation workflow, calibration is the baseline-refresh process for validation modules. A module is considered current only when its stored calibration is recent enough and still matches the active tool hash.

## Dashboard

The default landing page with widgets, quick launch, health, and cross-module overview cards.

## Fixture

A stored test artifact in the repository, usually under `packages/bu-tpi/fixtures`, used for repeatable scanning and model testing.

## Guard

Short for [Hattori Guard](modules/HATTORI_GUARD.md), the input/output protection layer around LLM execution.

## Haiku Scanner

The direct prompt and extracted-text scanner in the web app.

## Hattori Guard

The LLM input/output guard with modes, thresholds, and an audit trail.

## Holdout Set

A reserved evaluation slice used by the Admin validation workflow to sanity-check generalization without recalibrating the active module baselines.

## Jutsu (Model Lab)

The main model testing module. It includes model management, execution, results, leaderboard, compare, custom models, and a Jutsu benchmark tab. Previously called "LLM Dashboard".

## Kagami

A first-class module for mirror-testing model behavior and consistency drift. Previously a subsystem inside the retired "The Kumite" hub.

## Kotoba

The prompt hardening workspace for scoring and improving system or role prompts before live model testing. Score + harden are currently preview — see ADR-0010.

## LLM Dashboard

Retired name — see **Jutsu (Model Lab)**. Filename `modules/LLM_DASHBOARD.md` now redirects.

## MCP

Model Context Protocol. In this repository it mainly appears in [Adversarial Lab](modules/ATEMI_LAB.md) and related tool-integration testing.

## Mitsuke

A first-class module focused on threat intelligence feeds, classification, and alerting. Previously a subsystem inside the retired "The Kumite" hub.

## Non-Conformity

In validation reports, a non-conformity is a false positive or false negative found during a run. The Admin results workspace exposes these in the `Non-Conformity Register`.

## Ronin Hub

The bug bounty research and submissions module. Use it for program tracking, subscriptions, and submission management.

## SAGE

The Synthetic Attack Generator Engine. Now lives inside [Buki (Payload Lab)](modules/ARMORY.md) → Generator tab (see ADR-0007, ADR-0008). Previously inside "The Kumite".

## Sengoku

The continuous red teaming module for campaigns and temporal testing. Hosts the former "Time Chamber" as its Temporal tab.

## Shingan

Deeper prompt-injection, trust-boundary, and supply-chain scanning. Now lives inside [Haiku Scanner](modules/HAIKU_SCANNER.md) → Deep Scan. Previously a subsystem inside "The Kumite".

## Standalone Scanner

The GET-only scanner server running on port `8089`, separate from the web app.

## The Kumite

Retired hub — its strategic-analysis subsystems are now first-class modules (`Mitsuke`, `Amaterasu DNA`, `Kagami`, `Arena`). SAGE moved inside Buki; Shingan moved inside Haiku Scanner. See the [retirement notice](modules/THE_KUMITE.md).

## Time Chamber

A legacy name. Current references map to [Sengoku](modules/SENGOKU.md), especially the `Temporal` experience.

## Traceability Chain

The expandable metadata section in an Admin validation report that links the run to its corpus version, tool version, report ID, generated timestamp, environment details, and optional digital signature.

## TPI

Threat Prompt Injection. The scanner and compliance material use this term for the threat domain and taxonomy.

## Validation Run

An Admin workflow that records module-scope selection, progress, non-conformities, and report evidence for a verification pass.
