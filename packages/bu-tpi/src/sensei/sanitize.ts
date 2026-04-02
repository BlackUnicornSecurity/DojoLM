/**
 * IKIGAI: Input Sanitization for Sensei Prompt Templates
 * Prevents structural marker injection in user-controlled values
 * that are interpolated into structured LLM prompts.
 */

/** Max length for user-controlled content embedded in prompts */
export const MAX_PROMPT_CONTENT_LENGTH = 5_000;

/** Strip structural markers that parsers rely on to prevent prompt injection */
export function sanitizeForPrompt(input: string, maxLength: number = MAX_PROMPT_CONTENT_LENGTH): string {
  return input
    .replace(/\[ATTACK\s*\d+\]/gi, '[A]')
    .replace(/\[CRITERION\]/gi, '[C]')
    .replace(/\[MUTATION\s*\d+\]/gi, '[M]')
    .replace(/\[TURN\s*\d+\]/gi, '[T]')
    .replace(/^---$/gm, '___')
    .slice(0, maxLength);
}

/** Sanitize a category/label value — strip braces and control chars */
export function sanitizeLabel(input: string): string {
  return input.replace(/[{}\n\r]/g, '');
}
