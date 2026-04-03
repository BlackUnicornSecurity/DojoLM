/**
 * File: login-page.test.tsx
 * Purpose: Unit tests for the Login page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockLogin = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false,
  }),
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => <span data-testid="icon" {...props} />
  return { Shield: Icon, Loader2: Icon, AlertCircle: Icon }
})

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: React.ReactNode }) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, ...props }: { children: React.ReactNode; disabled?: boolean; type?: string; className?: string }) => (
    <button disabled={disabled} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: { children: React.ReactNode; htmlFor?: string }) => (
    <label {...props}>{children}</label>
  ),
}))

import LoginPage from '../login/page'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' })
  })

  it('renders without crashing', () => {
    expect(render(<LoginPage />).container).toBeTruthy()
  })

  it('renders login form with username and password inputs', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders platform title', () => {
    render(<LoginPage />)
    expect(screen.getByText(/dojolm security platform/i)).toBeInTheDocument()
  })

  it('shows error state after failed login', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } })
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })

  it('shows "Signing in..." text while submitting', async () => {
    let resolveLogin!: (v: { success: boolean }) => void
    mockLogin.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve }))

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } })
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/signing in/i)).toBeInTheDocument()

    // Resolve to clean up
    resolveLogin({ success: true })
    await vi.waitFor(() => {})
  })
})
