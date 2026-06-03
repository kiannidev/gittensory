import { Detail, showToast, Toast } from "@raycast/api";
import { formatMinerApiError } from "../lib/errors";
import { formatBlockersMarkdown } from "../lib/format-output";
import { collectLocalBranchMetadata } from "../lib/git-metadata";
import { explainBlockers } from "../lib/miner-client";
import { requireAuthenticatedMiner } from "../lib/session";
import { getMinerPreferences } from "./miner-preferences";
import { createRaycastStorageAdapter } from "./storage";

export default async function Command() {
  const preferences = getMinerPreferences();
  try {
    const client = await requireAuthenticatedMiner(createRaycastStorageAdapter());
    const metadata = preferences.repoPath?.trim()
      ? collectLocalBranchMetadata({
          login: client.login,
          cwd: preferences.repoPath.trim(),
          repoFullName: preferences.repoFullName?.trim() || undefined,
          baseRef: preferences.baseRef?.trim() || undefined,
        })
      : undefined;
    const payload = await explainBlockers(client, {
      repoFullName: preferences.repoFullName?.trim() || metadata?.repoFullName,
      metadata,
    });
    return <Detail markdown={formatBlockersMarkdown(payload)} />;
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Blockers failed", message: formatMinerApiError(error) });
    return <Detail markdown={`# Blockers\n\n${formatMinerApiError(error)}`} />;
  }
}
