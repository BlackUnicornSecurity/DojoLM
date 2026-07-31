// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties, ReactNode } from 'react';

export interface WorkbenchShellProps {
  readonly config: ReactNode;
  readonly canvas: ReactNode;
  readonly inspector: ReactNode;
  readonly steps?: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
}

// 3-pane IDE layout primitive. Server-safe — no hooks, no client state.
// Pages opt into the client boundary themselves so Workbench composes with
// both server components and the existing 'use client' page files.
export function WorkbenchShell({
  config,
  canvas,
  inspector,
  steps,
  className = '',
  style,
  ariaLabel = 'Workbench',
}: WorkbenchShellProps) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={`workbench ${className}`.trim()}
      style={style}
    >
      <aside className="workbench-config" aria-label="Configuration">
        {config}
      </aside>
      <section className="workbench-canvas" aria-label="Canvas">
        {canvas}
      </section>
      <aside className="workbench-inspector" aria-label="Inspector">
        {inspector}
      </aside>
      {steps ? <footer className="workbench-steps">{steps}</footer> : null}
    </div>
  );
}
