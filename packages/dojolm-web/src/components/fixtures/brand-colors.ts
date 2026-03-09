/**
 * File: brand-colors.ts
 * Purpose: Shared brand color constants for fixture components
 * Story: KASHIWA 6.2
 *
 * Values match CSS vars --brand-* in globals.css.
 * Kept as hex constants (not var() refs) because they're used in
 * inline styles and string interpolation contexts.
 */

export const BRAND_COLORS: Record<string, string> = {
  DojoLM: '#D43A2C', // Brand identity — distinct from --dojo-primary (#CC3A2F) UI accent
  BonkLM: '#D4A843',
  Basileak: '#8B7BF5',
  PantheonLM: '#34C76A',
  Marfaak: '#E060A0',
  BlackUnicorn: '#565D6B',
}
