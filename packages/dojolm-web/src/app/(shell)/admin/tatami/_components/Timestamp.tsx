// SPDX-License-Identifier: Apache-2.0
/**
 * Timestamp — render an ISO-8601 instant as a human-readable `<time>` (HC-2.B
 * m-3). Shows the humanised `YYYY-MM-DD HH:MM UTC` form (see `formatTimestamp`)
 * while keeping the EXACT machine value in `dateTime` + `title`, so copy / hover
 * / assistive tech still get full millisecond precision. The Tatami tables and
 * the receipt drawer previously printed the raw `2026-06-22T20:57:57.801Z`.
 *
 * A `<time>` must carry a VALID `datetime`, so we emit one only for a parseable
 * instant. An absent value (em-dash) OR an unparseable one (`formatTimestamp`
 * returns it verbatim) degrades to a plain `<span>` instead — never a `<time>`
 * with junk in `datetime`, which screen readers / structured-data parsers reject.
 */
import type { CSSProperties } from 'react';
import { formatTimestamp } from '../_lib';

export function Timestamp({
  iso,
  className,
  style,
}: {
  iso: string | undefined;
  className?: string;
  style?: CSSProperties;
}) {
  const formatted = iso ? formatTimestamp(iso) : '—';
  // `formatted === iso` ⇒ the value did not parse (returned verbatim); a humanised
  // instant is always `YYYY-MM-DD HH:MM UTC`, which never equals its ISO input.
  if (!iso || formatted === iso) {
    return <span className={className} style={style}>{formatted}</span>;
  }
  return (
    <time className={className} dateTime={iso} title={iso} style={style}>
      {formatted}
    </time>
  );
}
