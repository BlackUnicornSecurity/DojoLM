// SPDX-License-Identifier: Apache-2.0
"use client";

import {
  Children,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

// C.5 spec-aligned primitive — generic DisclosureAccordion (E-A15
// Bushido Coverage tab demotion + future cross-module use). Per spec
// C.5 + plan v4 §8.1 line 337 (UX-C2 demotion rule).
//
// Two variants behind one primitive:
//
//   variant="single"   → one collapsible section; children render in
//                         the expandable region. Use when "Detailed
//                         analytics" is a single all-or-nothing block.
//   variant="grouped"  → multiple independently-collapsible
//                         subsections, each with its own header. Use
//                         when the user benefits from expanding just
//                         one sub-view (Bidirectional / Transfer /
//                         CrossCorpus / GapMatrix).
//
// A11y contract:
//   - Header is a <button aria-expanded aria-controls> pointing to the
//     expandable region. aria-controls is OMITTED when collapsed (the
//     region is unmounted) so WAI-ARIA 1.2 §6.6 stays satisfied.
//   - Region carries role="region" + aria-label derived from the
//     header label.
//   - Keyboard: Enter / Space toggles. Focus stays on the trigger
//     after toggle (native <button> behavior).
//   - prefers-reduced-motion is honored by .bb-disclosure-region
//     transition rule in bushido-book.css.
//
// Runtime invariants (dev-only warnings — production silently coerces):
//   - variant="single"  must receive `children`, not `sections`.
//   - variant="grouped" must receive `sections`, not `children`.

export type DisclosureAccordionVariant = "single" | "grouped";

export interface DisclosureAccordionSection {
  /** Stable identifier used as the expand/collapse key. */
  id: string;
  /** Section header label. */
  title: ReactNode;
  /** Optional subtitle under the header. */
  subtitle?: ReactNode;
  /** Optional count chip (e.g. "4 views"). */
  count?: number;
  /** Section content (rendered when expanded). */
  content: ReactNode;
}

interface CommonProps {
  /** Outer-card title (single variant only). */
  title?: ReactNode;
  /** Outer-card subtitle (single variant only). */
  subtitle?: ReactNode;
  /** Optional count rendered next to the outer-card title. */
  count?: number;
  /** Optional test id (data-testid). */
  testId?: string;
  className?: string;
}

export interface SingleDisclosureProps extends CommonProps {
  variant: "single";
  /** Section content (rendered when expanded). */
  children: ReactNode;
  /** Uncontrolled initial expanded state. */
  defaultOpen?: boolean;
  /** Controlled expanded state. */
  open?: boolean;
  /** Toggle handler — required in controlled mode. */
  onOpenChange?: (open: boolean) => void;
}

export interface GroupedDisclosureProps extends CommonProps {
  variant: "grouped";
  /** Sub-sections. */
  sections: ReadonlyArray<DisclosureAccordionSection>;
  /** Uncontrolled initial-open set. */
  defaultOpenSections?: ReadonlyArray<string>;
  /** Controlled open set. */
  openSections?: ReadonlyArray<string>;
  /** Toggle handler — required in controlled mode. */
  onSectionToggle?: (id: string, open: boolean) => void;
}

export type DisclosureAccordionProps =
  | SingleDisclosureProps
  | GroupedDisclosureProps;

const OUTER_HEADER_TITLE_STYLE: CSSProperties = {
  fontFamily: "var(--sans)",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  color: "var(--fg)",
  letterSpacing: "-0.012em",
};

const OUTER_HEADER_SUBTITLE_STYLE: CSSProperties = {
  fontFamily: "var(--sans)",
  fontSize: "var(--text-sm)",
  color: "var(--fg-dim)",
  letterSpacing: "-0.003em",
};

const COUNT_CHIP_STYLE: CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: "var(--text-sm)",
  color: "var(--fg-mute)",
  letterSpacing: "-0.005em",
};

interface RowHeaderProps {
  expanded: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  count?: number;
  onToggle: () => void;
  regionId: string;
  hasRegion: boolean;
  className?: string;
}

function DisclosureHeader({
  expanded,
  title,
  subtitle,
  count,
  onToggle,
  regionId,
  hasRegion,
  className,
}: RowHeaderProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };
  const headerClass = ["bb-disclosure", className].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      className={headerClass}
      aria-expanded={expanded}
      aria-controls={hasRegion ? regionId : undefined}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
    >
      <span
        className="bb-disclosure__lead"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
        }}
      >
        <svg
          className={`bb-chevron${expanded ? " is-open" : ""}`}
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3 2l4 3-4 3" />
        </svg>
        <span
          className="bb-disclosure__copy"
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 2,
            minWidth: 0,
          }}
        >
          <span style={OUTER_HEADER_TITLE_STYLE}>{title}</span>
          {subtitle && (
            <span style={OUTER_HEADER_SUBTITLE_STYLE}>{subtitle}</span>
          )}
        </span>
      </span>
      {typeof count === "number" && (
        <span style={COUNT_CHIP_STYLE}>({count})</span>
      )}
    </button>
  );
}

function isSingle(
  props: DisclosureAccordionProps,
): props is SingleDisclosureProps {
  return props.variant === "single";
}

// Counts the non-falsy ReactNode children. Empty fragments / null /
// strings of length 0 do not satisfy `children` for the warning.
function childrenIsEmpty(children: ReactNode): boolean {
  const count = Children.count(children);
  if (count === 0) return true;
  let hasContent = false;
  Children.forEach(children, (child) => {
    if (child === null || child === undefined || child === false) return;
    if (typeof child === "string" && child.length === 0) return;
    hasContent = true;
  });
  return !hasContent;
}

// Module-scope flag prevents the prop-mismatch warning from firing on
// every render of the same component. Reset implicitly per HMR / page
// reload.
const WARNED = new Set<string>();
function devWarnOnce(key: string, message: string) {
  if (process.env.NODE_ENV === "production") return;
  if (WARNED.has(key)) return;
  WARNED.add(key);
  console.warn(message);
}

export function DisclosureAccordion(props: DisclosureAccordionProps) {
  const reactId = useId();
  const isSingleVariant = isSingle(props);

  // Dev-warning: prop shape mismatch.
  useEffect(() => {
    if (isSingleVariant) {
      const single = props as SingleDisclosureProps;
      if (childrenIsEmpty(single.children)) {
        devWarnOnce(
          `${reactId}-single-empty`,
          '[DisclosureAccordion] variant="single" expected `children`. Did you mean variant="grouped" with `sections`?',
        );
      }
      if ("sections" in single) {
        devWarnOnce(
          `${reactId}-single-sections`,
          '[DisclosureAccordion] variant="single" ignores `sections` prop. Use variant="grouped" or remove the prop.',
        );
      }
    } else {
      const grouped = props as GroupedDisclosureProps;
      if (!grouped.sections || grouped.sections.length === 0) {
        devWarnOnce(
          `${reactId}-grouped-empty`,
          '[DisclosureAccordion] variant="grouped" expected `sections`. Did you mean variant="single" with `children`?',
        );
      }
      if ("children" in grouped) {
        devWarnOnce(
          `${reactId}-grouped-children`,
          '[DisclosureAccordion] variant="grouped" ignores `children`. Pass `sections` instead.',
        );
      }
    }
  }, [isSingleVariant, props, reactId]);

  if (isSingleVariant) {
    return (
      <SingleDisclosure
        {...(props as SingleDisclosureProps)}
        reactId={reactId}
      />
    );
  }
  return (
    <GroupedDisclosure
      {...(props as GroupedDisclosureProps)}
      reactId={reactId}
    />
  );
}

interface SingleDisclosureInternalProps extends SingleDisclosureProps {
  reactId: string;
}

function SingleDisclosure({
  title,
  subtitle,
  count,
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  testId,
  className,
  reactId,
}: SingleDisclosureInternalProps) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isControlled ? openProp : internalOpen;
  const regionId = `bb-disc-${reactId}`;

  const handleToggle = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(!open);
      return;
    }
    setInternalOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  }, [isControlled, onOpenChange, open]);

  const rootClass = className ?? undefined;
  return (
    <div className={rootClass} data-testid={testId} data-variant="single">
      <DisclosureHeader
        expanded={open}
        title={title ?? "Detailed analytics"}
        subtitle={subtitle}
        count={count}
        onToggle={handleToggle}
        regionId={regionId}
        hasRegion={open}
      />
      {open && (
        <div
          id={regionId}
          role="region"
          aria-label={
            typeof title === "string"
              ? `${title} contents`
              : "Disclosure contents"
          }
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface GroupedDisclosureInternalProps extends GroupedDisclosureProps {
  reactId: string;
}

function GroupedDisclosure({
  title,
  subtitle,
  count,
  sections,
  defaultOpenSections,
  openSections: openSectionsProp,
  onSectionToggle,
  testId,
  className,
  reactId,
}: GroupedDisclosureInternalProps) {
  const isControlled = openSectionsProp !== undefined;
  const [internalOpen, setInternalOpen] = useState<ReadonlyArray<string>>(
    () => defaultOpenSections ?? [],
  );
  const open = useMemo(
    () => (isControlled ? (openSectionsProp ?? []) : internalOpen),
    [isControlled, openSectionsProp, internalOpen],
  );
  const openSet = useMemo(() => new Set(open), [open]);

  const handleToggle = useCallback(
    (id: string) => {
      const wasOpen = openSet.has(id);
      const next = wasOpen ? open.filter((x) => x !== id) : [...open, id];
      if (isControlled) {
        onSectionToggle?.(id, !wasOpen);
        return;
      }
      setInternalOpen(next);
      onSectionToggle?.(id, !wasOpen);
    },
    [isControlled, onSectionToggle, open, openSet],
  );

  const rootClass = className ?? undefined;
  return (
    <div className={rootClass} data-testid={testId} data-variant="grouped">
      {(title || subtitle || typeof count === "number") && (
        <div style={{ marginBottom: 12 }}>
          {title && <div style={OUTER_HEADER_TITLE_STYLE}>{title}</div>}
          {subtitle && (
            <div style={{ ...OUTER_HEADER_SUBTITLE_STYLE, marginTop: 2 }}>
              {subtitle}
            </div>
          )}
          {typeof count === "number" && (
            <div style={{ ...COUNT_CHIP_STYLE, marginTop: 4 }}>
              {count} views
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sections.map((section) => {
          const expanded = openSet.has(section.id);
          const regionId = `bb-disc-${reactId}-${section.id}`;
          return (
            <div key={section.id} data-section-id={section.id}>
              <DisclosureHeader
                expanded={expanded}
                title={section.title}
                subtitle={section.subtitle}
                count={section.count}
                onToggle={() => handleToggle(section.id)}
                regionId={regionId}
                hasRegion={expanded}
              />
              {expanded && (
                <div
                  id={regionId}
                  role="region"
                  aria-label={
                    typeof section.title === "string"
                      ? `${section.title} contents`
                      : "Section contents"
                  }
                  style={{
                    marginTop: 8,
                    paddingLeft: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Test helper — resets the one-shot warning registry. Exported so
 *  unit tests can assert the warning fires exactly once per session. */
export function __resetDisclosureWarnings() {
  WARNED.clear();
}
