// SPDX-License-Identifier: Apache-2.0
/**
 * FilterSelect — one labelled native <select> filter axis, shared by the Room
 * proof + case filter bars (P1.2). Native control: accessible, no custom popover
 * slop. House select tokens only.
 */

'use client';

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  testId: string;
}) {
  return (
    <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, fontSize: 11, color: 'var(--fg-mute)' }}>
      {label}
      <select
        value={value}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: '4px 6px', fontSize: 12, background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--b-1)', borderRadius: 4 }}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
