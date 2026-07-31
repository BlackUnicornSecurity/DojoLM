// SPDX-License-Identifier: Apache-2.0
export interface GuardModeFlag {
  label: string;
  on: boolean;
}

export interface GuardMode {
  name: string;
  desc: string;
  flags: GuardModeFlag[];
  active?: boolean;
  /**
   * Neutral status chip shown top-right for a NON-active mode (e.g.
   * "Opt-in"). Active modes always show the jade "ACTIVE" chip instead.
   * Command Center v2.html:214 renders the Tanuki opt-in status this way.
   */
  statusLabel?: string;
}

export interface GuardModesProps {
  modes: GuardMode[];
}

export function GuardModes({ modes }: GuardModesProps) {
  return (
    <div className="guard-modes">
      {modes.map((m, i) => (
        <div key={i} className={`gmode ${m.active ? 'active' : ''}`.trim()}>
          <div className="gmode-top">
            <span className="gmode-name">{m.name}</span>
            {m.active ? (
              <span className="gmode-tag">
                <span className="dot" />ACTIVE
              </span>
            ) : m.statusLabel ? (
              <span className="chip gmode-status">
                <span className="dot" />
                {m.statusLabel}
              </span>
            ) : null}
          </div>
          <div className="gmode-desc">{m.desc}</div>
          <div className="gmode-flags">
            {m.flags.map((f, j) => (
              <span key={j} className={`flag ${f.on ? 'on' : ''}`.trim()}>
                {f.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
