import { sanitizePublicText } from "./sanitize";

export function formatAgentPlanMarkdown(payload: Record<string, unknown>): string {
  const runStatus = payload.run && typeof payload.run === "object" ? (payload.run as Record<string, unknown>).status : undefined;
  const summary = sanitizePublicText(String(payload.summary ?? runStatus ?? "Plan ready"));
  const lines = [`# Plan next work`, "", summary];
  const actions = Array.isArray(payload.actions) ? payload.actions : [];
  for (const action of actions.slice(0, 5)) {
    if (!action || typeof action !== "object") continue;
    const record = action as Record<string, unknown>;
    const label = sanitizePublicText(String(record.actionType ?? record.recommendation ?? "action"));
    const detail = sanitizePublicText(String(record.recommendation ?? record.publicSafeSummary ?? label));
    lines.push(`- **${label}**: ${detail}`);
    const card = record.explanationCard;
    if (card && typeof card === "object") {
      const whyNow = sanitizePublicText(String((card as Record<string, unknown>).whyNow ?? ""));
      if (whyNow) lines.push(`  - Why now: ${whyNow}`);
    }
  }
  if (typeof payload.recommendedRerunCondition === "string" && payload.recommendedRerunCondition.trim()) {
    lines.push("", `Rerun when: ${sanitizePublicText(payload.recommendedRerunCondition)}`);
  }
  return lines.join("\n");
}

export function formatOpenPrMonitorMarkdown(payload: Record<string, unknown>): string {
  const summary = sanitizePublicText(String(payload.summary ?? "Open PR monitor"));
  const lines = [`# Open PRs`, "", summary, "", `Open count: ${String(payload.openPrCount ?? 0)}`];
  const pullRequests = Array.isArray(payload.pullRequests) ? payload.pullRequests : [];
  for (const pr of pullRequests.slice(0, 12)) {
    if (!pr || typeof pr !== "object") continue;
    const record = pr as Record<string, unknown>;
    const repo = sanitizePublicText(String(record.repoFullName ?? "repo"));
    const number = String(record.number ?? "?");
    const title = sanitizePublicText(String(record.title ?? "PR"));
    const classification = sanitizePublicText(String(record.classification ?? "unknown"));
    lines.push(`- **${repo}#${number}** (${classification}): ${title}`);
    const nextSteps = Array.isArray(record.nextSteps) ? record.nextSteps : [];
    for (const step of nextSteps.slice(0, 2)) {
      lines.push(`  - ${sanitizePublicText(String(step))}`);
    }
  }
  const guidance = Array.isArray(payload.guidance) ? payload.guidance : [];
  for (const line of guidance.slice(0, 4)) lines.push(`- ${sanitizePublicText(String(line))}`);
  return lines.join("\n");
}

export function formatBranchAnalysisMarkdown(payload: Record<string, unknown>): string {
  const summary = sanitizePublicText(String(payload.summary ?? "Branch analysis"));
  const lines = [`# Branch analysis`, "", summary];
  const nextActions = Array.isArray(payload.nextActions) ? payload.nextActions : [];
  if (nextActions[0] && typeof nextActions[0] === "object") {
    const top = nextActions[0] as Record<string, unknown>;
    lines.push("", `Top action: ${sanitizePublicText(String(top.actionKind ?? top.recommendation ?? "none"))}`);
  }
  const blockers = Array.isArray(payload.scoreBlockers) ? payload.scoreBlockers : [];
  if (blockers.length) {
    lines.push("", "## Blockers");
    for (const blocker of blockers.slice(0, 6)) lines.push(`- ${sanitizePublicText(String(blocker))}`);
  }
  lines.push("", "Source upload: disabled");
  return lines.join("\n");
}

export function formatBlockersMarkdown(payload: Record<string, unknown>): string {
  const summary = sanitizePublicText(String(payload.summary ?? "Blocker explanation"));
  const lines = [`# Blockers`, "", summary];
  const actions = Array.isArray(payload.actions) ? payload.actions : [];
  for (const action of actions.slice(0, 5)) {
    if (!action || typeof action !== "object") continue;
    const record = action as Record<string, unknown>;
    lines.push(`- ${sanitizePublicText(String(record.recommendation ?? record.actionType ?? "action"))}`);
    const card = record.explanationCard;
    if (card && typeof card === "object") {
      const blocker = sanitizePublicText(String((card as Record<string, unknown>).scoreabilityBlocker ?? ""));
      if (blocker) lines.push(`  - ${blocker}`);
    }
  }
  return lines.join("\n");
}
