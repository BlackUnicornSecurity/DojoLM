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
 * Generate a UUID that works in both secure (HTTPS) and insecure (HTTP) contexts.
 * crypto.randomUUID() requires a secure context in most browsers.
 * Falls back to crypto.getRandomValues() which works everywhere.
 */
export function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: use crypto.getRandomValues (works on HTTP)
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 1
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Validate that an href is safe to render in an anchor tag.
 * Blocks javascript:, data:, blob:, vbscript: protocols and protocol-relative URLs.
 * Allows https:, http:, mailto:, relative paths, and hash links.
 */
/**
 * Format a date string or Date to "14 Mar 2026" format.
 * Optionally include time: "14 Mar 2026 · 21:30"
 */
export function formatDate(input: string | Date | number, includeTime = false): string {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return String(input)
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (!includeTime) return date
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

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
