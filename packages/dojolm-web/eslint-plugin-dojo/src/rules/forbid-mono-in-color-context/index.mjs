// SPDX-License-Identifier: Apache-2.0
/**
 * dojo/forbid-mono-in-color-context (E1.S6 — Token Discipline)
 *
 * Rejects use of FONT-FAMILY tokens (`var(--mono)`, `var(--sans)`,
 * `var(--serif)`) inside color-context CSS properties on JSX inline
 * `style={...}` objects in `src/design/**\/*.tsx`. The font tokens are
 * declared at `src/design/styles/tokens.css:99-101` as font-family
 * stacks (`"Inter", ...`, `"JetBrains Mono", ...`, etc.) — using them
 * as a color value resolves to an invalid color and the renderer falls
 * through to whatever fallback is provided. The fallback chain
 * (e.g., `var(--mono, #1a1a1a)`) makes the bug LOOK intentional while
 * silently bypassing the design-system token vocabulary.
 *
 * Retires:
 *   - F-1-006 (P3) — `--mono` mis-used as color fallback (TrainingScroll
 *     and similar surfaces).
 *
 * Detection:
 *   - Walks every Property node. If the key is a color-context CSS
 *     property (color | background | background-color | border* |
 *     outline* | borderColor | outlineColor | etc.) AND the value
 *     is a string literal containing `var(--<font-token>)`, report.
 *   - Visiting Property (not just JSXAttribute=style) catches the
 *     three idiomatic patterns:
 *       1. JSX inline:        style={{ color: 'var(--mono)' }}
 *       2. Hoisted const:     const S: CSSProperties = { color: 'var(--mono)', ... }
 *       3. Object.freeze:     Object.freeze({ color: 'var(--mono)', ... })
 *     All three resolve to the same runtime bug; the rule treats
 *     them the same. The key+value combination is specific enough
 *     that false-positives on unrelated objects are vanishingly
 *     unlikely (you'd need an object whose key happens to match a
 *     CSS color property AND whose string value happens to contain
 *     `var(--<font-token>)`).
 *   - Font tokens scanned: --mono, --sans, --serif (the three
 *     font-family declarations in tokens.css :99-101).
 *
 * Allowed:
 *   - `{ fontFamily: 'var(--mono)' }` — fontFamily is the legitimate
 *     use site for these tokens.
 *   - `{ color: 'var(--torii)' }` — real color tokens pass.
 *   - Spread / computed keys / dynamic identifier values — skipped
 *     (rule is conservative; prefers false negatives over false
 *     positives, mirroring forbid-tailwind-in-design-tsx).
 *
 * Sweep of existing violations is deferred to E1.S7.
 */

// Font-family tokens declared at tokens.css:99-101. These are the
// FORBIDDEN values when they appear inside a color-context property.
const FONT_TOKENS = ['--mono', '--sans', '--serif'];

// Pre-built regex matching `var(--<font-token>...)` — captures the
// token-name in group 1 so the report message can name the offender.
// Tolerates whitespace inside `var(...)`. Optional fallback after a
// comma (e.g., `var(--mono, #1a1a1a)`) is allowed in the body and
// counted as the same violation — the bug F-1-006 cited fallback-form
// specifically, so we MUST flag fallback-form too.
const FONT_VAR_PATTERN = new RegExp(
  // var ( --tok [, fallback] )
  '\\bvar\\(\\s*(' +
    FONT_TOKENS.map((t) => t.replace(/-/g, '\\-')).join('|') +
    ')\\s*(?:,[^)]*)?\\)',
);

// CSS properties that establish a "color context" — the visual paint of
// the box. Listed in their JS-style camelCase (the form a JSX style
// object uses); CSS-style kebab-case names are NOT relevant for inline
// `style={{...}}` because React rejects them at the type level.
//
// Note `background` (the shorthand) is included — a font-family stack
// inside `background: var(--mono)` is just as broken as inside the
// long-hand `backgroundColor`.
const COLOR_CONTEXT_PROPERTIES = new Set([
  'color',
  'background',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderInlineColor',
  'borderInlineStartColor',
  'borderInlineEndColor',
  'borderBlockColor',
  'borderBlockStartColor',
  'borderBlockEndColor',
  'outlineColor',
  'fill',
  'stroke',
  'caretColor',
  'columnRuleColor',
  'textDecorationColor',
  'textEmphasisColor',
  'accentColor',
  // Border / outline shorthands. The shorthand carries an optional
  // color-token in its value (`border: 1px solid var(--mono, #1a1a1a)`)
  // — F-1-006 is the textbook example of this.
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'borderInline',
  'borderBlock',
  'outline',
]);

/**
 * Pull a string value out of an ObjectExpression Property's `value`
 * node. Returns `null` when the value isn't a static string we can
 * inspect (identifiers, member expressions, function calls — all
 * conservatively skipped to avoid false positives).
 */
function extractStaticString(valueNode) {
  if (!valueNode) return null;
  if (valueNode.type === 'Literal' && typeof valueNode.value === 'string') {
    return valueNode.value;
  }
  if (valueNode.type === 'TemplateLiteral' && valueNode.expressions.length === 0) {
    // No interpolations — safe to read the cooked form.
    return valueNode.quasis.map((q) => q.value.cooked).join('');
  }
  return null;
}

/**
 * Resolve a Property's key name to a string. Handles both Identifier
 * (`color: ...`) and Literal (`'color': ...`) forms. Returns null for
 * computed keys (`[someName]: ...`) — those are dynamic and cannot
 * be statically classified.
 */
function getKeyName(propertyNode) {
  if (propertyNode.computed) return null;
  if (!propertyNode.key) return null;
  if (propertyNode.key.type === 'Identifier') return propertyNode.key.name;
  if (
    propertyNode.key.type === 'Literal' &&
    typeof propertyNode.key.value === 'string'
  ) {
    return propertyNode.key.value;
  }
  return null;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid font-family tokens (--mono / --sans / --serif) in color-context ' +
        'inline-style properties. The font tokens are font-family stacks; ' +
        'using them as a color value silently falls through to the fallback ' +
        '(or transparent) and bypasses the design-system color vocabulary.',
      recommended: true,
      url: 'https://github.com/BlackUnicornSecurity/DojoLM/blob/main/packages/dojolm-web/eslint-plugin-dojo/src/rules/forbid-mono-in-color-context/README.md',
    },
    schema: [],
    messages: {
      fontInColor:
        'Font-family token "{{token}}" used in color-context property "{{property}}". ' +
        'Font tokens (--mono, --sans, --serif) are font-family stacks declared at ' +
        'tokens.css:99-101 — they cannot resolve to a color and the renderer falls ' +
        'through to the fallback. Use a real color token (e.g., var(--torii), ' +
        'var(--fg), var(--ink)) or fontFamily: var({{token}}) if you meant ' +
        'to set the font. (E1.S6, retires F-1-006)',
    },
  },

  create(context) {
    function checkProperty(propertyNode) {
      // Skip spread elements (`...rest`) and shorthand non-key properties.
      if (propertyNode.type !== 'Property') return;
      const keyName = getKeyName(propertyNode);
      if (!keyName) return;
      if (!COLOR_CONTEXT_PROPERTIES.has(keyName)) return;
      const valueStr = extractStaticString(propertyNode.value);
      if (valueStr === null) return;
      const match = FONT_VAR_PATTERN.exec(valueStr);
      if (!match) return;
      const token = match[1]; // --mono / --sans / --serif
      context.report({
        node: propertyNode,
        messageId: 'fontInColor',
        data: {
          token,
          property: keyName,
        },
      });
    }

    return {
      // Visit every Property node directly. The key+value combination
      // (color-context CSS property whose string value contains
      // `var(--<font-token>)`) is specific enough that we don't need
      // to gate on the parent context — any object literal carrying
      // that shape is a token-discipline regression. This catches
      // JSX inline `style={{...}}`, hoisted `const S: CSSProperties = {...}`,
      // and `Object.freeze({...})` patterns alike.
      Property(node) {
        checkProperty(node);
      },
    };
  },
};
