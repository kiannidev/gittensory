import { describe, expect, it, vi } from "vitest";
import {
  classifyPullRequestCohort,
  loadConfirmedMinerLoginsForPullRequests,
  normalizeContributorLogin,
} from "../../src/services/contributor-cohort";
import * as repositories from "../../src/db/repositories";
import type { PullRequestRecord } from "../../src/types";
import { createTestEnv } from "../helpers/d1";

describe("contributor-cohort (#4521)", () => {
  it("normalizes logins and classifies miner vs human origins", () => {
    const miners = new Set(["alice"]);
    expect(normalizeContributorLogin(" Alice ")).toBe("alice");
    expect(classifyPullRequestCohort({ authorLogin: "alice" }, miners)).toBe("miner");
    expect(classifyPullRequestCohort({ authorLogin: "bob" }, miners)).toBe("human");
    expect(classifyPullRequestCohort({ authorLogin: null }, miners)).toBeNull();
  });

  it("loads confirmed miner logins from cached official-miner detection", async () => {
    const env = createTestEnv();
    const pullRequests: PullRequestRecord[] = [
      { repoFullName: "owner/repo", number: 1, title: "a", state: "closed", authorLogin: "miner-one", labels: [], linkedIssues: [] },
      { repoFullName: "owner/repo", number: 2, title: "b", state: "closed", authorLogin: "human-one", labels: [], linkedIssues: [] },
    ];
    const spy = vi.spyOn(repositories, "getFreshOfficialMinerDetection").mockImplementation(async (_env, login) =>
      login === "miner-one"
        ? { status: "confirmed", snapshot: { login: "miner-one", githubId: "1", priorPullRequests: 1, priorIssues: 0 } as never }
        : { status: "not_found" },
    );
    const logins = await loadConfirmedMinerLoginsForPullRequests(env, pullRequests);
    expect([...logins]).toEqual(["miner-one"]);
    spy.mockRestore();
  });

  it("skips PRs with no author login when resolving confirmed miners", async () => {
    const env = createTestEnv();
    const pullRequests: PullRequestRecord[] = [
      { repoFullName: "owner/repo", number: 1, title: "no author", state: "closed", labels: [], linkedIssues: [] },
      { repoFullName: "owner/repo", number: 2, title: "has author", state: "closed", authorLogin: "miner-one", labels: [], linkedIssues: [] },
    ];
    const spy = vi.spyOn(repositories, "getFreshOfficialMinerDetection").mockResolvedValue({
      status: "confirmed",
      snapshot: { login: "miner-one", githubId: "1", priorPullRequests: 1, priorIssues: 0 } as never,
    });
    const logins = await loadConfirmedMinerLoginsForPullRequests(env, pullRequests);
    expect([...logins]).toEqual(["miner-one"]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
