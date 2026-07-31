// SPDX-License-Identifier: Apache-2.0
/**
 * dojo/forbid-tailwind-in-design-tsx (E1.S5 — Token Discipline)
 *
 * Rejects Tailwind utility classes in `src/design/**\/*.tsx`. The design
 * system is the single source of truth for the V2 design vocabulary
 * (`tokens.css` Layer-3 + the `dojo-`-style component classes); leaking
 * Tailwind utilities into a design primitive bypasses that vocabulary
 * and forks the visual contract per-call-site.
 *
 * Retires:
 *   - F-1-013 (P2) — Tailwind in `src/design/workbench/ThreatRadarWidget.tsx`
 *   - parts of F-2-201 / F-2-225 — Tailwind drift in design surfaces
 *
 * Allowlist:
 *   - `motion-safe:<utility>` and `motion-reduce:<utility>` — per
 *     shadcn motion-pref integration patterns. The design system does
 *     NOT yet have its own motion-pref primitives, so these two
 *     responsive prefixes pass through.
 *   - Empty `className=""` — valid React; no tokens to inspect.
 *   - Class tokens that don't match a known Tailwind utility pattern —
 *     dojo design-system classes (`dojo-*`, `arena-*`, `aivss-*`,
 *     `attack-log-*`, `panel`, `chip`, `card`, `btn`, etc.) are
 *     application vocabulary and pass through unchanged.
 *
 * Detection:
 *   - Static string literals: `className="flex items-center"`.
 *   - Template literals: `className={`flex ${cond}`}`. Walks `quasis`
 *     and tokenizes each cooked chunk.
 *   - Logical-and / conditional / call-expression argument shapes are
 *     deliberately NOT walked — they're often `clsx(...)` / `cn(...)`
 *     with runtime branches, and false-positives on those would erode
 *     trust in the rule. The static-literal coverage catches the F-1-013
 *     class of regression (the dominant pattern in src/design/).
 *
 * Steps:
 *   1. Iterate JSXAttribute[name.name="className"].
 *   2. Collect candidate cooked strings.
 *   3. Split on whitespace; reject any token matching the Tailwind
 *      utility regex unless it has a `motion-(safe|reduce):` prefix.
 */

// Tailwind utility heuristic. Matches the shapes that actually appear in
// our codebase plus the most common shadcn/Tailwind patterns. Deliberately
// conservative to avoid false-positives on dojo vocabulary; we'd rather
// miss a rare Tailwind utility than fail-lint a design class. When new
// patterns are spotted, add to this regex (with a // comment) rather
// than widening the allowlist.
const TAILWIND_PATTERNS = [
  // Layout
  /^flex$/,
  /^flex-(row|col|wrap|nowrap|none|auto|initial|1)$/,
  /^grid$/,
  /^grid-(rows|cols|flow|none)-/,
  /^(inline|inline-block|inline-flex|inline-grid|block|hidden|contents|flow-root|table|table-cell|table-row|list-item)$/,
  /^float-(left|right|none|start|end)$/,
  /^clear-(left|right|both|none|start|end)$/,
  /^(absolute|relative|sticky|fixed|static)$/,
  /^isolate$/,
  /^isolation-(auto|isolate)$/,
  /^(top|right|bottom|left|inset|inset-x|inset-y|start|end)-/,
  /^z-/,

  // Box model — spacing
  /^(p|m)-/,
  /^(p|m)[xytrbls]-/,
  /^space-[xy]-/,
  /^gap-/,
  /^gap-[xy]-/,

  // Sizing
  /^(w|h|min-w|min-h|max-w|max-h|size)-/,
  /^aspect-/,

  // Typography
  /^text-(xs|sm|base|lg|xl|\d+xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|opacity-)/,
  /^text-[a-z]+-\d+$/, // text-red-500 etc.
  /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|sans|serif|mono|stretch-)/,
  /^leading-/,
  /^tracking-/,
  /^whitespace-/,
  /^break-/,
  /^truncate$/,
  /^uppercase$|^lowercase$|^capitalize$|^normal-case$/,
  /^underline$|^overline$|^line-through$|^no-underline$/,
  /^italic$|^not-italic$/,
  /^antialiased$|^subpixel-antialiased$/,
  /^placeholder-/,
  /^decoration-/,
  /^underline-offset-/,
  /^indent-/,
  /^align-(baseline|top|middle|bottom|text-top|text-bottom|sub|super)$/,

  // Background / border
  /^bg-/,
  /^border$|^border-[trblxy]$|^border-(\d+|[a-z]+)/,
  /^rounded(-|$)/,
  /^divide-[xy](-|$)/,
  /^outline(-|$)/,
  /^ring(-|$)/,
  /^shadow(-|$)/,

  // Effects
  /^opacity-/,
  /^mix-blend-/,
  /^bg-blend-/,
  /^backdrop-/,
  /^blur(-|$)/,
  /^brightness-/,
  /^contrast-/,
  /^drop-shadow(-|$)/,
  /^grayscale$|^grayscale-/,
  /^hue-rotate-/,
  /^invert$|^invert-/,
  /^saturate-/,
  /^sepia$|^sepia-/,
  /^filter$|^filter-none$/,

  // Flex/Grid alignment
  /^items-(start|end|center|baseline|stretch)$/,
  /^justify-(start|end|center|between|around|evenly|stretch|items-|self-|normal)/,
  /^content-(center|start|end|between|around|evenly|stretch|baseline|normal)$/,
  /^self-(auto|start|end|center|stretch|baseline)$/,
  /^place-(items|content|self)-/,
  /^order-/,
  /^col-(span|start|end|auto)/,
  /^row-(span|start|end|auto)/,

  // Overflow / Position
  /^overflow-(auto|hidden|clip|visible|scroll|x-|y-)/,
  /^overscroll-/,

  // Transitions / animation
  /^transition(-|$)/,
  /^duration-/,
  /^ease-/,
  /^delay-/,
  /^animate-/,

  // Transforms
  /^transform$|^transform-(none|gpu|cpu)$/,
  /^translate-[xy]-/,
  /^rotate-/,
  /^scale-[xy]?-/,
  /^skew-[xy]-/,
  /^origin-/,

  // Interactivity
  /^cursor-/,
  /^select-(none|text|all|auto)$/,
  /^pointer-events-(none|auto)$/,
  /^resize(-|$)/,
  /^touch-/,
  /^scroll-/,
  /^snap-/,
  /^accent-/,
  /^caret-/,
  /^will-change-/,

  // Visibility
  /^visible$|^invisible$|^collapse$/,
  /^sr-only$|^not-sr-only$/,

  // Object fit
  /^object-(contain|cover|fill|none|scale-down|center|top|bottom|left|right)$/,

  // Tables
  /^table-(auto|fixed|caption-)/,
  /^border-(collapse|separate|spacing-)/,

  // Lists
  /^list-(disc|decimal|none|inside|outside|image-)/,

  // SVG
  /^fill-(none|current|inherit|transparent)$|^fill-[a-z]+-\d+$/,
  /^stroke-/,

  // Misc layout
  /^columns-/,
  /^break-(before|after|inside)-/,
  /^box-(border|content)$/,
  /^container$/,
];

// Tailwind responsive / state / variant prefixes. If a token starts with
// `<prefix>:`, strip the prefix and re-test the suffix. `motion-safe`
// and `motion-reduce` get the explicit allowlist treatment — they're
// the only motion-pref escape hatch available today.
const ALLOWED_PREFIXES = new Set(['motion-safe', 'motion-reduce']);

// Other Tailwind variant prefixes. A Tailwind utility carrying these
// prefixes still counts as Tailwind; we strip the prefix and test the
// utility part.
const TAILWIND_VARIANTS =
  /^(sm|md|lg|xl|2xl|dark|light|hover|focus|focus-within|focus-visible|active|visited|target|first|last|odd|even|disabled|enabled|checked|indeterminate|placeholder-shown|autofill|read-only|empty|required|valid|invalid|in-range|out-of-range|group(-[a-z][a-z-]*)?|peer(-[a-z][a-z-]*)?|print|portrait|landscape|rtl|ltr|open|aria-[a-z][a-z-]*|data-[a-z][a-z-]*|has-\[.+\]|not-\[.+\])$/;

function looksLikeTailwind(token) {
  if (!token) return false;
  // Strip arbitrary-value brackets — Tailwind's `bg-[#hex]` form. We
  // detect the prefix part only.
  const bareToken = token.replace(/\[.+?\]$/, '');
  for (const pat of TAILWIND_PATTERNS) {
    if (pat.test(bareToken)) return true;
  }
  return false;
}

/**
 * Inspect a class token. Returns true if it's a Tailwind utility AND not
 * covered by an allowed prefix.
 */
function isForbiddenToken(token) {
  if (!token) return false;
  // Strip variant prefix(es); Tailwind allows nesting (`md:hover:flex`).
  let core = token;
  while (core.includes(':')) {
    const [prefix, ...rest] = core.split(':');
    const remainder = rest.join(':');
    if (ALLOWED_PREFIXES.has(prefix)) {
      // motion-safe: / motion-reduce: passes through regardless of body.
      return false;
    }
    if (TAILWIND_VARIANTS.test(prefix)) {
      // Strip and continue. If the remainder is itself prefixed
      // (md:hover:flex), the loop iterates.
      core = remainder;
      continue;
    }
    // Non-Tailwind, non-allowed prefix — stop and test the whole thing.
    break;
  }
  return looksLikeTailwind(core);
}

/**
 * Tokenize a candidate className value (a string) into individual class
 * names. Tailwind tolerates multiple consecutive spaces.
 */
function tokenize(str) {
  return str.split(/\s+/).filter(Boolean);
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid Tailwind utility classes inside src/design/**.tsx. The design ' +
        'system owns the visual vocabulary; Tailwind utilities at design-primitive ' +
        'sites bypass that vocabulary and fork the contract per-call-site.',
      recommended: true,
      url: 'https://github.com/BlackUnicornSecurity/DojoLM/blob/main/packages/dojolm-web/eslint-plugin-dojo/src/rules/forbid-tailwind-in-design-tsx/README.md',
    },
    schema: [],
    messages: {
      tailwind:
        'Tailwind utility "{{token}}" is forbidden in src/design/**.tsx. ' +
        'Express the style via a `dojo-*` design-system class or the ' +
        'component\'s CSS module. Allowlist: `motion-safe:` and ' +
        '`motion-reduce:` prefixes pass through. (E1.S5)',
    },
  },

  create(context) {
    function checkValue(rawValue, node) {
      const tokens = tokenize(rawValue);
      for (const tok of tokens) {
        if (isForbiddenToken(tok)) {
          context.report({
            node,
            messageId: 'tailwind',
            data: { token: tok },
          });
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (
          !node.name ||
          node.name.type !== 'JSXIdentifier' ||
          node.name.name !== 'className'
        ) {
          return;
        }
        const value = node.value;
        if (!value) return;
        // <div className="literal" />
        if (value.type === 'Literal' && typeof value.value === 'string') {
          checkValue(value.value, node);
          return;
        }
        // <div className={...} />
        if (value.type === 'JSXExpressionContainer') {
          const expr = value.expression;
          if (!expr) return;
          // `className={"literal"}`
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            checkValue(expr.value, node);
            return;
          }
          // `className={\`flex ${x}\`}`
          if (expr.type === 'TemplateLiteral') {
            for (const quasi of expr.quasis) {
              checkValue(quasi.value.cooked || '', node);
            }
            return;
          }
          // Anything else (`clsx(...)`, conditional, identifier) — skipped
          // by design. Static-literal coverage catches the F-1-013 pattern.
        }
      },
    };
  },
};
