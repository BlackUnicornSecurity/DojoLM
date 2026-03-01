# DojoLM UI Modernization Plan

**Date:** 2026-03-01
**Status:** Planning
**Priority:** High

---

## Executive Summary

Modernize the DojoLM web application UI to align with Blackunicorn design standards. The current interface has a "vibe coded" appearance with too many navigation items, incorrect color usage, and transparency bugs.

**Key Changes:**
- Left sidebar navigation (reduced from 7 to 5 items)
- BlackUnicorn dark theme as primary base
- DojoLM red for buttons and accents only
- Co-branded header (BlackUnicorn + DojoLM)
- Fix dropdown transparency issues

---

## Current Issues

| Issue | Impact | Priority |
|-------|--------|----------|
| Tab navigation at top (no sidebar) | Unprofessional, non-standard | High |
| 7 navigation items (too many) | Cluttered, hard to navigate | High |
| Blue primary color (#0A84FF) | Off-brand | High |
| Dropdown transparency glitch | Usability issue | Medium |
| Missing BlackUnicorn branding | Inconsistent with company | Medium |
| Generic component styling | Unpolished appearance | Medium |

---

## Brand Color Hierarchy

### BlackUnicorn (Company) - PRIMARY BASE
```
Primary:   #000000  (Black)
Secondary: #0A0A0A  (Near black)
Tertiary:  #1C1C1E  (Dark grey)
Border:    #27272A  (Subtle borders)
```

### DojoLM (Product) - SECONDARY/ACCENT
```
Primary:  #E63946  (Red)
Electric: #FF1744  (Bright red)
Hover:    #D32F2F  (Darker red)
```

### Color Usage Rules
| Element | Color | Purpose |
|---------|-------|---------|
| Backgrounds, surfaces | BlackUnicorn blacks/greys | Base theme |
| Borders, dividers | #27272A | Subtle separation |
| **Primary buttons** | **DojoLM red (#E63946)** | CTAs, actions |
| **Active nav items** | **DojoLM red** | Current location |
| Links, highlights | DojoLM electric | Attention |
| Status indicators | Semantic colors | Success/warning/error |

---

## Navigation Streamlining

### Current Navigation (7 items)
1. Live Scanner
2. Fixtures
3. Test Payloads
4. Coverage Map
5. Pattern Reference
6. Run Tests
7. LLM Dashboard

### Proposed Navigation (5 items)

| New Section | Combined From | Icon | Rationale |
|-------------|---------------|------|-----------|
| **Scanner** | Live Scanner | Shield | Main feature - keep prominent |
| **Test Lab** | Fixtures + Test Payloads | FlaskConical | Both are test content |
| **Coverage** | Coverage Map + Pattern Reference | Target | Both show coverage info |
| **Validation** | Run Tests | PlayCircle | Testing/execution |
| **LLM Dashboard** | LLM Dashboard | Brain | Keep separate (distinct feature) |

### Alternative: Dropdown Groups (if 5 is still too many)

| Main Nav | Dropdown Items |
|----------|----------------|
| Scanner | Live Scanner |
| Testing | Fixtures, Test Payloads, Run Tests |
| Coverage | Coverage Map, Pattern Reference |
| LLM | LLM Dashboard |

---

## Implementation Plan

### Phase 1: Color System Update

**File:** `packages/dojolm-web/src/app/globals.css`

```css
:root {
  /* BlackUnicorn primary colors - base theme */
  --background: #000000;
  --bg-secondary: #0A0A0A;
  --bg-tertiary: #141414;
  --bg-quaternary: #1C1C1E;

  /* DojoLM red for accents only */
  --dojo-primary: #E63946;
  --dojo-electric: #FF1744;
  --dojo-hover: #D32F2F;

  /* Semantic colors */
  --success: #22C55E;
  --warning: #F59E0B;
  --danger: #E63946;  /* Use DojoLM red for danger */

  /* Text colors */
  --foreground: #FAFAFA;
  --muted-foreground: #A1A1AA;
  --text-tertiary: #71717A;

  /* UI colors */
  --card: #0A0A0A;
  --popover: #141414;  /* Solid - fix transparency */
  --accent: #1C1C1E;
  --border: #27272A;

  /* Primary action - DojoLM red */
  --primary: #E63946;
  --primary-foreground: #FFFFFF;
  --ring: #E63946;

  /* Secondary - dark grey */
  --secondary: #1C1C1E;
  --secondary-foreground: #FAFAFA;
}
```

### Phase 2: Sidebar Navigation Component

**New File:** `packages/dojolm-web/src/components/layout/Sidebar.tsx`

Features:
- Width: 260px (desktop), 72px (collapsed)
- Co-branded header (BlackUnicorn + DojoLM)
- Active state with DojoLM red
- Icons for each item
- Bottom section for Settings/Help

```
┌─────────────────────┐
│ [BU] DojoLM         │
├─────────────────────┤
│ • Scanner           │
│   Test Lab          │
│   Coverage          │
│   Validation        │
│   LLM Dashboard     │
├─────────────────────┤
│ Settings / Help     │
└─────────────────────┘
```

### Phase 3: Co-Branded Header

**New File:** `packages/dojolm-web/src/components/layout/SidebarHeader.tsx`

Display both logos:
- BlackUnicorn logo (left)
- DojoLM wordmark (right)
- Subtitle: "TPI Security Test Lab"

**Logo Assets:**
- BlackUnicorn: `/team/branding/assets/blackunicorn/unprocessed/Logo BU No background.png`
- DojoLM: `/team/branding/assets/dojolm/unprocessed/DOJO v2 no text.jpg`

### Phase 4: Navigation Constants Update

**File:** `packages/dojolm-web/src/lib/constants.ts`

```typescript
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
```

### Phase 5: Fix Dropdown Transparency

**File:** `packages/dojolm-web/src/components/ui/select.tsx`

**Issue:** `bg-popover` class has transparency in dark theme

**Fix:**
```tsx
className={cn(
  "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border",
  "bg-[#141414]",  // Explicit solid color
  "text-popover-foreground shadow-lg",
  // ... rest of classes
)}
```

### Phase 6: Component Polish

Update components with new color system:

1. **Buttons** (`src/components/ui/button.tsx`)
   - Primary: DojoLM red gradient
   - Secondary: Dark grey with white border
   - Ghost: Transparent with hover

2. **Cards** (`src/components/ui/card.tsx`)
   - Background: #0A0A0A
   - Border: #27272A
   - Hover elevation

3. **Badges/Status**
   - DojoLM red for active/alert
   - Semantic colors for severity
   - Consistent sizing

### Phase 7: Page Layout Restructure

**File:** `packages/dojolm-web/src/app/page.tsx`

1. Remove top tab navigation
2. Integrate sidebar layout
3. Update responsive behavior
4. Maintain existing functionality

---

## Design System Tokens

```css
:root {
  /* Layout */
  --sidebar-width: 260px;
  --sidebar-collapsed: 72px;
  --header-height: 64px;
  --content-max-width: 1400px;

  /* Spacing (8px grid) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
}
```

---

## Responsive Breakpoints

| Breakpoint | Width | Sidebar | Notes |
|------------|-------|---------|-------|
| Mobile | <768px | Bottom nav or drawer | Full screen content |
| Tablet | 768-1024px | Collapsed (icons) | Expandable on hover |
| Desktop | >1024px | Full sidebar | Labels visible |

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/layout/Sidebar.tsx` | Main sidebar navigation |
| `src/components/layout/SidebarHeader.tsx` | Co-branded header |
| `src/components/layout/BrandHeader.tsx` | Top bar with breadcrumbs |
| `src/components/layout/MobileNav.tsx` | Mobile bottom navigation |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/globals.css` | Color system update |
| `src/app/page.tsx` | Layout restructure |
| `src/app/layout.tsx` | Metadata update |
| `src/lib/constants.ts` | Navigation structure |
| `src/components/ui/select.tsx` | Transparency fix |
| `src/components/ui/button.tsx` | Button styles |
| `src/components/ui/card.tsx` | Card styles |

---

## Design References

Incorporate patterns from Dribbble examples:

1. **High contrast borders** - Subtle but visible edges (#27272A)
2. **Glassmorphism** - Subtle backdrop blur on overlays
3. **Gradient accents** - DojoLM red gradient for CTAs
4. **Proper spacing** - 8px grid system
5. **Visual hierarchy** - Clear primary/secondary actions
6. **Micro-interactions** - Smooth transitions, hover states
7. **Data visualization** - Clean charts, indicators
8. **Dark theme depth** - Layered backgrounds

---

## Verification Checklist

After implementation, verify:

- [ ] BlackUnicorn dark base colors applied
- [ ] DojoLM red used for buttons/accents only
- [ ] Both logos visible in header
- [ ] Sidebar navigation functional (5 items)
- [ ] Dropdowns have solid backgrounds
- [ ] Mobile responsive (drawer/bottom nav)
- [ ] Tablet collapsed sidebar works
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation functional
- [ ] Cross-browser tested (Chrome, Firefox, Safari)

---

## Implementation Order

1. **Color system** - Update globals.css
2. **Logo integration** - Add BlackUnicorn + DojoLM
3. **Navigation consolidation** - Reduce to 5 items
4. **Dropdown fix** - Resolve transparency
5. **Sidebar component** - Create new layout
6. **Page restructure** - Integrate sidebar
7. **Component polish** - Update buttons, cards
8. **Responsive** - Mobile and tablet views

---

## References

- Brand config: `team/branding/assets/brand-config.json`
- Logo assets: `team/branding/assets/`
- Current UI: `packages/dojolm-web/src/`
