// SPDX-License-Identifier: Apache-2.0
import { Fragment, type CSSProperties, type ReactNode } from 'react';

export interface PaperEntryProvenanceField {
  readonly label: string;
  readonly value: ReactNode;
}

export interface PaperEntryProps {
  readonly provenance: readonly PaperEntryProvenanceField[];
  readonly body: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

// PaperEntry — archival-entry card for a single leak / provenance
// record. This is the "parchment" card flagged in Epic 5 spec: §5
// reserves .panel.paper for Ritual, so this primitive ships on a
// dark card with a warm gold accent stripe on the left edge. No
// paper texture, no off-white background — the archival metaphor
// lives in the accent + monospace provenance key/value list only.
//
// Server-safe. `body` is rendered as a plain text node (React
// escapes) — no raw HTML sinks.
export function PaperEntry({
  provenance,
  body,
  className = '',
  style,
}: PaperEntryProps) {
  return (
    <article
      className={`codex-paper-entry ${className}`.trim()}
      style={style}
      data-testid="codex-paper-entry"
    >
      {provenance.length > 0 && (
        <dl className="codex-paper-entry-provenance">
          {provenance.map((field) => (
            <Fragment key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      <pre className="codex-paper-entry-body">{body}</pre>
    </article>
  );
}
