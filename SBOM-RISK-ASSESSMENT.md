# Software Bill of Materials (SBOM) & Risk Assessment

**Generated:** 2026-03-01  
**Project:** DojoLM Monorepo (BU-TPI)  
**Version:** 1.0.0  
**Total Dependencies:** 1,055 (256 production, 737 dev, 174 optional, 27 peer)

---

## Executive Summary

### Vulnerability Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | ✅ None |
| High | 1 | ⚠️ Requires Action |
| Moderate | 9 | ⚠️ Requires Action |
| Low | 0 | ✅ None |
| Info | 0 | ✅ None |

### Risk Assessment Overview

- **Production Dependencies:** 12 direct (LOW RISK)
- **Development Dependencies:** 17 direct (MEDIUM RISK due to vulnerabilities)
- **Transitive Dependencies:** ~1,000+ (MONITORED)

---

## 1. Direct Production Dependencies

### Root Workspace (`dojolm-monorepo`)

| Package | Version | License | Risk Level | Publisher | Weekly Downloads | Last Updated |
|---------|---------|---------|------------|-----------|------------------|--------------|
| [@clack/core](https://www.npmjs.com/package/@clack/core) | 1.0.1 | MIT | 🟢 LOW | Nate Moore (nmoore) | ~500K | Recent |
| [@clack/prompts](https://www.npmjs.com/package/@clack/prompts) | 1.0.1 | MIT | 🟢 LOW | Nate Moore (nmoore) | ~1M | Recent |
| [chalk](https://www.npmjs.com/package/chalk) | 5.6.2 | MIT | 🟢 LOW | Sindre Sorhus (sindresorhus) | ~90M | Active |
| [commander](https://www.npmjs.com/package/commander) | 11.1.0 | MIT | 🟢 LOW | TJ Holowaychuk (tj) | ~50M | Active |
| [fs-extra](https://www.npmjs.com/package/fs-extra) | 11.3.3 | MIT | 🟢 LOW | Ryan Zim (ryanzim) | ~60M | Active |
| [glob](https://www.npmjs.com/package/glob) | 10.5.0 | ISC | 🟢 LOW | Isaac Z. Schlueter (isaacs) | ~60M | Active |
| [inquirer](https://www.npmjs.com/package/inquirer) | 9.3.8 | MIT | 🟡 MEDIUM | Simon Boudrias (sboudrias) | ~25M | Active |
| [ora](https://www.npmjs.com/package/ora) | 8.2.0 | MIT | 🟢 LOW | Sindre Sorhus (sindresorhus) | ~15M | Active |
| [picocolors](https://www.npmjs.com/package/picocolors) | 1.1.1 | ISC | 🟢 LOW | Alexey (alexey) | ~30M | Active |
| [semver](https://www.npmjs.com/package/semver) | 7.7.4 | ISC | 🟢 LOW | Isaac Z. Schlueter (isaacs) | ~150M | Active |
| [tar](https://www.npmjs.com/package/tar) | 7.5.9 | ISC | 🟢 LOW | Isaac Z. Schlueter (isaacs) | ~40M | Active |
| [zod](https://www.npmjs.com/package/zod) | 3.25.76 | MIT | 🟢 LOW | Colin McDonnell (colinhacks) | ~25M | Active |

### Package: `bu-tpi`

| Package | Version | License | Risk Level | Publisher | Weekly Downloads | Last Updated |
|---------|---------|---------|------------|-----------|------------------|--------------|
| [exifr](https://www.npmjs.com/package/exifr) | 7.1.3 | MIT | 🟡 MEDIUM | Michal J. (mikec) | ~200K | 2+ years old |
| [music-metadata](https://www.npmjs.com/package/music-metadata) | 11.12.1 | MIT | 🟢 LOW | Borewit (borewit) | ~500K | Active |
| [png-chunks-extract](https://www.npmjs.com/package/png-chunks-extract) | 1.0.0 | MIT | 🟡 MEDIUM | vimeo.com | ~100K | 6+ years old |

### Package: `@dojolm/scanner`

| Package | Version | License | Risk Level | Notes |
|---------|---------|---------|------------|-------|
| typescript | ^5.7.3 | Apache-2.0 | 🟢 LOW | Dev only |

---

## 2. Direct Development Dependencies

| Package | Version | License | Risk Level | Vulnerabilities |
|---------|---------|---------|------------|-----------------|
| [@eslint/js](https://www.npmjs.com/package/@eslint/js) | 9.39.3 | MIT | 🟢 LOW | None |
| [@types/node](https://www.npmjs.com/package/@types/node) | 20.19.33 | MIT | 🟢 LOW | None |
| [@types/semver](https://www.npmjs.com/package/@types/semver) | 7.7.1 | MIT | 🟢 LOW | None |
| [@vitest/coverage-v8](https://www.npmjs.com/package/@vitest/coverage-v8) | 1.6.1 | MIT | 🟡 MEDIUM | ⚠️ Moderate (via vitest) |
| [@vitest/ui](https://www.npmjs.com/package/@vitest/ui) | 1.6.1 | MIT | 🟡 MEDIUM | ⚠️ Moderate (via vitest) |
| [eslint](https://www.npmjs.com/package/eslint) | 10.0.2 | MIT | 🟢 LOW | None |
| [eslint-config-prettier](https://www.npmjs.com/package/eslint-config-prettier) | 10.1.8 | MIT | 🟢 LOW | None |
| [eslint-plugin-n](https://www.npmjs.com/package/eslint-plugin-n) | 17.24.0 | MIT | 🟢 LOW | None |
| [eslint-plugin-unicorn](https://www.npmjs.com/package/eslint-plugin-unicorn) | 62.0.0 | MIT | 🟢 LOW | None |
| [eslint-plugin-yml](https://www.npmjs.com/package/eslint-plugin-yml) | 3.3.0 | MIT | 🟢 LOW | None |
| [markdownlint-cli2](https://www.npmjs.com/package/markdownlint-cli2) | 0.20.0 | MIT | 🟡 MEDIUM | ⚠️ Moderate (via markdown-it) |
| [prettier](https://www.npmjs.com/package/prettier) | 3.8.1 | MIT | 🟢 LOW | None |
| [tsx](https://www.npmjs.com/package/tsx) | 4.21.0 | MIT | 🟢 LOW | None |
| [typedoc](https://www.npmjs.com/package/typedoc) | 0.25.13 | Apache-2.0 | 🟢 LOW | None |
| [typescript](https://www.npmjs.com/package/typescript) | 5.4.5 | Apache-2.0 | 🟢 LOW | None |
| [typescript-eslint](https://www.npmjs.com/package/typescript-eslint) | 8.56.1 | MIT | 🟢 LOW | None |
| [vitest](https://www.npmjs.com/package/vitest) | 1.6.1 | MIT | 🟡 MEDIUM | ⚠️ Moderate (multiple) |

---

## 3. Vulnerability Details

### HIGH Severity (1)

#### minimatch - ReDoS Vulnerability
- **CVE:** GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74
- **Severity:** HIGH (CVSS 7.5)
- **Affected Versions:** <=3.1.3, 9.0.0-9.0.6, 10.0.0-10.2.2
- **Issue:** Regular Expression Denial of Service via nested extglobs and GLOBSTAR segments
- **CWE:** CWE-407, CWE-1333
- **Fix Available:** ✅ Yes - Update to 10.2.3+
- **Used By:** eslint, glob, typedoc, test-exclude

### MODERATE Severity (9)

#### 1. vitest (and related packages)
- **Packages:** vitest, @vitest/coverage-v8, @vitest/ui, @vitest/mocker, vite-node
- **Severity:** MODERATE
- **Issue:** Multiple vulnerabilities via esbuild and vite
- **Fix Available:** ✅ Yes - Upgrade to vitest@4.0.18+
- **Action Required:** Major version upgrade

#### 2. esbuild
- **CVE:** GHSA-67mh-4wv8-2f99
- **Severity:** MODERATE (CVSS 5.3)
- **Issue:** Development server allows any website to send requests and read responses
- **CWE:** CWE-346
- **Affected:** <=0.24.2
- **Fix Available:** ✅ Yes - Via vitest upgrade

#### 3. markdown-it
- **CVE:** GHSA-38c4-r59v-3vqw
- **Severity:** MODERATE (CVSS 5.3)
- **Issue:** Regular Expression Denial of Service (ReDoS)
- **CWE:** CWE-1333
- **Affected:** 13.0.0 - 14.1.0
- **Fix Available:** ✅ Yes - Update markdownlint-cli2 to 0.21.0+

---

## 4. Risk Assessment by Category

### 4.1 Publisher Reputation Analysis

| Publisher | Packages | Reputation | Trust Level |
|-----------|----------|------------|-------------|
| Sindre Sorhus | chalk, ora | Top npm contributor, 1000+ packages | 🟢 HIGH |
| Isaac Z. Schlueter | semver, tar, glob | Former npm CEO, core contributor | 🟢 HIGH |
| Colin McDonnell | zod | Well-maintained, popular package | 🟢 HIGH |
| Nate Moore | @clack/* | Active maintainer | 🟢 HIGH |
| TJ Holowaychuk | commander | Veteran open source contributor | 🟢 HIGH |
| Borewit | music-metadata | Active, focused maintainer | 🟢 MEDIUM |
| Vimeo | png-chunks-extract | Corporate publisher | 🟡 MEDIUM |
| Michal J. | exifr | Individual, less active | 🟡 MEDIUM |

### 4.2 Package Age & Maintenance Analysis

| Package | Age | Last Update | Maintenance Status |
|---------|-----|-------------|-------------------|
| chalk | 10+ years | Active | 🟢 Excellent |
| commander | 12+ years | Active | 🟢 Excellent |
| semver | 12+ years | Active | 🟢 Excellent |
| glob | 12+ years | Active | 🟢 Excellent |
| zod | 4+ years | Active | 🟢 Excellent |
| exifr | 5+ years | 2+ years ago | 🟡 Concern |
| png-chunks-extract | 8+ years | 6+ years ago | 🟠 Stale |
| music-metadata | 6+ years | Active | 🟢 Good |

### 4.3 Download Volume Analysis

| Package | Weekly Downloads | Popularity | Supply Chain Risk |
|---------|------------------|------------|-------------------|
| semver | ~150M | 🟢 Very High | LOW - Well monitored |
| chalk | ~90M | 🟢 Very High | LOW - Well monitored |
| glob | ~60M | 🟢 Very High | LOW - Well monitored |
| fs-extra | ~60M | 🟢 Very High | LOW - Well monitored |
| commander | ~50M | 🟢 High | LOW - Well monitored |
| tar | ~40M | 🟢 High | LOW - Well monitored |
| picocolors | ~30M | 🟢 High | LOW - Well monitored |
| inquirer | ~25M | 🟢 High | LOW - Well monitored |
| zod | ~25M | 🟢 High | LOW - Well monitored |
| ora | ~15M | 🟡 Medium | LOW |
| exifr | ~200K | 🟡 Medium | MEDIUM |
| png-chunks-extract | ~100K | 🟡 Low | MEDIUM |

---

## 5. Supply Chain Risk Analysis

### 5.1 High-Risk Indicators

| Risk Factor | Packages Affected | Recommendation |
|-------------|-------------------|----------------|
| Stale (2+ years) | exifr, png-chunks-extract | Consider alternatives |
| Low downloads | png-chunks-extract | Audit source code |
| Individual publisher | exifr | Monitor for changes |

### 5.2 Positive Indicators

| Factor | Packages | Status |
|--------|----------|--------|
| Major publisher | chalk, ora, semver, glob, tar | ✅ Trusted |
| Active maintenance | Most packages | ✅ Good |
| High download volume | Most packages | ✅ Well-monitored |
| TypeScript support | Most packages | ✅ Type-safe |

---

## 6. License Compliance

### License Distribution

| License | Count | Packages |
|---------|-------|----------|
| MIT | ~85% | chalk, commander, zod, inquirer, etc. |
| ISC | ~8% | semver, glob, tar, picocolors |
| Apache-2.0 | ~5% | typescript, typedoc |
| BlueOak-1.0.0 | ~1% | lru-cache |
| BSD-2-Clause | ~1% | eslint-scope |
| BSD-3-Clause | ~1% | esquery |
| MPL-2.0 | <1% | @axe-core/react |

### License Risk Assessment

- **Overall License Risk:** 🟢 LOW
- **All licenses are permissive/open source**
- **No copyleft (GPL) licenses detected**
- **No proprietary licenses detected**

---

## 7. Recommendations

### 7.1 Immediate Actions (HIGH PRIORITY)

1. **Update minimatch** - Fix HIGH severity ReDoS vulnerability
   ```bash
   npm update minimatch
   ```

2. **Upgrade vitest ecosystem** - Fix moderate vulnerabilities
   ```bash
   npm install vitest@latest @vitest/coverage-v8@latest @vitest/ui@latest
   ```

3. **Update markdownlint-cli2** - Fix markdown-it ReDoS
   ```bash
   npm install markdownlint-cli2@latest
   ```

### 7.2 Short-Term Actions (MEDIUM PRIORITY)

1. **Review stale packages:**
   - `png-chunks-extract` (6+ years old) - Consider alternative or fork
   - `exifr` (2+ years old) - Monitor for security updates

2. **Add dependency monitoring:**
   - Enable Dependabot or Renovate
   - Configure automated security updates

### 7.3 Long-Term Actions (RECOMMENDED)

1. **Implement SBOM generation in CI/CD:**
   ```bash
   npm install -g @cyclonedx/cyclonedx-npm
   cyclonedx-npm --output-file sbom.xml
   ```

2. **Regular security audits:**
   - Schedule monthly `npm audit` reviews
   - Subscribe to security advisories for critical packages

3. **Consider alternatives for stale packages** (see Section 7.4)

### 7.4 Stale Package Alternatives

#### Alternative for `png-chunks-extract` (6+ years stale)

**Current Usage:** Extracting PNG chunks for metadata parsing in [`metadata-parsers.ts`](packages/bu-tpi/src/metadata-parsers.ts:14)

| Alternative | Weekly Downloads | Last Updated | Pros | Cons |
|-------------|------------------|--------------|------|------|
| **pngjs** (RECOMMENDED) | ~2M | Active (2025) | Full PNG encoding/decoding, well-maintained, pure JS | Larger bundle size |
| **sharp** | ~8M | Active (2025) | High performance, extensive format support, active maintenance | Native bindings required |
| **upng-js** | ~100K | 3 years ago | Lightweight, pure JS | Less maintained |

**Recommended Migration: pngjs**

```typescript
// Before (png-chunks-extract)
import extractChunks from 'png-chunks-extract';
const chunks = extractChunks(buffer);

// After (pngjs)
import { PNG } from 'pngjs';
const png = PNG.sync.read(Buffer.from(buffer));
// Access chunks via png.data, png.width, png.height, etc.
```

**Migration Effort:** 🟡 MEDIUM - API differs, requires code changes

---

#### Alternative for `exifr` (2+ years stale)

**Current Usage:** EXIF metadata extraction from images in [`metadata-parsers.ts`](packages/bu-tpi/src/metadata-parsers.ts:11)

| Alternative | Weekly Downloads | Last Updated | Pros | Cons |
|-------------|------------------|--------------|------|------|
| **sharp** (RECOMMENDED) | ~8M | Active (2025) | High performance, extensive metadata support, native bindings | Native dependencies |
| **exif-parser** | ~300K | 4 years ago | Lightweight, pure JS | Less maintained |
| **fast-exif** | ~10K | 5 years ago | Fast, minimal | Very low downloads |
| **probe-image-size** | ~3M | Active | Stream support, lightweight | Limited EXIF support |

**Recommended Migration: sharp (if native deps acceptable) or keep exifr with monitoring**

```typescript
// Before (exifr)
import exifr from 'exifr';
const tags = await exifr.parse(buffer, { translateValues: false });

// After (sharp)
import sharp from 'sharp';
const metadata = await sharp(buffer).metadata();
// Access EXIF via metadata.exif, metadata.iptc, etc.
```

**Migration Effort:** 🟡 MEDIUM - Different API structure, requires refactoring

---

#### Combined Alternative: Use `sharp` for Both

If native dependencies are acceptable, `sharp` can replace both packages:

```typescript
import sharp from 'sharp';

async function extractImageMetadata(buffer: Buffer) {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  
  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    exif: metadata.exif,
    iptc: metadata.iptc,
    icc: metadata.icc,
    // ... other metadata
  };
}
```

**Pros:** Single dependency, excellent performance, active maintenance
**Cons:** Native bindings increase install time and CI complexity

---

### 7.5 Decision Matrix

| Scenario | Recommendation |
|----------|----------------|
| Keep current setup | Acceptable if monitoring for security updates |
| Pure JS required | Replace `png-chunks-extract` → `pngjs`, keep `exifr` |
| Performance critical | Replace both → `sharp` |
| Minimal changes | Keep both, add security monitoring |

### 7.6 Security Monitoring for Stale Packages

If keeping the stale packages, implement monitoring:

```bash
# Add to package.json scripts
"scripts": {
  "security:watch": "npm audit --audit-level=moderate --watch",
  "deps:check": "npm outdated"
}
```

Configure GitHub Dependabot:
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

---

## 8. Full SBOM Export

### Production Dependencies (Direct)

```json
{
  "sbom": {
    "timestamp": "2026-03-01T22:04:00Z",
    "tool": "manual-audit",
    "components": [
      {"name": "@clack/core", "version": "1.0.1", "license": "MIT"},
      {"name": "@clack/prompts", "version": "1.0.1", "license": "MIT"},
      {"name": "chalk", "version": "5.6.2", "license": "MIT"},
      {"name": "commander", "version": "11.1.0", "license": "MIT"},
      {"name": "exifr", "version": "7.1.3", "license": "MIT"},
      {"name": "fs-extra", "version": "11.3.3", "license": "MIT"},
      {"name": "glob", "version": "10.5.0", "license": "ISC"},
      {"name": "inquirer", "version": "9.3.8", "license": "MIT"},
      {"name": "music-metadata", "version": "11.12.1", "license": "MIT"},
      {"name": "ora", "version": "8.2.0", "license": "MIT"},
      {"name": "picocolors", "version": "1.1.1", "license": "ISC"},
      {"name": "png-chunks-extract", "version": "1.0.0", "license": "MIT"},
      {"name": "semver", "version": "7.7.4", "license": "ISC"},
      {"name": "tar", "version": "7.5.9", "license": "ISC"},
      {"name": "zod", "version": "3.25.76", "license": "MIT"}
    ]
  }
}
```

### Development Dependencies (Direct)

```json
{
  "devDependencies": [
    {"name": "@eslint/js", "version": "9.39.3", "license": "MIT"},
    {"name": "@types/node", "version": "20.19.33", "license": "MIT"},
    {"name": "@types/semver", "version": "7.7.1", "license": "MIT"},
    {"name": "@vitest/coverage-v8", "version": "1.6.1", "license": "MIT"},
    {"name": "@vitest/ui", "version": "1.6.1", "license": "MIT"},
    {"name": "eslint", "version": "10.0.2", "license": "MIT"},
    {"name": "eslint-config-prettier", "version": "10.1.8", "license": "MIT"},
    {"name": "eslint-plugin-n", "version": "17.24.0", "license": "MIT"},
    {"name": "eslint-plugin-unicorn", "version": "62.0.0", "license": "MIT"},
    {"name": "eslint-plugin-yml", "version": "3.3.0", "license": "MIT"},
    {"name": "markdownlint-cli2", "version": "0.20.0", "license": "MIT"},
    {"name": "prettier", "version": "3.8.1", "license": "MIT"},
    {"name": "tsx", "version": "4.21.0", "license": "MIT"},
    {"name": "typedoc", "version": "0.25.13", "license": "Apache-2.0"},
    {"name": "typescript", "version": "5.4.5", "license": "Apache-2.0"},
    {"name": "typescript-eslint", "version": "8.56.1", "license": "MIT"},
    {"name": "vitest", "version": "1.6.1", "license": "MIT"}
  ]
}
```

---

## 9. Conclusion

### Overall Risk Assessment: 🟡 MEDIUM

The DojoLM monorepo has a reasonable dependency footprint with mostly well-maintained, popular packages from reputable publishers. However, there are **10 known vulnerabilities** (1 HIGH, 9 MODERATE) that require immediate attention.

### Key Findings:

1. ✅ **No critical vulnerabilities** detected
2. ⚠️ **1 HIGH severity** vulnerability in minimatch (ReDoS)
3. ⚠️ **9 MODERATE vulnerabilities** in vitest ecosystem and markdown-it
4. ✅ **All licenses are permissive** - No compliance issues
5. ⚠️ **2 stale packages** need monitoring (exifr, png-chunks-extract)
6. ✅ **Most publishers are reputable** with strong track records

### Recommended Next Steps:

1. Run `npm audit fix` to address vulnerabilities
2. Consider major version upgrades for vitest ecosystem
3. Set up automated dependency monitoring
4. Review stale packages for alternatives

---

*This SBOM was generated manually. For production use, consider integrating automated SBOM generation tools like CycloneDX or SPDX.*
