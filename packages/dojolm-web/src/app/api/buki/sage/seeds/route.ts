// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET/POST /api/buki/sage/seeds — SAGE seed-library CRUD
 * Story: WAVE2-SAGE / ADR-0014 / TICKET-BUKI-POST-AUTH (PR-4 of the
 * Buki Phase 2 wave — POST migrated from createApiHandler to
 * withAuth({ role: 'admin' }) so CSRF double-submit + RBAC are
 * enforced server-side, not just on the client. Mirrors the Ronin /
 * Jutsu admin-write convention.)
 *
 * GET: paginated + filterable list of seed records. Falls back to the
 * bundled `DEFAULT_SEED_CORPUS` when `<TPI_DATA_DIR>/sage/seeds/` is
 * empty — this keeps fresh deployments shipping with a usable starter
 * corpus while still allowing operators to override on disk. Public
 * (world-readable) per the original story.
 *
 * POST: append a new seed record. Admin-only via withAuth +
 * CSRF-verified via the double-submit cookie. Body is validated against
 * the closed `category` enum and length-capped content.
 *
 * RATE-LIMIT: read-tier for GET (via createApiHandler), write-tier for
 * POST (manually via checkRateLimit since withAuth doesn't bundle it).
 */

import { NextRequest, NextResponse } from "next/server";
import type { AivssScore } from "bu-tpi/aivss";
import { createApiHandler, checkRateLimit } from "@/lib/api-handler";
import { withAuth } from "@/lib/auth/route-guard";
import { getDataPath } from "@/lib/runtime-paths";
import { readFile, readdir, mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import {
  DEFAULT_SEED_CORPUS,
  SAGE_CRITICITY_LEVELS,
  SEED_CATEGORIES,
  type SageCriticity,
  type SeedRecord,
} from "@/lib/sage/fixtures";
import { computeForSeed } from "@/lib/aivss/computeForSeed";

/**
 * TICKET-G3-API-BUKI — attach server-computed AIVSS score per seed row
 * alongside the existing wire shape so the host client can render
 * `<AivssPill>` chips from the real server value instead of deriving
 * client-side. `null` is the EXPLICIT "no signal" slot when criticity
 * is missing / unrecognised.
 */
function withAivss(seed: SeedRecord): SeedRecord & {
  aivss: AivssScore | null;
} {
  return { ...seed, aivss: computeForSeed(seed) };
}

const SEEDS_DIR = getDataPath("sage", "seeds");

const VALID_CATEGORIES = new Set<SeedRecord["category"]>(SEED_CATEGORIES);
const VALID_CRITICITIES = new Set<SageCriticity>(SAGE_CRITICITY_LEVELS);
const MAX_LIMIT = 200;
const MAX_CONTENT_LEN = 8_000;
const MAX_NAME_LEN = 200;
const MAX_DESC_LEN = 2_000;
const MAX_TAGS = 16;
const MAX_TAG_LEN = 64;

function isValidCategory(value: unknown): value is SeedRecord["category"] {
  return (
    typeof value === "string" && (VALID_CATEGORIES as Set<string>).has(value)
  );
}

function isValidCriticity(value: unknown): value is SageCriticity {
  return (
    typeof value === "string" && (VALID_CRITICITIES as Set<string>).has(value)
  );
}

async function loadStoredSeeds(): Promise<SeedRecord[]> {
  if (!existsSync(SEEDS_DIR)) return [];
  const files = await readdir(SEEDS_DIR);
  const records: SeedRecord[] = [];
  // Sort reverse so a folder listed in filesystem order surfaces the
  // most recently POST-created records first. IDs are random UUID slices
  // so this is cosmetic, not a time ordering — documented to avoid
  // confusion when adding future sort-on-createdAt behaviour.
  for (const file of files
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()) {
    try {
      const raw = await readFile(path.join(SEEDS_DIR, file), "utf-8");
      records.push(JSON.parse(raw) as SeedRecord);
    } catch {
      // skip malformed file
    }
  }
  return records;
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const categoryRaw = searchParams.get("category");
      const category = isValidCategory(categoryRaw) ? categoryRaw : null;
      const limit = Math.min(
        Number(searchParams.get("limit")) || 50,
        MAX_LIMIT,
      );
      const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

      let seeds = await loadStoredSeeds();
      if (seeds.length === 0) {
        seeds = DEFAULT_SEED_CORPUS;
      }
      if (category) {
        seeds = seeds.filter((s) => s.category === category);
      }

      const total = seeds.length;
      // TICKET-G3-API-BUKI: attach server-computed AIVSS per row so the
      // host renders real chips instead of deriving client-side. Slice
      // before mapping so we only score the page we return (bounds CPU
      // cost — at MAX_LIMIT=200 each row triggers one
      // `findingToAivssMetrics` + `calculate` call).
      const paginated = seeds.slice(offset, offset + limit).map(withAivss);

      return NextResponse.json({
        seeds: paginated,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      console.error("[sage/seeds] load error:", detail);
      return NextResponse.json(
        { error: "Failed to load seeds" },
        { status: 500 },
      );
    }
  },
  { public: true, rateLimit: "read" },
);

export const POST = withAuth(
  async (request: NextRequest) => {
    // PR-4 (TICKET-BUKI-POST-AUTH) — rate-limit the write boundary.
    // withAuth handles auth + RBAC + CSRF but does NOT bundle
    // rate-limiting like createApiHandler does — we add it manually
    // here to preserve the write-tier ceiling on the previous POST
    // shape. Mirrors the Ronin POST pattern verbatim.
    const rate = await checkRateLimit(request, "write");
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    try {
      const body = (await request.json()) as Partial<SeedRecord>;

      if (!body.name || !body.content || !body.category) {
        return NextResponse.json(
          { error: "Missing required fields: name, content, category" },
          { status: 400 },
        );
      }
      if (!isValidCategory(body.category)) {
        return NextResponse.json(
          { error: "category must be one of the SAGE seed categories" },
          { status: 400 },
        );
      }

      const tags = Array.isArray(body.tags) ? body.tags : [];
      const sanitizedTags = tags
        .filter((t): t is string => typeof t === "string")
        .slice(0, MAX_TAGS)
        .map((t) => t.slice(0, MAX_TAG_LEN));

      const criticity: SageCriticity = isValidCriticity(body.criticity)
        ? body.criticity
        : "MEDIUM";

      const newSeed: SeedRecord = {
        id: `SEED-${crypto.randomUUID().slice(0, 8)}`,
        name: String(body.name).slice(0, MAX_NAME_LEN),
        content: String(body.content).slice(0, MAX_CONTENT_LEN),
        description: String(body.description ?? "").slice(0, MAX_DESC_LEN),
        category: body.category,
        fitness:
          typeof body.fitness === "number"
            ? Math.max(0, Math.min(1, body.fitness))
            : 0,
        usageCount: 0,
        successRate: 0,
        generation:
          typeof body.generation === "number"
            ? Math.max(0, Math.floor(body.generation))
            : 0,
        createdAt: new Date().toISOString(),
        tags: sanitizedTags,
        criticity,
      };

      if (!existsSync(SEEDS_DIR)) {
        await mkdir(SEEDS_DIR, { recursive: true });
      }
      await writeFile(
        path.join(SEEDS_DIR, `${newSeed.id}.json`),
        JSON.stringify(newSeed, null, 2),
        "utf-8",
      );

      return NextResponse.json({ seed: withAivss(newSeed) }, { status: 201 });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      console.error("[sage/seeds] create error:", detail);
      return NextResponse.json(
        { error: "Failed to create seed" },
        { status: 500 },
      );
    }
  },
  // PR-4 — admin-only + CSRF double-submit enforced for cookie-auth
  // POSTs. Non-admins receive 403. CSRF caveats (per route-guard policy):
  //   - API-key authentication SKIPS the CSRF check (API keys are not
  //     vulnerable to CSRF — adversarial review HIGH-1 + MED-1 in PR-4).
  //   - Demo-mode short-circuits the entire gate BEFORE any auth or
  //     CSRF check fires and injects a synthetic admin user (see
  //     route-guard.ts demo-mode branch). The seed store writes to
  //     `<TPI_DATA_DIR>/sage/seeds/`
  //     which is ephemeral in demo deployments (operators MUST point
  //     TPI_DATA_DIR at a tmpdir for demo to keep that promise). Same
  //     posture as every other admin POST under route-guard.
  // Defence-in-depth against the previously client-only CSRF token
  // added in PR #845 (architect HIGH-1 follow-up).
  { role: "admin" },
);
