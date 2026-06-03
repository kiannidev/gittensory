import { Detail, showToast, Toast } from "@raycast/api";
import { formatMinerApiError } from "../lib/errors";
import { formatBranchAnalysisMarkdown } from "../lib/format-output";
import { collectLocalBranchMetadata } from "../lib/git-metadata";
import { analyzeLocalBranch } from "../lib/miner-client";
import { requireAuthenticatedMiner } from "../lib/session";
import { getMinerPreferences } from "./miner-preferences";
import { createRaycastStorageAdapter } from "./storage";

export default async function Command() {
  const preferences = getMinerPreferences();
  const repoPath = preferences.repoPath?.trim();
  if (!repoPath) {
    const message = "Set **Repo Path** in extension preferences to analyze the current branch.";
    await showToast({ style: Toast.Style.Failure, title: "Repo path required", message });
    return <Detail markdown={`# Branch analysis\n\n${message}`} />;
  }
  try {
    const client = await requireAuthenticatedMiner(createRaycastStorageAdapter());
    const metadata = collectLocalBranchMetadata({
      login: client.login,
      cwd: repoPath,
      repoFullName: preferences.repoFullName?.trim() || undefined,
      baseRef: preferences.baseRef?.trim() || undefined,
    });
    const payload = await analyzeLocalBranch(client, metadata);
    return <Detail markdown={formatBranchAnalysisMarkdown(payload)} />;
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Analysis failed", message: formatMinerApiError(error) });
    return <Detail markdown={`# Branch analysis\n\n${formatMinerApiError(error)}`} />;
  }
}
