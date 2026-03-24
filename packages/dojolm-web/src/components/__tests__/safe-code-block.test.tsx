/**
 * File: safe-code-block.test.tsx
 * Purpose: Unit tests for SafeCodeBlock component
 * Tests: rendering, syntax highlighting, copy button, truncation, XSS safety, accessibility
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SafeCodeBlock } from '@/components/ui/SafeCodeBlock'

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: { writeText: mockWriteText },
})

describe('SafeCodeBlock', () => {
  beforeEach(() => {
    mockWriteText.mockClear()
  })

  // SCB-001: Renders code content as text
  it('SCB-001: renders the code string as visible text', () => {
    render(<SafeCodeBlock code="const x = 42" language="javascript" />)
    expect(screen.getByText(/const/)).toBeInTheDocument()
    expect(screen.getByText(/42/)).toBeInTheDocument()
  })

  // SCB-002: Displays language label
  it('SCB-002: displays the language label in the header', () => {
    render(<SafeCodeBlock code="print('hi')" language="python" />)
    expect(screen.getByText('python')).toBeInTheDocument()
  })

  // SCB-003: Falls back to "text" when no language specified
  it('SCB-003: displays "text" when no language is provided', () => {
    render(<SafeCodeBlock code="hello world" />)
    expect(screen.getByText('text')).toBeInTheDocument()
  })

  // SCB-004: Renders copy button with correct aria-label
  it('SCB-004: renders a copy button with accessible label', () => {
    render(<SafeCodeBlock code="test" />)
    const btn = screen.getByRole('button', { name: /copy code to clipboard/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
  })

  // SCB-005: Copy button invokes clipboard API
  it('SCB-005: clicking copy writes code to clipboard', async () => {
    render(<SafeCodeBlock code="const a = 1" language="js" />)
    const btn = screen.getByRole('button', { name: /copy code to clipboard/i })
    await act(async () => {
      fireEvent.click(btn)
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('const a = 1')
    })
  })

  // SCB-006: After copy, aria-label changes to "Copied to clipboard"
  it('SCB-006: shows "Copied to clipboard" label after copy', async () => {
    render(<SafeCodeBlock code="x" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy code to clipboard/i }))
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied to clipboard/i })).toBeInTheDocument()
    })
  })

  // SCB-007: Truncation indicator appears when maxLines exceeded
  it('SCB-007: shows truncation indicator when code exceeds maxLines', () => {
    const code = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n')
    render(<SafeCodeBlock code={code} maxLines={5} />)
    expect(screen.getByText(/15 more lines/)).toBeInTheDocument()
  })

  // SCB-008: No truncation indicator when lines fit within maxLines
  it('SCB-008: does not show truncation when lines are within maxLines', () => {
    const code = 'line1\nline2\nline3'
    render(<SafeCodeBlock code={code} maxLines={10} />)
    expect(screen.queryByText(/more line/)).not.toBeInTheDocument()
  })

  // SCB-009: Singular "line" for exactly 1 hidden line
  it('SCB-009: shows singular "line" when exactly 1 line is hidden', () => {
    const code = 'a\nb\nc'
    render(<SafeCodeBlock code={code} maxLines={2} />)
    expect(screen.getByText(/1 more line\b/)).toBeInTheDocument()
  })

  // SCB-010: XSS safety — HTML tags rendered as text, not as DOM elements
  it('SCB-010: renders HTML tags as visible text (XSS safe)', () => {
    const malicious = '<img onerror="alert(1)" src=x>'
    const { container } = render(<SafeCodeBlock code={malicious} />)
    // The malicious string should appear as text content within the code block
    expect(container.querySelector('code')?.textContent).toContain('onerror')
    // No actual img element should be created in the DOM
    expect(container.querySelector('img[onerror]')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  // SCB-011: Applies custom className
  it('SCB-011: applies additional className to the container', () => {
    const { container } = render(<SafeCodeBlock code="test" className="my-custom-class" />)
    expect(container.firstChild).toHaveClass('my-custom-class')
  })

  // SCB-012: Syntax highlights keywords for JavaScript
  it('SCB-012: highlights JavaScript keywords with keyword class', () => {
    const { container } = render(<SafeCodeBlock code="const x = 1" language="javascript" />)
    const spans = container.querySelectorAll('span')
    const keywordSpan = Array.from(spans).find(s => s.textContent === 'const')
    expect(keywordSpan).toBeTruthy()
    expect(keywordSpan?.className).toContain('syntax-keyword')
  })

  // SCB-013: Highlights string literals
  it('SCB-013: highlights string literals with string class', () => {
    const { container } = render(<SafeCodeBlock code={`const s = "hello"`} language="javascript" />)
    const spans = container.querySelectorAll('span')
    const strSpan = Array.from(spans).find(s => s.textContent === '"hello"')
    expect(strSpan).toBeTruthy()
    expect(strSpan?.className).toContain('syntax-string')
  })

  // SCB-014: Highlights comments
  it('SCB-014: highlights single-line comments with comment class', () => {
    const { container } = render(<SafeCodeBlock code="// a comment" language="javascript" />)
    const spans = container.querySelectorAll('span')
    const commentSpan = Array.from(spans).find(s => s.textContent === '// a comment')
    expect(commentSpan).toBeTruthy()
    expect(commentSpan?.className).toContain('syntax-comment')
  })

  // SCB-015: Python hash comments are highlighted
  it('SCB-015: highlights Python hash comments', () => {
    const { container } = render(<SafeCodeBlock code="# a comment" language="python" />)
    const spans = container.querySelectorAll('span')
    const commentSpan = Array.from(spans).find(s => s.textContent === '# a comment')
    expect(commentSpan).toBeTruthy()
    expect(commentSpan?.className).toContain('syntax-comment')
  })
})
