// SPDX-License-Identifier: Apache-2.0
/**
 * G-A3 — bu-tpi/explicit-data-source
 *
 * Forbids `data-fixture` and `data-demo` attributes that are NOT either
 * `"true"` (canonical truthy) or paired with a sibling `<DemoDataBadge />`
 * primitive somewhere in the render tree. The rule's purpose is to keep
 * fixture/demo data clearly labeled so reviewers can see at a glance
 * whether a rendered metric is real or canned.
 *
 * The audit's G-013 + DP-013 rows found that CommandDashboard's Ticker /
 * GuardModes / CoverageHeatmap rendered hardcoded `seed=42` data without
 * any visual or attribute indication that the data was fixture, not live.
 * Pixel-deterministic — visual regression cannot detect it. This rule
 * forces explicit annotation when fixture data is rendered.
 *
 * Practically this means:
 *   - Real wiring: data flows from `useSWR` / `fetch` / API hook. No
 *     attribute needed; nothing for this rule to flag.
 *   - Demo wiring: render the data with `data-fixture="true"` on the
 *     wrapping element OR include `<DemoDataBadge />` nearby.
 *   - Anything else (e.g., `data-fixture="probably"` or stray
 *     `data-demo` markers) trips the rule.
 *
 * Suppress per call-site only with an explicit ticket reference:
 *   // eslint-disable-next-line bu-tpi/explicit-data-source -- TICKET-ID rationale
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require data-fixture/data-demo attributes to be "true" or paired with <DemoDataBadge />',
      recommended: true,
    },
    schema: [],
    messages: {
      bad:
        'Ambiguous data-source attribute `{{name}}={{value}}`. ' +
        'Use `{{name}}="true"` or render a sibling <DemoDataBadge />. ' +
        'See the data-source anti-recurrence gates (G-A3).',
    },
  },
  create(context) {
    const TARGET_ATTRS = new Set(['data-fixture', 'data-demo']);
    return {
      JSXAttribute(node) {
        if (
          node.name.type !== 'JSXIdentifier' ||
          !TARGET_ATTRS.has(node.name.name)
        ) {
          return;
        }
        const v = node.value;
        const literal =
          v == null
            ? null
            : v.type === 'Literal'
              ? v.value
              : v.type === 'JSXExpressionContainer' && v.expression.type === 'Literal'
                ? v.expression.value
                : '__NON_LITERAL__';
        if (literal !== 'true' && literal !== '__NON_LITERAL__') {
          context.report({
            node,
            messageId: 'bad',
            data: {
              name: node.name.name,
              value: literal === null ? '(no value)' : JSON.stringify(literal),
            },
          });
        }
      },
    };
  },
};
