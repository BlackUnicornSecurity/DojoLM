/**
 * File: guard-dashboard.test.tsx
 * Purpose: Unit tests for Hattori Guard dashboard and related components
 * Test IDs: GRD-001 to GRD-020
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock fetchWithAuth used by GuardContext
const mockFetchWithAuth = vi.fn();
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}));

// Mock child components that are complex / have their own tests
vi.mock('../guard/GuardModeSelector', () => ({
  GuardModeSelector: () => <div data-testid="guard-mode-selector">GuardModeSelector</div>,
}));

vi.mock('../guard/GuardAuditLog', () => ({
  GuardAuditLog: () => <div data-testid="guard-audit-log">GuardAuditLog</div>,
}));

vi.mock('@/components/ui/MetricCard', () => ({
  MetricCard: ({ label, value }: { label: string; value: string | number }) => (
    <div data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <span data-testid="metric-label">{label}</span>
      <span data-testid="metric-value">{value}</span>
    </div>
  ),
}));

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="module-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

import { GuardDashboard } from '../guard/GuardDashboard';
import { GuardProvider, useGuard } from '@/lib/contexts/GuardContext';
import { GUARD_MODES, DEFAULT_GUARD_CONFIG } from '@/lib/guard-constants';
import type { GuardConfig, GuardStats } from '@/lib/guard-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStats(overrides?: Partial<GuardStats>): GuardStats {
  return {
    totalEvents: 42,
    byAction: { allow: 30, block: 10, log: 2 },
    byDirection: { input: 25, output: 17 },
    byMode: { shinobi: 10, samurai: 15, sensei: 10, hattori: 7 },
    blockRate: 24,
    recentTimestamps: [],
    topCategories: [],
    ...overrides,
  };
}

function makeConfig(overrides?: Partial<GuardConfig>): GuardConfig {
  return { ...DEFAULT_GUARD_CONFIG, ...overrides };
}

/** Sets up mock fetchWithAuth to return successful config/stats/events */
function setupSuccessfulFetch(config?: Partial<GuardConfig>, stats?: Partial<GuardStats>) {
  mockFetchWithAuth.mockImplementation(async (url: string) => {
    if (url.includes('/api/llm/guard/stats')) {
      return {
        ok: true,
        json: async () => ({ data: makeStats(stats) }),
      };
    }
    if (url.includes('/api/llm/guard/audit')) {
      return {
        ok: true,
        json: async () => ({ data: [] }),
      };
    }
    if (url.includes('/api/llm/guard')) {
      return {
        ok: true,
        json: async () => ({ data: makeConfig(config) }),
      };
    }
    return { ok: false, json: async () => ({}) };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GuardDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // GRD-001: Guard dashboard renders with all sections
  it('GRD-001: renders with header, metrics, mode selector, and audit log sections', async () => {
    setupSuccessfulFetch({ enabled: true, mode: 'shinobi' });
    render(<GuardDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('module-header')).toBeInTheDocument();
    });

    expect(screen.getByText('Hattori Guard')).toBeInTheDocument();
    expect(screen.getByTestId('guard-mode-selector')).toBeInTheDocument();
    expect(screen.getByTestId('guard-audit-log')).toBeInTheDocument();
    expect(screen.getByText('Guard Mode')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });

  // GRD-002: Shinobi mode renders
  it('GRD-002: Shinobi mode appears in Active Mode metric when selected', async () => {
    setupSuccessfulFetch({ enabled: true, mode: 'shinobi' });
    render(<GuardDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('metric-active-mode')).toBeInTheDocument();
    });

    const modeMetric = screen.getByTestId('metric-active-mode');
    expect(modeMetric).toHaveTextContent('Shinobi');
  });

  // GRD-003: Samurai mode renders
  it('GRD-003: Samurai mode appears in Active Mode metric when selected', async () => {
    setupSuccessfulFetch({ enabled: true, mode: 'samurai' });
    render(<GuardDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('metric-active-mode')).toBeInTheDocument();
    });

    const modeMetric = screen.getByTestId('metric-active-mode');
    expect(modeMetric).toHaveTextContent('Samurai');
  });

  // GRD-004: Sensei mode renders
  it('GRD-004: Sensei mode appears in Active Mode metric when selected', async () => {
    setupSuccessfulFetch({ enabled: true, mode: 'sensei' });
    render(<GuardDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('metric-active-mode')).toBeInTheDocument();
    });

    const modeMetric = screen.getByTestId('metric-active-mode');
    expect(modeMetric).toHaveTextContent('Sensei');
  });

  // GRD-005: Hattori mode renders
  it('GRD-005: Hattori mode appears in Active Mode metric when selected', async () => {
    setupSuccessfulFetch({ enabled: true, mode: 'hattori' });
    render(<GuardDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('metric-active-mode')).toBeInTheDocument();
    });

    const modeMetric = screen.getByTestId('metric-active-mode');
    expect(modeMetric).toHaveTextContent('Hattori');
  });

  // GRD-006: Shinobi description
  it('GRD-006: Shinobi mode has correct description in constants', () => {
    const shinobi = GUARD_MODES.find(m => m.id === 'shinobi');
    expect(shinobi).toBeDefined();
    expect(shinobi!.description).toContain('Stealth monitoring');
    expect(shinobi!.subtitle).toBe('Stealth Monitor');
  });

  // GRD-007: Samurai description
  it('GRD-007: Samurai mode has correct description in constants', () => {
    const samurai = GUARD_MODES.find(m => m.id === 'samurai');
    expect(samurai).toBeDefined();
    expect(samurai!.description).toContain('Active defense');
    expect(samurai!.subtitle).toBe('Active Defense');
  });

  // GRD-008: Sensei description
  it('GRD-008: Sensei mode has correct description in constants', () => {
    const sensei = GUARD_MODES.find(m => m.id === 'sensei');
    expect(sensei).toBeDefined();
    expect(sensei!.description).toContain('Aggressive defense');
    expect(sensei!.subtitle).toBe('Aggressive Defense');
  });

  // GRD-009: Hattori description
  it('GRD-009: Hattori mode has correct description in constants', () => {
    const hattori = GUARD_MODES.find(m => m.id === 'hattori');
    expect(hattori).toBeDefined();
    expect(hattori!.description).toContain('Master protection');
    expect(hattori!.subtitle).toBe('Full Protection');
  });

  // GRD-010: Threshold controls render — block threshold section visible when guard enabled
  it('GRD-010: Metric cards include Block Rate metric', async () => {
    setupSuccessfulFetch({ enabled: true, mode: 'shinobi' }, { blockRate: 24 });
    render(<GuardDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('metric-block-rate')).toBeInTheDocument();
    });

    expect(screen.getByTestId('metric-block-rate')).toHaveTextContent('24%');
  });

  // GRD-011: Blocked count metric renders
  it('GRD-011: Blocked metric card renders with correct value', async () => {
    setupSuccessfulFetch({ enabled: true }, { byAction: { allow: 30, block: 10, log: 2 } });
    render(<GuardDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('metric-blocked')).toBeInTheDocument();
    });

    expect(screen.getByTestId('metric-blocked')).toHaveTextContent('10');
  });

  // GRD-012: Audit log section renders
  it('GRD-012: Audit log section has heading and audit log component', async () => {
    setupSuccessfulFetch({ enabled: true });
    render(<GuardDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Audit Log')).toBeInTheDocument();
    });

    expect(screen.getByTestId('guard-audit-log')).toBeInTheDocument();
  });

  // GRD-013: Audit log has ARIA label
  it('GRD-013: Audit log section has proper aria-label', async () => {
    setupSuccessfulFetch({ enabled: true });
    render(<GuardDashboard />);

    await waitFor(() => {
      expect(screen.getByLabelText('Guard audit log')).toBeInTheDocument();
    });
  });

  // GRD-014: Metrics section renders all 4 cards
  it('GRD-014: All 4 metric cards render (Total Events, Blocked, Block Rate, Active Mode)', async () => {
    setupSuccessfulFetch({ enabled: true, mode: 'hattori' });
    render(<GuardDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('metric-total-events')).toBeInTheDocument();
    });

    expect(screen.getByTestId('metric-blocked')).toBeInTheDocument();
    expect(screen.getByTestId('metric-block-rate')).toBeInTheDocument();
    expect(screen.getByTestId('metric-active-mode')).toBeInTheDocument();
  });

  // GRD-015: When guard is disabled, Active Mode shows 'Off'
  it('GRD-015: When guard disabled, Active Mode metric shows "Off"', async () => {
    setupSuccessfulFetch({ enabled: false, mode: 'shinobi' });
    render(<GuardDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('metric-active-mode')).toBeInTheDocument();
    });

    expect(screen.getByTestId('metric-active-mode')).toHaveTextContent('Off');
  });

  // GRD-016: Old mode names are not used in current constants
  it('GRD-016: No legacy mode names (metsuke, ninja) exist in GUARD_MODES', () => {
    const modeIds = GUARD_MODES.map(m => m.id);
    expect(modeIds).not.toContain('metsuke');
    expect(modeIds).not.toContain('ninja');
    const modeNames = GUARD_MODES.map(m => m.name.toLowerCase());
    expect(modeNames).not.toContain('metsuke');
    expect(modeNames).not.toContain('ninja');
  });

  // GRD-017: Config defaults persist correctly
  it('GRD-017: DEFAULT_GUARD_CONFIG has expected shape and values', () => {
    expect(DEFAULT_GUARD_CONFIG).toEqual({
      enabled: false,
      mode: 'shinobi',
      blockThreshold: 'WARNING',
      engines: null,
      persist: false,
    });
  });

  // GRD-018: GuardProvider wraps the dashboard (GuardDashboard exports wrapping)
  it('GRD-018: GuardDashboard wraps inner component in GuardProvider', async () => {
    setupSuccessfulFetch({ enabled: true });
    // The component should not throw about missing context
    const { container } = render(<GuardDashboard />);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="module-header"]')).toBeInTheDocument();
    });
  });

  // GRD-019: GUARD_MODES has exactly 4 modes with correct IDs
  it('GRD-019: GUARD_MODES defines exactly 4 modes with correct IDs', () => {
    expect(GUARD_MODES).toHaveLength(4);
    const ids = GUARD_MODES.map(m => m.id);
    expect(ids).toEqual(['shinobi', 'samurai', 'sensei', 'hattori']);
  });

  // GRD-020: Loading state shows skeleton
  it('GRD-020: Shows loading skeleton before data is fetched', () => {
    // Make fetch hang forever so loading stays true
    mockFetchWithAuth.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<GuardDashboard />);

    // Loading state uses aria-busy="true"
    const skeleton = container.querySelector('[aria-busy="true"]');
    expect(skeleton).toBeInTheDocument();
    // No module header shown yet (still loading)
    expect(screen.queryByText('Hattori Guard')).not.toBeInTheDocument();
  });
});
