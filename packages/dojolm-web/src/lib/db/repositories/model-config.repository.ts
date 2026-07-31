// SPDX-License-Identifier: Apache-2.0
/**
 * Model Configuration Repository.
 * Handles API key encryption/decryption and projection of sensitive fields.
 */

import { BaseRepository } from './base.repository';
import { encrypt, decrypt } from '../encryption';
import { getDatabase } from '../database';
import type { ModelConfigRow } from '../types';

export class ModelConfigRepository extends BaseRepository<ModelConfigRow> {
  constructor() {
    super('model_configs');
  }

  /**
   * Save a model config, encrypting the API key.
   */
  save(config: Partial<ModelConfigRow> & { api_key?: string }): ModelConfigRow {
    if (!config.id) {
      throw new Error('Model config id is required');
    }

    const data = { ...config };

    // `api_key` is NEVER a column on `model_configs` — only `api_key_encrypted`
    // is (see migrations/001_core_schema.sql). Always strip the raw key from
    // the row data BEFORE any write. This drops the historical raw-`api_key`
    // fallback that left the key on `data` whenever it was falsy (empty or
    // undefined), producing `INSERT … api_key …` → `SqliteError: table
    // model_configs has no column named api_key` (F-QA-012b). Secrets stay
    // encrypted at rest in `api_key_encrypted` — never plaintext.
    delete (data as Record<string, unknown>).api_key;

    // Encrypt only when a non-empty key is supplied. Ollama-style providers
    // legitimately carry no key, so an empty `api_key` is accepted and simply
    // leaves `api_key_encrypted` untouched rather than 500ing (F-QA-012a).
    if (config.api_key) {
      data.api_key_encrypted = encrypt(config.api_key);
    }

    const existing = this.findById(config.id);
    if (existing) {
      const updated = this.update(config.id, data);
      if (!updated) throw new Error(`Failed to update model config ${config.id}`);
      return updated;
    }
    return this.create(data);
  }

  /**
   * Find a model config by ID, decrypting the API key.
   * Never returns api_key_encrypted — only the decrypted api_key.
   */
  findByIdWithKey(id: string): (Omit<ModelConfigRow, 'api_key_encrypted'> & { api_key?: string }) | null {
    const row = this.findById(id);
    if (!row) return null;

    const { api_key_encrypted, ...safeRow } = row;
    const result: Omit<ModelConfigRow, 'api_key_encrypted'> & { api_key?: string } = safeRow;
    if (api_key_encrypted) {
      try {
        result.api_key = decrypt(api_key_encrypted);
      } catch (err) {
        console.error(`Failed to decrypt API key for model ${id}:`, (err as Error).message);
      }
    }
    return result;
  }

  /**
   * Find configs by provider (without decrypting keys).
   */
  findByProvider(provider: string): ModelConfigRow[] {
    return this.findAll({ where: { provider } });
  }

  /**
   * Find all enabled configs (without decrypting keys).
   */
  findEnabled(): ModelConfigRow[] {
    return this.findAll({ where: { enabled: 1 } });
  }

  /**
   * List all configs without the encrypted key column (safe for API responses).
   */
  listSafe(): Omit<ModelConfigRow, 'api_key_encrypted'>[] {
    const db = this.getDb();
    return db.prepare(
      `SELECT id, name, provider, model, base_url, enabled, config_json,
              max_tokens, organization_id, project_id, custom_headers_json,
              temperature, top_p, created_at, updated_at
       FROM model_configs`
    ).all() as Omit<ModelConfigRow, 'api_key_encrypted'>[];
  }
}

export const modelConfigRepo = new ModelConfigRepository();
