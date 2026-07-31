// SPDX-License-Identifier: Apache-2.0
// Admin design-system primitives — TICKET-A403 (V1→V2 Restoration
// Phase D). Pure presentational components for the `/admin` landing
// index page. Each primitive accepts a closed-enum input shape and
// renders through closed maps for R-T1 compliance.
export {
  PlatformInfoCard,
  type PlatformInfo,
  type PlatformInfoCardProps,
  type Environment,
  type Theme,
  type SystemStatus,
} from './PlatformInfoCard';

export {
  AdminLandingNav,
  ADMIN_ROUTE_CATALOG,
  ADMIN_PAGE_IDS,
  ADMIN_PAGE_META,
  findAdminRouteOrphans,
  type AdminLandingNavProps,
  type AdminPageId,
  type AdminRouteEntry,
} from './AdminLandingNav';
