const PUBLIC_API_ROUTES = new Set([
  '/api/admin/health',
  '/api/health',
  '/api/auth/me',
  '/api/auth/login',
  '/api/auth/logout',
]);

const PUBLIC_READONLY_API_ROUTES = new Set([
  '/api/compliance',
  '/api/fixtures',
  '/api/stats',
]);

const PUBLIC_BROWSER_ACTION_ROUTES = new Set([
  'GET /api/read-fixture',
  'GET /api/read-fixture/media',
  'GET /api/scan-fixture',
  'POST /api/scan',
  'POST /api/scan-fixture',
]);

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
