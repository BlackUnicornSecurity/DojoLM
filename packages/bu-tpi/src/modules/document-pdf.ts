/**
 * S10 — Document Parser: PDF Module
 *
 * Detects prompt injections embedded in PDF text content, metadata,
 * annotations, form fields, and JavaScript actions. This is a text-based
 * scanner that analyzes PDF-related text/markup using regex patterns only.
 * No external dependencies (e.g., pdf-parse) are used.
 *
 * Self-registers with the scanner module registry on import.
 */

import type { Finding, RegexPattern, ScannerModule } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ============================================================================
// DoS Protection
// ============================================================================

const MAX_CONTENT_SIZE = 5_000_000;
const MAX_MATCH_LENGTH = 200;

// ============================================================================
// Pattern Groups
// ============================================================================

export const PDF_METADATA_PATTERNS: RegexPattern[] = [
  {
    name: 'pdf_metadata_xml_stream',
    cat: 'PDF_METADATA_INJECTION',
    sev: SEVERITY.WARNING,
    re: /\/Metadata\s*<<[^>]*\/Type\s*\/Metadata[^>]*\/Subtype\s*\/XML[^>]*>>\s*stream/i,
    desc: 'PDF metadata XML stream present (potential XMP/XFA injection carrier)',
    source: 'S10',
    weight: 6,
  },
  {
    name: 'pdf_metadata_ignore_instructions',
    cat: 'PDF_METADATA_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\/(?:Author|Title|Subject|Keywords|Creator|Producer)\s*\((?:[^)]*?)(?:ignore|disregard|override|bypass|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|directives|rules)/i,
    desc: 'Prompt injection detected in PDF metadata field — instruction override',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_metadata_system_prompt',
    cat: 'PDF_METADATA_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\/(?:Author|Title|Subject|Keywords|Creator|Producer)\s*\((?:[^)]*?)(?:system\s+prompt|new\s+instructions?|you\s+are\s+now|act\s+as)/i,
    desc: 'System prompt injection detected in PDF metadata field',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_metadata_role_hijack',
    cat: 'PDF_METADATA_INJECTION',
    sev: SEVERITY.WARNING,
    re: /\/(?:Author|Title|Subject|Keywords|Creator|Producer)\s*\((?:[^)]*?)(?:Human|User|Assistant|System)\s*:/i,
    desc: 'Role marker injection in PDF metadata field',
    source: 'S10',
    weight: 7,
  },
  {
    name: 'pdf_metadata_hidden_instruction',
    cat: 'PDF_METADATA_INJECTION',
    sev: SEVERITY.WARNING,
    re: /\/(?:Author|Title|Subject|Keywords|Creator|Producer)\s*\((?:[^)]*?)\[(?:HIDDEN|INJECT|INSTRUCTION|PAYLOAD|OVERRIDE|SECRET)\]/i,
    desc: 'Hidden instruction marker in PDF metadata field',
    source: 'S10',
    weight: 6,
  },
];

export const PDF_JAVASCRIPT_PATTERNS: RegexPattern[] = [
  {
    name: 'pdf_js_app_alert',
    cat: 'PDF_JAVASCRIPT_INJECTION',
    sev: SEVERITY.WARNING,
    re: /\/JS\s*\((?:[^)]*?)app\.alert\s*\(/i,
    desc: 'PDF JavaScript app.alert action detected',
    source: 'S10',
    weight: 6,
  },
  {
    name: 'pdf_js_submit_form',
    cat: 'PDF_JAVASCRIPT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\/JS\s*\((?:[^)]*?)this\.submitForm\s*\(/i,
    desc: 'PDF JavaScript submitForm action — potential data exfiltration',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_js_export_data',
    cat: 'PDF_JAVASCRIPT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\/JS\s*\((?:[^)]*?)(?:exportDataObject|importDataObject|getDataObjectContents)\s*\(/i,
    desc: 'PDF JavaScript data export/import action detected',
    source: 'S10',
    weight: 8,
  },
  {
    name: 'pdf_js_eval',
    cat: 'PDF_JAVASCRIPT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\/JS\s*\((?:[^)]*?)(?:eval|Function)\s*\(/i,
    desc: 'PDF JavaScript eval/Function — code execution attempt',
    source: 'S10',
    weight: 10,
  },
  {
    name: 'pdf_js_injection_payload',
    cat: 'PDF_JAVASCRIPT_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\/JS\s*\((?:[^)]*?)(?:ignore\s+(?:previous|prior|all)\s+instructions|system\s+prompt|you\s+are\s+now)/i,
    desc: 'Prompt injection payload inside PDF JavaScript action',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_js_open_action',
    cat: 'PDF_JAVASCRIPT_INJECTION',
    sev: SEVERITY.WARNING,
    re: /\/(?:OpenAction|AA)\s*<<[^>]*\/JS\s/i,
    desc: 'PDF auto-execute JavaScript via OpenAction or Additional Actions',
    source: 'S10',
    weight: 7,
  },
];

export const PDF_FORM_PATTERNS: RegexPattern[] = [
  {
    name: 'pdf_form_hidden_field',
    cat: 'PDF_FORM_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\/AcroForm\s*<<[\s\S]{0,300}\/Fields\s*\[[\s\S]{0,300}\/T\s*\((?:hidden|attack|payload)\)\s*\/V\s*\((?:injected_value|[^)]*(?:override|ignore|system))/i,
    desc: 'Hidden AcroForm field contains injected or suspicious value',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_form_field_injection',
    cat: 'PDF_FORM_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\/V\s*\((?:[^)]*?)(?:ignore|disregard|override|bypass)\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|directives|rules)/i,
    desc: 'Prompt injection in PDF form field value',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_form_field_system_prompt',
    cat: 'PDF_FORM_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\/V\s*\((?:[^)]*?)(?:system\s+prompt|new\s+instructions?|act\s+as|you\s+are\s+now)/i,
    desc: 'System prompt override in PDF form field value',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_form_submit_action',
    cat: 'PDF_FORM_INJECTION',
    sev: SEVERITY.WARNING,
    re: /\/A\s*<<[^>]*\/S\s*\/SubmitForm[^>]*\/F\s*\((?:https?:\/\/)/i,
    desc: 'PDF form submit action to external URL',
    source: 'S10',
    weight: 7,
  },
  {
    name: 'pdf_form_js_action',
    cat: 'PDF_FORM_INJECTION',
    sev: SEVERITY.WARNING,
    re: /\/(?:AA|A)\s*<<[^>]*\/(?:K|V|F|C)\s*<<[^>]*\/JS\s*\(/i,
    desc: 'PDF form field triggers JavaScript action',
    source: 'S10',
    weight: 7,
  },
];

export const PDF_ANNOTATION_PATTERNS: RegexPattern[] = [
  {
    name: 'pdf_annot_injection',
    cat: 'PDF_ANNOTATION_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\/(?:Contents|T|Subj|RC)\s*\((?:[^)]*?)(?:ignore|disregard|override|bypass)\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|directives|rules)/i,
    desc: 'Prompt injection in PDF annotation content',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_annot_system_prompt',
    cat: 'PDF_ANNOTATION_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /\/(?:Contents|T|Subj|RC)\s*\((?:[^)]*?)(?:system\s+prompt|new\s+instructions?|you\s+are\s+now|act\s+as)/i,
    desc: 'System prompt injection in PDF annotation',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_annot_role_marker',
    cat: 'PDF_ANNOTATION_INJECTION',
    sev: SEVERITY.WARNING,
    re: /\/(?:Contents|T|Subj|RC)\s*\((?:[^)]*?)(?:Human|User|Assistant|System)\s*:/i,
    desc: 'Role marker injection in PDF annotation',
    source: 'S10',
    weight: 7,
  },
];

export const PDF_ACTION_PATTERNS: RegexPattern[] = [
  {
    name: 'pdf_uri_javascript',
    cat: 'PDF_ACTION_SUSPICIOUS',
    sev: SEVERITY.CRITICAL,
    re: /\/S\s*\/URI\s*\/URI\s*\((?:javascript:|data:text\/html)/i,
    desc: 'PDF URI action executes JavaScript or HTML payload',
    source: 'S10',
    weight: 10,
  },
  {
    name: 'pdf_uri_data_exfil',
    cat: 'PDF_ACTION_SUSPICIOUS',
    sev: SEVERITY.CRITICAL,
    re: /\/S\s*\/URI\s*\/URI\s*\((?:https?:\/\/[^)]*?)(?:exfil|steal|leak|callback|collect|webhook)/i,
    desc: 'PDF URI action with potential data exfiltration URL',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_launch_action',
    cat: 'PDF_ACTION_SUSPICIOUS',
    sev: SEVERITY.CRITICAL,
    re: /\/S\s*\/Launch\s*\/(?:F|Win)\s*(?:<<[^>]*\/F\s*\(|(?:\())/i,
    desc: 'PDF Launch action — attempts to execute external application',
    source: 'S10',
    weight: 10,
  },
  {
    name: 'pdf_goto_remote',
    cat: 'PDF_ACTION_SUSPICIOUS',
    sev: SEVERITY.WARNING,
    re: /\/S\s*\/GoToR\s*\/F\s*\(/i,
    desc: 'PDF GoToR action — remote file reference',
    source: 'S10',
    weight: 6,
  },
  {
    name: 'pdf_goto_embedded',
    cat: 'PDF_ACTION_SUSPICIOUS',
    sev: SEVERITY.WARNING,
    re: /\/S\s*\/GoToE\s*\/F\s*\(/i,
    desc: 'PDF GoToE action — embedded file reference',
    source: 'S10',
    weight: 6,
  },
  {
    name: 'pdf_embedded_file',
    cat: 'PDF_ACTION_SUSPICIOUS',
    sev: SEVERITY.WARNING,
    re: /\/Type\s*\/EmbeddedFile[^>]*\/Subtype\s*\/(?:application\/(?:x-)?(?:javascript|vbs|powershell|x-msdownload|octet-stream))/i,
    desc: 'PDF embedded file with executable MIME type',
    source: 'S10',
    weight: 8,
  },
  {
    name: 'pdf_embedded_file_name',
    cat: 'PDF_ACTION_SUSPICIOUS',
    sev: SEVERITY.CRITICAL,
    re: /\/EmbeddedFiles\s*<<[\s\S]{0,300}\/Names\s*\[\((?:[^)]*\.(?:exe|js|vbs|ps1|bat))\)/i,
    desc: 'PDF embedded file collection contains an executable payload name',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_filespec_executable',
    cat: 'PDF_ACTION_SUSPICIOUS',
    sev: SEVERITY.CRITICAL,
    re: /\/Type\s*\/Filespec[\s\S]{0,200}\/F\s*\((?:[^)]*\.(?:exe|js|vbs|ps1|bat))\)/i,
    desc: 'PDF file specification references an executable attachment',
    source: 'S10',
    weight: 9,
  },
  {
    name: 'pdf_importdata_action',
    cat: 'PDF_ACTION_SUSPICIOUS',
    sev: SEVERITY.WARNING,
    re: /\/S\s*\/ImportData\s*\/F\s*\(/i,
    desc: 'PDF ImportData action — external data import',
    source: 'S10',
    weight: 6,
  },
];

// ============================================================================
// Aggregate pattern groups
// ============================================================================

const PDF_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: PDF_METADATA_PATTERNS, name: 'PDF_METADATA_PATTERNS' },
  { patterns: PDF_JAVASCRIPT_PATTERNS, name: 'PDF_JAVASCRIPT_PATTERNS' },
  { patterns: PDF_FORM_PATTERNS, name: 'PDF_FORM_PATTERNS' },
  { patterns: PDF_ANNOTATION_PATTERNS, name: 'PDF_ANNOTATION_PATTERNS' },
  { patterns: PDF_ACTION_PATTERNS, name: 'PDF_ACTION_PATTERNS' },
];

function detectPdfAdvancedStructures(text: string): Finding[] {
  const findings: Finding[] = [];

  if (/\/Type\s*\/XFA[\s\S]{0,600}(?:xfa\.host\.messageBox|application\/x-javascript|ignore all previous instructions|system override)/i.test(text)) {
    findings.push({
      category: 'PDF_FORM_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'PDF XFA form contains scriptable override or injection content',
      match: text.slice(0, MAX_MATCH_LENGTH),
      pattern_name: 'pdf_xfa_injection',
      source: 'S10',
      engine: 'document-pdf',
      weight: 10,
    });
  }

  return findings;
}

// ============================================================================
// Scanner Module
// ============================================================================

function runPatterns(text: string, patterns: RegexPattern[]): Finding[] {
  const findings: Finding[] = [];
  for (const p of patterns) {
    const m = text.match(p.re);
    if (m) {
      findings.push({
        category: p.cat,
        severity: p.sev,
        description: p.desc,
        match: m[0].slice(0, MAX_MATCH_LENGTH),
        pattern_name: p.name,
        source: p.source || 'S10',
        engine: 'document-pdf',
        ...(p.weight !== undefined && { weight: p.weight }),
      });
    }
  }
  return findings;
}

export const documentPdfModule: ScannerModule = {
  name: 'document-pdf',
  version: '1.0.0',
  description: 'Detects prompt injections in PDF text content, metadata, annotations, form fields, and actions',
  supportedContentTypes: ['application/pdf', 'text/pdf'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_CONTENT_SIZE) {
      return [{
        category: 'PDF_DOS_PROTECTION',
        severity: SEVERITY.WARNING,
        description: `PDF content exceeds maximum size limit (${MAX_CONTENT_SIZE} chars). Skipping scan.`,
        match: `[content length: ${text.length}]`,
        source: 'S10',
        engine: 'document-pdf',
        pattern_name: 'pdf_dos_size_limit',
      }];
    }

    const findings: Finding[] = [];
    for (const group of PDF_PATTERN_GROUPS) {
      const normalizedFindings = runPatterns(normalized, group.patterns);
      findings.push(...normalizedFindings);
      if (normalizedFindings.length === 0) {
        findings.push(...runPatterns(text, group.patterns));
      }
    }
    findings.push(...detectPdfAdvancedStructures(text));
    return findings;
  },

  getPatternCount(): number {
    let count = 0;
    for (const group of PDF_PATTERN_GROUPS) {
      count += group.patterns.length;
    }
    return count + 1;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    const groups = PDF_PATTERN_GROUPS.map(g => ({
      name: g.name,
      count: g.patterns.length,
      source: 'S10',
    }));
    groups.push({ name: 'PDF_ADVANCED_STRUCTURES', count: 1, source: 'S10' });
    return groups;
  },
};

if (!scannerRegistry.hasModule('document-pdf')) {
  scannerRegistry.register(documentPdfModule);
}
