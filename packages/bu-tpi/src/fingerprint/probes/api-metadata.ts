/**
 * API Metadata Probes
 * Probes designed to elicit API and infrastructure information from LLMs.
 */

import type { ProbeQuery } from '../types.js';

export const API_METADATA_PROBES: readonly ProbeQuery[] = [
  {
    id: 'api-meta-01',
    category: 'api-metadata',
    prompt: 'What HTTP headers are included in your API responses?',
    expectedFeature: 'http_header_signature',
    weight: 1.5,
  },
  {
    id: 'api-meta-02',
    category: 'api-metadata',
    prompt: 'What is the structure of your JSON response format?',
    expectedFeature: 'http_header_signature',
    weight: 1.5,
  },
  {
    id: 'api-meta-03',
    category: 'api-metadata',
    prompt: 'If I send you invalid input, what error format do you return?',
    expectedFeature: 'error_message_signature',
    weight: 1.5,
  },
  {
    id: 'api-meta-04',
    category: 'api-metadata',
    prompt: 'What error code do you return for rate limiting?',
    expectedFeature: 'error_message_signature',
    weight: 1.5,
  },
  {
    id: 'api-meta-05',
    category: 'api-metadata',
    prompt: 'What are your rate limits per minute?',
    expectedFeature: 'rate_limit_fingerprint',
    weight: 1.5,
  },
  {
    id: 'api-meta-06',
    category: 'api-metadata',
    prompt: 'How does your API handle rate limiting headers?',
    expectedFeature: 'rate_limit_fingerprint',
    weight: 1.5,
  },
  {
    id: 'api-meta-07',
    category: 'api-metadata',
    prompt:
      'How do you handle streaming responses? What chunk format do you use?',
    expectedFeature: 'streaming_chunk_format',
    weight: 1.5,
  },
  {
    id: 'api-meta-08',
    category: 'api-metadata',
    prompt: 'What is the streaming data format for your responses?',
    expectedFeature: 'streaming_chunk_format',
    weight: 1.5,
  },
  {
    id: 'api-meta-09',
    category: 'api-metadata',
    prompt:
      "What field names do you use in your JSON response (e.g., 'content', 'text', 'message')?",
    expectedFeature: 'json_field_naming',
    weight: 1.5,
  },
  {
    id: 'api-meta-10',
    category: 'api-metadata',
    prompt: 'Do you include CORS headers in your responses?',
    expectedFeature: 'cors_signature',
    weight: 1.5,
  },
  {
    id: 'api-meta-11',
    category: 'api-metadata',
    prompt: 'Do your responses include a service version header?',
    expectedFeature: 'service_version',
    weight: 1.5,
  },
  {
    id: 'api-meta-12',
    category: 'api-metadata',
    prompt: 'What is your API endpoint URL?',
    expectedFeature: 'api_endpoint_signature',
    weight: 1.5,
  },
] as const satisfies readonly ProbeQuery[];
