/**
 * File: chat-bubble.test.tsx
 * Purpose: Tests for ChatBubble component
 * Test IDs: CB-001 to CB-012
 * Source: src/components/llm/ChatBubble.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('lucide-react', () => ({
  Copy: () => <span data-testid="icon-copy" />,
  Check: () => <span data-testid="icon-check" />,
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { ChatBubble } from '../llm/ChatBubble'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockClipboard(success = true) {
  const writeText = success
    ? vi.fn().mockResolvedValue(undefined)
    : vi.fn().mockRejectedValue(new Error('denied'))
  Object.assign(navigator, { clipboard: { writeText } })
  return writeText
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatBubble', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  // CB-001
  it('renders user message with correct aria-label', () => {
    render(<ChatBubble role="user" content="Hello" />)
    expect(screen.getByRole('listitem')).toHaveAttribute('aria-label', 'Your message')
  })

  // CB-002
  it('renders assistant message with correct aria-label', () => {
    render(<ChatBubble role="assistant" content="Hi there" />)
    expect(screen.getByRole('listitem')).toHaveAttribute('aria-label', 'Assistant message')
  })

  // CB-003
  it('displays content as paragraph when isCode is false', () => {
    render(<ChatBubble role="user" content="plain text" />)
    expect(screen.getByText('plain text').tagName).toBe('P')
  })

  // CB-004
  it('displays content in a code block when isCode is true', () => {
    render(<ChatBubble role="assistant" content="console.log(1)" isCode />)
    const codeEl = screen.getByText('console.log(1)')
    expect(codeEl.tagName).toBe('CODE')
  })

  // CB-005
  it('shows timestamp when provided', () => {
    render(<ChatBubble role="user" content="msg" timestamp="12:30 PM" />)
    expect(screen.getByText('12:30 PM')).toBeInTheDocument()
  })

  // CB-006
  it('hides timestamp when not provided', () => {
    const { container } = render(<ChatBubble role="user" content="msg" />)
    expect(container.querySelector('span')).toBeNull()
  })

  // CB-007
  it('shows copy button only for assistant messages', () => {
    const { rerender } = render(<ChatBubble role="assistant" content="resp" />)
    expect(screen.getByRole('button', { name: /copy to clipboard/i })).toBeInTheDocument()

    rerender(<ChatBubble role="user" content="req" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  // CB-008
  it('copies content to clipboard when copy button is clicked', async () => {
    const writeText = mockClipboard()
    vi.useRealTimers()
    render(<ChatBubble role="assistant" content="secret data" />)

    fireEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('secret data'))
  })

  // CB-009
  it('shows check icon after copy then reverts', async () => {
    mockClipboard()
    vi.useRealTimers()
    render(<ChatBubble role="assistant" content="data" />)

    fireEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
    })
    expect(screen.getByTestId('icon-check')).toBeInTheDocument()
  })

  // CB-010
  it('handles clipboard failure gracefully', async () => {
    mockClipboard(false)
    vi.useRealTimers()
    render(<ChatBubble role="assistant" content="data" />)

    // Should not throw
    fireEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy to clipboard/i })).toBeInTheDocument()
    })
  })

  // CB-011
  it('applies user styling classes when role is user', () => {
    render(<ChatBubble role="user" content="msg" />)
    const outer = screen.getByRole('listitem')
    expect(outer.className).toContain('ml-auto')
  })

  // CB-012
  it('applies assistant styling classes when role is assistant', () => {
    render(<ChatBubble role="assistant" content="msg" />)
    const outer = screen.getByRole('listitem')
    expect(outer.className).toContain('mr-auto')
  })
})
