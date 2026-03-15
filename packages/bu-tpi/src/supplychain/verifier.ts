/**
 * H24.1: Model Verification
 * SHA-256 hash verification for model files and model card analysis.
 */

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { ModelVerificationResult, ModelCardAnalysis } from './types.js';

/**
 * Verify a model file's SHA-256 hash against an expected value.
 * Uses streaming for large files. Also accepts a Buffer for unit testing.
 */
export async function verifyModelHash(
  filePathOrBuffer: string | Buffer,
  expectedHash: string,
): Promise<ModelVerificationResult> {
  const normalizedExpected = expectedHash.toLowerCase().trim();
  let computedHash: string;
  let modelPath: string;

  if (Buffer.isBuffer(filePathOrBuffer)) {
    modelPath = '<buffer>';
    const hash = createHash('sha256');
    hash.update(filePathOrBuffer);
    computedHash = hash.digest('hex');
  } else {
    modelPath = filePathOrBuffer;
    computedHash = await computeFileHash(filePathOrBuffer);
  }

  return {
    modelPath,
    sha256: computedHash,
    verified: computedHash === normalizedExpected,
    expectedHash: normalizedExpected,
    modelCard: null,
  };
}

/**
 * Compute SHA-256 hash of a file using streaming.
 */
function computeFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Analyze a model card (markdown content) for red flags and extract metadata.
 */
export function analyzeModelCard(content: string): ModelCardAnalysis {
  const redFlags: string[] = [];
  const lower = content.toLowerCase();

  // Check for missing license
  const licenseMatch = content.match(/#+\s*license\s*\n([\s\S]*?)(?=\n#+|\n$|$)/i);
  const license = licenseMatch ? licenseMatch[1].trim() || null : null;
  if (!license) {
    redFlags.push('Missing license information');
  }

  // Check for training data disclosure
  const trainingMatch = content.match(
    /#+\s*training\s*(?:data|dataset|details)\s*\n([\s\S]*?)(?=\n#+|\n$|$)/i,
  );
  const trainingData = trainingMatch ? trainingMatch[1].trim() || null : null;
  if (!trainingData) {
    redFlags.push('No training data disclosure');
  }

  // Check for intended use statement
  const intendedUseMatch = content.match(
    /#+\s*intended\s*use[s]?\s*\n([\s\S]*?)(?=\n#+|\n$|$)/i,
  );
  const intendedUse = intendedUseMatch ? intendedUseMatch[1].trim() || null : null;
  if (!intendedUse) {
    redFlags.push('No intended use statement');
  }

  // Check for limitations section
  const limitationsMatch = content.match(
    /#+\s*limitations?\s*\n([\s\S]*?)(?=\n#+|\n$|$)/i,
  );
  const limitations = limitationsMatch ? limitationsMatch[1].trim() || null : null;
  if (!limitations) {
    redFlags.push('Missing limitations section');
  }

  // Check for unsafe mentions
  if (lower.includes('uncensored') || lower.includes('no safety')) {
    redFlags.push('Model mentions "uncensored" or "no safety"');
  }

  return {
    hasModelCard: content.trim().length > 0,
    redFlags,
    license,
    trainingData,
    intendedUse,
    limitations,
  };
}
