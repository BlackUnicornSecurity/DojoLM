# Next.js Migration Plan
## DojoLM - Modern Web Stack

**Current State:** Single `index.html` file (1900+ lines) with inline CSS/JS
**Target Stack:** Next.js 15, TypeScript 5, Tailwind CSS 4, Shadcn UI

---

## Executive Summary

| Component | Current | Target |
|-----------|---------|--------|
| Framework | Vanilla HTML/JS | Next.js 15 (App Router) |
| Language | JavaScript | TypeScript 5 |
| Styling | Inline CSS (400 lines) | Tailwind CSS 4 |
| Components | N/A | Shadcn UI + Radix UI |
| State | Vanilla JS | React Hooks + Context |
| API | Bun/Node server | Next.js API Routes |

---

## Phase 1: Project Setup (Week 1)

### 1.1 Initialize Next.js Project

```bash
# Create new Next.js app in packages/dojolm-web
npx create-next-app@latest packages/dojolm-web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Or manually:
mkdir -p packages/dojolm-web
cd packages/dojolm-web
npm init -y
npm install next@latest react@latest react-dom@latest
npm install -D typescript @types/react @types/node tailwindcss postcss autoprefixer
```

### 1.2 Configure Tailwind CSS 4

```bash
# Tailwind 4 uses CSS-native configuration
npm install tailwindcss@next @tailwindcss/vite
```

**tailwind.config.ts:**
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Match current dark theme colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { ... },
        // ... rest of theme
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### 1.3 Install Shadcn UI

```bash
npx shadcn@latest init
```

**Answer prompts:**
- TypeScript: Yes
- Style: Default (or New York)
- Base color: Slate (or Neutral for dark theme)
- CSS variables: Yes
- Import alias: @/*

### 1.4 Update Monorepo Root

**Update root `package.json`:**
```json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "npm run dev --workspace=packages/dojolm-web",
    "build": "npm run build --workspace=packages/dojolm-web",
    "start": "npm run start --workspace=packages/dojolm-web"
  }
}
```

---

## Phase 2: Core Components (Week 2)

### 2.1 Component Mapping

| Current (index.html) | New Component | Shadcn Base |
|---------------------|---------------|-------------|
| Tab navigation | `<Tabs />` | `@/components/ui/tabs` |
| Scanner input | `<Textarea />` | `@/components/ui/textarea` |
| Findings list | `<Card />`, `<Badge />` | `@/components/ui/card`, `badge` |
| Results summary | `<StatCard />` | Custom + `<Card />` |
| Filter checkboxes | `<Checkbox />` | `@/components/ui/checkbox` |
| Test results | `<Table />` | `@/components/ui/table` |
| Payload cards | `<Card />` | `@/components/ui/card` |
| Buttons | `<Button />` | `@/components/ui/button` |

### 2.2 Component Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Main scanner page
│   └── api/
│       ├── scan/route.ts   # POST /api/scan
│       ├── fixtures/route.ts
│       └── tests/route.ts
├── components/
│   ├── ui/                 # Shadcn components
│   ├── scanner/
│   │   ├── ScannerInput.tsx
│   │   ├── FindingsList.tsx
│   │   └── QuickChips.tsx
│   ├── fixtures/
│   │   ├── FixtureList.tsx
│   │   └── FixtureDetail.tsx
│   ├── payloads/
│   │   └── PayloadCard.tsx
│   └── tests/
│       └── TestRunner.tsx
├── lib/
│   ├── scanner.ts          # Ported from packages/bu-tpi/src/scanner.ts
│   ├── types.ts            # Shared types
│   └── utils.ts            # Helper functions
└── styles/
    └── globals.css         # Tailwind directives + CSS variables
```

---

## Phase 3: TypeScript Migration (Week 3) ✅ COMPLETED

**Status:** Phase 3 has been completed successfully.

**Summary:**
- Type definitions are properly set up in `packages/dojolm-scanner/src/types.ts`
- Web package re-exports types from `@dojolm/scanner` package in `packages/dojolm-web/src/lib/types.ts`
- API client functions are implemented in `packages/dojolm-web/src/lib/api.ts`
- All files comply with CLAUDE.md documentation standards
- TypeScript compilation passes without errors

**Key Files Created/Modified:**
- `packages/dojolm-scanner/src/index.ts` - Entry point with proper file header
- `packages/dojolm-scanner/src/types.ts` - Core type definitions with standardized header
- `packages/dojolm-web/src/lib/types.ts` - Type re-exports for web app
- `packages/dojolm-web/src/lib/api.ts` - API client functions

### 3.1 Type Definitions (IMPLEMENTED)

**lib/types.ts:**
```typescript
// Port from packages/bu-tpi/src/types.ts
export interface Finding {
  category: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  description: string
  match?: string
  engine?: string
  lang?: string
  pattern_name?: string
  weight?: number
  source: 'current' | 'tpi'
}

export interface ScanResult {
  verdict: 'BLOCK' | 'WARN' | 'ALLOW'
  findings: Finding[]
  counts: {
    CRITICAL: number
    WARNING: number
    INFO: number
  }
  textLength: number
  normalizedLength: number
  elapsed: string
}

export interface Fixture {
  file: string
  attack: string | null
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | null
  clean: boolean
}
```

### 3.2 API Client (IMPLEMENTED)

**lib/api.ts:**
```typescript
export async function scanText(text: string): Promise<ScanResult> {
  const response = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!response.ok) throw new Error('Scan failed')
  return response.json()
}

export async function getFixtures(): Promise<FixtureManifest> {
  const response = await fetch('/api/fixtures')
  if (!response.ok) throw new Error('Failed to fetch fixtures')
  return response.json()
}
```

---

## Phase 4: API Routes (Week 3)

### 4.1 Next.js API Routes

**app/api/scan/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { scanText } from '@bu-tpi/scanner'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'text') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    if (text.length > 100_000) {
      return NextResponse.json({ error: 'Input too large' }, { status: 413 })
    }

    const result = scanText(text)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 4.2 Scanner Module

Create a shared scanner package that both the API routes and the old server can use:

**packages/bu-tpi-scanner/package.json:**
```json
{
  "name": "@bu-tpi/scanner",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

---

## Phase 5: Feature Parity (Week 4) ✅ COMPLETED (2025-02-23)

### 5.1 Migration Checklist

- [x] Live Scanner tab
  - [x] Text input with auto-scan (debounced)
  - [x] Engine filters (PI, Jailbreak, Unicode, Encoding, TPI)
  - [x] Results summary with verdict card
  - [x] Findings list with color-coded severity
  - [x] Performance bar

- [x] Fixtures tab
  - [x] Category filter
  - [x] Fixture list with status badges
  - [x] Fixture detail view
  - [x] Scan results for fixtures

- [x] Test Payloads tab
  - [x] Payload cards with examples
  - [x] Quick-load chips
  - [x] Click-to-scan functionality

- [x] Coverage Map tab
  - [x] Coverage table with progress bars
  - [x] Gap indicators

- [x] Reference tab
  - [x] Pattern reference documentation

- [x] Run Tests tab
  - [x] Test runner with progress
  - [x] Results table
  - [x] Statistics

### 5.2 State Management ✅ IMPLEMENTED

**lib/ScannerContext.tsx:** ✅ Created
- Provides global state for scanner functionality
- Methods: scanText, clear, toggleFilter, resetFilters
- State: findings, verdict, isScanning, error, engineFilters, lastScanTime

export const ScannerContext = createContext<ScannerContextType | null>(null)

export function ScannerProvider({ children }: { children: ReactNode }) {
  const [findings, setFindings] = useState<Finding[]>([])
  const [verdict, setVerdict] = useState<'BLOCK' | 'WARN' | 'ALLOW'>('ALLOW')
  const [isScanning, setIsScanning] = useState(false)

  const scanText = async (text: string) => {
    setIsScanning(true)
    try {
      const result = await api.scanText(text)
      setFindings(result.findings)
      setVerdict(result.verdict)
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <ScannerContext.Provider value={{ findings, verdict, isScanning, scanText }}>
      {children}
    </ScannerContext.Provider>
  )
}
```

---

## Phase 6: Polish & Deployment (Week 5) ✅ COMPLETED (2025-02-23)

### 6.1 Performance ✅ IMPLEMENTED

- [x] Implement React.memo for expensive components
- [x] Add virtualization for large fixture lists (react-window installed)
- [x] Code splitting by route (Next.js automatic)
- [x] Optimize bundle size (bundle analyzer configured)

### 6.2 Accessibility ✅ IMPLEMENTED

- [x] Keyboard navigation for all interactive elements
- [x] ARIA labels for screen readers
- [x] Focus management
- [x] Color contrast verification

### 6.3 Testing ✅ IMPLEMENTED

```bash
# Testing dependencies installed
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @vitejs/plugin-react jsdom
```

**Test Results:** 13/13 tests passing

### 6.4 Deployment Options ✅ CONFIGURED

**Option A: Vercel (Recommended)**
```bash
# Connect to Vercel
vercel login
vercel link
vercel --prod
```

**Option B: Docker**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY packages/dojolm-web/package*.json ./
RUN npm ci
COPY packages/dojolm-web ./
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

**Option C: Static Export (for GitHub Pages)**
```javascript
// next.config.js
module.exports = {
  output: 'export',
  images: { unoptimized: true },
}
```

---

## Dependencies Summary

### Production
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "lucide-react": "^0.400.0"
  }
}
```

### Development
```json
{
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
```

---

## Migration Timeline

**Original Timeline (Completed with extensions):**

| Week | Tasks | Deliverable | Status |
|------|-------|-------------|--------|
| 1 | Project setup, Tailwind config, Shadcn install | Base Next.js app | ✅ COMPLETED |
| 2 | Core components, UI foundation | Component library | ✅ COMPLETED |
| 3 | TypeScript types, API routes | Type-safe API layer | ✅ COMPLETED |
| 4 | Feature parity implementation | Full functionality | ✅ COMPLETED |
| 5 | Testing, polish, deployment | Production-ready app | ✅ COMPLETED |

**Actual Duration:** 5 weeks (as planned)  
**Completion Date:** 2026-02-28

---

## Rollout Strategy

### Option A: Big Bang (Recommended for Small Team)
1. Develop in `packages/dojolm-web/` alongside existing `index.html`
2. Feature flag the new UI
3. Cut over when complete

### Option B: Gradual Migration
1. Migrate tab by tab
2. Use iframe or micro-frontend approach during transition
3. Redirect routes incrementally

### Option C: Parallel Run
1. Keep both versions running
2. Add `/new` route for Next.js version
3. Gather feedback before full migration

---

## Current Status (Updated: 2026-03-01)

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Project Setup | ✅ COMPLETED | Next.js 16.1.6, TypeScript 5.7, Tailwind 4, shadcn/ui installed |
| 2. Core Components | ✅ COMPLETED | All UI components migrated to Shadcn/Radix |
| 3. TypeScript Migration | ✅ COMPLETED | All types defined, strict mode enabled |
| 4. API Routes | ✅ COMPLETED | Scanner API integration complete |
| 5. Feature Parity | ✅ COMPLETED | All 7 tabs functional |
| 6. Polish & Deployment | ✅ COMPLETED | Docker, Vercel configs ready |

## Success Criteria

| Criterion | Status | Details |
|-----------|--------|---------|
| All existing functionality works | ✅ PASS | 7/7 tabs functional, all features operational |
| Bundle size < 200KB (gzipped) | ⚠️ PARTIAL | **258KB gzipped** — 29% over target (see Outstanding Work) |
| Lighthouse score > 90 | ⏭️ PENDING | Requires production deployment for accurate measurement |
| All tests passing | ✅ PASS | 13/13 tests passing |
| TypeScript strict mode | ✅ PASS | Zero compilation errors |
| Accessibility audit | ✅ PASS | ARIA labels, keyboard navigation implemented |
| Deployment configs | ✅ PASS | Dockerfile, Vercel config, .env.example ready |

## Outstanding Work

The following items require attention in future sprints:

### 1. Bundle Size Optimization (Priority: Medium)

**Current:** 258KB gzipped (target: <200KB)

**Breakdown:**
- Main framework chunk: ~308KB (uncompressed)
- Scanner integration: ~224KB (uncompressed)
- UI components: ~157KB (uncompressed)

**Optimization opportunities:**
- Implement code splitting for tab components (lazy load non-critical tabs)
- Tree-shake unused Radix UI components
- Evaluate dynamic imports for heavy dependencies
- Consider using Preact in production (40% smaller)

**Effort estimate:** 4-6 hours

### 2. Lighthouse Performance Audit (Priority: Medium)

**Blocked by:** Requires production deployment on actual domain

**Pre-deployment checklist:**
- [ ] Deploy to Vercel or staging environment
- [ ] Run Lighthouse CI against production build
- [ ] Document scores for: Performance, Accessibility, Best Practices, SEO
- [ ] Create optimization tickets for any scores <90

### 3. Legacy index.html Deprecation (Priority: Low)

The original `index.html` (1900+ lines) still exists at repository root. Consider:
- Archiving to `archive/` directory
- Or removing if no longer needed for reference

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scanner compatibility | High | Keep scanner as shared package |
| API route differences | Medium | Create compatibility layer |
| CSS inconsistencies | Low | Use Tailwind theme variables |
| Performance regression | Medium | Profile and optimize |
| Breaking existing workflows | High | Keep old version running |
