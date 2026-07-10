// Maintainer-recap COHORT section (#4521): miner-vs-human aggregate split when upstream reports carry it.
import { PUBLIC_LOCAL_PATH_SCRUB_PATTERN } from "../signals/redaction";
import type { MaintainerRecapCohortSlice } from "../types";

export type CohortRecapSource = {
  windowDays: number;
  cohorts?: Partial<Record<"miner" | "human", MaintainerRecapCohortSlice>>;
};

export type CohortRecapSection = {
  title: string;
  lines: string[];
};

function sanitizeRecapText(value: string): string {
  return value.replace(PUBLIC_LOCAL_PATH_SCRUB_PATTERN, "<redacted-path>").slice(0, 240);
}

function formatRate(rate: number | null): string {
  return rate === null ? "n/a" : `${Math.round(rate * 100)}%`;
}

function cohortLine(label: string, slice: MaintainerRecapCohortSlice, windowDays: number): string {
  return sanitizeRecapText(
    `${label}: ${slice.merged} merged of ${slice.reviewed} reviewed over ${windowDays} day(s); gate false-positive rate ${formatRate(slice.gateFalsePositiveRate)} (${slice.gateFalsePositives}/${slice.blocked} blocked-then-merged).`,
  );
}

/** Pure cohort section over a RecapReport projection. Omits entirely when no cohort data is present. */
export function buildCohortRecapSection(report: CohortRecapSource): CohortRecapSection | null {
  const cohorts = report.cohorts;
  if (!cohorts || Object.keys(cohorts).length === 0) return null;
  const lines: string[] = [];
  if (cohorts.miner) lines.push(cohortLine("Miner-originated", cohorts.miner, report.windowDays));
  if (cohorts.human) lines.push(cohortLine("Human-originated", cohorts.human, report.windowDays));
  if (lines.length === 0) return null;
  return { title: "Cohort", lines };
}
