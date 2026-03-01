# Lessons Learned

Compact reference of prevention rules from past mistakes. Categorized by topic.

---

## React / Next.js

- **Hooks before guards**: `useState`/`useEffect` must come AFTER conditional `notFound()` or early returns — Rules of Hooks violation
- **Clipboard API is async**: Move `setCopied(true)` into `.then()` — never assume async clipboard succeeds
- **Stable keys in lists**: Never use array index as key for sorted/dynamic lists — use `rowKey` prop or data ID
- **Dependency arrays**: Always include all dependencies in `useEffect`/`useMemo`/`useCallback`
- **Memory leaks**: Clean up timers (`clearTimeout`) in `useEffect` return functions
- **`useId()`** or `dataKey`-derived IDs for SVG gradient/pattern elements — prevent collisions with multiple instances

## Accessibility (WCAG)

- **Hover-only elements**: Every `group-hover:opacity-100` MUST also have `focus:opacity-100` + `focus-visible:ring-2`
- **Escape-to-close**: Every dropdown/panel needs `keydown` listener for Escape key — keyboard users get trapped otherwise
- **Focus management**: When a panel opens, `requestAnimationFrame(() => firstRef.focus())` the first interactive element
- **aria-hidden on icons**: Every Lucide/decorative SVG icon needs `aria-hidden="true"` (recurring across all phases)
- **Dynamic aria-label**: Badge counts must be in the button's `aria-label`, not just visually rendered — e.g. `Notifications, 3 unread`
- **motion-reduce**: All `animate-*` classes need `motion-reduce:animate-none` companion
- **Semantic HTML**: Use `<pre><code>` for code content, not `<p>` with `font-mono`. Use `<ul>/<li>` for lists, not `<div>` soup
- **listitem role**: Chat messages need `role="listitem"` with `aria-label` identifying sender

## Security

- **XSS via href**: Data-driven `<a href>` MUST sanitize against `javascript:` protocol — use `isSafeHref()` validator
- **rel on links**: All data-driven `<a>` tags need `rel="noopener noreferrer"` to prevent reverse tabnapping
- **Word boundaries in regex**: Use `\b` to prevent substring matches (e.g., "claim" matching "AIM" pattern)
- **Negative lookahead range**: Use 400+ char lookaheads for educational content exclusion in scanner patterns
- **JS regex multiline**: `.*` doesn't match newlines with `/m` — use `[\s\S]` for multiline matching

## TypeScript / Exports

- **Export ALL interfaces**: Barrel `index.ts` must export ALL public types — recurring issue in Phases 6, 7, 8
- **Null guard on config lookups**: `eventConfig[event.type]` needs `?? DEFAULT_CONFIG` for runtime safety from external data
- **Use `crypto.randomUUID()`** instead of `Date.now()` for unique IDs — millisecond collisions are real

## CSS / Tailwind

- **Border-color specificity**: Use inline `style={{ borderLeftColor }}` instead of Tailwind `border-l-[var()]` on Card descendants
- **space-y conflict**: When overriding flex-direction, also reset spacing (`space-y-0`)
- **Composite keys**: Use `${type}-${index}` for lists where items may share partial key values
- **`cn()` limitations**: Not all Tailwind utility pairs are recognized as conflicts by tailwind-merge

## Testing / QA

- **Test pattern changes** against both malicious AND benign fixtures immediately
- **Scanner vs test framework**: Scanner detects by content alone; tests use manifest metadata — different truth sources
- **Multi-turn fixtures**: `{"turns": [...]}` format must be parsed by scanner — not just single-string input
- **Stale builds**: Run `rm -rf .next && npm run build` before production deployments — chunk hash mismatches cause 500s
- **Component integration**: Always verify new components are actually imported/used somewhere — files can exist but be orphaned

## Project Process

- **Always verify integration**: NotificationsPanel existed for Story 23 but was never imported into SidebarHeader — caught during final QA
- **Check git status before work**: Verify clean working directory
- **Keep files in final folders**: Don't scatter screenshots in repo root — move to `team/QA-Log/`
- **Update barrel exports**: After creating any new component, immediately add to the nearest `index.ts`

---

## UI Modernization Epic Summary

- **24 stories, 8 phases, ~42 hours estimated**
- **Code review issues found per phase**: Phase 3: 5, Phase 4: 4, Phase 5: 6, Phase 6: 4, Phase 7: 7, Phase 8: 16
- **Most common issue**: Missing TypeScript type exports from barrel files (every phase)
- **Second most common**: Accessibility violations (hover-only, missing aria-hidden, no keyboard support)
- **Key files created**: 25+ components in `packages/dojolm-web/src/components/`

---

## Scanner Sprint Summary

- **Baseline**: 67.2% (659/981) → **Final**: 99.85% (1345/1347)
- **2 accepted failures**: zalgo-in-DOS educational fixture, negation detection edge case
- **Key technique**: Negative lookaheads with 400+ char range for educational content exclusion
