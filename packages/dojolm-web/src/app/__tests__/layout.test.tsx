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

import RootLayout from '../layout'

describe('RootLayout', () => {
  it('renders children', () => {
    render(<RootLayout><div data-testid="child">Hello</div></RootLayout>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('has html element with lang="en"', () => {
    render(<RootLayout><div>Test</div></RootLayout>)
    // html is rendered at document level, query from document
    const html = document.querySelector('html')
    expect(html).toHaveAttribute('lang', 'en')
  })

  it('includes skip-to-content link', () => {
    render(<RootLayout><div>Test</div></RootLayout>)
    const skipLink = screen.getByText('Skip to main content')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('wraps children in Providers', () => {
    render(<RootLayout><div data-testid="child">Content</div></RootLayout>)
    expect(screen.getByTestId('providers')).toBeInTheDocument()
  })

  it('includes runtime env script', () => {
    render(<RootLayout><div>Test</div></RootLayout>)
    expect(screen.getByTestId('next-script')).toBeInTheDocument()
  })
})
