# DojoLM Documentation Style Guide

**Version:** 1.0  
**Last Updated:** 2026-03-01  
**Status:** Active

---

## Purpose

This style guide ensures consistency, clarity, and accuracy across all DojoLM documentation. Following these guidelines helps maintain professional documentation that users can trust.

---

## 1. Tone and Voice

### 1.1 Professional and Clear
- **Do:** Use clear, direct language that conveys information efficiently
- **Don't:** Use overly casual language, slang, or unnecessary jargon

| ✅ Good | ❌ Bad |
|--------|--------|
| "The scanner detects prompt injection attacks." | "The scanner is like, really good at finding bad stuff." |
| "Configure the environment variables before starting." | "You gotta set up your env vars first, ok?" |

### 1.2 Active Voice
- **Do:** Use active voice for clarity and directness
- **Don't:** Use passive voice when active is clearer

| ✅ Good | ❌ Bad |
|--------|--------|
| "The scanner analyzes the input text." | "The input text is analyzed by the scanner." |
| "Run the test suite after making changes." | "The test suite should be run after changes are made." |

### 1.3 Second Person for Instructions
- **Do:** Address the reader directly with "you" when giving instructions
- **Don't:** Use "one" or indirect phrasing

| ✅ Good | ❌ Bad |
|--------|--------|
| "You can configure the scanner by..." | "One can configure the scanner by..." |
| "Install the package first." | "The package should be installed first." |

---

## 2. Formatting Standards

### 2.1 Markdown Style

Use GitHub-flavored Markdown with these conventions:

```markdown
# H1 - Document Title (only one per file)

## H2 - Main Sections

### H3 - Subsections

#### H4 - Sub-subsections (use sparingly)
```

### 2.2 Code Blocks

- Use fenced code blocks with language identifiers
- Use inline code for file names, variable names, and short commands

```markdown
<!-- Good -->
```bash
npm install @dojolm/scanner
```

Install the `scanner` package and import the `scan()` function.

<!-- Bad -->
Install the scanner package and import the scan function.
```

### 2.3 Lists

- Use bullet lists for unordered items
- Use numbered lists for sequential steps
- Be consistent with punctuation (periods at end or not, but be consistent)

```markdown
- First item
- Second item
- Third item

1. First step
2. Second step
3. Third step
```

### 2.4 Tables

Use tables for structured data with clear headers:

```markdown
| Property | Type | Description |
|----------|------|-------------|
| `text` | string | Input text to scan |
| `engines` | string[] | Optional engine filter |
```

---

## 3. Terminology

### 3.1 Consistent Terms

Use these standard terms consistently:

| Term | Usage |
|------|-------|
| **DojoLM** | The project/platform name (always capitalized) |
| **TPI** | Threat Prompt Injection (acronym, always uppercase) |
| **LLM** | Large Language Model (acronym, always uppercase) |
| **scanner** | The detection engine component |
| **fixture** | Test data file (not "test case") |
| **pattern** | Regex detection rule |
| **engine** | Detection category/group |

### 3.2 Avoid These Terms

| Instead of... | Use... |
|---------------|--------|
| AI model | LLM (when referring to language models) |
| Test file | Fixture |
| Rule | Pattern |
| Module | Package or component |

---

## 4. Link Conventions

### 4.1 Internal Links

- Use relative paths for links within the repository
- Use `.md` extension for markdown files
- Use `/` for directories

```markdown
<!-- Good -->
See the [Platform Guide](./PLATFORM_GUIDE.md)

Read about [contributing](../../github/CONTRIBUTING.md)

<!-- Bad -->
See the [Platform Guide](https://github.com/dojolm/dojolm/blob/main/docs/user/PLATFORM_GUIDE.md)

Read about [contributing](../CONTRIBUTING)  <!-- Missing .md -->
```

### 4.2 External Links

- Use full URLs for external resources
- Include protocol (https://)

```markdown
<!-- Good -->
Learn more at [OWASP](https://owasp.org)

<!-- Bad -->
Learn more at [OWASP](owasp.org)  <!-- Missing protocol -->
```

### 4.3 Link Text

- Use descriptive link text, not "click here"
- The link text should indicate what the user will find

```markdown
<!-- Good -->
See the [installation instructions](./INSTALL.md)

Read the [API reference documentation](./API.md)

<!-- Bad -->
Click [here](./INSTALL.md) for installation instructions

Read more [here](./API.md)
```

---

## 5. Code Examples

### 5.1 Working Code

- All code examples must be tested and working
- Include necessary imports/dependencies
- Use realistic examples, not `foo` and `bar`

```typescript
// Good
import { scan } from '@dojolm/scanner';

const result = scan("Test input text");
console.log(result.verdict); // 'BLOCK', 'WARN', or 'ALLOW'

// Bad
import { scan } from 'scanner';  // Wrong package name

const x = scan("foo");  // Unclear variable names
```

### 5.2 Code Comments

- Use comments to explain *why*, not *what*
- Keep comments concise

```typescript
// Good - explains why
// Normalize text to catch confusable characters
const normalized = normalizeText(input);

// Bad - explains what (obvious from code)
// Call the normalizeText function
const normalized = normalizeText(input);
```

---

## 6. Documentation Structure

### 6.1 Document Header

Every document should include:

```markdown
# Document Title

**Version:** X.X  
**Last Updated:** YYYY-MM-DD  
**Status:** Draft | Active | Deprecated

---
```

### 6.2 Table of Contents

For documents longer than 100 lines, include a TOC:

```markdown
## Table of Contents

- [Section 1](#section-1)
- [Section 2](#section-2)
  - [Subsection 2.1](#subsection-21)
- [Section 3](#section-3)
```

### 6.3 Package README Structure

All package READMEs must follow this structure:

```markdown
# package-name

Brief description.

## Purpose / Overview

## Installation

## Usage / Quick Start

## API Reference

## Development

## Testing

## Related Packages

## Documentation

## License
```

See `CLAUDE.md` for the complete template.

---

## 7. Metrics and Numbers

### 7.1 Accuracy is Critical

**Always verify metrics against actual code.** Documentation discrepancies damage credibility.

```markdown
<!-- Verify this against scanner.ts before claiming -->
The scanner includes **505+ patterns** across **47 groups**.
```

### 7.2 Use Approximations Appropriately

- Use `+` suffix for approximate counts (e.g., "500+ patterns")
- Use exact numbers when precision matters
- Update counts when they change

| ✅ Good | ❌ Bad |
|--------|--------|
| "505+ patterns" (when actual is 505) | "500 patterns" (when actual is 505) |
| "1,545 fixtures" (exact count) | "~1500 fixtures" (when exact is known) |

### 7.3 Automated Verification

Use the verification script to catch discrepancies:

```bash
npm run verify:docs
```

---

## 8. When to Use Different Formats

### 8.1 Use Tables When...
- Comparing multiple items with the same attributes
- Presenting configuration options
- Showing API parameters

### 8.2 Use Lists When...
- Items don't share common attributes
- Order doesn't matter (bullets)
- Order matters (numbers)

### 8.3 Use Code Blocks When...
- Showing commands to run
- Displaying code examples
- Showing configuration files

### 8.4 Use Callouts When...
- Warning about potential issues
- Providing helpful tips
- Noting important information

```markdown
> **Warning:** This action cannot be undone.

> **Note:** This feature requires Node.js 20 or higher.

> **Tip:** Use tab completion for faster navigation.
```

---

## 9. Accessibility Considerations

### 9.1 Alt Text for Images

Always include descriptive alt text:

```markdown
<!-- Good -->
![Scanner architecture diagram showing input flow through detection engines to verdict output](./diagram.png)

<!-- Bad -->
![diagram](./diagram.png)
```

### 9.2 Screen Reader Considerations

- Use proper heading hierarchy (don't skip levels)
- Write link text that makes sense out of context
- Avoid relying solely on color to convey information

---

## 10. Review Checklist

Before submitting documentation changes, verify:

- [ ] Metrics match actual code (run `npm run verify:docs`)
- [ ] All internal links work (run `npm run lint:links`)
- [ ] No spelling errors
- [ ] Code examples are tested and working
- [ ] Follows style guide conventions
- [ ] Uses consistent terminology
- [ ] Proper heading hierarchy
- [ ] Descriptive link text
- [ ] Document header includes version and date

---

## Related Documents

- [Contributing Guide](../github/CONTRIBUTING.md) - How to contribute to DojoLM
- [Maintenance Process](./MAINTENANCE.md) - Documentation maintenance procedures
- [CLAUDE.md](../CLAUDE.md) - AI assistant instructions including README template

---

*This style guide is a living document. Suggestions for improvements are welcome via pull requests.*
