/**
 * S48: Adversarial Browser tests
 */
import { describe, it, expect } from 'vitest';
import { AdversarialBrowser, BROWSER_SCENARIO, BROWSER_TOOLS } from './browser.js';

describe('AdversarialBrowser', () => {
  it('should have a valid scenario', () => {
    expect(BROWSER_SCENARIO.id).toBe('browser-exploitation-01');
    expect(BROWSER_SCENARIO.type).toBe('browser-exploitation');
    expect(BROWSER_SCENARIO.payloads.length).toBeGreaterThanOrEqual(10);
  });

  it('should have 2 adversarial tools', () => {
    expect(BROWSER_TOOLS.length).toBe(2);
    BROWSER_TOOLS.forEach((tool) => {
      expect(tool.category).toBe('browser-exploitation');
    });
  });

  it('should serve seeded pages', () => {
    const browser = new AdversarialBrowser();
    const page = browser.servePage('/hidden-text');
    expect(page).not.toBeNull();
    expect(page!.contentType).toBe('text/html');
    expect(page!.body).toContain('display:none');
  });

  it('should serve unicode attack page', () => {
    const browser = new AdversarialBrowser();
    const page = browser.servePage('/unicode-rtl');
    expect(page).not.toBeNull();
    expect(page!.body).toContain('\u202E');
  });

  it('should generate attack pages dynamically', () => {
    const browser = new AdversarialBrowser();
    const page = browser.generateAttackPage('css-hidden', 'advanced');
    expect(page.body).toContain('Hidden');
  });

  it('should generate 25+ fixtures', () => {
    const browser = new AdversarialBrowser();
    const fixtures = browser.generateFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(25);
  });

  it('should execute tools correctly', () => {
    BROWSER_TOOLS.forEach((tool) => {
      const result = tool.execute({ url: '/hidden-text' }, 'basic');
      expect(result.metadata.attackType).toBe('browser-exploitation');
      expect(result.content.length).toBeGreaterThan(0);
    });
  });
});
