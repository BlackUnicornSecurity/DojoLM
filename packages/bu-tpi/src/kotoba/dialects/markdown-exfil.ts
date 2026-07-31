// SPDX-License-Identifier: Apache-2.0
/**
 * Gap 7 dialect: markdownExfil — hide payload in markdown image alt-text,
 * link-title, or reference-style link. Widely used in real-world prompt
 * injection against rendering models.
 *
 * Intensity picks which container:
 *   0 → identity
 *   (0, 0.34] → image alt-text: `![<payload>](x.png)`
 *   (0.34, 0.67] → link title: `[x](https://e.xyz "<payload>")`
 *   > 0.67 → reference definition + in-body reference
 */

import type { DialectGenerator } from '../dialect-types.js';
import { clampIntensity } from '../dialect-types.js';

// Escape the chars that would break out of the container. We keep `<` and
// `>` unescaped because most renderers treat them literally inside these
// contexts.
function escAlt(s: string): string {
  return s.replace(/]/g, '\\]').replace(/\r?\n/g, ' ');
}
function escTitle(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

export const markdownExfilDialect: DialectGenerator = {
  id: 'markdownExfil',
  label: 'Markdown Exfil',
  apply: (payload, intensity) => {
    const t = clampIntensity(intensity);
    if (t === 0) return payload;
    if (t <= 0.34) return `![${escAlt(payload)}](https://example.invalid/x.png)`;
    if (t <= 0.67) return `[click](https://example.invalid "${escTitle(payload)}")`;
    // Reference definition + in-body reference.
    const ref = 'p';
    return `[see][${ref}]\n\n[${ref}]: https://example.invalid "${escTitle(payload)}"`;
  },
  roundtrip: (encoded) => {
    // Try alt text.
    const alt = encoded.match(/^!\[([\s\S]*?)\]\([^)]+\)$/);
    if (alt) return alt[1]!.replace(/\\]/g, ']');
    // Try inline title.
    const inline = encoded.match(/^\[[^\]]*\]\([^\s]+\s+"([\s\S]*)"\)$/);
    if (inline) return inline[1]!.replace(/\\"/g, '"');
    // Try reference-style: `[xxx]: url "title"`
    const ref = encoded.match(/\[[^\]]+\]:\s*\S+\s+"([\s\S]*)"/);
    if (ref) return ref[1]!.replace(/\\"/g, '"');
    return encoded;
  },
};
