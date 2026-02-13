#!/usr/bin/env tsx
/**
 * TPI Security Test Lab — Fixture Generator (TypeScript)
 *
 * Generates binary and text attack artifacts for testing TPI detection vectors.
 * Each fixture targets a specific TPI story and CrowdStrike taxonomy category.
 *
 * Categories:
 *   images        — TPI-18/19/20: JPEG EXIF, PNG tEXt, SVG injection
 *   audio         — TPI-20: MP3 ID3, WAV RIFF, OGG Vorbis
 *   web           — TPI-02/05: HTML injection vectors
 *   context       — TPI-04/PRE-4: Config/memory/settings injection
 *   malformed     — TPI-19: Polyglot and format mismatch
 *   encoded       — TPI-10/11/13/17: Encoding and evasion attacks
 *   agent-output  — TPI-03: Agent-to-agent output injection
 *   search-results— TPI-05: WebSearch result poisoning
 *   social        — TPI-06/07/08: Social engineering and manipulation
 *   code          — TPI-09: Code-format injection
 *   boundary      — TPI-14: Control tokens and system boundary attacks
 *   untrusted-sources — TPI-21: Untrusted source indicators
 *   cognitive     — TPI-06/07/08: Cognitive control bypass (persona, hypothetical, fiction, roleplay, etc.)
 *
 * Usage: npx tsx src/generate-fixtures.ts
 */
export {};
