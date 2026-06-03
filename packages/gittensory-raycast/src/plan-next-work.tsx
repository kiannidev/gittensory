import { Detail, showToast, Toast } from "@raycast/api";
import { formatMinerApiError } from "../lib/errors";
import { formatAgentPlanMarkdown } from "../lib/format-output";
import { planNextWork } from "../lib/miner-client";
import { requireAuthenticatedMiner } from "../lib/session";
import { getMinerPreferences } from "./miner-preferences";
import { createRaycastStorageAdapter } from "./storage";

export default async function Command() {
  const preferences = getMinerPreferences();
  try {
    const client = await requireAuthenticatedMiner(createRaycastStorageAdapter());
    const payload = await planNextWork(client, {
      repoFullName: preferences.repoFullName?.trim() || undefined,
    });
    return <Detail markdown={formatAgentPlanMarkdown(payload)} />;
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Plan failed", message: formatMinerApiError(error) });
    return <Detail markdown={`# Plan next work\n\n${formatMinerApiError(error)}`} />;
  }
}
