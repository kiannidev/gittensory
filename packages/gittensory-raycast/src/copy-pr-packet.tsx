import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { formatMinerApiError } from "../lib/errors";
import { collectLocalBranchMetadata } from "../lib/git-metadata";
import { preparePrPacket } from "../lib/miner-client";
import { extractPrPacketMarkdown, requirePublicSafePacketMarkdown, sanitizePacketForClipboard } from "../lib/pr-packet";
import { requireAuthenticatedMiner } from "../lib/session";
import { getMinerPreferences } from "./miner-preferences";
import { createRaycastStorageAdapter } from "./storage";

export default async function Command() {
  const preferences = getMinerPreferences();
  const repoPath = preferences.repoPath?.trim();
  if (!repoPath) {
    await showToast({ style: Toast.Style.Failure, title: "Repo path required", message: "Set Repo Path in preferences." });
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Preparing PR packet…" });
  try {
    const client = await requireAuthenticatedMiner(createRaycastStorageAdapter());
    const metadata = collectLocalBranchMetadata({
      login: client.login,
      cwd: repoPath,
      repoFullName: preferences.repoFullName?.trim() || undefined,
      baseRef: preferences.baseRef?.trim() || undefined,
    });
    const payload = await preparePrPacket(client, metadata);
    const markdown = extractPrPacketMarkdown(payload);
    if (!markdown) throw new Error("No public-safe PR packet was returned.");
    const safe = sanitizePacketForClipboard(requirePublicSafePacketMarkdown(markdown));
    await Clipboard.copy(safe);
    toast.style = Toast.Style.Success;
    toast.title = "PR packet copied";
    toast.message = "Public-safe markdown is on the clipboard";
    await showHUD("PR packet copied");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Copy failed";
    toast.message = formatMinerApiError(error);
  }
}
