/**
 * KATANA CLI — Tests
 *
 * Covers argument parsing, command dispatch, option validation, and help formatting.
 */

import { describe, it, expect } from 'vitest';
import {
  parseArgs,
  runCLI,
  formatHelp,
  CLI_COMMANDS,
  EXIT_CODES,
} from '../cli/katana-cli.js';

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

describe('parseArgs', () => {
  it('extracts the command from the first positional arg', () => {
    const result = parseArgs(['validate']);
    expect(result.command).toBe('validate');
    expect(Object.keys(result.options)).toHaveLength(0);
  });

  it('parses --key=value syntax', () => {
    const result = parseArgs(['report', '--run-id=abc-123', '--format=json']);
    expect(result.command).toBe('report');
    expect(result.options['run-id']).toBe('abc-123');
    expect(result.options['format']).toBe('json');
  });

  it('parses --key value syntax', () => {
    const result = parseArgs(['report', '--run-id', 'abc-123', '--format', 'markdown']);
    expect(result.command).toBe('report');
    expect(result.options['run-id']).toBe('abc-123');
    expect(result.options['format']).toBe('markdown');
  });

  it('parses --flag as boolean true', () => {
    const result = parseArgs(['validate', '--include-holdout']);
    expect(result.command).toBe('validate');
    expect(result.options['include-holdout']).toBe(true);
  });

  it('handles mixed --key=value, --key value, and --flag', () => {
    const result = parseArgs([
      'validate',
      '--modules=xss,sqli',
      '--seed', '42',
      '--include-holdout',
    ]);
    expect(result.command).toBe('validate');
    expect(result.options['modules']).toBe('xss,sqli');
    expect(result.options['seed']).toBe('42');
    expect(result.options['include-holdout']).toBe(true);
  });

  it('returns empty command when argv is empty', () => {
    const result = parseArgs([]);
    expect(result.command).toBe('');
  });

  it('returns empty command when first arg starts with --', () => {
    const result = parseArgs(['--help']);
    expect(result.command).toBe('');
  });

  it('returns frozen options object', () => {
    const result = parseArgs(['validate', '--seed', '7']);
    expect(Object.isFrozen(result.options)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CLI_COMMANDS
// ---------------------------------------------------------------------------

describe('CLI_COMMANDS', () => {
  const commandNames = CLI_COMMANDS.map((c) => c.name);

  it.each([
    'validate',
    'calibrate',
    'generate',
    'report',
    'status',
    'gaps',
    'investigate',
    'audit-check',
  ])('includes the "%s" command', (name) => {
    expect(commandNames).toContain(name);
  });

  it('has 8 commands total', () => {
    expect(CLI_COMMANDS).toHaveLength(8);
  });

  it('marks run-id as required on report', () => {
    const report = CLI_COMMANDS.find((c) => c.name === 'report');
    const runIdOpt = report?.options.find((o) => o.name === 'run-id');
    expect(runIdOpt?.required).toBe(true);
  });

  it('marks run-id as required on investigate', () => {
    const investigate = CLI_COMMANDS.find((c) => c.name === 'investigate');
    const runIdOpt = investigate?.options.find((o) => o.name === 'run-id');
    expect(runIdOpt?.required).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatHelp
// ---------------------------------------------------------------------------

describe('formatHelp', () => {
  it('returns a string', () => {
    expect(typeof formatHelp()).toBe('string');
  });

  it('includes all command names', () => {
    const help = formatHelp();
    for (const cmd of CLI_COMMANDS) {
      expect(help).toContain(cmd.name);
    }
  });

  it('includes exit code documentation', () => {
    const help = formatHelp();
    expect(help).toContain('Exit codes');
    expect(help).toContain('0');
    expect(help).toContain('1');
    expect(help).toContain('2');
    expect(help).toContain('3');
  });

  it('includes usage line', () => {
    expect(formatHelp()).toContain('Usage: katana <command> [options]');
  });
});

// ---------------------------------------------------------------------------
// runCLI — unknown command
// ---------------------------------------------------------------------------

describe('runCLI — unknown command', () => {
  it('returns exit code 1 for unknown commands', async () => {
    const result = await runCLI(['nonexistent']);
    expect(result.exitCode).toBe(EXIT_CODES.FAIL);
    expect(result.output).toContain('Unknown command');
    expect(result.output).toContain('nonexistent');
  });

  it('includes help text in unknown command output', async () => {
    const result = await runCLI(['badcmd']);
    expect(result.output).toContain('Usage: katana');
  });

  it('returns help on empty argv', async () => {
    const result = await runCLI([]);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Usage: katana');
  });

  it('returns help for "help" command', async () => {
    const result = await runCLI(['help']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Commands:');
  });
});

// ---------------------------------------------------------------------------
// runCLI — validate
// ---------------------------------------------------------------------------

describe('runCLI — validate', () => {
  it('parses modules option correctly', async () => {
    const result = await runCLI(['validate', '--modules', 'xss,sqli,rce']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('xss');
    expect(result.output).toContain('sqli');
    expect(result.output).toContain('rce');
  });

  it('handles include-holdout flag', async () => {
    const result = await runCLI(['validate', '--include-holdout']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Include holdout: true');
  });

  it('runs with no options', async () => {
    const result = await runCLI(['validate']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Modules: all');
  });

  it('includes seed when provided', async () => {
    const result = await runCLI(['validate', '--seed=42']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Seed: 42');
  });

  it('includes resume run-id when provided', async () => {
    const result = await runCLI(['validate', '--resume', 'run-abc']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Resume from: run-abc');
  });
});

// ---------------------------------------------------------------------------
// runCLI — report (required options)
// ---------------------------------------------------------------------------

describe('runCLI — report', () => {
  it('requires --run-id option', async () => {
    const result = await runCLI(['report']);
    expect(result.exitCode).toBe(EXIT_CODES.FAIL);
    expect(result.output).toContain('Missing required option');
    expect(result.output).toContain('--run-id');
  });

  it('succeeds with --run-id provided', async () => {
    const result = await runCLI(['report', '--run-id', 'run-123']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Run ID: run-123');
  });

  it('defaults format to json', async () => {
    const result = await runCLI(['report', '--run-id=run-123']);
    expect(result.output).toContain('Format: json');
  });

  it('accepts markdown format', async () => {
    const result = await runCLI(['report', '--run-id=run-123', '--format=markdown']);
    expect(result.output).toContain('Format: markdown');
  });

  it('accepts csv format', async () => {
    const result = await runCLI(['report', '--run-id=run-123', '--format=csv']);
    expect(result.output).toContain('Format: csv');
  });

  it('rejects invalid format', async () => {
    const result = await runCLI(['report', '--run-id=run-123', '--format=xml']);
    expect(result.exitCode).toBe(EXIT_CODES.FAIL);
    expect(result.output).toContain('Invalid format');
  });
});

// ---------------------------------------------------------------------------
// runCLI — investigate (required options)
// ---------------------------------------------------------------------------

describe('runCLI — investigate', () => {
  it('requires --run-id option', async () => {
    const result = await runCLI(['investigate']);
    expect(result.exitCode).toBe(EXIT_CODES.FAIL);
    expect(result.output).toContain('Missing required option');
  });

  it('succeeds with --run-id provided', async () => {
    const result = await runCLI(['investigate', '--run-id', 'run-456']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Run ID: run-456');
  });
});

// ---------------------------------------------------------------------------
// runCLI — calibrate
// ---------------------------------------------------------------------------

describe('runCLI — calibrate', () => {
  it('runs with modules option', async () => {
    const result = await runCLI(['calibrate', '--modules=xss,sqli']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('xss');
    expect(result.output).toContain('sqli');
  });

  it('runs with no options', async () => {
    const result = await runCLI(['calibrate']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Modules: all');
  });
});

// ---------------------------------------------------------------------------
// runCLI — generate
// ---------------------------------------------------------------------------

describe('runCLI — generate', () => {
  it('parses batch-size option', async () => {
    const result = await runCLI(['generate', '--batch-size=5000']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Batch size: 5000');
  });
});

// ---------------------------------------------------------------------------
// runCLI — status, gaps, audit-check (no options)
// ---------------------------------------------------------------------------

describe('runCLI — no-option commands', () => {
  it('status returns exit 0', async () => {
    const result = await runCLI(['status']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Status');
  });

  it('gaps returns exit 0', async () => {
    const result = await runCLI(['gaps']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Gap analysis');
  });

  it('audit-check returns exit 0', async () => {
    const result = await runCLI(['audit-check']);
    expect(result.exitCode).toBe(EXIT_CODES.PASS);
    expect(result.output).toContain('Audit check');
  });
});

// ---------------------------------------------------------------------------
// EXIT_CODES
// ---------------------------------------------------------------------------

describe('EXIT_CODES', () => {
  it('has pass = 0', () => {
    expect(EXIT_CODES.PASS).toBe(0);
  });

  it('has fail = 1', () => {
    expect(EXIT_CODES.FAIL).toBe(1);
  });

  it('has calibration-fail = 2', () => {
    expect(EXIT_CODES.CALIBRATION_FAIL).toBe(2);
  });

  it('has integrity-fail = 3', () => {
    expect(EXIT_CODES.INTEGRITY_FAIL).toBe(3);
  });
});
