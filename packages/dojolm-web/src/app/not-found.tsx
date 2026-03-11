/**
 * File: not-found.tsx
 * Purpose: Custom 404 page matching dark theme (ERR-001)
 */

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background,#0a0a0a)] flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-7xl font-bold text-[var(--dojo-primary,#CC3A2F)]">404</div>
        <h1 className="text-2xl font-semibold text-[var(--foreground,#fafafa)]">
          Page Not Found
        </h1>
        <p className="text-[var(--text-secondary,#a1a1aa)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--dojo-primary,#CC3A2F)] text-white font-medium hover:opacity-90 motion-safe:transition-opacity"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
