/**
 * File: index.ts
 * Purpose: Main entry point for @dojolm/scanner package
 * Index:
 * - Export types from types.js (line 10)
 * - Export scanner from scanner.js (line 11)
 * - Default export scan function (line 12)
 */

export * from './types.js'
export * from './scanner.js'
export { scan as default } from './scanner.js'
