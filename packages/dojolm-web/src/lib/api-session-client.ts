// SPDX-License-Identifier: Apache-2.0
/**
 * api-session-client — client-safe constants + validators carved out of
 * `@/lib/api-session` for use inside `'use client'` modules.
 *
 * Why this file exists:
 *   `api-session.ts` itself imports `auth/session` (bcrypt) and
 *   `user-lock-fs` (`fs/promises`), both server-only. When a client
 *   component pulled `API_KEY_USER_ID` / `isSafeUserIdSegment` from
 *   `api-session.ts`, webpack tried to bundle bcrypt/fs into the
 *   client chunk and failed with "Module not found: 'fs'" /
 *   "node-gyp-build" errors during `next build`.
 *
 * This module has ZERO server imports — only string literal + regex.
 * The server-side `api-session.ts` re-exports both names so existing
 * server callers keep working.
 *
 * Story: V1→V2 W21 closeout — production deploy build fix.
 */

export const API_KEY_USER_ID = 'api-key-user';

const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isSafeUserIdSegment(id: string): boolean {
  return USER_ID_PATTERN.test(id);
}
