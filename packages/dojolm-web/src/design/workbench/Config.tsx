// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

export interface ConfigProps {
  readonly children: ReactNode;
  readonly className?: string;
}

// Config slot — intended for left-rail use inside WorkbenchShell. When
// rendered outside a WorkbenchShell, falls back to a plain block layout.
export function Config({ children, className = '' }: ConfigProps) {
  return <div className={`wb-config-slot ${className}`.trim()}>{children}</div>;
}
