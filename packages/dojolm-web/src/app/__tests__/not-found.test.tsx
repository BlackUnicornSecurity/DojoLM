/**
 * File: not-found.test.tsx
 * Purpose: Unit tests for the custom 404 page
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import NotFound from '../not-found'

describe('NotFound (404 page)', () => {
  it('renders without crashing', () => {
    expect(render(<NotFound />).container).toBeTruthy()
  })

  it('displays 404 text', () => {
    render(<NotFound />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('displays "Page Not Found" heading', () => {
    render(<NotFound />)
    expect(screen.getByText('Page Not Found')).toBeInTheDocument()
  })

  it('contains a link to "/"', () => {
    render(<NotFound />)
    const link = screen.getByRole('link', { name: /return to dashboard/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })

  it('shows a descriptive message', () => {
    render(<NotFound />)
    expect(screen.getByText(/doesn.t exist or has been moved/i)).toBeInTheDocument()
  })
})
