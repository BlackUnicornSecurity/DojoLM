/**
 * File: sortable-table.test.tsx
 * Purpose: Unit tests for SortableTable component
 * Tests: rendering, sorting, empty state, row clicks, accessibility, custom renderers
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SortableTable, type Column } from '@/components/ui/SortableTable'

interface TestRow extends Record<string, unknown> {
  id: string
  name: string
  score: number
  status: string
}

const columns: Column<TestRow>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'score', label: 'Score', sortable: true },
  { key: 'status', label: 'Status' },
]

const sampleData: TestRow[] = [
  { id: '1', name: 'Alpha', score: 90, status: 'active' },
  { id: '2', name: 'Beta', score: 75, status: 'inactive' },
  { id: '3', name: 'Gamma', score: 85, status: 'active' },
]

describe('SortableTable', () => {
  // ST-001: Renders column headers
  it('ST-001: renders all column headers', () => {
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Score')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  // ST-002: Renders data rows
  it('ST-002: renders all data rows', () => {
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  // ST-003: Shows empty message when no data
  it('ST-003: displays empty message when data is empty', () => {
    render(<SortableTable data={[]} columns={columns} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  // ST-004: Custom empty message
  it('ST-004: displays custom empty message', () => {
    render(<SortableTable data={[]} columns={columns} emptyMessage="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  // ST-005: Sortable columns have aria-label
  it('ST-005: sortable column headers have aria-label for sorting', () => {
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" />)
    expect(screen.getByLabelText('Sort by Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Sort by Score')).toBeInTheDocument()
  })

  // ST-006: Non-sortable columns do not have sort aria-label
  it('ST-006: non-sortable columns lack sort aria-label', () => {
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" />)
    expect(screen.queryByLabelText('Sort by Status')).not.toBeInTheDocument()
  })

  // ST-007: Clicking sortable column sorts ascending first
  it('ST-007: clicking sortable column sorts data ascending', () => {
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" />)
    fireEvent.click(screen.getByLabelText('Sort by Name'))
    const cells = screen.getAllByRole('cell')
    const names = cells.filter((_, i) => i % 3 === 0).map(c => c.textContent)
    expect(names).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  // ST-008: Second click sorts descending
  it('ST-008: second click on same column sorts descending', () => {
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" />)
    const header = screen.getByLabelText('Sort by Name')
    fireEvent.click(header) // asc
    fireEvent.click(header) // desc
    const cells = screen.getAllByRole('cell')
    const names = cells.filter((_, i) => i % 3 === 0).map(c => c.textContent)
    expect(names).toEqual(['Gamma', 'Beta', 'Alpha'])
  })

  // ST-009: Third click clears sort (returns to original order)
  it('ST-009: third click clears sorting', () => {
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" />)
    const header = screen.getByLabelText('Sort by Name')
    fireEvent.click(header) // asc
    fireEvent.click(header) // desc
    fireEvent.click(header) // clear
    const cells = screen.getAllByRole('cell')
    const names = cells.filter((_, i) => i % 3 === 0).map(c => c.textContent)
    // Original order
    expect(names).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  // ST-010: aria-sort is set on active sort column
  it('ST-010: sets aria-sort on the actively sorted column', () => {
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" />)
    fireEvent.click(screen.getByLabelText('Sort by Score'))
    const scoreHeader = screen.getByLabelText('Sort by Score')
    expect(scoreHeader).toHaveAttribute('aria-sort', 'ascending')
  })

  // ST-011: onRowClick callback fires with correct row
  it('ST-011: clicking a row fires onRowClick with the row data', () => {
    const onClick = vi.fn()
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" onRowClick={onClick} />)
    fireEvent.click(screen.getByText('Alpha'))
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: '1', name: 'Alpha' }))
  })

  // ST-012: Custom render function for a column
  it('ST-012: uses custom render function for column cells', () => {
    const customColumns: Column<TestRow>[] = [
      { key: 'name', label: 'Name' },
      { key: 'score', label: 'Score', render: (val) => <span data-testid="custom">{String(val)}pts</span> },
    ]
    render(<SortableTable data={sampleData} columns={customColumns} rowKey="id" />)
    const customs = screen.getAllByTestId('custom')
    expect(customs[0]).toHaveTextContent('90pts')
  })

  // ST-013: Keyboard activation (Enter) triggers sort
  it('ST-013: pressing Enter on sortable header triggers sort', () => {
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" />)
    const header = screen.getByLabelText('Sort by Score')
    fireEvent.keyDown(header, { key: 'Enter' })
    expect(header).toHaveAttribute('aria-sort', 'ascending')
  })

  // ST-014: Keyboard activation (Space) triggers sort
  it('ST-014: pressing Space on sortable header triggers sort', () => {
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" />)
    const header = screen.getByLabelText('Sort by Score')
    fireEvent.keyDown(header, { key: ' ' })
    expect(header).toHaveAttribute('aria-sort', 'ascending')
  })

  // ST-015: Sortable headers have tabIndex=0
  it('ST-015: sortable column headers are focusable with tabIndex', () => {
    render(<SortableTable data={sampleData} columns={columns} rowKey="id" />)
    const header = screen.getByLabelText('Sort by Name')
    expect(header).toHaveAttribute('tabindex', '0')
  })
})
