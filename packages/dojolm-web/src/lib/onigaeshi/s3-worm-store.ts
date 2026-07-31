// SPDX-License-Identifier: Apache-2.0
/**
 * S3-backed `WormObjectStore` adapter — the production WORM store the
 * `audit-worm-writer.ts` design doc deferred ("a thin adapter wraps
 * `@aws-sdk/client-s3`"). Targets any S3-compatible endpoint with
 * Object Lock; in production that is a dedicated `dojolm-minio`
 * container with a lock-enabled bucket.
 *
 * WORM semantics, two layers:
 *  1. `put` sends `IfNoneMatch: '*'` — the endpoint rejects an
 *     overwrite atomically with 412, mapped to `WormOverwriteError`
 *     (the store-contract error the writer + tests expect).
 *  2. Every object is stored with `ObjectLockMode=COMPLIANCE` and a
 *     `RetainUntilDate` `retentionDays` out — post-write tamper/delete
 *     is refused by the store itself, even for root, until expiry.
 *
 * Selected via `ONIGAESHI_WORM_STORE=s3` in `worm-store.ts`; env
 * contract lives in `buildS3WormStoreFromEnv` below.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { WormOverwriteError, type WormObjectStore } from 'bu-tpi/onigaeshi';

/** Operator answer 2026-07-02: 5-year Compliance retention. */
export const DEFAULT_RETENTION_DAYS = 1825;

/**
 * Sanity ceiling (sr-dev review round 2): without it, an all-digit env
 * value long enough to lose float precision still passes
 * `Number.isInteger` and only explodes later as an Invalid Date inside
 * `put()`. 100 years is far beyond any compliance horizon.
 */
export const MAX_RETENTION_DAYS = 36500;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Minimal client seam: exactly the `send` surface the adapter uses.
 * Tests inject a stub; production passes a real `S3Client`.
 */
export interface S3ClientLike {
  send(command: unknown): Promise<unknown>;
}

export interface S3WormObjectStoreOptions {
  readonly client: S3ClientLike;
  readonly bucket: string;
  /** Compliance-mode retention horizon. Defaults to 5 years. */
  readonly retentionDays?: number;
  readonly now?: () => Date;
}

/**
 * Defense-in-depth (red-team review): every caller today generates keys
 * under `onigaeshi/audit/…`, but this class is the exported production
 * `WormObjectStore` — pin the namespace so a future caller (or a bug
 * that lets user input reach `key`) cannot read/write/list outside it.
 */
const KEY_NAMESPACE = 'onigaeshi/';

function assertKeyNamespace(kind: string, value: string): void {
  if (!value.startsWith(KEY_NAMESPACE)) {
    throw new Error(
      `S3WormObjectStore: ${kind} must start with "${KEY_NAMESPACE}", got "${value}"`,
    );
  }
}

function isNamedError(err: unknown, ...names: readonly string[]): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    names.includes(String((err as { name: unknown }).name))
  );
}

function httpStatusOf(err: unknown): number | undefined {
  const meta = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata;
  return meta?.httpStatusCode;
}

export class S3WormObjectStore implements WormObjectStore {
  private readonly client: S3ClientLike;
  private readonly bucket: string;
  private readonly retentionDays: number;
  private readonly now: () => Date;

  constructor(opts: S3WormObjectStoreOptions) {
    if (!opts.bucket) {
      throw new Error('S3WormObjectStore: bucket is required');
    }
    const retentionDays = opts.retentionDays ?? DEFAULT_RETENTION_DAYS;
    if (
      !Number.isInteger(retentionDays) ||
      retentionDays <= 0 ||
      retentionDays > MAX_RETENTION_DAYS
    ) {
      throw new Error(
        `S3WormObjectStore: retentionDays must be a positive integer <= ${MAX_RETENTION_DAYS}, got "${String(
          opts.retentionDays,
        )}"`,
      );
    }
    this.client = opts.client;
    this.bucket = opts.bucket;
    this.retentionDays = retentionDays;
    this.now = opts.now ?? (() => new Date());
  }

  async put(key: string, body: string): Promise<void> {
    assertKeyNamespace('key', key);
    const retainUntil = new Date(
      this.now().getTime() + this.retentionDays * DAY_MS,
    );
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: 'application/json',
          IfNoneMatch: '*',
          ObjectLockMode: 'COMPLIANCE',
          ObjectLockRetainUntilDate: retainUntil,
          // Object-Lock PUTs require a payload checksum; pin one explicitly
          // rather than relying on SDK-default middleware.
          ChecksumAlgorithm: 'SHA256',
        }),
      );
    } catch (err) {
      // Conditional-write conflict: the key already exists. AWS surfaces
      // 412 PreconditionFailed; MinIO returns the same status. Any other
      // conflict shape (e.g. a proxy's opaque 409) falls through to the
      // rethrow — fail-closed: the write errors, it never silently
      // overwrites.
      if (
        httpStatusOf(err) === 412 ||
        isNamedError(err, 'PreconditionFailed', 'ConditionalRequestConflict')
      ) {
        throw new WormOverwriteError(key);
      }
      throw err;
    }
  }

  async get(key: string): Promise<string | null> {
    assertKeyNamespace('key', key);
    try {
      const res = (await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      )) as { Body?: { transformToString(): Promise<string> } };
      if (!res.Body) return null;
      return await res.Body.transformToString();
    } catch (err) {
      if (httpStatusOf(err) === 404 || isNamedError(err, 'NoSuchKey')) {
        return null;
      }
      throw err;
    }
  }

  async list(prefix: string): Promise<readonly string[]> {
    assertKeyNamespace('prefix', prefix);
    // ponytail: full-prefix materialization — O(chain length) per call and
    // the WORM chain only ever grows over the 5y retention. Fine for
    // production audit-row volumes; if verify/init latency ever hurts,
    // add a tail-only list variant + a page cap with a metric.
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const res = (await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ...(continuationToken
            ? { ContinuationToken: continuationToken }
            : {}),
        }),
      )) as {
        Contents?: readonly { Key?: string }[];
        IsTruncated?: boolean;
        NextContinuationToken?: string;
      };
      for (const obj of res.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key);
      }
      continuationToken = res.IsTruncated
        ? res.NextContinuationToken
        : undefined;
    } while (continuationToken);
    // S3 lists are already lexicographic, but the contract says sorted —
    // enforce it rather than trust every S3-compatible implementation.
    keys.sort();
    return keys;
  }
}

/**
 * Construct the prod store from env. Called by `worm-store.ts` when
 * `ONIGAESHI_WORM_STORE=s3`. Throws on missing config so a misconfigured
 * deploy fails loudly at first use instead of silently returning 503.
 *
 * Env contract:
 *   - ONIGAESHI_S3_ENDPOINT           — e.g. http://dojolm-minio:9000
 *   - ONIGAESHI_S3_BUCKET             — lock-enabled bucket name
 *   - ONIGAESHI_S3_ACCESS_KEY_ID      — scoped service-account key
 *   - ONIGAESHI_S3_SECRET_ACCESS_KEY  — scoped service-account secret
 *   - ONIGAESHI_S3_REGION             — OPTIONAL, default us-east-1 (MinIO default)
 *   - ONIGAESHI_S3_RETENTION_DAYS     — OPTIONAL, default 1825 (5 years)
 */
export function buildS3WormStoreFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): S3WormObjectStore {
  const endpoint = (env.ONIGAESHI_S3_ENDPOINT ?? '').trim();
  const bucket = (env.ONIGAESHI_S3_BUCKET ?? '').trim();
  const accessKeyId = (env.ONIGAESHI_S3_ACCESS_KEY_ID ?? '').trim();
  const secretAccessKey = (env.ONIGAESHI_S3_SECRET_ACCESS_KEY ?? '').trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'ONIGAESHI_WORM_STORE=s3 requires ONIGAESHI_S3_ENDPOINT, ' +
        'ONIGAESHI_S3_BUCKET, ONIGAESHI_S3_ACCESS_KEY_ID, ' +
        'ONIGAESHI_S3_SECRET_ACCESS_KEY',
    );
  }
  // Validate the endpoint shape here so a malformed URL fails at store
  // selection, not at the first put(). (A well-formed-but-wrong host can
  // only fail at first network use.)
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new Error(
      `ONIGAESHI_S3_ENDPOINT must be a valid URL, got "${endpoint}"`,
    );
  }
  if (endpointUrl.protocol !== 'http:' && endpointUrl.protocol !== 'https:') {
    throw new Error(
      `ONIGAESHI_S3_ENDPOINT must be http(s), got "${endpointUrl.protocol}"`,
    );
  }
  let retentionDays: number | undefined;
  const retentionRaw = (env.ONIGAESHI_S3_RETENTION_DAYS ?? '').trim();
  if (retentionRaw !== '') {
    // Strict decimal only — reject '1e3', '0x10', '5.0' etc. The
    // constructor enforces the MAX_RETENTION_DAYS ceiling.
    if (!/^[1-9]\d*$/.test(retentionRaw)) {
      throw new Error(
        `ONIGAESHI_S3_RETENTION_DAYS must be a positive integer, got "${retentionRaw}"`,
      );
    }
    retentionDays = Number(retentionRaw);
  }
  const client = new S3Client({
    endpoint,
    region: (env.ONIGAESHI_S3_REGION ?? '').trim() || 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    // MinIO serves buckets on the path, not a per-bucket subdomain.
    forcePathStyle: true,
  });
  return new S3WormObjectStore({
    client,
    bucket,
    ...(retentionDays !== undefined ? { retentionDays } : {}),
  });
}
