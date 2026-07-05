import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import { runMinerPackCheck, validateMinerPackFileList } from "../../scripts/check-miner-package.mjs";

describe("check-miner-package script", () => {
  it("passes on the real miner workspace package", () => {
    const output = execFileSync(process.execPath, ["scripts/check-miner-package.mjs"], { encoding: "utf8" });
    expect(output).toMatch(/^Miner package dry-run ok:/);
    expect(output).toContain("bin/gittensory-miner.js");
    expect(output).toContain("package.json");
  });

  it("accepts a well-formed pack file list", () => {
    const paths = validateMinerPackFileList(
      ["package.json", "bin/gittensory-miner.js", "lib/cli.js", "README.md"],
      () => "safe miner package content",
    );
    expect(paths).toEqual(["README.md", "bin/gittensory-miner.js", "lib/cli.js", "package.json"]);
  });

  it("rejects a forbidden path", () => {
    expect(() =>
      validateMinerPackFileList([".env"], () => ""),
    ).toThrow("Forbidden file in miner package: .env");
  });

  it("rejects an unexpected file", () => {
    expect(() =>
      validateMinerPackFileList(["scripts/extra.mjs"], () => ""),
    ).toThrow("Unexpected file in miner package: scripts/extra.mjs");
  });

  it("rejects secret-like content", () => {
    expect(() =>
      validateMinerPackFileList(["package.json"], () => "github_pat_abcdefghijklmnopqrstuvwxyz0123456789"),
    ).toThrow("Secret-like content found in miner package file: package.json");
  });

  it("runMinerPackCheck can validate injected pack metadata without npm pack", () => {
    const output = runMinerPackCheck({
      pack: { files: [{ path: "package.json" }, { path: "bin/gittensory-miner.js" }] },
      readContent: () => "{}",
    });
    expect(output).toBe("Miner package dry-run ok: bin/gittensory-miner.js, package.json\n");
  });
});
