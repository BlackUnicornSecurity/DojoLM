/**
 * File: small-ui-components.test.tsx
 * Purpose: Tests for small presentational UI components
 * Source: StatusDot, ColorProgress, BeltBadge, SeverityBadge, ShimmerSkeleton, ModuleHeader
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ShieldAlert: (props: any) => <span data-testid="icon-shield-alert" {...props} />,
  AlertTriangle: (props: any) => <span data-testid="icon-alert-triangle" {...props} />,
  Info: (props: any) => <span data-testid="icon-info" {...props} />,
  Shield: (props: any) => <span data-testid="icon-shield" {...props} />,
}));

// ================ StatusDot ================
import { StatusDot } from '../ui/StatusDot';

describe('StatusDot', () => {
  it('SD-001: renders online status', () => {
    render(<StatusDot status="online" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Online');
  });

  it('SD-002: renders offline status', () => {
    render(<StatusDot status="offline" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Offline');
  });

  it('SD-003: renders idle status', () => {
    render(<StatusDot status="idle" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Idle');
  });

  it('SD-004: renders loading status', () => {
    render(<StatusDot status="loading" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
  });

  it('SD-005: custom label overrides default', () => {
    render(<StatusDot status="online" label="Connected" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Connected');
  });

  it('SD-006: showLabel renders text', () => {
    render(<StatusDot status="online" showLabel />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('SD-007: showLabel=false hides text', () => {
    render(<StatusDot status="online" showLabel={false} />);
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('SD-008: supports sm size', () => {
    render(<StatusDot status="online" size="sm" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('SD-009: supports lg size', () => {
    render(<StatusDot status="online" size="lg" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('SD-010: accepts className', () => {
    render(<StatusDot status="online" className="custom-class" />);
    expect(screen.getByRole('status').className).toContain('custom-class');
  });
});

// ================ ColorProgress ================
import { ColorProgress } from '../ui/ColorProgress';

describe('ColorProgress', () => {
  it('CP-001: renders progressbar role', () => {
    render(<ColorProgress value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('CP-002: sets aria-valuenow', () => {
    render(<ColorProgress value={75} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  });

  it('CP-003: clamps value to 0', () => {
    render(<ColorProgress value={-10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('CP-004: clamps value to 100', () => {
    render(<ColorProgress value={200} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('CP-005: shows label when showLabel', () => {
    render(<ColorProgress value={42} showLabel />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('CP-006: hides label by default', () => {
    render(<ColorProgress value={42} />);
    expect(screen.queryByText('42%')).not.toBeInTheDocument();
  });

  it('CP-007: has min/max aria attributes', () => {
    render(<ColorProgress value={50} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('CP-008: supports sm size', () => {
    render(<ColorProgress value={50} size="sm" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('CP-009: supports lg size', () => {
    render(<ColorProgress value={50} size="lg" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('CP-010: accepts className', () => {
    render(<ColorProgress value={50} className="my-progress" />);
    expect(screen.getByRole('progressbar').className).toContain('my-progress');
  });
});

// ================ BeltBadge ================
import { BeltBadge, getBeltRank } from '../ui/BeltBadge';

describe('getBeltRank', () => {
  it('BB-001: score >= 93 returns Black Belt', () => {
    expect(getBeltRank(95).label).toBe('Black Belt');
  });

  it('BB-002: score 86-92 returns Brown Belt', () => {
    expect(getBeltRank(90).label).toBe('Brown Belt');
  });

  it('BB-003: score 76-85 returns Blue Belt', () => {
    expect(getBeltRank(80).label).toBe('Blue Belt');
  });

  it('BB-004: score 61-75 returns Green Belt', () => {
    expect(getBeltRank(70).label).toBe('Green Belt');
  });

  it('BB-005: score 41-60 returns Orange Belt', () => {
    expect(getBeltRank(50).label).toBe('Orange Belt');
  });

  it('BB-006: score 21-40 returns Yellow Belt', () => {
    expect(getBeltRank(30).label).toBe('Yellow Belt');
  });

  it('BB-007: score < 21 returns White Belt', () => {
    expect(getBeltRank(10).label).toBe('White Belt');
  });

  it('BB-008: score 0 returns White Belt', () => {
    expect(getBeltRank(0).label).toBe('White Belt');
  });

  it('BB-009: score 100 returns Black Belt', () => {
    expect(getBeltRank(100).label).toBe('Black Belt');
  });
});

describe('BeltBadge component', () => {
  it('BB-010: renders with aria-label', () => {
    render(<BeltBadge score={95} />);
    expect(screen.getByLabelText(/black belt/i)).toBeInTheDocument();
  });

  it('BB-011: shows belt short name when showLabel true', () => {
    render(<BeltBadge score={50} showLabel />);
    expect(screen.getByText('Orange')).toBeInTheDocument();
  });

  it('BB-012: hides label when showLabel false', () => {
    render(<BeltBadge score={50} showLabel={false} />);
    expect(screen.queryByText('Orange')).not.toBeInTheDocument();
  });
});

// ================ SeverityBadge ================
import { SeverityBadge } from '../ui/SeverityBadge';

describe('SeverityBadge', () => {
  it('SB-001: renders CRITICAL severity', () => {
    render(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('SB-002: renders WARNING severity', () => {
    render(<SeverityBadge severity="WARNING" />);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('SB-003: renders INFO severity', () => {
    render(<SeverityBadge severity="INFO" />);
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('SB-004: shows icon by default', () => {
    render(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByTestId('icon-shield-alert')).toBeInTheDocument();
  });

  it('SB-005: hides icon when showIcon false', () => {
    render(<SeverityBadge severity="CRITICAL" showIcon={false} />);
    expect(screen.queryByTestId('icon-shield-alert')).not.toBeInTheDocument();
  });

  it('SB-006: WARNING uses alert-triangle icon', () => {
    render(<SeverityBadge severity="WARNING" />);
    expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument();
  });

  it('SB-007: INFO uses info icon', () => {
    render(<SeverityBadge severity="INFO" />);
    expect(screen.getByTestId('icon-info')).toBeInTheDocument();
  });

  it('SB-008: accepts className', () => {
    const { container } = render(<SeverityBadge severity="CRITICAL" className="my-badge" />);
    expect(container.firstElementChild!.className).toContain('my-badge');
  });

  it('SB-009: CRITICAL includes font-semibold', () => {
    const { container } = render(<SeverityBadge severity="CRITICAL" />);
    expect(container.firstElementChild!.className).toContain('font-semibold');
  });

  it('SB-010: renders as inline-flex', () => {
    const { container } = render(<SeverityBadge severity="WARNING" />);
    expect(container.firstElementChild!.className).toContain('inline-flex');
  });
});

// ================ ShimmerSkeleton ================
import { ShimmerSkeleton, MetricCardSkeleton, ChartSkeleton } from '../ui/ShimmerSkeleton';

describe('ShimmerSkeleton', () => {
  it('SS-001: renders with aria-hidden', () => {
    const { container } = render(<ShimmerSkeleton />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('SS-002: default variant is line', () => {
    const { container } = render(<ShimmerSkeleton />);
    expect(container.firstElementChild!.className).toContain('h-4');
  });

  it('SS-003: card variant', () => {
    const { container } = render(<ShimmerSkeleton variant="card" />);
    expect(container.firstElementChild!.className).toContain('h-32');
  });

  it('SS-004: circle variant', () => {
    const { container } = render(<ShimmerSkeleton variant="circle" />);
    expect(container.firstElementChild!.className).toContain('rounded-full');
  });

  it('SS-005: metric variant', () => {
    const { container } = render(<ShimmerSkeleton variant="metric" />);
    expect(container.firstElementChild!.className).toContain('h-20');
  });

  it('SS-006: MetricCardSkeleton renders', () => {
    const { container } = render(<MetricCardSkeleton />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });

  it('SS-007: ChartSkeleton renders', () => {
    const { container } = render(<ChartSkeleton />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });

  it('SS-008: accepts className', () => {
    const { container } = render(<ShimmerSkeleton className="custom" />);
    expect(container.firstElementChild!.className).toContain('custom');
  });

  it('SS-009: has animate-shimmer class', () => {
    const { container } = render(<ShimmerSkeleton />);
    expect(container.firstElementChild!.className).toContain('animate-shimmer');
  });

  it('SS-010: line variant has w-full', () => {
    const { container } = render(<ShimmerSkeleton variant="line" />);
    expect(container.firstElementChild!.className).toContain('w-full');
  });
});

// ================ ModuleHeader ================
import { ModuleHeader } from '../ui/ModuleHeader';
import { Shield } from 'lucide-react';

describe('ModuleHeader', () => {
  it('MH-001: renders title', () => {
    render(<ModuleHeader title="Test Module" subtitle="Subtitle" icon={Shield} />);
    expect(screen.getByText('Test Module')).toBeInTheDocument();
  });

  it('MH-002: renders subtitle', () => {
    render(<ModuleHeader title="Test" subtitle="A subtitle" icon={Shield} />);
    expect(screen.getByText('A subtitle')).toBeInTheDocument();
  });

  it('MH-003: renders icon', () => {
    render(<ModuleHeader title="Test" subtitle="Sub" icon={Shield} />);
    expect(screen.getByTestId('icon-shield')).toBeInTheDocument();
  });

  it('MH-004: renders actions when provided', () => {
    render(
      <ModuleHeader
        title="Test"
        subtitle="Sub"
        icon={Shield}
        actions={<button>Action</button>}
      />
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('MH-005: no actions container when not provided', () => {
    const { container } = render(<ModuleHeader title="Test" subtitle="Sub" icon={Shield} />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('MH-006: title is h1', () => {
    render(<ModuleHeader title="My Title" subtitle="Sub" icon={Shield} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Title');
  });

  it('MH-007: icon has aria-hidden', () => {
    render(<ModuleHeader title="Test" subtitle="Sub" icon={Shield} />);
    expect(screen.getByTestId('icon-shield')).toHaveAttribute('aria-hidden', 'true');
  });

  it('MH-008: renders with long title', () => {
    const longTitle = 'A'.repeat(100);
    render(<ModuleHeader title={longTitle} subtitle="Sub" icon={Shield} />);
    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it('MH-009: renders multiple actions', () => {
    render(
      <ModuleHeader
        title="Test"
        subtitle="Sub"
        icon={Shield}
        actions={<><button>A</button><button>B</button></>}
      />
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('MH-010: subtitle is a paragraph', () => {
    const { container } = render(<ModuleHeader title="Test" subtitle="Info text" icon={Shield} />);
    const p = container.querySelector('p');
    expect(p).toBeInTheDocument();
    expect(p!.textContent).toBe('Info text');
  });
});
