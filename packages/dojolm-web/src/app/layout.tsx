import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "./providers";
import { serializePublicRuntimeEnvScript } from "@/lib/runtime-env";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "NODA — DojoLM Security Platform",
  description: "BlackUnicorn's Test Prompt Injection security testing platform for LLM applications - Detect vulnerabilities, run tests, and secure your AI applications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${jetbrainsMono.variable} antialiased`}>
        <Script
          id="noda-runtime-env"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: serializePublicRuntimeEnvScript() }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-[9999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--bg-primary,#0a0a0a)] focus:text-[var(--foreground,#fafafa)] focus:ring-2 focus:ring-[var(--bu-electric,#5B8DEF)] focus:outline-none"
        >
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
