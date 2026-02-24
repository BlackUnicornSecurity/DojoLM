"use strict";
/**
 * File: types.ts
 * Purpose: Core type definitions for the prompt injection scanner engine
 * Index:
 * - Severity & Verdict types (line 15)
 * - Finding interface (line 29)
 * - ScanResult interface (line 41)
 * - Scanner Pattern interfaces (line 58)
 * - Fixture Metadata interfaces (line 84)
 * - Binary Metadata interface (line 108)
 * - PayloadEntry interface (line 137)
 * - CoverageEntry interface (line 149)
 * - Test Suite interfaces (line 162)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEVERITY = void 0;
// ---------------------------------------------------------------------------
// Severity & Verdicts
// ---------------------------------------------------------------------------
exports.SEVERITY = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    CRITICAL: 'CRITICAL',
};
