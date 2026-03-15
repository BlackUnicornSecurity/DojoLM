/**
 * File: scanner-input.test.tsx
 * Purpose: Unit tests for ScannerInput component
 * Test IDs: SI-001 to SI-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/ScannerContext', () => ({
  useScanner: () => ({
    consumePendingPayload: vi.fn().mockReturnValue(null),
  }),
}))

vi.mock('../scanner/QuickChips', () => ({
  QuickChips: ({ onLoadPayload, isScanning }: { onLoadPayload: (text: string, autoScan?: boolean) => void; isScanning: boolean }) => (
    <div data-testid="quick-chips">
      <button data-testid="chip-btn" onClick={() => onLoadPayload('test payload', false)} disabled={isScanning}>
        chip
      </button>
    </div>
  ),
}))

vi.mock('../scanner/ScanningState', () => ({
  ScanningState: ({ className }: { className?: string }) => (
    <div data-testid="scanning-state" className={className}>Scanning...</div>
  ),
}))

vi.mock('lucide-react', () => ({
  Scan: () => <span>ScanIcon</span>,
  Trash2: () => <span>TrashIcon</span>,
  Upload: () => <span>UploadIcon</span>,
  Image: () => <span>ImageIcon</span>,
  Music: () => <span>MusicIcon</span>,
  FileText: () => <span>FileTextIcon</span>,
  X: () => <span>XIcon</span>,
}))

import { ScannerInput } from '../scanner/ScannerInput'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ScannerInput', () => {
  const defaultProps = {
    onScan: vi.fn(),
    onClear: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SI-001: renders the input text title', () => {
    render(<ScannerInput {...defaultProps} />)
    expect(screen.getByText('Input Text')).toBeInTheDocument()
  })

  it('SI-002: renders textarea with correct placeholder', () => {
    render(<ScannerInput {...defaultProps} />)
    expect(screen.getByLabelText('Enter text to scan for prompt injection')).toBeInTheDocument()
  })

  it('SI-003: scan button is disabled when textarea is empty', () => {
    render(<ScannerInput {...defaultProps} />)
    const scanBtn = screen.getByText('Scan').closest('button')!
    expect(scanBtn).toBeDisabled()
  })

  it('SI-004: scan button is enabled after typing text', async () => {
    const user = userEvent.setup()
    render(<ScannerInput {...defaultProps} />)
    const textarea = screen.getByLabelText('Enter text to scan for prompt injection')
    await user.type(textarea, 'Hello')
    const scanBtn = screen.getByText('Scan').closest('button')!
    expect(scanBtn).not.toBeDisabled()
  })

  it('SI-005: clicking scan calls onScan with text', async () => {
    const user = userEvent.setup()
    render(<ScannerInput {...defaultProps} />)
    const textarea = screen.getByLabelText('Enter text to scan for prompt injection')
    await user.type(textarea, 'test input')
    const scanBtn = screen.getByText('Scan').closest('button')!
    await user.click(scanBtn)
    expect(defaultProps.onScan).toHaveBeenCalledWith('test input', ['text'])
  })

  it('SI-013: renders upload file button', () => {
    render(<ScannerInput {...defaultProps} />)
    expect(screen.getByText('Upload File')).toBeInTheDocument()
  })

  it('SI-014: upload button is disabled when scanning', () => {
    render(<ScannerInput {...defaultProps} isScanning={true} />)
    const uploadBtn = screen.getByText('Upload File').closest('button')!
    expect(uploadBtn).toBeDisabled()
  })

  it('SI-015: renders file type description text', () => {
    render(<ScannerInput {...defaultProps} />)
    expect(screen.getByText(/Images.*Audio.*Documents/)).toBeInTheDocument()
  })

  it('SI-006: clicking clear resets text and calls onClear', async () => {
    const user = userEvent.setup()
    render(<ScannerInput {...defaultProps} />)
    const textarea = screen.getByLabelText('Enter text to scan for prompt injection') as HTMLTextAreaElement
    await user.type(textarea, 'some text')
    const clearBtn = screen.getByText('Clear').closest('button')!
    await user.click(clearBtn)
    expect(defaultProps.onClear).toHaveBeenCalled()
    expect(textarea.value).toBe('')
  })

  it('SI-007: textarea is disabled when isScanning is true', () => {
    render(<ScannerInput {...defaultProps} isScanning={true} />)
    const textarea = screen.getByLabelText('Enter text to scan for prompt injection')
    expect(textarea).toBeDisabled()
  })

  it('SI-008: shows scanning state when isScanning is true', () => {
    render(<ScannerInput {...defaultProps} isScanning={true} />)
    expect(screen.getByTestId('scanning-state')).toBeInTheDocument()
  })

  it('SI-009: does not show scanning state when isScanning is false', () => {
    render(<ScannerInput {...defaultProps} isScanning={false} />)
    expect(screen.queryByTestId('scanning-state')).not.toBeInTheDocument()
  })

  it('SI-010: scan button shows "Scanning..." text when isScanning', () => {
    render(<ScannerInput {...defaultProps} isScanning={true} />)
    expect(screen.getAllByText('Scanning...').length).toBeGreaterThanOrEqual(1)
    // The button text changes to "Scanning..."
    const scanBtn = screen.getAllByText('Scanning...').find(el => el.closest('button'))
    expect(scanBtn).toBeTruthy()
  })

  it('SI-011: scan button disabled when allEnginesDisabled', async () => {
    const user = userEvent.setup()
    render(<ScannerInput {...defaultProps} allEnginesDisabled={true} />)
    const textarea = screen.getByLabelText('Enter text to scan for prompt injection')
    await user.type(textarea, 'text')
    const scanBtn = screen.getByText('Scan').closest('button')!
    expect(scanBtn).toBeDisabled()
  })

  it('SI-012: QuickChips onLoadPayload sets textarea text', async () => {
    const user = userEvent.setup()
    render(<ScannerInput {...defaultProps} />)
    const chipBtn = screen.getByTestId('chip-btn')
    await user.click(chipBtn)
    const textarea = screen.getByLabelText('Enter text to scan for prompt injection') as HTMLTextAreaElement
    expect(textarea.value).toBe('test payload')
  })
})
