# dojolm-web

DojoLM Web Interface - Next.js application for LLM security testing and red teaming.

## Overview

DojoLM Web is a comprehensive security testing platform for detecting prompt injection attacks in Large Language Models. It provides a 7-tab interface for scanning, testing, and benchmarking LLMs against the CrowdStrike TPI (Tactics, Techniques, and Procedures) taxonomy.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Utility-first styling |
| Radix UI | Latest | Headless UI primitives |
| shadcn/ui | - | Component system |
| Vitest | ^1.6.1 | Unit testing |
| Playwright | ^1.58.2 | E2E testing |

## Prerequisites

- Node.js 20+
- npm 10+
- The `@dojolm/scanner` package must be built first

## Installation

```bash
# From repository root
npm install

# Build the scanner dependency first
cd ../dojolm-scanner && npm run build

# Or from this directory
npm run build:scanner
```

## Environment Variables

Create a `.env.local` file:

```bash
# Node Environment
NODE_ENV=development

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Scanner Configuration
NEXT_PUBLIC_MAX_TEXT_LENGTH=100000

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=false

# Deployment
PORT=3000
```

## Development

```bash
# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Analyze bundle size
npm run analyze
```

## Testing

```bash
# Run unit tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Application Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── scan/          # Text scanning endpoint
│   │   ├── fixtures/      # Fixture management
│   │   └── llm/           # LLM testing APIs
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page (7 tabs)
├── components/
│   ├── llm/               # LLM Dashboard components
│   ├── scanner/           # Scanner UI components
│   ├── fixtures/          # Fixture browser
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── contexts/          # React contexts
│   ├── providers/         # LLM provider adapters
│   ├── api.ts             # API client
│   └── types.ts           # TypeScript types
└── test/
    └── setup.ts           # Vitest configuration
```

## Application Tabs

The main interface provides 7 functional tabs:

| Tab | Description |
|-----|-------------|
| **Live Scanner** | Real-time prompt injection detection with 504+ patterns |
| **Fixtures** | Browse 1,447+ attack fixture files across 30 categories |
| **Test Payloads** | Catalog of attack patterns and payloads |
| **Coverage Map** | TPI story coverage (21/21) and OWASP LLM Top 10 alignment |
| **Pattern Reference** | Complete pattern documentation |
| **Run Tests** | Regression test runner with false-positive detection |
| **LLM Dashboard** | Test LLMs against attack scenarios with 10+ providers |

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | POST | Scan text for injections |
| `/api/fixtures` | GET | List available fixtures |
| `/api/read-fixture` | GET | Read fixture content |
| `/api/scan-fixture` | POST | Scan a fixture file |
| `/api/stats` | GET | Scanner statistics |
| `/api/llm/models` | GET/POST | Manage LLM configurations |
| `/api/llm/execute` | POST | Execute tests against models |
| `/api/llm/results` | GET | Query test results |

## LLM Provider Support

The LLM Dashboard supports 10+ providers:

- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Ollama (local models)
- LM Studio
- llama.cpp
- Google (Gemini)
- Cohere
- ZAI
- Moonshot
- Custom endpoints

## Scanner Dependency

This package depends on `@dojolm/scanner` which must be built first:

```bash
# The build:scanner script handles this
npm run build:scanner
```

The scanner provides:
- 504+ detection patterns across 47 groups
- 15 engine categories for filtering
- TypeScript type definitions

## Docker Deployment

```bash
# Build Docker image
docker build -t dojolm-web .

# Run container
docker run -p 3000:3000 dojolm-web
```

The Dockerfile uses a multi-stage build with:
- Node.js 20 Alpine base
- Non-root user for security
- Standalone Next.js output

## Vercel Deployment

```bash
# Using Vercel CLI
vercel

# Or connect GitHub repo to Vercel
```

## Security Features

- Content Security Policy (CSP) headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Non-root Docker user
- Input validation (100KB limit)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Related Packages

- [@dojolm/scanner](../dojolm-scanner/) - Core scanning engine
- [bu-tpi](../bu-tpi/) - Scanner HTTP API server

## Documentation

- [Platform Guide](../../docs/user/PLATFORM_GUIDE.md) - Complete user documentation
- [Contributing Guide](../../github/CONTRIBUTING.md) - Development guidelines

## License

MIT
