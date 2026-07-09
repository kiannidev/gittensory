/** Local miner PR outcome events — distinct from the server-side `recordPrOutcome` in outcomes-wire.ts. (#4274/#4278) */
export const MINER_PR_OUTCOME_EVENT = "pr_outcome";

const PR_OUTCOME_DECISIONS = Object.freeze(["merged", "closed"]);

function optionalString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function normalizePrOutcomePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (!Number.isInteger(payload.prNumber) || payload.prNumber <= 0) return null;
  if (!PR_OUTCOME_DECISIONS.includes(payload.decision)) return null;
  return {
    prNumber: payload.prNumber,
    decision: payload.decision,
    closedAt: optionalString(payload.closedAt),
    rejectionReason: optionalString(payload.rejectionReason),
    courtesyNote: optionalString(payload.courtesyNote),
    outcome: optionalString(payload.outcome),
  };
}

/** Index the latest PR outcome per repo/PR from ascending ledger events. Pure. */
export function indexLatestPrOutcomes(events) {
  const latest = new Map();
  for (const event of Array.isArray(events) ? events : []) {
    if (event?.type !== MINER_PR_OUTCOME_EVENT) continue;
    if (typeof event.repoFullName !== "string" || !event.repoFullName.trim()) continue;
    const normalized = normalizePrOutcomePayload(event.payload);
    if (!normalized) continue;
    const key = `${event.repoFullName}:${normalized.prNumber}`;
    latest.set(key, { ...normalized, repoFullName: event.repoFullName });
  }
  return latest;
}

export function readPrOutcomes(eventLedger, filter = {}) {
  if (!eventLedger || typeof eventLedger.readEvents !== "function") {
    throw new Error("invalid_event_ledger");
  }
  const repoFullName =
    typeof filter.repoFullName === "string" && filter.repoFullName.trim()
      ? filter.repoFullName.trim()
      : undefined;
  const events = eventLedger.readEvents(repoFullName === undefined ? undefined : { repoFullName });
  const latest = indexLatestPrOutcomes(events);
  const prNumber =
    Number.isInteger(filter.prNumber) && filter.prNumber > 0 ? filter.prNumber : null;
  const rows = [...latest.values()];
  if (prNumber === null) return rows.sort(comparePrOutcomeRows);
  return rows.filter((row) => row.prNumber === prNumber);
}

function comparePrOutcomeRows(left, right) {
  const repoCmp = left.repoFullName.localeCompare(right.repoFullName);
  if (repoCmp !== 0) return repoCmp;
  return left.prNumber - right.prNumber;
}

function normalizeRepoFullName(repoFullName) {
  if (typeof repoFullName !== "string") throw new Error("invalid_repo_full_name");
  const [owner, repo, extra] = repoFullName.trim().split("/");
  if (!owner || !repo || extra !== undefined) throw new Error("invalid_repo_full_name");
  return `${owner}/${repo}`;
}

function normalizePrNumber(prNumber) {
  if (!Number.isInteger(prNumber) || prNumber <= 0) throw new Error("invalid_pr_number");
  return prNumber;
}

function normalizeDecision(decision) {
  if (!PR_OUTCOME_DECISIONS.includes(decision)) throw new Error("invalid_pr_outcome_decision");
  return decision;
}

/**
 * Append a local `pr_outcome` snapshot to the event ledger. Dependency-injected for unit tests.
 * For closed-not-merged PRs, callers may include `rejectionReason` and `courtesyNote` from the rejection state machine.
 */
export function recordPrOutcomeSnapshot(input, options = {}) {
  if (!input || typeof input !== "object") throw new Error("invalid_pr_outcome_input");
  const eventLedger = options.eventLedger;
  if (!eventLedger || typeof eventLedger.appendEvent !== "function") {
    throw new Error("invalid_event_ledger");
  }

  const repoFullName = normalizeRepoFullName(input.repoFullName);
  const prNumber = normalizePrNumber(input.prNumber);
  const decision = normalizeDecision(input.decision);
  const payload = {
    prNumber,
    decision,
    closedAt: optionalString(input.closedAt),
    rejectionReason: optionalString(input.rejectionReason),
    courtesyNote: optionalString(input.courtesyNote),
    outcome: optionalString(input.outcome),
  };

  return eventLedger.appendEvent({
    type: MINER_PR_OUTCOME_EVENT,
    repoFullName,
    payload,
  });
}
