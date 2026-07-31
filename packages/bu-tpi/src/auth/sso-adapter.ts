// SPDX-License-Identifier: Apache-2.0
/**
 * Pluggable auth provider per plan Section 0.1.0. The default provider
 * uses app-native accounts (`AppAccountProvider`); SSO is an optional
 * plugin. Concrete IdP wiring (Okta, Azure AD, Auth0) lands in Phase E.
 */

import type { Role } from '../rbac/roles.js';
import type { AuthenticatedPrincipal } from '../rbac/guard.js';

export interface AuthProvider {
  readonly id: string;
  resolve(token: string): Promise<AuthenticatedPrincipal | null>;
}

export interface AppAccount {
  readonly id: string;
  readonly roles: readonly Role[];
  readonly deviceFingerprint?: string;
}

export type AppAccountResolver = (
  token: string,
) => Promise<AppAccount | null>;

export class AppAccountProvider implements AuthProvider {
  readonly id = 'app-account' as const;

  constructor(private readonly resolver: AppAccountResolver) {}

  async resolve(token: string): Promise<AuthenticatedPrincipal | null> {
    const account = await this.resolver(token);
    if (!account) return null;
    return {
      accountId: account.id,
      providerId: this.id,
      deviceFingerprint: account.deviceFingerprint,
      roles: account.roles,
    };
  }
}

export interface SsoClaims {
  readonly id: string;
  readonly orgUnit: string;
  readonly roles: readonly Role[];
}

export type SsoTokenResolver = (token: string) => Promise<SsoClaims | null>;

export interface SsoProviderOptions {
  readonly id: string;
  readonly resolver: SsoTokenResolver;
}

export class SsoProvider implements AuthProvider {
  constructor(private readonly opts: SsoProviderOptions) {}

  get id(): string {
    return this.opts.id;
  }

  async resolve(token: string): Promise<AuthenticatedPrincipal | null> {
    const claims = await this.opts.resolver(token);
    if (!claims) return null;
    return {
      accountId: claims.id,
      providerId: this.id,
      orgUnit: claims.orgUnit,
      roles: claims.roles,
    };
  }
}

/**
 * Chain providers; first non-null principal wins. Useful when a deployment
 * wants SSO with a fallback to app-account for service users.
 */
export class ProviderChain implements AuthProvider {
  readonly id = 'chain' as const;

  constructor(private readonly providers: readonly AuthProvider[]) {
    if (providers.length === 0) {
      throw new Error('ProviderChain requires at least one provider');
    }
  }

  async resolve(token: string): Promise<AuthenticatedPrincipal | null> {
    for (const provider of this.providers) {
      const principal = await provider.resolve(token);
      if (principal) return principal;
    }
    return null;
  }
}
