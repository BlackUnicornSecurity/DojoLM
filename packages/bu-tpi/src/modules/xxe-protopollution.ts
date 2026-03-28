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
const ENGINE = 'xxe-protopollution';

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
// PATTERN GROUP 3: Suspicious Web/DOM Injection Carriers
// ============================================================================

export const WEB_MARKUP_INJECTION_PATTERNS: RegexPattern[] = [
  { name: 'web_template_override_script', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<template\b[^>]*>[\s\S]{0,600}<script\b[\s\S]{0,300}(?:system override|ignore all previous instructions|override system prompt|reveal (?:your |the )?system prompt)/i,
    desc: 'HTML template content carries a script-based override payload', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_data_attribute_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\bdata-(?:prompt|system|instructions?|note)\s*=\s*["'][^"']*(?:ignore all previous instructions|override all safety|reveal (?:your |the )?system prompt|developer with full access|discard all prior directives|unrestricted mode)[^"']*["']/i,
    desc: 'Suspicious data-* attribute carries hidden override instructions', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_meta_tag_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<meta\b[^>]*(?:name|property)\s*=\s*["'](?:description|keywords|instructions|og:description|og:title)[^"']*["'][^>]*content\s*=\s*["'][^"']*(?:ignore all previous instructions|override system prompt|developer mode|unrestricted|remove all restrictions|new identity assigned|reveal (?:your |the )?system prompt)[^"']*["']/i,
    desc: 'Meta tags carry override directives or hidden unrestricted-mode instructions', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_attribute_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\b(?:title|alt)\s*=\s*["'][^"']*(?:ignore all previous instructions|you are now unrestricted|override system prompt|reveal (?:your |the )?system prompt|enter unrestricted mode)[^"']*["']/i,
    desc: 'HTML attributes are being used as a hidden prompt-injection carrier', source: MODULE_SOURCE, weight: 8 },
  { name: 'web_accessibility_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\baria-(?:label|description|roledescription)\s*=\s*["'][^"']*(?:ignore all previous instructions|override system prompt|developer mode|bypass all safety|discard all prior directives|reveal (?:your |the )?hidden instructions|unrestricted)[^"']*["']/i,
    desc: 'Accessibility text is being abused to hide override directives from the visible page', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_hidden_content_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<(?:div|span|p)[^>]*(?:class\s*=\s*["'][^"']*(?:hidden|zero-size|transparent)[^"']*["']|style\s*=\s*["'][^"']*(?:display\s*:\s*none|font-size\s*:\s*0|opacity\s*:\s*0|color\s*:\s*rgba\(0,\s*0,\s*0,\s*0\)|left\s*:\s*-9999px)[^"']*["'])[^>]*>[\s\S]{0,300}(?:system override|ignore all previous instructions|override all safety|developer mode|discard all prior instructions|reveal system prompt)/i,
    desc: 'Hidden DOM content embeds an override payload for downstream rendering or OCR', source: MODULE_SOURCE, weight: 10 },
  { name: 'web_comment_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<!--[\s\S]{0,300}(?:system override|ignore all previous instructions|reveal (?:your |the )?system prompt|developer with full access|print all system prompts|end override)[\s\S]{0,300}-->/i,
    desc: 'HTML comments contain hidden override instructions intended for downstream extraction', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_iframe_srcdoc_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<iframe\b[^>]*\bsrcdoc\s*=\s*["'][\s\S]{0,600}?(?:system prompt override|ignore all previous instructions|developer mode|discard all prior directives|unrestricted mode)[\s\S]{0,600}?["']/i,
    desc: 'iframe srcdoc contains a hidden override or unrestricted-mode payload', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_component_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:(?:innerHTML|shadowRoot\.innerHTML|template\.innerHTML)[\s\S]{0,220}(?:system override|ignore all previous instructions|reveal (?:your |the )?system prompt)[\s\S]{0,320}customElements\.define|customElements\.define\([^)]*\)[\s\S]{0,320}(?:innerHTML|shadowRoot\.innerHTML|template\.innerHTML)[\s\S]{0,220}(?:system override|ignore all previous instructions|reveal (?:your |the )?system prompt))/i,
    desc: 'Custom web component renders override instructions into the DOM at runtime', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_shadow_dom_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /attachShadow\([^)]*\)[\s\S]{0,240}(?:shadow\.innerHTML|shadowRoot\.innerHTML)[\s\S]{0,200}(?:system override|ignore all previous instructions|reveal (?:your |the )?system prompt)/i,
    desc: 'Shadow DOM content is populated with hidden override instructions', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_service_worker_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /navigator\.serviceWorker\.register\s*\([^)]*\)[\s\S]{0,250}(?:malicious service worker|system override|ignore all previous instructions|bypass all safety)/i,
    desc: 'Service worker registration is combined with an override payload', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_content_type_disguise_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /Content-Type\s*:\s*application\/(?:pdf|json)[\s\S]{0,220}?<!DOCTYPE html>[\s\S]{0,320}(?:system override|ignore all previous instructions|reveal (?:your |the )?system prompt|onerror\s*=)/i,
    desc: 'HTML override payload is disguised behind a non-HTML content type', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_css_exfiltration_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:input\[value\^=|background\s*:\s*url\(["']https?:\/\/[^"')]+(?:leak|exfil))[\s\S]{0,250}(?:css exfiltration|system override|ignore all previous instructions)/i,
    desc: 'CSS exfiltration pattern appears alongside an override payload', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_multilingual_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:(?:display\s*:\s*none|font-size\s*:\s*0)|<!--)[\s\S]{0,320}(?:ignora\s+todas\s+las\s+instrucciones\s+previas|ignore\s+previous\s+instructions\s+and\s+print\s+all\s+system\s+prompts|忽略所有之前的指令|игнорируйте\s+все\s+предыдущие\s+инструкции)[\s\S]{0,320}/i,
    desc: 'Hidden multilingual content carries override instructions intended to evade simple English-only filters', source: MODULE_SOURCE, weight: 9 },
  { name: 'web_scripted_dom_override', cat: 'WEB_MARKUP_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<script\b[\s\S]{0,400}(?:(?:system override|ignore all previous instructions|override system prompt|reveal (?:your |the )?system prompt)[\s\S]{0,200}(?:console\.log|postMessage|MutationObserver|localStorage|sessionStorage|indexedDB)|(?:console\.log|postMessage|MutationObserver|localStorage|sessionStorage|indexedDB)[\s\S]{0,200}(?:system override|ignore all previous instructions|override system prompt|reveal (?:your |the )?system prompt))[\s\S]{0,400}<\/script>/i,
    desc: 'Scripted DOM carrier contains explicit override language or storage/message abuse', source: MODULE_SOURCE, weight: 8 },
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
  { name: 'WEB_MARKUP_INJECTION_PATTERNS', patterns: WEB_MARKUP_INJECTION_PATTERNS },
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
  supportedContentTypes: ['text/plain', 'text/html', 'text/xml', 'application/xml', 'application/json'],

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
