// SPDX-License-Identifier: Apache-2.0
/**
 * RequiredAsterisk — accessible required-field marker primitive.
 *
 * Story: E9.S7 (retires F-6-010 P1, F-4-020 P2 part) — every
 * `<input required>` across `/setup`, `/admin/api-keys`, and
 * `/admin/onigaeshi` historically rendered a bare visual asterisk in
 * the label text, which fails:
 *   - WCAG 2.2 SC 1.3.1 (Info and Relationships): the asterisk is
 *     decorative and carries no programmatic meaning; AT users do not
 *     hear "required" on the label-read.
 *   - WCAG 2.2 SC 3.3.2 (Labels or Instructions): the requirement is
 *     not exposed in the accessibility tree; sighted-only convention.
 *
 * Render contract:
 *   - Visible: an aria-hidden="true" gold asterisk, decorative for
 *     sighted users.
 *   - Audible: a `<span class="dojo-sr-only">required</span>` so screen
 *     readers announce "required" when the label is read. The
 *     `dojo-sr-only` utility is the design-system visibility primitive
 *     (clip-path off-canvas; never
 *     `display: none` because that would also remove it from the
 *     accessibility tree).
 *
 * Pair with `aria-required="true"` on the corresponding input — this
 * primitive only annotates the LABEL. The duplication (sr-only "required"
 * + `aria-required` on the input) is intentional: `aria-required` is the
 * programmatic flag, and the sr-only span is the narrated word that
 * lands when the label reads. AT screen readers vary on how they
 * announce `aria-required`, so the explicit text is the safety net.
 */

interface RequiredAsteriskProps {
  /**
   * Optional class to layer on the wrapper. Defaults to nothing —
   * callers should not need to override; the `data-required-marker`
   * attribute is the stable hook for tests and any per-surface CSS.
   */
  readonly className?: string;
  /**
   * Paper forms spell the requirement out instead of using a red glyph.
   * The default keeps the established asterisk + screen-reader contract.
   */
  readonly variant?: "asterisk" | "word";
}

export function RequiredAsterisk({
  className,
  variant = "asterisk",
}: RequiredAsteriskProps) {
  if (variant === "word") {
    return (
      <span
        className={className}
        data-required-marker=""
        data-required-variant="word"
        style={{ marginLeft: 6 }}
      >
        {" "}
        <span aria-hidden="true">required</span>
        <span className="dojo-sr-only">required</span>
      </span>
    );
  }

  return (
    <span
      className={className}
      data-required-marker=""
      data-required-variant="asterisk"
      style={{ marginLeft: 4 }}
    >
      <span aria-hidden="true" style={{ color: "var(--gold)" }}>
        *
      </span>
      <span className="dojo-sr-only">required</span>
    </span>
  );
}
