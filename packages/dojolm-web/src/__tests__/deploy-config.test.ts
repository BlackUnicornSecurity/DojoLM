/**
 * Tests for deployment configuration completeness.
 * Validates docker-compose.yml and .env.example contain all required vars.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const DEPLOY_DIR = join(__dirname, '..', '..', '..', '..', 'deploy');

describe('deploy configuration', () => {
  const dockerCompose = readFileSync(join(DEPLOY_DIR, 'docker-compose.yml'), 'utf-8');
  const envExample = readFileSync(join(DEPLOY_DIR, '.env.example'), 'utf-8');

  // DC-001
  it('DC-001: docker-compose.yml contains NODA_API_KEY_ROLE', () => {
    expect(dockerCompose).toContain('NODA_API_KEY_ROLE');
  });

  // DC-002
  it('DC-002: docker-compose.yml contains NODA_API_KEY', () => {
    expect(dockerCompose).toContain('NODA_API_KEY');
  });

  // DC-003
  it('DC-003: docker-compose.yml contains TPI_ADMIN_PASSWORD', () => {
    expect(dockerCompose).toContain('TPI_ADMIN_PASSWORD');
  });

  // DC-004
  it('DC-004: .env.example documents NODA_API_KEY_ROLE', () => {
    expect(envExample).toContain('NODA_API_KEY_ROLE');
  });

  // DC-005
  it('DC-005: NODA_API_KEY_ROLE defaults to admin in docker-compose', () => {
    expect(dockerCompose).toContain('NODA_API_KEY_ROLE:-admin');
  });

  // DC-006
  it('DC-006: docker-compose has healthcheck configured', () => {
    expect(dockerCompose).toContain('healthcheck');
  });

  // DC-007
  it('DC-007: docker-compose sets NODE_ENV to production', () => {
    expect(dockerCompose).toContain('NODE_ENV: production');
  });
});
