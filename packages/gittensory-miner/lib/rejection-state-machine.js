/**
 * Rejection state machine (#4278).
 *
 * Design note: "disengaged" is a per-PR manage-poll outcome written to the local event ledger.
 * It is intentionally NOT added to run-state.js RUN_STATES, which tracks per-repo lifecycle only.
 */
import { renderRejectionMessage } from "./rejection-templates.js";
import { recordPrOutcomeSnapshot } from "./pr-outcome.js";

/** Manage-poll outcome vocabulary, including the disengaged terminal state for rejected PRs. */
export const MANAGE_POLL_OUTCOMES = Object.freeze(["ready", "needs-work", "open", "disengaged"]);

export function isClosedWithoutMerge(pullRequest) {
  if (!pullRequest || typeof pullRequest !== "object") return false;
  return pullRequest.state === "closed" && pullRequest.merged !== true;
}

/**
 * Classify a closed-without-merge PR into a rejection-reason bucket.
 *
 * Priority: explicit duplicate-supersession signal, then gate block / CI failure, then
 * `maintainer_close_no_reason` when no other signal is available (documented default).
 */
export function classifyRejectionReason(signals = {}) {
  if (signals.supersededByDuplicate === true) return "superseded_by_duplicate";
  const gateVerdict = typeof signals.gateVerdict === "string" ? signals.gateVerdict.trim() : "";
  const ciState = typeof signals.ciState === "string" ? signals.ciState.trim() : "";
  if (gateVerdict === "block" || ciState === "failure") return "gate_close";
  return "maintainer_close_no_reason";
}

export function buildDisengagedRejectionSnapshot(input) {
  if (!input || typeof input !== "object") throw new Error("invalid_rejection_input");
  if (typeof input.repoFullName !== "string" || !input.repoFullName.trim()) {
    throw new Error("invalid_repo_full_name");
  }
  if (!Number.isInteger(input.prNumber) || input.prNumber <= 0) throw new Error("invalid_pr_number");

  const rejectionReason = classifyRejectionReason({
    gateVerdict: input.gateVerdict,
    ciState: input.ciState,
    supersededByDuplicate: input.supersededByDuplicate,
  });
  const courtesyNote = renderRejectionMessage(rejectionReason, {
    repoFullName: input.repoFullName,
    prNumber: input.prNumber,
  });

  return {
    outcome: "disengaged",
    rejectionReason,
    courtesyNote,
    closedAt:
      typeof input.pullRequest?.closedAt === "string" && input.pullRequest.closedAt.trim()
        ? input.pullRequest.closedAt
        : null,
  };
}

export function recordDisengagedPrOutcome(input, options = {}) {
  const snapshot = buildDisengagedRejectionSnapshot(input);
  const event = recordPrOutcomeSnapshot(
    {
      repoFullName: input.repoFullName,
      prNumber: input.prNumber,
      decision: "closed",
      closedAt: snapshot.closedAt,
      rejectionReason: snapshot.rejectionReason,
      courtesyNote: snapshot.courtesyNote,
      outcome: snapshot.outcome,
    },
    options,
  );
  return { ...snapshot, event };
}
