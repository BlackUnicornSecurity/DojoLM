// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties, ReactNode } from "react";

export interface FilterRailProps {
  readonly title?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
}

// FilterRail — left-hand rail for Codex filter inputs. Server-safe:
// holds no state, just wraps form fields in Codex chrome. The caller
// owns field state (controlled inputs) and form submission.
export function FilterRail({
  title,
  children,
  className = "",
  style,
  ariaLabel = "Filters",
}: FilterRailProps) {
  return (
    <aside
      className={`codex-filter-rail ${className}`.trim()}
      style={style}
      aria-label={ariaLabel}
      data-testid="codex-filter-rail"
    >
      {title && <h2 className="codex-filter-rail-title">{title}</h2>}
      {children}
    </aside>
  );
}

export interface FilterFieldProps {
  readonly label: ReactNode;
  readonly htmlFor: string;
  readonly children: ReactNode;
  readonly className?: string;
}

// Small helper so pages don't re-declare the field wrapper markup.
export function FilterField({
  label,
  htmlFor,
  children,
  className = "",
}: FilterFieldProps) {
  return (
    <div className={`codex-filter-field ${className}`.trim()}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
