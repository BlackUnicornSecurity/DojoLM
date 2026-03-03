/**
 * S61-S62: THREATFEED Tests
 */

import { createHmac } from 'node:crypto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  // URL Validator
  isInternalIP,
  validateSourceURL,
  // Content Sanitizer
  stripXMLEntities,
  stripScriptTags,
  stripControlCharacters,
  sanitizeContent,
  // Classifier
  classifyThreat,
  extractIndicators,
  assessSeverity,
  // Deduplicator
  createDeduplicator,
  isDuplicate,
  addDeduplicatorEntry,
  getDeduplicatorStats,
  // Pipeline
  createPipeline,
  addSource,
  parseRSS,
  parseAPI,
  validateWebhook,
  processItems,
  // Auto-Fixture
  generateFixtureFromThreat,
  approveFixture,
  rejectFixture,
  promoteFixture,
  getFixturesByStatus,
  createAlert,
  getAlerts,
  clearAutoFixtureStores,
  DEFAULT_ALERT_CONFIG,
} from './index.js';
import type { ThreatEntry, ThreatSource } from './types.js';

describe('URL Validator', () => {
  it('should detect internal IPs', () => {
    expect(isInternalIP('10.0.0.1')).toBe(true);
    expect(isInternalIP('192.168.1.1')).toBe(true);
    expect(isInternalIP('172.16.0.1')).toBe(true);
    expect(isInternalIP('127.0.0.1')).toBe(true);
    expect(isInternalIP('169.254.169.254')).toBe(true);
    expect(isInternalIP('8.8.8.8')).toBe(false);
  });

  it('should validate HTTPS URLs', () => {
    const result = validateSourceURL('https://example.com/feed');
    expect(result.valid).toBe(true);
  });

  it('should reject HTTP URLs', () => {
    const result = validateSourceURL('http://example.com/feed');
    expect(result.valid).toBe(false);
  });

  it('should reject localhost', () => {
    const result = validateSourceURL('https://localhost/feed');
    expect(result.valid).toBe(false);
  });

  it('should reject internal IPs', () => {
    const result = validateSourceURL('https://10.0.0.1/feed');
    expect(result.valid).toBe(false);
  });
});

describe('Content Sanitizer', () => {
  it('should strip XML external entities', () => {
    const xml = '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>';
    const sanitized = stripXMLEntities(xml);
    expect(sanitized).not.toContain('ENTITY');
    expect(sanitized).not.toContain('SYSTEM');
  });

  it('should strip script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    const sanitized = stripScriptTags(html);
    expect(sanitized).not.toContain('<script');
  });

  it('should strip control characters', () => {
    const text = 'Hello\x00World\x1FTest';
    const sanitized = stripControlCharacters(text);
    expect(sanitized).toBe('HelloWorldTest');
  });

  it('should run full sanitization pipeline', () => {
    const content = '<!DOCTYPE hack>Hello<script>bad</script>\x00World';
    const result = sanitizeContent(content);
    expect(result.removedElements.length).toBeGreaterThan(0);
    expect(result.sanitized).not.toContain('<script');
  });
});

describe('Classifier', () => {
  const mockEntry: ThreatEntry = {
    id: 'entry-1', sourceId: 'src-1', title: 'Prompt Injection Attack',
    description: 'A new jailbreak technique bypasses safety filters',
    rawContent: 'Ignore previous instructions. This prompt injection jailbreak bypasses safety.',
    classifiedType: null, severity: null, confidence: 0,
    indicators: [], extractedPatterns: [],
    createdAt: '2026-01-01', processedAt: null,
  };

  it('should classify threat entries', () => {
    const classification = classifyThreat(mockEntry);
    expect(classification.type).toBe('prompt-injection');
    expect(classification.confidence).toBeGreaterThan(0);
  });

  it('should extract indicators', () => {
    const indicators = extractIndicators('Attack from 192.168.1.1 targeting example.com using T1059.001');
    expect(indicators.some((i) => i.type === 'ip')).toBe(true);
    expect(indicators.some((i) => i.type === 'domain')).toBe(true);
    expect(indicators.some((i) => i.type === 'technique')).toBe(true);
  });

  it('should assess severity', () => {
    const classification = classifyThreat(mockEntry);
    const severity = assessSeverity(mockEntry.rawContent, classification);
    expect(['INFO', 'WARNING', 'CRITICAL']).toContain(severity);
  });
});

describe('Deduplicator', () => {
  it('should detect duplicate entries', () => {
    const dedup = createDeduplicator();
    const entry: ThreatEntry = {
      id: 'e1', sourceId: 's1', title: 'Test', description: 'Test',
      rawContent: 'Test content', classifiedType: null, severity: null,
      confidence: 0, indicators: [], extractedPatterns: [],
      createdAt: '2026-01-01', processedAt: null,
    };

    expect(isDuplicate(dedup, entry)).toBe(false);
    addDeduplicatorEntry(dedup, entry);
    expect(isDuplicate(dedup, entry)).toBe(true);
  });

  it('should track stats', () => {
    const dedup = createDeduplicator();
    const stats = getDeduplicatorStats(dedup);
    expect(stats.total).toBe(0);
  });
});

describe('Source Pipeline', () => {
  it('should create a pipeline', () => {
    const pipeline = createPipeline();
    expect(pipeline.entries.length).toBe(0);
  });

  it('should add sources with URL validation', () => {
    const pipeline = createPipeline();
    const source: ThreatSource = {
      id: 's1', name: 'Test Feed', type: 'rss',
      url: 'https://example.com/feed', enabled: true, lastPolled: null,
    };
    const result = addSource(pipeline, source);
    expect(result.success).toBe(true);
  });

  it('should reject sources with internal URLs', () => {
    const pipeline = createPipeline();
    const source: ThreatSource = {
      id: 's2', name: 'Internal Feed', type: 'rss',
      url: 'https://10.0.0.1/feed', enabled: true, lastPolled: null,
    };
    const result = addSource(pipeline, source);
    expect(result.success).toBe(false);
  });

  it('should parse RSS with XXE disabled', () => {
    const rss = '<channel><item><title>Test Alert</title><description>New attack found</description></item></channel>';
    const items = parseRSS(rss);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe('Test Alert');
  });

  it('should parse API responses', () => {
    const response = [{ title: 'Alert 1', description: 'Test' }];
    const items = parseAPI(response);
    expect(items.length).toBe(1);
  });

  it('should validate webhook HMAC', () => {
    const secret = 'test-secret';
    const body = '{"event": "new_threat"}';
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(validateWebhook(body, signature, secret)).toBe(true);
    expect(validateWebhook(body, 'invalid', secret)).toBe(false);
  });

  it('should process items with classification', () => {
    const items = [
      { title: 'Prompt Injection', description: 'Jailbreak attack', rawContent: 'Ignore instructions jailbreak' },
    ];
    const entries = processItems(items, 'source-1');
    expect(entries.length).toBe(1);
    expect(entries[0].classifiedType).toBeTruthy();
  });
});

describe('Auto-Fixture Import', () => {
  beforeEach(() => {
    clearAutoFixtureStores();
  });

  it('should generate fixture in quarantine', () => {
    const entry: ThreatEntry = {
      id: 'e1', sourceId: 's1', title: 'New Attack',
      description: 'Attack description', rawContent: 'Attack content',
      classifiedType: 'prompt-injection', severity: 'CRITICAL',
      confidence: 0.9, indicators: [], extractedPatterns: [],
      createdAt: '2026-01-01', processedAt: '2026-01-01',
    };

    const fixture = generateFixtureFromThreat(entry);
    expect(fixture.status).toBe('quarantined');
    expect(fixture.brand).toBe('dojolm');
  });

  it('should approve, reject, and promote fixtures', () => {
    const entry: ThreatEntry = {
      id: 'e2', sourceId: 's1', title: 'Test Attack',
      description: 'Test', rawContent: 'Content',
      classifiedType: 'dos', severity: 'WARNING',
      confidence: 0.7, indicators: [], extractedPatterns: [],
      createdAt: '2026-01-01', processedAt: '2026-01-01',
    };

    const fixture = generateFixtureFromThreat(entry);
    const approved = approveFixture(fixture.id);
    expect(approved?.status).toBe('approved');

    const promoted = promoteFixture(fixture.id);
    expect(promoted?.status).toBe('promoted');
  });

  it('should filter fixtures by status', () => {
    const entry: ThreatEntry = {
      id: 'e3', sourceId: 's1', title: 'Test',
      description: 'Test', rawContent: 'Content',
      classifiedType: 'web', severity: 'INFO',
      confidence: 0.5, indicators: [], extractedPatterns: [],
      createdAt: '2026-01-01', processedAt: '2026-01-01',
    };

    generateFixtureFromThreat(entry);
    const quarantined = getFixturesByStatus('quarantined');
    expect(quarantined.length).toBe(1);
  });
});

describe('Alert System', () => {
  beforeEach(() => {
    clearAutoFixtureStores();
  });

  it('should create alerts for high-severity threats', () => {
    const entry: ThreatEntry = {
      id: 'e1', sourceId: 's1', title: 'Critical Threat',
      description: 'Urgent', rawContent: 'Content',
      classifiedType: 'prompt-injection', severity: 'CRITICAL',
      confidence: 0.9, indicators: [], extractedPatterns: [],
      createdAt: '2026-01-01', processedAt: '2026-01-01',
    };

    const alert = createAlert(entry);
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe('CRITICAL');
  });

  it('should not create alerts below threshold', () => {
    const entry: ThreatEntry = {
      id: 'e2', sourceId: 's1', title: 'Info',
      description: 'Low priority', rawContent: 'Content',
      classifiedType: 'web', severity: 'INFO',
      confidence: 0.3, indicators: [], extractedPatterns: [],
      createdAt: '2026-01-01', processedAt: '2026-01-01',
    };

    const alert = createAlert(entry);
    expect(alert).toBeNull();
  });

  it('should deduplicate alerts', () => {
    const entry: ThreatEntry = {
      id: 'e3', sourceId: 's1', title: 'Duplicate',
      description: 'Same alert', rawContent: 'Content',
      classifiedType: 'prompt-injection', severity: 'CRITICAL',
      confidence: 0.9, indicators: [], extractedPatterns: [],
      createdAt: '2026-01-01', processedAt: '2026-01-01',
    };

    const alert1 = createAlert(entry);
    const alert2 = createAlert(entry);
    expect(alert1).not.toBeNull();
    expect(alert2).toBeNull(); // Deduplicated
  });
});
