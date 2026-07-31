// SPDX-License-Identifier: Apache-2.0
export const PUBLIC_RUNTIME_ENV_KEYS = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_MAX_TEXT_LENGTH',
  'NEXT_PUBLIC_ENABLE_ANALYTICS',
  'NEXT_PUBLIC_ENABLE_ERROR_REPORTING',
  // E6.S4 — runtime environment + build-SHA for the TopBar EnvChip.
  // Both are also inlined at build time via `next.config.ts`; the
  // runtime-env serializer pushes them into `window.__DOJOLM_RUNTIME_ENV`
  // so client components that mount after the initial bundle hydrate
  // (e.g. lazy-loaded admin panels) can still read them.
  //
  // E8.S2 (F-9-004 retired V1 brand) — renamed from the deprecated
  // identifier to `__DOJOLM_RUNTIME_ENV`. A deprecation alias on the
  // legacy identifier is preserved for one release cycle so any client
  // component that has not yet been redeployed can still read the
  // value; the alias logs a single console warning on first read.
  'NEXT_PUBLIC_APP_ENV',
  'NEXT_PUBLIC_GIT_SHA',
] as const;

export type PublicRuntimeEnvKey = typeof PUBLIC_RUNTIME_ENV_KEYS[number];
export type PublicRuntimeEnv = Partial<Record<PublicRuntimeEnvKey, string>>;

declare global {
  interface Window {
    __DOJOLM_RUNTIME_ENV?: PublicRuntimeEnv;
    /**
     * @deprecated E8.S2 (F-9-004) — retired V1 brand. Deprecation alias.
     * Use `window.__DOJOLM_RUNTIME_ENV` instead. This alias is preserved
     * for one release cycle and emits a console warning on first read.
     */
    __NODA_RUNTIME_ENV?: PublicRuntimeEnv; // deprecated alias
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
  // E8.S2 — emit `__DOJOLM_RUNTIME_ENV` as the canonical global, and
  // install a one-cycle deprecation alias on `__NODA_RUNTIME_ENV` that
  // warns once on first read. The alias is defined via a getter so
  // legacy callsites still resolve while we migrate; new code should
  // read `__DOJOLM_RUNTIME_ENV` directly.
  const payload = JSON.stringify(getPublicRuntimeEnv())
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return (
    `window.__DOJOLM_RUNTIME_ENV=${payload};` +
    `(function(){var w=false;Object.defineProperty(window,'__NODA_RUNTIME_ENV',{configurable:true,get:function(){if(!w){w=true;try{console.warn('[DEPRECATED] window.__NODA_RUNTIME_ENV is deprecated; use window.__DOJOLM_RUNTIME_ENV (E8.S2/F-9-004).');}catch(e){}}return window.__DOJOLM_RUNTIME_ENV;}});})();`
  );
}

export function getClientRuntimeEnv(key: PublicRuntimeEnvKey): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.__DOJOLM_RUNTIME_ENV?.[key];
}
