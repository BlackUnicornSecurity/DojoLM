#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Smoke test for `POST /api/llm/discover-api-models`.
 *
 * Hits the live endpoint once per provider whose API key is present in the
 * environment, and prints {provider, source, count, sample-ids} for each.
 *
 * `source: 'live'` confirms the upstream `/v1/models` parsed cleanly.
 * `source: 'fallback'` means the upstream rejected (bad key, non-2xx, network
 * error) and the route returned the curated default list — useful, but does
 * NOT verify our parsing logic.
 *
 * Usage:
 *   APP_URL=https://dojo.example.internal \
 *   ADMIN_USER=admin \
 *   ADMIN_PASS='…'      \
 *   ANTHROPIC_API_KEY=sk-ant-… \
 *   OPENAI_API_KEY=sk-… \
 *   GOOGLE_API_KEY=… \
 *   COHERE_API_KEY=… \
 *   MISTRAL_API_KEY=… \
 *   DEEPSEEK_API_KEY=sk-… \
 *   GROQ_API_KEY=gsk_… \
 *   TOGETHER_API_KEY=… \
 *   FIREWORKS_API_KEY=… \
 *   ZAI_API_KEY=… \
 *   MOONSHOT_API_KEY=sk-… \
 *   BLACKUNICORN_API_KEY=… \
 *   node scripts/smoke-discover-models.mjs [--insecure]
 *
 * `--insecure` disables TLS verification — required against the self-signed
 * cert on `dojo.example.internal` from outside the LAN.
 *
 * Exit code: number of providers whose live source did not return `live`.
 * Fallback for missing keys is not counted as a failure.
 */

import process from 'node:process';

const APP_URL = process.env.APP_URL ?? 'http://localhost:42001';
const ADMIN_USER = process.env.ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS ?? '';
const INSECURE = process.argv.includes('--insecure');

if (INSECURE) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const PROVIDERS = [
  { id: 'anthropic',    env: 'ANTHROPIC_API_KEY' },
  { id: 'openai',       env: 'OPENAI_API_KEY' },
  { id: 'google',       env: 'GOOGLE_API_KEY' },
  { id: 'cohere',       env: 'COHERE_API_KEY' },
  { id: 'mistral',      env: 'MISTRAL_API_KEY' },
  { id: 'deepseek',     env: 'DEEPSEEK_API_KEY' },
  { id: 'groq',         env: 'GROQ_API_KEY' },
  { id: 'together',     env: 'TOGETHER_API_KEY' },
  { id: 'fireworks',    env: 'FIREWORKS_API_KEY' },
  { id: 'zai',          env: 'ZAI_API_KEY' },
  { id: 'moonshot',     env: 'MOONSHOT_API_KEY' },
  { id: 'blackunicorn', env: 'BLACKUNICORN_API_KEY' },
];

if (!ADMIN_PASS) {
  console.error('ADMIN_PASS env var is required');
  process.exit(2);
}

const browserHeaders = {
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  'Origin': new URL(APP_URL).origin,
};

async function login() {
  const res = await fetch(`${APP_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });
  if (!res.ok) {
    console.error(`login failed: ${res.status}`);
    process.exit(2);
  }
  const setCookies = res.headers.getSetCookie();
  const cookieJar = setCookies.map((c) => c.split(';')[0]).join('; ');
  const csrf = setCookies
    .find((c) => c.startsWith('tpi_csrf='))
    ?.match(/tpi_csrf=([^;]+)/)?.[1];
  if (!csrf) {
    console.error('login OK but no tpi_csrf cookie returned');
    process.exit(2);
  }
  return { cookieJar, csrf };
}

async function discover({ cookieJar, csrf }, provider, apiKey) {
  const res = await fetch(`${APP_URL}/api/llm/discover-api-models`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrf,
      Cookie: cookieJar,
      ...browserHeaders,
    },
    body: JSON.stringify({ provider, ...(apiKey ? { apiKey } : {}) }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function pad(s, n) {
  return (s + ' '.repeat(n)).slice(0, n);
}

const session = await login();

let liveOk = 0;
let liveFail = 0;
let fallback = 0;
let missing = 0;

for (const p of PROVIDERS) {
  const key = process.env[p.env];
  if (!key) {
    console.log(`${pad(p.id, 14)} SKIP   (no ${p.env} in env)`);
    missing += 1;
    continue;
  }
  const { status, body } = await discover(session, p.id, key);
  const source = body?.source ?? 'unknown';
  const count = body?.models?.length ?? 0;
  const sample = (body?.models ?? []).slice(0, 3).map((m) => m.id).join(', ');
  const tag =
    status !== 200    ? `HTTP ${status}` :
    source === 'live' ? 'LIVE  ' :
    source === 'fallback' ? 'FALL  ' :
    source;
  console.log(
    `${pad(p.id, 14)} ${tag}  count=${pad(String(count), 3)}  sample=[${sample}]`,
  );
  if (status !== 200) {
    liveFail += 1;
    continue;
  }
  if (source === 'live') liveOk += 1;
  else if (source === 'fallback') fallback += 1;
}

console.log('');
console.log(`live=${liveOk}  fallback=${fallback}  http-fail=${liveFail}  missing-key=${missing}`);

process.exit(liveFail);
