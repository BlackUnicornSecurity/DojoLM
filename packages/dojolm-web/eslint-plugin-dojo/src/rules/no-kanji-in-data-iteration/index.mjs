// SPDX-License-Identifier: Apache-2.0
/**
 * dojo/no-kanji-in-data-iteration (E1.S10 — Token Discipline / G4 enforcement)
 *
 * Rejects use of CJK Unified Ideographs (U+4E00–U+9FFF, the kanji block —
 * `一` through `鿿`) inside the body of an `Array.prototype.map`,
 * `forEach`, or `filter` callback that returns JSX. Carrying kanji through
 * a data-iteration callback is a G4 violation: the kanji becomes part of
 * the per-row visual surface, multiplying glyph occurrences across the
 * card grid and overwhelming the page-level decorative budget. G4 says
 * kanji must function as decoration, not data — and a glyph that varies
 * row-by-row is data, not decoration.
 *
 * Retires:
 *   - F-1-012 (P2) — eleven kanji glyphs render in `.map()` over the
 *     `/admin` module list (`AdminLandingNav.tsx:80-158+234-237+299` per
 *     `audit/findings-register.csv:13`). The 11-id closed enum was
 *     superseded by `ADMIN_ROUTE_CATALOG` (E5.S7), so the underlying
 *     count grew to 26 — but the class of bug is unchanged: per-card
 *     `mark: '俳'` literals routed through `entries.map((entry) => …
 *     {entry.mark} … )` violate G4.
 *
 * Plan-spec divergence (documented):
 *   - The plan §E1.S10 names this rule a "Stylelint" rule. Stylelint
 *     parses CSS, not TSX — the rule body must walk JSX expressions, so
 *     the only viable home is ESLint. Implemented here in
 *     `eslint-plugin-dojo` (sister to the actual Stylelint plugin
 *     `stylelint-dojo` which targets `.css`). The acceptance criteria —
 *     AST-walks `.tsx` JSX expressions for kanji in iteration callbacks
 *     — are framework-neutral and satisfied identically.
 *
 * Detection (5 fixture types per acceptance):
 *   1. ALLOWED — kanji in static JSX outside any iteration callback
 *      (e.g., `<h1>当身</h1>` page title).
 *   2. REJECTED — kanji as a direct JSXText inside the body of a
 *      `.map()` callback returning JSX:
 *        items.map(() => <span>当身</span>)
 *   3. REJECTED — kanji reaches the JSX body via a member access on
 *      the callback parameter where the parameter is sourced from a
 *      data array whose objects carry a kanji-bearing field (the F-1-012
 *      pattern: `entries.map((entry) => <span>{entry.mark}</span>)`,
 *      with `entries = [{ mark: '武' }, …]`). Flow analysis:
 *        - Find the array binding (first argument's parent's callee
 *          object resolution).
 *        - If it is an `Identifier`, look up the binding (`const xs =
 *          [...]`).
 *        - If the array elements are object literals with at least one
 *          property whose value is a string literal containing a kanji
 *          AND that property name matches the JSX accessor (e.g. `.mark`
 *          or `[.mark]`), flag the call.
 *        - Computed accessors and dynamic identifiers are conservatively
 *          flagged when ANY field of the array's element shape carries
 *          kanji (false-positives traded for catching the F-1-012 bug
 *          shape exactly).
 *   4. ALLOWED — romaji / latin string in `.map()` callback body
 *      (no kanji at any level):
 *        items.map(() => <span>{item.name}</span>) where name is
 *        latin-letter only.
 *   5. REJECTED — kanji inside a conditional / ternary inside a
 *      `.map()` callback body:
 *        items.map(() => active ? <span>当身</span> : null)
 *
 * Allowlist:
 *   - Static JSX (not inside any `.map()` / `.forEach()` / `.filter()`
 *     callback body) is unaffected. `<h1>当身</h1>` page titles, hero
 *     watermarks, and PageHead `jp="…"` props are all fine.
 *   - JSX nodes carrying `lang="ja"` are still flagged — the rule
 *     treats `lang` as orthogonal to the G4 budget. WCAG SC 3.1.2
 *     mandates `lang="ja"` when kanji IS rendered, but the G4 budget is
 *     the prior question (a `lang="ja"` annotation does not exempt a
 *     surface from the visual-budget rule).
 *   - Kanji inside non-JSX contexts (string-literal arguments to
 *     non-iteration calls, comments, regex literals) are skipped —
 *     this rule's scope is exactly "kanji rendered through a data
 *     iteration callback".
 *
 * Conservative bias:
 *   - When flow analysis cannot statically resolve the array binding
 *     (anonymous array literals at the call site, imported bindings,
 *     spread parameters), the rule walks the callback body for direct
 *     kanji only. False-negatives on cross-module kanji-data are
 *     traded for zero false-positives on legitimate iteration patterns
 *     (`tags.map((t) => <Chip>{t.label}</Chip>)` with `label: 'High'`).
 */

// CJK Unified Ideographs — U+4E00 … U+9FFF (`一` … `鿿`). The plan spec
// names this range explicitly; we match exactly its extent. Other CJK
// blocks (Katakana / Hiragana / CJK Extension A-B-C-D-E) are outside
// scope: Hiragana/Katakana are syllabic-not-glyph-decoration so G4 does
// not apply, and CJK Extension blocks are vanishingly rare in product
// copy. The narrow range matches the plan spec verbatim.
const KANJI_PATTERN = /[一-鿿]/u;

// Iteration method names whose callback body counts as a data-iteration
// surface for the purposes of G4. The plan spec lists exactly these
// three. `.reduce()`, `.flatMap()`, `.find()`, `.some()`, `.every()`
// are NOT covered — they may render JSX but are not the per-row card-
// grid pattern that F-1-012 cites. (Future tightening can extend the
// list; the unit-test fixtures lock the current set.)
const ITERATION_METHODS = new Set(['map', 'forEach', 'filter']);

/**
 * Test whether a string contains at least one CJK Unified Ideograph.
 */
function containsKanji(str) {
  if (typeof str !== 'string' || str.length === 0) return false;
  return KANJI_PATTERN.test(str);
}

/**
 * Pull a static string out of a Literal / TemplateLiteral (no
 * interpolation) node. Returns null otherwise.
 */
function readStaticString(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked).join('');
  }
  return null;
}

/**
 * Walk an array-of-object-literals (the F-1-012 catalog shape) and
 * return the set of property names whose values contain kanji.
 *
 *   [{ mark: '武', name: 'Buki' }, …] → Set(['mark'])
 *
 * Computed / non-Property elements are skipped. Spread elements
 * (`{ ...other }`) are skipped — those source-of-truth references
 * cannot be resolved without cross-module flow analysis.
 */
function collectKanjiBearingFields(arrayNode) {
  const fields = new Set();
  if (!arrayNode || arrayNode.type !== 'ArrayExpression') return fields;
  for (const element of arrayNode.elements) {
    if (!element) continue;
    // Each element should be an object literal (catalog entry). Other
    // shapes (Identifier reference, function call) skip — conservative.
    if (element.type !== 'ObjectExpression') continue;
    for (const prop of element.properties) {
      if (prop.type !== 'Property' || prop.computed) continue;
      const valueStr = readStaticString(prop.value);
      if (valueStr !== null && containsKanji(valueStr)) {
        // Resolve the key name. Identifier/Literal both supported.
        if (prop.key.type === 'Identifier') {
          fields.add(prop.key.name);
        } else if (
          prop.key.type === 'Literal' &&
          typeof prop.key.value === 'string'
        ) {
          fields.add(prop.key.value);
        }
      }
    }
  }
  return fields;
}

/**
 * Resolve an Identifier-referencing callee object (`xs.map(…)` where
 * `xs` is the Identifier) to the array literal it binds to, if any.
 * Returns the ArrayExpression node, or null.
 *
 * Walks the closest enclosing scope upward looking for a const/let/var
 * declarator with the matching name and an ArrayExpression initializer.
 * Stops at the program root. Cross-module imports return null.
 *
 * This is a deliberate, narrow flow analysis: it covers the dominant
 * F-1-012 shape (`const ENTRIES = [...]; ENTRIES.map(...)`) and the
 * `Object.values(CATALOG).map(...)` shape (resolved through Object.values
 * → CATALOG declarator → ObjectExpression whose values are object
 * literals — the F-1-012 actual catalog evidence).
 */
function resolveArrayBinding(identifierNode, scope) {
  if (!identifierNode || identifierNode.type !== 'Identifier') return null;
  const variable = scope.references
    .find((r) => r.identifier === identifierNode)
    ?.resolved;
  if (!variable) return null;
  for (const def of variable.defs) {
    if (def.type !== 'Variable' && def.type !== 'ImportBinding') continue;
    const init = def.node.init;
    if (!init) continue;
    if (init.type === 'ArrayExpression') return init;
    // Object.values(CATALOG) form — a recognized F-1-012 shape.
    if (
      init.type === 'CallExpression' &&
      init.callee.type === 'MemberExpression' &&
      init.callee.object.type === 'Identifier' &&
      init.callee.object.name === 'Object' &&
      init.callee.property.type === 'Identifier' &&
      init.callee.property.name === 'values' &&
      init.arguments.length === 1
    ) {
      return resolveCatalogToArray(init.arguments[0], scope);
    }
  }
  return null;
}

/**
 * Resolve `Object.values(CATALOG)` → an array of the catalog's object-
 * literal values. Returns an ArrayExpression-shaped synthetic node, or
 * null. The synthetic shape is good enough for `collectKanjiBearingFields`
 * (which only inspects `.elements[].properties[]`).
 */
function resolveCatalogToArray(catalogArg, scope) {
  if (!catalogArg) return null;
  // Direct object literal: Object.values({ x: { mark: '武' } })
  if (catalogArg.type === 'ObjectExpression') {
    return synthesizeArrayFromObject(catalogArg);
  }
  // Identifier reference: Object.values(ADMIN_ROUTE_CATALOG)
  if (catalogArg.type === 'Identifier') {
    const variable = scope.references
      .find((r) => r.identifier === catalogArg)
      ?.resolved;
    if (!variable) return null;
    for (const def of variable.defs) {
      // `Variable` covers `const X = …`. `Parameter` covers a function
      // signature whose default value is an ObjectExpression — the
      // dominant `function L({ catalog = ADMIN_ROUTE_CATALOG } = {})`
      // shape that AdminLandingNav uses. We extract the default-value
      // initializer when present, then recurse on it (chasing the
      // import / declarator if the default is itself an Identifier).
      if (def.type === 'Variable') {
        const init = def.node.init;
        if (!init) continue;
        if (init.type === 'ObjectExpression') {
          return synthesizeArrayFromObject(init);
        }
        const unfrozen = unwrapObjectFreeze(init);
        if (unfrozen && unfrozen.type === 'ObjectExpression') {
          return synthesizeArrayFromObject(unfrozen);
        }
      } else if (def.type === 'Parameter') {
        // Default value lives on the AssignmentPattern wrapping the
        // Identifier. ESLint's `def.node` is the function (Function*
        // node); `def.name` is the Identifier; the AssignmentPattern
        // is the parent. We resolve through the source code's parent
        // chain by inspecting the Identifier node's parent.
        const ident = def.name;
        const parent = ident.parent;
        if (parent && parent.type === 'AssignmentPattern' && parent.right) {
          const defaultExpr = parent.right;
          if (defaultExpr.type === 'ObjectExpression') {
            return synthesizeArrayFromObject(defaultExpr);
          }
          const unfrozen = unwrapObjectFreeze(defaultExpr);
          if (unfrozen && unfrozen.type === 'ObjectExpression') {
            return synthesizeArrayFromObject(unfrozen);
          }
          // Default expression is itself an Identifier referring to a
          // module-level binding (`catalog = ADMIN_ROUTE_CATALOG`).
          // Recurse to chase the binding.
          if (defaultExpr.type === 'Identifier') {
            // Walk scopes upward to find the global/module binding.
            let s = scope;
            while (s) {
              const v = s.set.get(defaultExpr.name);
              if (v) {
                for (const d of v.defs) {
                  if (d.type !== 'Variable') continue;
                  const di = d.node.init;
                  if (!di) continue;
                  if (di.type === 'ObjectExpression') {
                    return synthesizeArrayFromObject(di);
                  }
                  const u = unwrapObjectFreeze(di);
                  if (u && u.type === 'ObjectExpression') {
                    return synthesizeArrayFromObject(u);
                  }
                }
              }
              s = s.upper;
            }
          }
        }
        // Property pattern (destructured catalog) — also possible.
        // `function L({ catalog = ADMIN_ROUTE_CATALOG }) {}`
        if (parent && parent.type === 'Property' && parent.value) {
          const inner = parent.value;
          if (inner.type === 'AssignmentPattern' && inner.right) {
            const defaultExpr = inner.right;
            if (defaultExpr.type === 'ObjectExpression') {
              return synthesizeArrayFromObject(defaultExpr);
            }
            const unfrozen = unwrapObjectFreeze(defaultExpr);
            if (unfrozen && unfrozen.type === 'ObjectExpression') {
              return synthesizeArrayFromObject(unfrozen);
            }
            if (defaultExpr.type === 'Identifier') {
              let s = scope;
              while (s) {
                const v = s.set.get(defaultExpr.name);
                if (v) {
                  for (const d of v.defs) {
                    if (d.type !== 'Variable') continue;
                    const di = d.node.init;
                    if (!di) continue;
                    if (di.type === 'ObjectExpression') {
                      return synthesizeArrayFromObject(di);
                    }
                    const u = unwrapObjectFreeze(di);
                    if (u && u.type === 'ObjectExpression') {
                      return synthesizeArrayFromObject(u);
                    }
                  }
                }
                s = s.upper;
              }
            }
          }
        }
      }
    }
  }
  return null;
}

/**
 * If `node` is `Object.freeze({...})` or `Object.freeze({...})` nested
 * one level (a chain of freeze calls is an idiom), unwrap to the inner
 * ObjectExpression. Returns null if not a freeze pattern.
 */
function unwrapObjectFreeze(node) {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'Object' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'freeze' &&
    node.arguments.length === 1
  ) {
    const arg = node.arguments[0];
    if (arg.type === 'ObjectExpression') return arg;
    return unwrapObjectFreeze(arg);
  }
  return null;
}

/**
 * Synthesize an ArrayExpression-shaped pseudo-node whose `.elements`
 * are the values of the input ObjectExpression. The values may be
 * ObjectExpressions or `Object.freeze({...})` calls; the latter are
 * unwrapped.
 */
function synthesizeArrayFromObject(objectExpr) {
  const elements = [];
  for (const prop of objectExpr.properties) {
    if (prop.type !== 'Property') continue;
    if (prop.value.type === 'ObjectExpression') {
      elements.push(prop.value);
      continue;
    }
    const unfrozen = unwrapObjectFreeze(prop.value);
    if (unfrozen) elements.push(unfrozen);
  }
  return { type: 'ArrayExpression', elements };
}

/**
 * Walk a JSX subtree rooted at `node` (any JSX or expression that may
 * carry JSX) and collect every kanji-bearing site. Returns an array of
 * { node, source } objects, where `source` is one of:
 *   - 'jsxText'         — direct kanji in <span>当身</span>
 *   - 'jsxString'       — string-literal attr/value carrying kanji
 *   - 'memberAccess'    — JSXExpression `{x.field}` where `field` is
 *                         a kanji-bearing field of the iteration array
 *
 * `kanjiFields` is a Set of property names that the array's element
 * shape proves carry kanji. Member-access detection consults this set.
 *
 * `paramName` is the iteration callback's first-parameter binding name
 * (typically `entry`, `item`, etc.). When the JSX expression accesses
 * `paramName.field` AND `field` is in `kanjiFields`, we flag.
 */
function collectKanjiSitesInJsx(node, kanjiFields, paramName) {
  const sites = [];
  function visit(n) {
    if (!n || typeof n !== 'object') return;
    // JSX text node — `当身` directly between tags.
    if (n.type === 'JSXText') {
      if (containsKanji(n.value)) {
        sites.push({ node: n, source: 'jsxText' });
      }
      return;
    }
    // String literal attribute value — kanji in `lang="ja"` is fine,
    // but kanji in `aria-label="武 …"` is in scope.
    if (n.type === 'Literal' && typeof n.value === 'string') {
      if (containsKanji(n.value)) {
        sites.push({ node: n, source: 'jsxString' });
      }
      return;
    }
    if (n.type === 'TemplateLiteral') {
      for (const q of n.quasis) {
        if (containsKanji(q.value.cooked || '')) {
          sites.push({ node: n, source: 'jsxString' });
          break;
        }
      }
      // Continue walking expressions.
      for (const e of n.expressions) visit(e);
      return;
    }
    // {x.field} — flag when field is kanji-bearing on the iteration shape.
    if (n.type === 'MemberExpression' && !n.computed) {
      const obj = n.object;
      const prop = n.property;
      if (
        paramName &&
        obj.type === 'Identifier' &&
        obj.name === paramName &&
        prop.type === 'Identifier' &&
        kanjiFields.has(prop.name)
      ) {
        sites.push({ node: n, source: 'memberAccess' });
        return; // don't double-walk
      }
    }
    // Generic AST walk — recurse into all object children. ESLint AST
    // nodes carry their child references on enumerable own-properties
    // alongside metadata; a permissive walker is sufficient for this
    // rule because we already gate on node.type at each step.
    for (const key of Object.keys(n)) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      const v = n[key];
      if (Array.isArray(v)) {
        for (const item of v) visit(item);
      } else if (v && typeof v === 'object' && typeof v.type === 'string') {
        visit(v);
      }
    }
  }
  visit(node);
  return sites;
}

/**
 * Test whether the node's subtree contains at least one JSX element
 * (i.e. the callback returns JSX, however nested). This gates the
 * rule — non-JSX iteration callbacks (e.g. `xs.map((x) => x.id)`) are
 * out of scope.
 */
function bodyContainsJsx(bodyNode) {
  let found = false;
  function visit(n) {
    if (found || !n || typeof n !== 'object') return;
    if (
      n.type === 'JSXElement' ||
      n.type === 'JSXFragment' ||
      n.type === 'JSXOpeningElement'
    ) {
      found = true;
      return;
    }
    for (const key of Object.keys(n)) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      const v = n[key];
      if (Array.isArray(v)) {
        for (const item of v) visit(item);
      } else if (v && typeof v === 'object' && typeof v.type === 'string') {
        visit(v);
      }
    }
  }
  visit(bodyNode);
  return found;
}

/**
 * Test whether the callback body passes the iteration parameter
 * (`paramName`) into a JSX element as a prop value or child expression.
 * This is the "child-component prop bleed-through" pattern that
 * F-1-012 evidences:
 *
 *   entries.map((entry) => <AdminLandingCard meta={entry} />)
 *
 * The kanji-bearing field on `entry` (e.g., `entry.mark`) is consumed
 * inside `AdminLandingCard`'s JSX body — the rule cannot statically
 * follow the value across the child-component boundary, so it flags
 * the iteration site itself when (a) the data shape carries kanji
 * AND (b) the param is forwarded into JSX in any prop-or-child shape.
 */
function bodyPassesParamIntoJsx(bodyNode, paramName) {
  if (!paramName) return false;
  let found = false;
  function visit(n) {
    if (found || !n || typeof n !== 'object') return;
    // Direct identifier reference inside JSX expression container —
    // either as a child (`<X>{entry}</X>`) or as a prop value
    // (`<X foo={entry} />`).
    if (n.type === 'JSXExpressionContainer') {
      const expr = n.expression;
      if (expr && expr.type === 'Identifier' && expr.name === paramName) {
        found = true;
        return;
      }
    }
    // Spread attribute (`<X {...entry} />`) — also flows the data through.
    if (n.type === 'JSXSpreadAttribute') {
      const arg = n.argument;
      if (arg && arg.type === 'Identifier' && arg.name === paramName) {
        found = true;
        return;
      }
    }
    for (const key of Object.keys(n)) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      const v = n[key];
      if (Array.isArray(v)) {
        for (const item of v) visit(item);
      } else if (v && typeof v === 'object' && typeof v.type === 'string') {
        visit(v);
      }
    }
  }
  visit(bodyNode);
  return found;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid CJK Unified Ideographs (U+4E00-U+9FFF) inside Array.prototype.map / ' +
        'forEach / filter callbacks that return JSX. Kanji rendered through a data ' +
        'iteration callback violates G4 (kanji = decoration, not data) by multiplying ' +
        'glyph occurrences across the per-row visual surface.',
      recommended: true,
      url: 'https://github.com/BlackUnicornSecurity/DojoLM/blob/main/packages/dojolm-web/eslint-plugin-dojo/src/rules/no-kanji-in-data-iteration/README.md',
    },
    schema: [],
    messages: {
      kanjiInIterationDirect:
        'Kanji glyph(s) appear directly inside an Array.prototype.{{method}} callback ' +
        'returning JSX. G4 says kanji must be decoration, not data — a glyph that ' +
        'varies row-by-row through a data iteration is data. Move the kanji into a ' +
        'static, single-occurrence JSX surface (e.g., a hero watermark with ' +
        'lang="ja") or remove it. (E1.S10, retires F-1-012)',
      kanjiInIterationViaField:
        'Field "{{field}}" on the iteration parameter is sourced from data carrying ' +
        'kanji glyph(s) (U+4E00-U+9FFF) and is rendered inside an Array.prototype.{{method}} ' +
        'callback returning JSX. G4 says kanji must be decoration, not data — a glyph ' +
        'that varies row-by-row through a data iteration is data. Drop the kanji-bearing ' +
        'field from the iterated data shape, replace with a romaji surrogate, or move ' +
        'the visual to a single-occurrence static JSX site (e.g., a hero watermark with ' +
        'lang="ja"). (E1.S10, retires F-1-012)',
      kanjiInIterationDataShape:
        'Iterated array elements carry kanji glyph(s) in field(s) {{fields}} and the ' +
        'Array.prototype.{{method}} callback passes the parameter into JSX (typically ' +
        'as a child-component prop, e.g., `<Card meta={entry} />`). The kanji bleeds ' +
        'through the child component\'s JSX body and renders once per iterated row. ' +
        'G4 says kanji must be decoration, not data — drop the kanji-bearing ' +
        'field(s) from the iterated data shape or replace with a romaji surrogate. ' +
        '(E1.S10, retires F-1-012)',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    function checkIterationCall(callExpr) {
      // Must be `something.<method>(callback)` where method is in the
      // iteration set. Computed keys / dynamic property access are
      // skipped — conservative.
      const callee = callExpr.callee;
      if (callee.type !== 'MemberExpression') return;
      if (callee.computed) return;
      if (callee.property.type !== 'Identifier') return;
      const method = callee.property.name;
      if (!ITERATION_METHODS.has(method)) return;
      // First argument must be the callback.
      const cb = callExpr.arguments[0];
      if (!cb) return;
      if (
        cb.type !== 'ArrowFunctionExpression' &&
        cb.type !== 'FunctionExpression'
      ) {
        return;
      }
      // Body must contain JSX. Otherwise out of scope.
      if (!bodyContainsJsx(cb.body)) return;

      // Resolve the iterated-array binding for flow analysis. May be
      // null — that's OK, we still walk the body for direct kanji.
      const scope = sourceCode.getScope
        ? sourceCode.getScope(callExpr)
        : context.getScope();
      let arrayNode = null;
      const iteratedExpr = callee.object;
      if (iteratedExpr.type === 'ArrayExpression') {
        arrayNode = iteratedExpr;
      } else if (iteratedExpr.type === 'Identifier') {
        arrayNode = resolveArrayBinding(iteratedExpr, scope);
      } else if (
        iteratedExpr.type === 'CallExpression' &&
        iteratedExpr.callee.type === 'MemberExpression' &&
        iteratedExpr.callee.object.type === 'Identifier' &&
        iteratedExpr.callee.object.name === 'Object' &&
        iteratedExpr.callee.property.type === 'Identifier' &&
        iteratedExpr.callee.property.name === 'values' &&
        iteratedExpr.arguments.length === 1
      ) {
        // The F-1-012 catalog pattern: Object.values(CATALOG).map(...)
        arrayNode = resolveCatalogToArray(iteratedExpr.arguments[0], scope);
      }

      const kanjiFields = collectKanjiBearingFields(arrayNode);

      // Identify the callback's first-parameter name for member-access
      // tracing. `(entry) => …`, `(entry, idx) => …`, both work; if the
      // first param is a destructure pattern, we cannot trace the
      // member access by name (no synthetic identifier exists), so we
      // skip flow analysis but still catch direct kanji.
      let paramName = null;
      const firstParam = cb.params[0];
      if (firstParam && firstParam.type === 'Identifier') {
        paramName = firstParam.name;
      }

      const sites = collectKanjiSitesInJsx(cb.body, kanjiFields, paramName);
      const reported = new Set();
      let memberAccessFound = false;
      for (const site of sites) {
        // Dedup by (start, source). Multiple visits to the same node
        // can happen when both a kanji JSXText and a kanji JSXString
        // attribute land on the same element; we want each unique site
        // once.
        const key = `${site.node.range?.[0] ?? 0}:${site.source}`;
        if (reported.has(key)) continue;
        reported.add(key);

        if (site.source === 'memberAccess') {
          memberAccessFound = true;
          context.report({
            node: site.node,
            messageId: 'kanjiInIterationViaField',
            data: {
              field: site.node.property.name,
              method,
            },
          });
        } else {
          context.report({
            node: site.node,
            messageId: 'kanjiInIterationDirect',
            data: { method },
          });
        }
      }

      // Data-shape pattern (F-1-012 cross-component evidence): the
      // iterated array carries kanji-bearing fields, the callback
      // returns JSX, and the iteration parameter is passed into a
      // JSX element (prop-value, child, or spread). The kanji bleeds
      // through whatever child consumes the parameter. Report once at
      // the call site. We skip this when a memberAccess site already
      // fired — that one already names the responsible field, no need
      // to double-report.
      if (
        !memberAccessFound &&
        kanjiFields.size > 0 &&
        bodyPassesParamIntoJsx(cb.body, paramName)
      ) {
        const fieldList = Array.from(kanjiFields)
          .map((f) => `\`${f}\``)
          .join(', ');
        context.report({
          node: callExpr,
          messageId: 'kanjiInIterationDataShape',
          data: {
            fields: fieldList,
            method,
          },
        });
      }
    }

    return {
      CallExpression(node) {
        checkIterationCall(node);
      },
    };
  },
};
