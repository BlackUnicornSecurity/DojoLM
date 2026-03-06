/**
 * File: fixture-explorer.test.tsx
 * Purpose: Unit tests for Armory / Fixture Explorer components
 * Test IDs: ARM-001 to ARM-010
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel, ...rest }: Record<string, unknown>) => (
    <button onClick={onClick as () => void} aria-label={ariaLabel as string}>{children as React.ReactNode}</button>
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

vi.mock('../fixtures/FixtureCategoryCard', () => ({
  FixtureCategoryCard: ({ name, onViewFiles }: { name: string; onViewFiles: (n: string) => void }) => (
    <div data-testid={`category-card-${name}`} onClick={() => onViewFiles(name)}>
      {name}
    </div>
  ),
}));

vi.mock('../fixtures/FixtureFilters', () => ({
  FixtureFilters: () => <div data-testid="fixture-filters" />,
  INITIAL_FILTER_STATE: { severity: 'all', brand: 'all', type: 'all', search: '' },
  filterManifest: (manifest: Record<string, unknown>) => (manifest as { categories: Record<string, unknown> }).categories,
  countFilteredFixtures: (cats: Record<string, { files: unknown[] }>) =>
    Object.values(cats).reduce((sum, cat) => sum + cat.files.length, 0),
}));

import { FixtureExplorer } from '../fixtures/FixtureExplorer';
import { CategoryTree } from '../fixtures/CategoryTree';
import { FixtureSearch } from '../fixtures/FixtureSearch';
import { MediaViewer } from '../fixtures/MediaViewer';

// ---------------------------------------------------------------------------
// Fixtures (test data)
// ---------------------------------------------------------------------------

function makeManifest() {
  return {
    version: '2.1',
    totalFixtures: 5,
    categories: {
      web: {
        story: 'S42',
        desc: 'Web-based injection attacks',
        files: [
          { file: 'xss-basic.txt', clean: false, attack: 'XSS', severity: 'CRITICAL' as const },
          { file: 'xss-clean.txt', clean: true, attack: undefined, severity: undefined },
        ],
      },
      social: {
        story: 'S43',
        desc: 'Social engineering attacks',
        files: [
          { file: 'phishing.txt', clean: false, attack: 'Phishing', severity: 'WARNING' as const },
          { file: 'benign-chat.txt', clean: true, attack: undefined, severity: undefined },
          { file: 'impersonation.txt', clean: false, attack: 'Impersonation', severity: 'CRITICAL' as const },
        ],
      },
    },
  };
}

// ---------------------------------------------------------------------------
// FixtureExplorer Tests
// ---------------------------------------------------------------------------

describe('FixtureExplorer', () => {
  const defaultProps = {
    manifest: makeManifest(),
    isLoading: false,
    onScanFixture: vi.fn(),
    onViewFixture: vi.fn(),
  };

  // ARM-001: FixtureExplorer renders with view tabs
  it('ARM-001: renders with Tree, Search, and Grid view mode buttons', () => {
    render(<FixtureExplorer {...defaultProps} />);

    expect(screen.getByLabelText('Tree view')).toBeInTheDocument();
    expect(screen.getByLabelText('Search view')).toBeInTheDocument();
    expect(screen.getByLabelText('Grid view')).toBeInTheDocument();
    expect(screen.getByText('Fixture Explorer')).toBeInTheDocument();
  });

  // ARM-002: Stats shown
  it('ARM-002: displays category and fixture counts', () => {
    render(<FixtureExplorer {...defaultProps} />);

    expect(screen.getByText('2 categories')).toBeInTheDocument();
    expect(screen.getByText('5 fixtures')).toBeInTheDocument();
  });

  // ARM-004: View switching between tree/search/grid
  it('ARM-004: clicking view buttons switches between tree, search, and grid modes', () => {
    render(<FixtureExplorer {...defaultProps} />);

    // Default is grid mode
    const gridBtn = screen.getByLabelText('Grid view');
    expect(gridBtn).toHaveAttribute('aria-pressed', 'true');

    // Switch to tree
    fireEvent.click(screen.getByLabelText('Tree view'));
    expect(screen.getByLabelText('Tree view')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Grid view')).toHaveAttribute('aria-pressed', 'false');

    // Switch to search
    fireEvent.click(screen.getByLabelText('Search view'));
    expect(screen.getByLabelText('Search view')).toHaveAttribute('aria-pressed', 'true');
  });

  // ARM-005: Grid view shows category cards
  it('ARM-005: grid view renders category cards that can be drilled into', () => {
    render(<FixtureExplorer {...defaultProps} />);

    // Grid is default mode
    expect(screen.getByTestId('category-card-social')).toBeInTheDocument();
    expect(screen.getByTestId('category-card-web')).toBeInTheDocument();
  });

  // ARM-006: Drill-down into a category in grid view
  it('ARM-006: clicking a category card in grid mode shows file listing', () => {
    render(<FixtureExplorer {...defaultProps} />);

    fireEvent.click(screen.getByTestId('category-card-web'));

    // Should now show the file list with fixture filenames
    expect(screen.getByText('xss-basic.txt')).toBeInTheDocument();
    expect(screen.getByText('xss-clean.txt')).toBeInTheDocument();
    // Breadcrumb shows Armory root
    expect(screen.getByText('Armory')).toBeInTheDocument();
  });

  // ARM-007: Compare mode toggle
  it('ARM-007: compare mode button toggles compare mode banner', () => {
    render(<FixtureExplorer {...defaultProps} />);

    const compareBtn = screen.getByLabelText('Enter compare mode');
    fireEvent.click(compareBtn);

    expect(screen.getByText(/Select 2 fixtures to compare/)).toBeInTheDocument();
  });

  // ARM-008: Loading shows skeleton
  it('ARM-008: shows skeleton loading state when isLoading is true', () => {
    render(<FixtureExplorer {...defaultProps} isLoading={true} />);

    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ARM-009: Null manifest shows error state
  it('ARM-009: shows error state when manifest is null', () => {
    render(<FixtureExplorer {...defaultProps} manifest={null} />);

    expect(screen.getByText('Failed to load fixture manifest')).toBeInTheDocument();
  });

  // ARM-010: Version badge shown
  it('ARM-010: displays manifest version badge', () => {
    render(<FixtureExplorer {...defaultProps} />);

    expect(screen.getByText('v2.1')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CategoryTree Tests
// ---------------------------------------------------------------------------

describe('CategoryTree', () => {
  const categories = {
    web: {
      story: 'S42',
      desc: 'Web attacks',
      files: [
        { file: 'xss.txt', clean: false, attack: 'XSS', severity: 'CRITICAL' as const },
        { file: 'clean.txt', clean: true },
      ],
    },
    social: {
      story: 'S43',
      desc: 'Social engineering',
      files: [
        { file: 'phish.txt', clean: false, attack: 'Phishing', severity: 'WARNING' as const },
      ],
    },
  };

  // ARM-002b: CategoryTree renders categories
  it('ARM-002b: renders sorted category list with correct labels', () => {
    render(
      <CategoryTree
        categories={categories}
        selectedCategory={null}
        onSelectCategory={vi.fn()}
      />
    );

    expect(screen.getByText('Attack Techniques')).toBeInTheDocument();
    expect(screen.getByText('social')).toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
  });

  it('ARM-002c: category node click calls onSelectCategory', () => {
    const onSelect = vi.fn();
    render(
      <CategoryTree
        categories={categories}
        selectedCategory={null}
        onSelectCategory={onSelect}
      />
    );

    // Click the category button for 'web'
    const webButton = screen.getByLabelText(/web category/);
    fireEvent.click(webButton);
    expect(onSelect).toHaveBeenCalledWith('web');
  });
});

// ---------------------------------------------------------------------------
// FixtureSearch Tests
// ---------------------------------------------------------------------------

describe('FixtureSearch', () => {
  const categories = {
    web: {
      story: 'S42',
      desc: 'Web attacks',
      files: [
        { file: 'xss-basic.txt', clean: false, attack: 'XSS basic', severity: 'CRITICAL' as const },
        { file: 'clean-web.txt', clean: true },
      ],
    },
  };

  // ARM-003: FixtureSearch filters on input
  it('ARM-003: renders search input with correct placeholder', () => {
    render(
      <FixtureSearch
        categories={categories}
        onSelectFixture={vi.fn()}
      />
    );

    const input = screen.getByLabelText('Search fixtures by name, category, or attack type');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search fixtures...');
  });

  it('ARM-003b: shows result count', () => {
    render(
      <FixtureSearch
        categories={categories}
        onSelectFixture={vi.fn()}
      />
    );

    // All items shown initially (2 results)
    expect(screen.getByText('2 results')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MediaViewer Tests
// ---------------------------------------------------------------------------

describe('MediaViewer', () => {
  // ARM-005b: MediaViewer renders image type correctly
  it('ARM-005b: renders Image Preview for .png files', () => {
    render(<MediaViewer path="web/test.png" size={1024} />);

    expect(screen.getByText('Image Preview')).toBeInTheDocument();
    expect(screen.getByText('IMAGE')).toBeInTheDocument();
  });

  it('ARM-005c: renders Audio Player for .mp3 files', () => {
    render(<MediaViewer path="audio/test.mp3" size={2048} />);

    expect(screen.getByText('Audio Player')).toBeInTheDocument();
    expect(screen.getByText('AUDIO')).toBeInTheDocument();
  });

  it('ARM-005d: renders Hex Preview for binary files', () => {
    render(<MediaViewer path="binary/test.bin" hexPreview="48656c6c6f" size={512} />);

    expect(screen.getByText('Hex Preview (first 256 bytes)')).toBeInTheDocument();
    expect(screen.getByText('BINARY')).toBeInTheDocument();
  });

  it('ARM-005e: SVG files are treated as binary (not rendered as images for security)', () => {
    // .svg is NOT in MEDIA_EXTENSIONS, so it falls to binary type
    render(<MediaViewer path="images/evil.svg" size={256} />);

    expect(screen.getByText('Hex Preview (first 256 bytes)')).toBeInTheDocument();
    expect(screen.getByText('BINARY')).toBeInTheDocument();
  });
});
