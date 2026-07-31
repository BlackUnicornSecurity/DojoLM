// SPDX-License-Identifier: Apache-2.0
//
// `dojolm.eval/v1` predicate-schema retrieval skeleton. PROVISIONAL — the
// schema lives in the separate spec repo (Apache-2.0 code + CC-BY-4.0 spec
// text). This function returns the SDK-local PROVISIONAL shape until
// M-11.2 publishes v0.1 + the SDK pins a tagged version.

import type { DojoLmEvalV1Predicate } from './types.js';

export interface PredicateSchemaOptions {
  readonly version: 'v1';
  /** Override the spec-repo URL for air-gapped deploys. */
  readonly specRepoUrl?: string;
}

export interface PredicateSchemaDescriptor {
  readonly version: 'v1';
  readonly url: string;
  readonly typeKeys: ReadonlyArray<keyof DojoLmEvalV1Predicate>;
  readonly tagOrNote: 'PROVISIONAL' | 'v0.1' | string;
  readonly licenseCode: 'Apache-2.0';
  readonly licenseText: 'CC-BY-4.0';
}

/**
 * Retrieve the `dojolm.eval/v<n>` predicate-schema descriptor.
 *
 * **Skeleton.** Returns the local PROVISIONAL keys until the spec repo
 * `github.com/BlackUnicornSecurity/eval-predicate` ships v0.1.
 */
export async function retrievePredicateSchema(
  options: PredicateSchemaOptions,
): Promise<PredicateSchemaDescriptor> {
  return {
    version: options.version,
    url: options.specRepoUrl ?? 'https://github.com/BlackUnicornSecurity/eval-predicate',
    typeKeys: [
      '_type',
      'modelRef',
      'systemPromptHash',
      'probeCorpusRef',
      'judgeModelRef',
      'judgeRubricHash',
      'sampleSize',
      'seed',
      'startedAt',
      'finishedAt',
      'operatorId',
      'transcriptHash',
      'verdictHash',
      'wormPayloadHash',
      'specVersion',
    ],
    tagOrNote: 'PROVISIONAL',
    licenseCode: 'Apache-2.0',
    licenseText: 'CC-BY-4.0',
  };
}
