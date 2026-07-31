// SPDX-License-Identifier: Apache-2.0
/**
 * Edition gate (F-QA-020).
 *
 * A few admin-shell surfaces poll governance / Enterprise-licensed endpoints —
 * notably the kill-switch status badge + banner, which poll
 * `GET /api/admin/kill-switch/status`. On a community / OSS instance that
 * governance surface is not part of the shipped feature set, so the preload
 * only produces 401 console noise on every admin page.
 *
 * `isEnterpriseEdition()` lets the CLIENT simply SUPPRESS those optional
 * preloads on non-Enterprise instances. It removes no route and relicenses
 * nothing — the endpoints stay exactly as-is; only the optional client-side
 * polling is gated. This file ships in the OSS build (Apache); it is a single
 * boolean env read and adds NO Enterprise client code.
 *
 * `NEXT_PUBLIC_ENTERPRISE_EDITION` is build-baked (NEXT_PUBLIC_*), so the gate
 * resolves with no round-trip and is SSR-safe. Default: `false` (community /
 * OSS) — the conservative default keeps OSS consoles quiet. Enterprise /
 * governance deploys set `NEXT_PUBLIC_ENTERPRISE_EDITION=true` to keep the
 * governance preloads.
 */
export function isEnterpriseEdition(): boolean {
  // Guard the `process` lookup for non-Node/SSR contexts. Next.js exposes
  // NEXT_PUBLIC_* on both server and client.
  if (typeof process === 'undefined' || process.env === undefined) return false;
  return process.env.NEXT_PUBLIC_ENTERPRISE_EDITION === 'true';
}
