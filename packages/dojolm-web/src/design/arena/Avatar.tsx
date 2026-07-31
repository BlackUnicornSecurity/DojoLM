// SPDX-License-Identifier: Apache-2.0
import type { ReactElement } from 'react';

export interface AvatarProps {
  readonly handle: string;
  readonly size: number;
  readonly hue?: number;
  readonly testId?: string;
}

// Deterministic-color avatar primitive. First-letter glyph centered.
// Hue derived from `hue` prop OR hash of `handle`.
// Server-safe: no hooks, no client state.

function hashHue(input: string): number {
  // Cheap, stable djb2-style hash → 0..359
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  // Coerce to non-negative + mod 360
  const positive = h < 0 ? -h : h;
  return positive % 360;
}

function clampHue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const wrapped = ((value % 360) + 360) % 360;
  return Math.floor(wrapped);
}

function firstGlyph(handle: string): string {
  const trimmed = handle.trim();
  if (trimmed.length === 0) return '?';
  const first = trimmed.charAt(0);
  return first.toUpperCase();
}

export function Avatar({
  handle,
  size,
  hue,
  testId = 'avatar',
}: AvatarProps): ReactElement {
  const resolvedHue = hue !== undefined ? clampHue(hue) : hashHue(handle);
  const glyph = firstGlyph(handle);
  const fontSize = Math.max(8, Math.floor(size * 0.5));
  const background = `hsl(${resolvedHue} 60% 30%)`;
  const foreground = `hsl(${resolvedHue} 80% 80%)`;

  return (
    <div
      data-testid={testId}
      data-handle={handle}
      data-hue={resolvedHue}
      role="img"
      aria-label={`Avatar for ${handle}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background,
        color: foreground,
        fontSize,
        fontWeight: 600,
        flexShrink: 0,
        userSelect: 'none',
        lineHeight: 1,
      }}
    >
      {glyph}
    </div>
  );
}
