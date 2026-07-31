// SPDX-License-Identifier: Apache-2.0
/**
 * BrandFooterChip — the members `.app-foot` brand line.
 *
 * The design's member surfaces close every `.content` with
 * `<footer class="app-foot"><span class="cy"></span> Yamabushi · a
 * BlackUnicorn platform</footer>` (wave-c "Members Home v2.html":91,
 * wave-e Leaderboard/Seasons/Bypass Matrix, wave-h Seasons Archive). The
 * admin shell renders its own `.app-foot` from `shell-chrome.tsx`, but member
 * chrome does not (`showProductFooter === false` for the member variant), so
 * each member page mounts this footer at the end of its own content.
 *
 * Anatomy is the REF's, not the old code's: the prior F-1-033 torii `道.LM`
 * chip that once carried this filename was retired in the v2 conformity
 * migration (its system.css treatment deleted; the shell renders `.app-foot`
 * instead). This is a net-new component reusing the name, styled entirely by
 * the shared `[data-skin="v2"] .app-foot` rule (interaction.css) — plain mono
 * line, cyan pip, zero red. Imported by sub-path (never the shell barrel) per
 * the design-barrel darwin-perf discipline.
 */

export interface BrandFooterChipProps {
  /** Stable test id. Defaults to `brand-footer-chip`. */
  readonly testId?: string;
}

export function BrandFooterChip({
  testId = "brand-footer-chip",
}: BrandFooterChipProps = {}) {
  return (
    <footer className="app-foot" data-testid={testId}>
      <span className="cy" aria-hidden="true" />
      Yamabushi · a BlackUnicorn platform
    </footer>
  );
}
