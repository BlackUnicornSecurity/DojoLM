// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties } from 'react';
import { Seal, type SealState } from './Seal';

export interface SignatureBlockProps {
  readonly role: string;
  readonly name?: string;
  readonly date?: string;
  readonly phrase?: string;
  readonly signed: boolean;
  readonly revoked?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly testId?: string;
}

// SignatureBlock — one attestation row on a Ritual scroll. Signed
// renders the name + date + wax seal; unsigned shows the phrase
// instruction with a striped hatch background so the operator can't
// mistake it for a completed row.
//
// Server-safe. Every string renders as a JSX text child so React
// escaping applies — no raw-HTML sink.
export function SignatureBlock({
  role,
  name,
  date,
  phrase,
  signed,
  revoked = false,
  className = '',
  style,
  testId,
}: SignatureBlockProps) {
  const state: SealState = revoked ? 'revoked' : signed ? 'signed' : 'pending';
  const unsigned = !signed && !revoked;
  const classes = [
    'ritual-signature-block',
    unsigned ? 'unsigned' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={classes}
      style={style}
      data-testid={testId ?? 'ritual-signature-block'}
      data-state={state}
    >
      <Seal state={state} />
      <div className="ritual-signature-meta">
        <span className="ritual-signature-role">{role}</span>
        {signed && name ? (
          <span className="ritual-signature-name">{name}</span>
        ) : (
          <span className="ritual-signature-name">
            {unsigned ? (phrase ? `Type “${phrase}” to sign` : 'Unsigned') : 'Revoked'}
          </span>
        )}
        {date && <span className="ritual-signature-date">{date}</span>}
        {phrase && !signed && !revoked && (
          <span className="ritual-signature-phrase">
            requires phrase: <code>{phrase}</code>
          </span>
        )}
      </div>
    </div>
  );
}
