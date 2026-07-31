// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties } from 'react';

export interface TechniqueCardProps {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly exampleTriggerPhrase?: string;
  readonly tags?: readonly string[];
  readonly references?: readonly string[];
  readonly className?: string;
  readonly style?: CSSProperties;
}

// TechniqueCard — catalog entry for a jailbreak technique. Used on
// /admin/eval as a drill-down drawer (Gap 13.5) and in canvas-04
// artboards. Server-safe, read-only. All strings render as JSX text
// children; React escapes them so there is no raw-HTML sink.
export function TechniqueCard({
  id,
  label,
  description,
  exampleTriggerPhrase,
  tags = [],
  references = [],
  className = '',
  style,
}: TechniqueCardProps) {
  return (
    <article
      className={`codex-technique-card ${className}`.trim()}
      style={style}
      data-testid="codex-technique-card"
      data-technique-id={id}
    >
      <header className="codex-technique-card-head">
        <span className="codex-technique-card-id">{id}</span>
        <h4 className="codex-technique-card-label">{label}</h4>
      </header>
      <p className="codex-technique-card-desc">{description}</p>
      {exampleTriggerPhrase && (
        <pre
          className="codex-technique-card-example"
          aria-label="Example trigger phrase"
        >
          {exampleTriggerPhrase}
        </pre>
      )}
      {tags.length > 0 && (
        <ul className="codex-technique-card-tags" aria-label="Tags">
          {tags.map((t) => (
            <li key={t} className="codex-technique-card-tag">
              {t}
            </li>
          ))}
        </ul>
      )}
      {references.length > 0 && (
        <ul className="codex-technique-card-refs" aria-label="References">
          {references.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
