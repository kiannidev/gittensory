import type { PullRequestSnapshot } from "./ci-poller.js";
import type { LedgerEntry } from "./event-ledger.js";

export const MANAGE_POLL_OUTCOMES: readonly ["ready", "needs-work", "open", "disengaged"];

export type RejectionSignals = {
  gateVerdict?: string;
  ciState?: string;
  supersededByDuplicate?: boolean;
};

export type DisengagedRejectionSnapshot = {
  outcome: "disengaged";
  rejectionReason: string;
  courtesyNote: string;
  closedAt: string | null;
};

export function isClosedWithoutMerge(pullRequest: PullRequestSnapshot | null | undefined): boolean;

export function classifyRejectionReason(signals?: RejectionSignals): string;

export function buildDisengagedRejectionSnapshot(input: {
  repoFullName: string;
  prNumber: number;
  pullRequest?: PullRequestSnapshot | null;
  gateVerdict?: string;
  ciState?: string;
  supersededByDuplicate?: boolean;
}): DisengagedRejectionSnapshot;

export function recordDisengagedPrOutcome(
  input: {
    repoFullName: string;
    prNumber: number;
    pullRequest?: PullRequestSnapshot | null;
    gateVerdict?: string;
    ciState?: string;
    supersededByDuplicate?: boolean;
  },
  options: { eventLedger: { appendEvent(event: unknown): LedgerEntry } },
): DisengagedRejectionSnapshot & { event: LedgerEntry };
