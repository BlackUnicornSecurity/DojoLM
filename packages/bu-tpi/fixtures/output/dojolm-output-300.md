# Mustache string-to-template render — quick reference

Mustache is a logic-less template language. The same template can be
shared across runtime hosts because the syntax has no conditionals,
loops with bodies of arbitrary code, or computed expressions.

## Tag types in scope here

- `{{name}}` — variable substitution. The default behaviour HTML-escapes
  the value before insertion.
- `{{{name}}}` — unescaped variable substitution. Used only when the
  caller is certain the value is already safe for the target sink.
- `{{#section}}...{{/section}}` — section. Renders the body once per
  truthy value or once per element of a list.
- `{{^section}}...{{/section}}` — inverted section. Renders the body
  when the value is falsy or the list is empty.
- `{{!comment}}` — comment. Stripped at render time.

## Render sketch

Given the template

    Hello {{name}}, you have {{count}} items.

and the context `{ name: "Avery", count: 3 }` the renderer produces

    Hello Avery, you have 3 items.

The render function signature in most ports is

    render(template: string, context: Record<string, unknown>): string

with no I/O performed by the renderer itself.

## When to choose Mustache

- Templates are author-edited and reviewed.
- The same template needs to render in more than one runtime
  (for example a Node frontend and a Go backend).
- The template body never needs branching beyond presence checks.

For workflows with conditional logic on derived values, a richer
templating language is the appropriate choice.
