import { gittensoryApiRequest } from "./api";
import type { LocalBranchMetadata } from "./git-metadata";
import { assertMetadataOnlyPayload } from "./source-guard";
import type { FetchLike } from "./types";

export type MinerClient = {
  apiOrigin: string;
  token: string;
  login: string;
  fetchImpl?: FetchLike;
};

function branchBody(client: MinerClient, metadata: LocalBranchMetadata): Record<string, unknown> {
  const body = { ...metadata, surface: "api" as const };
  assertMetadataOnlyPayload(body);
  return body;
}

export async function planNextWork(client: MinerClient, args: { repoFullName?: string; objective?: string } = {}) {
  const body = {
    login: client.login,
    surface: "api" as const,
    ...(args.repoFullName ? { repoFullName: args.repoFullName } : {}),
    ...(args.objective ? { objective: args.objective } : {}),
  };
  assertMetadataOnlyPayload(body);
  return gittensoryApiRequest<Record<string, unknown>>({
    apiOrigin: client.apiOrigin,
    path: "/v1/agent/plan-next-work",
    method: "POST",
    body,
    token: client.token,
    fetchImpl: client.fetchImpl,
  });
}

export async function fetchOpenPrMonitor(client: MinerClient) {
  return gittensoryApiRequest<Record<string, unknown>>({
    apiOrigin: client.apiOrigin,
    path: `/v1/contributors/${encodeURIComponent(client.login)}/open-pr-monitor`,
    token: client.token,
    fetchImpl: client.fetchImpl,
  });
}

export async function analyzeLocalBranch(client: MinerClient, metadata: LocalBranchMetadata) {
  return gittensoryApiRequest<Record<string, unknown>>({
    apiOrigin: client.apiOrigin,
    path: "/v1/local/branch-analysis",
    method: "POST",
    body: branchBody(client, metadata),
    token: client.token,
    fetchImpl: client.fetchImpl,
  });
}

export async function preparePrPacket(client: MinerClient, metadata: LocalBranchMetadata) {
  return gittensoryApiRequest<Record<string, unknown>>({
    apiOrigin: client.apiOrigin,
    path: "/v1/agent/prepare-pr-packet",
    method: "POST",
    body: branchBody(client, metadata),
    token: client.token,
    fetchImpl: client.fetchImpl,
  });
}

export async function explainBlockers(
  client: MinerClient,
  args: { repoFullName?: string; metadata?: LocalBranchMetadata },
) {
  const body = args.metadata
    ? branchBody(client, args.metadata)
    : {
        login: client.login,
        surface: "api" as const,
        ...(args.repoFullName ? { repoFullName: args.repoFullName } : {}),
      };
  assertMetadataOnlyPayload(body);
  return gittensoryApiRequest<Record<string, unknown>>({
    apiOrigin: client.apiOrigin,
    path: "/v1/agent/explain-blockers",
    method: "POST",
    body,
    token: client.token,
    fetchImpl: client.fetchImpl,
  });
}
