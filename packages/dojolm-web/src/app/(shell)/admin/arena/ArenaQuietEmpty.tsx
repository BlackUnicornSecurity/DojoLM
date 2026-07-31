// SPDX-License-Identifier: Apache-2.0

interface ArenaQuietEmptyProps {
  readonly title: string;
  readonly sub: string;
  readonly testId: string;
}

/** A secondary Arena empty state that preserves the page's single red CTA. */
export function ArenaQuietEmpty({ title, sub, testId }: ArenaQuietEmptyProps) {
  return (
    <div
      className="empty-state compact arena-quiet-empty"
      role="status"
      aria-live="off"
      data-testid={testId}
      data-state="empty"
    >
      <div className="empty-copy">
        <div className="empty-title">{title}</div>
        <p className="empty-sub">{sub}</p>
        <div className="empty-actions">
          <a className="btn btn-ghost" href="/admin/arena?tab=wizard">
            Plan a match
          </a>
        </div>
      </div>
    </div>
  );
}
