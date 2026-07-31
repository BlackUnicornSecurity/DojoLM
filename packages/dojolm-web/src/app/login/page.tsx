// SPDX-License-Identifier: Apache-2.0
/**
 * File: /app/login/page.tsx
 * Purpose: Login page with credentials form.
 * Story: S106 (Auth UI Login) · Epic 7 S7.1 (chrome restyle).
 *
 * Epic 7 S7.1 · Edge-state matrix:
 *   loading    → <div data-testid="auth-loading"> full-screen spinner
 *   setup      → router.replace('/setup') when /api/setup/status returns needsSetup
 *   error      → <SystemBanner tone="danger" testId="login-error"> above form
 *   submitting → submit button disabled + label flips to "Signing in…"
 *   populated  → credentials form
 */

"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { LegalFooter, SystemBanner, RequiredAsterisk } from "@/design";
import {
  ERROR_BANNERS,
  type BannerCopy,
  type ServerCode,
} from "@/lib/error-copy";
import { fetchSetupStatus } from "@/lib/setup-status-cache";
import { sanitizeReturnTo } from "@/lib/safe-redirect";

// E6.S8 (retires F-6-007 P0): the AuthContext.login() return shape carries
// a closed `code` enum (or `undefined` for the legacy network-fail path);
// we map that to a fixed banner from the canonical map. The previous
// `clampLoginError(result.error)` reflected a server-supplied string into
// the page DOM — banned by R-T2 (no caller-input reflection).
function bannerForLoginCode(code: ServerCode | undefined): BannerCopy {
  if (code === undefined) return ERROR_BANNERS.unknown;
  return ERROR_BANNERS[code];
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // E9.S9 — retires F-6-027 P2. The Setup admin step
  // (CreateAdminStep.tsx:288) already ships a show/hide password
  // toggle; /login lacked the same affordance, so operators on a
  // shared screen had to delete + retype the whole password to verify
  // a typo. Match the Setup pattern exactly: Eye / EyeOff icon button
  // positioned absolutely inside a `position: relative` wrapper, with
  // `aria-label` toggling between "Show password" and "Hide password"
  // for assistive technology.
  const [showPassword, setShowPassword] = useState(false);
  // E6.S8 — store the CODE not the raw string. Banner copy is derived
  // at render time from the canonical ERROR_BANNERS table. `null` ==
  // no banner (idle / submitting / success). The previous string-state
  // path reflected raw `result.error` into the DOM (F-6-007 P0).
  const [errorCode, setErrorCode] = useState<ServerCode | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // E4.S11 (retires F-7-028 P2): post-auth redirect target. The RBAC
  // middleware emits `/login?next=<originating-path>` when a guarded
  // route fails the role check; SessionExpiredCard does the same on
  // session evaporation; /forbidden's "Sign in again" CTA threads it
  // through. We re-validate via `sanitizeReturnTo` because the param
  // arrives in the URL and is therefore caller-controlled — falling
  // back to `/` defends against open-redirect (`?next=https://evil`,
  // `?next=//evil.com`, etc.). The validated path is safe to feed to
  // `router.replace()` which only takes same-origin paths anyway.
  const rawNext = searchParams?.get("next") ?? undefined;
  const postAuthHref = sanitizeReturnTo(rawNext, "/");

  // E8.S5 (F-9-007 P1) — gate on a once-per-mount ref so AuthContext
  // refresh cycles (loading: true → false; user: null → x) don't fire
  // duplicate setup-status checks. Combined with the module-level cache
  // in `setup-status-cache.ts` this drops the historical x8 burst to a
  // single network call across both /login and /setup mounts within a
  // 1h window.
  const setupCheckedRef = useRef(false);
  useEffect(() => {
    if (loading || user) return;
    if (setupCheckedRef.current) return;
    setupCheckedRef.current = true;
    let cancelled = false;
    (async () => {
      const data = await fetchSetupStatus();
      if (cancelled) return;
      if (data?.needsSetup) {
        router.replace("/setup");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, router]);

  // Redirect if already logged in. E4.S11 — bounce to the validated
  // `?next=` so a user who hits /login while already authenticated
  // still lands on the page that triggered the redirect chain (e.g.
  // they followed /forbidden's "Sign in again" CTA but their existing
  // session already had the elevated role).
  useEffect(() => {
    if (!loading && user) {
      router.replace(postAuthHref);
    }
  }, [loading, user, router, postAuthHref]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorCode(null);
    setSubmitting(true);

    const result = await login(username, password);

    if (result.success) {
      // E4.S11 — post-auth, replace to the validated `?next=` target so
      // the redirect chain initiated by RBAC denial (or session
      // evaporation) lands the operator back on the page they came from.
      router.replace(postAuthHref);
    } else {
      // result.code is the canonical ServerCode the AuthContext derives
      // from the response status (E6.S8). The legacy `result.error`
      // string is still emitted for back-compat with existing tests but
      // is NEVER rendered to the DOM — only the code is consumed here.
      setErrorCode(result.code ?? "unknown");
      setSubmitting(false);
    }
  }

  const errorBanner = errorCode !== null ? bannerForLoginCode(errorCode) : null;

  if (loading || user) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="sys-fullpage"
        aria-label="Authentication status"
      >
        <div
          className="sys-loading"
          role="status"
          aria-live="polite"
          data-testid="auth-loading"
        >
          <span className="sys-loading-spinner" aria-hidden="true" />
          <span>Authenticating…</span>
        </div>
      </main>
    );
  }

  return (
    <>
      <main
        id="main-content"
        tabIndex={-1}
        className="sys-fullpage"
        data-testid="login-page"
        aria-label="Sign in"
      >
        <div className="sys-fullpage-inner">
          <section className="gate-card" aria-labelledby="login-heading">
            <div className="gate-brand" data-testid="login-brand-hero">
              <span
                className="gate-mark"
                lang="ja"
                aria-hidden="true"
                data-testid="login-brand-mark"
              >
                道
              </span>
              {/* wave-c Login v2 — two-tone wordmark: LM carries the
                  text-safe red (--torii-text per DR-6), Dojo stays ink. */}
              <span className="gate-wordmark">
                Dojo<span className="lm">LM</span>
              </span>
              <span className="gate-kick">Admin console · sign in</span>
            </div>
            <h1 id="login-heading">Sign in</h1>
            <p className="sub">Use the admin account created during setup.</p>

            <div id="login-error" className="gate-error">
              <SystemBanner
                active={errorBanner !== null}
                tone="danger"
                title={errorBanner?.title ?? "We could not sign you in"}
                testId="login-error"
              >
                {errorBanner?.body ??
                  "Check your username and password, then try again."}
              </SystemBanner>
            </div>

            <form
              onSubmit={handleSubmit}
              className="login-form"
              aria-describedby={
                errorBanner !== null ? "login-error" : undefined
              }
            >
              <div className="gfield">
                <label htmlFor="username">
                  Username
                  <RequiredAsterisk />
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  required
                  aria-required="true"
                  disabled={submitting}
                  className="wb-input input"
                  data-testid="login-username"
                />
              </div>

              <div className="gfield">
                <label htmlFor="password">
                  Password
                  <RequiredAsterisk />
                </label>
                <div className="gate-password-field">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    required
                    aria-required="true"
                    disabled={submitting}
                    className="wb-input input"
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    className="gate-password-toggle"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={submitting}
                    data-testid="login-password-toggle"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="gate-cta">
                <button
                  type="submit"
                  className="btn btn-primary login-form-submit"
                  disabled={submitting}
                  data-testid="login-submit"
                >
                  {submitting ? (
                    <>
                      <span
                        className="sys-loading-spinner"
                        aria-hidden="true"
                      />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>
            </form>

            <div className="gate-links">
              <Link href="/members/sign-in">
                Member? Sign in with your invite →
              </Link>
            </div>
          </section>
        </div>
      </main>
      <LegalFooter />
    </>
  );
}
