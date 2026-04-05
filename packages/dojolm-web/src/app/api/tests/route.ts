/**
 * File: route.ts
 * Purpose: Next.js API route for running test suites
 * Index:
 * - POST handler for running tests (line 19)
 * - Test suite definitions (line 42)
 * - Test execution via spawn (line 85)
 * - Results collection (line 130)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoTestsGet } from '@/lib/demo/mock-api-handlers';
import { spawn } from 'child_process';
import { join } from 'path';

import { apiError } from '@/lib/api-error';
import { checkApiAuth } from '@/lib/api-auth';

/**
 * Test suite configuration
 * Maps test names to their execution scripts
 */
const TEST_SUITES: Record<string, { script: string; timeout: number; required: boolean }> = {
  // Core tests
  regression: {
    script: 'tsx tools/test-regression.ts',
    timeout: 60000,
    required: true,
  },
  'false-positive': {
    script: 'tsx tools/test-fp-check.ts',
    timeout: 60000,
    required: true,
  },
  // EPIC 4 tests
  epic4: {
    script: 'tsx tools/test-epic4.ts',
    timeout: 60000,
    required: false,
  },
  'epic4-s44-s45': {
    script: 'tsx tools/test-epic4-s44-s45.ts',
    timeout: 60000,
    required: false,
  },
  'epic4-s46-s49': {
    script: 'tsx tools/test-epic4-s46-s49.ts',
    timeout: 60000,
    required: false,
  },
  // EPIC 8 tests
  'epic8-session': {
    script: 'tsx tools/test-epic8-session.ts',
    timeout: 60000,
    required: false,
  },
  'epic8-tool-output': {
    script: 'tsx tools/test-epic8-tool-output.ts',
    timeout: 60000,
    required: false,
  },
};

/**
 * Validate test filter parameter
 */
function validateTestFilter(filter?: string | null): { valid: boolean; tests: string[]; error?: string } {
  if (!filter) {
    return { valid: true, tests: Object.keys(TEST_SUITES) };
  }

  const requestedTests = filter.split(',').map(t => t.trim());
  const invalidTests = requestedTests.filter(t => !TEST_SUITES[t]);

  if (invalidTests.length > 0) {
    return {
      valid: false,
      tests: [],
      error: 'Invalid test name(s)'
    };
  }

  return { valid: true, tests: requestedTests };
}

/**
 * Execute a test script and collect results
 */
function executeTest(
  testName: string,
  config: { script: string; timeout: number; required: boolean }
): Promise<{ name: string; status: string; duration: number; output: string; required: boolean }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const [command, ...args] = config.script.split(' ');
    let processTerminated = false;

    const child = spawn(command, args, {
      cwd: join(process.cwd(), '../../packages/bu-tpi'),
      stdio: 'pipe',
      shell: false, // Disable shell to prevent command injection
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      if (!processTerminated) {
        processTerminated = true;
        child.kill('SIGTERM');
        // Fallback to SIGKILL after 5 seconds if SIGTERM doesn't work
        setTimeout(() => {
          if (child.pid) {
            child.kill('SIGKILL');
          }
        }, 5000);
        resolve({
          name: testName,
          status: 'timeout',
          duration: config.timeout,
          output: `Test timed out after ${config.timeout}ms`,
          required: config.required,
        });
      }
    }, config.timeout);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (!processTerminated) {
        processTerminated = true;
        const duration = Date.now() - startTime;
        const output = stdout + stderr;

        resolve({
          name: testName,
          status: code === 0 ? 'pass' : 'fail',
          duration,
          output,
          required: config.required,
        });
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      if (!processTerminated) {
        processTerminated = true;
        const duration = Date.now() - startTime;

        resolve({
          name: testName,
          status: 'error',
          duration,
          output: error.message,
          required: config.required,
        });
      }
    });
  });
}

export async function POST(request: NextRequest) {
  if (isDemoMode()) return demoTestsGet();
  try {
    const authResult = checkApiAuth(request);
    if (authResult) return authResult;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { filter } = body as { filter?: string };

    // Validate test filter
    const validation = validateTestFilter(filter);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Execute tests sequentially (to avoid resource contention)
    const results: Array<{
      name: string;
      status: string;
      duration: number;
      output: string;
      required: boolean;
    }> = [];

    for (const testName of validation.tests) {
      const config = TEST_SUITES[testName];
      const result = await executeTest(testName, config);
      results.push(result);
    }

    // Calculate summary
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail' || r.status === 'error').length,
      skipped: 0,
      duration_ms: results.reduce((sum, r) => sum + r.duration, 0),
    };

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        summary,
        results,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (error) {
    return apiError('Internal server error', 500, error);
  }
}

export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoTestsGet();
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  // Return available test suites
  return NextResponse.json({
    available: Object.keys(TEST_SUITES),
    suites: TEST_SUITES,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
    },
  });
}
