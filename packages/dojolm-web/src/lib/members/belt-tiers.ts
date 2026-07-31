// SPDX-License-Identifier: Apache-2.0
/**
 * File: belt-tiers.ts
 * Purpose: Client-safe export of `BELT_TIERS` + `Belt` type. Mirrors the
 * runtime constant defined authoritatively in `belt-ledger-source.ts`,
 * but carries NO transitive import of `belt-ledger-worm.ts` (which uses
 * `node:crypto` and is unbundlable in client chunks).
 *
 * Client components (e.g. `app/(shell)/members/bounty/BountyClient.tsx`)
 * MUST import `BELT_TIERS` from here, not from `belt-ledger-source`.
 */

import type { Belt } from '@/design/arena/BeltDisc';

export const BELT_TIERS: readonly Belt[] = Object.freeze([
  'white',
  'yellow',
  'orange',
  'green',
  'blue',
  'purple',
  'brown',
  'red',
  'black',
] as const) satisfies readonly Belt[];

export type { Belt };
