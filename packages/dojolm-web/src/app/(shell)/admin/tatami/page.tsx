// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/tatami — Tatami evidence workspace (OSS, Epic 1 surface).
 *
 * Thin `'use client'` shell: a Suspense boundary (TatamiClient reads
 * `useSearchParams` for the `?tab=` URL state, which Next requires to be
 * wrapped) over the GenericModuleSkeleton fallback. All behavior lives in
 * <TatamiClient/>. Edge middleware (`/admin/*` → `requiredRole: 'admin'`)
 * plus the per-route `executions` RBAC gate are the real boundaries: only
 * admins reach this surface, so the client renders its write affordances
 * unconditionally (see TatamiClient for the RBAC rationale).
 */

'use client';

import { Suspense } from 'react';
import { GenericModuleSkeleton } from '@/design/skeletons/GenericModuleSkeleton';
import { TatamiClient } from './TatamiClient';

export default function AdminTatamiPage() {
  return (
    <Suspense fallback={<GenericModuleSkeleton ariaLabel="Loading Tatami" />}>
      <TatamiClient />
    </Suspense>
  );
}
