// SPDX-License-Identifier: Apache-2.0
import type { Severity } from './Ticker';

export type FeedTagKind = 'block' | 'allow' | 'log' | 'warn' | 'muted';

export interface FeedTag {
  kind: FeedTagKind;
  label: string;
}

export interface FeedRowProps {
  ts: string;
  sev: Severity;
  msg: string;
  path?: string;
  tag: FeedTag;
  mode?: string;
}

export function FeedRow({ ts, sev, msg, path, tag, mode }: FeedRowProps) {
  return (
    <div className="drow feed-row">
      <span className="ts">{ts}</span>
      <span className={`sev-strip ${sev}`} />
      <span className="flex1 ellipsis">
        <b className="feed-row-msg">{msg}</b>
        {path && <span className="path"> · {path}</span>}
      </span>
      {mode && <span className="mono feed-row-mode">{mode}</span>}
      <span className={`tag ${tag.kind}`}>{tag.label}</span>
    </div>
  );
}
