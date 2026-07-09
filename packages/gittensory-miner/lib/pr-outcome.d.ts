import type { LedgerEntry } from "./event-ledger.js";

export const MINER_PR_OUTCOME_EVENT: "pr_outcome";

export type PrOutcomeDecision = "merged" | "closed";

export type PrOutcomePayload = {
  prNumber: number;
  decision: PrOutcomeDecision;
  closedAt: string | null;
  rejectionReason: string | null;
  courtesyNote: string | null;
  outcome: string | null;
};

export type PrOutcomeRow = PrOutcomePayload & {
  repoFullName: string;
};

export function normalizePrOutcomePayload(payload: unknown): PrOutcomePayload | null;

export function indexLatestPrOutcomes(events: LedgerEntry[]): Map<string, PrOutcomeRow>;

export function readPrOutcomes(
  eventLedger: { readEvents(repoFullName?: { repoFullName: string }): LedgerEntry[] },
  filter?: { repoFullName?: string; prNumber?: number },
): PrOutcomeRow[];

export function recordPrOutcomeSnapshot(
  input: {
    repoFullName: string;
    prNumber: number;
    decision: PrOutcomeDecision;
    closedAt?: string | null;
    rejectionReason?: string | null;
    courtesyNote?: string | null;
    outcome?: string | null;
  },
  options: { eventLedger: { appendEvent(event: unknown): LedgerEntry } },
): LedgerEntry;
