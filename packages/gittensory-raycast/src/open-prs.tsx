import { Detail, showToast, Toast } from "@raycast/api";
import { formatMinerApiError } from "../lib/errors";
import { formatOpenPrMonitorMarkdown } from "../lib/format-output";
import { fetchOpenPrMonitor } from "../lib/miner-client";
import { requireAuthenticatedMiner } from "../lib/session";
import { createRaycastStorageAdapter } from "./storage";

export default async function Command() {
  try {
    const client = await requireAuthenticatedMiner(createRaycastStorageAdapter());
    const payload = await fetchOpenPrMonitor(client);
    return <Detail markdown={formatOpenPrMonitorMarkdown(payload)} />;
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Open PRs failed", message: formatMinerApiError(error) });
    return <Detail markdown={`# Open PRs\n\n${formatMinerApiError(error)}`} />;
  }
}
