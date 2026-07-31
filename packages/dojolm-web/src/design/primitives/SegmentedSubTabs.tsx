// SPDX-License-Identifier: Apache-2.0
"use client";

import * as Tabs from "@radix-ui/react-tabs";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { I } from "@/design/shell/icons";

export type SegmentedSubTabBadgeTone = "default" | "torii" | "jade" | "steel";
export type SegmentedSubTabTone =
  | "torii"
  | "jade"
  | "amber"
  | "steel"
  | "violet";
export type SegmentedSubTabsMode = "pill" | "underline";
export type SegmentedSubTabsDensity = "comfortable" | "dense";
export type SegmentedSubTabsSize = "default" | "compact";
/** Active-state emphasis. `subtle` (default) is the canonical V1 Buki
 *  pattern: lighter background on the active pill with `--fg` (white) text.
 *  `filled` re-introduces the V1 Kotoba pattern (`v1-09-kotoba-hardening.png`):
 *  torii-red filled active pill with white text. Only applies to
 *  `mode="pill"`; underline mode ignores this prop because its bar is
 *  already torii. The subtle default remains the canonical V2 visual; this
 *  variant exists to preserve V1 Kotoba personality when Phase 2 wires
 *  Kotoba's sub-tabs without a UX regression. */
export type SegmentedSubTabsEmphasis = "subtle" | "filled";
/**
 * Indicator transition behavior. `'fade'` (default) renders the sliding
 * active-indicator with the CSS-driven 320ms cubic-bezier glide;
 * `'none'` collapses to instant. `prefers-reduced-motion: reduce`
 * forces `'none'` regardless of the prop. A future `'slide'` value is
 * reserved for animated panel-content transitions when consumers pass
 * `<Tabs.Content>` children — not yet implemented; spec B.2 ships only
 * `fade` and `none` until panel-level animation is required.
 */
export type SegmentedSubTabsTransition = "fade" | "none";

export interface SegmentedSubTabBadge {
  count: number;
  tone?: SegmentedSubTabBadgeTone;
}

export interface SegmentedSubTabItem {
  id: string;
  label: string;
  romaji?: string;
  icon?: keyof typeof I;
  disabled?: boolean;
  badge?: SegmentedSubTabBadge;
  tone?: SegmentedSubTabTone;
  live?: boolean;
  /**
   * Per-tab `data-testid`. Additive opt-in for consumers that need to
   * pin individual triggers from tests (e.g. Sengoku/Ronin/Arena's
   * `<module>-tab-<id>` contract carried over from the pre-sweep
   * ad-hoc-button implementation). Existing consumers that omit this
   * render unchanged.
   */
  testId?: string;
}

export interface SegmentedSubTabsProps {
  items: readonly SegmentedSubTabItem[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  mode?: SegmentedSubTabsMode;
  density?: SegmentedSubTabsDensity;
  size?: SegmentedSubTabsSize;
  emphasis?: SegmentedSubTabsEmphasis;
  preserveState?: boolean;
  transition?: SegmentedSubTabsTransition;
  className?: string;
  children?: ReactNode;
  /**
   * Root `data-testid` for the Tabs.Root container. Additive opt-in for
   * consumers that need to pin the strip from tests (e.g.
   * `<module>-outer-tabs` contract). Existing consumers that omit this
   * render unchanged.
   */
  testId?: string;
  /**
   * Compatibility bridge for selector-only consumers whose real active panel
   * is rendered outside this Radix root. The primitive links the active tab to
   * that external panel and keeps hidden inactive panel placeholders so every
   * trigger owns a valid relationship. New consumers should prefer children.
   */
  externalPanelIdPrefix?: string;
  /**
   * Set when every external panel remains mounted and already owns the ids
   * derived from `externalPanelIdPrefix`. This suppresses compatibility stubs
   * so the document never contains duplicate panel ids.
   */
  externalPanelsMounted?: boolean;
  /** Ids of lazily visited external panels that remain mounted. */
  externalMountedPanelIds?: readonly string[];
}

export const SEGMENTED_SUB_TABS_MIN_ITEMS = 2;
export const SEGMENTED_SUB_TABS_MAX_ITEMS = 5;

const warnedItemCount = new Set<number>();
let warnedPreserveStateFalse = false;

export const __segmentedSubTabsResetWarnedItemCountForTest = () => {
  warnedItemCount.clear();
  warnedPreserveStateFalse = false;
};

function warnItemCount(count: number) {
  if (
    count >= SEGMENTED_SUB_TABS_MIN_ITEMS &&
    count <= SEGMENTED_SUB_TABS_MAX_ITEMS
  )
    return;
  if (typeof process === "undefined" || process.env.NODE_ENV === "production")
    return;
  if (warnedItemCount.has(count)) return;
  warnedItemCount.add(count);
  console.warn(
    `[SegmentedSubTabs] items.length=${count} is outside the supported range [${SEGMENTED_SUB_TABS_MIN_ITEMS}, ${SEGMENTED_SUB_TABS_MAX_ITEMS}]. ` +
      "Anchor primitive spec B.2 reserves this control for 2–5 sub-views; outside that range, reach for Rail or CommandPalette instead.",
  );
}

function warnPreserveStateFalse() {
  if (warnedPreserveStateFalse) return;
  if (typeof process === "undefined" || process.env.NODE_ENV === "production")
    return;
  warnedPreserveStateFalse = true;
  console.warn(
    "[SegmentedSubTabs] preserveState={false} is not supported: Radix Tabs and the SegmentedSubTabs wrapper preserve panel state across tab switches by default. To force a panel to remount, conditionally render its <Tabs.Content> with a key prop on the consumer side. The preserveState prop is reserved for a future panel-management API and currently has no effect.",
  );
}

export function SegmentedSubTabs({
  items,
  active,
  onChange,
  ariaLabel,
  mode = "pill",
  density = "comfortable",
  size = "default",
  emphasis = "subtle",
  preserveState = true,
  transition = "fade",
  className,
  children,
  testId,
  externalPanelIdPrefix,
  externalPanelsMounted = false,
  externalMountedPanelIds = [],
}: SegmentedSubTabsProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const externalMountedPanelIdSet = new Set(externalMountedPanelIds);

  useEffect(() => {
    warnItemCount(items.length);
  }, [items.length]);

  useEffect(() => {
    if (preserveState === false) warnPreserveStateFalse();
  }, [preserveState]);

  const setTriggerRef = useCallback(
    (id: string) => (node: HTMLButtonElement | null) => {
      if (node) {
        triggerRefs.current.set(id, node);
      } else {
        triggerRefs.current.delete(id);
      }
    },
    [],
  );

  // Stable layout-key derived from item ids + disabled flag — keeps the
  // indicator measurement in sync with what's actually on screen without
  // re-measuring on every parent render that hands us a fresh-but-equal
  // `items` array reference.
  const itemsLayoutKey = items
    .map((t) => `${t.id}:${t.disabled ? "d" : "e"}`)
    .join("|");

  useLayoutEffect(() => {
    const list = listRef.current;
    const node = triggerRefs.current.get(active);
    if (!list || !node) {
      setIndicator(null);
      return;
    }
    const lr = list.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    setIndicator({ x: r.left - lr.left + list.scrollLeft, w: r.width });
    if (r.left < lr.left) {
      list.scrollLeft -= lr.left - r.left;
    } else if (r.right > lr.right) {
      list.scrollLeft += r.right - lr.right;
    }
  }, [active, itemsLayoutKey, mode, density, size]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleValueChange = (next: string) => {
    if (next === active) return;
    onChange(next);
  };

  // `emphasis="filled"` only applies in pill mode — underline already paints
  // its bar in torii. Suppress the class in underline mode to keep the data
  // attribute honest + avoid unused-CSS noise.
  const emphasisFilled = emphasis === "filled" && mode === "pill";

  const listClass = [
    "sst-tablist",
    `sst-tablist--${mode}`,
    density === "dense" ? "sst-tablist--dense" : "",
    size === "compact" ? "sst-tablist--compact" : "",
    transition === "none" ? "sst-tablist--no-motion" : "",
    emphasisFilled ? "sst-tablist--emphasis-filled" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const activeTone = items.find((t) => t.id === active)?.tone;

  const indicatorStyle: CSSProperties = indicator
    ? { transform: `translateX(${indicator.x}px)`, width: indicator.w }
    : { opacity: 0 };

  const trimmedAriaLabel = ariaLabel.trim();

  return (
    <Tabs.Root
      value={active}
      onValueChange={handleValueChange}
      activationMode="automatic"
      orientation="horizontal"
      data-sst-mode={mode}
      data-sst-density={density}
      data-sst-emphasis={emphasis}
      data-sst-transition={transition}
      data-sst-tone={activeTone ?? undefined}
      data-testid={testId}
    >
      <Tabs.List
        ref={listRef}
        aria-label={trimmedAriaLabel.length > 0 ? trimmedAriaLabel : undefined}
        className={listClass}
      >
        <span
          aria-hidden="true"
          data-testid="sst-indicator"
          className={[
            "sst-indicator",
            `sst-indicator--${mode}`,
            !mounted ? "sst-indicator--instant" : "",
            !indicator ? "sst-indicator--hidden" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-sst-tone={activeTone ?? undefined}
          style={indicatorStyle}
        />

        {items.map((item) => {
          const isActive = item.id === active;
          const externalPanelId = externalPanelIdPrefix
            ? `${externalPanelIdPrefix}-${item.id}`
            : undefined;
          return (
            <Tabs.Trigger
              key={item.id}
              ref={setTriggerRef(item.id)}
              value={item.id}
              disabled={item.disabled}
              data-sst-tone={item.tone ?? undefined}
              data-sst-live={item.live ? "true" : undefined}
              data-active={isActive ? "true" : "false"}
              data-testid={item.testId}
              {...(externalPanelId
                ? {
                    id: `${externalPanelId}-trigger`,
                    "aria-controls": externalPanelId,
                  }
                : {})}
              className="sst-tab"
            >
              {item.live ? (
                <span className="sst-tab__pulse" aria-hidden="true">
                  <span className="sst-tab__pulse-ring" />
                  <span className="sst-tab__pulse-dot" />
                </span>
              ) : item.icon ? (
                <span className="sst-tab__icon" aria-hidden="true">
                  {I[item.icon]}
                </span>
              ) : null}

              <span className="sst-tab__label-wrap">
                <span className="sst-tab__label">
                  <span className="sst-tab__text">{item.label}</span>
                  {item.badge ? (
                    <span
                      className="sst-tab__badge"
                      data-sst-badge-tone={item.badge.tone ?? "default"}
                      aria-label={`${item.badge.count} items`}
                    >
                      {item.badge.count}
                    </span>
                  ) : null}
                </span>
                {item.romaji ? (
                  <span className="sst-tab__romaji" aria-hidden="true">
                    {item.romaji}
                  </span>
                ) : null}
              </span>
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>
      {children}
      {/* HAGANE E6.S3 (axe aria-valid-attr-value, critical): most
          consumers use this primitive as a pure selector and render
          panels OUTSIDE Radix — leaving every trigger's aria-controls
          pointing at a non-existent id. When no Tabs.Content children
          are supplied, render display:none stubs so the referenced ids
          exist. Zero layout impact; consumers that DO pass children
          keep full Radix panel behavior. */}
      {children === undefined || children === null
        ? items.map((item) => {
            if (externalPanelIdPrefix) {
              if (
                externalPanelsMounted ||
                externalMountedPanelIdSet.has(item.id) ||
                item.id === active
              ) {
                return null;
              }
              const panelId = `${externalPanelIdPrefix}-${item.id}`;
              return (
                <div
                  key={`sst-stub-${item.id}`}
                  id={panelId}
                  role="tabpanel"
                  aria-labelledby={`${panelId}-trigger`}
                  hidden
                />
              );
            }
            return (
              <Tabs.Content
                key={`sst-stub-${item.id}`}
                value={item.id}
                style={{ display: "none" }}
                aria-hidden="true"
                tabIndex={-1}
              />
            );
          })
        : null}
    </Tabs.Root>
  );
}

export function externalSegmentedPanelProps(prefix: string, panel: string) {
  const id = `${prefix}-${panel}`;
  return Object.freeze({
    id,
    role: "tabpanel" as const,
    "aria-labelledby": `${id}-trigger`,
    tabIndex: 0,
  });
}
