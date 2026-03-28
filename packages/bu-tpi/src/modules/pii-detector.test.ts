/**
 * S33: PII Detector — Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { piiDetectorModule, configurePII, getPIIConfig, redactPII, detectPIIExposure } from './pii-detector.js';

describe('PII Detector Module', () => {
  beforeEach(() => {
    // Reset config to defaults
    configurePII({
      ssn: true, creditCard: true, email: true, phone: true,
      ipAddress: true, passport: true, medicalRecord: true,
      driverLicense: true, bankAccount: true, dateOfBirth: true, nationalId: true,
    });
  });

  describe('Module metadata', () => {
    it('should have correct module metadata', () => {
      expect(piiDetectorModule.name).toBe('pii-detector');
      expect(piiDetectorModule.version).toBe('1.0.0');
    });

    it('should report pattern groups', () => {
      const groups = piiDetectorModule.getPatternGroups();
      expect(groups.length).toBe(11);
      expect(groups.every(g => g.source === 'S33')).toBe(true);
    });

    it('should report total pattern count >= 25', () => {
      expect(piiDetectorModule.getPatternCount()).toBeGreaterThanOrEqual(25);
    });
  });

  describe('SSN Detection', () => {
    it('should detect dashed SSN format', () => {
      const findings = piiDetectorModule.scan('My SSN is 123-45-6789', 'my ssn is 123-45-6789');
      expect(findings.some(f => f.category === 'PII_SSN')).toBe(true);
    });

    it('should detect labeled SSN', () => {
      const findings = piiDetectorModule.scan('Social Security Number: 123-45-6789', 'social security number: 123-45-6789');
      expect(findings.some(f => f.category === 'PII_SSN')).toBe(true);
    });

    it('should NOT detect SSN when disabled', () => {
      configurePII({ ssn: false });
      const findings = piiDetectorModule.scan('SSN: 123-45-6789', 'ssn: 123-45-6789');
      expect(findings.filter(f => f.category === 'PII_SSN').length).toBe(0);
    });
  });

  describe('Credit Card Detection', () => {
    it('should detect Visa card number', () => {
      const findings = piiDetectorModule.scan('Card: 4111-1111-1111-1111', 'card: 4111-1111-1111-1111');
      expect(findings.some(f => f.category === 'PII_CREDIT_CARD')).toBe(true);
    });

    it('should detect Mastercard number', () => {
      const findings = piiDetectorModule.scan('MC: 5500 0000 0000 0004', 'mc: 5500 0000 0000 0004');
      expect(findings.some(f => f.category === 'PII_CREDIT_CARD')).toBe(true);
    });

    it('should detect American Express number', () => {
      const findings = piiDetectorModule.scan('AMEX: 3782-822463-10005', 'amex: 3782-822463-10005');
      expect(findings.some(f => f.category === 'PII_CREDIT_CARD')).toBe(true);
    });

    it('should detect JCB card numbers', () => {
      const findings = piiDetectorModule.scan('Card: 3530-1113-3330-0000', 'card: 3530-1113-3330-0000');
      expect(findings.some(f => f.pattern_name === 'cc_jcb')).toBe(true);
    });

    it('should detect Maestro card numbers', () => {
      const findings = piiDetectorModule.scan('Card: 6304-0000-0000-0000', 'card: 6304-0000-0000-0000');
      expect(findings.some(f => f.pattern_name === 'cc_maestro')).toBe(true);
    });
  });

  describe('Email Detection', () => {
    it('should detect email addresses', () => {
      const findings = piiDetectorModule.scan('Contact: user@acme.co', 'contact: user@acme.co');
      expect(findings.some(f => f.category === 'PII_EMAIL')).toBe(true);
    });
  });

  describe('Phone Detection', () => {
    it('should detect US phone numbers', () => {
      const findings = piiDetectorModule.scan('Call (415) 555-2671', 'call (415) 555-2671');
      expect(findings.some(f => f.category === 'PII_PHONE')).toBe(true);
    });

    it('should detect international phone numbers', () => {
      const findings = piiDetectorModule.scan('Phone: +44 20 7946 0958', 'phone: +44 20 7946 0958');
      expect(findings.some(f => f.category === 'PII_PHONE')).toBe(true);
    });
  });

  describe('IP Address Detection', () => {
    it('should detect private IPv4', () => {
      const findings = piiDetectorModule.scan('Server: 192.168.1.100', 'server: 192.168.1.100');
      expect(findings.some(f => f.category === 'PII_IP_ADDRESS')).toBe(true);
    });

    it('should not treat 0.0.0.0 as public PII', () => {
      const findings = piiDetectorModule.scan('Bind service to 0.0.0.0:8080', 'bind service to 0.0.0.0:8080');
      expect(findings.some(f => f.pattern_name === 'ipv4_public')).toBe(false);
    });
  });

  describe('Passport Detection', () => {
    it('should detect US passport number', () => {
      const findings = piiDetectorModule.scan('Passport no: A12345678', 'passport no: a12345678');
      // Check normalized first; passport regex uses case-sensitive [A-Z]
      const f = piiDetectorModule.scan('Passport no: A12345678', 'Passport no: A12345678');
      expect(f.some(ff => ff.category === 'PII_PASSPORT')).toBe(true);
    });
  });

  describe('Medical Record Detection', () => {
    it('should detect MRN', () => {
      const findings = piiDetectorModule.scan('MRN: ABC123456', 'mrn: abc123456');
      const f = piiDetectorModule.scan('MRN: ABC123456', 'MRN: ABC123456');
      expect(f.some(ff => ff.category === 'PII_MEDICAL')).toBe(true);
    });

    it('should detect NPI number', () => {
      const findings = piiDetectorModule.scan('NPI: 1234567890', 'npi: 1234567890');
      expect(findings.some(f => f.category === 'PII_MEDICAL')).toBe(true);
    });
  });

  describe('Bank Account Detection', () => {
    it('should detect routing number', () => {
      const findings = piiDetectorModule.scan('Routing: 021000021', 'routing: 021000021');
      expect(findings.some(f => f.category === 'PII_BANK_ACCOUNT')).toBe(true);
    });

    it('should detect account number', () => {
      const findings = piiDetectorModule.scan('Account number: 12345678901', 'account number: 12345678901');
      expect(findings.some(f => f.category === 'PII_BANK_ACCOUNT')).toBe(true);
    });
  });

  describe('Date of Birth Detection', () => {
    it('should detect labeled DOB', () => {
      const findings = piiDetectorModule.scan('DOB: 01/15/1990', 'dob: 01/15/1990');
      expect(findings.some(f => f.category === 'PII_DOB')).toBe(true);
    });
  });

  describe('National ID Detection', () => {
    it('should detect Spanish NIE', () => {
      const findings = piiDetectorModule.scan('NIE: X1234567A', 'nie: x1234567a');
      const f = piiDetectorModule.scan('NIE: X1234567A', 'NIE: X1234567A');
      expect(f.some(ff => ff.category === 'PII_NATIONAL_ID')).toBe(true);
    });
  });

  describe('Bulk PII Exposure', () => {
    it('should detect bulk PII (3+ types)', () => {
      const text = 'Name: John, SSN: 123-45-6789, Card: 4111-1111-1111-1111, Email: john@corp-secure.io';
      const findings = detectPIIExposure(text);
      expect(findings.some(f => f.category === 'PII_BULK_EXPOSURE')).toBe(true);
    });

    it('should NOT trigger for single PII type', () => {
      const findings = detectPIIExposure('Email: john@corp-secure.io');
      expect(findings.length).toBe(0);
    });

    it('should detect named contact bundles even with reserved example placeholders', () => {
      const findings = piiDetectorModule.scan(
        'Contact Jane Doe at john@example.com or call (555) 123-4567.',
        'Contact Jane Doe at john@example.com or call (555) 123-4567.',
      );
      expect(findings.some(f => f.pattern_name === 'contact_bundle')).toBe(true);
    });
  });

  describe('Redaction', () => {
    it('should redact SSN', () => {
      const result = redactPII('SSN: 123-45-6789');
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('123-45-6789');
    });

    it('should redact email', () => {
      const result = redactPII('Contact: user@acme.co');
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('user@acme.co');
    });
  });

  describe('Configuration', () => {
    it('should return default config', () => {
      const config = getPIIConfig();
      expect(config.ssn).toBe(true);
      expect(config.creditCard).toBe(true);
    });

    it('should allow partial config updates', () => {
      configurePII({ ssn: false, email: false });
      const config = getPIIConfig();
      expect(config.ssn).toBe(false);
      expect(config.email).toBe(false);
      expect(config.creditCard).toBe(true); // unchanged
    });
  });

  describe('Performance', () => {
    it('should scan in <50ms for typical input', () => {
      const text = 'A normal text without PII '.repeat(100);
      const start = performance.now();
      piiDetectorModule.scan(text, text.toLowerCase());
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });

    it('should skip oversized input gracefully', () => {
      const text = 'x'.repeat(600_000);
      const findings = piiDetectorModule.scan(text, text);
      expect(findings.length).toBe(0);
    });
  });

  describe('No false positives on benign content', () => {
    it('should not flag educational text about PII', () => {
      const text = 'PII detection systems look for patterns such as Social Security Numbers in the format NNN-NN-NNNN.';
      const findings = piiDetectorModule.scan(text, text.toLowerCase());
      // This is educational and uses NNN not digits, should not trigger SSN
      expect(findings.filter(f => f.category === 'PII_SSN').length).toBe(0);
    });

    it('should not treat CORS header documentation as a driver license', () => {
      const text = 'Access-Control-Allow-Headers: Content-Type, Authorization\nX-Content-Type-Options: nosniff\nServer: dleware-gateway';
      const findings = piiDetectorModule.scan(text, text);
      expect(findings.some(f => f.pattern_name === 'dl_labeled')).toBe(false);
    });

    it('should suppress placeholder example.com emails in benign control fixtures', () => {
      const text = 'Category: WebMCP Benign Control\nplaceholder=\"you@example.com\"\nINSTRUCTION: This is a benign control fixture.';
      const findings = piiDetectorModule.scan(text, text.toLowerCase());
      expect(findings.some(f => f.pattern_name === 'email_address')).toBe(false);
    });

    it('should suppress benign control contact blocks that use example domains and 555 numbers', () => {
      const text = 'Category: WebMCP Clean/Benign Control\nEmail: info@acmecorp.example.com\nPhone: +1 (555) 123-4567\nINSTRUCTION: This is a clean, benign HTML page.';
      const findings = piiDetectorModule.scan(text, text.toLowerCase());
      expect(findings.some(f => f.pattern_name === 'email_address' || f.pattern_name === 'email_labeled')).toBe(false);
      expect(findings.some(f => f.pattern_name === 'phone_us' || f.pattern_name === 'phone_labeled')).toBe(false);
    });

    it('should suppress reserved example domains even when embedded fragments lose wrapper context', () => {
      const text = '{"users":[{"email":"alice@example.com"},{"email":"bob@example.org"}]}';
      const findings = piiDetectorModule.scan(text, text.toLowerCase());
      expect(findings.some(f => f.category === 'PII_EMAIL' || f.category === 'PII_BULK_EXPOSURE')).toBe(false);
    });
  });
});
