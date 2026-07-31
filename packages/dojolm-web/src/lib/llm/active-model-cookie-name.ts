// SPDX-License-Identifier: Apache-2.0
/**
 * Active Model Switcher — the cookie name shared between the
 * client-side `<ActiveModelProvider>` (writes) and the server-side
 * inference routes (reads, in Story B). Lives in its own tiny
 * module so client components can import the name without pulling
 * in any server-only dependencies.
 */
export const ACTIVE_MODEL_COOKIE_NAME = 'noda-active-model';
