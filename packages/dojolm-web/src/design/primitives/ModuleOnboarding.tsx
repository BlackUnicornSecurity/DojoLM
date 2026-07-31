// SPDX-License-Identifier: Apache-2.0
'use client';

// B.4 anchor primitive — ModuleOnboarding. V1-restoration onboarding card.
// One primitive, three variants behind a discriminated union — same chrome,
// same dismiss UX, distinct render path per variant:
//
//   variant="row-deep-links"  Dashboard pattern. 2-5 step rows; each row
//                             deep-links to another module via the typed
//                             E-B4 cross-module-links helper (or, while
//                             E-B4 is unshipped, the internal
//                             <OnboardingRowLink> Case-B wrapper around
//                             Next.js <Link>).
//   variant="steps"           Atemi pattern. Per-step completion tracked
//                             in localStorage; "All set!" jade tone flips
//                             when every step completes. Optional
//                             auto-dismiss-on-complete.
//   variant="carousel"        Amaterasu pattern. Paginated explainer;
//                             keyboard Left/Right arrow nav; last page's
//                             primary CTA flips to "Get started" and
//                             soft-dismisses on click.
//
// All variants compose:
//   - SSR-safe localStorage state via useModuleOnboardingState — server
//     render returns defaults so first paint stays hydration-clean.
//   - Dismiss link top-right; click writes `tpi.onboarding.<moduleId>.
//     dismissed` and renders null on subsequent mounts.
//   - prefers-reduced-motion respected — every transition collapses to
//     instant when the OS-level setting is active.
//   - Token-driven surface — zero hex literals, zero net-new tokens.
//
// CrossLinkButton dependency — Case B (E-B4 unshipped):
//   The row-deep-links variant composes an internal <OnboardingRowLink>
//   wrapper around Next.js <Link>. Once E-B4 lands the wrapper swaps for
//   <CrossLinkButton> at the marked call site. See the TODO(E-B4) comment
//   inline.

import { useCallback, useEffect, useMemo, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';

import { I, type IconName } from '@/design/shell/icons';
import { useModuleOnboardingState } from '@/lib/onboarding/useModuleOnboardingState';

// ─── Variant + shared types ──────────────────────────────────────────────────

export type ModuleOnboardingVariant = 'row-deep-links' | 'steps' | 'carousel';

export const ROW_DEEP_LINKS_MIN_STEPS = 2;
export const ROW_DEEP_LINKS_MAX_STEPS = 5;
export const STEPS_MIN_STEPS = 2;
export const STEPS_MAX_STEPS = 5;
export const CAROUSEL_MIN_PAGES = 2;
export const CAROUSEL_MAX_PAGES = 7;

const DEFAULT_DISMISS_LABEL = 'Got it, don’t show again →';

export interface ModuleOnboardingRowDeepLinkStep {
  /** Stable id used for keyed render + analytics; not user-visible. */
  readonly id: string;
  /** Row primary text (Inter 14/600). */
  readonly title: string;
  /** Row sub text (mono, optional). */
  readonly description?: string;
  /** Optional icon name (left-side tinted box). */
  readonly icon?: IconName;
  /**
   * Optional decorative kanji mark rendered in the left tile in place of
   * the line-icon (v2 skin — Command Center v2.html:162-165). Decorative
   * only; rendered `lang="ja"` inside the already-`aria-hidden` tile.
   */
  readonly glyph?: string;
  /** Destination route (Next.js href). */
  readonly href: string;
}

export interface ModuleOnboardingStep {
  /** Stable id used for completion tracking + onStepClick callbacks. */
  readonly id: string;
  /** Step primary text. */
  readonly title: string;
  /** Optional concise visual label; the full title remains in the accessible name. */
  readonly compactTitle?: string;
  /** Step description (optional). */
  readonly description?: string;
}

export interface ModuleOnboardingPage {
  /** Stable id used for keyed render + dot-indicator labels. */
  readonly id: string;
  /** Page title (rendered inside the inner card). */
  readonly title: string;
  /** Page body — plain text or rich ReactNode. */
  readonly body: ReactNode;
  /** Optional decorative artwork slot rendered above the title. */
  readonly art?: ReactNode;
}

interface ModuleOnboardingCommonProps {
  /** Stable namespace for localStorage keys (`tpi.onboarding.<moduleId>.*`). */
  readonly moduleId: string;
  /** Card heading. */
  readonly title: string;
  /** Optional sub-heading rendered below the title. */
  readonly subtitle?: string;
  /** Custom dismiss copy; defaults to "Got it, don't show again →". */
  readonly dismissLabel?: string;
  /** Fires once when the dismiss link is clicked (after state writes). */
  readonly onDismiss?: () => void;
  /** Forced override — when true, the card never renders regardless of state. */
  readonly forceDismissed?: boolean;
  readonly className?: string;
  readonly testId?: string;
}

export interface RowDeepLinksOnboardingProps extends ModuleOnboardingCommonProps {
  readonly variant: 'row-deep-links';
  readonly steps: ReadonlyArray<ModuleOnboardingRowDeepLinkStep>;
}

export interface StepsOnboardingProps extends ModuleOnboardingCommonProps {
  readonly variant: 'steps';
  readonly steps: ReadonlyArray<ModuleOnboardingStep>;
  /** When true, the card dismisses itself the moment every step completes. */
  readonly autoDismissOnComplete?: boolean;
  /** Fires when a step row is clicked (consumer wires the action). */
  readonly onStepClick?: (stepId: string) => void;
}

export interface CarouselOnboardingProps extends ModuleOnboardingCommonProps {
  readonly variant: 'carousel';
  readonly pages: ReadonlyArray<ModuleOnboardingPage>;
  /** Fires when the user clicks "Get started" on the last page. */
  readonly onComplete?: () => void;
  /** Last-page CTA copy; defaults to "Get started". */
  readonly completeLabel?: string;
}

export type ModuleOnboardingProps =
  | RowDeepLinksOnboardingProps
  | StepsOnboardingProps
  | CarouselOnboardingProps;

// ─── Dev-only range warnings (one-shot per offending count) ──────────────────

const warnedRowCount = new Set<number>();
const warnedStepsCount = new Set<number>();
const warnedPagesCount = new Set<number>();

export const __moduleOnboardingResetWarningsForTest = () => {
  warnedRowCount.clear();
  warnedStepsCount.clear();
  warnedPagesCount.clear();
};

function isDev(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
}

function warnRange(
  bucket: Set<number>,
  count: number,
  min: number,
  max: number,
  primitive: string,
): void {
  if (count >= min && count <= max) return;
  if (!isDev()) return;
  if (bucket.has(count)) return;
  bucket.add(count);
  console.warn(
    `[ModuleOnboarding] ${primitive} count=${count} is outside the supported range [${min}, ${max}]. ` +
      'Anchor primitive spec B.4 reserves this control for fixed-size onboarding flows; outside that range, ' +
      'reach for a dedicated layout (Drawer, Banner, Carousel) instead.',
  );
}

// ─── Internal Case-B link wrapper ─────────────────────────────────────────────

interface OnboardingRowLinkProps {
  readonly href: string;
  readonly children: ReactNode;
  readonly ariaLabel: string;
  readonly className?: string;
  readonly onClick?: () => void;
  readonly testId?: string;
}

// TODO(E-B4): replace with <CrossLinkButton> when the cross-module-links
// helper ships. Visual treatment is intentionally identical to the spec
// for that helper so the swap is a 1:1 textual replacement.
function OnboardingRowLink({
  href,
  children,
  ariaLabel,
  className,
  onClick,
  testId,
}: OnboardingRowLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      data-testid={testId}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

// ─── Card chrome (shared across variants) ─────────────────────────────────────

interface CardChromeProps {
  readonly moduleId: string;
  readonly tone: 'default' | 'complete';
  readonly title: string;
  readonly subtitle?: string;
  readonly dismissLabel: string;
  readonly onDismissClick: () => void;
  readonly children: ReactNode;
  readonly className?: string;
  readonly testId?: string;
  readonly ariaDescribedBy?: string;
  readonly extraProps?: Record<string, string | boolean>;
}

function CardChrome({
  moduleId,
  tone,
  title,
  subtitle,
  dismissLabel,
  onDismissClick,
  children,
  className,
  testId,
  ariaDescribedBy,
  extraProps,
}: CardChromeProps) {
  const titleId = `mob-${moduleId}-title`;
  const rootClass = [
    'module-onboarding',
    tone === 'complete' && 'module-onboarding--complete',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <section
      role="region"
      aria-labelledby={titleId}
      aria-describedby={ariaDescribedBy}
      data-tone={tone}
      data-testid={testId}
      data-module-id={moduleId}
      className={rootClass}
      {...extraProps}
    >
      <header className="module-onboarding__header">
        <div className="module-onboarding__heading">
          <h2 id={titleId} className="module-onboarding__title">
            {title}
          </h2>
          {subtitle ? <p className="module-onboarding__subtitle">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          className="module-onboarding__dismiss"
          aria-label={`Dismiss ${title} onboarding`}
          onClick={onDismissClick}
          data-testid={testId ? `${testId}-dismiss` : undefined}
        >
          {dismissLabel}
        </button>
      </header>
      {children}
    </section>
  );
}

// ─── Variant: row-deep-links ─────────────────────────────────────────────────

function RowDeepLinks({ props }: { props: RowDeepLinksOnboardingProps }) {
  const { moduleId, title, subtitle, steps, dismissLabel, onDismiss, forceDismissed, testId } = props;

  // Destructure for consistency with StepsVariant + CarouselVariant — keeps
  // the variant-level access pattern uniform across the three render paths
  // even though RowDeepLinks has no useEffect/useCallback deps on the hook.
  const { dismissed, dismiss } = useModuleOnboardingState(moduleId);

  useEffect(() => {
    warnRange(warnedRowCount, steps.length, ROW_DEEP_LINKS_MIN_STEPS, ROW_DEEP_LINKS_MAX_STEPS, 'row-deep-links');
  }, [steps.length]);

  if (forceDismissed || dismissed) return null;

  return (
    <CardChrome
      moduleId={moduleId}
      tone="default"
      title={title}
      subtitle={subtitle}
      dismissLabel={dismissLabel ?? DEFAULT_DISMISS_LABEL}
      onDismissClick={() => {
        dismiss();
        if (onDismiss) onDismiss();
      }}
      testId={testId}
      extraProps={{ 'data-variant': 'row-deep-links' }}
    >
      <ul className="module-onboarding__rows" data-testid={testId ? `${testId}-rows` : undefined}>
        {steps.map((step) => {
          const iconEl = step.icon && step.icon in I ? I[step.icon] : null;
          const ariaParts = [step.title];
          if (step.description) ariaParts.push(step.description);
          return (
            <li key={step.id} className="module-onboarding__row-item">
              <OnboardingRowLink
                href={step.href}
                className="module-onboarding__row"
                ariaLabel={ariaParts.join(' — ')}
                testId={testId ? `${testId}-row-${step.id}` : undefined}
              >
                <span className="module-onboarding__row-icon" aria-hidden="true">
                  {step.glyph ? (
                    <span className="module-onboarding__row-glyph" lang="ja">
                      {step.glyph}
                    </span>
                  ) : (
                    iconEl ?? <span className="module-onboarding__row-icon-dot" />
                  )}
                </span>
                <span className="module-onboarding__row-text">
                  <span className="module-onboarding__row-title">{step.title}</span>
                  {step.description ? (
                    <span className="module-onboarding__row-desc">{step.description}</span>
                  ) : null}
                </span>
                <span className="module-onboarding__row-chevron" aria-hidden="true">
                  →
                </span>
              </OnboardingRowLink>
            </li>
          );
        })}
      </ul>
    </CardChrome>
  );
}

// ─── Variant: steps ──────────────────────────────────────────────────────────

function StepsVariant({ props }: { props: StepsOnboardingProps }) {
  const {
    moduleId,
    title,
    subtitle,
    steps,
    dismissLabel,
    onDismiss,
    onStepClick,
    autoDismissOnComplete,
    forceDismissed,
    testId,
  } = props;

  const {
    dismissed,
    completedSteps,
    dismiss,
    markStepComplete,
    markStepIncomplete,
  } = useModuleOnboardingState(moduleId);
  const total = steps.length;
  const completedCount = useMemo(
    () => steps.filter((s) => completedSteps.includes(s.id)).length,
    [steps, completedSteps],
  );
  const allComplete = total > 0 && completedCount === total;

  useEffect(() => {
    warnRange(warnedStepsCount, total, STEPS_MIN_STEPS, STEPS_MAX_STEPS, 'steps');
  }, [total]);

  useEffect(() => {
    if (allComplete && autoDismissOnComplete && !dismissed) {
      dismiss();
      if (onDismiss) onDismiss();
    }
  }, [allComplete, autoDismissOnComplete, dismissed, dismiss, onDismiss]);

  if (forceDismissed || dismissed) return null;

  const counterId = `mob-${moduleId}-counter`;

  return (
    <CardChrome
      moduleId={moduleId}
      tone={allComplete ? 'complete' : 'default'}
      title={allComplete ? 'All set!' : title}
      subtitle={
        allComplete
          ? `${completedCount}/${total} steps completed`
          : (subtitle ?? `${completedCount}/${total} steps completed`)
      }
      dismissLabel={dismissLabel ?? DEFAULT_DISMISS_LABEL}
      onDismissClick={() => {
        dismiss();
        if (onDismiss) onDismiss();
      }}
      testId={testId}
      ariaDescribedBy={counterId}
      extraProps={{ 'data-variant': 'steps' }}
    >
      <p
        className="module-onboarding__counter"
        id={counterId}
        data-testid={testId ? `${testId}-counter` : undefined}
      >
        {completedCount}/{total} STEPS COMPLETED
      </p>
      <ul className="module-onboarding__steps" data-testid={testId ? `${testId}-steps` : undefined}>
        {steps.map((step, idx) => {
          const isDone = completedSteps.includes(step.id);
          const stepNum = idx + 1;
          // Native checkbox over re-roled <button> per ARIA APG —
          // `role="checkbox"` on a <button> conflicts with its implicit
          // button role and AT may announce inconsistently. The visible
          // ✓ glyph is rendered via the ::after pseudo-element on the
          // adjacent <span> in primitives.css so the input itself stays
          // visually hidden while remaining keyboard-focusable.
          return (
            <li
              key={step.id}
              className={`module-onboarding__step ${isDone ? 'module-onboarding__step--done' : ''}`}
              data-step-id={step.id}
              data-done={isDone ? 'true' : 'false'}
              data-testid={testId ? `${testId}-step-${step.id}` : undefined}
            >
              <label
                className="module-onboarding__step-checkbox"
                data-testid={testId ? `${testId}-step-${step.id}-checkbox-label` : undefined}
              >
                <input
                  type="checkbox"
                  className="module-onboarding__step-checkbox-input"
                  checked={isDone}
                  aria-label={
                    isDone
                      ? `Mark "${step.title}" as not done`
                      : `Mark "${step.title}" as done`
                  }
                  data-testid={testId ? `${testId}-step-${step.id}-checkbox` : undefined}
                  onChange={() => {
                    if (isDone) markStepIncomplete(step.id);
                    else markStepComplete(step.id);
                  }}
                />
                <span className="module-onboarding__step-checkbox-glyph" aria-hidden="true" />
              </label>
              <button
                type="button"
                className="module-onboarding__step-body"
                aria-label={[step.title, step.description, isDone ? 'Completed' : undefined]
                  .filter(Boolean)
                  .join(' — ')}
                onClick={() => onStepClick && onStepClick(step.id)}
                data-testid={testId ? `${testId}-step-${step.id}-body` : undefined}
              >
                <span className="module-onboarding__step-eyebrow" aria-hidden="true">
                  STEP {stepNum}
                </span>
                <span
                  className="module-onboarding__step-title"
                  aria-hidden="true"
                >
                  {step.compactTitle ?? step.title}
                </span>
                {step.description ? (
                  <span className="module-onboarding__step-desc">{step.description}</span>
                ) : null}
                {isDone ? (
                  <span className="module-onboarding__step-status-sr">Completed</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </CardChrome>
  );
}

// ─── Variant: carousel ───────────────────────────────────────────────────────

function CarouselVariant({ props }: { props: CarouselOnboardingProps }) {
  const {
    moduleId,
    title,
    pages,
    dismissLabel,
    onDismiss,
    onComplete,
    completeLabel,
    forceDismissed,
    testId,
  } = props;

  // Destructure individual fields out of the hook so the useCallback /
  // useEffect dependency arrays compare against stable references —
  // the hook returns a fresh object literal every render, but the
  // memoized setters + boolean primitives below do not.
  const { dismissed, currentPage: rawCurrentPage, goToPage, dismiss } =
    useModuleOnboardingState(moduleId);
  const total = pages.length;
  const safeCurrent = Math.min(Math.max(rawCurrentPage, 0), Math.max(0, total - 1));
  const currentPage = pages[safeCurrent];
  const isFirst = safeCurrent === 0;
  const isLast = safeCurrent === total - 1;

  useEffect(() => {
    warnRange(warnedPagesCount, total, CAROUSEL_MIN_PAGES, CAROUSEL_MAX_PAGES, 'carousel');
  }, [total]);

  const goPrev = useCallback(() => {
    if (isFirst) return;
    goToPage(safeCurrent - 1);
  }, [isFirst, safeCurrent, goToPage]);

  const goNext = useCallback(() => {
    if (isLast) return;
    goToPage(safeCurrent + 1);
  }, [isLast, safeCurrent, goToPage]);

  const handleComplete = useCallback(() => {
    if (onComplete) onComplete();
    dismiss();
    if (onDismiss) onDismiss();
  }, [onComplete, onDismiss, dismiss]);

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isLast) handleComplete();
        else goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (!dismissed) {
          dismiss();
          if (onDismiss) onDismiss();
        }
      }
    },
    [dismiss, dismissed, goNext, goPrev, handleComplete, isLast, onDismiss],
  );

  if (forceDismissed || dismissed) return null;
  if (total === 0 || !currentPage) return null;

  const carouselSubtitle = `Step ${safeCurrent + 1} of ${total} — ${currentPage.title}`;
  const completeText = completeLabel ?? 'Get started';

  return (
    <section
      role="region"
      aria-labelledby={`mob-${moduleId}-title`}
      data-tone="default"
      data-variant="carousel"
      data-testid={testId}
      data-module-id={moduleId}
      className="module-onboarding module-onboarding--carousel"
      tabIndex={0}
      onKeyDown={handleKey}
    >
      <header className="module-onboarding__header">
        <div className="module-onboarding__heading">
          <h2 id={`mob-${moduleId}-title`} className="module-onboarding__title">
            {title}
          </h2>
          <p
            className="module-onboarding__subtitle"
            aria-live="polite"
            data-testid={testId ? `${testId}-subtitle` : undefined}
          >
            {carouselSubtitle}
          </p>
        </div>
        <button
          type="button"
          className="module-onboarding__dismiss"
          aria-label={`Dismiss ${title} onboarding`}
          onClick={() => {
            if (dismissed) return;
            dismiss();
            if (onDismiss) onDismiss();
          }}
          data-testid={testId ? `${testId}-dismiss` : undefined}
        >
          {dismissLabel ?? DEFAULT_DISMISS_LABEL}
        </button>
      </header>

      <div
        className="module-onboarding__page"
        data-testid={testId ? `${testId}-page-${currentPage.id}` : undefined}
      >
        {currentPage.art ? (
          <div className="module-onboarding__page-art" aria-hidden="true">
            {currentPage.art}
          </div>
        ) : null}
        <h3 className="module-onboarding__page-title">{currentPage.title}</h3>
        <div className="module-onboarding__page-body">{currentPage.body}</div>
      </div>

      <footer className="module-onboarding__footer">
        <ol
          className="module-onboarding__dots"
          role="tablist"
          aria-label="Onboarding pages"
          data-testid={testId ? `${testId}-dots` : undefined}
        >
          {pages.map((page, idx) => {
            const isCurrent = idx === safeCurrent;
            return (
              <li key={page.id} role="presentation" className="module-onboarding__dot-item">
                <button
                  type="button"
                  role="tab"
                  className={`module-onboarding__dot ${isCurrent ? 'module-onboarding__dot--current' : ''}`}
                  aria-selected={isCurrent}
                  aria-label={`Page ${idx + 1} of ${total} — ${page.title}`}
                  data-testid={testId ? `${testId}-dot-${page.id}` : undefined}
                  onClick={() => goToPage(idx)}
                />
              </li>
            );
          })}
        </ol>
        <div className="module-onboarding__nav">
          {!isFirst ? (
            <button
              type="button"
              className="module-onboarding__btn module-onboarding__btn--ghost"
              onClick={goPrev}
              data-testid={testId ? `${testId}-back` : undefined}
            >
              ← Back
            </button>
          ) : null}
          {isLast ? (
            <button
              type="button"
              className="module-onboarding__btn module-onboarding__btn--primary"
              onClick={handleComplete}
              data-testid={testId ? `${testId}-complete` : undefined}
            >
              {completeText}
            </button>
          ) : (
            <button
              type="button"
              className="module-onboarding__btn module-onboarding__btn--primary"
              onClick={goNext}
              data-testid={testId ? `${testId}-next` : undefined}
            >
              Next →
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}

// ─── Public component (variant router) ───────────────────────────────────────

export function ModuleOnboarding(props: ModuleOnboardingProps) {
  if (props.variant === 'row-deep-links') {
    return <RowDeepLinks props={props} />;
  }
  if (props.variant === 'steps') {
    return <StepsVariant props={props} />;
  }
  return <CarouselVariant props={props} />;
}
