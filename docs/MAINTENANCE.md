# DojoLM Documentation Maintenance Process

**Version:** 1.0  
**Last Updated:** 2026-03-01  
**Status:** Active

---

## Purpose

This document defines the processes for maintaining DojoLM documentation. Following these procedures ensures documentation stays current, accurate, and consistent as the codebase evolves.

---

## 1. When to Update Documentation

### 1.1 Required Updates

Update documentation **with every** of the following:

| Code Change | Documentation to Update |
|-------------|------------------------|
| New feature added | Feature docs, README, CHANGELOG |
| Pattern added/removed | PLATFORM_GUIDE.md, metrics |
| Fixture added/removed | PLATFORM_GUIDE.md, metrics |
| API change | API reference, package READMEs |
| New package | Root README, related package READMEs |
| Breaking change | CHANGELOG, migration guide |
| Configuration change | Setup guides, READMEs |
| Dependency update | CHANGELOG if significant |

### 1.2 Prohibited: Documentation-Only Updates Later

**Never defer documentation updates.** The following practices are prohibited:

- ❌ "I'll update the docs in a follow-up PR"
- ❌ "The code is self-documenting"
- ❌ "The PR is already big, docs can wait"
- ❌ "I'll document it when it's stable"

**All PRs must include documentation updates as part of the change.**

---

## 2. Documentation Definition of Done

Every documentation change must meet these criteria:

### 2.1 Accuracy Requirements

- [ ] **Metrics match actual code**
  - Run `npm run verify:docs` and confirm no discrepancies
  - Pattern counts in docs match scanner.ts
  - Fixture counts match actual fixture files

- [ ] **Code examples are tested**
  - Copy-paste the example and verify it runs
  - Check that output matches what's documented

- [ ] **Links are valid**
  - Run `npm run lint:links` and confirm no broken links
  - Check internal relative links resolve correctly
  - Verify external links are accessible

### 2.2 Quality Requirements

- [ ] **Follows style guide**
  - Review [STYLE-GUIDE.md](./STYLE-GUIDE.md)
  - Consistent terminology used
  - Proper formatting applied

- [ ] **Spell check passed**
  - No spelling errors
  - Proper capitalization of product names

- [ ] **Reviewed by maintainer**
  - At least one other maintainer reviewed
  - Feedback addressed

---

## 3. Documentation Update Workflow

### 3.1 Before Making Changes

1. **Check lessons learned**
   ```bash
   cat team/lessonslearned.md
   ```

2. **Verify current metrics**
   ```bash
   npm run verify:docs
   ```

3. **Identify affected documents**
   - Search for references to the changing feature
   - Update all locations consistently

### 3.2 During Development

1. **Update in parallel with code**
   - Don't wait until code is complete
   - Document as you implement

2. **Test examples continuously**
   - Verify code examples work
   - Update expected output if behavior changes

### 3.3 Before Submitting PR

Run the full documentation QA suite:

```bash
# 1. Verify metrics
npm run verify:docs

# 2. Check links
npm run lint:links

# 3. Run Markdown linter
npm run lint:md

# 4. Spell check (if available)
npx cspell '**/*.md' --exclude 'node_modules/**'
```

### 3.4 PR Description Requirements

Documentation PRs must include:

```markdown
## Documentation Changes

- [ ] List of files modified
- [ ] Reason for changes
- [ ] Screenshots (if UI docs)

## Verification

- [ ] `npm run verify:docs` passes
- [ ] `npm run lint:links` passes
- [ ] Code examples tested

## Related

- Links to related code PRs
- Issue references
```

---

## 4. Handling Deprecated Features

### 4.1 Deprecation Process

1. **Add deprecation notice**
   ```markdown
   > **Deprecated:** This feature is deprecated as of v1.2.0 and will be removed in v2.0.0.
   > Use [new-feature](./new-feature.md) instead.
   ```

2. **Update CHANGELOG**
   - Mark as deprecated
   - Include migration path

3. **Maintain during deprecation period**
   - Keep docs accurate until removal
   - Don't remove documentation early

### 4.2 Feature Removal

1. **Remove in major version**
   - Delete documentation
   - Add redirect if applicable

2. **Update all references**
   - Search for links to removed docs
   - Update or remove references

---

## 5. Versioning Strategy

### 5.1 Document Versions

Include version in document header:

```markdown
# Document Title

**Version:** 1.2  
**Last Updated:** 2026-03-01  
**Status:** Active | Deprecated
```

### 5.2 Version Update Rules

| Change | Version Bump | Example |
|--------|--------------|---------|
| Typo fix | No bump | - |
| Minor addition | Patch (1.1 → 1.2) | New example added |
| Major rewrite | Minor (1.x → 2.0) | Restructured content |
| Complete replacement | Major (x.0 → 1.0) | New document replaces old |

---

## 6. Backporting Documentation Fixes

### 6.1 When to Backport

Backport documentation fixes to supported release branches:

| Severity | Backport Required | Examples |
|----------|------------------|----------|
| Critical | Yes (all supported) | Broken links, incorrect API docs |
| High | Yes (current + LTS) | Missing steps, outdated screenshots |
| Medium | Yes (current only) | Clarity improvements |
| Low | No | Style improvements, rewording |

### 6.2 Backport Process

1. **Fix in main first**
2. **Cherry-pick to release branches**
   ```bash
   git cherry-pick -x <commit-hash>
   ```
3. **Update version in each branch**
4. **Verify in each branch**

---

## 7. Automated Checks

### 7.1 CI Integration

The following checks run automatically:

| Check | Command | CI Job | Fails Build? |
|-------|---------|--------|--------------|
| Metrics verification | `npm run verify:docs` | docs-metrics-check | Yes |
| Link checking | `npm run lint:links` | docs-link-check | Yes |
| Markdown linting | `npm run lint:md` | docs-quality | Yes |
| Spell checking | `npx cspell` | docs-quality | No (warning) |

### 7.2 Local Pre-Commit Checks

Consider adding to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Documentation pre-commit checks

echo "Running documentation checks..."

# Check metrics
npm run verify:docs --silent || {
  echo "❌ Documentation metrics check failed"
  exit 1
}

# Check changed markdown files for broken links
if git diff --cached --name-only | grep -q '\.md$'; then
  npm run lint:links --silent || {
    echo "❌ Link check failed"
    exit 1
  }
fi

echo "✓ Documentation checks passed"
```

---

## 8. Quarterly Documentation Review

### 8.1 Review Schedule

Schedule quarterly reviews of all documentation:

| Quarter | Focus Area |
|---------|-----------|
| Q1 | User-facing docs (README, PLATFORM_GUIDE, FAQ) |
| Q2 | Package READMEs and API docs |
| Q3 | Internal docs (TECHNICAL_OVERVIEW, DEPLOYMENT_GUIDE) |
| Q4 | Complete audit and metrics refresh |

### 8.2 Review Checklist

For each document:

- [ ] Metrics still accurate?
- [ ] Links still working?
- [ ] Code examples still valid?
- [ ] Screenshots current (if applicable)?
- [ ] Version numbers correct?
- [ ] Dependencies up to date?
- [ ] Style guide compliant?

### 8.3 Review Output

Document findings in `team/documentation-review-YYYY-QX.md`:

```markdown
# Documentation Review Q1 2026

**Reviewer:** @username  
**Date:** 2026-03-01

## Summary
- Documents reviewed: 15
- Issues found: 3
- Fixed: 3

## Issues Found

1. **PLATFORM_GUIDE.md** - Pattern count outdated
   - Fixed in commit abc123

2. **FAQ.md** - Broken link to external resource
   - Fixed in commit def456
```

---

## 9. Emergency Documentation Fixes

### 9.1 Critical Documentation Issues

Critical issues requiring immediate fix:

- Incorrect security instructions
- Broken installation steps
- Wrong API documentation causing errors
- Misleading metrics affecting trust

### 9.2 Emergency Process

1. **Create hotfix branch**
   ```bash
   git checkout -b docs-hotfix-critical-description
   ```

2. **Fix and verify**
   ```bash
   npm run verify:docs
   npm run lint:links
   ```

3. **Fast-track review**
   - Ping @docs-team for urgent review
   - Single approver acceptable for critical fixes

4. **Merge and deploy**
   - Merge to main
   - Cherry-pick to release branches

---

## 10. Resources

### 10.1 Tools Reference

| Tool | Purpose | Command |
|------|---------|---------|
| verify-doc-metrics | Check metrics accuracy | `npm run verify:docs` |
| lychee | Link checking | `npm run lint:links` |
| markdownlint | Markdown style | `npm run lint:md` |
| cspell | Spell checking | `npx cspell '**/*.md'` |

### 10.2 Key Files

| File | Purpose |
|------|---------|
| `docs/STYLE-GUIDE.md` | Writing and formatting standards |
| `docs/MAINTENANCE.md` | This document - maintenance processes |
| `CLAUDE.md` | AI assistant instructions |
| `team/lessonslearned.md` | Historical issues and solutions |

### 10.3 Getting Help

- **Documentation questions:** Open an issue with `documentation` label
- **Style guide clarifications:** Comment on STYLE-GUIDE.md
- **Process improvements:** Suggest via pull request

---

## Related Documents

- [Style Guide](./STYLE-GUIDE.md) - Writing and formatting standards
- [Contributing Guide](../github/CONTRIBUTING.md) - How to contribute to DojoLM
- [Platform Guide](./user/PLATFORM_GUIDE.md) - Primary user documentation

---

*This maintenance process is a living document. Updates require approval from the documentation team lead.*
