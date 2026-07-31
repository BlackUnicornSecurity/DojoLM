// SPDX-License-Identifier: Apache-2.0
export type Severity = 'crit' | 'high' | 'med' | 'low';

export interface TickerItem {
  ts: string;
  sev: Severity;
  msg: string;
  tag: string;
}

export interface TickerProps {
  items: TickerItem[];
  /**
   * v2 (Yamabushi 1.2): label for the live indicator. Defaults to
   * `LIVE · 14:32 UTC`. Pass a static literal so the marquee stays
   * deterministic for visual-regression baselines.
   */
  liveLabel?: string;
  /**
   * v2: accessible-text override for screen readers. Defaults to a
   * generated comma-separated summary of `items`. Provide a custom
   * label only when the surrounding region already describes the feed.
   */
  ariaLabel?: string;
}

export function Ticker({
  items,
  liveLabel = 'LIVE · 14:32 UTC',
  ariaLabel,
}: TickerProps) {
  const doubled = [...items, ...items];
  const srLabel =
    ariaLabel ??
    `Live ticker: ${items.map((t) => `${t.ts} ${t.sev} ${t.msg}`).join('; ')}`;
  return (
    <div className="cmd-ticker" role="region" aria-label={srLabel}>
      <div className="cmd-ticker-label">
        <span className="dot pulse" aria-hidden="true" />
        {liveLabel}
      </div>
      <div className="cmd-ticker-track" aria-hidden="true">
        {doubled.map((t, i) => (
          <span key={i} className="tk">
            <span
              className={`sev-strip ${t.sev}`}
              style={{ height: 8, width: 8, borderRadius: 2 }}
            />
            <span className="mono mute">{t.ts}</span>
            <span>{t.msg}</span>
            <span className="mono mute">{t.tag}</span>
          </span>
        ))}
      </div>
      <ul className="cmd-ticker-sr">
        {items.map((t, i) => (
          <li key={i}>
            <span>{t.ts}</span> <span>{t.sev}</span> <span>{t.msg}</span> <span>{t.tag}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
