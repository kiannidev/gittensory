import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseRejectReasonsArgs,
  parseRejectRenderArgs,
  runRejectCli,
  runRejectReasons,
  runRejectRender,
} from "../../packages/gittensory-miner/lib/rejection-render.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("gittensory-miner reject render command", () => {
  it("parseRejectRenderArgs validates required flags", () => {
    expect(parseRejectRenderArgs([])).toEqual({
      error: expect.stringContaining("Usage: gittensory-miner reject render"),
    });
    expect(parseRejectRenderArgs(["--reason", "gate_close"])).toEqual({
      error: expect.stringContaining("Usage: gittensory-miner reject render"),
    });
    expect(parseRejectRenderArgs(["--reason", "gate_close", "--repo", "acme/widgets", "--pr", "0"])).toEqual({
      error: "Invalid value for --pr: must be a positive integer.",
    });
    expect(
      parseRejectRenderArgs([
        "--reason",
        "gate_close",
        "--repo",
        "acme/widgets",
        "--pr",
        "42",
        "--json",
      ]),
    ).toEqual({
      reason: "gate_close",
      repo: "acme/widgets",
      prNumber: 42,
      json: true,
    });
  });

  it("parseRejectReasonsArgs accepts optional --json", () => {
    expect(parseRejectReasonsArgs([])).toEqual({ json: false });
    expect(parseRejectReasonsArgs(["--json"])).toEqual({ json: true });
    expect(parseRejectReasonsArgs(["--wat"])).toEqual({ error: "Unknown option: --wat" });
  });

  it("runRejectRender prints a courtesy note and exits 0", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(
      runRejectRender([
        "--reason",
        "gate_close",
        "--repo",
        "JSONbored/gittensory",
        "--pr",
        "42",
      ]),
    ).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("#42"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("JSONbored/gittensory"));
  });

  it("runRejectRender prints JSON when requested", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(
      runRejectRender([
        "--reason",
        "superseded_by_duplicate",
        "--repo",
        "JSONbored/gittensory",
        "--pr",
        "7",
        "--json",
      ]),
    ).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"reason":"superseded_by_duplicate"'));
  });

  it("runRejectRender returns exit code 2 for invalid reasons or flags", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(runRejectRender(["--reason", "bogus", "--repo", "acme/widgets", "--pr", "1"])).toBe(2);
    expect(error).toHaveBeenCalledWith("invalid_rejection_reason");
    expect(runRejectRender(["--reason", "gate_close", "--repo", "bad", "--pr", "1"])).toBe(2);
    expect(runRejectRender(["--reason", "gate_close", "--repo", "acme/widgets", "--pr", "nope"])).toBe(2);
  });

  it("runRejectReasons lists reason buckets", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(runRejectReasons([])).toBe(0);
    expect(log).toHaveBeenCalledWith("gate_close");
    expect(runRejectReasons(["--json"])).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"gate_close"'));
  });

  it("runRejectCli routes render and reasons subcommands", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(
      runRejectCli("render", ["--reason", "gate_close", "--repo", "JSONbored/gittensory", "--pr", "1"]),
    ).toBe(0);
    expect(runRejectCli("reasons", [])).toBe(0);
    expect(log).toHaveBeenCalled();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(runRejectCli("wat", [])).toBe(2);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("Unknown reject subcommand"));
  });
});
