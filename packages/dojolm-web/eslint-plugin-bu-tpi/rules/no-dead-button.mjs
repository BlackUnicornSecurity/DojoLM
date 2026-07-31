// SPDX-License-Identifier: Apache-2.0
/**
 * G-A2 — bu-tpi/no-dead-button
 *
 * Forbids `<button>` JSX elements that have neither `onClick`, `onSubmit`,
 * `disabled`, nor a `type="submit"`/`type="reset"` attribute (i.e., a
 * submit button inside a form). The audit found 8 dead buttons in V2 that
 * looked interactive but were no-ops (CommandDashboard CTAs + TopBar icon
 * buttons).
 *
 * The rule does NOT walk up the AST to detect `<form>` / `<Link>`
 * wrapping; instead it accepts those cases via attribute discipline:
 *   - `<button type="submit">` inside a form is the canonical Submit
 *     pattern and is treated as wired.
 *   - A button standing in for navigation should use `<Link>` directly,
 *     not `<button>` (the React/Next.js convention).
 *   - `<button popovertarget="...">` is the HTML5-native popover wiring
 *     and definitionally pairs the button to a target element.
 *   - `<button aria-haspopup="...">` indicates the button controls a
 *     popup; common Radix/Headless-UI trigger pattern where the actual
 *     onClick is bound through React context rather than visible JSX.
 * Anything else needs an explicit suppression comment with a ticket ref:
 *   // eslint-disable-next-line bu-tpi/no-dead-button -- v1-v2-restore-X
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid <button> without onClick/onSubmit/disabled/type=submit',
      recommended: true,
    },
    schema: [],
    messages: {
      dead:
        '<button> has no `onClick`, `onSubmit`, `disabled`, or `type="submit"|"reset"`. ' +
        'Wire a handler, use <Link> for navigation, or add a ticket-tagged eslint-disable comment.',
    },
  },
  create(context) {
    const ALLOWED = new Set([
      'onClick',
      'onSubmit',
      'disabled',
      'popovertarget',
      'aria-haspopup',
    ]);
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'button') {
          return;
        }
        let hasHandler = false;
        for (const attr of node.attributes) {
          if (attr.type === 'JSXSpreadAttribute') {
            // Spread attributes may carry a handler at runtime; trust them.
            hasHandler = true;
            break;
          }
          if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') {
            continue;
          }
          const attrName = attr.name.name;
          if (ALLOWED.has(attrName)) {
            hasHandler = true;
            break;
          }
          if (attrName === 'type') {
            const v = attr.value;
            const literal =
              v && v.type === 'Literal'
                ? v.value
                : v && v.type === 'JSXExpressionContainer' && v.expression.type === 'Literal'
                  ? v.expression.value
                  : null;
            if (literal === 'submit' || literal === 'reset') {
              hasHandler = true;
              break;
            }
          }
        }
        if (!hasHandler) {
          context.report({ node, messageId: 'dead' });
        }
      },
    };
  },
};
