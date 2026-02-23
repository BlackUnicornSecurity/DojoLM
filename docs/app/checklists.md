# TPI Testing Checklists

Human-readable checklists for validation workflows at different stages of development.

---

## Pre-Commit Checklist

Run this checklist before committing changes to verify basic correctness.

### Code Quality
- [ ] TypeScript type checking passes: `npm run typecheck` (or `tsc --noEmit`)
- [ ] No console.log or debug statements left in production code
- [ ] New code follows existing patterns and conventions
- [ ] Comments added for non-obvious logic

### Testing
- [ ] All new fixtures have corresponding clean control files
- [ ] New patterns tested against false positives on existing clean fixtures
- [ ] Regression tests pass: `npx tsx tools/test-regression.ts`
- [ ] False positive check passes: `npx tsx tools/test-fp-check.ts`

### Documentation
- [ ] README.md updated if new features added
- [ ] fixtures/manifest.json updated with new fixtures
- [ ] Version number incremented if breaking changes

---

## EPIC Completion Checklist

Use this checklist when completing an EPIC to ensure full coverage.

### Fixtures
- [ ] All stories in EPIC have corresponding fixture files
- [ ] Each attack category has at least one clean control fixture
- [ ] Fixtures generate correctly: `npm run generate`
- [ ] Binary fixtures (images, audio) have valid format/metadata

### Scanner Coverage
- [ ] All attack fixtures trigger BLOCK or WARN verdict
- [ ] All clean fixtures return ALLOW verdict (zero false positives)
- [ ] New patterns added to appropriate pattern groups
- [ ] Pattern names follow naming convention: `category_description`

### Testing
- [ ] Story-specific test file created (e.g., `test-epic4.ts`)
- [ ] All tests pass: attack→BLOCK/WARN, clean→ALLOW
- [ ] No regressions on existing fixtures
- [ ] Test output includes pass/fail counts

### Documentation
- [ ] EPIC marked COMPLETE in planning document
- [ ] New patterns documented in README.md pattern table
- [ ] New fixture categories added to fixture table
- [ ] TPI story coverage updated (if applicable)

---

## Release Readiness Checklist

Use this checklist before cutting a release.

### Test Coverage
- [ ] All test suites pass: `npm test` (or `npx tsx team/qa-tools/run-all-tests.ts`)
- [ ] Zero false positives across all clean fixtures
- [ ] Zero regressions across all existing fixtures
- [ ] All required EPICs marked COMPLETE

### Documentation
- [ ] README.md reflects current state
- [ ] API documentation is complete and accurate
- [ ] Changelog updated with version notes
- [ ] Breaking changes documented

### Security
- [ ] No hardcoded secrets or credentials
- [ ] Rate limiting configured appropriately
- [ ] CSP headers present on fixture endpoints
- [ ] Path traversal prevention tested

### Infrastructure
- [ ] Server starts without errors: `npm start`
- [ ] All API endpoints respond correctly
- [ ] Fixture metadata extraction works for binary files
- [ ] Type checking passes with no errors

---

## Quick Reference: Test Commands

```bash
# Individual tests
npx tsx tools/test-regression.ts          # Full fixture regression
npx tsx tools/test-fp-check.ts              # False positive verification
npx tsx tools/test-epic4.ts                 # EPIC 4 coverage

# Run all tests
npm test                                    # Or: npx tsx team/qa-tools/run-all-tests.ts

# With options
npx tsx team/qa-tools/run-all-tests.ts --filter=regression,epic4
npx tsx team/qa-tools/run-all-tests.ts --verbose

# API endpoint (server must be running)
curl http://localhost:8089/api/run-tests
curl http://localhost:8089/api/run-tests?filter=regression
curl "http://localhost:8089/api/run-tests?verbose=true"
```

---

## Test Failure Troubleshooting

| Symptom | Common Cause | Fix |
|---------|--------------|-----|
| False positive on clean fixture | New pattern too broad | Narrow regex pattern, add word boundaries |
| Attack fixture not detected | Missing pattern or heuristic | Add new pattern to appropriate group |
| Typecheck errors | Type mismatch in new code | Fix type definitions in `src/types.ts` |
| Binary fixture skipped | Invalid file format | Regenerate with `npm run generate` |
| Regression test fails | Existing test now fails | Check if new changes broke existing functionality |
