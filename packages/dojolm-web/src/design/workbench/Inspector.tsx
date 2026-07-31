// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

export interface InspectorProps {
  readonly children: ReactNode;
  readonly className?: string;
}

// Inspector slot — right rail for live metadata, run state, diffs. Wraps
// children without imposing layout so pages can compose multiple panels.
export function Inspector({ children, className = '' }: InspectorProps) {
  return <div className={`wb-inspector-slot ${className}`.trim()}>{children}</div>;
}
