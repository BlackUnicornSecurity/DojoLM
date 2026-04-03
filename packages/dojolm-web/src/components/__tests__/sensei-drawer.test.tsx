/**
 * File: sensei-drawer.test.tsx
 * Purpose: Unit tests for SenseiDrawer component
 * Test IDs: SD-001 to SD-007
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  Bot: (props: Record<string, unknown>) => <svg data-testid="bot-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
  Trash2: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-down-icon" {...props} />,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

const mockUseSensei = {
  messages: [],
  isOpen: false,
  isLoading: false,
  selectedModelId: null,
  pendingConfirmations: [],
  error: null as string | null,
  sendMessage: vi.fn(),
  confirmToolCall: vi.fn(),
  rejectToolCall: vi.fn(),
  setSelectedModelId: vi.fn(),
  toggle: vi.fn(),
  close: vi.fn(),
  clearHistory: vi.fn(),
  clearError: vi.fn(),
}

vi.mock('@/hooks/useSensei', () => ({
  useSensei: () => mockUseSensei,
}))

vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn(),
}))

vi.mock('../sensei/SenseiChat', () => ({
  SenseiChat: () => <div data-testid="sensei-chat">SenseiChat</div>,
}))

import { SenseiDrawer } from '../sensei/SenseiDrawer'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SenseiDrawer (SD-001 to SD-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSensei.isOpen = false
    mockUseSensei.error = null
    mockUseSensei.messages = []
    mockUseSensei.selectedModelId = null
  })

  it('SD-001: renders floating toggle button when closed', () => {
    render(<SenseiDrawer activeModule="dashboard" />)
    const toggleBtn = screen.getByLabelText('Open Sensei')
    expect(toggleBtn).toBeInTheDocument()
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('SD-002: renders drawer panel with dialog role', () => {
    mockUseSensei.isOpen = true
    render(<SenseiDrawer activeModule="dashboard" />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-label', 'Sensei AI Assistant')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('SD-003: renders Sensei title in header', () => {
    mockUseSensei.isOpen = true
    render(<SenseiDrawer activeModule="dashboard" />)
    expect(screen.getByText('Sensei')).toBeInTheDocument()
  })

  it('SD-004: renders clear history and close buttons in header', () => {
    mockUseSensei.isOpen = true
    render(<SenseiDrawer activeModule="dashboard" />)
    expect(screen.getByLabelText('Clear chat history')).toBeInTheDocument()
    expect(screen.getByLabelText('Close Sensei')).toBeInTheDocument()
  })

  it('SD-005: calls clearHistory when trash button clicked', () => {
    mockUseSensei.isOpen = true
    render(<SenseiDrawer activeModule="dashboard" />)
    fireEvent.click(screen.getByLabelText('Clear chat history'))
    expect(mockUseSensei.clearHistory).toHaveBeenCalled()
  })

  it('SD-006: renders error banner when error exists', () => {
    mockUseSensei.isOpen = true
    mockUseSensei.error = 'Please select a model'
    render(<SenseiDrawer activeModule="dashboard" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Please select a model')
  })

  it('SD-007: renders SenseiChat child component', () => {
    mockUseSensei.isOpen = true
    render(<SenseiDrawer activeModule="dashboard" />)
    expect(screen.getByTestId('sensei-chat')).toBeInTheDocument()
  })
})
