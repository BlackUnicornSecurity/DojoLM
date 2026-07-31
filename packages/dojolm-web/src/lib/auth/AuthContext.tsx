// SPDX-License-Identifier: Apache-2.0
/**
 * File: AuthContext.tsx
 * Purpose: Client-side auth state management — provides useAuth() hook
 * Story: S106 (Auth UI Login)
 * Index: AuthUser · AuthContextValue · AuthProvider · useAuth
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { serverCodeFromStatus, type ServerCode } from "@/lib/error-copy";
import { resetSessionExpiredSignal } from "@/lib/fetch-with-auth";
import { readCsrfToken } from "@/lib/csrf-cookie";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
type E2ECaptureGlobal = typeof globalThis & {
  __DOJOLM_E2E_SIGNED_OUT__?: boolean;
};

function isE2ESignedOutCapture(): boolean {
  return (
    DEMO_MODE &&
    process.env.NEXT_PUBLIC_E2E === "1" &&
    (globalThis as E2ECaptureGlobal).__DOJOLM_E2E_SIGNED_OUT__ === true
  );
}

const DEMO_AUTH_USER: AuthUser = {
  id: "demo-admin-001",
  username: "demo-admin",
  email: "admin@demo.dojolm.example",
  role: "admin",
  displayName: "Demo Admin",
};

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName: string | null;
}

/**
 * E6.S8 (retires F-6-007 P0): the login result now carries a closed
 * `code: ServerCode` discriminator alongside the legacy `error` string.
 * The login page consumes ONLY `code` to look up canonical banner copy
 * from `ERROR_BANNERS`; `error` is preserved for back-compat with
 * existing tests + callers (e.g. members) but is NEVER reflected to the
 * DOM. New callers should consume `code` exclusively.
 */
export interface AuthContextValue {
  user: AuthUser | null;
  /**
   * F-8-008 (Wave 3hh) — ISO-8601 expiry of the active session, or
   * null when no session is active / running in demo mode. Used by
   * the proactive expiring-soon banner (`useSessionExpiryWarning`)
   * to surface a heads-up 5-10 min before the cookie dies — distinct
   * from the after-the-fact `SessionExpiredCard` takeover.
   */
  expiresAt: string | null;
  loading: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{
    readonly success: boolean;
    readonly code?: ServerCode;
    readonly error?: string;
  }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // E2E-only visual evidence hook. Demo builds normally inject an admin
    // immediately, which makes the real signed-out entry surface impossible
    // to observe. The capture runner sets this in an isolated public context;
    // only an E2E demo build can activate it.
    if (isE2ESignedOutCapture()) {
      setUser(null);
      setExpiresAt(null);
      setLoading(false);
      return;
    }
    // Demo mode: immediately set demo user without server call
    if (DEMO_MODE) {
      setUser(DEMO_AUTH_USER);
      setExpiresAt(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
        setExpiresAt(
          typeof data.expiresAt === "string" ? data.expiresAt : null,
        );
      } else {
        setUser(null);
        setExpiresAt(null);
      }
    } catch {
      setUser(null);
      setExpiresAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    // Demo mode: always succeed
    if (DEMO_MODE) {
      setUser(DEMO_AUTH_USER);
      // E9.S3 (F-7-006) — re-arm the once-per-session 401 dedupe in
      // fetch-with-auth so a future cookie-expired event surfaces a
      // fresh takeover instead of being swallowed by the previous
      // module-level flag.
      resetSessionExpiredSignal();
      return { success: true };
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // F-8-008 — refresh the expiresAt anchor from /api/auth/me
        // immediately after login so the expiring-soon banner has the
        // correct timer baseline (login route returns the user but not
        // the expiry — we hop one /me call to keep the surface simple).
        try {
          const meRes = await fetch("/api/auth/me", {
            credentials: "same-origin",
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            setExpiresAt(
              typeof meData.expiresAt === "string" ? meData.expiresAt : null,
            );
          }
        } catch {
          /* leave expiresAt as-is; banner stays muted until next refresh */
        }
        // E9.S3 (F-7-006) — re-arm the once-per-session 401 dedupe.
        resetSessionExpiredSignal();
        return { success: true };
      }

      // E6.S8 — derive a closed ServerCode from status. 401 maps to
      // 'forbidden' by default in the shared mapper, but a login 401
      // is semantically invalid-credentials (not "you lack permission"),
      // so we override here with the surface-specific meaning. The 429
      // branch maps to 'too-many-attempts' likewise. Server-supplied
      // `body.error` is captured for back-compat callers but is NEVER
      // reflected to the DOM — the login page reads `code` exclusively.
      const data = await res.json().catch(() => ({ error: "Login failed" }));
      let code: ServerCode = serverCodeFromStatus(res.status);
      if (res.status === 401) code = "invalid-credentials";
      else if (res.status === 429) code = "too-many-attempts";
      return {
        success: false,
        code,
        error: typeof data?.error === "string" ? data.error : "Login failed",
      };
    } catch {
      return {
        success: false,
        code: "network" as const,
        error: "Network error",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // F-QA-025: send the CSRF double-submit header so the server actually
      // destroys the session row. Logout takes no body, so no Content-Type.
      const csrf = readCsrfToken();
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: csrf ? { "x-csrf-token": csrf } : {},
      });
    } finally {
      setUser(null);
      setExpiresAt(null);
      // E9.S3 (F-7-006) — re-arm the once-per-session 401 dedupe so a
      // future re-auth + cookie-expired sequence surfaces the takeover
      // again instead of being swallowed by the prior module flag.
      resetSessionExpiredSignal();
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{ user, expiresAt, loading, login, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
