#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * configure.mjs — interactive CI gate configuration for DojoLM
 *
 * Wave 9.4 (ADR-0085). Prompts the operator for the current desired
 * CI quality-gate levels and writes them into `.env` at the repo root.
 *
 * Invoked by:
 *   - deploy tooling on first deploy
 *   - `node scripts/configure.mjs` standalone at any time
 *
 * Design notes:
 *   - Only writes keys documented in `docs/operator/ci-gates.md`.
 *   - Non-destructive: preserves unrelated `.env` keys; only replaces
 *     the specific gate keys.
 *   - Respects `CI=true` / `--non-interactive` — skips prompts and
 *     prints current values only.
 *   - No npm deps; pure Node stdlib (readline + fs).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const ENV_PATH = resolve(REPO_ROOT, '.env');

const GATES = [
  {
    key: 'A11Y_GATE_LEVEL',
    options: ['off', 'critical', 'serious', 'all'],
    default: 'off',
    explanation:
      'A11y gate level — how strict should accessibility checks be in CI?\n' +
      'Start with `off` (log only). Move to `serious` once your team clears\n' +
      'the first round of WCAG AA findings. Use `critical` if you only want\n' +
      'to block screen-reader blockers. `all` is maximal rigor.',
  },
];

function readEnv() {
  if (!existsSync(ENV_PATH)) return new Map();
  const text = readFileSync(ENV_PATH, 'utf8');
  const map = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

function writeEnv(map) {
  let existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';
  const managed = new Set(GATES.map((g) => g.key));
  const lines = existing.split(/\r?\n/);
  const kept = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      kept.push(raw);
      continue;
    }
    const eq = line.indexOf('=');
    const key = eq === -1 ? line : line.slice(0, eq).trim();
    if (managed.has(key)) continue;
    kept.push(raw);
  }
  // Trim trailing blank lines, then append managed section.
  while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop();
  const managedBlock = ['', '# --- Managed by scripts/configure.mjs (Wave 9.4+) ---'];
  for (const gate of GATES) {
    const value = map.get(gate.key) ?? gate.default;
    managedBlock.push(`${gate.key}=${value}`);
  }
  managedBlock.push('');
  writeFileSync(ENV_PATH, [...kept, ...managedBlock].join('\n'));
}

function isNonInteractive() {
  if (process.env.CI === 'true') return true;
  if (process.argv.includes('--non-interactive')) return true;
  if (!input.isTTY) return true;
  return false;
}

function printHeader() {
  console.log('DojoLM — CI quality-gate configuration');
  console.log('--------------------------------------');
  console.log(`Env file: ${ENV_PATH}`);
  console.log('See docs/operator/ci-gates.md for the full reference.');
  console.log('');
}

function printCurrent(map) {
  console.log('Current settings:');
  for (const gate of GATES) {
    const value = map.get(gate.key) ?? `(unset — default ${gate.default})`;
    console.log(`  ${gate.key} = ${value}`);
  }
}

async function promptGate(rl, gate, current) {
  console.log('');
  console.log(gate.explanation);
  const list = gate.options.map((o) => (o === gate.default ? `${o} [default]` : o)).join(', ');
  const hint = current ?? gate.default;
  const answer = (await rl.question(`  ${gate.key} (${list}) [${hint}]: `)).trim().toLowerCase();
  if (!answer) return hint;
  if (!gate.options.includes(answer)) {
    console.log(`  Invalid value '${answer}' — keeping '${hint}'.`);
    return hint;
  }
  return answer;
}

async function main() {
  printHeader();
  const env = readEnv();
  printCurrent(env);

  if (isNonInteractive()) {
    console.log('');
    console.log('Non-interactive mode (CI or --non-interactive) — no prompts, env unchanged.');
    return;
  }

  const rl = createInterface({ input, output });
  try {
    for (const gate of GATES) {
      const chosen = await promptGate(rl, gate, env.get(gate.key));
      env.set(gate.key, chosen);
    }
  } finally {
    rl.close();
  }

  writeEnv(env);
  console.log('');
  console.log(`Wrote ${ENV_PATH}.`);
  printCurrent(env);
  console.log('');
  console.log('Done. See docs/operator/ci-gates.md for when to ratchet up each gate.');
}

main().catch((err) => {
  console.error('configure.mjs failed:', err);
  process.exit(1);
});
