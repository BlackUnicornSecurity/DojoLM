// SPDX-License-Identifier: Apache-2.0
/* global module */
/* =============================================================================
 * audit/red-tally.js — the red-count-per-view instrument (committed per P1 audit R1)
 * =============================================================================
 * PORTED VERBATIM (algorithm unchanged) from the v2-skin design corpus for the
 * E13 acceptance run; only this SPDX + note was prepended. Committed baselines:
 * red-tally-baseline-{legacy,rest,v1}.json (this dir).
 * -----------------------------------------------------------------------------
 * PROVENANCE
 *   Reconstructed 2026-07-07 from RED-TALLY.md §Method and validated EXACT against
 *   the committed Phase-1 outputs (legacy mode):
 *     50-legal/privacy--1440x900.png   → 0 blobs   (json: 0)   ✓
 *     30-admin/scanner--1440x900.png   → 33 blobs  (json: 33)  ✓
 *     30-admin/flags--1440x900.png     → 55 blobs  (json: 55)  ✓
 *     30-admin/hattori--1440x900.png   → 113 blobs (json: 113) ✓
 *     redShare matched to 3 decimals on all four.
 *
 * METHOD (legacy = the v1.5 baseline numbers in RED-TALLY.md / red-tally*.json)
 *   1. Downscale capture to 1/3 (canvas drawImage).
 *   2. Red pixel test: r >= 110  &&  g < 0.55r  &&  b < 0.55r.
 *   3. Connected components, 4-CONNECTIVITY; regions >= 2px count as one blob.
 *   4. Report { blobs, redShare % of scaled pixels, h = source image height }.
 *
 * WHY A v2 MODE (P1-01)
 *   The legacy threshold reads --ember #F0744B (r240 g116 b75) as red: 116 < 132.
 *   The v2 skin demotes GAP cells / HIGH-severity text to ember BECAUSE it isn't
 *   torii — so re-running legacy mode on v2 captures reports the ratified
 *   demotion as red regressions. v2 mode adds one cut that separates the ramps:
 *
 *       count as torii only if  b >= 0.72 * g
 *
 *   Crimson keeps blue up relative to green; ember/orange drops it:
 *     --torii      #CC3A2F  b/g 0.810  → counted      --ember  #F0744B  b/g 0.647 → excluded
 *     --torii-text #E0544A  b/g 0.881  → counted      --gold   #D4A843  (already excluded by g-cut)
 *     --torii-hi   #F47A63  b/g 0.811  → counted
 *     --torii-deep #8B1E16  b/g 0.733  → counted
 *     --torii-mid  #B22A20  b/g 0.762  → counted
 *   v1.5's salmon link red #FF6A55 (b/g 0.802) still counts, so v2 mode remains
 *   valid on v1.5 captures for apples-to-apples diffs.
 *
 * USAGE (browser / project run_script)
 *   const { tallyImage } = window.RedTally;
 *   const img = await readImage('path/to/capture.png');       // or new Image()
 *   tallyImage(img, { mode: 'v2' })   → { blobs, redShare, h }
 *   tallyImage(img)                    → legacy mode (v1.5 baseline compatible)
 *   tallyImage(img, { mode: 'v2', moments: true })
 *                                      → adds .moments: blobs single-link-clustered
 *                                        within 36 source px (pass a number to tune).
 *                                        A red TEXT title = ~1 moment (vs ~1 blob per
 *                                        letter); compare MOMENTS to design counts.
 *   Running this file standalone executes the hex + moments self-tests below.
 *
 * COUNTING NOTES FOR v2 RE-CAPTURE (P3 audit R1, 2026-07-07)
 *   1. The Q5-exempt logo lockup (torii mark + red "LM") is red to this instrument:
 *      expect +1–2 exempt moments on every view that renders the sidebar or a
 *      gate-brand card. Subtract before comparing against board design counts.
 *   2. Red text (§4.3 banner titles) fragments: /forbidden ≈ 27 blobs = 1 moment.
 *   3. Earned data-red (sevbar crit segments, critical heat cells) is counted by the
 *      instrument but excluded from chrome-red design budgets.
 *   Expected-count table: HANDOFF-PHASE-5.md §5.
 * ========================================================================== */

(function (root) {
  "use strict";

  var SCALE = 1 / 3;
  var MIN_BLOB_PX = 2;

  function isRed(r, g, b, mode) {
    if (!(r >= 110 && g < 0.55 * r && b < 0.55 * r)) return false;
    if (mode === "v2" && !(b >= 0.72 * g)) return false; // ember/orange cut
    return true;
  }

  /* 4-connected component count over a binary mask, regions >= minPx */
  function countBlobs(mask, w, h, minPx) {
    var lbl = new Int32Array(w * h);
    var stack = [];
    var blobs = 0;
    for (var i = 0; i < w * h; i++) {
      if (!mask[i] || lbl[i]) continue;
      var size = 0;
      stack.push(i);
      lbl[i] = 1;
      while (stack.length) {
        var p = stack.pop();
        size++;
        var px = p % w,
          py = (p / w) | 0;
        if (px > 0 && mask[p - 1] && !lbl[p - 1]) {
          lbl[p - 1] = 1;
          stack.push(p - 1);
        }
        if (px < w - 1 && mask[p + 1] && !lbl[p + 1]) {
          lbl[p + 1] = 1;
          stack.push(p + 1);
        }
        if (py > 0 && mask[p - w] && !lbl[p - w]) {
          lbl[p - w] = 1;
          stack.push(p - w);
        }
        if (py < h - 1 && mask[p + w] && !lbl[p + w]) {
          lbl[p + w] = 1;
          stack.push(p + w);
        }
      }
      if (size >= minPx) blobs++;
    }
    return blobs;
  }

  /* like countBlobs but returns [{cx, cy, size}] per region >= minPx (for moments) */
  function collectBlobs(mask, w, h, minPx) {
    var lbl = new Int32Array(w * h);
    var stack = [];
    var out = [];
    for (var i = 0; i < w * h; i++) {
      if (!mask[i] || lbl[i]) continue;
      var size = 0,
        sx = 0,
        sy = 0;
      stack.push(i);
      lbl[i] = 1;
      while (stack.length) {
        var p = stack.pop();
        size++;
        var px = p % w,
          py = (p / w) | 0;
        sx += px;
        sy += py;
        if (px > 0 && mask[p - 1] && !lbl[p - 1]) {
          lbl[p - 1] = 1;
          stack.push(p - 1);
        }
        if (px < w - 1 && mask[p + 1] && !lbl[p + 1]) {
          lbl[p + 1] = 1;
          stack.push(p + 1);
        }
        if (py > 0 && mask[p - w] && !lbl[p - w]) {
          lbl[p - w] = 1;
          stack.push(p - w);
        }
        if (py < h - 1 && mask[p + w] && !lbl[p + w]) {
          lbl[p + w] = 1;
          stack.push(p + w);
        }
      }
      if (size >= minPx) out.push({ cx: sx / size, cy: sy / size, size: size });
    }
    return out;
  }

  /* single-link clustering of blob centroids within radius (mask px) → moment count */
  function momentsFrom(blobs, radius) {
    var r2 = radius * radius;
    var parent = blobs.map(function (_, i) {
      return i;
    });
    function find(i) {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    }
    for (var i = 0; i < blobs.length; i++)
      for (var j = i + 1; j < blobs.length; j++) {
        var dx = blobs[i].cx - blobs[j].cx,
          dy = blobs[i].cy - blobs[j].cy;
        if (dx * dx + dy * dy <= r2) {
          var a = find(i),
            b = find(j);
          if (a !== b) parent[a] = b;
        }
      }
    var roots = {};
    blobs.forEach(function (_, i) {
      roots[find(i)] = 1;
    });
    return Object.keys(roots).length;
  }

  function tallyImageData(data, w, h, opts) {
    var mode = (opts && opts.mode) || "legacy";
    var mask = new Uint8Array(w * h);
    var redpx = 0;
    for (var i = 0; i < w * h; i++) {
      if (isRed(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], mode)) {
        mask[i] = 1;
        redpx++;
      }
    }
    var out = {
      blobs: countBlobs(mask, w, h, MIN_BLOB_PX),
      redShare: +((100 * redpx) / (w * h)).toFixed(3),
    };
    if (opts && opts.momentRadius)
      out.moments = momentsFrom(
        collectBlobs(mask, w, h, MIN_BLOB_PX),
        opts.momentRadius,
      );
    return out;
  }

  /* img: HTMLImageElement (loaded). Returns { blobs, redShare, h: source height }
     (+ .moments when opts.moments is set — true = 36 source px, or pass a number). */
  function tallyImage(img, opts) {
    var w = Math.round(img.width * SCALE),
      h = Math.round(img.height * SCALE);
    var c =
      typeof root.createCanvas === "function"
        ? root.createCanvas(w, h)
        : root.document.createElement("canvas");
    c.width = w;
    c.height = h;
    var x = c.getContext("2d");
    x.drawImage(img, 0, 0, w, h);
    var o = { mode: opts && opts.mode };
    if (opts && opts.moments)
      o.momentRadius =
        (typeof opts.moments === "number" ? opts.moments : 36) * SCALE;
    var out = tallyImageData(x.getImageData(0, 0, w, h).data, w, h, o);
    out.h = img.height;
    return out;
  }

  /* ---- hex self-test: the classifier must agree with the token intent ---- */
  function selfTest(cases) {
    cases = cases || [
      ["--torii", 0xcc, 0x3a, 0x2f, { legacy: true, v2: true }],
      ["--torii-text", 0xe0, 0x54, 0x4a, { legacy: true, v2: true }],
      ["--torii-hi", 0xf4, 0x7a, 0x63, { legacy: true, v2: true }],
      ["--torii-deep", 0x8b, 0x1e, 0x16, { legacy: true, v2: true }],
      ["--torii-mid", 0xb2, 0x2a, 0x20, { legacy: true, v2: true }],
      ["ks salmon", 0xff, 0x6a, 0x55, { legacy: true, v2: true }],
      ["--ember", 0xf0, 0x74, 0x4b, { legacy: true, v2: false }], // the P1-01 fork
      ["--gold", 0xd4, 0xa8, 0x43, { legacy: false, v2: false }],
      ["--jade", 0x34, 0xc7, 0x6a, { legacy: false, v2: false }],
      ["--fg", 0xec, 0xee, 0xf2, { legacy: false, v2: false }],
    ];
    var fails = [];
    cases.forEach(function (c) {
      ["legacy", "v2"].forEach(function (m) {
        var got = isRed(c[1], c[2], c[3], m);
        if (got !== c[4][m])
          fails.push(c[0] + " [" + m + "] got " + got + " want " + c[4][m]);
      });
    });
    return { pass: fails.length === 0, fails: fails };
  }

  /* ---- moments self-test: a 4-blob "word" + one far dot → 5 blobs, 2 moments ---- */
  function selfTestMoments() {
    var w = 120,
      h = 30,
      data = new Uint8ClampedArray(w * h * 4);
    function dot(x0, y0) {
      for (var y = y0; y < y0 + 3; y++)
        for (var x = x0; x < x0 + 3; x++) {
          var p = (y * w + x) * 4;
          data[p] = 0xcc;
          data[p + 1] = 0x3a;
          data[p + 2] = 0x2f;
          data[p + 3] = 255;
        }
    }
    [10, 20, 30, 40].forEach(function (x) {
      dot(x, 10);
    });
    dot(110, 10);
    var out = tallyImageData(data, w, h, { mode: "v2", momentRadius: 12 });
    return { pass: out.blobs === 5 && out.moments === 2, got: out };
  }

  function runSelfTestGate(options) {
    var classifier = options.classifier;
    var moments = options.moments;
    var io = options.io;
    if (classifier.pass)
      io.log("[red-tally] self-test: PASS (10 hexes × 2 modes)");
    else
      io.error("[red-tally] self-test: FAIL → " + classifier.fails.join(" · "));
    if (moments.pass)
      io.log("[red-tally] moments self-test: PASS (5 blobs → 2 moments)");
    else
      io.error(
        "[red-tally] moments self-test: FAIL → " + JSON.stringify(moments.got),
      );
    return classifier.pass && moments.pass ? 0 : 1;
  }

  function applyExitCode(exitCode, processApi) {
    if (exitCode !== 0 && processApi) processApi.exitCode = exitCode;
    return exitCode;
  }

  function runStandalone(options) {
    if (!options.io) return 0;
    var classifier = options.classifier || selfTest();
    var moments = options.moments || selfTestMoments();
    var exitCode = runSelfTestGate({
      classifier: classifier,
      moments: moments,
      io: options.io,
    });
    return applyExitCode(exitCode, options.processApi);
  }

  var api = {
    SCALE: SCALE,
    MIN_BLOB_PX: MIN_BLOB_PX,
    isRed: isRed,
    tallyImage: tallyImage,
    tallyImageData: tallyImageData,
    momentsFrom: momentsFrom,
    selfTest: selfTest,
    selfTestMoments: selfTestMoments,
    runSelfTestGate: runSelfTestGate,
    applyExitCode: applyExitCode,
    runStandalone: runStandalone,
  };
  root.RedTally = api;
  /* v8 ignore next -- CommonJS compatibility is unavailable in Vitest's ESM transform. */
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  runStandalone({ io: root.console, processApi: root.process });
})(globalThis);
