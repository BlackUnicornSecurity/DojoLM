# Next.js 15 App Router Best Practices - Scanner App Implementation Guide

**Research Date:** 2026-02-23
**Target:** Next.js 15.x with App Router
**Use Case:** Scanner App with tab navigation, real-time updates, form handling, and API communication

---

## Table of Contents

1. [App Router File Structure and Conventions](#1-app-router-file-structure-and-conventions)
2. [API Route Creation and Patterns](#2-api-route-creation-and-patterns)
3. [Client vs Server Components](#3-client-vs-server-components)
4. [Data Fetching Patterns](#4-data-fetching-patterns)
5. [State Management Approaches](#5-state-management-approaches)
6. [Provider Patterns for Global State](#6-provider-patterns-for-global-state)
7. [Layout Patterns and Composition](#7-layout-patterns-and-composition)
8. [Scanner App Implementation Guide](#8-scanner-app-implementation-guide)

---

## 1. App Router File Structure and Conventions

### Core Project Structure

```
my-nextjs-app/
├── src/                                    # Optional source directory (recommended)
│   ├── app/                                # Core routing directory (App Router)
│   │   ├── layout.tsx                      # Root layout (all pages share)
│   │   ├── page.tsx                        # Homepage (route: /)
│   │   ├── loading.tsx                     # Global loading state
│   │   ├── error.tsx                       # Global error boundary
│   │   ├── not-found.tsx                   # 404 page
│   │   ├── globals.css                     # Global styles
│   │   │
│   │   ├── api/                            # API routes
│   │   │   ├── scanner/
│   │   │   │   ├── route.ts                # Endpoint: /api/scanner
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts            # Endpoint: /api/scanner/[id]
│   │   │   └── scan-results/
│   │   │       └── route.ts                # Endpoint: /api/scan-results
│   │   │
│   │   ├── scanner/                        # Scanner route (/scanner)
│   │   │   ├── layout.tsx                  # Scanner-specific layout
│   │   │   ├── page.tsx                    # /scanner
│   │   │   ├── loading.tsx                 # Scanner loading state
│   │   │   └── error.tsx                   # Scanner error boundary
│   │   │
│   │   ├── (auth)/                         # Route group (doesn't affect URL)
│   │   │   ├── login/
│   │   │   │   └── page.tsx                # /login
│   │   │   └── register/
│   │   │       └── page.tsx                # /register
│   │   │
│   │   └── dashboard/                      # Nested route (/dashboard)
│   │       ├── layout.tsx                  # Dashboard layout
│   │       ├── page.tsx                    # /dashboard
│   │       └── settings/
│   │           └── page.tsx                # /dashboard/settings
│   │
│   ├── components/                         # Shared components directory
│   │   ├── ui/                             # Reusable UI components
│   │   ├── scanner/                        # Scanner-specific components
│   │   └── providers/                      # Context providers
│   │
│   ├── lib/                                # Utility functions, helpers
│   │   ├── api.ts                          # API client utilities
│   │   ├── utils.ts                        # General utilities
│   │   └── scanner-types.ts                # TypeScript types for scanner
│   │
│   ├── hooks/                              # Custom React hooks
│   │   ├── useScanner.ts                   # Scanner-specific hook
│   │   └── useWebSocket.ts                 # WebSocket hook for real-time
│   │
│   └── actions/                            # Server Actions
│       └── scanner-actions.ts              # Scanner mutations
│
├── public/                                 # Static assets
│   └── images/
│
├── .env.local                              # Environment variables (gitignored)
├── .env.example                            # Environment variables template
├── middleware.ts                           # Middleware (route guards/redirects)
├── next.config.ts                          # Next.js core configuration (TypeScript)
├── package.json                            # Dependencies and scripts
├── tailwind.config.ts                      # Tailwind CSS configuration
└── tsconfig.json                           # TypeScript configuration
```

### Key File Conventions

#### Essential Files

- **`page.tsx`**: Route entry file (required for route to work)
- **`layout.tsx`**: Shared UI component (nav, footer), automatically inherited by nested routes
- **`route.ts`**: API route handler (supports GET/POST/PUT/DELETE methods)

#### Special Files

| File | Purpose | Note |
|------|---------|------|
| `loading.tsx` | Loading state component | Auto-displays on route transitions, supports Suspense |
| `error.tsx` | Error boundary component | Displays when current route errors, doesn't affect global |
| `not-found.tsx` | Custom 404 page | Triggers on 404 responses |
| `template.tsx` | Reusable template component | Re-mounts on navigation (unlike layout) |

#### Route Conventions

**Dynamic Routes:**
```typescript
// app/products/[slug]/page.tsx → /products/laptop-pro
// app/products/[category]/[id]/page.tsx → /products/electronics/123
```

**Catch-all Routes:**
```typescript
// app/shop/[...slug]/page.tsx → matches /shop/a, /shop/a/b, /shop/a/b/c
```

**Route Groups:**
```typescript
// app/(auth)/login/page.tsx → /login (not /(auth)/login)
// Groups organize files without affecting URL structure
```

---

## 2. API Route Creation and Patterns

### App Router API Route Structure

API routes in Next.js 15 use the `app/api/` directory with `route.ts` files:

```typescript
// src/app/api/scanner/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema
const scanSchema = z.object({
  target: z.string().url(),
  scanType: z.enum(['full', 'quick', 'custom']),
  options: z.object({
    timeout: z.number().min(1000).max(30000).optional(),
  }).optional(),
});

// GET: List all scans
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch from database
    const scans = await db.scans.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: scans,
      meta: { limit, offset, total: scans.length },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scans' },
      { status: 500 }
    );
  }
}

// POST: Create new scan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = scanSchema.parse(body);

    // Create scan in database
    const scan = await db.scans.create({
      data: {
        target: validatedData.target,
        scanType: validatedData.scanType,
        options: validatedData.options || {},
        status: 'pending',
        createdAt: new Date(),
      },
    });

    // Trigger async scan process
    await triggerScan(scan.id);

    return NextResponse.json({
      success: true,
      data: scan,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create scan' },
      { status: 500 }
    );
  }
}
```

### Dynamic API Routes with Parameters

```typescript
// src/app/api/scanner/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET: Fetch single scan by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scan = await db.scans.findUnique({
      where: { id: params.id },
    });

    if (!scan) {
      return NextResponse.json(
        { success: false, error: 'Scan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scan,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scan' },
      { status: 500 }
    );
  }
}

// PATCH: Update scan status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, results } = body;

    const scan = await db.scans.update({
      where: { id: params.id },
      data: {
        status: status || undefined,
        results: results || undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: scan,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update scan' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel/delete scan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.scans.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Scan deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete scan' },
      { status: 500 }
    );
  }
}
```

### Critical Pattern: Always Return Response Objects

```typescript
// ✅ CORRECT: Always return NextResponse
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('Processing request');
  return NextResponse.json(
    { message: 'Success' },
    { status: 200 }
  );
}

// ❌ WRONG: No return value → causes TypeError
export async function POST(request: Request) {
  console.log('Processing request');
  // Missing return statement causes runtime error
}

// ❌ WRONG: Returning plain object
export async function POST(request: Request) {
  return { message: 'Hello' }; // Type incompatible
}
```

### Middleware Pattern for Authentication

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Protected routes
  const protectedPaths = ['/scanner', '/dashboard'];
  const isProtectedRoute = protectedPaths.some(path =>
    pathname.startsWith(path)
  );

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/scanner/:path*', '/dashboard/:path*'],
};
```

### Edge Runtime Support

```typescript
// src/app/api/fast-check/route.ts
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'operational',
    timestamp: Date.now(),
  });
}
```

### Key Differences: App Router vs Pages Router

| Feature | Pages Router | App Router (Next.js 15) |
|---------|-------------|-------------------------|
| API Directory | `pages/api/` | `app/api/` |
| File Naming | `[name].js` | `route.ts` (required) |
| Request Handler | `export default function handler(req, res)` | Named exports (`GET`, `POST`, etc.) |
| Response | `res.json()` | `return Response.json()` |
| Return Value | Optional | **Required** (Response object) |

---

## 3. Client vs Server Components

### Core Principles

#### 1. Default to Server Components

- All components in the `app/` directory are **Server Components by default**
- Server Components don't send JavaScript to the browser - only HTML
- They have **zero client bundle size** and enable **automatic code splitting**
- Perfect for data fetching, static content, and SEO optimization

#### 2. Push Client Components to the Leaves

**Most Critical Best Practice:** Move Client Components to the leaves of your component tree. Only mark the smallest possible parts that need interactivity with `'use client'`.

**Example - Wrong Approach:**
```typescript
"use client"  // ❌ Bad: Makes entire page client-side
export default function ScannerPage() {
  const [scans, setScans] = useState([]);

  return (
    <div>
      <h1>Security Scanner</h1>
      <p>Welcome to the security scanner tool...</p>
      <ScanList scans={scans} />
      <StartScanButton />
    </div>
  );
}
```

**Example - Correct Approach:**
```typescript
// ✅ Server Component (default)
export default async function ScannerPage() {
  const scans = await getRecentScans();

  return (
    <div>
      <h1>Security Scanner</h1>
      <p>Welcome to the security scanner tool...</p>
      <ScanList scans={scans} />
      <StartScanButton />  {/* Only the button is client-side */}
    </div>
  );
}

// components/StartScanButton.tsx
"use client"
export default function StartScanButton() {
  const [isScanning, setIsScanning] = useState(false);
  // ... interactive logic
}
```

### When to Use Each Type

#### Use Server Components for:

- Static content and layouts
- Data fetching (direct database access)
- Complex computations (regex, Markdown to HTML)
- Route navigation (`next/link` works perfectly)
- SEO-critical content
- Keeping sensitive data secure (tokens, API keys)

#### Use Client Components for:

- Interactive state (`useState`, `useReducer`, `useOptimistic`)
- Browser APIs (`window`, `document`, localStorage)
- Event handlers (`onClick`, `onChange`)
- React hooks (`useEffect`, `useContext`)
- Forms and animations
- Real-time data updates (WebSocket listeners)

### Three Key Questions to Ask

Before adding `'use client'`, ask yourself:

1. **Does it need interactive state?**
   - If you need `useState`, `useReducer`, or `useOptimistic` → Client Component

2. **Does it need browser APIs?**
   - If you need `window`, `document`, event listeners → Client Component

3. **Does it use React hooks?**
   - If you need `useEffect`, `useContext` → Client Component

### Nested Composition Pattern

**Important rule:** Server Components can contain Client Components, but **Client Components cannot directly import Server Components**.

However, you can use the **children prop pattern** to nest Server Components inside Client Components:

```typescript
// Server Component
export default function ScannerLayout() {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <ScannerOverview />  {/* Server Component */}
      </TabsContent>
      <TabsContent value="results">
        <ScannerResults />  {/* Server Component */}
      </TabsContent>
    </Tabs>
  );
}

// Client Component
"use client"
export function Tabs({ children, defaultValue }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div>
      {/* Tab controls */}
      <div className="flex gap-2">
        {/* Render children with active tab */}
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            // Show/hide based on active tab
            return child.props.value === activeTab ? child : null;
          }
        })}
      </div>
    </div>
  );
}
```

### Data Transfer Rules

- **Server → Client:** Only serializable data (primitives, plain objects, arrays)
- **Avoid passing:** Functions, class instances, complex objects
- **Use props or children** to pass data between component types

### Performance Optimization Formula

- **Server Component → Data Fetching**
- **Client Component → State Management**

This separation minimizes JavaScript bundle size while maintaining interactivity where needed.

### Common Mistakes to Avoid

1. ❌ Adding `'use client'` at the top of large pages
2. ❌ Using client hooks in Server Components
3. ❌ Performing heavy computations on the client
4. ❌ Fragmenting components too aggressively (increases maintenance)
5. ❌ Passing non-serializable data from Server to Client Components

---

## 4. Data Fetching Patterns

### Key Changes in Next.js 15

1. **Async API Changes:** `cookies()`, `headers()`, `params()`, and `searchParams` are now asynchronous (must use `await`)
2. **No Caching by Default:** Fetch requests without explicit cache settings will revalidate on every request by default

### Server Component Data Fetching Patterns

#### Pattern 1: Direct Fetch with Async/Await (Recommended)

```typescript
// app/scanner/page.tsx
export default async function ScannerPage() {
  const data = await fetch('https://api.vercel.app/scanner', {
    cache: 'no-store',  // Disable caching for real-time data
  });
  const scans = await data.json();

  return (
    <ul>
      {scans.map((scan) => (
        <li key={scan.id}>{scan.target}</li>
      ))}
    </ul>
  );
}
```

#### Pattern 2: Direct ORM/Database Queries

```typescript
// app/scanner/page.tsx
import { db, scans } from '@/lib/db';

export default async function ScannerPage() {
  const allScans = await db.select().from(scans);

  return (
    <ul>
      {allScans.map((scan) => (
        <li key={scan.id}>{scan.target}</li>
      ))}
    </ul>
  );
}
```

#### Pattern 3: Async Cookies/Headers with Parallel Data Fetching

```typescript
// app/admin/page.tsx
import { cookies } from 'next/headers';

export async function AdminPanel() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) {
    return <div>Please login</div>;
  }

  return <div>Admin Console: {token}</div>;
}
```

### Best Practices

1. **No Waterfalls:** Avoid sequential data fetching. Use `Promise.all()` or parallel Server Components
2. **Server-First:** Fetch data in Server Components, NOT in `useEffect`
3. **Component-Level Fetching:** Let individual components handle their own data fetching
4. **Strict Separation:**
   - Server Components → Data Fetching
   - Client Components → State Management

### Streaming with Suspense

```typescript
import { Suspense } from 'react';

async function ScanList() {
  const scans = await getScans({ limit: 10 });

  return (
    <div className="grid gap-6">
      {scans.map((scan) => (
        <ScanCard key={scan.id} scan={scan} />
      ))}
    </div>
  );
}

export default function ScannerPage() {
  return (
    <main>
      <h1>Security Scanner</h1>
      <Suspense fallback={<ScanListSkeleton />}>
        <ScanList />
      </Suspense>
    </main>
  );
}
```

### Parallel Data Fetching Pattern

```typescript
// ❌ Sequential (Waterfall)
export default async function Page() {
  const user = await getUser();  // Wait for this
  const scans = await getScans(user.id);  // Then wait for this
  return <Dashboard user={user} scans={scans} />;
}

// ✅ Parallel (Optimal)
export default async function Page() {
  const [user, scans] = await Promise.all([
    getUser(),
    getScans(),
  ]);
  return <Dashboard user={user} scans={scans} />;
}
```

### Real-Time Data Fetching Options

#### Option 1: Client-Side Polling (SWR/TanStack Query)

```typescript
'use client'
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function ScanStatus({ scanId }: { scanId: string }) {
  const { data, error, isLoading } = useSWR(
    `/api/scanner/${scanId}`,
    fetcher,
    {
      refreshInterval: 2000,  // Poll every 2 seconds
      revalidateOnFocus: true,
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading scan</div>;

  return <div>Status: {data.status}</div>;
}
```

#### Option 2: WebSockets (True Real-Time)

```typescript
// hooks/useWebSocket.ts
'use client'
import { useEffect, useState } from 'react';

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [data, setData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };

    setSocket(ws);

    return () => ws.close();
  }, [url]);

  return { socket, data, isConnected };
}

// Usage in component
'use client'
import { useWebSocket } from '@/hooks/useWebSocket';

export function LiveScanUpdates({ scanId }: { scanId: string }) {
  const { data, isConnected } = useWebSocket(
    `wss://your-api.com/scanner/${scanId}/live`
  );

  return (
    <div>
      <div>Connection: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {data && <div>Latest update: {JSON.stringify(data)}</div>}
    </div>
  );
}
```

#### Option 3: Server-Sent Events (SSE)

```typescript
// app/api/scanner/[id]/stream/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Send initial status
      sendEvent({ type: 'connected', scanId: params.id });

      // Poll for updates
      const interval = setInterval(async () => {
        const scan = await db.scans.findUnique({
          where: { id: params.id },
        });

        sendEvent({ type: 'update', data: scan });

        // Stop if scan is complete
        if (scan?.status === 'completed') {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Client component
'use client'
import { useEffect, useState } from 'react';

export function ScanProgress({ scanId }: { scanId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/scanner/${scanId}/stream`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update') {
        setProgress(data.data.progress || 0);
      }
    };

    return () => eventSource.close();
  }, [scanId]);

  return <div>Progress: {progress}%</div>;
}
```

---

## 5. State Management Approaches

### Server Component State (Default)

```typescript
// app/scanner/page.tsx - Default is Server Component
import { Suspense } from 'react';
import { getScans } from '@/lib/scanner';

async function ScanList() {
  const scans = await getScans({ limit: 10 });

  return (
    <div className="grid gap-6">
      {scans.map((scan) => (
        <ScanCard key={scan.id} scan={scan} />
      ))}
    </div>
  );
}

export default function ScannerPage() {
  return (
    <main>
      <h1>Security Scanner</h1>
      <Suspense fallback={<ScanListSkeleton />}>
        <ScanList />
      </Suspense>
    </main>
  );
}
```

### Client Component State

```typescript
// components/ScannerControls.tsx
'use client';
import { useState, useOptimistic } from 'react';

type ScanStatus = 'idle' | 'scanning' | 'completed' | 'error';

export function ScannerControls() {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [optimisticScans, addOptimisticScan] = useOptimistic(
    [],
    (state, newScan) => [...state, newScan]
  );

  const startScan = async (target: string) => {
    setStatus('scanning');
    // Add optimistic update
    addOptimisticScan({
      id: `temp-${Date.now()}`,
      target,
      status: 'pending',
    });

    try {
      const response = await fetch('/api/scanner', {
        method: 'POST',
        body: JSON.stringify({ target }),
      });

      const result = await response.json();
      setStatus('completed');
      return result;
    } catch (error) {
      setStatus('error');
      throw error;
    }
  };

  return (
    <div>
      <button onClick={() => startScan('example.com')}>
        Start Scan
      </button>
      <div>Status: {status}</div>
    </div>
  );
}
```

### State Management Options

#### Option 1: React Context (Best for Global State)

```typescript
// contexts/ScannerContext.tsx
'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type Scan = {
  id: string;
  target: string;
  status: string;
  results?: any;
};

type ScannerContextType = {
  scans: Scan[];
  activeScanId: string | null;
  setActiveScanId: (id: string | null) => void;
  addScan: (scan: Scan) => void;
  updateScan: (id: string, updates: Partial<Scan>) => void;
};

const ScannerContext = createContext<ScannerContextType | null>(null);

export function ScannerProvider({ children }: { children: ReactNode }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);

  const addScan = (scan: Scan) => {
    setScans((prev) => [...prev, scan]);
  };

  const updateScan = (id: string, updates: Partial<Scan>) => {
    setScans((prev) =>
      prev.map((scan) => (scan.id === id ? { ...scan, ...updates } : scan))
    );
  };

  return (
    <ScannerContext.Provider
      value={{ scans, activeScanId, setActiveScanId, addScan, updateScan }}
    >
      {children}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (!context) {
    throw new Error('useScanner must be used within ScannerProvider');
  }
  return context;
}
```

#### Option 2: Zustand (Lightweight Global State)

```typescript
// lib/scanner-store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type Scan = {
  id: string;
  target: string;
  status: string;
  results?: any;
};

type ScannerStore = {
  scans: Scan[];
  activeScanId: string | null;
  addScan: (scan: Scan) => void;
  updateScan: (id: string, updates: Partial<Scan>) => void;
  setActiveScanId: (id: string | null) => void;
  clearScans: () => void;
};

export const useScannerStore = create<ScannerStore>()(
  devtools(
    persist(
      (set) => ({
        scans: [],
        activeScanId: null,
        addScan: (scan) =>
          set((state) => ({ scans: [...state.scans, scan] })),
        updateScan: (id, updates) =>
          set((state) => ({
            scans: state.scans.map((scan) =>
              scan.id === id ? { ...scan, ...updates } : scan
            ),
          })),
        setActiveScanId: (id) => set({ activeScanId: id }),
        clearScans: () => set({ scans: [], activeScanId: null }),
      }),
      { name: 'scanner-storage' }
    )
  )
);

// Provider for SSR compatibility
// providers/scanner-store-provider.tsx
'use client';
import { type ReactNode, useRef } from 'react';
import { useScannerStore } from '@/lib/scanner-store';

export function ScannerStoreProvider({ children }: { children: ReactNode }) {
  const storeInitialized = useRef(false);

  if (!storeInitialized.current) {
    useScannerStore.getState().clearScans();
    storeInitialized.current = true;
  }

  return <>{children}</>;
}
```

#### Option 3: TanStack Query (Server State)

```typescript
// hooks/useScans.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const scanSchema = z.object({
  target: z.string().url(),
  scanType: z.enum(['full', 'quick', 'custom']),
});

export function useScans() {
  return useQuery({
    queryKey: ['scans'],
    queryFn: async () => {
      const response = await fetch('/api/scanner');
      if (!response.ok) throw new Error('Failed to fetch scans');
      return response.json();
    },
    refetchInterval: 5000,  // Poll every 5 seconds
  });
}

export function useCreateScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof scanSchema>) => {
      const response = await fetch('/api/scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create scan');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
    },
  });
}

export function useScan(id: string) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: async () => {
      const response = await fetch(`/api/scanner/${id}`);
      if (!response.ok) throw new Error('Failed to fetch scan');
      return response.json();
    },
    enabled: !!id,
    refetchInterval: (data) => {
      // Stop polling when scan is complete
      return data?.state?.status === 'completed' ? false : 2000;
    },
  });
}
```

### State Management Decision Matrix

| Use Case | Recommended Approach | Example |
|----------|---------------------|---------|
| Form input state | `useState` (Client Component) | Scanner form fields |
| Global UI state | React Context | Theme, language |
| Complex client state | Zustand | Scan history, preferences |
| Server data | TanStack Query / SWR | Scan results, user data |
| URL-based state | `searchParams` | Active tab, filters |
| Optimistic updates | `useOptimistic` | Adding new scans |

---

## 6. Provider Patterns for Global State

### Critical Rule: Context in Client Components Only

**❌ Don't do this - Context not supported in Server Components:**

```typescript
// app/layout.tsx
import { createContext } from 'react';

export const ThemeContext = createContext({});

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeContext.Provider value="dark">
          {children}
        </ThemeContext.Provider>
      </body>
    </html>
  );
}
```

**✅ Do this - Create Context in a Client Component:**

```typescript
// components/providers/theme-provider.tsx
'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### Root Layout with Providers

```typescript
// app/layout.tsx
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ScannerProvider } from '@/components/providers/scanner-provider';
import { ToasterProvider } from '@/components/providers/toaster-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ScannerProvider>
            <ToasterProvider>
              {/* Providers are Client Components, but children can still be Server Components! */}
              <Header /> {/* Server Component */}
              <main>{children}</main> {/* Server or Client Component */}
              <Footer /> {/* Server Component */}
            </ToasterProvider>
          </ScannerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Key Insight: Server/Client Component Interleaving

Client Component Providers can render Server Component children. This is called "Server/Client Component Interleaving" and is the foundation of provider patterns in Next.js 15.

### Performance Optimization: Render Providers Deep

**Important:** Render providers as deep as possible in the tree. Wrap only `{children}` instead of the entire `<html>` document. This helps Next.js optimize static parts of Server Components.

```typescript
// ❌ Bad: Wrapping entire HTML
<ThemeProvider>
  <html>
    <body>
      {children}
    </body>
  </html>
</ThemeProvider>

// ✅ Good: Wrapping only children
<html>
  <body>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </body>
</html>
```

### Advanced Pattern: Using `use()` Hook with Promises

```typescript
// app/user-provider.tsx
'use client';
import { createContext, useContext, use, ReactNode } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
};

const UserContext = createContext<Promise<User> | null>(null);

export function UserProvider({
  children,
  userPromise,
}: {
  children: ReactNode;
  userPromise: Promise<User>;
}) {
  return (
    <UserContext.Provider value={userPromise}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  // Use React's use() hook to unwrap the promise
  return use(context);
}

// app/layout.tsx
import { UserProvider } from './user-provider';
import { getUser } from './lib/user';

export default function RootLayout({ children }: { children: ReactNode }) {
  const userPromise = getUser(); // Note: don't await!

  return (
    <html lang="en">
      <body>
        <UserProvider userPromise={userPromise}>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}

// app/profile/page.tsx
'use client';
import { useUser } from '../user-provider';

export default function ProfilePage() {
  const user = useUser(); // Unwraps the promise

  return <div>Welcome, {user.name}!</div>;
}
```

### Split Context by Domain

Avoid unnecessary re-renders by splitting context by domain:

```typescript
// ❌ Bad: One large context
const AppContext = createContext();
// All consumers re-render on any state change

// ✅ Good: Split into separate contexts
// contexts/UserContext.tsx
// contexts/ScannerContext.tsx
// contexts/ThemeContext.tsx
// contexts/NotificationContext.tsx
```

### Complete Provider Setup Example

```typescript
// components/providers/index.tsx
'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { ScannerProvider } from './scanner-provider';
import { QueryProvider } from './query-provider';
import { ToastProvider } from './toast-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ScannerProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ScannerProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

// app/layout.tsx
import { Providers } from '@/components/providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## 7. Layout Patterns and Composition

### Nested Layout Architecture

App Router uses a **nested layout system** where each folder can have its own `layout.tsx`. Child layouts automatically inherit from parent layouts.

**Layout Hierarchy:**
```
app/
├── layout.tsx          # Root layout (global - nav, footer)
├── page.tsx            # Home page
└── scanner/            # Route group
    ├── layout.tsx      # Scanner layout (sidebar, breadcrumbs)
    ├── page.tsx        # /scanner
    └── [id]/           # Dynamic route
        ├── layout.tsx  # Scan-specific layout
        └── page.tsx    # /scanner/[id]
```

### Root Layout Pattern

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Security Scanner',
  description: 'Advanced security scanning tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <nav className="navbar">
            {/* Global navigation */}
          </nav>
          <main className="container">
            {children}
          </main>
          <footer className="footer">
            {/* Global footer */}
          </footer>
        </Providers>
      </body>
    </html>
  );
}
```

### Section-Specific Layout

```typescript
// app/scanner/layout.tsx
import { ScannerNav } from '@/components/scanner/scanner-nav';

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r">
        <ScannerNav />
      </aside>
      <div className="flex-1 overflow-auto">
        <div className="scanner-header">
          <h1>Security Scanner</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
```

### Layout State Preservation

**Key Feature:** State only resets when navigating to different layout levels. State is preserved when navigating between pages that share the same layout.

```typescript
// app/scanner/layout.tsx
'use client';
import { useState } from 'react';

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [filter, setFilter] = useState('all');

  return (
    <div>
      <div className="filter-bar">
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('active')}>Active</button>
        <button onClick={() => setFilter('completed')}>Completed</button>
      </div>
      {/* Filter state is preserved when navigating between /scanner/page1 and /scanner/page2 */}
      {children}
    </div>
  );
}
```

### Parallel Routes (Advanced Pattern)

```typescript
// app/scanner/layout.tsx
export default function ScannerLayout({
  children,
  analytics,
  details,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  details: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">{children}</div>
      <div className="sidebar">
        <div className="analytics">{analytics}</div>
        <div className="details">{details}</div>
      </div>
    </div>
  );
}

// File structure:
// app/scanner/layout.tsx
// app/scanner/@analytics/page.tsx
// app/scanner/@details/page.tsx
// app/scanner/page.tsx
```

### Template Pattern (Re-mounts on Navigation)

```typescript
// app/scanner/template.tsx
import { useEffect } from 'react';

export default function ScannerTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    console.log('Scanner page mounted');
    return () => {
      console.log('Scanner page unmounted');
    };
  }, []);

  return (
    <div className="scanner-container">
      {children}
    </div>
  );
}
```

**Key Difference: Layout vs Template**

| Feature | Layout | Template |
|---------|--------|----------|
| State | Preserved during navigation | Resets on navigation |
| Re-render | No | Yes |
| Use case | Shared UI (nav, sidebar) | Features that need reset (forms, animations) |

### Loading and Error States

```typescript
// app/scanner/loading.tsx
export default function ScannerLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </div>
  );
}

// app/scanner/error.tsx
'use client';
import { useEffect } from 'react';

export default function ScannerError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Scanner error:', error);
  }, [error]);

  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Conditional Layouts with Route Groups

```typescript
// app/(auth)/layout.tsx - Protected routes
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <div className="authenticated-layout">
      <Header />
      {children}
    </div>
  );
}

// app/(public)/layout.tsx - Public routes
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-layout">
      {children}
    </div>
  );
}
```

---

## 8. Scanner App Implementation Guide

### Complete Scanner App Architecture

```
scanner-app/
├── app/
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Dashboard/landing
│   │
│   ├── scanner/
│   │   ├── layout.tsx                # Scanner layout with sidebar
│   │   ├── page.tsx                  # Scanner dashboard
│   │   ├── loading.tsx               # Loading skeleton
│   │   ├── error.tsx                 # Error boundary
│   │   │
│   │   └── [id]/
│   │       ├── page.tsx              # Individual scan details
│   │       ├── loading.tsx
│   │       └── error.tsx
│   │
│   └── api/
│       └── scanner/
│           ├── route.ts              # GET (list), POST (create)
│           └── [id]/
│               ├── route.ts          # GET, PATCH, DELETE
│               └── stream/
│                   └── route.ts      # SSE stream for real-time updates
│
├── components/
│   ├── scanner/
│   │   ├── scanner-form.tsx          # New scan form (client)
│   │   ├── scan-card.tsx             # Scan result card (server)
│   │   ├── scan-progress.tsx         # Real-time progress (client)
│   │   ├── scan-results.tsx          # Results display (server/client)
│   │   └── scanner-nav.tsx           # Sidebar navigation (client)
│   │
│   └── providers/
│       ├── scanner-provider.tsx      # Scanner context
│       └── query-provider.tsx        # TanStack Query provider
│
├── hooks/
│   ├── use-scanner.ts                # Scanner state hook
│   ├── use-scan-progress.ts          # Real-time progress hook
│   └── use-websocket.ts              # WebSocket hook
│
├── lib/
│   ├── scanner-types.ts              # TypeScript types
│   ├── scanner-utils.ts              # Utility functions
│   └── api.ts                        # API client
│
└── actions/
    └── scanner-actions.ts            # Server Actions
```

### Implementation: Root Layout with Tab Navigation

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Security Scanner',
  description: 'Advanced security scanning tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <div className="min-h-screen bg-background">
            <nav className="border-b">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold">Security Scanner</h1>
                  <div className="flex gap-4">
                    <a href="/scanner" className="hover:underline">
                      Scanner
                    </a>
                    <a href="/dashboard" className="hover:underline">
                      Dashboard
                    </a>
                  </div>
                </div>
              </div>
            </nav>
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
```

### Implementation: Scanner Page with Tab Navigation

```typescript
// app/scanner/page.tsx
import { Suspense } from 'react';
import { ScannerTabs } from '@/components/scanner/scanner-tabs';
import { NewScanForm } from '@/components/scanner/new-scan-form';
import { ScanList } from '@/components/scanner/scan-list';
import { ScannerStats } from '@/components/scanner/scanner-stats';

export default function ScannerPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const activeTab = searchParams.tab || 'overview';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Scanner</h1>
        <p className="text-muted-foreground">
          Run security scans and monitor results in real-time
        </p>
      </div>

      <ScannerTabs defaultValue={activeTab} />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Suspense fallback={<ScannerStatsSkeleton />}>
            <ScannerStats />
          </Suspense>
          <NewScanForm />
        </div>
      )}

      {activeTab === 'scans' && (
        <Suspense fallback={<ScanListSkeleton />}>
          <ScanList />
        </Suspense>
      )}

      {activeTab === 'results' && (
        <Suspense fallback={<div>Loading results...</div>}>
          <ScanResults />
        </Suspense>
      )}
    </div>
  );
}
```

### Implementation: Tab Navigation Component (Client)

```typescript
// components/scanner/scanner-tabs.tsx
'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { tabs } from './tabs-config';

export function ScannerTabs({ defaultValue }: { defaultValue: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || defaultValue;

  const setActiveTab = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="border-b">
      <div className="flex gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// components/scanner/tabs-config.ts
export const tabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'scans', label: 'Active Scans' },
  { value: 'results', label: 'Results' },
];
```

### Implementation: Scan Form with Server Actions

```typescript
// components/scanner/new-scan-form.tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createScan } from '@/actions/scanner-actions';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
    >
      {pending ? 'Starting scan...' : 'Start Scan'}
    </button>
  );
}

export function NewScanForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await createScan(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.scanId) {
        router.push(`/scanner/${result.scanId}`);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 p-6 border rounded-lg">
      <h2 className="text-xl font-semibold">Start New Scan</h2>

      <div className="space-y-2">
        <label htmlFor="target" className="block text-sm font-medium">
          Target URL
        </label>
        <input
          type="url"
          id="target"
          name="target"
          required
          placeholder="https://example.com"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="scanType" className="block text-sm font-medium">
          Scan Type
        </label>
        <select
          id="scanType"
          name="scanType"
          className="w-full px-3 py-2 border rounded"
        >
          <option value="quick">Quick Scan</option>
          <option value="full">Full Scan</option>
          <option value="custom">Custom Scan</option>
        </select>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded">
          {error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
```

### Implementation: Server Action

```typescript
// actions/scanner-actions.ts
'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

const scanSchema = z.object({
  target: z.string().url('Invalid URL format'),
  scanType: z.enum(['quick', 'full', 'custom']),
});

export async function createScan(formData: FormData) {
  const rawData = {
    target: formData.get('target'),
    scanType: formData.get('scanType'),
  };

  const validation = scanSchema.safeParse(rawData);

  if (!validation.success) {
    return {
      error: validation.error.errors[0].message,
    };
  }

  const { target, scanType } = validation.data;

  try {
    const scan = await db.scan.create({
      data: {
        target,
        scanType,
        status: 'pending',
        createdAt: new Date(),
      },
    });

    // Trigger async scan process
    await triggerScanProcess(scan.id);

    return {
      success: true,
      scanId: scan.id,
    };
  } catch (error) {
    return {
      error: 'Failed to create scan. Please try again.',
    };
  }
}

async function triggerScanProcess(scanId: string) {
  // This would trigger your actual scanning logic
  // Could be a background job, queue, or external service
  console.log(`Starting scan process for ${scanId}`);
}
```

### Implementation: Real-Time Progress with SSE

```typescript
// components/scanner/scan-progress.tsx
'use client';
import { useEffect, useState } from 'react';
import { ScanProgress } from '@/components/scanner/scan-progress-bar';

export function ScanProgressLive({ scanId }: { scanId: string }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/scanner/${scanId}/stream`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'update') {
        setProgress(data.data.progress || 0);
        setStatus(data.data.status);
      }

      if (data.type === 'complete') {
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [scanId]);

  return <ScanProgress progress={progress} status={status} />;
}

// components/scanner/scan-progress-bar.tsx
export function ScanProgress({
  progress,
  status,
}: {
  progress: number;
  status: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">Scan Progress</span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        Status: {status}
      </div>
    </div>
  );
}
```

### Implementation: API Route with SSE

```typescript
// app/api/scanner/[id]/stream/route.ts
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Send initial connection
      sendEvent({
        type: 'connected',
        scanId: params.id,
      });

      let progress = 0;
      const interval = setInterval(async () => {
        // Fetch current scan status
        const scan = await db.scan.findUnique({
          where: { id: params.id },
        });

        if (!scan) {
          clearInterval(interval);
          controller.close();
          return;
        }

        // Send update
        sendEvent({
          type: 'update',
          data: {
            progress: scan.progress,
            status: scan.status,
          },
        });

        // Check if complete
        if (scan.status === 'completed' || scan.status === 'failed') {
          sendEvent({
            type: 'complete',
            data: scan,
          });
          clearInterval(interval);
          controller.close();
        }

        progress += 10;
      }, 1000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}
```

### Implementation: Scan List with Server Component

```typescript
// components/scanner/scan-list.tsx
import { getScans } from '@/lib/scanner-utils';
import { ScanCard } from './scan-card';

export async function ScanList() {
  const scans = await getScans({ limit: 20 });

  if (scans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No scans yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {scans.map((scan) => (
        <ScanCard key={scan.id} scan={scan} />
      ))}
    </div>
  );
}

// components/scanner/scan-card.tsx
import Link from 'next/link';

export function ScanCard({ scan }: { scan: any }) {
  return (
    <Link href={`/scanner/${scan.id}`}>
      <div className="p-6 border rounded-lg hover:border-primary transition-colors">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold truncate">{scan.target}</h3>
          <span className={`px-2 py-1 text-xs rounded ${
            scan.status === 'completed' ? 'bg-green-100 text-green-800' :
            scan.status === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {scan.status}
          </span>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Type: {scan.scanType}</p>
          <p>Created: {new Date(scan.createdAt).toLocaleString()}</p>
        </div>
      </div>
    </Link>
  );
}
```

### Implementation: Individual Scan Page

```typescript
// app/scanner/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getScan } from '@/lib/scanner-utils';
import { ScanProgressLive } from '@/components/scanner/scan-progress-live';
import { ScanResults } from '@/components/scanner/scan-results';

export default async function ScanPage({
  params,
}: {
  params: { id: string };
}) {
  const scan = await getScan(params.id);

  if (!scan) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{scan.target}</h1>
        <p className="text-muted-foreground">
          Scan ID: {scan.id} • Started {new Date(scan.createdAt).toLocaleString()}
        </p>
      </div>

      {(scan.status === 'pending' || scan.status === 'running') && (
        <ScanProgressLive scanId={scan.id} />
      )}

      {scan.status === 'completed' && (
        <ScanResults results={scan.results} />
      )}

      {scan.status === 'failed' && (
        <div className="p-4 bg-destructive/10 text-destructive rounded">
          Scan failed. Please try again.
        </div>
      )}
    </div>
  );
}
```

### Implementation: TypeScript Types

```typescript
// lib/scanner-types.ts
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ScanType = 'quick' | 'full' | 'custom';

export interface Scan {
  id: string;
  target: string;
  scanType: ScanType;
  status: ScanStatus;
  progress: number;
  results: ScanResults | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanResults {
  vulnerabilities: Vulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location: string;
  remediation: string;
}
```

---

## Summary: Key Takeaways for Next.js 15 Scanner App

### Architecture Principles

1. **Server Components by Default:** Use Server Components for data fetching, static content, and SEO
2. **Client Components at Leaves:** Only mark interactive parts with `'use client'`
3. **Providers in Root Layout:** Wrap children, not entire HTML document
4. **Server Actions for Forms:** Use Server Actions instead of fetch for mutations
5. **Parallel Data Fetching:** Avoid waterfalls with `Promise.all()`

### Performance Optimizations

1. **Streaming with Suspense:** Use `<Suspense>` for progressive rendering
2. **No Caching by Default:** Next.js 15 fetches fresh data automatically
3. **Edge Runtime:** Use for performance-critical API routes
4. **State Preservation:** Layouts preserve state during navigation
5. **Component-Level Fetching:** Let components fetch their own data

### Real-Time Data Options

| Approach | Best For | Complexity |
|----------|----------|------------|
| **SSE** | One-way server updates | Low |
| **Polling** (SWR/TanStack) | Periodic updates | Low |
| **WebSockets** | Bidirectional real-time | Medium |

### State Management Decision Tree

```
Need state?
├─ Form input → useState (Client Component)
├─ Global UI → React Context
├─ Server data → TanStack Query / SWR
├─ Complex client state → Zustand
└─ URL-based → searchParams
```

### File Structure Checklist

```
✅ app/layout.tsx - Root layout with providers
✅ app/scanner/layout.tsx - Scanner-specific layout
✅ app/scanner/page.tsx - Scanner dashboard
✅ app/scanner/[id]/page.tsx - Individual scan
✅ app/api/scanner/route.ts - API endpoints
✅ components/providers/* - Context providers
✅ components/scanner/* - Scanner components
✅ hooks/use-*.ts - Custom hooks
✅ lib/* - Utilities and types
✅ actions/*.ts - Server Actions
```

---

**Research completed:** 2026-02-23
**Sources:** Web searches for Next.js 15 App Router best practices, official Next.js documentation, and community patterns
