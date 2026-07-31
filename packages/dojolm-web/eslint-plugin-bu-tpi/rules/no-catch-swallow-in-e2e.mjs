// SPDX-License-Identifier: Apache-2.0
/**
 * G-A4 — bu-tpi/no-catch-swallow-in-e2e
 *
 * Forbids `.catch(() => {})` (and equivalents) anywhere inside Playwright
 * e2e specs. Silent swallow inside e2e fixtures was the root cause behind
 * the V1→V2 audit's "lying baselines" — `clickTab(...).catch(() => {})`
 * happily produced `admin-users.png` baselines for routes that never
 * existed.
 *
 * Implementation scope: this rule flags `.catch(handler)` where the
 * handler is `(...args) => {}` or `function (...) {}` with an EMPTY block
 * body — i.e. the literal silent-swallow pattern that produced the V1→V2
 * lying baselines. It does NOT statically analyze non-empty handlers for
 * "did they re-throw / assert / return a thenable" — that broader
 * analysis is out of scope and would require call-graph reasoning. For
 * non-empty handlers that effectively still swallow (e.g. `.catch(() =>
 * defaultValue)` without timeout discrimination), reviewers and the
 * interaction-parity sweep are the safety net.
 *
 * Suppress per call-site only with an explicit ticket reference:
 *   // eslint-disable-next-line bu-tpi/no-catch-swallow-in-e2e -- TICKET-ID rationale
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid silent .catch(() => {}) handlers in Playwright e2e specs',
      recommended: true,
    },
    schema: [],
    messages: {
      empty:
        '`.catch()` with an empty handler swallows errors silently in an e2e spec. ' +
        'Either assert (await expect(...).toBeVisible()) or remove the handler. ' +
        'See the e2e error-handling guidance.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.property.type !== 'Identifier' ||
          node.callee.property.name !== 'catch' ||
          node.arguments.length !== 1
        ) {
          return;
        }
        const handler = node.arguments[0];
        if (
          handler.type !== 'ArrowFunctionExpression' &&
          handler.type !== 'FunctionExpression'
        ) {
          return;
        }
        if (
          handler.body.type === 'BlockStatement' &&
          handler.body.body.length === 0
        ) {
          context.report({ node, messageId: 'empty' });
        }
      },
    };
  },
};
