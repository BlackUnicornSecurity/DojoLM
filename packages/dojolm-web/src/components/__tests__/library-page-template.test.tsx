/**
 * File: library-page-template.test.tsx
 * Purpose: Unit tests for LibraryPageTemplate component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => <span data-testid="icon" {...props} />
  return {
    Search: Icon, Grid3X3: Icon, List: Icon, ChevronLeft: Icon,
    ChevronRight: Icon, X: Icon,
  }
})

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
}))

import { LibraryPageTemplate } from '../ui/LibraryPageTemplate'

interface TestItem {
  id: string
  name: string
  category: string
}

function makeItems(count: number): TestItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    name: `Item ${i + 1}`,
    category: i % 2 === 0 ? 'A' : 'B',
  }))
}

const defaultColumns = [
  {
    key: 'name',
    label: 'Name',
    render: (item: TestItem) => <span>{item.name}</span>,
    sortFn: (a: TestItem, b: TestItem) => a.name.localeCompare(b.name),
  },
  {
    key: 'category',
    label: 'Category',
    render: (item: TestItem) => <span>{item.category}</span>,
  },
]

const defaultProps = {
  title: 'Test Library',
  items: makeItems(5),
  columns: defaultColumns,
  itemKey: (item: TestItem) => item.id,
  searchFn: (item: TestItem, query: string) => item.name.toLowerCase().includes(query),
}

describe('LibraryPageTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(render(<LibraryPageTemplate {...defaultProps} />).container).toBeTruthy()
  })

  it('renders items in grid', () => {
    render(<LibraryPageTemplate {...defaultProps} />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 5')).toBeInTheDocument()
  })

  it('shows item count', () => {
    render(<LibraryPageTemplate {...defaultProps} />)
    expect(screen.getByText('5 items found')).toBeInTheDocument()
  })

  it('search filtering works', () => {
    render(<LibraryPageTemplate {...defaultProps} />)
    const searchInput = screen.getByRole('textbox', { name: /search test library/i })
    fireEvent.change(searchInput, { target: { value: 'Item 3' } })
    expect(screen.getByText('Item 3')).toBeInTheDocument()
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
    expect(screen.getByText('1 item found')).toBeInTheDocument()
  })

  it('pagination renders with correct bounds', () => {
    render(<LibraryPageTemplate {...defaultProps} items={makeItems(30)} pageSize={10} />)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Previous page')).toBeDisabled()
    expect(screen.getByLabelText('Next page')).not.toBeDisabled()
  })

  it('pagination navigates forward and back', () => {
    render(<LibraryPageTemplate {...defaultProps} items={makeItems(30)} pageSize={10} />)
    fireEvent.click(screen.getByLabelText('Next page'))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Previous page'))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('does not render pagination when items fit on one page', () => {
    render(<LibraryPageTemplate {...defaultProps} />)
    expect(screen.queryByLabelText('Next page')).not.toBeInTheDocument()
  })

  it('empty state shown when no items', () => {
    render(
      <LibraryPageTemplate
        {...defaultProps}
        items={[]}
        emptyTitle="Nothing here"
        emptyDescription="Try something else"
      />,
    )
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('empty state shown when search yields no results', () => {
    render(<LibraryPageTemplate {...defaultProps} />)
    const searchInput = screen.getByRole('textbox', { name: /search test library/i })
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('search placeholder includes title', () => {
    render(<LibraryPageTemplate {...defaultProps} />)
    const searchInput = screen.getByRole('textbox', { name: /search test library/i })
    expect(searchInput).toHaveAttribute('placeholder', 'Search test library...')
  })

  it('view toggle switches between grid and list', () => {
    render(<LibraryPageTemplate {...defaultProps} />)
    const listBtn = screen.getByLabelText('List view')
    fireEvent.click(listBtn)
    expect(listBtn).toHaveAttribute('aria-pressed', 'true')
    const gridBtn = screen.getByLabelText('Grid view')
    fireEvent.click(gridBtn)
    expect(gridBtn).toHaveAttribute('aria-pressed', 'true')
  })
})
