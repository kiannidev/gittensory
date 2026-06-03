import { describe, expect, it } from "vitest";
import { GittensoryApiError } from "../lib/errors";
import { formatAgentPlanMarkdown, formatOpenPrMonitorMarkdown } from "../lib/format-output";
import { analyzeLocalBranch, explainBlockers, fetchOpenPrMonitor, planNextWork, preparePrPacket } from "../lib/miner-client";
import { jsonResponse, mockFetch, VALID_SESSION_TOKEN } from "./helpers";

const client = {
  apiOrigin: "http://localhost:8787",
  token: VALID_SESSION_TOKEN,
  login: "miner",
};

const branchMetadata = {
  login: "miner",
  repoFullName: "JSONbored/gittensory",
  baseRef: "origin/main",
  headRef: "feat/demo",
  branchName: "feat/demo",
  commitMessages: ["feat: demo"],
  changedFiles: [{ path: "src/a.ts", additions: 1, deletions: 0, status: "modified", binary: false }],
  linkedIssues: [1],
  pendingCommitCount: 1,
  ciStatusHints: [],
};

describe("miner client", () => {
  it("plans next work with mocked API", async () => {
    const fetchImpl = mockFetch({
      "/v1/agent/plan-next-work": () =>
        jsonResponse({ summary: "Cleanup first", actions: [{ actionType: "cleanup_existing_prs", recommendation: "Close stale PR" }] }),
    });
    const payload = await planNextWork({ ...client, fetchImpl });
    expect(formatAgentPlanMarkdown(payload)).toMatch(/Cleanup first/);
    expect(formatAgentPlanMarkdown(payload)).not.toMatch(/wallet|hotkey|payout/i);
  });

  it("loads open PR monitor", async () => {
    const fetchImpl = mockFetch({
      "/v1/contributors/miner/open-pr-monitor": () =>
        jsonResponse({ summary: "One open PR", openPrCount: 1, pullRequests: [{ repoFullName: "o/r", number: 9, title: "Fix", classification: "reviewable", nextSteps: ["Respond"] }] }),
    });
    const payload = await fetchOpenPrMonitor({ ...client, fetchImpl });
    expect(formatOpenPrMonitorMarkdown(payload)).toMatch(/One open PR/);
  });

  it("analyzes branch with metadata-only body", async () => {
    const bodies: string[] = [];
    const fetchImpl = mockFetch({
      "/v1/local/branch-analysis": (init) => {
        if (init?.body) bodies.push(String(init.body));
        return jsonResponse({ summary: "Ready", nextActions: [{ actionKind: "preflight" }], scoreBlockers: [] });
      },
    });
    await analyzeLocalBranch({ ...client, fetchImpl }, branchMetadata);
    expect(bodies.join(" ")).not.toMatch(/fileContent|upload/i);
    expect(bodies.join(" ")).toContain("src/a.ts");
  });

  it("prepares PR packet without forbidden payload keys", async () => {
    const fetchImpl = mockFetch({
      "/v1/agent/prepare-pr-packet": () =>
        jsonResponse({
          actions: [{ actionType: "prepare_pr_packet", payload: { prPacket: { markdown: "# Packet\n\n## Validation\n- tests passed" } } }],
        }),
    });
    const payload = await preparePrPacket({ ...client, fetchImpl }, branchMetadata);
    expect(JSON.stringify(payload)).toContain("Packet");
  });

  it("explains blockers with branch metadata", async () => {
    const fetchImpl = mockFetch({
      "/v1/agent/explain-blockers": () => jsonResponse({ summary: "Branch blockers", actions: [] }),
    });
    await explainBlockers({ ...client, fetchImpl }, { metadata: branchMetadata });
  });

  it("explains blockers for login-only requests", async () => {
    const fetchImpl = mockFetch({
      "/v1/agent/explain-blockers": () => jsonResponse({ summary: "Queue pressure", actions: [{ recommendation: "Clean up open PRs" }] }),
    });
    const payload = await explainBlockers({ ...client, fetchImpl }, { repoFullName: "JSONbored/gittensory" });
    expect(String(payload.summary)).toMatch(/Queue pressure/);
  });

  it("surfaces rate-limit retry guidance", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { "retry-after": "45", "content-type": "application/json" },
      });
    await expect(planNextWork({ ...client, fetchImpl })).rejects.toBeInstanceOf(GittensoryApiError);
    try {
      await planNextWork({ ...client, fetchImpl });
    } catch (error) {
      expect((error as GittensoryApiError).retryAfterSeconds).toBe(45);
    }
  });
});
