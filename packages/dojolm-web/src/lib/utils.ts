import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Escape HTML to prevent XSS attacks
 */
export function escHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Escape HTML attribute values
 */
export function escAttr(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string | null | undefined, maxLength: number): string {
  if (!str) return ''
  if (str.length <= maxLength) {
    return str
  }
  return str.slice(0, maxLength - 3) + "..."
}

/**
 * Validate that an href is safe to render in an anchor tag.
 * Blocks javascript:, data:, blob:, vbscript: protocols and protocol-relative URLs.
 * Allows https:, http:, mailto:, relative paths, and hash links.
 */
export function isSafeHref(href: string): boolean {
  const trimmed = href.trim()

  // Block protocol-relative URLs (//example.com)
  if (trimmed.startsWith('//')) {
    return false
  }

  try {
    const url = new URL(trimmed, globalThis.location?.href ?? 'https://localhost')
    const protocol = url.protocol.toLowerCase()
    // Only allow safe protocols explicitly
    return protocol === 'https:' || protocol === 'mailto:'
  } catch {
    // For relative paths and hash links only
    return trimmed.startsWith('/') || trimmed.startsWith('#')
  }
}
