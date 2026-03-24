/**
 * Test Setup Configuration
 *
 * Phase 6: Testing Framework Setup
 * - Global test utilities
 * - Testing Library configuration
 * - Custom matchers
 */

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

const SUPPRESSED_CONSOLE_ERROR_PATTERNS = [
  'Not implemented: navigation to another Document',
  'Error generating summary:',
  'Error reading guard config, returning defaults:',
  'Fingerprint execution error:',
  'Error registering provider:',
  'Error listing providers:',
  'Error starting batch:',
  'Error listing batches:',
  'Export error:',
  'Error in chat request:',
  'Error getting guard stats:',
  'Error querying guard events:',
  'Error running test fixture:',
  'Stats API error:',
  'Error testing model:',
  'Failed to load manifest:',
  'API call failed: /scan',
  'API call failed: /fixtures',
  '[Guard] HMAC verification FAILED',
] as const;

const SUPPRESSED_CONSOLE_WARN_PATTERNS = [
  '[SECURITY] GUARD_CONFIG_SECRET not set',
  'Guard config rejected: timestamp too old',
] as const;

const SUPPRESSED_CONSOLE_DEBUG_PATTERNS = [
  'Dashboard config migrated v1->v2',
] as const;

function shouldSuppressConsole(
  args: unknown[],
  patterns: readonly string[]
): boolean {
  return args.some((arg) =>
    typeof arg === 'string' && patterns.some((pattern) => arg.includes(pattern))
  );
}

const originalConsoleError = console.error.bind(console);
console.error = (...args: Parameters<typeof console.error>) => {
  if (shouldSuppressConsole(args, SUPPRESSED_CONSOLE_ERROR_PATTERNS)) {
    return;
  }
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn.bind(console);
console.warn = (...args: Parameters<typeof console.warn>) => {
  if (shouldSuppressConsole(args, SUPPRESSED_CONSOLE_WARN_PATTERNS)) {
    return;
  }
  originalConsoleWarn(...args);
};

const originalConsoleDebug = console.debug.bind(console);
console.debug = (...args: Parameters<typeof console.debug>) => {
  if (shouldSuppressConsole(args, SUPPRESSED_CONSOLE_DEBUG_PATTERNS)) {
    return;
  }
  originalConsoleDebug(...args);
};

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      pathname: "/",
      query: {},
      asPath: "/",
    };
  },
  usePathname() {
    return "/";
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock localStorage and matchMedia only in browser-like environments (jsdom/happy-dom).
// Tests using `// @vitest-environment node` skip these mocks.
if (typeof window !== 'undefined') {
  const localStorageStore: Record<string, string> = {};
  const localStorageMock: Storage = {
    getItem: (key: string) => localStorageStore[key] ?? null,
    setItem: (key: string, value: string) => { localStorageStore[key] = String(value); },
    removeItem: (key: string) => { delete localStorageStore[key]; },
    clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
    get length() { return Object.keys(localStorageStore).length; },
    key: (i: number) => Object.keys(localStorageStore)[i] ?? null,
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  const anchorProto = window.HTMLAnchorElement?.prototype;
  if (anchorProto) {
    Object.defineProperty(anchorProto, 'click', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  }
}
