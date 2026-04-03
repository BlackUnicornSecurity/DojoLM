/**
 * File: sensei-chat.test.tsx
 * Purpose: Unit tests for SenseiChat component
 * Test IDs: SC-001 to SC-008
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  Send: (props: Record<string, unknown>) => <svg data-testid="send-icon" {...props} />,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/llm/ChatBubble', () => ({
  ChatBubble: ({ role, content }: { role: string; content: string }) => (
    <div data-testid={`chat-bubble-${role}`}>{content}</div>
  ),
}))

vi.mock('../sensei/SenseiToolResult', () => ({
  SenseiToolResultCard: ({ tool }: { tool: string }) => (
    <div data-testid="tool-result">{tool}</div>
  ),
}))

vi.mock('../sensei/SenseiSuggestions', () => ({
  SenseiSuggestions: () => <div data-testid="suggestions">Suggestions</div>,
}))

import { SenseiChat } from '../sensei/SenseiChat'
import type { SenseiMessage, SenseiToolCall } from '@/lib/sensei'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<SenseiMessage> & { id: string; role: SenseiMessage['role'] }): SenseiMessage {
  return {
    content: 'test message',
    timestamp: Date.now(),
    ...overrides,
  }
}

const defaultProps = {
  messages: [] as readonly SenseiMessage[],
  isLoading: false,
  activeModule: 'dashboard' as const,
  pendingConfirmations: [] as readonly SenseiToolCall[],
  onSend: vi.fn(),
  onConfirm: vi.fn(),
  onReject: vi.fn(),
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SenseiChat (SC-001 to SC-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SC-001: renders empty state with welcome message when no messages', () => {
    render(<SenseiChat {...defaultProps} />)
    expect(screen.getByText('Welcome to Sensei')).toBeInTheDocument()
    expect(screen.getByText(/Your AI security assistant/)).toBeInTheDocument()
    expect(screen.getByTestId('suggestions')).toBeInTheDocument()
  })

  it('SC-002: renders conversation log with role="log"', () => {
    render(<SenseiChat {...defaultProps} />)
    expect(screen.getByRole('log')).toHaveAttribute('aria-label', 'Sensei conversation')
  })

  it('SC-003: renders messages as ChatBubble components', () => {
    const messages: readonly SenseiMessage[] = [
      makeMessage({ id: '1', role: 'user', content: 'Hello' }),
      makeMessage({ id: '2', role: 'assistant', content: 'Hi there' }),
    ]
    render(<SenseiChat {...defaultProps} messages={messages} />)
    expect(screen.getByTestId('chat-bubble-user')).toHaveTextContent('Hello')
    expect(screen.getByTestId('chat-bubble-assistant')).toHaveTextContent('Hi there')
  })

  it('SC-004: renders typing indicator when isLoading is true', () => {
    const messages: readonly SenseiMessage[] = [
      makeMessage({ id: '1', role: 'user', content: 'Hello' }),
    ]
    render(<SenseiChat {...defaultProps} messages={messages} isLoading={true} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Sensei is typing')
  })

  it('SC-005: sends message on button click', () => {
    const onSend = vi.fn()
    render(<SenseiChat {...defaultProps} onSend={onSend} />)
    const textarea = screen.getByLabelText('Message input')
    fireEvent.change(textarea, { target: { value: 'Test question' } })
    fireEvent.click(screen.getByLabelText('Send message'))
    expect(onSend).toHaveBeenCalledWith('Test question')
  })

  it('SC-006: sends message on Enter key (without Shift)', () => {
    const onSend = vi.fn()
    render(<SenseiChat {...defaultProps} onSend={onSend} />)
    const textarea = screen.getByLabelText('Message input')
    fireEvent.change(textarea, { target: { value: 'Enter test' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(onSend).toHaveBeenCalledWith('Enter test')
  })

  it('SC-007: renders confirmation cards for pending tool calls', () => {
    const messages: readonly SenseiMessage[] = [
      makeMessage({ id: '1', role: 'user', content: 'Run scan' }),
    ]
    const pendingConfirmations: readonly SenseiToolCall[] = [
      { id: 'tc-1', tool: 'scan_text', args: { text: 'payload' }, status: 'pending' },
    ]
    const onConfirm = vi.fn()
    const onReject = vi.fn()
    render(
      <SenseiChat
        {...defaultProps}
        messages={messages}
        pendingConfirmations={pendingConfirmations}
        onConfirm={onConfirm}
        onReject={onReject}
      />,
    )
    expect(screen.getByText(/Confirmation required: Scan Text/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledWith('tc-1')
    fireEvent.click(screen.getByText('Cancel'))
    expect(onReject).toHaveBeenCalledWith('tc-1')
  })

  it('SC-008: disables input and send button when loading', () => {
    render(<SenseiChat {...defaultProps} isLoading={true} />)
    const textarea = screen.getByLabelText('Message input')
    expect(textarea).toBeDisabled()
    expect(screen.getByLabelText('Send message')).toBeDisabled()
  })
})
