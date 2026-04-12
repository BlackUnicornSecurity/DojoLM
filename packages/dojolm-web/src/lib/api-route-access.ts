const PUBLIC_API_ROUTES = new Set([
  '/api/admin/health',
  '/api/health',
  '/api/auth/me',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/setup/status',
  '/api/setup/admin',
]);

// FINDING-005 fix: removed /api/compliance, /api/fixtures, /api/stats
// from public access. These endpoints have checkApiAuth() in their handlers
// but the allowlist was bypassing it, exposing data without auth.
const PUBLIC_READONLY_API_ROUTES = new Set<string>([]);

// FINDING-005 fix: removed scan/fixture browser actions from public access.
// These require authentication — browser sessions are validated via
// isTrustedBrowserSessionRequest() in api-auth.ts instead.
const PUBLIC_BROWSER_ACTION_ROUTES = new Set<string>([]);

const PUBLIC_READ_METHODS = new Set(['GET', 'HEAD']);

function normalizeMethod(method: string): string {
  return method.toUpperCase();
}

function getRouteKey(pathname: string, method: string): string {
  return `${normalizeMethod(method)} ${pathname}`;
}

export function isPublicReadApiRoute(pathname: string, method: string): boolean {
  return PUBLIC_READ_METHODS.has(normalizeMethod(method)) && PUBLIC_READONLY_API_ROUTES.has(pathname);
}

export function isPublicBrowserActionRoute(pathname: string, method: string): boolean {
  return PUBLIC_BROWSER_ACTION_ROUTES.has(getRouteKey(pathname, method));
}

export function isPublicApiRoute(pathname: string, method: string): boolean {
  return PUBLIC_API_ROUTES.has(pathname) || isPublicReadApiRoute(pathname, method);
}
