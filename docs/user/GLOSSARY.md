# Glossary

## Admin

The operational settings module for users, keys, validation, exports, health, and scanner-related configuration.

## Amaterasu DNA

A subsystem inside [The Kumite](modules/THE_KUMITE.md) for attack lineage, clustering, and mutation analysis.

## Armory

The fixture and payload library used for browsing, previewing, comparing, and sending known inputs into scans.

## Atemi Lab

The adversarial testing dashboard for MCP and tool-integration attack simulation. Think of it as the platform's adversarial testing workspace.

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

## HAKONE

A historical planning label. It is not a current top-level module name.

## Haiku Scanner

The direct prompt and extracted-text scanner in the web app.

## Hattori Guard

The LLM input/output guard with modes, thresholds, and an audit trail.

## Holdout Set

A reserved evaluation slice used by the Admin validation workflow to sanity-check generalization without recalibrating the active module baselines.

## Jutsu

A tab inside [LLM Dashboard](modules/LLM_DASHBOARD.md). It is not a separate top-level module.

## Kagami

A Kumite subsystem for mirror-testing model behavior and consistency drift.

## Kotoba

The prompt hardening workspace for scoring and improving system or role prompts before live model testing.

## LLM Dashboard

The main model testing module. It includes model management, execution, results, leaderboard, compare, custom models, and Jutsu.

## MCP

Model Context Protocol. In this repository it mainly appears in [Atemi Lab](modules/ATEMI_LAB.md) and related tool-integration testing.

## Mitsuke

A Kumite subsystem focused on threat intelligence feeds, classification, and alerting.

## Non-Conformity

In validation reports, a non-conformity is a false positive or false negative found during a run. The Admin results workspace exposes these in the `Non-Conformity Register`.

## NODA

A legacy project name still visible in historical code comments, data names, and archived documentation. It is not the current user-facing product name.

## Ronin Hub

The bug bounty research and submissions module. Use it for program tracking, subscriptions, and submission management.

## SAGE

The Synthetic Attack Generator Engine inside [The Kumite](modules/THE_KUMITE.md).

## Sengoku

The continuous red teaming module for campaigns and temporal testing.

## Shingan

A Kumite subsystem for deeper prompt-injection, trust-boundary, and supply-chain scanning.

## Standalone Scanner

The GET-only scanner server running on port `8089`, separate from the web app.

## The Kumite

The strategic analysis hub that contains SAGE, Battle Arena, Mitsuke, Amaterasu DNA, Kagami, and Shingan.
If a teammate says "strategic hub," they mean The Kumite.

## Time Chamber

A legacy name. Current references map to [Sengoku](modules/SENGOKU.md), especially the `Temporal` experience.

## Traceability Chain

The expandable metadata section in an Admin validation report that links the run to its corpus version, tool version, report ID, generated timestamp, environment details, and optional digital signature.

## TPI

Threat Prompt Injection. The scanner and compliance material use this term for the threat domain and taxonomy.

## Validation Run

An Admin workflow that records module-scope selection, progress, non-conformities, and report evidence for a verification pass.
