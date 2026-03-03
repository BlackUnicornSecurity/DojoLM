/**
 * S17: XXE and Prototype Pollution Detector
 *
 * Detects XML External Entity (XXE) injection attempts and JavaScript
 * prototype pollution attacks. Includes context-aware severity elevation
 * for XXE patterns found within XML parsing contexts.
 *
 * Zero runtime dependencies. Pure TypeScript. Self-registers with scannerRegistry.
 */

import type { Finding, RegexPattern, ScannerModule } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'xxe-protopollution';
const MODULE_SOURCE = 'S17';
const ENGINE = 'XXE-ProtoPollution';

// ============================================================================
// PATTERN GROUP 1: XXE Patterns
// ============================================================================

export const XXE_PATTERNS: RegexPattern[] = [
  { name: 'xxe_doctype_declaration', cat: 'XXE', sev: SEVERITY.CRITICAL,
    re: /<!DOCTYPE\s+\w+\s*\[/i,
    desc: 'DOCTYPE declaration with internal subset (potential XXE vector)', source: MODULE_SOURCE, weight: 9 },
  { name: 'xxe_entity_system', cat: 'XXE', sev: SEVERITY.CRITICAL,
    re: /<!ENTITY\s+\w+\s+SYSTEM\s+["'][^"']*["']\s*>/i,
    desc: 'ENTITY declaration with SYSTEM identifier (external entity)', source: MODULE_SOURCE, weight: 10 },
  { name: 'xxe_entity_public', cat: 'XXE', sev: SEVERITY.CRITICAL,
    re: /<!ENTITY\s+\w+\s+PUBLIC\s+["'][^"']*["']\s+["'][^"']*["']\s*>/i,
    desc: 'ENTITY declaration with PUBLIC identifier (external entity)', source: MODULE_SOURCE, weight: 10 },
  { name: 'xxe_external_entity_ref', cat: 'XXE', sev: SEVERITY.WARNING,
    re: /&(?!(?:amp|lt|gt|quot|apos|nbsp|copy|reg|trade|mdash|ndash|hellip|euro|#\d+|#x[\da-fA-F]+);)\w{2,};/,
    desc: 'External entity reference (&xxe;) outside standard XML entities', source: MODULE_SOURCE, weight: 7 },
  { name: 'xxe_parameter_entity', cat: 'XXE', sev: SEVERITY.CRITICAL,
    re: /<!ENTITY\s+%\s+\w+\s+(?:SYSTEM|PUBLIC)\s+["'][^"']*["']/i,
    desc: 'Parameter entity declaration (% entity) with external reference', source: MODULE_SOURCE, weight: 10 },
  { name: 'xxe_parameter_entity_ref', cat: 'XXE', sev: SEVERITY.WARNING,
    re: /%\w{2,};/,
    desc: 'Parameter entity reference (%ent;) in DTD context', source: MODULE_SOURCE, weight: 7 },
  { name: 'xxe_xml_stylesheet_pi', cat: 'XXE', sev: SEVERITY.WARNING,
    re: /<\?xml-stylesheet\s+[^?]*\?>/i,
    desc: 'XML processing instruction (<?xml-stylesheet>) may load external resource', source: MODULE_SOURCE, weight: 6 },
  { name: 'xxe_cdata_injection', cat: 'XXE', sev: SEVERITY.WARNING,
    re: /<!\[CDATA\[[\s\S]*?(?:<!ENTITY|<!DOCTYPE|SYSTEM\s+["']|<\?xml)[\s\S]*?\]\]>/i,
    desc: 'CDATA section containing XXE-related payload', source: MODULE_SOURCE, weight: 8 },
];

// ============================================================================
// PATTERN GROUP 2: Prototype Pollution Patterns
// ============================================================================

export const PROTOTYPE_POLLUTION_PATTERNS: RegexPattern[] = [
  { name: 'proto_dunder_access', cat: 'PROTOTYPE_POLLUTION', sev: SEVERITY.CRITICAL,
    re: /__proto__/,
    desc: '__proto__ access detected (prototype pollution vector)', source: MODULE_SOURCE, weight: 9 },
  { name: 'proto_constructor_prototype', cat: 'PROTOTYPE_POLLUTION', sev: SEVERITY.CRITICAL,
    re: /constructor\s*(?:\[['"]prototype['"]\]|\.prototype)/,
    desc: 'constructor.prototype manipulation (prototype pollution vector)', source: MODULE_SOURCE, weight: 9 },
  { name: 'proto_object_assign_tainted', cat: 'PROTOTYPE_POLLUTION', sev: SEVERITY.WARNING,
    re: /Object\.assign\s*\(\s*(?:\w+\s*,\s*)?(?:JSON\.parse|req\.(?:body|query|params)|user[Ii]nput|data|payload)/,
    desc: 'Object.assign with potentially tainted source (prototype pollution risk)', source: MODULE_SOURCE, weight: 7 },
  { name: 'proto_json_parse_proto', cat: 'PROTOTYPE_POLLUTION', sev: SEVERITY.CRITICAL,
    re: /JSON\.parse\s*\([^)]*__proto__/,
    desc: 'JSON.parse with __proto__ key (prototype pollution via deserialization)', source: MODULE_SOURCE, weight: 9 },
  { name: 'proto_chain_modification', cat: 'PROTOTYPE_POLLUTION', sev: SEVERITY.CRITICAL,
    re: /(?:Object\.(?:setPrototypeOf|getPrototypeOf|create)\s*\(|Reflect\.setPrototypeOf\s*\()/,
    desc: 'Prototype chain modification via Object/Reflect API', source: MODULE_SOURCE, weight: 8 },
  { name: 'proto_bracket_proto_assign', cat: 'PROTOTYPE_POLLUTION', sev: SEVERITY.CRITICAL,
    re: /\[\s*['"]__proto__['"]\s*\]/,
    desc: 'Bracket notation __proto__ access (prototype pollution)', source: MODULE_SOURCE, weight: 9 },
  { name: 'proto_prototype_assign', cat: 'PROTOTYPE_POLLUTION', sev: SEVERITY.WARNING,
    re: /\.prototype\s*\.\s*\w+\s*=/,
    desc: 'Direct prototype property assignment (may pollute built-in prototypes)', source: MODULE_SOURCE, weight: 6 },
];

// ============================================================================
// CUSTOM DETECTORS
// ============================================================================

/**
 * Context-aware XXE detector: elevates severity when XXE patterns
 * are found within an XML parsing context (<?xml header present).
 */
export function detectXxeInContext(text: string): Finding[] {
  const findings: Finding[] = [];

  const hasXmlHeader = /<\?xml\s+[^?]*\?>/i.test(text);
  const hasDoctypeEntity = /<!DOCTYPE[\s\S]*<!ENTITY/i.test(text);
  const hasSystemKeyword = /SYSTEM\s+["'](?:file:\/\/|https?:\/\/|ftp:\/\/|php:\/\/|expect:\/\/|data:)/i.test(text);

  if (hasXmlHeader && hasDoctypeEntity) {
    findings.push({
      category: 'XXE', severity: SEVERITY.CRITICAL,
      description: 'XML document with DOCTYPE and ENTITY declarations detected (high-confidence XXE)',
      match: (text.match(/<\?xml[^?]*\?>/i)?.[0] ?? '<?xml>').slice(0, 80) + ' + DOCTYPE/ENTITY',
      source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'xxe_context_xml_with_entity', weight: 10,
    });
  }

  if (hasSystemKeyword) {
    const protocolMatch = text.match(/SYSTEM\s+["']((?:file|https?|ftp|php|expect|data):\/\/[^"']*)/i);
    const uri = protocolMatch?.[1] ?? 'unknown';
    const severity = hasXmlHeader ? SEVERITY.CRITICAL : SEVERITY.WARNING;
    findings.push({
      category: 'XXE', severity,
      description: `External entity references protocol URI: ${uri.slice(0, 60)}`,
      match: (protocolMatch?.[0] ?? 'SYSTEM protocol').slice(0, 100),
      source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'xxe_context_protocol_uri', weight: hasXmlHeader ? 10 : 7,
    });
  }

  // Detect blind XXE via parameter entity chaining
  const paramEntityDecl = text.match(/<!ENTITY\s+%\s+\w+/gi);
  const paramEntityRef = text.match(/%\w+;/g);
  if (paramEntityDecl && paramEntityRef && paramEntityDecl.length >= 1 && paramEntityRef.length >= 2) {
    findings.push({
      category: 'XXE', severity: SEVERITY.CRITICAL,
      description: `Blind XXE via parameter entity chaining: ${paramEntityDecl.length} decl(s), ${paramEntityRef.length} ref(s)`,
      match: `${paramEntityDecl[0]} + ${paramEntityRef.length} references`,
      source: MODULE_SOURCE, engine: ENGINE,
      pattern_name: 'xxe_context_blind_param_chain', weight: 10,
    });
  }

  return findings;
}

// ============================================================================
// ALL PATTERN GROUPS AND DETECTORS
// ============================================================================

const XXE_PP_PATTERN_GROUPS: { name: string; patterns: RegexPattern[] }[] = [
  { name: 'XXE_PATTERNS', patterns: XXE_PATTERNS },
  { name: 'PROTOTYPE_POLLUTION_PATTERNS', patterns: PROTOTYPE_POLLUTION_PATTERNS },
];

const XXE_PP_DETECTORS: { name: string; detect: (text: string) => Finding[] }[] = [
  { name: 'xxe-context-detector', detect: detectXxeInContext },
];

// ============================================================================
// SCANNER MODULE
// ============================================================================

const xxeProtoPollutionModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'XXE injection and prototype pollution detection with context-aware severity elevation',
  supportedContentTypes: ['text/plain', 'text/xml', 'application/xml', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];
    for (const group of XXE_PP_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({
            category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name,
            source: p.source || MODULE_SOURCE, engine: ENGINE,
            ...(p.weight !== undefined && { weight: p.weight }),
          });
        }
      }
    }
    for (const d of XXE_PP_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount(): number {
    return XXE_PP_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + XXE_PP_DETECTORS.length;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    const groups = XXE_PP_PATTERN_GROUPS.map(g => ({
      name: g.name, count: g.patterns.length, source: MODULE_SOURCE,
    }));
    groups.push({ name: 'xxe-pp-custom-detectors', count: XXE_PP_DETECTORS.length, source: MODULE_SOURCE });
    return groups;
  },
};

if (!scannerRegistry.hasModule(MODULE_NAME)) {
  scannerRegistry.register(xxeProtoPollutionModule);
}

export { xxeProtoPollutionModule };
