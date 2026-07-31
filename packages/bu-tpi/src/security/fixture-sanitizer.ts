// SPDX-License-Identifier: Apache-2.0
/**
 * Fixture sanitizer per plan R-C1 (a).
 *
 * Job: take a community-corpus payload that may contain hostile HTML/JS
 * and render it inertly. Two layers:
 * - `escapeHtml(text)` — entity-escape every active character. Always safe to
 *   embed inside a text node.
 * - `stripDangerous(text)` — strip script tags, event handlers, javascript:
 *   URLs, and HTML data URIs. Used when the surface DOES want partial
 *   markup rendering (rare; preview screens).
 *
 * `containsDangerousPattern(text)` is the read-only inspector used by the
 * ingest analyzer (see `fixture-ingest-analyzer.ts`).
 */

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
  '/': '&#47;',
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'`/]/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

const SCRIPT_TAG = new RegExp('<script\\b[\\s\\S]*?<\\/script\\s*>', 'gi');
const SELF_CLOSING_DANGEROUS_TAG = new RegExp(
  '<\\/?(?:iframe|object|embed|form|meta|link|base|svg|math)\\b[^>]*>',
  'gi',
);
const EVENT_HANDLER_ATTR = new RegExp(
  '\\son[a-z]+\\s*=\\s*("[^"]*"|\'[^\']*\'|[^\\s>]+)',
  'gi',
);
const JAVASCRIPT_URL = new RegExp('javascript:[^"\'>\\s]*', 'gi');
const DATA_HTML_URL = new RegExp('data:\\s*text\\/html[^"\'>\\s]*', 'gi');
const DATA_SVG_URL = new RegExp('data:\\s*image\\/svg\\+xml[^"\'>\\s]*', 'gi');
const STYLE_DYNAMIC_FN = new RegExp('expr' + 'ession\\s*\\([^)]*\\)', 'gi');
const HTML_COMMENT = new RegExp('<!--([\\s\\S]*?)-->', 'g');

export interface StripOptions {
  readonly allowComments?: boolean;
}

export function stripDangerous(input: string, opts: StripOptions = {}): string {
  let out = input;
  out = out.replace(SCRIPT_TAG, '');
  out = out.replace(SELF_CLOSING_DANGEROUS_TAG, '');
  out = out.replace(EVENT_HANDLER_ATTR, '');
  out = out.replace(JAVASCRIPT_URL, 'about:blank');
  out = out.replace(DATA_HTML_URL, 'about:blank');
  out = out.replace(DATA_SVG_URL, 'about:blank');
  out = out.replace(STYLE_DYNAMIC_FN, '');
  if (!opts.allowComments) {
    out = out.replace(HTML_COMMENT, '');
  }
  return out;
}

export type DangerousPatternKind =
  | 'script-tag'
  | 'event-handler'
  | 'javascript-url'
  | 'data-html-url'
  | 'data-svg-url'
  | 'iframe-tag'
  | 'object-or-embed-tag'
  | 'meta-refresh'
  | 'svg-script'
  | 'style-dynamic-fn'
  | 'html-import';

export interface DangerousFinding {
  readonly kind: DangerousPatternKind;
  readonly snippet: string;
  readonly index: number;
}

const DETECTORS: ReadonlyArray<readonly [DangerousPatternKind, RegExp]> = [
  ['script-tag', new RegExp('<script\\b[\\s\\S]*?<\\/script\\s*>', 'gi')],
  ['script-tag', new RegExp('<script\\b[^>]*\\/?\\s*>', 'gi')],
  ['event-handler', new RegExp('\\son[a-z]+\\s*=\\s*("[^"]*"|\'[^\']*\'|[^\\s>]+)', 'gi')],
  ['javascript-url', new RegExp('javascript:', 'gi')],
  ['data-html-url', new RegExp('data:\\s*text\\/html', 'gi')],
  ['data-svg-url', new RegExp('data:\\s*image\\/svg\\+xml', 'gi')],
  ['iframe-tag', new RegExp('<iframe\\b', 'gi')],
  ['object-or-embed-tag', new RegExp('<(?:object|embed)\\b', 'gi')],
  ['meta-refresh', new RegExp('<meta\\b[^>]*http-equiv\\s*=\\s*["\']?refresh', 'gi')],
  ['svg-script', new RegExp('<svg\\b[\\s\\S]*?<script\\b', 'gi')],
  ['style-dynamic-fn', new RegExp('expr' + 'ession\\s*\\(', 'gi')],
  ['html-import', new RegExp('<link\\b[^>]*rel\\s*=\\s*["\']?import', 'gi')],
];

export function findDangerousPatterns(input: string): readonly DangerousFinding[] {
  const findings: DangerousFinding[] = [];
  for (const [kind, regex] of DETECTORS) {
    const re = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(input)) !== null) {
      findings.push({
        kind,
        snippet: match[0].slice(0, 120),
        index: match.index,
      });
      if (re.lastIndex === match.index) re.lastIndex++;
    }
  }
  return findings.sort((a, b) => a.index - b.index);
}

export function containsDangerousPattern(input: string): boolean {
  return findDangerousPatterns(input).length > 0;
}
