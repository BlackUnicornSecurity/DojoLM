// SPDX-License-Identifier: Apache-2.0
/** Derive the immutable Next build ID for a sealed E13.S1 capture. */

import { execFileSync } from "node:child_process";

const CAPTURE_SOURCE_OBJECT = /^[a-f0-9]{40}$/;

type CaptureBuildEnvironment = Readonly<Record<string, string | undefined>>;

export interface CaptureBuildSource {
  readonly worktree: string;
  readonly head: string;
  readonly tree: string;
  readonly clean: boolean;
}

function git(root: string, args: readonly string[]): string {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function resolveCaptureBuildSource(
  root = process.cwd(),
): CaptureBuildSource {
  const worktree = git(root, ["rev-parse", "--show-toplevel"]);
  const head = git(worktree, ["rev-parse", "HEAD"]);
  const tree = git(worktree, ["rev-parse", "HEAD^{tree}"]);
  const status = git(worktree, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
  return Object.freeze({ worktree, head, tree, clean: status.length === 0 });
}

export function captureBuildId(
  env: CaptureBuildEnvironment = process.env,
  resolveSource: () => CaptureBuildSource = resolveCaptureBuildSource,
): string | null {
  if (env.NEXT_PUBLIC_E2E !== "1") return null;
  const sourceCommit = env.E2E_CAPTURE_SOURCE_COMMIT;
  const sourceTree = env.E2E_CAPTURE_SOURCE_TREE;
  if (!CAPTURE_SOURCE_OBJECT.test(sourceCommit ?? "")) {
    throw new Error(
      "E2E_CAPTURE_SOURCE_COMMIT must be the exact lowercase capture HEAD",
    );
  }
  if (!CAPTURE_SOURCE_OBJECT.test(sourceTree ?? "")) {
    throw new Error(
      "E2E_CAPTURE_SOURCE_TREE must be the exact lowercase capture tree",
    );
  }
  const actual = resolveSource();
  if (actual.head !== sourceCommit) {
    throw new Error("E2E capture source HEAD does not match the repository");
  }
  if (actual.tree !== sourceTree) {
    throw new Error("E2E capture source tree does not match the repository");
  }
  if (!actual.clean) {
    throw new Error("E2E capture source repository must be clean");
  }
  return `e2e-${sourceCommit}`;
}
