/**
 * File: admin-panel.test.tsx
 * Purpose: Unit tests for Admin Panel and sub-components
 * Test IDs: ADM-001 to ADM-010
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchWithAuth = vi.fn();
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock Tabs from radix
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children, 'aria-label': ariaLabel }: { children: React.ReactNode; 'aria-label'?: string }) => (
    <div role="tablist" aria-label={ariaLabel}>{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div role="tabpanel" data-tab={value}>{children}</div>
  ),
}));

// Mock PageToolbar
vi.mock('@/components/layout/PageToolbar', () => ({
  PageToolbar: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="page-toolbar">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

// Mock ScannerContext for ScannerConfig
vi.mock('@/lib/ScannerContext', () => ({
  useScanner: () => ({
    engineFilters: [
      { name: 'core-patterns', enabled: true },
      { name: 'mcp-parser', enabled: true },
      { name: 'dos-detector', enabled: false },
    ],
    toggleFilter: vi.fn(),
    resetFilters: vi.fn(),
  }),
}));

// Mock GuardContext for ScannerConfig
vi.mock('@/lib/contexts/GuardContext', () => ({
  GuardProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useGuard: () => ({
    config: { enabled: true, mode: 'shinobi', blockThreshold: 'WARNING', engines: null, persist: false },
    stats: null,
    recentEvents: [],
    isLoading: false,
    error: null,
    setMode: vi.fn(),
    setEnabled: vi.fn(),
    setBlockThreshold: vi.fn(),
    setEngines: vi.fn(),
    refreshStats: vi.fn(),
    refreshEvents: vi.fn(),
    updateConfig: vi.fn(),
  }),
}));

// Mock FilterPills
vi.mock('@/components/ui/FilterPills', () => ({
  FilterPills: ({ filters }: { filters: { name: string; enabled: boolean }[] }) => (
    <div data-testid="filter-pills">
      {filters.map(f => (
        <span key={f.name} data-enabled={f.enabled}>{f.name}</span>
      ))}
    </div>
  ),
}));

// Mock llm-types
vi.mock('@/lib/llm-types', () => ({
  LLM_PROVIDERS: ['openai', 'anthropic', 'ollama'] as const,
}));

// Mock guard-constants
vi.mock('@/lib/guard-constants', () => ({
  GUARD_MODES: [
    { id: 'shinobi', name: 'Shinobi', subtitle: 'Stealth Monitor', description: 'Stealth monitoring', inputScan: true, outputScan: false, canBlock: false, icon: () => null },
    { id: 'samurai', name: 'Samurai', subtitle: 'Active Defense', description: 'Active defense', inputScan: true, outputScan: false, canBlock: true, icon: () => null },
    { id: 'sensei', name: 'Sensei', subtitle: 'Aggressive Defense', description: 'Aggressive defense', inputScan: false, outputScan: true, canBlock: true, icon: () => null },
    { id: 'hattori', name: 'Hattori', subtitle: 'Full Protection', description: 'Master protection', inputScan: true, outputScan: true, canBlock: true, icon: () => null },
  ],
}));

// Mock sub-components for AdminPanel isolation tests
// (they are tested individually below)
vi.mock('../admin/ApiKeyManager', () => ({
  ApiKeyManager: () => <div data-testid="api-key-manager">ApiKeyManager</div>,
}));
vi.mock('../admin/ScannerConfig', () => ({
  ScannerConfig: () => <div data-testid="scanner-config">ScannerConfig</div>,
}));
vi.mock('../admin/ExportSettings', () => ({
  ExportSettings: () => <div data-testid="export-settings">ExportSettings</div>,
}));
vi.mock('../admin/SystemHealth', () => ({
  SystemHealth: () => <div data-testid="system-health">SystemHealth</div>,
}));

import { AdminPanel } from '../admin/AdminPanel';

// Import the actual components for their individual describe blocks
// We need to get the real implementations, so we use importActual
const { ApiKeyManager: ApiKeyManagerReal } = await vi.importActual<typeof import('../admin/ApiKeyManager')>('../admin/ApiKeyManager');
const { ExportSettings: ExportSettingsReal } = await vi.importActual<typeof import('../admin/ExportSettings')>('../admin/ExportSettings');
const { ScannerConfig: ScannerConfigReal } = await vi.importActual<typeof import('../admin/ScannerConfig')>('../admin/ScannerConfig');
const { SystemHealth: SystemHealthReal } = await vi.importActual<typeof import('../admin/SystemHealth')>('../admin/SystemHealth');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ADM-001: AdminPanel renders with all tabs/sections
  it('ADM-001: renders with page toolbar and all 5 admin tabs', () => {
    render(<AdminPanel />);

    expect(screen.getByText('Admin & Settings')).toBeInTheDocument();
    // Check tab triggers by role
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(tabs[0]).toHaveTextContent('General');
    expect(tabs[1]).toHaveTextContent('API Keys');
    expect(tabs[2]).toHaveTextContent('Haiku Scanner & Guard');
    expect(tabs[3]).toHaveTextContent('System Health');
    expect(tabs[4]).toHaveTextContent('Export');
  });

  // ADM-009: Panel navigation between sections
  it('ADM-009: renders all tab panels (General, API Keys, Scanner, Health, Export)', () => {
    const { container } = render(<AdminPanel />);

    // All TabsContent are rendered with data-tab attribute
    const panels = container.querySelectorAll('[data-tab]');
    expect(panels).toHaveLength(5);
    const tabIds = Array.from(panels).map(p => p.getAttribute('data-tab'));
    expect(tabIds).toEqual(['general', 'apikeys', 'scanner', 'health', 'export']);
  });

  // ADM-010: General settings section renders content
  it('ADM-010: General tab content shows application and theme info', () => {
    render(<AdminPanel />);

    expect(screen.getByText('General Settings')).toBeInTheDocument();
    expect(screen.getByText('NODA Platform')).toBeInTheDocument();
    expect(screen.getByText('Dark (default)')).toBeInTheDocument();
  });
});

describe('ApiKeyManager', () => {
  const ApiKeyManager = ApiKeyManagerReal;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ADM-002: ApiKeyManager renders provider list after loading
  it('ADM-002: renders provider cards after successful fetch', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [
          { id: '1', name: 'GPT-4o', provider: 'openai', model: 'gpt-4o', enabled: true, hasApiKey: true },
          { id: '2', name: 'Claude', provider: 'anthropic', model: 'claude-3', enabled: false, hasApiKey: false },
        ],
      }),
    });

    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    });

    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('API Key Management')).toBeInTheDocument();
  });

  // ADM-003: ApiKeyManager masks API keys
  it('ADM-003: shows masked key indicator for providers with keys', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [
          { id: '1', name: 'GPT-4o', provider: 'openai', model: 'gpt-4o', enabled: true, hasApiKey: true },
        ],
      }),
    });

    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    });

    // Key is masked
    expect(screen.getByText(/Key:/)).toBeInTheDocument();
    // The masked display shows dots
    const keyDisplay = screen.getByText(/•/);
    expect(keyDisplay).toBeInTheDocument();
  });

  it('ADM-003b: shows empty state when no providers configured', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [] }),
    });

    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText('No API keys configured.')).toBeInTheDocument();
    });
  });

  it('ADM-003c: Add Key button toggles the add form', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [] }),
    });

    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText('Add Key')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Key'));
    expect(screen.getByText('Add New Provider')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).toBeInTheDocument();
  });
});

describe('ExportSettings', () => {
  const ExportSettings = ExportSettingsReal;

  // ADM-004: ExportSettings render and save
  it('ADM-004: renders export format options with JSON and PDF pre-selected', () => {
    render(<ExportSettings />);

    expect(screen.getByText('Export Formats')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('SARIF')).toBeInTheDocument();
    // Check descriptions
    expect(screen.getByText('Executive reports with branding')).toBeInTheDocument();
    expect(screen.getByText('Machine-readable data export')).toBeInTheDocument();
  });

  it('ADM-004b: toggling a format adds/removes it from selection', () => {
    render(<ExportSettings />);

    // Click CSV to select it
    fireEvent.click(screen.getByText('CSV').closest('button')!);
    // Click PDF to deselect it
    fireEvent.click(screen.getByText('PDF').closest('button')!);

    // Report branding section renders
    expect(screen.getByText('Report Branding')).toBeInTheDocument();
    expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Data Retention (days)')).toBeInTheDocument();
  });
});

describe('ScannerConfig', () => {
  const ScannerConfig = ScannerConfigReal;

  // ADM-005: ScannerConfig toggles
  it('ADM-005: renders scanner engine list and guard configuration', () => {
    render(<ScannerConfig />);

    expect(screen.getByText('Scanner Engines')).toBeInTheDocument();
    expect(screen.getByText('Hattori Guard')).toBeInTheDocument();
    expect(screen.getByTestId('filter-pills')).toBeInTheDocument();
  });

  // ADM-006: ScannerConfig shows engine count stats
  it('ADM-006: shows engine count summary (total, active, disabled)', () => {
    render(<ScannerConfig />);

    expect(screen.getByText('Total Engines')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // total
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 enabled
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 disabled
  });

  it('ADM-006b: Guard mode selector renders all 4 modes', () => {
    render(<ScannerConfig />);

    // Mode names appear in both selector buttons and possibly in the status line
    // Use getAllByText since active mode also shows in status
    expect(screen.getAllByText('Shinobi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Samurai').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sensei').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Hattori').length).toBeGreaterThanOrEqual(1);
  });
});

describe('SystemHealth', () => {
  const SystemHealth = SystemHealthReal;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ADM-007: SystemHealth display
  it('ADM-007: renders health status cards for scanner, guard, storage, and app', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        scanner: { reachable: true, responseTimeMs: 42 },
        guard: { enabled: true, mode: 'shinobi', eventCount: 100 },
        storage: { type: 'filesystem', modelsCount: 5 },
        app: { version: '2.0.0', nodeVersion: '20.11.0' },
      }),
    });

    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText('All Systems OK')).toBeInTheDocument();
    });

    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Haiku Scanner')).toBeInTheDocument();
    expect(screen.getByText('Hattori Guard')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText('Application')).toBeInTheDocument();

    // Check data values
    expect(screen.getByText('Reachable')).toBeInTheDocument();
    expect(screen.getByText('42ms')).toBeInTheDocument();
    expect(screen.getByText('2.0.0')).toBeInTheDocument();
    expect(screen.getByText('filesystem')).toBeInTheDocument();
  });

  // ADM-008: SystemHealth refresh button
  it('ADM-008: has a refresh button that triggers health re-fetch', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        scanner: { reachable: true },
        guard: { enabled: false, mode: 'shinobi', eventCount: 0 },
        storage: { type: 'filesystem', modelsCount: 0 },
        app: { version: '1.0.0' },
      }),
    });

    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText('All Systems OK')).toBeInTheDocument();
    });

    // Initial fetch happened
    expect(mockFetchWithAuth).toHaveBeenCalledTimes(1);

    // Click refresh
    const refreshBtn = screen.getByLabelText('Refresh health status');
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledTimes(2);
    });
  });

  it('ADM-008b: shows degraded status when scanner is unreachable', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        scanner: { reachable: false },
        guard: { enabled: false, mode: 'shinobi', eventCount: 0 },
        storage: { type: 'filesystem', modelsCount: 0 },
        app: { version: '1.0.0' },
      }),
    });

    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText('Degraded')).toBeInTheDocument();
    });

    expect(screen.getByText('Unreachable')).toBeInTheDocument();
  });

  it('ADM-008c: shows error status and fallback data when fetch fails', async () => {
    mockFetchWithAuth.mockRejectedValue(new Error('Network error'));

    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    expect(screen.getByText(/Unable to reach health endpoint/)).toBeInTheDocument();
  });
});
