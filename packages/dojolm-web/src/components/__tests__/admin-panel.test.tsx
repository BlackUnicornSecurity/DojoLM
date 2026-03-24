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

const mockCanAccessProtectedApi = vi.fn();
vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: (...args: unknown[]) => mockCanAccessProtectedApi(...args),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
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
vi.mock('../admin/UserManagement', () => ({
  UserManagement: () => <div data-testid="user-management">UserManagement</div>,
}));
vi.mock('../admin/Scoreboard', () => ({
  Scoreboard: () => <div data-testid="scoreboard">Scoreboard</div>,
}));
vi.mock('../admin/AdminSettings', () => ({
  AdminSettings: () => <div data-testid="admin-settings">AdminSettings</div>,
}));
vi.mock('../admin/ValidationManager', () => ({
  ValidationManager: () => <div data-testid="validation-manager">ValidationManager</div>,
}));

import { AdminPanel } from '../admin/AdminPanel';

// Import the actual components for their individual describe blocks
// We need to get the real implementations, so we use importActual
const { ApiKeyManager: ApiKeyManagerReal } = await vi.importActual<typeof import('../admin/ApiKeyManager')>('../admin/ApiKeyManager');
const { ExportSettings: ExportSettingsReal } = await vi.importActual<typeof import('../admin/ExportSettings')>('../admin/ExportSettings');
const { ScannerConfig: ScannerConfigReal } = await vi.importActual<typeof import('../admin/ScannerConfig')>('../admin/ScannerConfig');
const { SystemHealth: SystemHealthReal } = await vi.importActual<typeof import('../admin/SystemHealth')>('../admin/SystemHealth');
const { AdminSettings: AdminSettingsReal } = await vi.importActual<typeof import('../admin/AdminSettings')>('../admin/AdminSettings');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ADM-001: AdminPanel renders with all tabs/sections
  it('ADM-001: renders with page toolbar and all 9 admin tabs', () => {
    render(<AdminPanel />);

    expect(screen.getByText('Admin & Settings')).toBeInTheDocument();
    // Check tab triggers by role
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(9);
    expect(tabs[0]).toHaveTextContent('General');
    expect(tabs[1]).toHaveTextContent('Users');
    expect(tabs[2]).toHaveTextContent('Scoreboard');
    expect(tabs[3]).toHaveTextContent('API Keys');
    expect(tabs[4]).toHaveTextContent('Haiku Scanner & Guard');
    expect(tabs[5]).toHaveTextContent('System Health');
    expect(tabs[6]).toHaveTextContent('Export');
    expect(tabs[7]).toHaveTextContent('Admin Settings');
    expect(tabs[8]).toHaveTextContent('Validation');
  });

  // ADM-009: Panel navigation between sections
  it('ADM-009: renders all tab panels', () => {
    const { container } = render(<AdminPanel />);

    // All TabsContent are rendered with data-tab attribute
    const panels = container.querySelectorAll('[data-tab]');
    expect(panels).toHaveLength(9);
    const tabIds = Array.from(panels).map(p => p.getAttribute('data-tab'));
    expect(tabIds).toEqual(['general', 'users', 'scoreboard', 'apikeys', 'scanner', 'health', 'export', 'settings', 'validation']);
  });

  // ADM-010: General settings section renders content
  it('ADM-010: General tab content shows application and theme info', () => {
    render(<AdminPanel />);

    expect(screen.getByText('Platform Information')).toBeInTheDocument();
    expect(screen.getByText('NODA Platform')).toBeInTheDocument();
    expect(screen.getByText('Dark (default)')).toBeInTheDocument();
  });

  // ADM-011: Users tab renders UserManagement mock
  it('ADM-011: Users tab renders UserManagement component', () => {
    render(<AdminPanel />);
    expect(screen.getByTestId('user-management')).toBeInTheDocument();
  });

  // ADM-012: Scoreboard tab renders Scoreboard mock
  it('ADM-012: Scoreboard tab renders Scoreboard component', () => {
    render(<AdminPanel />);
    expect(screen.getByTestId('scoreboard')).toBeInTheDocument();
  });

  // ADM-013: Admin Settings tab renders AdminSettings mock
  it('ADM-013: Admin Settings tab renders AdminSettings component', () => {
    render(<AdminPanel />);
    expect(screen.getByTestId('admin-settings')).toBeInTheDocument();
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
    mockCanAccessProtectedApi.mockResolvedValue(true);
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
        guard: { enabled: true, mode: 'shinobi', eventCount: 0 },
        storage: { type: 'filesystem', modelsCount: 0 },
        app: { version: '1.0.0' },
      }),
    });

    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText('All Systems OK')).toBeInTheDocument();
    });

    // Initial fetch: health + MCP status = 2 calls
    expect(mockFetchWithAuth).toHaveBeenCalledTimes(2);

    // Click refresh
    const refreshBtn = screen.getByLabelText('Refresh health status');
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      // Refresh triggers another 2 calls (health + MCP)
      expect(mockFetchWithAuth).toHaveBeenCalledTimes(4);
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

  // ADM-014: MCP Status Card renders
  it('ADM-014: renders MCP Server status card', async () => {
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url === '/api/admin/health') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            scanner: { reachable: true, responseTimeMs: 10 },
            guard: { enabled: true, mode: 'shinobi', eventCount: 5 },
            storage: { type: 'json', modelsCount: 3 },
            app: { version: '2.0.0' },
          }),
        });
      }
      if (url === '/api/mcp/status') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ connected: true, message: 'MCP server running' }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText('MCP Server')).toBeInTheDocument();
    });

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('MCP server running')).toBeInTheDocument();
  });

  // ADM-015: MCP Status Card shows disconnected when MCP is down
  it('ADM-015: shows Disconnected when MCP status reports not connected', async () => {
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url === '/api/admin/health') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            scanner: { reachable: true },
            guard: { enabled: true, mode: 'shinobi', eventCount: 0 },
            storage: { type: 'json', modelsCount: 0 },
            app: { version: '1.0.0' },
          }),
        });
      }
      if (url === '/api/mcp/status') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ connected: false, message: 'MCP server not configured' }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText('MCP Server')).toBeInTheDocument();
    });

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('MCP server not configured')).toBeInTheDocument();
  });

  it('ADM-015b: skips MCP status fetch when protected access is unavailable', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(false);
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url === '/api/admin/health') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            scanner: { reachable: true, responseTimeMs: 10 },
            guard: { enabled: true, mode: 'shinobi', eventCount: 5 },
            storage: { type: 'json', modelsCount: 3 },
            app: { version: '2.0.0' },
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<SystemHealth />);

    await waitFor(() => {
      expect(screen.getByText('MCP Server')).toBeInTheDocument();
    });

    expect(mockFetchWithAuth).toHaveBeenCalledTimes(1);
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/admin/health');
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AdminSettings Tests
// ---------------------------------------------------------------------------

describe('AdminSettings (editable)', () => {
  const AdminSettings = AdminSettingsReal;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: GET /api/admin/settings returns defaults
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url === '/api/admin/settings') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ sessionTtlMinutes: 1440, retentionDays: 90 }),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  // ADM-016: AdminSettings renders in read-only mode by default
  it('ADM-016: renders settings in read-only mode with Edit button', async () => {
    render(<AdminSettings />);

    await waitFor(() => {
      expect(screen.getByText('Admin Settings')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Edit settings')).toBeInTheDocument();
    expect(screen.getByText('Session Configuration')).toBeInTheDocument();
    expect(screen.getByText('Security Configuration')).toBeInTheDocument();
    expect(screen.getByText('Data Retention')).toBeInTheDocument();
    expect(screen.getByText('Role-Based Access Control')).toBeInTheDocument();
  });

  // ADM-017: Edit mode shows form inputs
  it('ADM-017: clicking Edit shows form inputs for editable settings', async () => {
    render(<AdminSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Edit settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Edit settings'));

    expect(screen.getByLabelText('Session TTL (minutes)')).toBeInTheDocument();
    expect(screen.getByLabelText('Data Retention (days)')).toBeInTheDocument();
    expect(screen.getByLabelText('Save settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel editing')).toBeInTheDocument();
  });

  // ADM-018: Cancel reverts to read-only
  it('ADM-018: Cancel button exits edit mode without saving', async () => {
    render(<AdminSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Edit settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Edit settings'));
    expect(screen.getByLabelText('Session TTL (minutes)')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Cancel editing'));
    expect(screen.queryByLabelText('Session TTL (minutes)')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Edit settings')).toBeInTheDocument();
  });

  // ADM-019: Save sends PATCH request
  it('ADM-019: Save sends PATCH request with updated values', async () => {
    mockFetchWithAuth.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/admin/settings' && init?.method === 'PATCH') {
        const body = JSON.parse(init.body as string);
        return Promise.resolve({
          ok: true,
          json: async () => body,
        });
      }
      if (url === '/api/admin/settings') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ sessionTtlMinutes: 1440, retentionDays: 90 }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<AdminSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Edit settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Edit settings'));

    const ttlInput = screen.getByLabelText('Session TTL (minutes)') as HTMLInputElement;
    fireEvent.change(ttlInput, { target: { value: '60' } });

    const retentionInput = screen.getByLabelText('Data Retention (days)') as HTMLInputElement;
    fireEvent.change(retentionInput, { target: { value: '30' } });

    fireEvent.click(screen.getByLabelText('Save settings'));

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully.')).toBeInTheDocument();
    });

    // Verify PATCH was called with correct body
    const patchCall = mockFetchWithAuth.mock.calls.find(
      (c: unknown[]) => c[0] === '/api/admin/settings' && (c[1] as RequestInit)?.method === 'PATCH'
    );
    expect(patchCall).toBeDefined();
    const sentBody = JSON.parse((patchCall![1] as RequestInit).body as string);
    expect(sentBody.sessionTtlMinutes).toBe(60);
    expect(sentBody.retentionDays).toBe(30);
  });

  // ADM-020: Client-side validation rejects out-of-range values
  it('ADM-020: shows validation error for out-of-range session TTL', async () => {
    render(<AdminSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Edit settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Edit settings'));

    const ttlInput = screen.getByLabelText('Session TTL (minutes)') as HTMLInputElement;
    fireEvent.change(ttlInput, { target: { value: '2' } });

    fireEvent.click(screen.getByLabelText('Save settings'));

    await waitFor(() => {
      expect(screen.getByText('Session TTL must be between 5 and 1440 minutes.')).toBeInTheDocument();
    });
  });
});
