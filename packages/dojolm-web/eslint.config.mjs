// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import buTpi from "./eslint-plugin-bu-tpi/index.mjs";
import dojo from "./eslint-plugin-dojo/src/index.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    ignores: [
      "coverage/**",
    ],
  },
  // YR.13.0 anti-recurrence gates (G-A2 / G-A3 / G-A4). Plugin is registered
  // globally; per-area enforcement is configured in dedicated blocks below.
  // E1 token discipline (dojo/*) is registered globally; per-area enforcement
  // (currently src/design/** only) is configured in the E1.S5 block below.
  {
    plugins: {
      "bu-tpi": buTpi,
      dojo,
    },
  },
  // E1.S5 — forbid Tailwind utility classes in design surfaces.
  // E1.S6 — forbid font-family tokens (--mono / --sans / --serif)
  //         used as color values in JSX inline styles.
  // The design system (src/design/**) owns the V2 visual vocabulary
  // (`tokens.css` Layer-3 + `dojo-`/`arena-`/`aivss-`-style component
  // classes). Tailwind utilities at design-primitive sites bypass that
  // vocabulary and fork the contract per-call-site (F-1-013, parts of
  // F-2-201 / F-2-225). Allowlist: `motion-safe:` and `motion-reduce:`
  // prefixes pass through per shadcn motion-pref integration patterns.
  // The font-token rule retires F-1-006: `var(--mono, #1a1a1a)` mis-
  // used as a color fallback (the `#1a1a1a` is what actually paints
  // because `--mono` is a font-family stack, not a color).
  // Scope is intentionally narrow — components/* is migrating
  // separately (E1.S7 sweep), and app/* is downstream of design.
  {
    files: ["src/design/**/*.{ts,tsx}"],
    rules: {
      "dojo/forbid-tailwind-in-design-tsx": "error",
      "dojo/forbid-mono-in-color-context": "error",
    },
  },
  // E1.S10 — forbid CJK Unified Ideographs (U+4E00-U+9FFF) inside
  // Array.prototype.map / forEach / filter callbacks that return JSX.
  // Retires F-1-012 (P2): eleven kanji glyphs render in `.map()` over
  // the admin module list (AdminLandingNav.tsx). G4 says kanji must
  // function as decoration, not data — a glyph that varies row-by-row
  // through a data iteration is data, multiplying decoration density
  // beyond the page-level budget. Plan §E1.S10 names this rule a
  // "Stylelint" rule; Stylelint cannot parse TSX, so the rule lives
  // here in ESLint where the JSX-AST walk is feasible. Scoped to
  // `src/app/**/*.tsx` (admin surface — the F-1-012 evidence site)
  // and `src/design/**/*.tsx` (admin nav primitive).
  {
    files: ["src/app/**/*.{ts,tsx}", "src/design/**/*.{ts,tsx}"],
    rules: {
      "dojo/no-kanji-in-data-iteration": "error",
    },
  },
  // G-A4 — silent `.catch(() => {})` is forbidden inside Playwright e2e
  // specs. Was the root cause behind the V1→V2 audit's "lying baselines"
  // (admin-users / admin-validation snapshots existed for routes that
  // never did). See the V1->V2 audit notes.
  {
    files: ["e2e/**/*.spec.{ts,tsx}", "e2e/**/*.test.{ts,tsx}"],
    rules: {
      "bu-tpi/no-catch-swallow-in-e2e": "error",
    },
  },
  // G-A2 — `<button>` without `onClick` / `onSubmit` / `disabled` /
  // `type="submit"|"reset"` fails lint in the production component tree.
  // The audit found 8 dead buttons V2 shipped (CommandDashboard CTAs +
  // TopBar icon buttons); each carries a ticket-tagged suppression today
  // and clears as the relevant epic lands.
  {
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/design/**/*.{ts,tsx}",
    ],
    rules: {
      "bu-tpi/no-dead-button": "error",
    },
  },
  // G-A3 — `data-fixture` / `data-demo` attributes must be `"true"` (or
  // a runtime expression). Anything else is reviewer ambiguity. Forces
  // explicit annotation when fixture data is rendered so the audit gap
  // pattern (Ticker / GuardModes / CoverageHeatmap with seed=42) cannot
  // recur silently.
  {
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/design/**/*.{ts,tsx}",
    ],
    rules: {
      "bu-tpi/explicit-data-source": "error",
    },
  },
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      // Keep lint aligned with the current codebase until we do a dedicated
      // React Compiler rules migration across the app.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // Wave 0 (2026-04-18): same React-Compiler migration cluster. Fires on
      // pre-existing Date.now()/Math.random() calls in render paths; add to
      // the same deferred-migration list.
      "react-hooks/purity": "off",
      // Forbid importing demo mock data outside API route handlers and the
      // demo dir itself. The isDemoMode() guard and auth constants (via the
      // `@/lib/demo` barrel) remain importable everywhere because those are
      // runtime metadata, not fixtures. Enforces the governance contract
      // described in src/lib/demo/registry.ts.
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: [
              "@/lib/demo/mock-*",
              "@/lib/demo/mock-api-handlers",
              "@/lib/demo/registry",
            ],
            message: "Demo mock data/handlers are restricted to src/app/api/** and src/lib/demo/**. Import isDemoMode() from '@/lib/demo' instead if you need to gate behavior on demo mode.",
          },
        ],
      }],
      // Wave 0 Track C.1 (2026-04-18): ban raw MOCK_* / HARDENED_PROMPT
      // imports from inside component code paths. Fixtures and stores are
      // the only legitimate homes for these identifiers. Test overrides
      // below re-enable them for __tests__ and *.test.* files.
      "no-restricted-syntax": ["warn",
        {
          selector: "Literal[value='llm']",
          message: "'llm' is a retired NavId. Use 'jutsu' (see NAV_ID_ALIASES in src/lib/constants.ts).",
        },
        {
          selector: "Literal[value='strategic']",
          message: "'strategic' is kept only as a hidden back-compat alias rendering KumiteRetiredNotice. Do not use it as an outgoing nav target.",
        },
        {
          selector: "Literal[value='armory']",
          message: "'armory' is a retired NavId. Use 'buki'.",
        },
        {
          selector: "Literal[value='kumite']",
          message: "'kumite' is a retired NavId. Use 'strategic' (back-compat only) or one of its child modules (mitsuke, dna, kagami, arena).",
        },
        {
          selector: "Literal[value='atemi']",
          message: "'atemi' is a retired NavId. Use 'adversarial'.",
        },
        {
          selector: "Literal[value='time-chamber']",
          message: "'time-chamber' is a retired NavId. Use 'sengoku'.",
        },
        {
          selector: "Literal[value='attackdna']",
          message: "'attackdna' is a retired NavId. Use 'dna'.",
        },
        {
          selector: "Literal[value='ronin']",
          message: "'ronin' is a retired NavId. Use 'ronin-hub'.",
        },
        {
          selector: "Literal[value='bounty']",
          message: "'bounty' is a retired NavId. Use 'ronin-hub'.",
        },
        {
          selector: "Literal[value='arena-standalone']",
          message: "'arena-standalone' is a retired NavId. Use 'arena'.",
        },
        {
          selector: "ImportDeclaration > ImportSpecifier > Identifier[name=/^(MOCK_|HARDENED_PROMPT$)/]",
          message: "Wave 0 Track C.1: MOCK_* / HARDENED_PROMPT identifiers are fixture data. Import them only from src/fixtures/**, *.test.* files, or src/lib/demo/**. Production component code must read from a live API or a typed store.",
        },
        {
          selector: "VariableDeclarator > Identifier[name=/^(MOCK_|HARDENED_PROMPT)/]",
          message: "Wave 0 Track C.1: inline 'const MOCK_*' / HARDENED_PROMPT declarations in component code are a regression signal. Move the data to src/lib/demo/mock-*.ts (demo-mode gated) or replace with a live API call. Wave 1 work; staged at WARN.",
        },
        // Wave 0 Track C.3 (2026-04-18): storage-API divergence.
        // Flags localStorage / sessionStorage writes that use a key matching
        // an active API slug. These are PRIMARY-STORE violations — the UI
        // is storing what the server already owns.
        {
          selector: "CallExpression[callee.object.name=/^(localStorage|sessionStorage)$/][callee.property.name='setItem'] > Literal:first-child[value=/^(noda-)?(ronin-submissions|atemi-sessions|mitsuke-(indicators|threats|sources))/]",
          message: "Wave 0 Track C.3: localStorage/sessionStorage is used as the primary store for a slug that has a live /api route. Read/write through the API; use storage only for UI prefs or cache. To opt-out, add a `// STORAGE-ALLOWED: <reason>` comment above.",
        },
        // Wave 0 Track C.4 (2026-04-18): widget-truth.
        // Flags 'Not yet available' / 'Coming soon' / 'Unavailable' strings
        // in *Widget.tsx files. Requires a deliberate override if the
        // widget genuinely points at an unmounted destination.
        {
          selector: "Literal[value=/^(Not yet available|Coming soon|Unavailable)$/]",
          message: "Wave 0 Track C.4: widget copy must match mounted module reality. If the destination module IS mounted in page.tsx, replace this copy with a Preview/Partial badge that reflects the real state. To opt-out for truly offline modules, add `// WIDGET-TRUTH-ALLOWED: <reason>`.",
        },
        // P6 cold-boot fix (2026-07-11): Turbopack resolves `.js`→`.ts` for
        // static imports only — a `.js`-suffixed dynamic `import()` of a
        // relative/alias .ts module breaks cold Turbopack dev (audit-logger
        // regression class). Static `.js` imports stay legal (webpack
        // extensionAlias + Turbopack handle them); package specifiers ending
        // in .js (e.g. 'pkg/dist/x.js') are untouched.
        {
          selector: "ImportExpression > Literal[value=/^(\\.|@\\/).*\\.js$/]",
          message: "P6 cold-boot: dynamic import() of a relative/alias module must be extensionless — Turbopack does not resolve `.js`→`.ts` for dynamic imports (see next.config.ts extensionAlias comment).",
        },
      ],
      // Wave 0 Track B.6 (2026-04-18): module-id cross-check.
      // Retired NavIds must not appear as string literals in component code —
      // they should only live in the NAV_ID_ALIASES map (src/lib/constants.ts)
      // which is gated by a separate file override below. A string literal
      // equal to a retired id usually means a stale pill, nav target, or
      // deep-link URL that bypasses the alias resolver.
    },
  },
  {
    // NAV_ID_ALIASES definition is the single legitimate home for retired ids.
    files: ["src/lib/constants.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    // Wave 0 audit round 1 (2026-04-18): narrow the retired-id selectors
    // to avoid false positives. These files use retired identifiers as
    // internal type-union discriminants or ecosystem module tags rather
    // than as outgoing nav targets — e.g., `EcosystemModule` union,
    // arena `AttackSource.type`, Sensei tool enum filters, cross-module
    // action `targetModule` discriminants. The underlying data model uses
    // these names historically and the nav aliases (`NAV_ID_ALIASES`)
    // translate them at the UI boundary.
    //
    // If any of these files grows a genuine nav-target use of a retired
    // id, prefer adding an inline `// eslint-disable-next-line no-restricted-syntax`
    // over widening this override.
    files: [
      "src/lib/ecosystem-types.ts",
      "src/lib/ecosystem-emitters.ts",
      "src/lib/arena-types.ts",
      "src/lib/arena-engine.ts",
      "src/lib/sensei/tool-definitions.ts",
      "src/components/ui/CrossModuleActions.tsx",
      "src/components/dashboard/widgets/EcosystemPulseWidget.tsx",
      "src/components/attackdna/NodeDetailPanel.tsx",
      // Round 2 additions (2026-04-18): dashboard-config / widget-registry
      // files use retired nav ids as widget category keys and widget registry
      // ids (e.g., `'time-chamber'` is the TimeChamberWidget's registry id
      // which deliberately preserves the historical name for stable config
      // persistence). These are structural discriminants, not nav targets.
      "src/components/dashboard/NODADashboard.tsx",
      "src/components/dashboard/DashboardCustomizer.tsx",
      "src/components/dashboard/DashboardConfigContext.tsx",
      // Round 3 addition (2026-04-18): AttackLog passes `sourceModule="atemi"`
      // to <CrossModuleActions />. The "atemi" here is the ecosystem module
      // tag consumed by useEcosystemEmit, same pattern already overridden
      // in ecosystem-emitters.ts and CrossModuleActions.tsx. Not a nav target.
      "src/components/adversarial/AttackLog.tsx",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    // Wave 0 Track D.2 (2026-04-18): auth-guard enforcement for API routes.
    // Every src/app/api/**/route.ts MUST import either withAuth or
    // createApiHandler. Exception: files explicitly listed in the
    // public-by-design allow-list below.
    files: ["src/app/api/**/route.ts", "src/app/api/**/route.tsx"],
    ignores: [
      "src/app/api/auth/me/route.ts",
      "src/app/api/build-info/route.ts",
      "src/app/api/health/route.ts",
      "src/app/api/llm/presets/route.ts",
      "src/app/api/mitsuke/entries/route.ts",
      "src/app/api/mitsuke/sources/route.ts",
      "src/app/api/setup/status/route.ts",
    ],
    rules: {
      "no-restricted-syntax": ["warn",
        {
          selector: "Program:not(:has(ImportDeclaration[source.value=/auth.route-guard$|api-handler$/]))",
          message: "Wave 0 Track D.2: every API route must import an auth guard (withAuth from @/lib/auth/route-guard OR createApiHandler from @/lib/auth/api-handler). If the route is intentionally public, add it to the ignore list in eslint.config.mjs Track D.2 block with a comment explaining why.",
        },
      ],
    },
  },
  {
    // API route handlers and the demo package itself may import mock data.
    files: [
      "src/app/api/**/*.{ts,tsx}",
      "src/lib/demo/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
      // demo package and API routes may legitimately declare MOCK_* fixtures.
      "no-restricted-syntax": "off",
    },
  },
  {
    files: [
      "**/__tests__/**/*.{js,jsx,ts,tsx}",
      "**/*.test.{js,jsx,ts,tsx}",
      "**/*.spec.{js,jsx,ts,tsx}",
    ],
    rules: {
      "react/display-name": "off",
      "no-restricted-imports": "off",
      // Wave 0 (2026-04-18): tests legitimately assert on retired NavId
      // strings (e.g., proving the alias resolver). Disable the cross-check
      // rule in test files to avoid spurious warnings on those assertions.
      "no-restricted-syntax": "off",
      // YR.13.0 anti-recurrence gates do not apply to tests:
      //  - dead-button: tests intentionally render bare <button> probes
      //  - explicit-data-source: tests legitimately pass non-"true" values
      // The e2e silent-swallow ban DOES still apply to .spec.ts files via
      // the more specific e2e/** rule block above.
      "bu-tpi/no-dead-button": "off",
      "bu-tpi/explicit-data-source": "off",
    },
  },
  // YR.13.0 — design-system canvas / preview / demo routes legitimately
  // render bare buttons (component gallery patterns) and demo data with
  // labeling. They are out-of-scope for the production gates.
  {
    files: [
      "src/app/(design)/**/*.{ts,tsx}",
      "src/design/**/canvas/**/*.{ts,tsx}",
    ],
    rules: {
      "bu-tpi/no-dead-button": "off",
      "bu-tpi/explicit-data-source": "off",
    },
  },
  // F15 (F-Architect) — the OSS↔EE import tripwire. OSS Tatami code must NEVER
  // import the EE `tatami-vault` (BUSL) forensic layer (seal / replay / export /
  // attest). This is the dev/CI fail-fast guard complementing the publish-time
  // export boundary gate (tools/oss-export/import-graph.mjs); see the
  // src/lib/tatami/index.ts header. Placed LAST and scoped to the OSS Tatami
  // surface so it re-asserts the ban even on the api-route + test files that turn
  // no-restricted-imports off above (flat config is last-match-wins per rule).
  //
  // Two blocks. The first covers the full OSS Tatami/Scanner surface that is NOT
  // an api route: the lib layer (`src/lib/tatami`, `src/lib/scanner`), the design
  // primitives (`src/design/tatami`, `src/design/scanner`), and the admin UI
  // (`admin/tatami`, `admin/scanner`). The admin surfaces live under the `(shell)`
  // route group, so their globs must use `src/app/**/admin/...` (a plain
  // `src/app/admin/...` glob matches nothing and the tripwire silently misses
  // those dirs). The demo-mock patterns are carried forward across this surface
  // where the Wave-0 governance net applies. api/tatami is split into the second,
  // vault-only block so it KEEPS the api-route demo exemption that `src/app/api/**`
  // is granted above — re-listing the demo ban there would forbid demo-mode data
  // in tatami route handlers, unlike every other api route.
  {
    files: [
      "src/lib/tatami/**/*.{ts,tsx}",
      "src/lib/scanner/**/*.{ts,tsx}",
      "src/design/tatami/**/*.{ts,tsx}",
      "src/design/scanner/**/*.{ts,tsx}",
      "src/app/**/admin/tatami/**/*.{ts,tsx}",
      "src/app/**/admin/scanner/**/*.{ts,tsx}",
    ],
    // The `src/app/**/admin/...` globs above use `**` to span the `(shell)`
    // route group, but `**` also matches `api`, so a route handler under
    // `src/app/api/admin/{tatami,scanner}/**` would otherwise match this block
    // and inherit its DEMO-mock ban — stripping the api-route demo exemption
    // that `src/app/api/**` is granted above. Exclude every api route here so
    // they only ever receive the vault-only treatment from the next block (the
    // same class of fix as d560d65747 did for api/tatami). The non-api admin UI
    // under `(shell)` and the lib/design surfaces are not under `api/`, so this
    // ignore does not weaken their demo+vault coverage.
    ignores: ["src/app/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: [
              "@/lib/demo/mock-*",
              "@/lib/demo/mock-api-handlers",
              "@/lib/demo/registry",
            ],
            message: "Demo mock data/handlers are restricted to src/app/api/** and src/lib/demo/**. Import isDemoMode() from '@/lib/demo' instead if you need to gate behavior on demo mode.",
          },
          {
            group: [
              "@/lib/tatami-vault",
              "@/lib/tatami-vault/**",
              "**/tatami-vault",
              "**/tatami-vault/**",
            ],
            message: "OSS Tatami must never import the EE `tatami-vault` (BUSL) forensic layer (seal/replay/export/attest). See src/lib/tatami/index.ts and F-Architect F15. EE consumers live outside the OSS Tatami surface.",
          },
        ],
      }],
    },
  },
  {
    // api/tatami keeps the api-route demo exemption (src/app/api/** turns the
    // demo restriction off above so route handlers may serve demo data), so
    // re-apply ONLY the vault ban here — do not re-impose the demo restriction.
    // The nested `api/**/{tatami,scanner}/**` globs also catch route handlers
    // under `src/app/api/admin/{tatami,scanner}/**` (the api dirs the first
    // block now `ignores`), so those keep the vault ban WITHOUT the demo ban.
    // `**` collapses to zero segments, so they also subsume the plain
    // `src/app/api/tatami/**` form, which is kept explicit for clarity.
    files: [
      "src/app/api/tatami/**/*.{ts,tsx}",
      "src/app/api/**/tatami/**/*.{ts,tsx}",
      "src/app/api/**/scanner/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: [
              "@/lib/tatami-vault",
              "@/lib/tatami-vault/**",
              "**/tatami-vault",
              "**/tatami-vault/**",
            ],
            message: "OSS Tatami must never import the EE `tatami-vault` (BUSL) forensic layer (seal/replay/export/attest). See src/lib/tatami/index.ts and F-Architect F15. EE consumers live outside the OSS Tatami surface.",
          },
        ],
      }],
    },
  },
]);

export default eslintConfig;
