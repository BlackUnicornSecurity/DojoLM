# KABOOM Decontamination Review Epic

**Epic ID**: TPI-DECON-001
**Status**: In Progress
**Created**: 2026-03-01
**Priority**: HIGH (Brand integrity - old UI contamination in new katana/dojo UI)
**Sprint**: Decontamination Sprint

---

## Index

1. [Overview](#overview)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Contamination Inventory](#contamination-inventory)
4. [Decontamination Actions Taken](#decontamination-actions-taken)
5. [Review Stories](#review-stories)
6. [Definition of Done](#definition-of-done)

---

## Overview

During UI modernization, elements from the **old "KABOOM" UI design system** (`team/planning/planned-features/UI-design.md`) were incorrectly carried over into the **new katana/dojo-based UI**. The old UI used a cyberpunk aesthetic with explosion oranges, Electric Blue (#00D4FF), and Plasma Purple (#7B2CBF). The new UI uses BlackUnicorn dark base + DojoLM red accents — no KABOOM.

### Brand Systems Comparison

| Attribute | OLD UI (KABOOM) | NEW UI (Katana/Dojo) |
|-----------|----------------|---------------------|
| Theme | Cyberpunk explosion | Katana/Dojo martial arts |
| Accent Colors | #FF4500 → #FF6B35 (orange) | #C62828 → #E63946 (DojoLM red) |
| Background | #0D0D0D, #1A1A2E | #000000, #0A0A0A, #1C1C1E |
| Special Colors | Electric Blue #00D4FF, Plasma Purple #7B2CBF | None (red-only accents) |
| Bypass Badge | "KABOOM!" (orange gradient) | "Strike" (DojoLM red gradient) |
| Animations | kaboom-glow, kaboom-pulse | dojo-glow, dojo-pulse |
| Source File | `team/planning/planned-features/UI-design.md` | `team/epic-ui-modernization.md` |

---

## Root Cause Analysis

1. **Source**: The old `UI-design.md` file in `team/planning/planned-features/` defines a "KABOOM!" theme for the TPI Security Test Lab
2. **Contamination vector**: When creating the UI modernization epic, Story 17 (Badge) and Story 19 (Animations) copied KABOOM branding elements directly from `UI-design.md` instead of creating new katana/dojo-themed equivalents
3. **Impact**: Badge variant named "kaboom", CSS animations named "kaboom-glow"/"kaboom-pulse", orange gradient colors (#FF4500 → #FF6B35) that don't match the DojoLM red palette
4. **Mitigating factor**: The KABOOM elements were **defined but never used** in any rendered component — no user-facing contamination

---

## Contamination Inventory

### Files That Were Contaminated (now fixed)

| File | Lines | Contamination | Fix Applied |
|------|-------|---------------|-------------|
| `packages/dojolm-web/src/components/ui/badge.tsx` | 3, 40-41 | `kaboom` variant with orange gradient | Renamed to `strike`, uses DojoLM red CSS vars |
| `packages/dojolm-web/src/app/globals.css` | 241-259 | `kaboom-glow`, `kaboom-pulse` keyframes + classes | Renamed to `dojo-glow`, `dojo-pulse` |
| `team/epic-ui-modernization.md` | 16 locations | KABOOM in ACs, code, tests, DoD, traceability | All replaced with katana/dojo equivalents |
| `team/lessonslearned.md` | 132 | "KABOOM" in Phase 5 file list | Replaced with "dojo-glow/dojo-pulse" |

### Old Design Files (still exist in `team/planning/`)

| File | Status | Action Required |
|------|--------|----------------|
| `team/planning/planned-features/UI-design.md` | Exists | Mark as DEPRECATED, add warning header |
| `team/planning/planned-features/UI-kaboom.md` | Exists | Mark as DEPRECATED, add warning header |
| `team/planning/planned-features/previews/kaboom-preview.html` | Exists | Mark as DEPRECATED |
| `team/planning/planned-features/previews/kaboom-preview-minimal.html` | Exists | Mark as DEPRECATED |
| `team/planning/planned-features/previews/kaboom-preview-21st.html` | Exists | Mark as DEPRECATED |

---

## Decontamination Actions Taken

### Immediate Fixes (completed)

1. **badge.tsx**: Renamed `kaboom` variant → `strike`, replaced orange gradient with DojoLM red CSS variables (`var(--dojo-primary)` → `var(--dojo-primary-lg)`)
2. **globals.css**: Renamed all KABOOM keyframes and classes:
   - `@keyframes kaboom-glow` → `@keyframes dojo-glow`
   - `@keyframes kaboom-pulse` → `@keyframes dojo-pulse`
   - `.animate-kaboom-glow` → `.animate-dojo-glow`
   - `.animate-kaboom-pulse` → `.animate-dojo-pulse`
3. **epic-ui-modernization.md**: Updated all 16 KABOOM references across Stories 17, 19, 24, Definition of Done, Testing Strategy, and Traceability Matrix
4. **lessonslearned.md**: Updated Phase 5 entry to reference new names
5. **Build verified**: `npm run build` passes successfully
6. **Zero KABOOM grep**: Full codebase search returns 0 matches

---

## Review Stories

### Story 1: Review Badge Component for Brand Alignment (Priority: HIGH)

**ID**: TPI-DECON-001-01
**Status**: Review Required

**As a** designer reviewing brand alignment
**I want** the badge component to use only katana/dojo branding
**So that** there is no residual old-UI influence

**Review Checklist**:
- [ ] Verify `strike` variant uses DojoLM red gradient (not orange)
- [ ] Verify no hardcoded hex values — all colors reference CSS variables
- [ ] Verify variant name `strike` fits katana/dojo theme
- [ ] Verify badge file header comment says "strike" not "KABOOM"
- [ ] Verify badge renders correctly at all sizes
- [ ] Run `npm run build` — no errors

**Files to Review**:
- `packages/dojolm-web/src/components/ui/badge.tsx`

---

### Story 2: Review CSS Animations for Brand Alignment (Priority: HIGH)

**ID**: TPI-DECON-001-02
**Status**: Review Required

**As a** designer reviewing brand alignment
**I want** all CSS animations to use katana/dojo naming
**So that** the codebase reflects the correct brand identity

**Review Checklist**:
- [ ] Verify `dojo-glow` and `dojo-pulse` keyframes use DojoLM red colors
- [ ] Verify no `kaboom` string appears anywhere in globals.css
- [ ] Verify animation classes are `.animate-dojo-glow` and `.animate-dojo-pulse`
- [ ] Verify reduced-motion media query still covers these animations
- [ ] Check if any component references old class names (should be 0 — animations were unused)

**Files to Review**:
- `packages/dojolm-web/src/app/globals.css`

---

### Story 3: Review Epic Plan for Completeness (Priority: MEDIUM)

**ID**: TPI-DECON-001-03
**Status**: Review Required

**As a** project manager
**I want** the epic plan to be fully decontaminated
**So that** future implementation follows correct branding

**Review Checklist**:
- [ ] grep the epic file for "kaboom" (case insensitive) — should return 0
- [ ] Verify Story 17 acceptance criteria reference "strike" variant
- [ ] Verify Story 19 acceptance criteria reference "dojo" animations
- [ ] Verify Story 24 (style guide) references "strike" not "KABOOM"
- [ ] Verify Definition of Done references "strike" not "KABOOM"
- [ ] Verify Testing Strategy table references "strike" and "dojo glow"
- [ ] Verify Traceability Matrix references "strike" and "dojo-glow"

**Files to Review**:
- `team/epic-ui-modernization.md`

---

### Story 4: Mark Old Design Files as Deprecated (Priority: LOW)

**ID**: TPI-DECON-001-04
**Status**: Pending

**As a** team member
**I want** old KABOOM design files clearly marked as deprecated
**So that** no one accidentally uses them as reference for the new UI

**Acceptance Criteria**:
- [ ] Add `> ⚠️ DEPRECATED: This file is from the old KABOOM UI design. The current UI uses katana/dojo branding. See team/epic-ui-modernization.md for the active design system.` to the top of:
  - `team/planning/planned-features/UI-design.md`
  - `team/planning/planned-features/UI-kaboom.md`
- [ ] Do NOT delete these files (they are historical reference)

**Files to Modify**:
- `team/planning/planned-features/UI-design.md`
- `team/planning/planned-features/UI-kaboom.md`

---

### Story 5: Full Codebase Sweep for Off-Brand Elements (Priority: MEDIUM)

**ID**: TPI-DECON-001-05
**Status**: Pending

**As a** developer
**I want** to verify no other old-UI elements leaked into the codebase
**So that** the entire application uses consistent katana/dojo branding

**Review Checklist**:
- [ ] Search for old KABOOM colors: `#FF4500`, `#FF6B35` (explosion orange)
- [ ] Search for old UI colors: `#00D4FF` (Electric Blue), `#7B2CBF` (Plasma Purple)
- [ ] Search for old background: `#1A1A2E` (Deep Gunmetal)
- [ ] Search for old color names: "Cyber Black", "Electric Blue", "Plasma Purple"
- [ ] Search for "explosion", "cyberpunk" in component files
- [ ] Verify all component files only reference design tokens from globals.css `:root`
- [ ] Spot-check 5 random components for hardcoded hex values

**Scope**: `packages/dojolm-web/src/`

---

## Definition of Done

- [ ] Zero KABOOM references in entire codebase (grep verified)
- [ ] Badge `strike` variant uses DojoLM red CSS variables
- [ ] CSS animations use `dojo-glow` / `dojo-pulse` naming
- [ ] Epic plan fully updated with katana/dojo branding
- [ ] Old design files marked as DEPRECATED
- [ ] Full codebase sweep for off-brand colors completed
- [ ] Build passes: `npm run build`
- [ ] All 5 review stories completed
- [ ] Lessons learned updated

---

## References

- Current UI Epic: [team/epic-ui-modernization.md](./epic-ui-modernization.md)
- Old UI Design (DEPRECATED): [team/planning/planned-features/UI-design.md](./planning/planned-features/UI-design.md)
- Old KABOOM Feature (DEPRECATED): [team/planning/planned-features/UI-kaboom.md](./planning/planned-features/UI-kaboom.md)
