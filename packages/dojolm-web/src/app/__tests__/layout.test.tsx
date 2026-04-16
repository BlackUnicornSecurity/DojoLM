/**
 * File: layout.test.tsx
 * Purpose: Unit tests for the root layout component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('next/font/google', () => ({
  Plus_Jakarta_Sans: () => ({ variable: '--font-sans' }),
  JetBrains_Mono: () => ({ variable: '--font-mono' }),
}))

vi.mock('next/script', () => ({
  default: (props: Record<string, unknown>) => <script data-testid="next-script" {...props} />,
}))

vi.mock('@/lib/runtime-env', () => ({
  serializePublicRuntimeEnvScript: () => 'window.__RUNTIME_ENV__={}',
}))

vi.mock('../providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => <div data-testid="providers">{children}</div>,
}))

// RootLayout is an async server component (uses `await headers()`).
// Mock next/headers so the async call resolves.
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([['x-nonce', 'test-nonce']])),
}))

import RootLayout from '../layout'

/** Helper: await the async RSC then render its output */
async function renderLayout(children: React.ReactNode) {
  // Async server components return a Promise<JSX.Element>
  const element = await (RootLayout({ children }) as unknown as Promise<React.ReactElement>)
  return render(element)
}

describe('RootLayout', () => {
  it('renders children', async () => {
    await renderLayout(<div data-testid="child">Hello</div>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('has html element with lang="en"', async () => {
    await renderLayout(<div>Test</div>)
    const html = document.querySelector('html')
    expect(html).toHaveAttribute('lang', 'en')
  })

  it('includes skip-to-content link', async () => {
    await renderLayout(<div>Test</div>)
    const skipLink = screen.getByText('Skip to main content')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('wraps children in Providers', async () => {
    await renderLayout(<div data-testid="child">Content</div>)
    expect(screen.getByTestId('providers')).toBeInTheDocument()
  })

  it('includes runtime env script', async () => {
    await renderLayout(<div>Test</div>)
    expect(screen.getByTestId('next-script')).toBeInTheDocument()
  })
})
