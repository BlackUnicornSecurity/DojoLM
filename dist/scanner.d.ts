/**
 * TPI Security Test Lab — Scanner Engine
 *
 * Prompt injection detection engine with pattern matching, encoding decoders,
 * and heuristic detectors. This is the authoritative source for all detection
 * patterns — the UI imports from here.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */
import { type Finding, type ScanResult, type RegexPattern } from './types.js';
export declare function normalizeText(text: string): string;
export declare function checkForInjectionKeywords(text: string): boolean;
export declare const PI_PATTERNS: RegexPattern[];
export declare const JB_PATTERNS: RegexPattern[];
export declare const SETTINGS_WRITE_PATTERNS: RegexPattern[];
export declare const AGENT_OUTPUT_PATTERNS: RegexPattern[];
export declare const SEARCH_RESULT_PATTERNS: RegexPattern[];
export declare const WEBFETCH_PATTERNS: RegexPattern[];
export declare const BOUNDARY_PATTERNS: RegexPattern[];
export declare const MULTILINGUAL_PATTERNS: RegexPattern[];
export declare const CODE_FORMAT_PATTERNS: RegexPattern[];
export declare const SOCIAL_PATTERNS: RegexPattern[];
export declare const SYNONYM_PATTERNS: RegexPattern[];
export declare const WHITESPACE_PATTERNS: RegexPattern[];
export declare const MEDIA_PATTERNS: RegexPattern[];
export declare const VIDEO_INJECTION_PATTERNS: RegexPattern[];
export declare const OCR_ATTACK_PATTERNS: RegexPattern[];
export declare const UNTRUSTED_SOURCE_PATTERNS: RegexPattern[];
export declare const PERSONA_PATTERNS: RegexPattern[];
export declare const HYPOTHETICAL_PATTERNS: RegexPattern[];
export declare const FICTION_FRAMING_PATTERNS: RegexPattern[];
export declare const ROLEPLAY_PATTERNS: RegexPattern[];
export declare const FALSE_CONSTRAINT_PATTERNS: RegexPattern[];
export declare const TASK_EXPLOIT_PATTERNS: RegexPattern[];
export declare const REVERSE_PSYCH_PATTERNS: RegexPattern[];
export declare const REWARD_PATTERNS: RegexPattern[];
export declare const SHARED_DOC_PATTERNS: RegexPattern[];
export declare const API_RESPONSE_PATTERNS: RegexPattern[];
export declare const PLUGIN_INJECTION_PATTERNS: RegexPattern[];
export declare const COMPROMISED_TOOL_PATTERNS: RegexPattern[];
export declare const ALTERED_PROMPT_PATTERNS: RegexPattern[];
export declare const SURROGATE_FORMAT_PATTERNS: RegexPattern[];
export declare const RECURSIVE_INJECTION_PATTERNS: RegexPattern[];
/** Detect hidden Unicode characters (zero-width, directional, confusable) */
export declare function detectHiddenUnicode(text: string): Finding[];
/** Detect base64-encoded payloads */
export declare function detectBase64(text: string): Finding[];
/** Detect injection in HTML comments */
export declare function detectHtmlInjection(text: string): Finding[];
/** TPI-11: Detect context overload (token flooding + many-shot) */
export declare function detectContextOverload(text: string): Finding[];
/** TPI-10: Detect character-level encoding (ROT13, ROT47, reverse, acrostic) */
export declare function detectCharacterEncoding(text: string): Finding[];
/** TPI-10: Detect l33tsp34k / number-for-letter substitution */
export declare function detectNumberSubstitution(text: string): Finding[];
/** TPI-10: Detect Morse code encoded injection */
export declare function detectMorseCode(text: string): Finding[];
/** TPI-10: Detect adjacent character pair transposition encoding */
export declare function detectTransposition(text: string): Finding[];
/** TPI-13: Detect math/logic encoding */
export declare function detectMathEncoding(text: string): Finding[];
/** Story 2.3: Detect fictional framing + injection keyword combo (heuristic) */
export declare function detectFictionalFraming(text: string): Finding[];
/** Story 4.1: Detect injection keywords within structured data format contexts */
export declare function detectSurrogateFormat(text: string): Finding[];
/**
 * Story 4.2: Detect multi-turn slow-drip prompt injection.
 *
 * Analyzes session text (JSON array of turns or concatenated text) for
 * cumulative injection signals that are individually benign but collectively
 * suspicious.
 */
export declare function detectSlowDrip(text: string): Finding[];
/** Story 5.2: Detect steganographic hiding indicators in text descriptions/metadata */
export declare function detectSteganographicIndicators(text: string): Finding[];
/** Story 5.3: Detect OCR adversarial and hidden-text-in-image attack indicators */
export declare function detectOcrAdversarial(text: string): Finding[];
/** Story 5.4: Detect cross-modal injection — injection fragments spanning modality outputs */
export declare function detectCrossModalInjection(text: string): Finding[];
/**
 * Run all detectors against input text.
 *
 * This is the primary entry point for the scanner engine.
 * It normalizes text, runs all regex patterns, and runs all special detectors.
 */
export declare function scan(text: string): ScanResult;
export declare function getPatternCount(): number;
export declare function getPatternGroups(): {
    name: string;
    count: number;
    source: string;
}[];
