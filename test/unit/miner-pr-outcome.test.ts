import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeDefaultEventLedger,
  initEventLedger,
} from "../../packages/gittensory-miner/lib/event-ledger.js";
import {
  MINER_PR_OUTCOME_EVENT,
  indexLatestPrOutcomes,
  normalizePrOutcomePayload,
  readPrOutcomes,
  recordPrOutcomeSnapshot,
} from "../../packages/gittensory-miner/lib/pr-outcome.js";

const roots: string[] = [];
const ledgers: Array<{ close(): void }> = [];

function tempLedger() {
  const root = mkdtempSync(join(tmpdir(), "gittensory-miner-pr-outcome-"));
  roots.push(root);
  const ledger = initEventLedger(join(root, "event-ledger.sqlite3"));
  ledgers.push(ledger);
  return ledger;
}

afterEach(() => {
  for (const ledger of ledgers.splice(0)) ledger.close();
  closeDefaultEventLedger();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("gittensory-miner pr outcome (#4274/#4278)", () => {
  it("normalizePrOutcomePayload validates merged and closed decisions", () => {
    expect(
      normalizePrOutcomePayload({
        prNumber: 7,
        decision: "merged",
        closedAt: null,
        outcome: null,
      }),
    ).toEqual({
      prNumber: 7,
      decision: "merged",
      closedAt: null,
      rejectionReason: null,
      courtesyNote: null,
      outcome: null,
    });
    expect(
      normalizePrOutcomePayload({
        prNumber: 8,
        decision: "closed",
        closedAt: "2026-07-08T12:00:00.000Z",
        rejectionReason: "gate_close",
        courtesyNote: "thanks",
        outcome: "disengaged",
      }),
    ).toEqual({
      prNumber: 8,
      decision: "closed",
      closedAt: "2026-07-08T12:00:00.000Z",
      rejectionReason: "gate_close",
      courtesyNote: "thanks",
      outcome: "disengaged",
    });
    expect(normalizePrOutcomePayload({ prNumber: 0, decision: "merged" })).toBeNull();
    expect(normalizePrOutcomePayload({ prNumber: 1, decision: "withdrawn" })).toBeNull();
    expect(normalizePrOutcomePayload(null)).toBeNull();
  });

  it("recordPrOutcomeSnapshot appends pr_outcome events and readPrOutcomes reduces history", () => {
    const eventLedger = tempLedger();
    recordPrOutcomeSnapshot(
      {
        repoFullName: "acme/widgets",
        prNumber: 3,
        decision: "merged",
        closedAt: "2026-07-08T11:00:00.000Z",
      },
      { eventLedger },
    );
    recordPrOutcomeSnapshot(
      {
        repoFullName: "acme/widgets",
        prNumber: 4,
        decision: "closed",
        closedAt: "2026-07-08T12:00:00.000Z",
        rejectionReason: "maintainer_close_no_reason",
        courtesyNote: "closed note",
        outcome: "disengaged",
      },
      { eventLedger },
    );
    recordPrOutcomeSnapshot(
      {
        repoFullName: "acme/widgets",
        prNumber: 4,
        decision: "closed",
        closedAt: "2026-07-08T13:00:00.000Z",
        rejectionReason: "gate_close",
        courtesyNote: "updated note",
        outcome: "disengaged",
      },
      { eventLedger },
    );

    expect(readPrOutcomes(eventLedger)).toEqual([
      expect.objectContaining({ prNumber: 3, decision: "merged", repoFullName: "acme/widgets" }),
      expect.objectContaining({
        prNumber: 4,
        decision: "closed",
        rejectionReason: "gate_close",
        courtesyNote: "updated note",
        outcome: "disengaged",
      }),
    ]);
    expect(readPrOutcomes(eventLedger, { repoFullName: "acme/widgets", prNumber: 4 })).toEqual([
      expect.objectContaining({ prNumber: 4, rejectionReason: "gate_close" }),
    ]);
    expect(indexLatestPrOutcomes(eventLedger.readEvents()).size).toBe(2);
  });

  it("rejects invalid writer input and ledger handles", () => {
    const eventLedger = tempLedger();
    expect(() =>
      recordPrOutcomeSnapshot(
        { repoFullName: "bad", prNumber: 1, decision: "merged" },
        { eventLedger },
      ),
    ).toThrow("invalid_repo_full_name");
    expect(() =>
      recordPrOutcomeSnapshot(
        { repoFullName: "acme/widgets", prNumber: 0, decision: "merged" },
        { eventLedger },
      ),
    ).toThrow("invalid_pr_number");
    expect(() =>
      recordPrOutcomeSnapshot(
        { repoFullName: "acme/widgets", prNumber: 1, decision: "merged" },
        { eventLedger: null as never },
      ),
    ).toThrow("invalid_event_ledger");
    expect(() => readPrOutcomes(null as never)).toThrow("invalid_event_ledger");
    expect(eventLedger.readEvents()).toEqual([]);
  });
});
