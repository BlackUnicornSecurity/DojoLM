// SPDX-License-Identifier: Apache-2.0
import type { Metadata } from "next";
import {
  Fraunces,
  Inter,
  JetBrains_Mono,
  Noto_Serif_JP,
} from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import { Providers } from "./providers";
import { serializePublicRuntimeEnvScript } from "@/lib/runtime-env";
import { getFeatureMode } from "@/lib/demo";
import { FeatureBadge } from "@/components/ui/FeatureBadge";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-editorial",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const notoSerifJp = Noto_Serif_JP({
  variable: "--font-jp",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "DojoLM · Security Platform",
  description:
    "BlackUnicorn's Test Prompt Injection security testing platform for LLM applications - Detect vulnerabilities, run tests, and secure your AI applications.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;
  const featureMode = getFeatureMode();

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable} ${notoSerifJp.variable}`}
    >
      <body className="antialiased">
        {/* nonce required by CSP (H-04): serializePublicRuntimeEnvScript() is sanitized (escapes <>&) */}
        <Script
          id="noda-runtime-env"
          strategy="beforeInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: serializePublicRuntimeEnvScript(),
          }}
        />
        {/* E7.S6 — canonical `.skip-nav` skip-link.
            WCAG 2.4.1 (Bypass Blocks): the skip-link must be the first
            focusable element in the document so keyboard operators can
            jump past repeated nav and rail chrome to the page landmark
            (#main-content, mounted in (shell)/shell-chrome.tsx). The
            class `.skip-nav` is the canonical primitive declared once in
            `brand-tokens.css` (visually-hidden offscreen until focus,
            then renders fixed-position near the top-left with the
            project's --bu-electric ring/focus tokens). Using the design-
            system class (instead of ad-hoc Tailwind utilities) keeps the
            focus appearance, z-index, and motion tokens consistent with
            every other focus-ring in the product, and lets the spec
            assertion in src/design/__tests__/e7-s6-lang-ja-skip-link.test.tsx
            pin the canonical class as the contract.

            Verified by E7.S6 (F-4-009 part / F-9-002 part):
              - exactly one skip-link primitive in the app tree
              - first focusable element in document.body (precedes any
                shell rail / topbar / drawer trigger)
              - className includes `skip-nav`
              - href anchors `#main-content` (the shell-chrome landmark) */}
        <a href="#main-content" className="skip-nav">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
        {/* Wave 0 Track C.5 (2026-04-18): runtime-mode badge — demo/preview/partial.
            Rendered outside Providers so it never re-renders on client navigation.
            Hidden in production (getFeatureMode returns null). */}
        {featureMode !== null && (
          <div className="fixed bottom-3 right-3 z-[9998] pointer-events-none">
            <FeatureBadge mode={featureMode} />
          </div>
        )}
      </body>
    </html>
  );
}
