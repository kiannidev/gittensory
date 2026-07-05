import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function runChecker(env: Record<string, string | undefined> = {}): { status: number; out: string } {
  try {
    const stdout = execFileSync(process.execPath, ["scripts/check-miner-package.mjs"], {
      encoding: "utf8",
      env: { ...process.env, ...env },
    });
    return { status: 0, out: stdout };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

describe("check-miner-package script", () => {
  it("passes on the real miner workspace package", () => {
    const result = runChecker();
    expect(result.status).toBe(0);
    expect(result.out).toMatch(/^Miner package dry-run ok:/);
    expect(result.out).toContain("bin/gittensory-miner.js");
    expect(result.out).toContain("package.json");
  });

  it("rejects a forbidden path", () => {
    const result = runChecker({ CHECK_MINER_PACK_TEST_FILES: JSON.stringify([".env"]) });
    expect(result.status).toBe(1);
    expect(result.out).toContain("Forbidden file in miner package: .env");
  });

  it("rejects an unexpected file", () => {
    const result = runChecker({ CHECK_MINER_PACK_TEST_FILES: JSON.stringify(["scripts/extra.mjs"]) });
    expect(result.status).toBe(1);
    expect(result.out).toContain("Unexpected file in miner package: scripts/extra.mjs");
  });

  it("rejects secret-like content", () => {
    const result = runChecker({
      CHECK_MINER_PACK_TEST_FILES: JSON.stringify(["package.json"]),
      CHECK_MINER_PACK_TEST_CONTENT: "github_pat_abcdefghijklmnopqrstuvwxyz0123456789",
    });
    expect(result.status).toBe(1);
    expect(result.out).toContain("Secret-like content found in miner package file: package.json");
  });
});
