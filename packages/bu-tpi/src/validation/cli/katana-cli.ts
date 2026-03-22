/**
 * KATANA CLI — Command-line interface for validation operations
 *
 * Library module that parses arguments and dispatches to command handlers.
 * NOT a binary entry point — no process.exit, no shebang.
 *
 * Exit codes:
 *   0 = pass
 *   1 = fail
 *   2 = calibration-fail
 *   3 = integrity-fail
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedArgs {
  readonly command: string;
  readonly options: Readonly<Record<string, string | boolean>>;
}

export interface CommandResult {
  readonly exitCode: number;
  readonly output: string;
}

export interface CommandOption {
  readonly name: string;
  readonly description: string;
  readonly required?: boolean;
}

export interface CommandDefinition {
  readonly name: string;
  readonly description: string;
  readonly options: readonly CommandOption[];
}

// ---------------------------------------------------------------------------
// Exit Codes
// ---------------------------------------------------------------------------

export const EXIT_CODES = {
  PASS: 0,
  FAIL: 1,
  CALIBRATION_FAIL: 2,
  INTEGRITY_FAIL: 3,
} as const;

// ---------------------------------------------------------------------------
// Command Definitions
// ---------------------------------------------------------------------------

export const CLI_COMMANDS: readonly CommandDefinition[] = [
  {
    name: 'validate',
    description: 'Run validation suite against corpus',
    options: [
      { name: 'modules', description: 'Comma-separated list of modules to validate' },
      { name: 'include-holdout', description: 'Include holdout set in validation' },
      { name: 'seed', description: 'RNG seed for reproducibility' },
      { name: 'resume', description: 'Resume a previous run by run-id' },
    ],
  },
  {
    name: 'calibrate',
    description: 'Run calibration protocol for modules',
    options: [
      { name: 'modules', description: 'Comma-separated list of modules to calibrate' },
      { name: 'seed', description: 'RNG seed for reproducibility' },
    ],
  },
  {
    name: 'generate',
    description: 'Generate corpus samples via variation generators',
    options: [
      { name: 'seed', description: 'RNG seed for reproducibility' },
      { name: 'modules', description: 'Comma-separated list of target modules' },
      { name: 'batch-size', description: 'Number of samples per batch' },
    ],
  },
  {
    name: 'report',
    description: 'Generate validation report for a completed run',
    options: [
      { name: 'run-id', description: 'Run ID to report on', required: true },
      { name: 'format', description: 'Output format: json, markdown, or csv' },
    ],
  },
  {
    name: 'status',
    description: 'Show calibration and last run status',
    options: [],
  },
  {
    name: 'gaps',
    description: 'Run gap analysis on current corpus',
    options: [],
  },
  {
    name: 'investigate',
    description: 'List non-conformities for a validation run',
    options: [
      { name: 'run-id', description: 'Run ID to investigate', required: true },
    ],
  },
  {
    name: 'audit-check',
    description: 'Run dependency integrity and lockfile verification',
    options: [],
  },
] as const;

// ---------------------------------------------------------------------------
// Argument Parser
// ---------------------------------------------------------------------------

/**
 * Parse CLI arguments into a command and options map.
 *
 * Supports:
 *   --key=value
 *   --key value
 *   --flag (boolean true)
 *
 * First positional argument is the command.
 */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  const args = [...argv];
  const command = args.length > 0 && !args[0].startsWith('--') ? args[0] : '';
  const remaining = command ? args.slice(1) : args;

  const options: Record<string, string | boolean> = {};

  let i = 0;
  while (i < remaining.length) {
    const arg = remaining[i];

    if (arg.startsWith('--')) {
      const withoutDashes = arg.slice(2);

      if (withoutDashes.includes('=')) {
        // --key=value
        const eqIndex = withoutDashes.indexOf('=');
        const key = withoutDashes.slice(0, eqIndex);
        const value = withoutDashes.slice(eqIndex + 1);
        options[key] = value;
      } else if (i + 1 < remaining.length && !remaining[i + 1].startsWith('--')) {
        // --key value
        options[withoutDashes] = remaining[i + 1];
        i += 1;
      } else {
        // --flag (boolean)
        options[withoutDashes] = true;
      }
    }

    i += 1;
  }

  return { command, options: Object.freeze({ ...options }) };
}

// ---------------------------------------------------------------------------
// Help Formatter
// ---------------------------------------------------------------------------

export function formatHelp(): string {
  const header = 'KATANA Validation Framework CLI\n\nUsage: katana <command> [options]\n\nCommands:';

  const commandLines = CLI_COMMANDS.map((cmd) => {
    const optionLines = cmd.options.map((opt) => {
      const req = opt.required ? ' (required)' : '';
      return `      --${opt.name}${req}  ${opt.description}`;
    });

    const optionBlock = optionLines.length > 0 ? `\n${optionLines.join('\n')}` : '';
    return `\n  ${cmd.name}    ${cmd.description}${optionBlock}`;
  });

  const footer = '\n\nExit codes:\n  0  pass\n  1  fail\n  2  calibration-fail\n  3  integrity-fail';

  return [header, ...commandLines, footer].join('');
}

// ---------------------------------------------------------------------------
// Command Handlers (stubs — validate options, return placeholder results)
// ---------------------------------------------------------------------------

function findCommand(name: string): CommandDefinition | undefined {
  return CLI_COMMANDS.find((c) => c.name === name);
}

function checkRequiredOptions(
  cmd: CommandDefinition,
  options: Readonly<Record<string, string | boolean>>,
): string | null {
  const missing = cmd.options
    .filter((opt) => opt.required && !(opt.name in options))
    .map((opt) => `--${opt.name}`);

  return missing.length > 0 ? `Missing required option(s): ${missing.join(', ')}` : null;
}

function parseModulesList(modules: string | boolean | undefined): readonly string[] {
  if (typeof modules === 'string') {
    return modules.split(',').map((m) => m.trim()).filter(Boolean);
  }
  return [];
}

async function handleValidate(options: Readonly<Record<string, string | boolean>>): Promise<CommandResult> {
  const modules = parseModulesList(options['modules']);
  const includeHoldout = options['include-holdout'] === true;
  const seed = typeof options['seed'] === 'string' ? options['seed'] : undefined;
  const resume = typeof options['resume'] === 'string' ? options['resume'] : undefined;

  const parts = [
    'Validation run configured:',
    modules.length > 0 ? `  Modules: ${modules.join(', ')}` : '  Modules: all',
    `  Include holdout: ${includeHoldout}`,
    seed !== undefined ? `  Seed: ${seed}` : null,
    resume !== undefined ? `  Resume from: ${resume}` : null,
    '',
    'Validation requires corpus data. Run with real data to execute.',
  ].filter((line): line is string => line !== null);

  return { exitCode: EXIT_CODES.PASS, output: parts.join('\n') };
}

async function handleCalibrate(options: Readonly<Record<string, string | boolean>>): Promise<CommandResult> {
  const modules = parseModulesList(options['modules']);
  const seed = typeof options['seed'] === 'string' ? options['seed'] : undefined;

  const parts = [
    'Calibration configured:',
    modules.length > 0 ? `  Modules: ${modules.join(', ')}` : '  Modules: all',
    seed !== undefined ? `  Seed: ${seed}` : null,
    '',
    'Calibration requires reference sets. Run with real data to execute.',
  ].filter((line): line is string => line !== null);

  return { exitCode: EXIT_CODES.PASS, output: parts.join('\n') };
}

async function handleGenerate(options: Readonly<Record<string, string | boolean>>): Promise<CommandResult> {
  const seed = typeof options['seed'] === 'string' ? options['seed'] : undefined;
  const modules = parseModulesList(options['modules']);
  const batchSize = typeof options['batch-size'] === 'string' ? options['batch-size'] : undefined;

  const parts = [
    'Generation configured:',
    seed !== undefined ? `  Seed: ${seed}` : null,
    modules.length > 0 ? `  Modules: ${modules.join(', ')}` : '  Modules: all',
    batchSize !== undefined ? `  Batch size: ${batchSize}` : null,
    '',
    'Generation requires generator registry. Run with real data to execute.',
  ].filter((line): line is string => line !== null);

  return { exitCode: EXIT_CODES.PASS, output: parts.join('\n') };
}

async function handleReport(options: Readonly<Record<string, string | boolean>>): Promise<CommandResult> {
  const runId = options['run-id'];
  const format = typeof options['format'] === 'string' ? options['format'] : 'json';

  const validFormats = ['json', 'markdown', 'csv'] as const;
  if (!validFormats.includes(format as typeof validFormats[number])) {
    return {
      exitCode: EXIT_CODES.FAIL,
      output: `Invalid format "${format}". Valid formats: ${validFormats.join(', ')}`,
    };
  }

  return {
    exitCode: EXIT_CODES.PASS,
    output: `Report configured:\n  Run ID: ${runId}\n  Format: ${format}\n\nReport generation requires run data. Run with real data to execute.`,
  };
}

async function handleStatus(): Promise<CommandResult> {
  return {
    exitCode: EXIT_CODES.PASS,
    output: 'Status check configured.\n\nStatus requires calibration and run data. Run with real data to execute.',
  };
}

async function handleGaps(): Promise<CommandResult> {
  return {
    exitCode: EXIT_CODES.PASS,
    output: 'Gap analysis configured.\n\nGap analysis requires corpus data. Run with real data to execute.',
  };
}

async function handleInvestigate(options: Readonly<Record<string, string | boolean>>): Promise<CommandResult> {
  const runId = options['run-id'];

  return {
    exitCode: EXIT_CODES.PASS,
    output: `Investigation configured:\n  Run ID: ${runId}\n\nInvestigation requires run data. Run with real data to execute.`,
  };
}

async function handleAuditCheck(): Promise<CommandResult> {
  return {
    exitCode: EXIT_CODES.PASS,
    output: 'Audit check configured.\n\nDependency integrity check requires lockfile. Run with real data to execute.',
  };
}

// ---------------------------------------------------------------------------
// Command Dispatcher
// ---------------------------------------------------------------------------

const COMMAND_HANDLERS: Readonly<Record<string, (options: Readonly<Record<string, string | boolean>>) => Promise<CommandResult>>> = {
  validate: handleValidate,
  calibrate: handleCalibrate,
  generate: handleGenerate,
  report: handleReport,
  status: handleStatus,
  gaps: handleGaps,
  investigate: handleInvestigate,
  'audit-check': handleAuditCheck,
};

// ---------------------------------------------------------------------------
// Main Entry
// ---------------------------------------------------------------------------

/**
 * Parse arguments, dispatch to the appropriate command handler, and return
 * the exit code + output. Does NOT call process.exit.
 */
export async function runCLI(argv: readonly string[]): Promise<CommandResult> {
  const { command, options } = parseArgs(argv);

  if (command === '' || command === 'help' || command === '--help') {
    return { exitCode: EXIT_CODES.PASS, output: formatHelp() };
  }

  const cmdDef = findCommand(command);
  if (!cmdDef) {
    return {
      exitCode: EXIT_CODES.FAIL,
      output: `Unknown command: "${command}"\n\n${formatHelp()}`,
    };
  }

  const missingError = checkRequiredOptions(cmdDef, options);
  if (missingError) {
    return { exitCode: EXIT_CODES.FAIL, output: missingError };
  }

  const handler = COMMAND_HANDLERS[command];
  if (!handler) {
    return { exitCode: EXIT_CODES.FAIL, output: `No handler for command: "${command}"` };
  }

  return handler(options);
}
