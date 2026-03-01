# DojoLM UI Modernization Epic

**Epic ID**: TPI-UI-001
**Status**: COMPLETE - All 8 Phases Done, Epic Closed
**Created**: 2026-03-01
**Updated**: 2026-03-01 (Phase 8 LLM + Extras implemented: Stories 22, 23, 24 - all code reviewed and fixed. Final QA passed.)
**Priority**: HIGH (Visual polish, brand alignment, UX improvements)
**Sprint**: UI Modernization Sprint

---

## Overview

Modernize the DojoLM web application UI to align with BlackUnicorn design standards. Current issues include:
- Off-brand color scheme (blue instead of DojoLM red)
- Missing left sidebar navigation
- 7 navigation items (should be 5)
- Dropdown transparency bugs
- Missing BlackUnicorn co-branding

**Source**: [team/ui-modernization-plan.md](./ui-modernization-plan.md)

**SME Review Scores**:
- UX Designer: 9.5/10
- Architect: 7/10
- Developer: 6/10

**Critical Changes from SME Review**:
- WCAG contrast fix: darker red (#C62828) for normal text
- Story 5 moved before Story 3 (dependency fix)
- New Story 5.5: Navigation Context (tab-based approach)
- New Story 11: Layout Integration (separated from Story 8)
- Total estimate updated: 11.25h → 16.5h → 23h → 31h → **42h** (feedback alignment applied)

---

## Web Development Guidelines

> Applicable principles filtered for this project's stack: **Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS v4 + Vitest + Playwright + Shadcn UI / Radix**

### Analysis Checklist (before each story)

- Verify component dependencies and imports are correct
- Confirm Tailwind CSS v4 `@theme inline` tokens exist for any new design values
- Check existing Shadcn/Radix components before creating new ones
- Validate accessibility requirements (WCAG AA, axe-core integration)
- Review Core Web Vitals impact (LCP < 2.5s, FID < 100ms, CLS < 0.1)

### React / Next.js Standards

- **Functional components only** with hooks (no class components)
- **Proper dependency arrays** in `useEffect` / `useMemo` / `useCallback`
- **Memoization** (`useMemo`, `useCallback`, `React.memo`) when beneficial — don't over-apply
- **Stable key props** in all lists (never use array index as key for dynamic lists)
- **TypeScript interfaces/types** for all props — no `any` types
- **Error boundaries** for graceful failure in component trees
- **Avoid inline function definitions** in JSX render (extract to named handlers)
- **`next/dynamic`** for code splitting heavy components (charts, editors)
- **Memory leak prevention**: clean up event listeners, subscriptions, and timers in `useEffect` return

### CSS / Tailwind Standards

- **Mobile-first** responsive design (`sm:`, `md:`, `lg:` breakpoints)
- **CSS custom properties** (`--var`) in `globals.css` for all design tokens
- **No `!important`** unless absolutely unavoidable (document reason inline)
- **Minimize repaints/reflows**: prefer `transform` and `opacity` for animations
- **Focus states on all interactive elements** (DojoLM red focus ring)
- **`prefers-reduced-motion`** respected — all animations must have reduced motion fallback
- **Tailwind `cn()` utility** (clsx + tailwind-merge) for all conditional classes

### HTML / Semantic Markup

- **Semantic elements**: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- **Proper heading hierarchy**: h1→h6 without skipping levels
- **Accessible forms**: every input has a `<label>`, ARIA attributes where needed
- **Accessible interactive elements**: buttons for actions, links for navigation

### JavaScript / TypeScript

- **ES6+ syntax** throughout (const/let, arrow functions, destructuring, template literals)
- **`async/await`** for all asynchronous operations (no raw Promise chains)
- **Proper error handling**: try/catch with typed errors, error boundaries for UI
- **Bundle size awareness**: tree-shaking friendly named imports (`import { X } from 'lib'`)
- **No unused imports or variables** — TypeScript strict mode enforces this

### Performance

- **Lazy loading** images (`next/image`) and heavy components (`next/dynamic`)
- **Debounce/throttle** expensive operations (search inputs, scroll handlers, resize)
- **Virtual scrolling** for long lists (react-window / @tanstack/react-virtual already installed)
- **Code splitting** by route (Next.js App Router handles automatically)
- **Core Web Vitals targets**: LCP < 2.5s, FID < 100ms, CLS < 0.1

### Accessibility (A11y)

- **Keyboard navigation** on all interactive elements
- **Screen reader compatibility** via semantic HTML + ARIA
- **Color contrast**: WCAG AA minimum (4.5:1 normal text, 3:1 large text)
- **Focus management**: visible focus ring, logical tab order
- **Alt text** on all informational images
- **`prefers-reduced-motion`**: disable or reduce all animations

### Security

- **Sanitize user inputs** before rendering (XSS prevention)
- **No raw HTML injection** — use safe React rendering; if unavoidable, sanitize with DOMPurify
- **CSP headers** already configured in `next.config.ts` — maintain them
- **Validate at system boundaries** (user input, external API responses)

### Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest + Testing Library | Component rendering, hooks, utilities |
| Integration | Vitest + Testing Library | Component interactions, context providers |
| E2E | Playwright | Critical user journeys, cross-browser |
| Accessibility | axe-core (integrated) | Automated WCAG violation detection |
| Visual | Browser DevTools + Lighthouse | Layout, responsive, performance |

- Test both happy paths and error states
- Aim for 80%+ coverage on new components
- Run `npm run test` before marking any story complete

### Pre-Completion Checklist (per story)

- [ ] No debug `console.log()` in production code
- [ ] No commented-out code blocks
- [ ] TypeScript compiles without errors
- [ ] ESLint passes (`npm run lint`)
- [ ] Tests passing (`npm run test`)
- [ ] Accessibility: axe-core reports no violations
- [ ] `npm run build` succeeds without warnings
- [ ] Bundle size acceptable (no unexpected increases)

### Development Iteration Principle

> **Make it work → Make it right → Make it fast**
>
> Ship a working version first, refine for quality second, optimize for performance third. Prioritize user experience above all else.

---

## User Stories

### Story 1: Update Color System (Priority: HIGH)

**ID**: TPI-UI-001-01
**SME Changes**: WCAG fix, additional tokens, variable cleanup
**Dribbble 95% Update**: Added glassmorphic utilities, shimmer animation, gradient card overlays, view transition CSS
**Feedback Update**: Added card state tokens, --dojo-subtle, --text-quaternary, input focus ring, custom scrollbar, Inter + JetBrains Mono fonts

**As a** user
**I want** the application to use BlackUnicorn dark colors with DojoLM red accents
**So that** the interface matches the brand standards

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/app/globals.css` updated with new color tokens
- [ ] BlackUnicorn primary colors: #000000, #0A0A0A, #1C1C1E
- [ ] DojoLM red accents: #C62828 (primary - WCAG compliant), #E63946 (large text), #FF1744 (electric), #D32F2F (hover)
- [ ] Border color: #27272A
- [ ] Popover background is solid (#141414) - NO transparency
- [ ] OLD color variables removed (#0A84FF blue, etc.)
- [ ] Transition tokens added
- [ ] Z-index scale defined
- [ ] All CSS variables properly defined in :root
- [ ] Glassmorphic utility classes added (`.glass`, `.glass-card`)
- [ ] Shimmer animation keyframe added (`@keyframes shimmer`)
- [ ] Gradient card overlay utilities added (`.gradient-overlay-*`)
- [ ] View transition CSS added (`@keyframes fade-in`, `@keyframes slide-up`)
- [ ] **Card state tokens**: `--card-elevated: #141414`, `--card-pressed: #0A0A0A`
- [ ] **Subtle accent**: `--dojo-subtle: rgba(230, 57, 70, 0.1)` for active item backgrounds
- [ ] **Text quaternary**: `--text-quaternary: #52525B` for disabled/placeholder text
- [ ] **Input focus ring**: global rule overriding default blue ring to DojoLM red
- [ ] **Custom scrollbar**: dark-themed scrollbar for webkit + Firefox
- [ ] **Font imports**: Inter (sans) + JetBrains Mono (code) via `next/font` or CSS import
- [ ] Application builds successfully: `npm run build`

**WCAG Compliance Note**:
- #C62828 + white = 4.6:1 (WCAG AA PASS for normal text)
- #E63946 + white = 3.9:1 (WCAG AA FAIL - use for large text only)

**Implementation Details**:
File: `packages/dojolm-web/src/app/globals.css`

```css
:root {
  /* ===== BlackUnicorn primary colors - base theme ===== */
  --background: #000000;
  --bg-secondary: #0A0A0A;
  --bg-tertiary: #141414;
  --bg-quaternary: #1C1C1E;

  /* ===== DojoLM red for accents only ===== */
  --dojo-primary: #C62828;      /* WCAG AA compliant (4.6:1) */
  --dojo-primary-lg: #E63946;   /* Large text only (3.9:1) */
  --dojo-electric: #FF1744;
  --dojo-hover: #D32F2F;

  /* ===== Semantic colors ===== */
  --success: #22C55E;
  --warning: #F59E0B;
  --danger: #C62828;  /* Use WCAG-compliant red */

  /* ===== Text colors ===== */
  --foreground: #FAFAFA;
  --muted-foreground: #A1A1AA;
  --text-tertiary: #71717A;

  /* ===== UI colors ===== */
  --card: #0A0A0A;
  --popover: #141414;  /* SOLID - fix transparency */
  --accent: #1C1C1E;
  --border: #27272A;

  /* ===== Primary action - DojoLM red (WCAG compliant) ===== */
  --primary: #C62828;
  --primary-foreground: #FFFFFF;
  --ring: #C62828;

  /* ===== Secondary - dark grey ===== */
  --secondary: #1C1C1E;
  --secondary-foreground: #FAFAFA;

  /* ===== Layout tokens ===== */
  --sidebar-width: 260px;
  --sidebar-collapsed: 72px;
  --header-height: 64px;

  /* ===== Spacing (8px grid) ===== */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* ===== Transitions ===== */
  --transition-fast: 150ms;
  --transition-normal: 200ms;

  /* ===== Z-index scale ===== */
  --z-mobile-nav: 50;
  --z-sidebar: 40;
  --z-dropdown: 60;

  /* ===== Border radius ===== */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* ===== Card state tokens (Feedback: Spectram Fintech depth) ===== */
  --card-elevated: #141414;
  --card-pressed: #0A0A0A;
  --dojo-subtle: rgba(230, 57, 70, 0.1);
  --text-quaternary: #52525B;
}

/* ===== Fonts (Feedback: Inter + JetBrains Mono) ===== */
/* Import in layout.tsx via next/font/google:
   import { Inter, JetBrains_Mono } from 'next/font/google'
   Or fallback CSS import: */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ===== Input focus ring (Feedback: DojoLM red focus) ===== */
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

input:focus, textarea:focus, select:focus {
  border-color: var(--ring);
  box-shadow: 0 0 0 2px rgba(198, 40, 40, 0.2);
}

/* ===== Custom scrollbar (Feedback: dark theme scrollbar) ===== */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--background);
}
::-webkit-scrollbar-thumb {
  background: var(--bg-quaternary);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--border);
}
/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--bg-quaternary) var(--background);
}

/* ===== Glassmorphic utilities (Dribbble: YouTube Analytics, AI Dashboard) ===== */
.glass {
  background: rgba(10, 10, 10, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-card {
  background: rgba(10, 10, 10, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all var(--transition-normal) ease;
}

.glass-card:hover {
  background: rgba(20, 20, 20, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
}

/* ===== Gradient card overlays (Dribbble: AI Dashboard soft gradients) ===== */
.gradient-overlay-primary {
  background: linear-gradient(135deg, rgba(198, 40, 40, 0.08) 0%, transparent 60%);
}
.gradient-overlay-success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, transparent 60%);
}
.gradient-overlay-warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, transparent 60%);
}
.gradient-overlay-danger {
  background: linear-gradient(135deg, rgba(198, 40, 40, 0.12) 0%, transparent 60%);
}

/* ===== Shimmer loading animation (Dribbble: AI Dashboard skeletons) ===== */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-shimmer {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

/* ===== View transitions (Dribbble: smooth page switches) ===== */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in var(--transition-normal) ease-out;
}

.animate-slide-up {
  animation: slide-up var(--transition-normal) ease-out;
}
```

**Cleanup Tasks**:
Remove old color variables (if present):
- `--blue: #0A84FF` (off-brand)
- `--red: #FF453A` (old DojoLM red)
- Any other legacy colors

**Files Modified**:
- `packages/dojolm-web/src/app/globals.css`

**Verification**:
```bash
cd packages/dojolm-web
npm run build
# Visual check: colors apply correctly
```

**Commit Message**: `feat(ui): add BlackUnicorn/DojoLM color system with WCAG compliance (TPI-UI-001-01)`

**Estimate**: 3.5 hours (updated: +1h glassmorphic/shimmer/gradient/transition, +1h fonts/tokens/scrollbar/focus ring)

---

### Story 2: Fix Dropdown Transparency Bug (Priority: HIGH)

**ID**: TPI-UI-001-02

**As a** user
**I want** dropdown menus to have solid, opaque backgrounds
**So that** I can read options clearly without content showing through

**Acceptance Criteria**:
- [x] `packages/dojolm-web/src/components/ui/select.tsx` updated
- [x] SelectContent popover uses CSS variable (solid color)
- [x] No transparency in dropdown backgrounds
- [x] Dropdown text is readable in dark theme
- [x] All Select components across app verified

**Implementation Details**:
File: `packages/dojolm-web/src/components/ui/select.tsx`

The CSS variable `--popover: #141414` from Story 1 provides the solid color.
Ensure SelectContent uses `bg-popover` class correctly.

**Affected Components** (verify after fix):
- `LocalModelSelector.tsx`
- `ModelForm.tsx`
- `TestRunner.tsx`
- Any other components using Select

**Files Modified**:
- `packages/dojolm-web/src/components/ui/select.tsx`

**Verification**:
```bash
cd packages/dojolm-web
npm run dev
# Manual: Open Select dropdowns, verify solid background
```

**Commit Message**: `fix(ui): remove transparency from Select dropdowns (TPI-UI-001-02)`

**Estimate**: 0.5 hours

---

### Story 3: Create Sidebar Component (Priority: HIGH)

**ID**: TPI-UI-001-03
**SME Changes**: Now uses context-based navigation, not routing
**Dribbble 95% Update**: Added dedicated collapse toggle button (icon-only mode, YouTube Analytics pattern)
**Feedback Update**: Active state changed to left border (3px red) + subtle bg tint. Added tooltip on collapsed icons.

**As a** user
**I want** a left sidebar navigation with 5 consolidated items
**So that** I can navigate the application efficiently

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/layout/Sidebar.tsx` created
- [ ] Desktop width: 260px, collapsed: 72px
- [ ] Active state: **3px left border (DojoLM red) + subtle bg tint** (`--dojo-subtle`)
- [ ] **Tooltip on collapsed icons** (title attribute or custom tooltip)
- [ ] Icons for each navigation item
- [ ] Co-branded header (BlackUnicorn + DojoLM)
- [ ] Responsive: collapses to icons on tablet (768-1024px)
- [ ] Expandable on hover when collapsed (tablet)
- [ ] **Collapse toggle button** at bottom of sidebar (pin/unpin icon) for desktop users
- [ ] **Icon-only mode**: when collapsed on desktop, shows only icons (like YouTube Analytics sidebar)
- [ ] **Smooth expand/collapse animation** using CSS transitions
- [ ] 5 navigation items: Scanner, Test Lab, Coverage, Validation, LLM Dashboard
- [ ] Uses NavigationContext (not URL routing)

**Implementation Details**:
File: `packages/dojolm-web/src/components/layout/Sidebar.tsx` (NEW)

```tsx
'use client'

import { useContext, useState } from 'react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import { NavigationContext } from '@/lib/NavigationContext'
import { Settings, PanelLeftClose, PanelLeft } from 'lucide-react'

export function Sidebar() {
  const { activeTab, setActiveTab } = useContext(NavigationContext)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-[#0A0A0A] border-r border-[#27272A] flex flex-col z-[var(--z-sidebar)]",
      "transition-all duration-[var(--transition-normal)] ease-in-out",
      collapsed ? "w-[72px]" : "w-[260px]",
      // Tablet: always collapsed, expand on hover
      "md:max-lg:w-[72px] md:max-lg:hover:w-[260px]"
    )}>
      {/* Header - co-branded */}
      <div className="h-16 flex items-center px-4 border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#FAFAFA]">[BU]</span>
          <span className="text-lg font-bold text-[#E63946]">DojoLM</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 mx-2 rounded-md relative",
                "transition-all duration-[var(--transition-normal)]",
                isActive
                  ? "bg-[var(--dojo-subtle)] text-[#FAFAFA] border-l-[3px] border-l-[#C62828]"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1C1C1E] border-l-[3px] border-l-transparent"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-[#C62828]")} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-2 border-t border-[#27272A]">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-md text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#1C1C1E] transition-colors">
          <Settings className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Settings</span>}
        </button>
        {/* Collapse toggle (Dribbble: YouTube Analytics icon-only sidebar) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-md text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#1C1C1E] transition-colors hidden lg:flex"
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          {!collapsed && <span className="font-medium text-sm">Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
```

**Tablet Hover Expansion** (add to aside className):
```tsx
className={cn(
  "fixed left-0 top-0 h-screen bg-[#0A0A0A] border-r border-[#27272A] flex flex-col z-[var(--z-sidebar)]",
  "w-[260px] lg:w-[260px]",              // Full width on desktop
  "md:w-[72px] md:hover:w-[260px]",      // Collapsed with hover on tablet
  "transition-all duration-[var(--transition-normal)]"
)}
```

**Files Modified**:
- `packages/dojolm-web/src/components/layout/Sidebar.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run dev
# Visual: Sidebar appears on left, 5 items visible
# Test: Click each item, verify navigation
# Tablet: Hover to expand collapsed sidebar
```

**Commit Message**: `feat(ui): create context-based sidebar navigation with collapse toggle (TPI-UI-001-03)`

**Estimate**: 3 hours (updated: +0.5h collapse toggle, +0.5h left-border active state + tooltips)

---

### Story 4: Create Co-Branded Header Component (Priority: MEDIUM)

**ID**: TPI-UI-001-04
**SME Changes**: Asset preparation added, max dimensions specified

**As a** user
**I want** to see both BlackUnicorn and DojoLM branding in the header
**So that** I understand the product and company relationship

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/layout/SidebarHeader.tsx` created
- [ ] BlackUnicorn logo displayed on left (max-height: 32px)
- [ ] DojoLM wordmark displayed on right
- [ ] Subtitle shows "TPI Security Test Lab" (from `products.dojolm.focus`)
- [ ] Component integrates with Sidebar
- [ ] Logo assets moved to public/ and optimized

**Asset Preparation** (do first):
- [ ] Move BlackUnicorn logo from `team/branding/assets/blackunicorn/unprocessed/Logo BU No background.png`
  - To: `packages/dojolm-web/public/branding/blackunicorn.png`
  - Optimize: WebP format, max-height 32px
- [ ] Move DojoLM logo from `team/branding/assets/dojolm/unprocessed/DOJO v2 no text.jpg`
  - To: `packages/dojolm-web/public/branding/dojolm.png`
  - Optimize: WebP format, max-height 24px

**Implementation Details**:
File: `packages/dojolm-web/src/components/layout/SidebarHeader.tsx` (NEW)

```tsx
'use client'

import Image from 'next/image'

export function SidebarHeader() {
  return (
    <div className="h-16 flex items-center px-4 border-b border-[#27272A]">
      <div className="flex items-center gap-3">
        {/* BlackUnicorn logo */}
        <div className="relative w-8 h-8 flex-shrink-0">
          <Image
            src="/branding/blackunicorn.png"
            alt="BlackUnicorn"
            fill
            className="object-contain"
            priority
          />
        </div>

        <div className="flex flex-col">
          <span className="text-lg font-bold text-[#E63946]">DojoLM</span>
          <span className="text-xs text-[#71717A]">TPI Security Test Lab</span>
        </div>
      </div>
    </div>
  )
}
```

**Fallback** (if assets not ready):
```tsx
{/* Fallback placeholder until assets are moved */}
<div className="w-8 h-8 bg-[#000000] rounded flex items-center justify-center border border-[#27272A]">
  <span className="text-xs font-bold text-white">BU</span>
</div>
```

**Files Modified**:
- `packages/dojolm-web/src/components/layout/SidebarHeader.tsx` (NEW)
- `packages/dojolm-web/public/branding/` (NEW directory with assets)

**Verification**:
```bash
cd packages/dojolm-web
npm run dev
# Visual: Both logos visible in sidebar header
```

**Commit Message**: `feat(ui): create co-branded header component (TPI-UI-001-04)`

**Estimate**: 1.5 hours

---

### Story 5: Update Navigation Constants (Priority: MEDIUM)

**ID**: TPI-UI-001-05
**SME Changes**: Fixed TypeScript, moved before Story 3

**As a** developer
**I want** centralized navigation configuration
**So that** navigation items are consistent across the app

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/lib/constants.ts` updated with NAV_ITEMS
- [ ] 5 navigation items defined with icons and descriptions
- [ ] TypeScript `as const` for type safety
- [ ] Exported for use in Sidebar, MobileNav
- [ ] NavItem type derived from const array

**Implementation Details**:
File: `packages/dojolm-web/src/lib/constants.ts`

```typescript
import {
  Shield,
  FlaskConical,
  Target,
  PlayCircle,
  Brain,
  type LucideIcon
} from 'lucide-react'

export const NAV_ITEMS = [
  {
    id: 'scanner',
    label: 'Scanner',
    icon: Shield,
    description: 'Live prompt injection detection'
  },
  {
    id: 'testing',
    label: 'Test Lab',
    icon: FlaskConical,
    description: 'Fixtures and test payloads'
  },
  {
    id: 'coverage',
    label: 'Coverage',
    icon: Target,
    description: 'Coverage maps and patterns'
  },
  {
    id: 'validation',
    label: 'Validation',
    icon: PlayCircle,
    description: 'Run regression tests'
  },
  {
    id: 'llm',
    label: 'LLM Dashboard',
    icon: Brain,
    description: 'LLM testing interface'
  }
] as const

// Derive type from const array
export type NavItem = typeof NAV_ITEMS[number]
export type NavId = NavItem['id']
```

**Files Modified**:
- `packages/dojolm-web/src/lib/constants.ts`

**Verification**:
```bash
cd packages/dojolm-web
npm run type-check  # Should pass
```

**Commit Message**: `feat(ui): define navigation constants (TPI-UI-001-05)`

**Estimate**: 0.5 hours

---

### Story 5.5: Create Navigation Context (Priority: HIGH)

**ID**: TPI-UI-001-05-5
**SME Changes**: NEW STORY - addresses routing architecture mismatch

**As a** developer
**I want** a centralized navigation context
**So that** Sidebar and page content can sync active tab state

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/lib/NavigationContext.tsx` created
- [ ] Context provides `activeTab` and `setActiveTab`
- [ ] Default tab: 'scanner'
- [ ] TypeScript types for NavId
- [ ] Provider wraps main content

**Implementation Details**:
File: `packages/dojolm-web/src/lib/NavigationContext.tsx` (NEW)

```tsx
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import type { NavId } from './constants'

interface NavigationContextValue {
  activeTab: NavId
  setActiveTab: (tab: NavId) => void
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<NavId>('scanner')

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}
```

**Files Modified**:
- `packages/dojolm-web/src/lib/NavigationContext.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run type-check  # Should pass
```

**Commit Message**: `feat(ui): create navigation context for tab state (TPI-UI-001-05-5)`

**Estimate**: 0.75 hours

---

### Story 6: Update Button Styles (Priority: MEDIUM)

**ID**: TPI-UI-001-06
**SME Changes**: Changed to verification task (no code changes needed)
**Feedback Update**: Upgraded to implementation. Primary button now uses gradient + hover lift + glow shadow + press scale as defaults.

**As a** user
**I want** buttons to use DojoLM red with gradient styling and micro-interactions
**So that** CTAs feel premium and responsive to user interaction

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/ui/button.tsx` updated
- [ ] **Primary buttons**: 135deg gradient (#C62828 → #D32F2F) as default, not flat color
- [ ] **Hover state**: translateY(-1px) + glow shadow `0 4px 15px rgba(198,40,40,0.3)`
- [ ] **Active/press state**: scale(0.98) on click
- [ ] Secondary buttons use `--secondary` (#1C1C1E)
- [ ] Ghost buttons use `--accent` for hover
- [ ] Focus ring uses `--ring` (#C62828) with offset
- [ ] All button sizes have min 44px touch target on mobile
- [ ] `gradient` variant for high-impact CTAs (brighter gradient)

**Implementation Details**:
File: `packages/dojolm-web/src/components/ui/button.tsx` (MODIFY)

```tsx
// Updated default variant:
default: cn(
  "bg-gradient-to-br from-[#C62828] to-[#D32F2F] text-white",
  "hover:-translate-y-px hover:shadow-[0_4px_15px_rgba(198,40,40,0.3)]",
  "active:scale-[0.98] active:translate-y-0",
  "transition-all duration-[var(--transition-fast)]"
),
// High-impact CTA:
gradient: cn(
  "bg-gradient-to-r from-[#C62828] to-[#E63946] text-white",
  "hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(230,57,70,0.4)]",
  "active:scale-[0.98]"
),
```

**Files Modified**:
- `packages/dojolm-web/src/components/ui/button.tsx`

**Verification**:
```bash
cd packages/dojolm-web
npm run dev
# Visual: Primary buttons show gradient, lift on hover, glow shadow
# Visual: Press down scales to 0.98
# Mobile: Touch targets at least 44px
```

**Commit Message**: `feat(ui): upgrade button styles with gradient, hover lift, and press effect (TPI-UI-001-06)`

**Estimate**: 1 hour (updated: +0.5h for gradient/hover/press implementation)

---

### Story 7: Update Card Styles (Priority: MEDIUM)

**ID**: TPI-UI-001-07
**SME Changes**: Changed to verification task (no code changes needed)
**Dribbble 95% Update**: Now includes glassmorphic hover (backdrop-blur + lift + glow). Upgraded from verification to implementation.

**As a** user
**I want** cards to have proper dark theme styling with depth and elevation
**So that** content sections feel interactive and match modern dashboard aesthetics

**Acceptance Criteria**:
- [ ] Verify `packages/dojolm-web/src/components/ui/card.tsx` uses CSS variables
- [ ] Card background uses `bg-card` (#0A0A0A)
- [ ] Border uses `border` (#27272A)
- [ ] **Glassmorphic hover effect**: translateY(-2px) lift + enhanced shadow + border glow
- [ ] **Transition animation**: smooth 200ms ease on hover/unhover
- [ ] **Optional glass-card variant**: backdrop-blur + semi-transparent background
- [ ] Consistent padding using spacing tokens

**Implementation Details** (REQUIRED - not optional):
```tsx
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      "transition-all duration-[var(--transition-normal)] ease-out",
      "hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5",
      "hover:border-[rgba(255,255,255,0.1)]",
      className
    )}
    {...props}
  />
))
```

**Files Modified**:
- `packages/dojolm-web/src/components/ui/card.tsx`

**Verification**:
```bash
cd packages/dojolm-web
npm run dev
# Visual: Cards lift on hover with enhanced shadow
# Visual: Border brightens subtly on hover
# Visual: Smooth transition in/out
```

**Commit Message**: `feat(ui): add glassmorphic hover effect to card component (TPI-UI-001-07)`

**Estimate**: 0.5 hours (updated: +0.25h for glassmorphic hover implementation)

---

### Story 8: Refactor Page Content for Tab-Based Navigation (Priority: HIGH)

**ID**: TPI-UI-001-08
**SME Changes**: NEW SCOPE - Refactor existing tabs to use context

**As a** developer
**I want** the page content to use NavigationContext for tab switching
**So that** Sidebar buttons can control which content is visible

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/app/page.tsx` refactored
- [ ] Top Tabs component removed (replaced by Sidebar)
- [ ] Content wrapped in NavigationProvider
- [ ] `useNavigation()` hook replaces local `activeTab` state
- [ ] All existing functionality preserved
- [ ] Each tab content conditionally rendered based on `activeTab`

**Implementation Details**:
File: `packages/dojolm-web/src/app/page.tsx`

Before (current):
```tsx
const [activeTab, setActiveTab] = useState('scanner')
<Tabs value={activeTab} onValueChange={setActiveTab}>
```

After (refactored):
```tsx
import { NavigationProvider, useNavigation } from '@/lib/NavigationContext'

function PageContent() {
  const { activeTab } = useNavigation()

  return (
    <>
      {activeTab === 'scanner' && <ScannerContent />}
      {activeTab === 'testing' && <TestingContent />}
      {activeTab === 'coverage' && <CoverageContent />}
      {activeTab === 'validation' && <ValidationContent />}
      {activeTab === 'llm' && <LLMContent />}
    </>
  )
}

export default function HomePage() {
  return (
    <NavigationProvider>
      <PageContent />
    </NavigationProvider>
  )
}
```

**Content Consolidation Tasks**:
- [ ] Test Lab: Combine Fixtures + Test Payloads (add sub-navigation)
- [ ] Coverage: Combine Coverage Map + Pattern Reference (add sub-navigation)

**Files Modified**:
- `packages/dojolm-web/src/app/page.tsx`

**Verification**:
```bash
cd packages/dojolm-web
npm run dev
# Test: Click sidebar items, verify content switches correctly
```

**Commit Message**: `refactor(ui): convert tabs to context-based navigation (TPI-UI-001-08)`

**Estimate**: 3 hours

---

### Story 9: Integrate Sidebar and MobileNav into Layout (Priority: HIGH)

**ID**: TPI-UI-001-09
**SME Changes**: Split from Story 8, now integrates components

**As a** user
**I want** the sidebar and mobile navigation integrated into the page layout
**So that** navigation is always accessible

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/app/page.tsx` layout updated
- [ ] Sidebar visible on desktop (pl-[260px])
- [ ] MobileNav visible on mobile (<768px)
- [ ] Content area properly offset
- [ ] Responsive breakpoints correct
- [ ] Z-index hierarchy prevents overlap

**Implementation Details**:
File: `packages/dojolm-web/src/app/page.tsx`

```tsx
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { NavigationProvider } from '@/lib/NavigationContext'

export default function HomePage() {
  return (
    <NavigationProvider>
      {/* Desktop/Tablet Sidebar */}
      <Sidebar />

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content */}
      <main className="pt-0 pl-0 lg:pl-[260px] pb-16 md:pb-0">
        {/* Page content here */}
      </main>
    </NavigationProvider>
  )
}
```

**Responsive Behavior**:
- Mobile (<768px): pl-0, pb-16 (space for bottom nav)
- Tablet (768-1023px): pl-[72px] (collapsed sidebar)
- Desktop (≥1024px): pl-[260px] (full sidebar)

**Files Modified**:
- `packages/dojolm-web/src/app/page.tsx`

**Verification**:
```bash
cd packages/dojolm-web
npm run dev
# Visual: Sidebar/MobileNav visible, content offset correctly
# Test: Resize viewport, verify responsive behavior
```

**Commit Message**: `feat(ui): integrate sidebar and mobile navigation into layout (TPI-UI-001-09)`

**Estimate**: 1.5 hours

---

### Story 10: Create Mobile Navigation (Priority: MEDIUM)

**ID**: TPI-UI-001-10
**SME Changes**: Uses NavigationContext, safe area insets for iOS
**Feedback Update**: Added min 44px touch targets for all interactive elements

**As a** mobile user
**I want** bottom navigation on small screens
**So that** I can navigate the app on my phone

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/layout/MobileNav.tsx` created
- [ ] Bottom navigation bar for mobile (<768px)
- [ ] 5 items with icons + labels
- [ ] Active state highlighted with DojoLM red
- [ ] Fixed to bottom of viewport with z-50
- [ ] Hidden on tablet and desktop
- [ ] Uses NavigationContext for tab switching
- [ ] Safe area insets for iOS home indicator
- [ ] **All touch targets min 44px** (height and width) per mobile accessibility guidelines

**Implementation Details**:
File: `packages/dojolm-web/src/components/layout/MobileNav.tsx` (NEW)

```tsx
'use client'

import { useNavigation } from '@/lib/NavigationContext'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'

export function MobileNav() {
  const { activeTab, setActiveTab } = useNavigation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0A0A0A] border-t border-[#27272A] flex items-center justify-around md:hidden z-[var(--z-mobile-nav)] pb-safe">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full",
              "transition-colors duration-[var(--transition-fast)]",
              isActive ? "text-[#C62828]" : "text-[#71717A]"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-1">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
```

**iOS Safe Area Support** (add to globals.css):
```css
@supports (padding: max(0px)) {
  .pb-safe {
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
}
```

**Files Modified**:
- `packages/dojolm-web/src/components/layout/MobileNav.tsx` (NEW)
- `packages/dojolm-web/src/app/globals.css` (safe area support)

**Verification**:
```bash
cd packages/dojolm-web
npm run dev
# Mobile viewport (Chrome DevTools): Bottom nav visible
# iOS Simulator: Verify safe area insets
# Test: Navigate between items
```

**Commit Message**: `feat(ui): create mobile bottom navigation with safe areas (TPI-UI-001-10)`

**Estimate**: 1 hour

---

### Story 11: Update Root Layout Metadata (Priority: LOW)

**ID**: TPI-UI-001-11

**As a** developer
**I want** the app metadata to reflect co-branding
**So that** browser tabs and search results show correct branding

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/app/layout.tsx` metadata updated
- [ ] Title: "DojoLM - TPI Security Test Lab"
- [ ] Description mentions BlackUnicorn
- [ ] Favicon configured (if available)

**Implementation Details**:
File: `packages/dojolm-web/src/app/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: 'DojoLM - TPI Security Test Lab',
  description: 'BlackUnicorn\'s Test Prompt Injection security testing platform for LLM applications - Detect vulnerabilities, run tests, and secure your AI applications.',
  // ... other metadata
}
```

**Files Modified**:
- `packages/dojolm-web/src/app/layout.tsx`

**Verification**:
```bash
cd packages/dojolm-web
npm run dev
# Check browser tab title
```

**Commit Message**: `docs(ui): update app metadata for co-branding (TPI-UI-001-11)`

**Estimate**: 0.25 hours

---

### Story 12: Dashboard Grid System (Priority: HIGH)

**ID**: TPI-UI-001-12
**Source**: Dribbble reference gap analysis (YouTube Analytics, AI Dashboard patterns)
**Feedback Update**: Added WidgetCard with action header (refresh, settings, expand)

**As a** user
**I want** a responsive grid-based dashboard layout
**So that** metrics and content are organized like modern analytics dashboards

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/layout/DashboardGrid.tsx` created
- [ ] 2x2 responsive grid for metric cards (gap: --spacing-md)
- [ ] Split-view sections (main content + side panel, like YouTube stats + scheduled)
- [ ] Full-width row option for charts/visualizations
- [ ] Responsive: 2x2 on desktop, stacked on mobile
- [ ] Consistent gap/spacing using design tokens
- [ ] Grid areas named for clarity (metrics, chart, sidebar-panel)
- [ ] **WidgetCard component**: card with action header (title + action buttons: refresh, expand, settings)

**Implementation Details**:
File: `packages/dojolm-web/src/components/layout/DashboardGrid.tsx` (NEW)

```tsx
'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface DashboardGridProps {
  children: ReactNode
  className?: string
}

/** 2x2 metric grid - for top-level KPIs */
export function MetricGrid({ children, className }: DashboardGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--spacing-md)]",
      className
    )}>
      {children}
    </div>
  )
}

/** Split view - main content (2/3) + side panel (1/3) */
export function SplitView({ children, className }: DashboardGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)]",
      className
    )}>
      {children}
    </div>
  )
}

/** Main panel inside SplitView (spans 2 cols on desktop) */
export function MainPanel({ children, className }: DashboardGridProps) {
  return (
    <div className={cn("lg:col-span-2", className)}>
      {children}
    </div>
  )
}

/** Side panel inside SplitView (spans 1 col) */
export function SidePanel({ children, className }: DashboardGridProps) {
  return (
    <div className={cn("lg:col-span-1", className)}>
      {children}
    </div>
  )
}

/** Full-width row for charts or wide content */
export function FullWidthRow({ children, className }: DashboardGridProps) {
  return (
    <div className={cn("w-full", className)}>
      {children}
    </div>
  )
}
```

**Layout Example** (matches Dribbble YouTube Analytics):
```
┌──────────┬──────────┬──────────┬──────────┐
│ Metric 1 │ Metric 2 │ Metric 3 │ Metric 4 │  <-- MetricGrid
└──────────┴──────────┴──────────┴──────────┘
┌─────────────────────────┬──────────────────┐
│ Chart / Main Content    │ Side Panel       │  <-- SplitView
│ (2/3 width)             │ (1/3 width)      │
└─────────────────────────┴──────────────────┘
┌────────────────────────────────────────────┐
│ Full-Width Section                         │  <-- FullWidthRow
└────────────────────────────────────────────┘
```

**Files Modified**:
- `packages/dojolm-web/src/components/layout/DashboardGrid.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run build  # Should compile without errors
npm run dev
# Visual: Grid renders responsively
# Mobile: Cards stack vertically
# Desktop: 2x2 or 4-column grid
```

**Commit Message**: `feat(ui): create responsive dashboard grid system (TPI-UI-001-12)`

**Estimate**: 2 hours

---

### Story 13: Metric Card Component (Priority: HIGH)

**ID**: TPI-UI-001-13
**Source**: Dribbble reference gap analysis (YouTube Analytics metric cards, AI Dashboard gauges)

**As a** user
**I want** metric cards with large numbers and trend indicators
**So that** I can quickly see key performance indicators at a glance

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/ui/MetricCard.tsx` created
- [ ] Large number display (24px+ font, --foreground color)
- [ ] Label/description text (--muted-foreground)
- [ ] Trend indicator: up/down arrow with percentage (green/red)
- [ ] Optional comparison text (e.g., "vs last week")
- [ ] Hover elevation effect (consistent with Story 7 cards)
- [ ] Optional gradient accent border (left border or top border)
- [ ] Uses existing Card component as base
- [ ] Responsive: shrinks gracefully on mobile

**Implementation Details**:
File: `packages/dojolm-web/src/components/ui/MetricCard.tsx` (NEW)

```tsx
'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  trend?: {
    direction: 'up' | 'down' | 'flat'
    percentage: number
    comparison?: string  // e.g., "vs last week"
  }
  accent?: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

const trendConfig = {
  up: { icon: ArrowUpRight, color: 'text-[var(--success)]' },
  down: { icon: ArrowDownRight, color: 'text-[var(--danger)]' },
  flat: { icon: Minus, color: 'text-[var(--muted-foreground)]' },
}

const accentColors = {
  primary: 'border-l-[var(--dojo-primary)]',
  success: 'border-l-[var(--success)]',
  warning: 'border-l-[var(--warning)]',
  danger: 'border-l-[var(--danger)]',
}

export function MetricCard({
  label,
  value,
  trend,
  accent,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn(
      "transition-shadow duration-[var(--transition-normal)] hover:shadow-lg",
      accent && `border-l-4 ${accentColors[accent]}`,
      className
    )}>
      <CardContent className="p-[var(--spacing-md)]">
        <p className="text-sm text-[var(--muted-foreground)] mb-1">{label}</p>
        <div className="flex items-end justify-between">
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className="flex items-center gap-1">
              {(() => {
                const { icon: TrendIcon, color } = trendConfig[trend.direction]
                return (
                  <>
                    <TrendIcon className={cn("w-4 h-4", color)} />
                    <span className={cn("text-sm font-medium", color)}>
                      {trend.percentage}%
                    </span>
                  </>
                )
              })()}
            </div>
          )}
        </div>
        {trend?.comparison && (
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {trend.comparison}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

**Usage Example** (for Scanner dashboard):
```tsx
<MetricGrid>
  <MetricCard
    label="Total Scans"
    value={12847}
    trend={{ direction: 'up', percentage: 12, comparison: 'vs last week' }}
    accent="primary"
  />
  <MetricCard
    label="Threats Detected"
    value={342}
    trend={{ direction: 'down', percentage: 8, comparison: 'vs last week' }}
    accent="danger"
  />
  <MetricCard
    label="Pass Rate"
    value="99.85%"
    trend={{ direction: 'up', percentage: 0.3 }}
    accent="success"
  />
  <MetricCard
    label="Avg Response"
    value="1.2ms"
    trend={{ direction: 'flat', percentage: 0 }}
  />
</MetricGrid>
```

**Files Modified**:
- `packages/dojolm-web/src/components/ui/MetricCard.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run build
npm run dev
# Visual: Metric cards render with large numbers
# Visual: Trend arrows display in correct colors
# Visual: Hover elevation effect works
# Responsive: Cards stack on mobile
```

**Commit Message**: `feat(ui): create metric card component with trend indicators (TPI-UI-001-13)`

**Estimate**: 1.5 hours

---

### Story 14: Chart Component Library (Priority: MEDIUM)

**ID**: TPI-UI-001-14
**Source**: Dribbble reference gap analysis (YouTube line/bar charts, AI Dashboard gauges, Cybersecurity coverage maps)
**Dribbble 95% Update**: Added GaugeChart and DonutChart components (AI Dashboard radial patterns)

**As a** user
**I want** data visualization components (line charts, bar charts, coverage maps)
**So that** I can understand trends, distributions, and test coverage visually

**Acceptance Criteria**:
- [ ] Chart library dependency installed (lightweight, SSR-compatible)
- [ ] `packages/dojolm-web/src/components/charts/LineChart.tsx` created
- [ ] `packages/dojolm-web/src/components/charts/BarChart.tsx` created
- [ ] `packages/dojolm-web/src/components/charts/CoverageMap.tsx` created
- [ ] `packages/dojolm-web/src/components/charts/TrendChart.tsx` created (mini sparkline for metric cards)
- [ ] `packages/dojolm-web/src/components/charts/GaugeChart.tsx` created (radial progress gauge)
- [ ] `packages/dojolm-web/src/components/charts/DonutChart.tsx` created (ring/donut proportions)
- [ ] Charts use BlackUnicorn dark theme (dark backgrounds, light text, DojoLM red accents)
- [ ] Responsive: charts resize with container
- [ ] Tooltips on hover with readable text
- [ ] Charts render without SSR hydration errors (dynamic import or 'use client')

**Library Selection**: `recharts` (React-native, lightweight, SSR-friendly with dynamic import)

**Implementation Details**:

File: `packages/dojolm-web/src/components/charts/LineChart.tsx` (NEW)

```tsx
'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const RechartsLineChart = dynamic(
  () => import('recharts').then(mod => {
    const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = mod
    return function Chart({ data, dataKey, xKey }: { data: any[]; dataKey: string; xKey: string }) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey={xKey} stroke="#71717A" fontSize={12} />
            <YAxis stroke="#71717A" fontSize={12} />
            <Tooltip
              contentStyle={{ backgroundColor: '#141414', border: '1px solid #27272A', borderRadius: '8px' }}
              labelStyle={{ color: '#FAFAFA' }}
              itemStyle={{ color: '#E63946' }}
            />
            {/* Gradient fill under line (Feedback: YouTube Analytics pattern) */}
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C62828" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#C62828" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Line type="monotone" dataKey={dataKey} stroke="#C62828" strokeWidth={2} dot={false} fill="url(#lineGradient)" />
          </LineChart>
        </ResponsiveContainer>
      )
    }
  }),
  { ssr: false }
)

interface DojoLineChartProps {
  title: string
  data: any[]
  dataKey: string
  xKey: string
}

export function DojoLineChart({ title, data, dataKey, xKey }: DojoLineChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <RechartsLineChart data={data} dataKey={dataKey} xKey={xKey} />
      </CardContent>
    </Card>
  )
}
```

File: `packages/dojolm-web/src/components/charts/BarChart.tsx` (NEW)
- Same pattern as LineChart but with `<BarChart>` and `<Bar>` from recharts
- Bar fill: `#C62828`, hover: `#D32F2F`

File: `packages/dojolm-web/src/components/charts/CoverageMap.tsx` (NEW)
- Grid-based heatmap showing test coverage by category
- Uses 10 DojoLM security categories
- Color scale: #1C1C1E (0%) → #C62828 (50%) → #22C55E (100%)

File: `packages/dojolm-web/src/components/charts/TrendChart.tsx` (NEW)
- Mini sparkline (height: 40px) for embedding in MetricCards
- No axes, just the trend line
- Color: --dojo-primary

File: `packages/dojolm-web/src/components/charts/GaugeChart.tsx` (NEW)
- Radial/semicircle gauge (Dribbble: AI Dashboard gauge pattern)
- Uses recharts `<RadialBarChart>` with custom angle range
- Center label shows percentage value
- Color transitions: #1C1C1E (bg) → #C62828 (fill) → #22C55E (100%)
- Use case: pass rate, coverage percentage, model confidence

```tsx
// GaugeChart key structure:
<RadialBarChart
  innerRadius="70%"
  outerRadius="100%"
  startAngle={180}
  endAngle={0}
  data={[{ value: percentage }]}
>
  <RadialBar
    fill={getColorForValue(percentage)}
    background={{ fill: '#1C1C1E' }}
  />
  {/* Center label */}
  <text x="50%" y="45%" textAnchor="middle" fill="#FAFAFA" fontSize={24} fontWeight={700}>
    {percentage}%
  </text>
</RadialBarChart>
```

File: `packages/dojolm-web/src/components/charts/DonutChart.tsx` (NEW)
- Ring/donut chart for category proportions (Dribbble: AI Dashboard donut pattern)
- Uses recharts `<PieChart>` with inner radius
- Center shows total/summary text
- Segment colors use DojoLM palette: #C62828, #22C55E, #F59E0B, #A1A1AA
- Use case: test results breakdown, category distribution

**Files Modified**:
- `packages/dojolm-web/package.json` (add `recharts` dependency)
- `packages/dojolm-web/src/components/charts/LineChart.tsx` (NEW)
- `packages/dojolm-web/src/components/charts/BarChart.tsx` (NEW)
- `packages/dojolm-web/src/components/charts/CoverageMap.tsx` (NEW)
- `packages/dojolm-web/src/components/charts/TrendChart.tsx` (NEW)
- `packages/dojolm-web/src/components/charts/GaugeChart.tsx` (NEW)
- `packages/dojolm-web/src/components/charts/DonutChart.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm install
npm run build  # No SSR errors
npm run dev
# Visual: Charts render with dark theme
# Hover: Tooltips appear with readable text
# Responsive: Charts resize with viewport
```

**Commit Message**: `feat(ui): add chart component library with dark theme (TPI-UI-001-14)`

**Estimate**: 4 hours (updated: +1h for GaugeChart and DonutChart)

---

### Story 15: Page Toolbar Component (Priority: HIGH)

**ID**: TPI-UI-001-15
**Source**: Dribbble 95% adherence audit (YouTube Analytics search bar + filter pills, AI Dashboard header)
**Feedback Update**: Added breadcrumb navigation for deep paths

**As a** user
**I want** a search bar and filter toolbar at the top of each page view
**So that** I can quickly find content and filter data like modern analytics dashboards

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/layout/PageToolbar.tsx` created
- [ ] Search input with magnifying glass icon (left side)
- [ ] Filter pill/chip strip (scrollable, right side)
- [ ] Page title + breadcrumb area (left, above search)
- [ ] Responsive: stacks vertically on mobile
- [ ] Search input uses glassmorphic style (`.glass` from Story 1)
- [ ] Filter pills use outline variant with active state (DojoLM red fill)
- [ ] Integrates with existing content sections (Scanner, Test Lab, etc.)
- [ ] Keyboard shortcut: Cmd/Ctrl+K focuses search
- [ ] **Breadcrumb navigation**: optional breadcrumb trail below title (e.g., `Test Lab > SQL Injection Fixtures`)
- [ ] Breadcrumbs truncate middle items on mobile

**Implementation Details**:
File: `packages/dojolm-web/src/components/layout/PageToolbar.tsx` (NEW)

```tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

interface FilterPill {
  id: string
  label: string
  active: boolean
}

interface Breadcrumb {
  label: string
  onClick?: () => void
}

interface PageToolbarProps {
  title: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  filters?: FilterPill[]
  onFilterToggle?: (id: string) => void
  onSearch?: (query: string) => void
  searchPlaceholder?: string
  className?: string
}

export function PageToolbar({
  title,
  subtitle,
  breadcrumbs,
  filters = [],
  onFilterToggle,
  onSearch,
  searchPlaceholder = 'Search...',
  className,
}: PageToolbarProps) {
  const [query, setQuery] = useState('')

  return (
    <div className={cn("space-y-[var(--spacing-md)]", className)}>
      {/* Breadcrumbs (Feedback: deep navigation paths) */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              {crumb.onClick ? (
                <button onClick={crumb.onClick} className="hover:text-[var(--foreground)] transition-colors">
                  {crumb.label}
                </button>
              ) : (
                <span className="text-[var(--muted-foreground)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title area */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[var(--muted-foreground)]">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Search + Filters row */}
      <div className="flex flex-col sm:flex-row gap-[var(--spacing-sm)]">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              onSearch?.(e.target.value)
            }}
            placeholder={searchPlaceholder}
            className={cn(
              "w-full pl-10 pr-4 py-2 rounded-[var(--radius-md)]",
              "bg-[var(--bg-tertiary)] border border-[var(--border)]",
              "text-sm text-[var(--foreground)] placeholder:text-[var(--text-tertiary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent",
              "transition-all duration-[var(--transition-fast)]"
            )}
          />
        </div>

        {/* Filter pills */}
        {filters.length > 0 && (
          <div className="flex gap-[var(--spacing-xs)] overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onFilterToggle?.(filter.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                  "border transition-all duration-[var(--transition-fast)]",
                  filter.active
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--muted-foreground)]"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Usage Example** (Scanner page):
```tsx
<PageToolbar
  title="Scanner"
  subtitle="Live prompt injection detection"
  searchPlaceholder="Search payloads, patterns..."
  filters={[
    { id: 'all', label: 'All', active: true },
    { id: 'critical', label: 'Critical', active: false },
    { id: 'high', label: 'High', active: false },
    { id: 'medium', label: 'Medium', active: false },
  ]}
  onFilterToggle={handleFilter}
  onSearch={handleSearch}
/>
```

**Files Modified**:
- `packages/dojolm-web/src/components/layout/PageToolbar.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run build
npm run dev
# Visual: Search bar renders with glass effect
# Visual: Filter pills toggle active/inactive with red fill
# Keyboard: Cmd+K focuses search input
# Responsive: Stacks vertically on mobile
```

**Commit Message**: `feat(ui): create page toolbar with search and filter pills (TPI-UI-001-15)`

**Estimate**: 2 hours

---

### Story 16: Status Indicators & Loading States (Priority: HIGH)

**ID**: TPI-UI-001-16
**Source**: Dribbble 95% adherence audit (Cybersecurity status dots + pulse, AI Dashboard skeletons, color progress)

**As a** user
**I want** visual status indicators and polished loading states
**So that** I can see system health at a glance and have a smooth experience during data loading

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/ui/StatusDot.tsx` created
- [ ] `packages/dojolm-web/src/components/ui/ShimmerSkeleton.tsx` created
- [ ] `packages/dojolm-web/src/components/ui/ColorProgress.tsx` created
- [ ] StatusDot: online (green pulse), offline (red), idle (amber), loading (blue pulse)
- [ ] ShimmerSkeleton: shimmer gradient animation (uses `animate-shimmer` from Story 1)
- [ ] ColorProgress: progress bar with semantic color based on value (red→amber→green)
- [ ] All components use design tokens from Story 1
- [ ] Accessible: `aria-label` on status indicators

**Implementation Details**:

File: `packages/dojolm-web/src/components/ui/StatusDot.tsx` (NEW)

```tsx
import { cn } from '@/lib/utils'

type StatusType = 'online' | 'offline' | 'idle' | 'loading'

const statusConfig = {
  online: {
    color: 'bg-[var(--success)]',
    pulse: true,
    label: 'Online',
  },
  offline: {
    color: 'bg-[var(--danger)]',
    pulse: false,
    label: 'Offline',
  },
  idle: {
    color: 'bg-[var(--warning)]',
    pulse: false,
    label: 'Idle',
  },
  loading: {
    color: 'bg-[var(--ring)]',
    pulse: true,
    label: 'Loading',
  },
}

interface StatusDotProps {
  status: StatusType
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusDot({
  status,
  label,
  showLabel = false,
  size = 'md',
  className,
}: StatusDotProps) {
  const config = statusConfig[status]
  const sizeClasses = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex">
        <span className={cn(
          "rounded-full",
          sizeClasses[size],
          config.color
        )} />
        {config.pulse && (
          <span className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-75",
            config.color
          )} />
        )}
      </span>
      {showLabel && (
        <span className="text-xs text-[var(--muted-foreground)]">
          {label || config.label}
        </span>
      )}
      <span className="sr-only" aria-label={label || config.label} />
    </span>
  )
}
```

File: `packages/dojolm-web/src/components/ui/ShimmerSkeleton.tsx` (NEW)

```tsx
import { cn } from '@/lib/utils'

interface ShimmerSkeletonProps {
  className?: string
  variant?: 'line' | 'card' | 'circle' | 'metric'
}

export function ShimmerSkeleton({ className, variant = 'line' }: ShimmerSkeletonProps) {
  const variants = {
    line: 'h-4 w-full rounded',
    card: 'h-32 w-full rounded-lg',
    circle: 'h-10 w-10 rounded-full',
    metric: 'h-20 w-full rounded-lg',
  }

  return (
    <div
      className={cn("animate-shimmer rounded-md", variants[variant], className)}
      aria-hidden="true"
    />
  )
}

/** Preset: Metric card skeleton */
export function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-card p-[var(--spacing-md)] space-y-3">
      <ShimmerSkeleton variant="line" className="h-3 w-20" />
      <ShimmerSkeleton variant="line" className="h-8 w-28" />
      <ShimmerSkeleton variant="line" className="h-3 w-16" />
    </div>
  )
}

/** Preset: Chart skeleton */
export function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-card p-[var(--spacing-md)] space-y-3">
      <ShimmerSkeleton variant="line" className="h-3 w-32" />
      <ShimmerSkeleton variant="card" className="h-[300px]" />
    </div>
  )
}
```

File: `packages/dojolm-web/src/components/ui/ColorProgress.tsx` (NEW)

```tsx
import { cn } from '@/lib/utils'

interface ColorProgressProps {
  value: number  // 0-100
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function getProgressColor(value: number): string {
  if (value >= 80) return 'var(--success)'
  if (value >= 50) return 'var(--warning)'
  return 'var(--danger)'
}

export function ColorProgress({ value, showLabel = false, size = 'md', className }: ColorProgressProps) {
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-full overflow-hidden rounded-full bg-[var(--bg-quaternary)]", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out")}
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            backgroundColor: getProgressColor(value),
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-[var(--muted-foreground)] tabular-nums min-w-[3ch]">
          {Math.round(value)}%
        </span>
      )}
    </div>
  )
}
```

**Files Modified**:
- `packages/dojolm-web/src/components/ui/StatusDot.tsx` (NEW)
- `packages/dojolm-web/src/components/ui/ShimmerSkeleton.tsx` (NEW)
- `packages/dojolm-web/src/components/ui/ColorProgress.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run build
npm run dev
# Visual: StatusDot green pulse visible
# Visual: Shimmer skeletons animate with gradient sweep
# Visual: ColorProgress changes color based on value
# Accessibility: Screen reader announces status labels
```

**Commit Message**: `feat(ui): add status indicators, shimmer skeletons, and color progress (TPI-UI-001-16)`

**Estimate**: 1.5 hours

---

### Story 17: Enhanced Badge System (Priority: MEDIUM)

**ID**: TPI-UI-001-17
**Source**: Dribbble 95% adherence audit (Cybersecurity severity badges, dual icon+color coding)

**As a** user
**I want** a comprehensive badge system with severity levels and status variants
**So that** I can quickly identify threat levels and test statuses

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/ui/badge.tsx` updated with new variants
- [ ] Severity variants: critical (red), high (orange), medium (amber), low (blue), info (gray)
- [ ] Status variants: success, warning, error, pending, active
- [ ] Strike variant: DojoLM red gradient for bypass detection emphasis (katana/dojo branding)
- [ ] Icon support: optional leading icon for dual coding (colorblind-friendly)
- [ ] Dot indicator: optional left dot for status badges
- [ ] All variants use design tokens
- [ ] Accessible: `aria-label` describes severity/status

**Implementation Details**:
File: `packages/dojolm-web/src/components/ui/badge.tsx` (MODIFY)

```tsx
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-[var(--border)]",
        // Severity variants (Dribbble: Cybersecurity dashboard)
        critical: "border-transparent bg-[var(--danger)] text-white",
        high: "border-transparent bg-[#EA580C] text-white",
        medium: "border-transparent bg-[var(--warning)] text-black",
        low: "border-transparent bg-[#3B82F6] text-white",
        info: "border-transparent bg-[var(--bg-quaternary)] text-[var(--muted-foreground)]",
        // Status variants
        success: "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]",
        warning: "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]",
        error: "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]",
        pending: "border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--muted-foreground)]",
        // Strike variant (DojoLM branding - decisive strike on bypass)
        strike: "border-transparent bg-gradient-to-r from-[var(--dojo-primary)] to-[var(--dojo-primary-lg)] text-white font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
  dot?: boolean
}

function Badge({ className, variant, icon, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      )}
      {icon}
      {children}
    </div>
  )
}
```

**Usage Example**:
```tsx
<Badge variant="critical" icon={<AlertTriangle className="w-3 h-3" />}>Critical</Badge>
<Badge variant="success" dot>Passing</Badge>
<Badge variant="strike">Strike!</Badge>
<Badge variant="pending">Pending</Badge>
```

**Files Modified**:
- `packages/dojolm-web/src/components/ui/badge.tsx`

**Verification**:
```bash
cd packages/dojolm-web
npm run build
npm run dev
# Visual: All severity badges render with correct colors
# Visual: Strike badge has DojoLM red gradient
# Visual: Dot badges show status indicator
# Accessibility: Badges have appropriate contrast ratios
```

**Commit Message**: `feat(ui): enhance badge system with severity, status, and strike variants (TPI-UI-001-17)`

**Estimate**: 1 hour

---

### Story 18: Enhanced Data Table (Priority: MEDIUM)

**ID**: TPI-UI-001-18
**Source**: Dribbble 95% adherence audit (Cybersecurity data tables with sortable columns and row hover)

**As a** user
**I want** sortable data tables with enhanced hover states
**So that** I can efficiently browse and organize test results, fixtures, and scan data

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/ui/SortableTable.tsx` created
- [ ] Sortable columns with click-to-sort (ascending/descending/none)
- [ ] Sort indicator arrows (ChevronUp/ChevronDown) in column headers
- [ ] Enhanced row hover: background transition to `--bg-tertiary`
- [ ] Sticky header on scroll
- [ ] Row selection support (optional, for batch actions)
- [ ] Empty state component when no data
- [ ] Uses existing Table primitives as base
- [ ] Keyboard accessible: Tab through headers, Enter to sort

**Implementation Details**:
File: `packages/dojolm-web/src/components/ui/SortableTable.tsx` (NEW)

```tsx
'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from './table'

type SortDirection = 'asc' | 'desc' | null

interface Column<T> {
  key: keyof T & string
  label: string
  sortable?: boolean
  render?: (value: T[keyof T], row: T) => React.ReactNode
  className?: string
}

interface SortableTableProps<T> {
  data: T[]
  columns: Column<T>[]
  emptyMessage?: string
  stickyHeader?: boolean
  onRowClick?: (row: T) => void
  className?: string
}

export function SortableTable<T extends Record<string, unknown>>({
  data,
  columns,
  emptyMessage = 'No data available',
  stickyHeader = true,
  onRowClick,
  className,
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>(null)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc')
      if (sortDir === 'desc') setSortKey(null)
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal === bVal) return 0
      const cmp = aVal < bVal ? -1 : 1
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
    if (sortDir === 'asc') return <ChevronUp className="w-3.5 h-3.5" />
    return <ChevronDown className="w-3.5 h-3.5" />
  }

  return (
    <Table className={className}>
      <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-[var(--bg-secondary)]")}>
        <TableRow className="hover:bg-transparent border-b border-[var(--border)]">
          {columns.map((col) => (
            <TableHead
              key={col.key}
              onClick={col.sortable ? () => handleSort(col.key) : undefined}
              className={cn(
                col.sortable && "cursor-pointer select-none hover:text-[var(--foreground)]",
                col.className
              )}
            >
              <span className="inline-flex items-center gap-1">
                {col.label}
                {col.sortable && <SortIcon columnKey={col.key} />}
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-32 text-center text-[var(--text-tertiary)]">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((row, i) => (
            <TableRow
              key={i}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "transition-colors duration-[var(--transition-fast)]",
                "hover:bg-[var(--bg-tertiary)]",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
```

**Usage Example** (Scan results):
```tsx
<SortableTable
  data={scanResults}
  columns={[
    { key: 'file', label: 'File', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'severity', label: 'Severity', sortable: true, render: (v) => <Badge variant={v}>{v}</Badge> },
    { key: 'status', label: 'Status', sortable: true, render: (v) => <StatusDot status={v} showLabel /> },
  ]}
  onRowClick={(row) => openDetail(row)}
  emptyMessage="No scan results yet. Run a scan to get started."
/>
```

**Files Modified**:
- `packages/dojolm-web/src/components/ui/SortableTable.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run build
npm run dev
# Click column headers: sort toggles asc/desc/none
# Visual: Row hover shows bg-tertiary transition
# Visual: Sticky header stays visible on scroll
# Visual: Empty state message when no data
# Keyboard: Tab to headers, Enter to sort
```

**Commit Message**: `feat(ui): create sortable data table with sticky header and empty states (TPI-UI-001-18)`

**Estimate**: 2 hours

---

### Story 19: View Transitions & Micro-interactions (Priority: MEDIUM)

**ID**: TPI-UI-001-19
**Source**: Dribbble 95% adherence audit (cross-cutting smooth transitions, YouTube Analytics page switches)

**As a** user
**I want** smooth animated transitions between views and polished micro-interactions
**So that** the application feels responsive and professional

**Acceptance Criteria**:
- [ ] Page content fade-in animation when switching tabs (uses `animate-fade-in` from Story 1)
- [ ] Slide-up animation for content sections (uses `animate-slide-up` from Story 1)
- [ ] Staggered card entrance animation (cards appear sequentially with 50ms delay)
- [ ] Button press scale effect (scale 0.98 on click)
- [ ] Dojo strike animation integration (pulse glow when attack bypasses)
- [ ] Reduced motion support: `prefers-reduced-motion` disables all animations
- [ ] All animations use design token durations

**Implementation Details**:

File: `packages/dojolm-web/src/app/globals.css` (ADD to existing from Story 1)

```css
/* ===== Dojo strike animation (DojoLM branding - bypass detection emphasis) ===== */
@keyframes dojo-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(198, 40, 40, 0.4); }
  50% { box-shadow: 0 0 40px rgba(198, 40, 40, 0.7), 0 0 60px rgba(230, 57, 70, 0.3); }
}

@keyframes dojo-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.animate-dojo-glow {
  animation: dojo-glow 2s ease-in-out infinite;
}

.animate-dojo-pulse {
  animation: dojo-pulse 300ms ease-out;
}

/* ===== Staggered entrance ===== */
.stagger-children > * {
  opacity: 0;
  animation: slide-up var(--transition-normal) ease-out forwards;
}
.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 50ms; }
.stagger-children > *:nth-child(3) { animation-delay: 100ms; }
.stagger-children > *:nth-child(4) { animation-delay: 150ms; }
.stagger-children > *:nth-child(5) { animation-delay: 200ms; }
.stagger-children > *:nth-child(6) { animation-delay: 250ms; }

/* ===== Button press effect ===== */
.press-effect:active {
  transform: scale(0.98);
  transition: transform 100ms ease;
}

/* ===== Reduced motion support ===== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .stagger-children > * {
    opacity: 1;
    animation: none;
  }
}
```

File: `packages/dojolm-web/src/components/layout/AnimatedView.tsx` (NEW)

```tsx
'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface AnimatedViewProps {
  children: ReactNode
  animation?: 'fade-in' | 'slide-up' | 'stagger'
  className?: string
}

export function AnimatedView({
  children,
  animation = 'fade-in',
  className,
}: AnimatedViewProps) {
  const animClass = {
    'fade-in': 'animate-fade-in',
    'slide-up': 'animate-slide-up',
    'stagger': 'stagger-children',
  }

  return (
    <div className={cn(animClass[animation], className)}>
      {children}
    </div>
  )
}
```

**Integration Points**:
- Story 8 (page refactor): Wrap each tab content in `<AnimatedView animation="fade-in">` with a unique `key` prop
- Story 12 (MetricGrid): Use `stagger-children` class on the grid container
- Story 13 (MetricCard): Add `press-effect` class to interactive cards
- Story 7 (Cards): Dojo glow on cards with bypass results

**Files Modified**:
- `packages/dojolm-web/src/app/globals.css` (ADD animations)
- `packages/dojolm-web/src/components/layout/AnimatedView.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run build
npm run dev
# Visual: Tab switch fades in new content
# Visual: Metric cards stagger in sequentially
# Visual: Dojo glow pulses on bypass results
# Visual: Button scales down on click
# Reduced motion: Toggle in OS settings, verify animations stop
```

**Commit Message**: `feat(ui): add view transitions, stagger animations, and dojo strike effects (TPI-UI-001-19)`

**Estimate**: 1.5 hours

---

### Story 20: Toast Notification System (Priority: HIGH)

**ID**: TPI-UI-001-20
**Source**: Feedback - Missing Elements (Toast Notifications)

**As a** user
**I want** toast notifications for operation feedback
**So that** I receive clear confirmation when actions succeed or fail

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/ui/Toast.tsx` created
- [ ] `packages/dojolm-web/src/lib/useToast.ts` hook created
- [ ] 4 variants: success (green), error (red), warning (amber), info (blue)
- [ ] Auto-dismiss with configurable duration (default 5s)
- [ ] Progress indicator showing time remaining
- [ ] Optional action button within toast (e.g., "Undo", "View")
- [ ] Stacks in bottom-right corner, max 3 visible
- [ ] Slide-in animation from right, fade-out on dismiss
- [ ] Close button (X) for manual dismiss
- [ ] Uses design tokens from Story 1
- [ ] Accessible: `role="alert"`, `aria-live="polite"`

**Implementation Details**:
File: `packages/dojolm-web/src/components/ui/Toast.tsx` (NEW)

```tsx
'use client'

import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  duration?: number
  onDismiss: (id: string) => void
}

const variantConfig = {
  success: { icon: CheckCircle, color: 'text-[var(--success)]', border: 'border-l-[var(--success)]' },
  error: { icon: AlertCircle, color: 'text-[var(--danger)]', border: 'border-l-[var(--danger)]' },
  warning: { icon: AlertTriangle, color: 'text-[var(--warning)]', border: 'border-l-[var(--warning)]' },
  info: { icon: Info, color: 'text-[#3B82F6]', border: 'border-l-[#3B82F6]' },
}

export function Toast({ id, variant, title, description, action, onDismiss }: ToastProps) {
  const { icon: Icon, color, border } = variantConfig[variant]
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border-l-4 min-w-[320px] max-w-[420px]",
        "bg-[var(--bg-tertiary)] border border-[var(--border)]",
        "shadow-lg animate-slide-in-right",
        border
      )}
    >
      <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
        {description && <p className="text-xs text-[var(--muted-foreground)] mt-1">{description}</p>}
        {action && (
          <button onClick={action.onClick} className="text-xs font-medium text-[var(--primary)] mt-2 hover:underline">
            {action.label}
          </button>
        )}
      </div>
      <button onClick={() => onDismiss(id)} className="text-[var(--text-tertiary)] hover:text-[var(--foreground)]">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
```

File: `packages/dojolm-web/src/lib/useToast.ts` (NEW)
- Hook managing toast state (array of active toasts)
- `toast({ variant, title, description, action, duration })` function
- Auto-dismiss via setTimeout
- Max 3 toasts visible at once

**Files Modified**:
- `packages/dojolm-web/src/components/ui/Toast.tsx` (NEW)
- `packages/dojolm-web/src/lib/useToast.ts` (NEW)
- `packages/dojolm-web/src/app/globals.css` (ADD `@keyframes slide-in-right`)

**Verification**:
```bash
cd packages/dojolm-web
npm run build
npm run dev
# Trigger scan → success toast appears
# Trigger error → error toast with red accent
# Auto-dismiss after 5s
# Close button works
# Max 3 toasts visible
```

**Commit Message**: `feat(ui): add toast notification system with 4 variants (TPI-UI-001-20)`

**Estimate**: 1.5 hours

---

### Story 21: Empty States Component (Priority: HIGH)

**ID**: TPI-UI-001-21
**Source**: Feedback - Missing Elements (Empty States)

**As a** user
**I want** informative empty states with clear next actions
**So that** I know what to do when no data is available

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/ui/EmptyState.tsx` created
- [ ] Icon/illustration area (Lucide icon, configurable)
- [ ] Title text (what's empty)
- [ ] Description text (why it's empty / what to do)
- [ ] CTA button (primary action to fix the empty state)
- [ ] Preset variants for common scenarios: no-results, no-scans, no-tests, no-data
- [ ] Centered layout, respects container sizing
- [ ] Uses design tokens and consistent styling

**Implementation Details**:
File: `packages/dojolm-web/src/components/ui/EmptyState.tsx` (NEW)

```tsx
import { cn } from '@/lib/utils'
import { Button } from './button'
import { SearchX, Shield, FlaskConical, Database, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon: Icon = SearchX, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-full bg-[var(--bg-quaternary)] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--text-tertiary)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-md mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}

/* Preset empty states */
export const emptyStatePresets = {
  noScans: {
    icon: Shield,
    title: 'No scan results yet',
    description: 'Run your first scan to detect prompt injection vulnerabilities in your content.',
  },
  noTests: {
    icon: FlaskConical,
    title: 'No test results',
    description: 'Select test categories and run the test suite to see results here.',
  },
  noResults: {
    icon: SearchX,
    title: 'No results found',
    description: 'Try adjusting your search query or filters to find what you\'re looking for.',
  },
  noData: {
    icon: Database,
    title: 'No data available',
    description: 'Data will appear here once it becomes available.',
  },
}
```

**Usage Example**:
```tsx
<EmptyState
  {...emptyStatePresets.noScans}
  action={{ label: 'Start Scanning', onClick: () => setActiveTab('scanner') }}
/>
```

**Files Modified**:
- `packages/dojolm-web/src/components/ui/EmptyState.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run build
npm run dev
# Visual: Empty state renders centered with icon, title, description
# Visual: CTA button uses primary gradient
# Test: Each preset variant renders correctly
```

**Commit Message**: `feat(ui): add empty state component with preset variants (TPI-UI-001-21)`

**Estimate**: 1 hour

---

### Story 22: LLM Chat Interface Enhancement (Priority: MEDIUM)

**ID**: TPI-UI-001-22
**Source**: Feedback - AI Assistant Dashboard (message bubbles + typing indicator)

**As a** user
**I want** chat-style message bubbles for LLM prompts and responses
**So that** the LLM testing interface feels like a natural conversation

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/llm/ChatBubble.tsx` created
- [ ] `packages/dojolm-web/src/components/llm/TypingIndicator.tsx` created
- [ ] User prompt bubble: right-aligned, subtle background
- [ ] LLM response bubble: left-aligned, card-style background
- [ ] Typing indicator: 3 animated dots during LLM response
- [ ] Monospace font for technical content within bubbles
- [ ] Timestamp display on each message
- [ ] Copy-to-clipboard button on response bubbles
- [ ] Integrates with existing LLMDashboard components

**Implementation Details**:
File: `packages/dojolm-web/src/components/llm/ChatBubble.tsx` (NEW)

```tsx
'use client'

import { cn } from '@/lib/utils'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  isCode?: boolean
}

export function ChatBubble({ role, content, timestamp, isCode }: ChatBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("flex gap-3 max-w-[85%]", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}>
      <div className={cn(
        "rounded-lg px-4 py-3 relative group",
        isUser
          ? "bg-[var(--primary)] text-white rounded-br-sm"
          : "bg-[var(--bg-tertiary)] text-[var(--foreground)] border border-[var(--border)] rounded-bl-sm"
      )}>
        <p className={cn("text-sm whitespace-pre-wrap", isCode && "font-mono text-xs")}>
          {content}
        </p>
        {timestamp && (
          <span className={cn(
            "text-[10px] mt-1 block",
            isUser ? "text-white/60" : "text-[var(--text-tertiary)]"
          )}>
            {timestamp}
          </span>
        )}
        {!isUser && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-tertiary)] hover:text-[var(--foreground)]"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}
```

File: `packages/dojolm-web/src/components/llm/TypingIndicator.tsx` (NEW)

```tsx
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border)] w-fit rounded-bl-sm">
      <span className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" />
    </div>
  )
}
```

**Files Modified**:
- `packages/dojolm-web/src/components/llm/ChatBubble.tsx` (NEW)
- `packages/dojolm-web/src/components/llm/TypingIndicator.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run build
npm run dev
# Visual: User messages right-aligned with red bubble
# Visual: LLM responses left-aligned with dark card bubble
# Visual: Typing indicator dots bounce
# Test: Copy button appears on hover, copies content
```

**Commit Message**: `feat(ui): add chat bubble and typing indicator for LLM interface (TPI-UI-001-22)`

**Estimate**: 2 hours

---

### Story 23: Notifications Panel & Activity Feed (Priority: MEDIUM)

**ID**: TPI-UI-001-23
**Source**: Feedback - Missing Elements (Notifications Panel + Live Activity Feed from AI Cybersecurity Dashboard)

**As a** user
**I want** a notifications panel and live activity feed
**So that** I can see recent scan results, alerts, and system events

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` created
- [ ] `packages/dojolm-web/src/components/ui/ActivityFeed.tsx` created
- [ ] Bell icon in sidebar header with unread count badge
- [ ] Dropdown panel with recent notifications (max 10)
- [ ] "Clear all" and "Mark all read" actions
- [ ] Activity feed component: timestamped event list
- [ ] Event types: scan_complete, threat_detected, test_passed, test_failed, model_added
- [ ] Each event has icon, description, timestamp, and optional action link
- [ ] Feed auto-scrolls, newest items at top
- [ ] Integrates with sidebar header area

**Implementation Details**:
File: `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` (NEW)

```tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Bell, X, Check, CheckCheck } from 'lucide-react'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  description?: string
  timestamp: string
  read: boolean
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] shadow-xl z-[var(--z-dropdown)]">
          <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
            <span className="text-sm font-medium">Notifications</span>
            <button className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <CheckCheck className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-[var(--text-tertiary)] text-center">No notifications</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={cn(
                  "p-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-quaternary)] transition-colors",
                  !n.read && "bg-[var(--dojo-subtle)]"
                )}>
                  <p className="text-sm text-[var(--foreground)]">{n.title}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{n.timestamp}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

File: `packages/dojolm-web/src/components/ui/ActivityFeed.tsx` (NEW)

```tsx
import { cn } from '@/lib/utils'
import { Shield, CheckCircle, XCircle, Brain, AlertTriangle, type LucideIcon } from 'lucide-react'

type EventType = 'scan_complete' | 'threat_detected' | 'test_passed' | 'test_failed' | 'model_added'

interface ActivityEvent {
  id: string
  type: EventType
  description: string
  timestamp: string
}

const eventConfig: Record<EventType, { icon: LucideIcon; color: string }> = {
  scan_complete: { icon: Shield, color: 'text-[var(--success)]' },
  threat_detected: { icon: AlertTriangle, color: 'text-[var(--danger)]' },
  test_passed: { icon: CheckCircle, color: 'text-[var(--success)]' },
  test_failed: { icon: XCircle, color: 'text-[var(--danger)]' },
  model_added: { icon: Brain, color: 'text-[#3B82F6]' },
}

interface ActivityFeedProps {
  events: ActivityEvent[]
  className?: string
}

export function ActivityFeed({ events, className }: ActivityFeedProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {events.map((event) => {
        const { icon: Icon, color } = eventConfig[event.type]
        return (
          <div key={event.id} className="flex items-start gap-3 p-3 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors">
            <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", color)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--foreground)]">{event.description}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{event.timestamp}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

**Files Modified**:
- `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` (NEW)
- `packages/dojolm-web/src/components/ui/ActivityFeed.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run build
npm run dev
# Visual: Bell icon shows unread count badge
# Visual: Dropdown shows notification list
# Visual: Activity feed shows events with icons + timestamps
# Test: Click "mark all read" clears unread badges
```

**Commit Message**: `feat(ui): add notifications panel and activity feed (TPI-UI-001-23)`

**Estimate**: 2 hours

---

### Story 24: Component Style Guide Page (Priority: LOW)

**ID**: TPI-UI-001-24
**Source**: Feedback - Final Recommendations (Component style guide for consistency)

**As a** developer
**I want** a style guide page displaying all UI components
**So that** I can maintain design consistency as the app grows

**Acceptance Criteria**:
- [ ] `packages/dojolm-web/src/app/style-guide/page.tsx` created
- [ ] Displays all button variants (default, secondary, ghost, destructive, gradient)
- [ ] Displays all badge variants (severity + status + strike)
- [ ] Displays card examples (default, glass-card, gradient-overlay)
- [ ] Displays form elements (input, textarea, select, checkbox)
- [ ] Displays metric card examples with different trends
- [ ] Displays status indicators (all StatusDot variants)
- [ ] Displays progress bars (ColorProgress at different values)
- [ ] Displays chart samples (mini versions of each chart type)
- [ ] Displays typography scale (H1-H4, body, small, mono)
- [ ] Displays color palette (all design tokens rendered as swatches)
- [ ] Displays toast variants
- [ ] Displays empty state presets
- [ ] Page only accessible in development mode (`process.env.NODE_ENV === 'development'`)

**Implementation Details**:
File: `packages/dojolm-web/src/app/style-guide/page.tsx` (NEW)

```tsx
// Route: /style-guide (dev only)
// Organized in sections:
// 1. Colors - render all CSS variable swatches
// 2. Typography - show each level
// 3. Buttons - all variants x all sizes
// 4. Cards - default, glassmorphic, gradient overlay
// 5. Badges - all severity + status variants
// 6. Forms - input, textarea, select, checkbox
// 7. Status - StatusDot, ColorProgress
// 8. Metric Cards - sample with different trends
// 9. Charts - mini line, bar, gauge, donut
// 10. Data Table - sample SortableTable
// 11. Toast - trigger each variant
// 12. Empty States - all presets
// 13. Animations - fade-in, slide-up, stagger demo
```

**Files Modified**:
- `packages/dojolm-web/src/app/style-guide/page.tsx` (NEW)

**Verification**:
```bash
cd packages/dojolm-web
npm run dev
# Navigate to /style-guide
# Visual: All component variants displayed
# Verify: Each component matches design tokens
```

**Commit Message**: `feat(ui): add component style guide page for design consistency (TPI-UI-001-24)`

**Estimate**: 1.5 hours

---

## Definition of Done

- All 24 stories completed (11 original + 3 Dribbble gap + 5 Dribbble 95% + 5 feedback alignment)
- Color system uses BlackUnicorn dark base with DojoLM red accents (WCAG AA compliant)
- Inter + JetBrains Mono fonts loaded, custom scrollbar styled
- Glassmorphic utilities, shimmer animations, gradient overlays all functional
- Navigation context enables tab-based switching
- Sidebar: 5 items, collapse toggle, left-border active state, tooltip on collapsed icons
- Dropdown transparency bug fixed
- Both brands visible in header with notifications bell
- Buttons: gradient default, hover lift, press scale, glow shadow
- Mobile responsive (bottom nav with safe areas, 44px touch targets)
- Tablet collapsed sidebar with hover expansion
- Page toolbar with search + filter pills + breadcrumbs on each view
- Status indicators (dots, pulse) and shimmer skeletons working
- Enhanced badge system with severity + strike variants
- Sortable data tables with sticky headers
- Toast notification system with 4 variants + auto-dismiss
- Empty states with presets for common scenarios
- LLM chat bubbles with typing indicator
- Activity feed and notifications panel
- View transitions (fade-in, slide-up, stagger) and reduced motion support
- Chart library: line (gradient fill), bar, gauge, donut, coverage map, sparkline
- Component style guide page accessible in dev mode
- Cross-browser tested (Chrome, Firefox, Safari)
- WCAG AA color contrast verified (4.5:1 minimum)
- Keyboard navigation functional (DojoLM red focus ring)
- `prefers-reduced-motion` respected across all animations
- Build succeeds without errors
- All navigation links functional
- Dribbble + feedback adherence: ~99%

---

## Implementation Order (REVISED)

| Phase | Story | Priority | Estimate | Dependencies |
|-------|-------|----------|----------|--------------|
| 1: Foundation | Story 1: Color system + utilities + fonts | HIGH | 3.5h | None | ✅ DONE |
| 1: Foundation | Story 5: Nav constants | MEDIUM | 0.5h | None | ✅ DONE |
| 1: Foundation | Story 5.5: Nav Context | HIGH | 0.75h | Story 5 | ✅ DONE |
| 2: Critical Bugs | Story 2: Dropdown fix | HIGH | 0.5h | Story 1 | ✅ DONE |
| 3: Components | Story 3: Sidebar + collapse + tooltips | HIGH | 3h | Story 1, 5, 5.5 | ✅ DONE |
| 3: Components | Story 4: Header | MEDIUM | 1.5h | None | ✅ DONE |
| 3: Components | Story 6: Button gradient + polish | MEDIUM | 1h | Story 1 | ✅ DONE |
| 3: Components | Story 7: Card glassmorphic hover | MEDIUM | 0.5h | Story 1 | ✅ DONE |
| 3: Components | Story 17: Badge system | MEDIUM | 1h | Story 1 | ✅ DONE |
| 4: Integration | Story 8: Refactor page | HIGH | 3h | Story 5.5 | ✅ DONE |
| 4: Integration | Story 9: Layout integration | HIGH | 1.5h | Story 3, 8 | ✅ DONE |
| 4: Integration | Story 15: Page Toolbar + breadcrumbs | HIGH | 2h | Story 1 | ✅ DONE |
| 5: Polish | Story 10: Mobile Nav (44px targets) | MEDIUM | 1h | Story 5.5 | ✅ DONE |
| 5: Polish | Story 11: Metadata | LOW | 0.25h | None | ✅ DONE |
| 5: Polish | Story 16: Status + Loading | HIGH | 1.5h | Story 1 | ✅ DONE |
| 5: Polish | Story 19: View Transitions | MEDIUM | 1.5h | Story 1, 8 | ✅ DONE |
| 5: Polish | Story 20: Toast Notifications | HIGH | 1.5h | Story 1 | ✅ DONE |
| 5: Polish | Story 21: Empty States | HIGH | 1h | Story 6 | ✅ DONE |
| 6: Dashboard | Story 12: Dashboard Grid + widgets | HIGH | 2h | Story 1 | ✅ DONE |
| 6: Dashboard | Story 13: Metric Cards | HIGH | 1.5h | Story 7, 12 | ✅ DONE |
| 7: Visualization | Story 14: Chart Library + gauges | MEDIUM | 4h | Story 1, 12 | ✅ DONE |
| 7: Visualization | Story 18: Enhanced Data Table | MEDIUM | 2h | Story 7, 16 | ✅ DONE |
| 8: LLM + Extras | Story 22: LLM Chat Bubbles | MEDIUM | 2h | Story 1 | ✅ DONE |
| 8: LLM + Extras | Story 23: Notifications + Feed | MEDIUM | 2h | Story 3, 20 | ✅ DONE |
| 8: LLM + Extras | Story 24: Style Guide Page | LOW | 1.5h | All | ✅ DONE |
| **Total** | | | **~42 hours** | |

---

## Testing Strategy

| Story | Test Method | Expected Result |
|-------|-------------|-----------------|
| Story 1 | `npm run build` | Build succeeds, no CSS errors |
| Story 1 | Contrast checker | All colors ≥4.5:1 ratio |
| Story 2 | Visual check | Dropdowns have solid #141414 background |
| Story 3 | Click sidebar items | Active tab changes, highlight follows |
| Story 4 | Visual check | Both logos visible, proper sizing |
| Story 5 | Type check | TypeScript passes, NavId type works |
| Story 5.5 | Context test | useNavigation() returns correct values |
| Story 6 | Visual check | All buttons use new colors |
| Story 7 | Visual check | Cards have consistent dark styling |
| Story 8 | Navigation test | Clicking sidebar switches content |
| Story 9 | Responsive test | Layout offsets at all breakpoints |
| Story 10 | Mobile viewport | Bottom nav visible, functional |
| Story 10 | iOS Simulator | Safe area insets apply correctly |
| Story 11 | Browser tab | Title shows co-branding |
| Story 12 | Responsive test | Grid layouts at all breakpoints |
| Story 12 | `npm run build` | Compiles without errors |
| Story 13 | Visual check | Metric cards show large numbers + trends |
| Story 13 | Hover test | Elevation effect on card hover |
| Story 14 | `npm run build` | No SSR hydration errors |
| Story 14 | Visual check | Charts render with dark theme |
| Story 14 | Visual check | Gauge shows radial progress, donut shows ring |
| Story 14 | Responsive test | Charts resize with viewport |
| Story 15 | Visual check | Search bar + filter pills render |
| Story 15 | Keyboard test | Cmd+K focuses search input |
| Story 15 | Filter test | Clicking pills toggles active state |
| Story 16 | Visual check | Status dots pulse (green=online, red=offline) |
| Story 16 | Visual check | Shimmer skeletons animate with gradient sweep |
| Story 16 | Visual check | ColorProgress changes red→amber→green by value |
| Story 16 | Accessibility | Screen reader announces status labels |
| Story 17 | Visual check | All severity badges render (critical→info) |
| Story 17 | Visual check | Strike badge has DojoLM red gradient |
| Story 17 | Accessibility | Badge contrast ratios pass WCAG AA |
| Story 18 | Click test | Column headers sort asc/desc/none |
| Story 18 | Visual check | Sticky header stays on scroll |
| Story 18 | Keyboard test | Tab to headers, Enter to sort |
| Story 19 | Visual check | Tab switch fades in content |
| Story 19 | Visual check | Metric cards stagger in sequentially |
| Story 19 | Visual check | Dojo glow on bypass result cards |
| Story 19 | Accessibility | Reduced motion disables all animations |
| Story 20 | Trigger test | Success/error toasts appear correctly |
| Story 20 | Auto-dismiss | Toasts auto-dismiss after 5s |
| Story 20 | Visual check | Max 3 toasts visible at once |
| Story 21 | Visual check | Empty states render with icon, title, CTA |
| Story 21 | Preset test | All presets (noScans, noTests, noResults, noData) render |
| Story 22 | Visual check | User bubbles right-aligned, LLM left-aligned |
| Story 22 | Copy test | Copy button works on response bubbles |
| Story 22 | Visual check | Typing indicator dots bounce |
| Story 23 | Visual check | Bell icon shows unread count badge |
| Story 23 | Dropdown test | Notifications panel opens/closes |
| Story 23 | Activity feed | Events display with icons + timestamps |
| Story 24 | Navigate test | /style-guide page loads all components |
| Story 24 | Visual check | All variants/sections render correctly |

---

## Critical Files Summary

| File | Change | Priority | Story |
|------|--------|----------|-------|
| `src/app/globals.css` | Add color tokens, safe areas | HIGH | 1, 10 |
| `src/lib/constants.ts` | Add NAV_ITEMS | MEDIUM | 5 |
| `src/lib/NavigationContext.tsx` | NEW | HIGH | 5.5 |
| `src/components/ui/select.tsx` | Verify solid popover | HIGH | 2 |
| `src/components/layout/Sidebar.tsx` | NEW | HIGH | 3 |
| `src/components/layout/SidebarHeader.tsx` | NEW | MEDIUM | 4 |
| `src/components/layout/MobileNav.tsx` | NEW | MEDIUM | 10 |
| `src/app/page.tsx` | Refactor to use context | HIGH | 8, 9 |
| `src/app/layout.tsx` | Update metadata | LOW | 11 |
| `public/branding/` | NEW: Logo assets | MEDIUM | 4 |
| `src/components/layout/DashboardGrid.tsx` | NEW | HIGH | 12 |
| `src/components/ui/MetricCard.tsx` | NEW | HIGH | 13 |
| `src/components/charts/LineChart.tsx` | NEW | MEDIUM | 14 |
| `src/components/charts/BarChart.tsx` | NEW | MEDIUM | 14 |
| `src/components/charts/CoverageMap.tsx` | NEW | MEDIUM | 14 |
| `src/components/charts/TrendChart.tsx` | NEW | MEDIUM | 14 |
| `src/components/charts/GaugeChart.tsx` | NEW | MEDIUM | 14 |
| `src/components/charts/DonutChart.tsx` | NEW | MEDIUM | 14 |
| `src/components/layout/PageToolbar.tsx` | NEW | HIGH | 15 |
| `src/components/ui/StatusDot.tsx` | NEW | HIGH | 16 |
| `src/components/ui/ShimmerSkeleton.tsx` | NEW | HIGH | 16 |
| `src/components/ui/ColorProgress.tsx` | NEW | HIGH | 16 |
| `src/components/ui/badge.tsx` | MODIFY (new variants) | MEDIUM | 17 |
| `src/components/ui/SortableTable.tsx` | NEW | MEDIUM | 18 |
| `src/components/layout/AnimatedView.tsx` | NEW | MEDIUM | 19 |
| `src/components/ui/Toast.tsx` | NEW | HIGH | 20 |
| `src/lib/useToast.ts` | NEW | HIGH | 20 |
| `src/components/ui/EmptyState.tsx` | NEW | HIGH | 21 |
| `src/components/llm/ChatBubble.tsx` | NEW | MEDIUM | 22 |
| `src/components/llm/TypingIndicator.tsx` | NEW | MEDIUM | 22 |
| `src/components/layout/NotificationsPanel.tsx` | NEW | MEDIUM | 23 |
| `src/components/ui/ActivityFeed.tsx` | NEW | MEDIUM | 23 |
| `src/app/style-guide/page.tsx` | NEW | LOW | 24 |

---

## WCAG Compliance Summary

| Element | Foreground | Background | Ratio | WCAG AA | Action |
|---------|-----------|------------|-------|---------|--------|
| Primary text | #FAFAFA | #000000 | 16.1:1 | PASS | ✅ |
| Muted text | #A1A1AA | #0A0A0A | 7.3:1 | PASS | ✅ |
| Buttons (NEW) | #FFFFFF | #C62828 | 4.6:1 | PASS | ✅ Fixed |
| Active nav (large) | #FFFFFF | #E63946 | 3.9:1 | PASS* | Large text only |
| Active nav (normal) | #FFFFFF | #C62828 | 4.6:1 | PASS | ✅ Use for sidebar |

*WCAG AA requires 4.5:1 for normal text, 3:1 for large text (18pt+)

---

## SME Review Summary

### UX Designer (9.5/10)
- ✅ Excellent design coverage
- ⚠️ WCAG concern addressed (darker red)
- ⚠️ Add transition timing tokens
- ⚠️ Define z-index scale
- ⚠️ Add focus states

### Architect (7/10)
- ✅ Component architecture sound
- ⚠️ Critical: Routing mismatch addressed (tab context approach)
- ⚠️ Missing navigation context (added as Story 5.5)

### Developer (6/10)
- ✅ Acceptance criteria clear
- ⚠️ Story dependency issues fixed (Story 5 before 3)
- ⚠️ TypeScript issues fixed (removed `satisfies`)
- ⚠️ Estimate increased (11.25h → 16.5h)

---

## Design Reference Inspirations

### From brand-config.json
| Source | Epic Usage |
|--------|------------|
| `company.primary: #000000` | `--background: #000000` |
| `products.dojolm.color: #E63946` | `--dojo-primary-lg: #E63946` (large text) |
| `products.dojolm.electric: #FF1744` | `--dojo-electric: #FF1744` |
| `products.dojolm.focus` | "TPI Security Test Lab" subtitle |

### From Dribbble Design Patterns (26 applicable patterns)

**YouTube Analytics Patterns:**
| Pattern | Epic Implementation | Story | Status |
|---------|---------------------|-------|--------|
| Sidebar + main content layout | Sidebar.tsx with NavigationContext | 3, 9 | ✅ |
| Icon-only sidebar (toggle) | Collapse toggle button, icon-only mode | 3 | ✅ |
| Grid-based card layout | MetricGrid, SplitView, FullWidthRow | 12 | ✅ |
| Metric cards + trend arrows | MetricCard with trend indicators | 13 | ✅ |
| Glassmorphic card surfaces | `.glass`, `.glass-card` utilities | 1 | ✅ |
| Line charts | DojoLineChart (recharts) | 14 | ✅ |
| Bar charts | DojoBarChart (recharts) | 14 | ✅ |
| Search bar in toolbar | PageToolbar search input | 15 | ✅ |
| Filter pills/tab strip | PageToolbar filter pills | 15 | ✅ |

**AI Dashboard Patterns:**
| Pattern | Epic Implementation | Story | Status |
|---------|---------------------|-------|--------|
| Responsive auto-grid | MetricGrid responsive columns | 12 | ✅ |
| Soft gradient overlays | `.gradient-overlay-*` utilities | 1 | ✅ |
| Gauge/radial charts | GaugeChart (recharts RadialBarChart) | 14 | ✅ |
| Donut/ring charts | DonutChart (recharts PieChart) | 14 | ✅ |
| Card hover elevation | Glassmorphic lift + shadow + border glow | 7 | ✅ |
| Skeleton loading shimmer | ShimmerSkeleton with `animate-shimmer` | 16 | ✅ |
| Color-coded progress | ColorProgress (red→amber→green) | 16 | ✅ |

**Cybersecurity Dashboard Patterns:**
| Pattern | Epic Implementation | Story | Status |
|---------|---------------------|-------|--------|
| Dark theme depth layers | Layered: #000000 → #0A0A0A → #1C1C1E | 1 | ✅ |
| Card-based modular design | Card component with dark theme | 7 | ✅ |
| Status indicators + pulse | StatusDot (online/offline/idle/loading) | 16 | ✅ |
| Consistent component patterns | Unified design tokens, CVA variants | 6, 7 | ✅ |
| Badge/tag severity system | Enhanced badge with severity + strike | 17 | ✅ |
| Data table sort + hover | SortableTable with sticky header | 18 | ✅ |

**Cross-cutting Patterns:**
| Pattern | Epic Implementation | Story | Status |
|---------|---------------------|-------|--------|
| 8px grid system | `--spacing-*` tokens | 1 | ✅ |
| Micro-interactions + view transitions | AnimatedView, stagger, dojo-glow, reduced motion | 19 | ✅ |
| High contrast borders | `--border: #27272A` | 1 | ✅ |
| Typography hierarchy | `--foreground`, `--muted-foreground`, `--text-tertiary` | 1 | ✅ |

**Dribbble Adherence**: **~99%** (all applicable patterns covered)
- Previous: ~35% (initial) → ~65% (Stories 12-14) → ~95% (Stories 15-19) → **~99%** (Stories 20-24 + feedback alignment)

### From Feedback Design References (6 Dribbble designs)
| Pattern | Epic Implementation | Story | Status |
|---------|---------------------|-------|--------|
| Active sidebar: left border + bg tint | 3px red border + `--dojo-subtle` bg | 3 | ✅ |
| Tooltip on collapsed sidebar icons | `title` attribute on collapsed buttons | 3 | ✅ |
| Card depth tokens (elevated/pressed) | `--card-elevated`, `--card-pressed` | 1 | ✅ |
| Button gradient + hover lift + press | Default gradient, -1px lift, scale 0.98 | 6 | ✅ |
| Input focus ring: DojoLM red | Global `*:focus-visible` rule | 1 | ✅ |
| Toast notifications (4 variants) | Toast component + useToast hook | 20 | ✅ |
| Empty states with CTA | EmptyState + presets | 21 | ✅ |
| Breadcrumbs for deep navigation | PageToolbar breadcrumb prop | 15 | ✅ |
| Notifications panel + bell icon | NotificationsPanel with badge | 23 | ✅ |
| Gradient fill under line charts | `<defs>` gradient in LineChart | 14 | ✅ |
| LLM message bubbles | ChatBubble (user/assistant) | 22 | ✅ |
| Typing indicator | TypingIndicator (3 dots bounce) | 22 | ✅ |
| Custom scrollbar (dark theme) | Webkit + Firefox scrollbar CSS | 1 | ✅ |
| Inter + JetBrains Mono fonts | Font imports in globals.css | 1 | ✅ |
| Widget action headers | WidgetCard in DashboardGrid | 12 | ✅ |
| 44px touch targets (mobile) | MobileNav min height enforced | 10 | ✅ |
| Live activity feed | ActivityFeed component | 23 | ✅ |
| Component style guide page | /style-guide route (dev only) | 24 | ✅ |

---

## References

- UI Plan: [team/ui-modernization-plan.md](./ui-modernization-plan.md)
- Brand Config: [team/branding/assets/brand-config.json](./branding/assets/brand-config.json)
- Logo Assets: [team/branding/assets/](./branding/assets/)
- QA Handoff: [team/QA-Log/dev-handoff-20260301.md](./QA-Log/dev-handoff-20260301.md)
