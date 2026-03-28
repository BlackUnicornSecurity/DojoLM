/**
 * S11 — Document Parser: Office Module
 *
 * Detects prompt injections in Office document content (DOCX, XLSX, PPTX).
 * Analyzes extracted text/XML representations for hidden payloads,
 * dangerous formulas, macro indicators, OLE embedding, and injections.
 *
 * Zero runtime dependencies. Pure TypeScript regex patterns only.
 * Self-registers with the scanner module registry on import.
 */

import type { Finding, RegexPattern, ScannerModule } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MAX_INPUT_LENGTH = 5_000_000;
const MAX_MATCH_LENGTH = 200;

// ============================================================================
// PATTERN GROUPS
// ============================================================================

export const DOCX_PATTERNS: RegexPattern[] = [
  { name: 'docx_hidden_text', cat: 'OFFICE_DOCX_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:<w:vanish\s*\/>|<w:vanish\s+w:val\s*=\s*["'](?:true|1|on)["']|w:hidden\s*=\s*["'](?:true|1)["'])/i,
    desc: 'Hidden text in DOCX (w:vanish or w:hidden)', source: 'TPI-S11' },
  { name: 'docx_comment_injection', cat: 'OFFICE_DOCX_INJECTION', sev: SEVERITY.WARNING,
    re: /<w:comment\b[^>]*>[\s\S]{0,800}(?:ignore|override|bypass|disregard|system\s+prompt|new\s+instructions?)/i,
    desc: 'DOCX comment containing injection keywords', source: 'TPI-S11' },
  { name: 'docx_header_footer_injection', cat: 'OFFICE_DOCX_INJECTION', sev: SEVERITY.WARNING,
    re: /<w:(?:hdr|ftr)\b[^>]*>[\s\S]{0,800}(?:ignore|override|bypass|system\s+prompt|forget\s+(?:all|previous))/i,
    desc: 'DOCX header/footer containing injection keywords', source: 'TPI-S11' },
  { name: 'docx_vba_project_ref', cat: 'OFFICE_DOCX_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:vbaProject\.bin|vbaData\.xml|<Relationship[^>]*?Target\s*=\s*["'][^"']*vba)/i,
    desc: 'VBA project reference detected in DOCX content', source: 'TPI-S11' },
  { name: 'docx_field_code_injection', cat: 'OFFICE_DOCX_INJECTION', sev: SEVERITY.WARNING,
    re: /<w:instrText\b[^>]*>[^<]{0,200}?(?:INCLUDETEXT|INCLUDEPICTURE|LINK|DDEAUTO|DDE)\b/i,
    desc: 'DOCX field code with dangerous instruction (DDE/INCLUDE/LINK)', source: 'TPI-S11' },
  { name: 'docx_dde_brace_injection', cat: 'OFFICE_DOCX_INJECTION', sev: SEVERITY.CRITICAL,
    re: /\{DDE(?:AUTO)?\s+[^}]+\}/i,
    desc: 'Brace-style DDE field injection in DOCX content', source: 'TPI-S11' },
  { name: 'docx_custom_xml_injection', cat: 'OFFICE_DOCX_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<w:customXml\b[\s\S]{0,800}(?:ignore\s+all\s+previous\s+instructions|system\s+override|reveal\s+(?:your|the)\s+(?:complete\s+)?system\s+prompt|bypass\s+all\s+safety)/i,
    desc: 'Custom XML block contains prompt-injection instructions', source: 'TPI-S11' },
];

export const XLSX_PATTERNS: RegexPattern[] = [
  { name: 'xlsx_cmd_exec_formula', cat: 'OFFICE_XLSX_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:^|["',;|=\t])=\s*(?:CMD|EXEC|SHELL|CALL)\s*\(/im,
    desc: 'Excel formula executing system command', source: 'TPI-S11' },
  { name: 'xlsx_dde_formula', cat: 'OFFICE_XLSX_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:^|["',;|=\t])=\s*(?:DDE|DDEAUTO)\s*\(\s*["'][^"']{0,100}["']/im,
    desc: 'DDE/DDEAUTO formula for dynamic data exchange exploitation', source: 'TPI-S11' },
  { name: 'xlsx_dde_pipe_formula', cat: 'OFFICE_XLSX_INJECTION', sev: SEVERITY.CRITICAL,
    re: /=\s*cmd\|'[^']*'!A\d+/i,
    desc: 'Legacy DDE pipe formula embedded in XLSX cell content', source: 'TPI-S11' },
  { name: 'xlsx_hyperlink_formula', cat: 'OFFICE_XLSX_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:^|["',;|=\t])=\s*HYPERLINK\s*\(\s*["'](?:https?:\/\/|file:|\\\\|javascript:)/im,
    desc: 'HYPERLINK formula with suspicious URL scheme', source: 'TPI-S11' },
  { name: 'xlsx_hidden_sheet', cat: 'OFFICE_XLSX_INJECTION', sev: SEVERITY.WARNING,
    re: /<sheet\b[^>]*\bstate\s*=\s*["'](?:hidden|veryHidden)["']/i,
    desc: 'Hidden or very-hidden Excel sheet', source: 'TPI-S11' },
  { name: 'xlsx_csv_injection_prefix', cat: 'OFFICE_XLSX_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:^|[\t,;|])(?:[@+\-])(?:=\s*(?:CMD|EXEC|SHELL|SYSTEM|CALL)\s*\(|.*\|.*(?:cmd|powershell|bash|sh)\b)/im,
    desc: 'CSV injection prefix followed by command execution', source: 'TPI-S11' },
  { name: 'xlsx_comment_injection', cat: 'OFFICE_XLSX_INJECTION', sev: SEVERITY.WARNING,
    re: /<comment\b[\s\S]{0,800}(?:system\s+override|ignore\s+all\s+previous\s+instructions|reveal\s+(?:your|the)\s+system\s+prompt|disable\s+all\s+safety)/i,
    desc: 'XLSX cell comment contains prompt-injection instructions', source: 'TPI-S11' },
  { name: 'xlsx_external_link_injection', cat: 'OFFICE_XLSX_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<externalLink\b[\s\S]{0,800}(?:system\s+override|ignore\s+all\s+previous\s+instructions|reveal\s+(?:your|the)\s+system\s+prompt|external\s+link\s+loads)/i,
    desc: 'External link metadata carries a prompt-injection payload', source: 'TPI-S11' },
  { name: 'xlsx_shared_string_script', cat: 'OFFICE_XLSX_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<si>\s*<t>[\s\S]{0,200}<script\b[^>]*>[\s\S]{0,200}<\/script>/i,
    desc: 'Shared string contains embedded script content', source: 'TPI-S11' },
];

export const PPTX_PATTERNS: RegexPattern[] = [
  { name: 'pptx_notes_injection', cat: 'OFFICE_PPTX_INJECTION', sev: SEVERITY.WARNING,
    re: /<p:notes\b[^>]*>[^<]{0,1000}(?:ignore|override|bypass|system\s+prompt|disregard\s+(?:all|previous)|new\s+instructions?)/i,
    desc: 'PowerPoint slide notes containing injection keywords', source: 'TPI-S11' },
  { name: 'pptx_embedded_object', cat: 'OFFICE_PPTX_INJECTION', sev: SEVERITY.WARNING,
    re: /<p:oleObj\b[^>]*(?:progId|name)\s*=\s*["'][^"']{0,100}["']/i,
    desc: 'Embedded OLE object in PowerPoint presentation', source: 'TPI-S11' },
];

export const OFFICE_MACRO_PATTERNS: RegexPattern[] = [
  { name: 'office_auto_open', cat: 'OFFICE_MACRO_THREAT', sev: SEVERITY.CRITICAL,
    re: /\b(?:Auto_?Open|AutoExec|Auto_?Close|Document_?Open|Document_?Close|Workbook_?Open|Workbook_?Close)\b/i,
    desc: 'VBA auto-execution trigger', source: 'TPI-S11' },
  { name: 'office_shell_exec', cat: 'OFFICE_MACRO_THREAT', sev: SEVERITY.CRITICAL,
    re: /\b(?:WScript\.Shell|CreateObject\s*\(\s*["'](?:WScript\.Shell|Shell\.Application|Scripting\.FileSystemObject)["']|Environ\s*\()/i,
    desc: 'VBA WScript/CreateObject execution', source: 'TPI-S11' },
  { name: 'office_powershell_invoke', cat: 'OFFICE_MACRO_THREAT', sev: SEVERITY.CRITICAL,
    re: /(?:powershell(?:\.exe)?|cmd(?:\.exe)?|mshta(?:\.exe)?|cscript(?:\.exe)?|wscript(?:\.exe)?)\s+[\/\-]/i,
    desc: 'PowerShell/cmd invocation from macro context', source: 'TPI-S11' },
  { name: 'office_vba_download', cat: 'OFFICE_MACRO_THREAT', sev: SEVERITY.CRITICAL,
    re: /(?:URLDownloadToFile|XMLHTTP|WinHttp|Msxml2\.XMLHTTP|Microsoft\.XMLHTTP|Net\.WebClient|DownloadString|DownloadFile|Invoke-WebRequest|Invoke-RestMethod)/i,
    desc: 'VBA network download function for payload retrieval', source: 'TPI-S11' },
  { name: 'office_macro_obfuscation', cat: 'OFFICE_MACRO_THREAT', sev: SEVERITY.WARNING,
    re: /(?:Chr\s*\(\s*\d+\s*\)\s*(?:&\s*Chr\s*\(\s*\d+\s*\)){2,}|StrReverse\s*\(|CallByName\s*\()/i,
    desc: 'VBA macro obfuscation techniques', source: 'TPI-S11' },
];

export const OFFICE_OLE_PATTERNS: RegexPattern[] = [
  { name: 'office_activex_control', cat: 'OFFICE_OLE_THREAT', sev: SEVERITY.CRITICAL,
    re: /(?:<ax:ocx\b|<ocx\b|<ActiveX\b|classid\s*=\s*["']clsid:[0-9a-fA-F\-]{20,}["'])/i,
    desc: 'ActiveX control reference in Office document', source: 'TPI-S11' },
  { name: 'office_activex_relationship', cat: 'OFFICE_OLE_THREAT', sev: SEVERITY.CRITICAL,
    re: /<Relationship\b[^>]*Type\s*=\s*["'][^"']*activeXControlBinary["'][^>]*Target\s*=\s*["'][^"']+["']/i,
    desc: 'ActiveX control relationship embedded in Office package metadata', source: 'TPI-S11' },
  { name: 'office_template_injection', cat: 'OFFICE_OLE_THREAT', sev: SEVERITY.CRITICAL,
    re: /<Relationship\b[^>]*Type\s*=\s*["'][^"']*attachedTemplate["'][^>]*Target\s*=\s*["'](?:https?:\/\/|\\\\|file:)/i,
    desc: 'Remote template injection via external attached template', source: 'TPI-S11' },
  { name: 'office_embedded_package', cat: 'OFFICE_OLE_THREAT', sev: SEVERITY.CRITICAL,
    re: /(?:Package\s+Shell\s+Object|(?:progId|ProgID)\s*=\s*["'](?:Package|Shell\.Explorer|htmlfile|ShockwaveFlash)["'])/i,
    desc: 'Embedded package or dangerous ProgID', source: 'TPI-S11' },
  { name: 'office_ole_mhtml_target', cat: 'OFFICE_OLE_THREAT', sev: SEVERITY.CRITICAL,
    re: /<Relationship\b[^>]*Type\s*=\s*["'][^"']*oleObject["'][^>]*Target\s*=\s*["']mhtml:https?:\/\/[^"']+/i,
    desc: 'OLE relationship targets remote mhtml payload content', source: 'TPI-S11' },
  { name: 'office_alternatecontent_remote_graphic', cat: 'OFFICE_OLE_THREAT', sev: SEVERITY.CRITICAL,
    re: /<mc:AlternateContent\b[\s\S]{0,600}<a:graphicData\b[^>]*uri\s*=\s*["']https?:\/\/[^"']+["']/i,
    desc: 'AlternateContent block references a remote graphic payload', source: 'TPI-S11' },
];

// ============================================================================
// ALL PATTERN GROUPS
// ============================================================================

const ALL_OFFICE_PATTERN_GROUPS: { patterns: RegexPattern[]; engine: string; source: string }[] = [
  { patterns: DOCX_PATTERNS, engine: 'document-office', source: 'TPI-S11' },
  { patterns: XLSX_PATTERNS, engine: 'document-office', source: 'TPI-S11' },
  { patterns: PPTX_PATTERNS, engine: 'document-office', source: 'TPI-S11' },
  { patterns: OFFICE_MACRO_PATTERNS, engine: 'document-office', source: 'TPI-S11' },
  { patterns: OFFICE_OLE_PATTERNS, engine: 'document-office', source: 'TPI-S11' },
];

// ============================================================================
// SCANNER MODULE
// ============================================================================

function truncateMatch(match: string): string {
  return match.length <= MAX_MATCH_LENGTH ? match : match.slice(0, MAX_MATCH_LENGTH) + '...';
}

const documentOfficeModule: ScannerModule = {
  name: 'document-office',
  version: '1.0.0',
  description: 'Detects prompt injections and threats in Office document content (DOCX, XLSX, PPTX)',
  supportedContentTypes: ['text/xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) {
      return [{ category: 'OFFICE_DOS_PROTECTION', severity: SEVERITY.WARNING,
        description: `Input too large for Office document scanning (${text.length} bytes)`,
        match: `length=${text.length}`, source: 'TPI-S11', engine: 'document-office',
        pattern_name: 'office_dos_size_limit' }];
    }

    const findings: Finding[] = [];
    for (const group of ALL_OFFICE_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({
            category: p.cat, severity: p.sev, description: p.desc,
            match: truncateMatch(m[0]!), pattern_name: p.name,
            source: p.source || group.source, engine: group.engine,
          });
        }
      }
    }
    return findings;
  },

  getPatternCount(): number {
    return ALL_OFFICE_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0);
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    return ALL_OFFICE_PATTERN_GROUPS.map(g => ({
      name: g.patterns[0]?.cat || g.engine, count: g.patterns.length, source: g.source,
    }));
  },
};

if (!scannerRegistry.hasModule('document-office')) {
  scannerRegistry.register(documentOfficeModule);
}
export { documentOfficeModule };
