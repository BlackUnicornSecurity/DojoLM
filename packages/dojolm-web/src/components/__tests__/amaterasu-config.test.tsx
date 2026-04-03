/**
 * File: amaterasu-config.test.tsx
 * Purpose: Unit tests for AmaterasuConfig component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (d: string) => d,
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => <span data-testid="icon" {...props} />
  return { X: Icon, ChevronDown: Icon, RotateCcw: Icon }
})

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
}))

vi.mock('@/components/ui/ConfigPanel', () => ({
  ConfigPanel: ({
    isOpen,
    title,
    sections,
    values,
    onChange,
    onSave,
    onReset,
    onClose,
  }: {
    isOpen: boolean
    title: string
    sections: { id: string; label: string }[]
    values: Record<string, unknown>
    onChange: (key: string, value: unknown) => void
    onSave: () => void
    onReset: () => void
    onClose: () => void
  }) =>
    isOpen ? (
      <div data-testid="config-panel">
        <h2>{title}</h2>
        {sections.map((s) => (
          <div key={s.id} data-testid={`section-${s.id}`}>{s.label}</div>
        ))}
        <div data-testid="config-values">{JSON.stringify(values)}</div>
        <button data-testid="save-btn" onClick={onSave}>Save</button>
        <button data-testid="reset-btn" onClick={onReset}>Reset</button>
        <button data-testid="close-btn" onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

import { AmaterasuConfig } from '../attackdna/AmaterasuConfig'

const mockLocalStorage: Record<string, string> = {}
let setItemSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k])

  const origGetItem = localStorage.getItem.bind(localStorage)
  const origSetItem = localStorage.setItem.bind(localStorage)

  setItemSpy = vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value
  })

  vi.spyOn(localStorage, 'getItem').mockImplementation((key: string) => mockLocalStorage[key] ?? null)
  vi.spyOn(localStorage, 'setItem').mockImplementation(setItemSpy)
  vi.spyOn(localStorage, 'removeItem').mockImplementation((key: string) => {
    delete mockLocalStorage[key]
  })
})

describe('AmaterasuConfig', () => {
  it('renders without crashing when open', () => {
    expect(render(<AmaterasuConfig isOpen={true} onClose={vi.fn()} />).container).toBeTruthy()
  })

  it('does not render when closed', () => {
    render(<AmaterasuConfig isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByTestId('config-panel')).not.toBeInTheDocument()
  })

  it('displays "Amaterasu DNA" title', () => {
    render(<AmaterasuConfig isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Amaterasu DNA')).toBeInTheDocument()
  })

  it('loads default config values', () => {
    render(<AmaterasuConfig isOpen={true} onClose={vi.fn()} />)
    const valuesEl = screen.getByTestId('config-values')
    const values = JSON.parse(valuesEl.textContent!)
    expect(values.similarityThreshold).toBe(0.75)
    expect(values.maxTreeDepth).toBe(10)
    expect(values.clusterAlgorithm).toBe('dbscan')
    expect(values.timelineGrouping).toBe('day')
  })

  it('validates similarityThreshold range (clamped to 0.1-1)', () => {
    mockLocalStorage['amaterasu-config'] = JSON.stringify({ similarityThreshold: 5.0 })
    render(<AmaterasuConfig isOpen={true} onClose={vi.fn()} />)
    const valuesEl = screen.getByTestId('config-values')
    const values = JSON.parse(valuesEl.textContent!)
    expect(values.similarityThreshold).toBeLessThanOrEqual(1)
    expect(values.similarityThreshold).toBeGreaterThanOrEqual(0.1)
  })

  it('validates maxTreeDepth range (clamped to 3-25)', () => {
    mockLocalStorage['amaterasu-config'] = JSON.stringify({ maxTreeDepth: 100 })
    render(<AmaterasuConfig isOpen={true} onClose={vi.fn()} />)
    const valuesEl = screen.getByTestId('config-values')
    const values = JSON.parse(valuesEl.textContent!)
    expect(values.maxTreeDepth).toBeLessThanOrEqual(25)
    expect(values.maxTreeDepth).toBeGreaterThanOrEqual(3)
  })

  it('provides onSave callback that persists to localStorage', () => {
    render(<AmaterasuConfig isOpen={true} onClose={vi.fn()} />)
    setItemSpy.mockClear()
    fireEvent.click(screen.getByTestId('save-btn'))
    expect(setItemSpy).toHaveBeenCalledWith('amaterasu-config', expect.any(String))
  })

  it('resets config values on reset', () => {
    mockLocalStorage['amaterasu-config'] = JSON.stringify({ similarityThreshold: 0.5 })
    render(<AmaterasuConfig isOpen={true} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('reset-btn'))
    const valuesEl = screen.getByTestId('config-values')
    const values = JSON.parse(valuesEl.textContent!)
    expect(values.similarityThreshold).toBe(0.75)
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<AmaterasuConfig isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('close-btn'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders config sections', () => {
    render(<AmaterasuConfig isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByTestId('section-graph')).toBeInTheDocument()
    expect(screen.getByTestId('section-algorithms')).toBeInTheDocument()
    expect(screen.getByTestId('section-display')).toBeInTheDocument()
  })
})
