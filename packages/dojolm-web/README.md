# dojolm-web (NODA Platform)

NODA Platform Web Interface — Next.js application for LLM security testing and red teaming.

## Overview

NODA Platform provides a 15-module interface with unified sidebar navigation for scanning, testing, and benchmarking LLMs against the CrowdStrike TPI taxonomy.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Utility-first styling |
| Radix UI | Latest | Headless UI primitives |
| shadcn/ui | - | Component system |
| Vitest | 4.x | Unit testing |
| Playwright | 1.x | E2E testing |

## Prerequisites

- Node.js 20+
- npm 10+
- `@dojolm/scanner` package built

## Installation

```bash
# From repository root
npm install

# Build scanner dependency
cd ../dojolm-scanner && npm run build
```

## Environment Variables

Create `.env.local`:

```bash
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_MAX_TEXT_LENGTH=100000
NEXT_PUBLIC_ENABLE_ANALYTICS=false
PORT=3000
```

## Module Structure

```
src/
  app/                    # Next.js App Router
    api/                  # API routes
    layout.tsx            # Root layout
    page.tsx              # Dashboard
    style-guide/          # Component library
  components/             # React components
    dashboard/            # Dashboard widgets
    scanner/              # Haiku Scanner
    fixtures/             # Armory
    llm/                  # LLM Dashboard
    jutsu/                # LLM Jutsu
    adversarial/          # Atemi Lab
    strategic/            # Strategic Hub (Arena, Mitsuke)
    attackdna/            # Amaterasu DNA
    compliance/           # Bushido Book
    guard/                # Hattori Guard
    ronin/                # Ronin Hub
    sengoku/              # Sengoku (continuous red teaming)
    time-chamber/         # Time Chamber (temporal attacks)
    kotoba/               # Kotoba (prompt optimizer)
  lib/                    # Utilities, hooks, contexts
    constants.ts          # Navigation, config
    auth/                 # Authentication
    db/                   # Database layer
    storage/              # Storage abstraction
  middleware.ts           # Next.js middleware
```

## Navigation Groups

Modules organized into 4 groups:

| Group | Modules |
|-------|---------|
| **Attack** | Haiku Scanner, Armory, LLM Jutsu, LLM Dashboard |
| **Defense** | Hattori Guard, Bushido Book, Kotoba |
| **Red Team** | Sengoku, Time Chamber, Atemi Lab |
| **Analysis** | The Kumite, Amaterasu DNA, Ronin Hub |

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run type checking
npm run type-check

# Run linting
npm run lint
```

## Testing

| Test Type | Count | Framework |
|-----------|-------|-----------|
| Unit tests | ~2,000 | Vitest |
| Integration | ~500 | Vitest |
| E2E | 50+ | Playwright |

Run tests:
```bash
npm test                    # All tests
npm test -- --watch       # Watch mode
npm run test:e2e          # E2E only
```

## Build Output

```bash
npm run build
```

Outputs to `.next/` directory.

## Related Packages

- [bu-tpi](../bu-tpi/) - Core scanner engine
- [@dojolm/scanner](../dojolm-scanner/) - Web scanner wrapper

## Documentation

- [Platform Guide](../../docs/user/PLATFORM_GUIDE.md)
- [API Reference](../../docs/user/API_REFERENCE.md)

## License

DojoLM Research-Only License — See [LICENSE](../../LICENSE)
