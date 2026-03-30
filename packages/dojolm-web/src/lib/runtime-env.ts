export const PUBLIC_RUNTIME_ENV_KEYS = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_MAX_TEXT_LENGTH',
  'NEXT_PUBLIC_ENABLE_ANALYTICS',
  'NEXT_PUBLIC_ENABLE_ERROR_REPORTING',
] as const;

export type PublicRuntimeEnvKey = typeof PUBLIC_RUNTIME_ENV_KEYS[number];
export type PublicRuntimeEnv = Partial<Record<PublicRuntimeEnvKey, string>>;

declare global {
  interface Window {
    __NODA_RUNTIME_ENV?: PublicRuntimeEnv;
  }
}

export function getPublicRuntimeEnv(): PublicRuntimeEnv {
  return PUBLIC_RUNTIME_ENV_KEYS.reduce<PublicRuntimeEnv>((env, key) => {
    const value = process.env[key]?.trim();
    if (value) {
      env[key] = value;
    }
    return env;
  }, {});
}

export function serializePublicRuntimeEnvScript(): string {
  return `window.__NODA_RUNTIME_ENV=${JSON.stringify(getPublicRuntimeEnv())
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')};`;
}

export function getClientRuntimeEnv(key: PublicRuntimeEnvKey): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.__NODA_RUNTIME_ENV?.[key];
}
