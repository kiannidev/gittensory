import { describe, expect, it } from "vitest";
import { formatAgentPlanMarkdown, formatBlockersMarkdown, formatBranchAnalysisMarkdown, formatOpenPrMonitorMarkdown } from "../lib/format-output";

describe("format-output", () => {
  it("formats agent plans without forbidden language", () => {
    const markdown = formatAgentPlanMarkdown({
      summary: "Focus cleanup",
      recommendedRerunCondition: "After PR #2 merges",
      actions: [
        {
          actionType: "open_issue",
          recommendation: "Pick the next issue",
          explanationCard: { whyNow: "Queue is clear" },
        },
      ],
    });
    expect(markdown).toMatch(/Focus cleanup|Pick the next issue/i);
    expect(markdown).not.toMatch(/wallet|hotkey|payout/i);
  });

  it("redacts forbidden monitor guidance", () => {
    const markdown = formatOpenPrMonitorMarkdown({
      summary: "wallet hotkey payout",
      openPrCount: 2,
      pullRequests: [{ repoFullName: "o/r", number: 1, title: "Fix", classification: "stale", nextSteps: ["Close"] }],
      guidance: ["reward estimate farming"],
    });
    expect(markdown).toMatch(/private surfaces/i);
  });

  it("formats branch analysis blockers and upload boundary", () => {
    const markdown = formatBranchAnalysisMarkdown({
      summary: "Needs tests",
      nextActions: [{ actionKind: "add_tests" }],
      scoreBlockers: ["missing_tests"],
    });
    expect(markdown).toMatch(/Source upload: disabled/);
    expect(markdown).toMatch(/missing_tests/);
  });

  it("formats blocker explanations", () => {
    const markdown = formatBlockersMarkdown({
      summary: "Queue pressure",
      actions: [{ recommendation: "Clean up stale PRs", explanationCard: { scoreabilityBlocker: "open_pr_pressure" } }],
    });
    expect(markdown).toMatch(/Queue pressure|open_pr_pressure/);
  });
});
