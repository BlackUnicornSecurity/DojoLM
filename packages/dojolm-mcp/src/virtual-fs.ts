/**
 * @module virtual-fs
 * In-memory virtual filesystem for sandboxed MCP resource access.
 * SME CRIT-03: No real filesystem access allowed.
 */

import type { VirtualFile } from './types.js';

export class VirtualFileSystem {
  private files: Map<string, VirtualFile> = new Map();

  seed(files: VirtualFile[]): void {
    for (const f of files) {
      const normalized = this.normalizePath(f.path);
      this.files.set(normalized, { ...f, path: normalized });
    }
  }

  read(uri: string): VirtualFile | null {
    const path = this.uriToPath(uri);
    if (!path) return null;
    return this.files.get(path) ?? null;
  }

  list(): VirtualFile[] {
    return Array.from(this.files.values());
  }

  has(uri: string): boolean {
    const path = this.uriToPath(uri);
    return path !== null && this.files.has(path);
  }

  /** Returns true if the URI attempts path traversal */
  isTraversalAttempt(uri: string): boolean {
    const decoded = this.decodeUri(uri);
    return (
      decoded.includes('..') ||
      decoded.includes('%2e%2e') ||
      decoded.includes('%2E%2E') ||
      decoded.includes('\0') ||
      decoded.includes('%00') ||
      /^file:\/\/\/(?:etc|proc|sys|dev|var|tmp|root|home)\b/.test(decoded) ||
      /^file:\/\/[^/]/.test(decoded) // UNC-style file://host
    );
  }

  private uriToPath(uri: string): string | null {
    const decoded = this.decodeUri(uri);
    // Only allow file:// URIs within virtual workspace
    if (!decoded.startsWith('file:///workspace/')) return null;
    const path = decoded.slice('file:///workspace'.length);
    const normalized = this.normalizePath(path);
    // Reject if normalization escapes workspace or contains residual traversal
    if (!normalized.startsWith('/') || normalized.includes('..')) return null;
    // Reject system paths that survived normalization
    if (/^\/(etc|proc|sys|dev|var|tmp|root|home)\b/.test(normalized)) return null;
    return normalized;
  }

  private normalizePath(p: string): string {
    const parts = p.split('/').filter(Boolean);
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        resolved.pop(); // silently clamp to root
      } else if (part !== '.') {
        resolved.push(part);
      }
    }
    return '/' + resolved.join('/');
  }

  private decodeUri(uri: string): string {
    try {
      return decodeURIComponent(uri);
    } catch {
      return uri;
    }
  }
}
