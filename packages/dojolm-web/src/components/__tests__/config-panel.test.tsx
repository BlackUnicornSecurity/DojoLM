/**
 * File: config-panel.test.tsx
 * Purpose: Unit tests for ConfigPanel component
 * Tests: rendering, controls, accessibility, keyboard nav, save/reset, sections
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConfigPanel, type ConfigPanelProps, type ConfigSection } from '@/components/ui/ConfigPanel'

describe('ConfigPanel', () => {
  const baseSections: ConfigSection[] = [
    {
      id: 'general',
      label: 'General Settings',
      defaultOpen: true,
      controls: [
        { type: 'toggle', key: 'darkMode', label: 'Dark Mode', description: 'Enable dark theme' },
        { type: 'text', key: 'name', label: 'Project Name', placeholder: 'Enter name' },
        { type: 'number', key: 'threshold', label: 'Threshold', min: 0, max: 100, step: 5, unit: '%' },
        { type: 'dropdown', key: 'lang', label: 'Language', options: [{ value: 'en', label: 'English' }, { value: 'ja', label: 'Japanese' }] },
      ],
    },
    {
      id: 'advanced',
      label: 'Advanced',
      defaultOpen: false,
      controls: [
        { type: 'textarea', key: 'notes', label: 'Notes', placeholder: 'Add notes', rows: 4 },
        { type: 'radiogroup', key: 'mode', label: 'Mode', options: [{ value: 'fast', label: 'Fast' }, { value: 'safe', label: 'Safe' }] },
      ],
    },
  ]

  const defaultProps: ConfigPanelProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Config',
    sections: baseSections,
    values: { darkMode: true, name: 'My Project', threshold: 50, lang: 'en', notes: '', mode: 'fast' },
    onChange: vi.fn(),
    onSave: vi.fn(),
    onReset: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // CP-001: Returns null when not open
  it('CP-001: renders nothing when isOpen is false', () => {
    const { container } = render(<ConfigPanel {...defaultProps} isOpen={false} />)
    expect(container.innerHTML).toBe('')
  })

  // CP-002: Renders dialog with aria-modal
  it('CP-002: renders a dialog with aria-modal="true"', () => {
    render(<ConfigPanel {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  // CP-003: Dialog has correct aria-label
  it('CP-003: dialog has aria-label with title', () => {
    render(<ConfigPanel {...defaultProps} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Test Config configuration')
  })

  // CP-004: Renders title
  it('CP-004: renders the panel title', () => {
    render(<ConfigPanel {...defaultProps} />)
    expect(screen.getByText('Test Config')).toBeInTheDocument()
  })

  // CP-005: Close button calls onClose
  it('CP-005: close button calls onClose', () => {
    const onClose = vi.fn()
    render(<ConfigPanel {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close configuration/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  // CP-006: Save button calls onSave and onClose
  it('CP-006: save button calls onSave then onClose', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<ConfigPanel {...defaultProps} onSave={onSave} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /save configuration/i }))
    expect(onSave).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  // CP-007: Reset button calls onReset
  it('CP-007: reset button calls onReset', () => {
    const onReset = vi.fn()
    render(<ConfigPanel {...defaultProps} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  // CP-008: Toggle control renders with aria-checked
  it('CP-008: toggle control renders with correct aria-checked state', () => {
    render(<ConfigPanel {...defaultProps} />)
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  // CP-009: Toggle fires onChange on click
  it('CP-009: clicking toggle fires onChange with negated value', () => {
    const onChange = vi.fn()
    render(<ConfigPanel {...defaultProps} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith('darkMode', false)
  })

  // CP-010: Text input renders with value
  it('CP-010: text input renders with current value', () => {
    render(<ConfigPanel {...defaultProps} />)
    const input = screen.getByLabelText('Project Name')
    expect(input).toHaveValue('My Project')
  })

  // CP-011: Text input fires onChange
  it('CP-011: typing in text input fires onChange', () => {
    const onChange = vi.fn()
    render(<ConfigPanel {...defaultProps} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'New Name' } })
    expect(onChange).toHaveBeenCalledWith('name', 'New Name')
  })

  // CP-012: Dropdown renders with options
  it('CP-012: dropdown renders with correct options', () => {
    render(<ConfigPanel {...defaultProps} />)
    const select = screen.getByLabelText('Language')
    expect(select).toHaveValue('en')
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Japanese')).toBeInTheDocument()
  })

  // CP-013: Number/range control renders
  it('CP-013: number range control renders with value and unit', () => {
    render(<ConfigPanel {...defaultProps} />)
    expect(screen.getByText('50 %')).toBeInTheDocument()
  })

  // CP-014: Section labels are rendered
  it('CP-014: renders section labels', () => {
    render(<ConfigPanel {...defaultProps} />)
    expect(screen.getByText('General Settings')).toBeInTheDocument()
    expect(screen.getByText('Advanced')).toBeInTheDocument()
  })

  // CP-015: Escape key closes the panel
  it('CP-015: pressing Escape key calls onClose', () => {
    const onClose = vi.fn()
    render(<ConfigPanel {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
