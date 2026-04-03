/**
 * Tests for login rate limiter
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { isLoginRateLimited, recordLoginRateLimitFailure, clearLoginRateLimitFailures, resetLoginRateLimiter } from '../auth/login-rate-limit';

describe('login rate limiter', () => {
  beforeEach(() => {
    resetLoginRateLimiter();
  });

  describe('isLoginRateLimited', () => {
    it('returns false for new keys', () => {
      expect(isLoginRateLimited('test-key')).toBe(false);
    });
    it('returns true after max failures', () => {
      for (let i = 0; i < 10; i++) {
        recordLoginRateLimitFailure('test-key');
      }
      expect(isLoginRateLimited('test-key')).toBe(true);
    });
  });

  describe('recordLoginRateLimitFailure', () => {
    it('returns false when under limit', () => {
      expect(recordLoginRateLimitFailure('key-1')).toBe(false);
    });
    it('returns true when limit reached', () => {
      for (let i = 0; i < 9; i++) {
        recordLoginRateLimitFailure('key-2');
      }
      expect(recordLoginRateLimitFailure('key-2')).toBe(true);
    });
  });

  describe('clearLoginRateLimitFailures', () => {
    it('clears failures for key', () => {
      for (let i = 0; i < 10; i++) {
        recordLoginRateLimitFailure('key-3');
      }
      expect(isLoginRateLimited('key-3')).toBe(true);
      clearLoginRateLimitFailures('key-3');
      expect(isLoginRateLimited('key-3')).toBe(false);
    });
  });
});
