// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

export interface CanvasProps {
  readonly children: ReactNode;
  readonly className?: string;
}

// Canvas slot — the center stage of the Workbench. Intentionally minimal:
// page-owned editors / viewers / tables plug in verbatim.
export function Canvas({ children, className = '' }: CanvasProps) {
  return <div className={`wb-canvas-slot ${className}`.trim()}>{children}</div>;
}
