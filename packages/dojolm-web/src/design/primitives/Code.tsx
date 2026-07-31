// SPDX-License-Identifier: Apache-2.0
import type { ReactNode, HTMLAttributes } from 'react';

export type CodeProps = {
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLPreElement>, 'children'>;

/**
 * Mono-styled `<pre>` block. Content is rendered exclusively as React
 * text nodes — no raw-HTML injection escape hatch — so a payload prop
 * cannot inject markup (G3 + R-T1). Inline highlight spans (`.hl` /
 * `.hl-good`) are caller-rendered as React children.
 */
export function Code({ children, className, ...rest }: CodeProps) {
  const cls = ['code', className].filter(Boolean).join(' ');
  return (
    <pre className={cls} {...rest}>
      {children}
    </pre>
  );
}
