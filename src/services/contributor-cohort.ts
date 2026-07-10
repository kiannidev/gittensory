// Privacy-safe miner-vs-human cohort classification for aggregate-only analytics (#4520/#4521).
// Uses cached official-miner detection at aggregation time; never emits actor logins downstream.
import { getFreshOfficialMinerDetection } from "../db/repositories";
import type { PullRequestRecord } from "../types";

export type ContributorCohort = "miner" | "human";

export function normalizeContributorLogin(login: string): string {
  return login.trim().toLowerCase();
}

/** Classify a PR's contributor origin when author login is known. Returns null when unknown. */
export function classifyPullRequestCohort(
  pr: Pick<PullRequestRecord, "authorLogin">,
  confirmedMinerLogins: ReadonlySet<string>,
): ContributorCohort | null {
  const login = pr.authorLogin?.trim();
  if (!login) return null;
  return confirmedMinerLogins.has(normalizeContributorLogin(login)) ? "miner" : "human";
}

/** Resolve confirmed official-miner logins for the PR authors in a window (cached detection). */
export async function loadConfirmedMinerLoginsForPullRequests(
  env: Env,
  pullRequests: readonly PullRequestRecord[],
): Promise<Set<string>> {
  const logins = [
    ...new Set(pullRequests.flatMap((pr) => (pr.authorLogin ? [normalizeContributorLogin(pr.authorLogin)] : []))),
  ].slice(0, 100);
  const detections = await Promise.all(
    logins.map(async (login) => [login, await getFreshOfficialMinerDetection(env, login)] as const),
  );
  return new Set(detections.flatMap(([login, detection]) => (detection?.status === "confirmed" ? [login] : [])));
}
