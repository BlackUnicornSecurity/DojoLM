import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualFileSystem } from './virtual-fs.js';

describe('VirtualFileSystem', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = new VirtualFileSystem();
    vfs.seed([
      { path: '/readme.md', content: '# Hello', mimeType: 'text/markdown' },
      { path: '/data/config.json', content: '{"key":"value"}', mimeType: 'application/json' },
      { path: '/src/index.ts', content: 'export {}', mimeType: 'text/typescript' },
    ]);
  });

  describe('read', () => {
    it('reads files with valid workspace URIs', () => {
      const file = vfs.read('file:///workspace/readme.md');
      expect(file).not.toBeNull();
      expect(file!.content).toBe('# Hello');
    });

    it('reads nested files', () => {
      const file = vfs.read('file:///workspace/data/config.json');
      expect(file).not.toBeNull();
      expect(file!.mimeType).toBe('application/json');
    });

    it('returns null for non-existent files', () => {
      expect(vfs.read('file:///workspace/missing.txt')).toBeNull();
    });

    it('returns null for non-workspace URIs', () => {
      expect(vfs.read('file:///etc/passwd')).toBeNull();
    });

    it('returns null for URIs without file:// scheme', () => {
      expect(vfs.read('http://example.com')).toBeNull();
    });
  });

  describe('list', () => {
    it('lists all seeded files', () => {
      expect(vfs.list()).toHaveLength(3);
    });
  });

  describe('has', () => {
    it('returns true for existing files', () => {
      expect(vfs.has('file:///workspace/readme.md')).toBe(true);
    });

    it('returns false for missing files', () => {
      expect(vfs.has('file:///workspace/nope.txt')).toBe(false);
    });
  });

  describe('isTraversalAttempt', () => {
    it('detects .. traversal', () => {
      expect(vfs.isTraversalAttempt('file:///workspace/../../../etc/passwd')).toBe(true);
    });

    it('detects encoded traversal', () => {
      expect(vfs.isTraversalAttempt('file:///workspace/%2e%2e/%2e%2e/etc/shadow')).toBe(true);
    });

    it('detects null byte injection', () => {
      expect(vfs.isTraversalAttempt('file:///workspace/file.txt%00.pdf')).toBe(true);
    });

    it('detects absolute system paths', () => {
      expect(vfs.isTraversalAttempt('file:///etc/passwd')).toBe(true);
      expect(vfs.isTraversalAttempt('file:///proc/self/environ')).toBe(true);
    });

    it('allows normal workspace URIs', () => {
      expect(vfs.isTraversalAttempt('file:///workspace/readme.md')).toBe(false);
    });
  });

  describe('path normalization', () => {
    it('normalizes traversal attempts within workspace to root', () => {
      // Traversal is clamped, but since URI prefix check fails first,
      // the read still returns null for paths targeting outside workspace
      const file = vfs.read('file:///workspace/../../../etc/passwd');
      expect(file).toBeNull();
    });
  });
});
