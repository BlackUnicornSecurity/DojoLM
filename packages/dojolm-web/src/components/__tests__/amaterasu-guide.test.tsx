/**
 * File: amaterasu-guide.test.tsx
 * Purpose: Unit tests for AmaterasuGuide tutorial component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => <span data-testid="icon" {...props} />
  return {
    GitBranch: Icon, Layers: Icon, Clock: Icon, ChevronRight: Icon,
    ChevronLeft: Icon, X: Icon, Sparkles: Icon, Dna: Icon,
    Microscope: Icon, HelpCircle: Icon,
  }
})

import { AmaterasuGuide } from '../attackdna/AmaterasuGuide'

const STORAGE_KEY = 'amaterasu-guide-dismissed'
const mockLocalStorage: Record<string, string> = {}

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k])

  vi.spyOn(localStorage, 'getItem').mockImplementation((key: string) => mockLocalStorage[key] ?? null)
  vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
    mockLocalStorage[key] = value
  })
  vi.spyOn(localStorage, 'removeItem').mockImplementation((key: string) => {
    delete mockLocalStorage[key]
  })
})

describe('AmaterasuGuide', () => {
  it('renders tutorial when not dismissed', () => {
    render(<AmaterasuGuide />)
    expect(screen.getByText('Welcome to Amaterasu DNA')).toBeInTheDocument()
  })

  it('does not render when dismissed in localStorage', () => {
    mockLocalStorage[STORAGE_KEY] = 'true'
    const { container } = render(<AmaterasuGuide />)
    expect(container.querySelector('[role="region"]')).not.toBeInTheDocument()
  })

  it('renders tutorial steps content', () => {
    render(<AmaterasuGuide />)
    expect(screen.getByText('What is Attack DNA?')).toBeInTheDocument()
    expect(screen.getByText(/Step 1 of 5/)).toBeInTheDocument()
  })

  it('navigates to next step', () => {
    render(<AmaterasuGuide />)
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Explore Family Trees')).toBeInTheDocument()
    expect(screen.getByText(/Step 2 of 5/)).toBeInTheDocument()
  })

  it('navigates back to previous step', () => {
    render(<AmaterasuGuide />)
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Explore Family Trees')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Back'))
    expect(screen.getByText('What is Attack DNA?')).toBeInTheDocument()
  })

  it('does not show Back button on first step', () => {
    render(<AmaterasuGuide />)
    expect(screen.queryByText('Back')).not.toBeInTheDocument()
  })

  it('shows "Get Started" on last step', () => {
    render(<AmaterasuGuide />)
    // Navigate to last step (step 5 of 5)
    fireEvent.click(screen.getByText('Next')) // step 2
    fireEvent.click(screen.getByText('Next')) // step 3
    fireEvent.click(screen.getByText('Next')) // step 4
    fireEvent.click(screen.getByText('Next')) // step 5
    expect(screen.getByText('Get Started')).toBeInTheDocument()
    expect(screen.getByText('Black Box Analysis')).toBeInTheDocument()
  })

  it('dismiss persists to localStorage', () => {
    render(<AmaterasuGuide />)
    fireEvent.click(screen.getByLabelText('Dismiss tutorial'))
    expect(mockLocalStorage[STORAGE_KEY]).toBe('true')
  })

  it('clicking "Get Started" on last step dismisses', () => {
    const { unmount } = render(<AmaterasuGuide />)
    fireEvent.click(screen.getByText('Next')) // step 2
    fireEvent.click(screen.getByText('Next')) // step 3
    fireEvent.click(screen.getByText('Next')) // step 4
    fireEvent.click(screen.getByText('Next')) // step 5
    fireEvent.click(screen.getByText('Get Started'))
    expect(mockLocalStorage[STORAGE_KEY]).toBe('true')
    unmount()
  })

  it('step dots are clickable for direct navigation', () => {
    render(<AmaterasuGuide />)
    const step3Button = screen.getByLabelText(/Step 3: Analyze Clusters/)
    fireEvent.click(step3Button)
    expect(screen.getByText('Analyze Clusters')).toBeInTheDocument()
    expect(screen.getByText(/Step 3 of 5/)).toBeInTheDocument()
  })

  it('has accessible region landmark', () => {
    render(<AmaterasuGuide />)
    expect(screen.getByRole('region', { name: /getting started with amaterasu dna/i })).toBeInTheDocument()
  })
})
