/**
 * File: sage-status-widget.test.tsx
 * Purpose: Unit tests for SAGEStatusWidget dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
vi.mock('lucide-react', () => mockLucideIcons('*'))
vi.mock('@/lib/NavigationContext', async () => {
  const { createContext } = await import('react')
  return {
    useNavigation: () => ({ setActiveTab: vi.fn() }),
    // WidgetCard.tsx imports the React Context itself — must be a real Context
    // so useContext(NavigationContext) doesn't throw. Null default value exercises
    // the useSafeNavigation null-fallback path.
    NavigationContext: createContext(null as unknown),
    NavigationProvider: ({ children }: { children: unknown }) => children,
  }
})
vi.mock('@/components/ui/MetricCard', () => ({ MetricCard: ({ label, value }: { label: string; value: unknown }) => <div data-testid="metric-card">{label}: {String(value)}</div> }))
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))

import { SAGEStatusWidget } from '../dashboard/widgets/SAGEStatusWidget'

describe('SAGEStatusWidget', () => {
  it('renders without crashing', () => { expect(render(<SAGEStatusWidget />).container).toBeTruthy() })
  it('displays SAGE title', () => { render(<SAGEStatusWidget />); expect(screen.getByText(/SAGE/i)).toBeInTheDocument() })
  it('wraps in WidgetCard', () => { render(<SAGEStatusWidget />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
})
