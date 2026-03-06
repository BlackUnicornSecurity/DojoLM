/**
 * File: module-onboarding.test.tsx
 * Purpose: Tests for ModuleOnboarding component (Stories 7.1-7.3)
 * Coverage: rendering, step navigation, dismiss, reset, localStorage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModuleOnboarding, resetOnboarding, type OnboardingStep } from '@/components/ui/ModuleOnboarding'
import { Zap, Shield, Target } from 'lucide-react'

const TEST_STORAGE_KEY = 'test-onboarding'

const MOCK_STEPS: OnboardingStep[] = [
  { title: 'Step One', description: 'First step description.', icon: Zap },
  { title: 'Step Two', description: 'Second step description.', icon: Shield },
  { title: 'Step Three', description: 'Third step description.', icon: Target },
]

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('ModuleOnboarding', () => {
  beforeEach(() => {
    localStorageMock.clear()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
  })

  it('renders when not previously dismissed', () => {
    render(<ModuleOnboarding storageKey={TEST_STORAGE_KEY} steps={MOCK_STEPS} />)
    expect(screen.getByText('Step One')).toBeTruthy()
    expect(screen.getByText('First step description.')).toBeTruthy()
  })

  it('does not render when previously dismissed', () => {
    localStorageMock.setItem(TEST_STORAGE_KEY, 'true')
    const { container } = render(<ModuleOnboarding storageKey={TEST_STORAGE_KEY} steps={MOCK_STEPS} />)
    expect(container.innerHTML).toBe('')
  })

  it('navigates to next step via Next button', () => {
    render(<ModuleOnboarding storageKey={TEST_STORAGE_KEY} steps={MOCK_STEPS} />)
    const nextBtn = screen.getByText('Next')
    fireEvent.click(nextBtn)
    expect(screen.getByText('Step Two')).toBeTruthy()
  })

  it('navigates back to previous step via Back button', () => {
    render(<ModuleOnboarding storageKey={TEST_STORAGE_KEY} steps={MOCK_STEPS} />)
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Step Two')).toBeTruthy()
    fireEvent.click(screen.getByText('Back'))
    expect(screen.getByText('Step One')).toBeTruthy()
  })

  it('does not show Back button on first step', () => {
    render(<ModuleOnboarding storageKey={TEST_STORAGE_KEY} steps={MOCK_STEPS} />)
    expect(screen.queryByText('Back')).toBeNull()
  })

  it('shows Get Started on last step', () => {
    render(<ModuleOnboarding storageKey={TEST_STORAGE_KEY} steps={MOCK_STEPS} />)
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Step Three')).toBeTruthy()
    expect(screen.getByText('Get Started')).toBeTruthy()
  })

  it('dismisses and sets localStorage when completing last step', () => {
    render(<ModuleOnboarding storageKey={TEST_STORAGE_KEY} steps={MOCK_STEPS} />)
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Get Started'))
    expect(localStorageMock.setItem).toHaveBeenCalledWith(TEST_STORAGE_KEY, 'true')
  })

  it('dismiss button sets localStorage', () => {
    render(<ModuleOnboarding storageKey={TEST_STORAGE_KEY} steps={MOCK_STEPS} />)
    const dismissBtn = screen.getByLabelText('Dismiss onboarding')
    fireEvent.click(dismissBtn)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(TEST_STORAGE_KEY, 'true')
  })

  it('resetOnboarding removes the storage key', () => {
    localStorageMock.setItem(TEST_STORAGE_KEY, 'true')
    resetOnboarding(TEST_STORAGE_KEY)
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(TEST_STORAGE_KEY)
  })

  it('shows step counter text', () => {
    render(<ModuleOnboarding storageKey={TEST_STORAGE_KEY} steps={MOCK_STEPS} />)
    expect(screen.getByText('Step 1 of 3')).toBeTruthy()
  })

  it('step dots navigate to specific steps', () => {
    render(<ModuleOnboarding storageKey={TEST_STORAGE_KEY} steps={MOCK_STEPS} />)
    const step3Dot = screen.getByLabelText('Step 3: Step Three')
    fireEvent.click(step3Dot)
    expect(screen.getByText('Step Three')).toBeTruthy()
  })

  it('returns null when steps array is empty', () => {
    const { container } = render(<ModuleOnboarding storageKey={TEST_STORAGE_KEY} steps={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
