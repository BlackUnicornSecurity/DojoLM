// SPDX-License-Identifier: Apache-2.0
/**
 * Barrel for bu-tpi/auth.
 */
export {
  AppAccountProvider,
  SsoProvider,
  ProviderChain,
} from './sso-adapter.js';
export type {
  AuthProvider,
  AppAccount,
  AppAccountResolver,
  SsoClaims,
  SsoTokenResolver,
  SsoProviderOptions,
} from './sso-adapter.js';
export {
  InMemoryWebAuthnStore,
  WebAuthnStoreError,
  validateCredentialId,
  validateUserId,
} from './webauthn-store.js';
export type {
  WebAuthnCredential,
  WebAuthnStore,
  WebAuthnStoreErrorCode,
} from './webauthn-store.js';
