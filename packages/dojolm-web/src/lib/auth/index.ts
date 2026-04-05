/**
 * Auth module barrel export.
 */

export {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  generateCsrfToken,
} from './auth';

export {
  createSession,
  validateSession,
  destroySession,
  cleanExpiredSessions,
  destroyUserSessions,
  type SessionUser,
} from './session';

export {
  hasPermission,
  getAllowedActions,
  isAtLeastRole,
  type Resource,
  type Action,
} from './rbac';

export {
  withAuth,
  getSessionToken,
  buildSessionCookie,
  buildCsrfCookie,
  buildLogoutCookies,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  type RouteGuardOptions,
} from './route-guard';
