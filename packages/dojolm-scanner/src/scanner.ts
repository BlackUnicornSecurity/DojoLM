/**
 * File: scanner.ts
 * Purpose: Re-export proxy — canonical scanner logic lives in bu-tpi/src/scanner.ts
 * S00: Resolved scanner duplication (CRIT-01)
 */
export * from 'bu-tpi/scanner';
export { scan as default } from 'bu-tpi/scanner';
