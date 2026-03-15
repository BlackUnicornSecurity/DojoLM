/**
 * H16.4: WebMCP SAGE Mutations
 * Web-specific mutation operators for MCP-served web contexts.
 * Extends the core SAGE mutation engine with HTML/CSS/DOM-based transformations.
 * All mutations are deterministic when given the same SeededRNG instance.
 */

import { SeededRNG, applyRandomMutation } from './mutation-engine.js';
import type { MutationResult } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

// --- WebMCP Mutation Operators ---

export const WEBMCP_MUTATION_OPERATORS = [
  'html-entity-encoding',
  'css-injection-wrap',
  'dom-mutation',
] as const;

export type WebMCPMutationOperator = (typeof WEBMCP_MUTATION_OPERATORS)[number];

export interface WebMCPMutationResult {
  readonly original: string;
  readonly mutated: string;
  readonly operator: WebMCPMutationOperator;
  readonly description: string;
  readonly changeCount: number;
}

// --- HTML Entity Maps ---

const HTML_NAMED_ENTITIES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
  '&': '&amp;',
  '/': '&sol;',
  '=': '&equals;',
  '`': '&grave;',
};

const HTML_ENTITY_CHARS = Object.keys(HTML_NAMED_ENTITIES);

type EntityEncodingStyle = 'named' | 'decimal' | 'hex';

function toNamedEntity(char: string): string {
  return HTML_NAMED_ENTITIES[char] ?? char;
}

function toDecimalEntity(char: string): string {
  return `&#${char.charCodeAt(0)};`;
}

function toHexEntity(char: string): string {
  return `&#x${char.charCodeAt(0).toString(16)};`;
}

const ENTITY_ENCODERS: Record<EntityEncodingStyle, (char: string) => string> = {
  named: toNamedEntity,
  decimal: toDecimalEntity,
  hex: toHexEntity,
};

const ENTITY_STYLES: readonly EntityEncodingStyle[] = ['named', 'decimal', 'hex'];

// --- CSS Injection Wrappers ---

const CSS_WRAPPERS = [
  { open: '<div style="position:absolute;left:-9999px">', close: '</div>', name: 'off-screen positioning' },
  { open: '<span style="font-size:0">', close: '</span>', name: 'zero font-size' },
  { open: '<p style="color:transparent">', close: '</p>', name: 'transparent color' },
  { open: '<div style="display:none">', close: '</div>', name: 'display none' },
  { open: '<div style="opacity:0">', close: '</div>', name: 'zero opacity' },
] as const;

// --- DOM Mutation Strategies ---

/** Escape closing sequences so the wrapper produces well-formed HTML. */
function escapeForTag(text: string, closingTag: string): string {
  // Case-insensitive replacement of the closing sequence
  const re = new RegExp(closingTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return text.replace(re, match => match.split('').join('\u200B'));
}

function escapeForComment(text: string): string {
  return text.replace(/-->/g, '-\u200B->');
}

function escapeForDataAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;')
    .replace(/\0/g, '');
}

const DOM_STRATEGIES = [
  {
    name: 'template tag wrapping',
    apply: (text: string): string => `<template>${escapeForTag(text, '</template>')}</template>`,
  },
  {
    name: 'data attribute encoding',
    apply: (text: string): string => `<div data-payload="${escapeForDataAttr(text)}"></div>`,
  },
  {
    name: 'noscript wrapping',
    apply: (text: string): string => `<noscript>${escapeForTag(text, '</noscript>')}</noscript>`,
  },
  {
    name: 'aria-hidden element',
    apply: (text: string): string => `<span aria-hidden="true">${escapeForTag(text, '</span>')}</span>`,
  },
  {
    name: 'HTML comment wrapping',
    apply: (text: string): string => `<!-- ${escapeForComment(text)} -->`,
  },
] as const;

// --- No-op result helper ---

function noopResult(text: string, operator: WebMCPMutationOperator): WebMCPMutationResult {
  return {
    original: text,
    mutated: text,
    operator,
    description: 'Input too large',
    changeCount: 0,
  };
}

// --- Operator Implementations ---

/**
 * Encode key attack tokens as HTML entities.
 * Uses SeededRNG to pick which encoding style (named, decimal, hex) per character.
 */
function htmlEntityEncoding(text: string, rng: SeededRNG): WebMCPMutationResult {
  if (text.length > MAX_INPUT_LENGTH) {
    return noopResult(text, 'html-entity-encoding');
  }

  const chars = Array.from(text);
  let changeCount = 0;

  const mutatedChars = chars.map((char) => {
    if (HTML_ENTITY_CHARS.includes(char)) {
      const style = rng.pick(ENTITY_STYLES);
      const encoder = ENTITY_ENCODERS[style];
      changeCount++;
      return encoder(char);
    }
    return char;
  });

  return {
    original: text,
    mutated: mutatedChars.join(''),
    operator: 'html-entity-encoding',
    description: `Encoded ${changeCount} characters as HTML entities`,
    changeCount,
  };
}

/**
 * Wrap payload in CSS-based hiding mechanisms.
 * Uses SeededRNG to pick wrapping style.
 */
function cssInjectionWrap(text: string, rng: SeededRNG): WebMCPMutationResult {
  if (text.length > MAX_INPUT_LENGTH) {
    return noopResult(text, 'css-injection-wrap');
  }

  const wrapper = rng.pick(CSS_WRAPPERS);
  const mutated = `${wrapper.open}${text}${wrapper.close}`;

  return {
    original: text,
    mutated,
    operator: 'css-injection-wrap',
    description: `Wrapped in CSS hiding: ${wrapper.name}`,
    changeCount: 1,
  };
}

/**
 * Transform payload into DOM-based delivery.
 * Uses SeededRNG to pick delivery method.
 */
function domMutation(text: string, rng: SeededRNG): WebMCPMutationResult {
  if (text.length > MAX_INPUT_LENGTH) {
    return noopResult(text, 'dom-mutation');
  }

  const strategy = rng.pick(DOM_STRATEGIES);
  const mutated = strategy.apply(text);

  return {
    original: text,
    mutated,
    operator: 'dom-mutation',
    description: `Applied DOM mutation: ${strategy.name}`,
    changeCount: 1,
  };
}

// --- Operator Registry ---

const WEBMCP_OPERATOR_FNS: Record<
  WebMCPMutationOperator,
  (text: string, rng: SeededRNG) => WebMCPMutationResult
> = {
  'html-entity-encoding': htmlEntityEncoding,
  'css-injection-wrap': cssInjectionWrap,
  'dom-mutation': domMutation,
};

// --- Public API ---

/**
 * Apply a specific WebMCP mutation operator.
 */
export function applyWebMCPMutation(
  text: string,
  operator: WebMCPMutationOperator,
  rng: SeededRNG
): WebMCPMutationResult {
  const fn = WEBMCP_OPERATOR_FNS[operator];
  if (!fn) {
    return {
      original: text,
      mutated: text,
      operator,
      description: `Unknown operator: ${operator}`,
      changeCount: 0,
    };
  }
  return fn(text, rng);
}

/**
 * Apply a random WebMCP mutation operator.
 */
export function applyRandomWebMCPMutation(
  text: string,
  rng: SeededRNG
): WebMCPMutationResult {
  const operator = rng.pick(WEBMCP_MUTATION_OPERATORS);
  return WEBMCP_OPERATOR_FNS[operator](text, rng);
}

/**
 * Compose a core SAGE mutation with a WebMCP mutation.
 * First applies a random core mutation, then applies a random WebMCP mutation
 * on the result. Returns both results for transparency.
 */
export function composeWithCoreMutation(
  text: string,
  rng: SeededRNG
): { coreResult: MutationResult; webResult: WebMCPMutationResult } {
  const coreResult = applyRandomMutation(text, rng);
  const webResult = applyRandomWebMCPMutation(coreResult.mutated, rng);

  return { coreResult, webResult };
}
