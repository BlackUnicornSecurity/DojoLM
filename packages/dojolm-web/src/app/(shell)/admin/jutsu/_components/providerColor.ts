// SPDX-License-Identifier: Apache-2.0
/**
 * providerColor / providerLogo — map a model's source (connector) and family
 * to a brand identity: a color accent (rail / bottom line / wash / label ink)
 * and a manufacturer logo. Both derive from ONE resolution so the color and
 * the mark always agree on who made the model.
 *
 * Colors are brand-accurate (source-verified); each brand carries a real
 * secondary so a gradient separates former look-alikes. Monochrome brands
 * (OpenAI, Moonshot, Yi) resolve to a dark-visible accent.
 *
 * Resolution order:
 *   1. BlackUnicorn / Sensei source → glass easter egg (Sensei is a
 *      BlackUnicorn model); its own PNG mark is used.
 *   2. Model FAMILY (regex on the model id) → so a Gemma running under Ollama
 *      reads Google and shows the Gemini mark; "-obliterated" flags red.
 *   3. SOURCE provider.
 *   4. A stable hashed hue (no logo) so unknown pairs never collapse to one
 *      color.
 *
 * The label ink is lightened toward `--fg` for ≥4.5:1 contrast; the same value
 * tints the (monochrome, mask-rendered) logo. No raw provider/model text is
 * ever interpolated into a returned CSS value — only fixed palettes, fixed
 * asset slugs and a numeric hash — so there is no injection surface. Logo
 * slugs map to files under `public/branding/models/`.
 */

import type { CSSProperties } from "react";

type Stops = readonly string[];

interface Identity {
  readonly stops: Stops;
  /** Asset slug under /branding/models (…\.svg), or null when no mark exists. */
  readonly logo: string | null;
}

export interface ModelAccent {
  /** BlackUnicorn / Sensei glass treatment — CSS owns the surface. */
  readonly glass: boolean;
  /** CSS custom properties to spread onto the card's inline style. */
  readonly vars: CSSProperties;
}

export interface ModelLogo {
  readonly glass: boolean;
  /** Full asset path to render, or null when the maker has no available mark. */
  readonly src: string | null;
}

/** Shared palettes referenced by both the source and family tables. */
const GEMINI: Stops = ["#4285F4", "#9B72CB", "#D96570"];
const FLAME: Stops = ["#FA500F", "#FFC61A"];
const CORAL: Stops = ["#FF7759", "#C24A34"];
const DEEPSEEK: Stops = ["#4D6BFE", "#3A50D9"];

/** Source (connector) → identity. Single stop = solid; many = gradient. */
const SOURCE: Readonly<Record<string, Identity>> = {
  openai: { stops: ["#10A37F", "#0E8A6B"], logo: "openai" },
  anthropic: { stops: ["#D97757", "#C56A4E"], logo: "claude" },
  google: { stops: GEMINI, logo: "gemini" },
  cohere: { stops: CORAL, logo: "cohere" },
  ai21: { stops: ["#E61E93", "#D00B4E"], logo: "ai21" },
  replicate: { stops: ["#EA2804", "#9B1C05"], logo: "replicate" },
  cloudflare: { stops: ["#F38020", "#FAAE40"], logo: "cloudflare" },
  groq: { stops: ["#F55036", "#E03A20"], logo: "groq" },
  together: { stops: ["#EF2CC1", "#FC4C02"], logo: "together" },
  fireworks: { stops: ["#6720FF", "#C9B6FF"], logo: "fireworks" },
  deepseek: { stops: DEEPSEEK, logo: "deepseek" },
  mistral: { stops: FLAME, logo: "mistral" },
  ollama: { stops: ["#8A94A6", "#5E6676"], logo: "ollama" },
  lmstudio: { stops: ["#6F42C1", "#8FE0C4"], logo: "lmstudio" },
  llamacpp: { stops: ["#9A8C6E"], logo: null },
  zai: { stops: ["#3859FF", "#6E8BFF"], logo: "zhipu" },
  moonshot: { stops: ["#AEB6C4", "#6E7480"], logo: "moonshot" },
  custom: { stops: ["#7A8290"], logo: null },
};

/**
 * Model-family → identity, matched against the lowercased model id. Order is
 * significant: the uncensored markers win over the base family so an
 * obliterated build reads red (and shows no maker logo). Short/ambiguous stems
 * are guarded — `llama` still catches tinyllama/openllama/codellama but a
 * negative lookbehind rejects the runner name "ollama"; `phi`/`yi` are
 * boundary-anchored so they don't fire inside "sophia"/"graphite".
 */
const FAMILY: ReadonlyArray<readonly [RegExp, Identity]> = [
  [/obliterat|abliterat|uncensored|dolphin/, { stops: ["#E0544A", "#B0322A"], logo: null }],
  [/gemma|gemini/, { stops: GEMINI, logo: "gemini" }],
  [/qwen/, { stops: ["#665CEE", "#332E91"], logo: "qwen" }],
  [/mixtral|mistral/, { stops: FLAME, logo: "mistral" }],
  [/deepseek/, { stops: DEEPSEEK, logo: "deepseek" }],
  [/nomic|embed/, { stops: ["#48816D", "#9AB9AE"], logo: null }],
  [/command-?r|cohere/, { stops: CORAL, logo: "cohere" }],
  [/(?<!o)llama/, { stops: ["#0866FF", "#7F50D5"], logo: "meta" }],
  [/(?:^|[^a-z])phi(?:[^a-z]|$)/, { stops: ["#00A4EF", "#0078D4"], logo: "microsoft" }],
  [/(?:^|[^a-z])yi(?:[^a-z]|$)/, { stops: ["#00FF25", "#00A81C"], logo: "yi" }],
];

const LOGO_DIR = "/branding/models";
const GLASS_LOGO = `${LOGO_DIR}/blackunicorn.png`;

/** Deterministic pleasant hue for unknown source/model pairs. */
function hashStops(seed: string): Stops {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return [`hsl(${h % 360} 55% 62%)`];
}

function resolve(provider: string, model: string): {
  stops: Stops;
  glass: boolean;
  logo: string | null;
} {
  // Cap before lowercasing/matching — model ids are API-supplied and uncapped
  // upstream; the accent only needs the leading stem.
  const p = provider.trim().toLowerCase().slice(0, 128);
  const m = model.trim().toLowerCase().slice(0, 128);
  // Sensei is a BlackUnicorn model — both take the glass easter egg.
  if (p === "blackunicorn" || p === "sensei") return { stops: [], glass: true, logo: null };
  for (const [re, id] of FAMILY) {
    if (re.test(m)) return { stops: id.stops, glass: false, logo: id.logo };
  }
  const src = SOURCE[p];
  if (src) return { stops: src.stops, glass: false, logo: src.logo };
  return { stops: hashStops(`${p}/${m}`), glass: false, logo: null };
}

/** Alpha via color-mix so the helper never parses hex or hsl. */
const soft = (c: string, a: number): string =>
  `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;

function railGradient(stops: Stops): string {
  if (stops.length === 1) {
    return `linear-gradient(180deg, ${stops[0]} 0%, ${soft(stops[0], 0.4)} 100%)`;
  }
  const parts = stops.map(
    (s, i) => `${s} ${Math.round((i * 100) / (stops.length - 1))}%`,
  );
  return `linear-gradient(180deg, ${parts.join(", ")})`;
}

export function providerColor(provider: string, model: string): ModelAccent {
  const { stops, glass } = resolve(provider, model);
  if (glass) return { glass: true, vars: {} };
  const head = stops[0];
  const tail = stops[stops.length - 1];
  return {
    glass: false,
    vars: {
      "--mdl-rail": railGradient(stops),
      "--mdl-base": `linear-gradient(90deg, ${soft(head, 0.55)} 0%, ${soft(tail, 0.06)} 100%)`,
      "--mdl-wash": `linear-gradient(150deg, ${soft(head, 0.15)} 0%, ${soft(tail, 0.05)} 44%, transparent 74%)`,
      // Lightened toward the foreground so the small uppercase label and the
      // mask-tinted logo stay legible on --bg-2; the rail/wash keep full brand.
      "--mdl-ink": `color-mix(in srgb, ${head} 62%, var(--fg))`,
    } as CSSProperties,
  };
}

/** Manufacturer mark for the card's top-right, or null when none is available. */
export function providerLogo(provider: string, model: string): ModelLogo {
  const { glass, logo } = resolve(provider, model);
  if (glass) return { glass: true, src: GLASS_LOGO };
  return { glass: false, src: logo ? `${LOGO_DIR}/${logo}.svg` : null };
}
