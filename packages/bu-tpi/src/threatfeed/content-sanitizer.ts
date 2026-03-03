/**
 * S61: THREATFEED Content Sanitizer
 * Sanitizes ingested content at ingestion time.
 * Per SME CRIT-05: sanitize all ingested content.
 */

import type { ContentSanitizationResult } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

/**
 * Strip XML external entities and DTD declarations.
 * Per SME CRIT-05: disable XML external entities in RSS parser.
 */
export function stripXMLEntities(xml: string): string {
  if (xml.length > MAX_INPUT_LENGTH) return '';

  let sanitized = xml;

  // Remove DOCTYPE declarations with entity definitions
  sanitized = sanitized.replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/gi, '');
  sanitized = sanitized.replace(/<!DOCTYPE[^>]*>/gi, '');

  // Remove ENTITY declarations
  sanitized = sanitized.replace(/<!ENTITY[^>]*>/gi, '');

  // Remove SYSTEM and PUBLIC references
  sanitized = sanitized.replace(/SYSTEM\s+["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/PUBLIC\s+["'][^"']*["']\s+["'][^"']*["']/gi, '');

  // Remove entity references like &xxe;
  sanitized = sanitized.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)[a-zA-Z_][\w.-]*;/gi, '');

  // Remove CDATA sections that could hide content
  sanitized = sanitized.replace(/<!\[CDATA\[/gi, '');
  sanitized = sanitized.replace(/\]\]>/g, '');

  // Remove processing instructions (except xml declaration)
  sanitized = sanitized.replace(/<\?(?!xml\s)[\s\S]*?\?>/gi, '');

  return sanitized;
}

/**
 * Strip script tags and event handlers from HTML content.
 */
export function stripScriptTags(html: string): string {
  if (html.length > MAX_INPUT_LENGTH) return '';

  let sanitized = html;

  // Remove script tags
  sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  // Remove data: protocol in src/href
  sanitized = sanitized.replace(/(src|href)\s*=\s*["']data:[^"']*["']/gi, '');

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<iframe[^>]*\/>/gi, '');

  // Remove object/embed tags
  sanitized = sanitized.replace(/<object[\s\S]*?<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed[^>]*\/?>/gi, '');

  return sanitized;
}

/**
 * Strip control characters (except whitespace).
 */
export function stripControlCharacters(text: string): string {
  if (text.length > MAX_INPUT_LENGTH) return '';

  // Remove C0 controls except tab, newline, carriage return
  // Remove C1 controls
  // Remove zero-width characters
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\x80-\x9F]/g, '')
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');
}

/**
 * Normalize whitespace.
 */
export function normalizeWhitespace(text: string): string {
  if (text.length > MAX_INPUT_LENGTH) return '';

  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/ {3,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n\n');
}

/**
 * Full content sanitization pipeline.
 */
export function sanitizeContent(content: string): ContentSanitizationResult {
  if (content.length > MAX_INPUT_LENGTH) {
    return { sanitized: '', removedElements: ['Content exceeds maximum length'] };
  }

  const removedElements: string[] = [];
  let sanitized = content;

  // Track what we remove
  const beforeXML = sanitized;
  sanitized = stripXMLEntities(sanitized);
  if (sanitized !== beforeXML) removedElements.push('XML entities/DTD');

  const beforeScript = sanitized;
  sanitized = stripScriptTags(sanitized);
  if (sanitized !== beforeScript) removedElements.push('Script tags/event handlers');

  const beforeControl = sanitized;
  sanitized = stripControlCharacters(sanitized);
  if (sanitized !== beforeControl) removedElements.push('Control characters');

  sanitized = normalizeWhitespace(sanitized);

  return { sanitized, removedElements };
}
