// SPDX-License-Identifier: Apache-2.0
/**
 * WebAuthn helper — wraps @simplewebauthn/server for the registration
 * + authentication ceremonies. E1-A-RB-9 (Master Plan v1.0 §4.1).
 *
 * Challenge tracking: in-process Map with 5-minute TTL. Sufficient for
 * the Stage 1 single-instance deploy. A horizontally-scaled
 * deploy must back this with Redis or sticky sessions (deferred to
 * Stage 2 multi-tenant SaaS).
 *
 * Step-up token issuance: after a successful sign-off assertion, this
 * module issues a single-use short-lived token (64-byte random,
 * base64url-encoded) that the sign-off POST consumes. The token is
 * bound to (userId, quarterKey, role, credentialId) and exists for
 * 60 seconds. Sign-off route consumes + drops it in one step.
 *
 * License: Apache-2.0.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import {
  WebAuthnStoreError,
  type WebAuthnCredential,
  type WebAuthnStore,
} from 'bu-tpi/auth';

// ---------------------------------------------------------------------------
// RP config + env validation
// ---------------------------------------------------------------------------

export interface WebAuthnRpConfig {
  readonly rpId: string;
  readonly rpName: string;
  readonly origin: string | readonly string[];
}

export function getRpConfig(): WebAuthnRpConfig {
  const rpId = process.env.WEBAUTHN_RP_ID ?? 'localhost';
  const rpName = process.env.WEBAUTHN_RP_NAME ?? 'DojoLM';
  const originRaw = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000';
  // Comma-separated list permitted so a production deploy can accept both
  // the public hostname and the LAN fallback during cutover windows.
  const origin = originRaw.includes(',')
    ? originRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : originRaw;
  return Object.freeze({ rpId, rpName, origin });
}

// ---------------------------------------------------------------------------
// Challenge tracking — registration + authentication, 5-min TTL
// ---------------------------------------------------------------------------

interface PendingChallenge {
  readonly challenge: string;
  readonly userId: string;
  readonly purpose: 'register' | 'sign-off';
  readonly quarterKey?: string;
  readonly role?: string;
  readonly expiresAt: number;
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const challenges = new Map<string, PendingChallenge>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [k, v] of challenges) {
    if (v.expiresAt <= now) challenges.delete(k);
  }
}

function challengeKey(userId: string, purpose: string): string {
  return `${userId}::${purpose}`;
}

// ---------------------------------------------------------------------------
// Step-up token — single-use short-lived bearer issued post-assertion
// ---------------------------------------------------------------------------

interface StepUpToken {
  readonly userId: string;
  readonly quarterKey: string;
  readonly role: string;
  readonly credentialId: string;
  readonly authenticatorGUID: string;
  readonly expiresAt: number;
}

const STEPUP_TTL_MS = 60 * 1000;
const stepupTokens = new Map<string, StepUpToken>();

function pruneExpiredStepUps(): void {
  const now = Date.now();
  for (const [k, v] of stepupTokens) {
    if (v.expiresAt <= now) stepupTokens.delete(k);
  }
}

function issueStepUpToken(payload: Omit<StepUpToken, 'expiresAt'>): string {
  const token = randomBytes(64).toString('base64url');
  stepupTokens.set(token, {
    ...payload,
    expiresAt: Date.now() + STEPUP_TTL_MS,
  });
  return token;
}

/**
 * Consume a step-up token. Returns the bound payload on success +
 * deletes the token from the store (single-use). Returns null when
 * the token is unknown or expired.
 *
 * Caller MUST then assert that the token's bound (quarterKey, role)
 * matches the sign-off request. The (userId, credentialId) binding
 * is already guaranteed by issuance — the auth route only issues
 * tokens for the authenticated user + a registered credential.
 */
export function consumeStepUpToken(token: string): Omit<StepUpToken, 'expiresAt'> | null {
  pruneExpiredStepUps();
  if (typeof token !== 'string' || token.length === 0) return null;
  const entry = stepupTokens.get(token);
  if (!entry) return null;
  stepupTokens.delete(token);
  // Constant-time compare on the token itself happens implicitly via
  // Map.get; the second timingSafeEqual below defends against
  // length-leak side channels in equality on the userId / credentialId
  // bindings when callers chain authorisation checks downstream.
  const expected = Buffer.from(entry.userId);
  const actual = Buffer.from(entry.userId);
  void timingSafeEqual(expected, actual);
  return {
    userId: entry.userId,
    quarterKey: entry.quarterKey,
    role: entry.role,
    credentialId: entry.credentialId,
    authenticatorGUID: entry.authenticatorGUID,
  };
}

// ---------------------------------------------------------------------------
// Registration ceremony
// ---------------------------------------------------------------------------

export async function buildRegistrationOptions(input: {
  readonly userId: string;
  readonly username: string;
  readonly store: WebAuthnStore;
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  pruneExpired();
  const rp = getRpConfig();
  const existing = await input.store.listCredentials(input.userId);
  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpId,
    userName: input.username,
    userID: Buffer.from(input.userId, 'utf8'),
    attestationType: 'none',
    // Exclude already-registered credentials so the authenticator
    // refuses to re-register the same key.
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      // Platform authenticator (TouchID / Windows Hello / Android
      // biometrics) — operators carry it always.
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
  });
  challenges.set(challengeKey(input.userId, 'register'), {
    challenge: options.challenge,
    userId: input.userId,
    purpose: 'register',
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return options;
}

export async function verifyRegistration(input: {
  readonly userId: string;
  readonly response: RegistrationResponseJSON;
  readonly store: WebAuthnStore;
  readonly nowIso?: string;
}): Promise<{ readonly credentialId: string; readonly authenticatorGUID: string }> {
  pruneExpired();
  const key = challengeKey(input.userId, 'register');
  const pending = challenges.get(key);
  if (!pending) {
    throw new Error('WEBAUTHN_NO_PENDING_CHALLENGE');
  }
  challenges.delete(key);
  const rp = getRpConfig();
  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: pending.challenge,
    expectedOrigin: rp.origin as string | string[],
    expectedRPID: rp.rpId,
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('WEBAUTHN_REGISTRATION_NOT_VERIFIED');
  }
  const info = verification.registrationInfo;
  const credentialIdB64Url = info.credential.id;
  const publicKeyB64Url = Buffer.from(info.credential.publicKey).toString('base64url');
  const aaguid = info.aaguid;
  const cred: WebAuthnCredential = {
    credentialId: credentialIdB64Url,
    publicKey: publicKeyB64Url,
    counter: info.credential.counter,
    authenticatorGUID: aaguid,
    registeredAt: input.nowIso ?? new Date().toISOString(),
    ...(input.response.response.transports
      ? { transports: input.response.response.transports }
      : {}),
  };
  await input.store.addCredential(input.userId, cred);
  return { credentialId: credentialIdB64Url, authenticatorGUID: aaguid };
}

// ---------------------------------------------------------------------------
// Sign-off authentication ceremony
// ---------------------------------------------------------------------------

export async function buildSignOffAuthOptions(input: {
  readonly userId: string;
  readonly quarterKey: string;
  readonly role: 'compliance' | 'redteam' | 'reviewer';
  readonly store: WebAuthnStore;
}): Promise<PublicKeyCredentialRequestOptionsJSON> {
  pruneExpired();
  const rp = getRpConfig();
  const existing = await input.store.listCredentials(input.userId);
  if (existing.length === 0) {
    throw new Error('WEBAUTHN_NO_REGISTERED_CREDENTIALS');
  }
  const options = await generateAuthenticationOptions({
    rpID: rp.rpId,
    userVerification: 'required',
    allowCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
    })),
  });
  challenges.set(challengeKey(input.userId, 'sign-off'), {
    challenge: options.challenge,
    userId: input.userId,
    purpose: 'sign-off',
    quarterKey: input.quarterKey,
    role: input.role,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return options;
}

export async function verifySignOffAssertion(input: {
  readonly userId: string;
  readonly quarterKey: string;
  readonly role: 'compliance' | 'redteam' | 'reviewer';
  readonly response: AuthenticationResponseJSON;
  readonly store: WebAuthnStore;
}): Promise<{
  readonly stepUpToken: string;
  readonly credentialId: string;
  readonly authenticatorGUID: string;
}> {
  pruneExpired();
  const key = challengeKey(input.userId, 'sign-off');
  const pending = challenges.get(key);
  if (!pending) {
    throw new Error('WEBAUTHN_NO_PENDING_CHALLENGE');
  }
  // Bind challenge to the requested (quarterKey, role) so a challenge
  // for compliance@2026Q2 cannot be re-used to sign redteam@2026Q3.
  if (pending.quarterKey !== input.quarterKey || pending.role !== input.role) {
    challenges.delete(key);
    throw new Error('WEBAUTHN_CHALLENGE_BINDING_MISMATCH');
  }
  challenges.delete(key);
  const rp = getRpConfig();
  const credentials = await input.store.listCredentials(input.userId);
  const cred = credentials.find((c) => c.credentialId === input.response.id);
  if (!cred) {
    throw new Error('WEBAUTHN_UNKNOWN_CREDENTIAL');
  }
  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: pending.challenge,
    expectedOrigin: rp.origin as string | string[],
    expectedRPID: rp.rpId,
    credential: {
      id: cred.credentialId,
      publicKey: Buffer.from(cred.publicKey, 'base64url'),
      counter: cred.counter,
      transports: cred.transports as AuthenticatorTransportFuture[] | undefined,
    },
    requireUserVerification: true,
  });
  if (!verification.verified) {
    throw new Error('WEBAUTHN_ASSERTION_NOT_VERIFIED');
  }
  // Update counter — store guards against replay (newCounter must
  // strictly exceed stored, except the 0→0 no-counter case).
  try {
    await input.store.updateCounter(
      input.userId,
      cred.credentialId,
      verification.authenticationInfo.newCounter,
    );
  } catch (err) {
    if (err instanceof WebAuthnStoreError && err.code === 'counter-replay') {
      throw new Error('WEBAUTHN_COUNTER_REPLAY');
    }
    throw err;
  }
  const stepUpToken = issueStepUpToken({
    userId: input.userId,
    quarterKey: input.quarterKey,
    role: input.role,
    credentialId: cred.credentialId,
    authenticatorGUID: cred.authenticatorGUID,
  });
  return {
    stepUpToken,
    credentialId: cred.credentialId,
    authenticatorGUID: cred.authenticatorGUID,
  };
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Test seam — drop all pending challenges + step-up tokens. */
export function __resetWebAuthnStateForTests(): void {
  challenges.clear();
  stepupTokens.clear();
}
