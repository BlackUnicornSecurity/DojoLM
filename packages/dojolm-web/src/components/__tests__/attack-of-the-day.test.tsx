/**
 * File: attack-of-the-day.test.tsx
 * Purpose: Unit tests for AttackOfTheDay dashboard widget
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => mockLucideIcons('*'))

const mockSetActiveTab = vi.fn()
vi.mock('@/lib/NavigationContext', async () => {
  const { createContext } = await import('react')
  return {
    useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
    // WidgetCard.tsx imports the React Context itself.
    NavigationContext: createContext(null as unknown),
    NavigationProvider: ({ children }: { children: unknown }) => children,
  }
})

const mockScanText = vi.fn()
vi.mock('@/lib/ScannerContext', () => ({
  useScanner: () => ({ scanText: mockScanText }),
}))

vi.mock('@/lib/constants', () => ({
  PAYLOAD_CATALOG: [
    { title: 'Test Attack', desc: 'A test attack description', example: '<script>alert(1)</script>' },
    { title: 'SQL Injection', desc: 'SQL injection test', example: "' OR 1=1 --" },
  ],
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children }: { children: React.ReactNode }) => <div data-testid="glow-card">{children}</div>,
}))

vi.mock('@/components/ui/SeverityBadge', () => ({
  SeverityBadge: ({ severity }: { severity: string }) => <span data-testid="severity-badge">{severity}</span>,
}))

import { AttackOfTheDay } from '../dashboard/widgets/AttackOfTheDay'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AttackOfTheDay', () => {
  it('renders without crashing', () => {
    const { container } = render(<AttackOfTheDay />)
    expect(container).toBeTruthy()
  })

  it('displays "Attack of the Day" heading', () => {
    render(<AttackOfTheDay />)
    expect(screen.getByText('Attack of the Day')).toBeInTheDocument()
  })

  it('renders a SeverityBadge', () => {
    render(<AttackOfTheDay />)
    expect(screen.getByTestId('severity-badge')).toBeInTheDocument()
  })

  it('displays "Try It" button initially', () => {
    render(<AttackOfTheDay />)
    expect(screen.getByText('Try It')).toBeInTheDocument()
  })

  it('changes button text to "Scanned" after clicking "Try It"', () => {
    render(<AttackOfTheDay />)
    fireEvent.click(screen.getByText('Try It'))
    expect(screen.getByText('Scanned')).toBeInTheDocument()
  })

  it('calls scanText and setActiveTab on "Try It" click', () => {
    render(<AttackOfTheDay />)
    fireEvent.click(screen.getByText('Try It'))
    expect(mockScanText).toHaveBeenCalled()
    expect(mockSetActiveTab).toHaveBeenCalledWith('scanner')
  })
})
