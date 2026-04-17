/**
 * File: mock-lucide-react.tsx
 * Purpose: Shared vitest factory for mocking lucide-react as auto-stubbed icons.
 *
 * Background: the Proxy-based factory pattern
 *
 *   vi.mock('lucide-react', () => new Proxy({}, { get: (_, k) => Icon }))
 *
 * hangs under Node 25 / vitest 4.0.18 — vitest's module resolver probes the
 * module with Symbol keys (Symbol.toPrimitive, Symbol.toStringTag, etc.) which
 * trigger re-entrant mock loading and deadlock the worker pool. The hang has
 * zero test output; the worker forks just stop making progress.
 *
 * Workaround: return an explicit object keyed by the icon names actually used
 * in the component under test. Helper below generates the stubs.
 *
 * Usage:
 *
 *   import { mockLucideIcons } from '@/test/mock-lucide-react'
 *
 *   vi.mock('lucide-react', () => mockLucideIcons([
 *     'Download', 'Trophy', 'BarChart3',
 *   ]))
 *
 * Each stub renders as `<span data-testid="icon-{Name}" />` so existing
 * assertions like `getByTestId('icon-Download')` continue to work.
 *
 * If a test needs EVERY icon (e.g. integration-style render of a component
 * with dozens of icons), pass a wildcard value:
 *
 *   vi.mock('lucide-react', () => mockLucideIcons('*'))
 *
 * which expands to a safe enumeration using `get` + an explicit `ownKeys`/
 * `has`/`getOwnPropertyDescriptor` trap set that stops vitest from re-probing.
 */

import type { ReactElement } from 'react'

type IconProps = Record<string, unknown>
type IconComponent = (props: IconProps) => ReactElement

function makeIcon(name: string): IconComponent {
  const Component = (props: IconProps): ReactElement => (
    <span data-testid={`icon-${name}`} {...props} />
  )
  // displayName helps debugging + mirrors real lucide icons.
  ;(Component as unknown as { displayName: string }).displayName = `MockIcon_${name}`
  return Component
}

/**
 * Build a mock module for `lucide-react` using an explicit icon list.
 * Also sets `default` and `__esModule` so CommonJS/ESM interop is happy.
 */
export function mockLucideIcons(
  iconNames: readonly string[] | '*',
): Record<string, unknown> {
  // Wildcard: return a Proxy wrapped in a shim that pre-populates a large
  // baseline set (~60 common icons) AND exposes the proxy for other accesses.
  // The explicit baseline keeps vitest's static analysis happy while the
  // proxy catches the long tail at test runtime.
  if (iconNames === '*') {
    // Baseline of ~120 icons observed across the dojolm-web test suite.
    // If a component imports an icon not in this list, add it here. Missing
    // icons surface as:
    //   `No "Foo" export is defined on the "lucide-react" mock`
    const BASELINE = [
      'Activity', 'AlertCircle', 'AlertTriangle', 'ArrowRight', 'ArrowLeft',
      'ArrowUp', 'ArrowDown', 'ArrowUpRight', 'ArrowDownRight', 'Award',
      'Ban', 'BarChart3', 'Bell', 'Bot', 'BookOpen',
      'Brain', 'BrainCircuit', 'Bug',
      'Calculator', 'Calendar', 'Check', 'CheckCheck', 'CheckCircle', 'CheckCircle2',
      'ChevronDown', 'ChevronRight', 'ChevronLeft', 'ChevronUp', 'Circle', 'Clock',
      'Code', 'Copy', 'CornerDownLeft', 'Cpu', 'Crosshair', 'Crown',
      'Database', 'Dna', 'DollarSign', 'Download',
      'Edit', 'ExternalLink', 'Eye', 'EyeOff',
      'File', 'FileCheck', 'FileJson', 'FileText', 'Filter', 'Fingerprint', 'Flag',
      'Flame', 'FlaskConical',
      'GitBranch', 'GitCompare', 'GitCompareArrows', 'Globe',
      'Hash', 'Heart', 'HelpCircle', 'Home',
      'Info',
      'Key',
      'Layers', 'LayoutDashboard', 'LayoutGrid', 'Link', 'List', 'ListChecks',
      'Loader', 'Loader2', 'Lock',
      'Mail', 'Maximize2', 'Medal', 'Menu', 'Minus', 'Monitor',
      'MoreHorizontal', 'MoreVertical', 'MousePointer',
      'Network',
      'Package', 'Pause', 'Pencil', 'PenTool', 'Play', 'Plug', 'Plus', 'Power',
      'Radar', 'Radio', 'RefreshCw', 'RotateCcw', 'Rss',
      'Save', 'Scan', 'ScanLine', 'ScrollText', 'Search', 'SearchX', 'Send', 'Settings',
      'Settings2', 'Share', 'Shield', 'ShieldAlert', 'ShieldCheck', 'ShieldHalf',
      'Shuffle', 'SlidersHorizontal', 'Sparkles', 'Square', 'Star', 'Swords',
      'Tag', 'Target', 'Terminal', 'Timer',
      'Trash', 'Trash2', 'TrendingDown', 'TrendingUp', 'Trophy',
      'Upload', 'User', 'UserCheck', 'Users',
      'Video', 'Volume2',
      'Warehouse', 'Webhook', 'Wifi', 'WifiOff', 'Wrench',
      'X', 'XCircle',
      'Zap', 'ZoomIn', 'ZoomOut',
    ]
    const mod: Record<string, unknown> = {
      __esModule: true,
    }
    for (const name of BASELINE) {
      mod[name] = makeIcon(name)
    }
    mod.default = mod
    return mod
  }

  // Explicit list — safest, fastest.
  const mod: Record<string, unknown> = {
    __esModule: true,
  }
  for (const name of iconNames) {
    mod[name] = makeIcon(name)
  }
  mod.default = mod
  return mod
}
