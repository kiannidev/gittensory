import { splitRepoFullName } from "@/lib/maintainer-settings-preview";

export type WorkspaceFreshness = "complete" | "degraded" | "stale" | "unknown";
export type WorkspaceLaneStatus = "ready" | "warn" | "blocked" | "info";

const FORBIDDEN_PUBLIC_LANGUAGE =
  /wallet|hotkey|coldkey|raw trust score|payout|reward estimate|farming|private reviewability|public score estimate|mnemonic|seed phrase|private key/i;

export type RegistrationWorkspaceDataQuality = {
  status?: string | undefined;
  partial?: boolean | undefined;
  warnings?: string[] | undefined;
};

export type RegistrationReadinessPayload = {
  repoFullName: string;
  generatedAt: string;
  ready: boolean;
  recommendedRegistrationMode: string;
  issuePolicy: string;
  directPrReadiness: { ready: boolean; reasons: string[] };
  issueDiscoveryReadiness: { ready: boolean; recommendation: string; reasons: string[] };
  labelPolicy: Record<string, unknown>;
  maintainerCutReadiness: Record<string, unknown>;
  testCoverageHealth: {
    status: string;
    trustedLabelPipelineReady: boolean;
    checkRunMode: string;
    requiredGate: string[];
    note: string;
    warnings: string[];
  };
  queueHealth: { level: string; burdenScore: number; reviewablePullRequests: number; summary: string };
  contributorIntakeHealth: Record<string, unknown>;
  githubApp: {
    installed: boolean;
    publicSurface: string;
    commentMode: string;
    checkRunMode: string;
    quietByDefault: boolean;
    behavior: string;
    warnings: string[];
  };
  policyReadiness: {
    summary: string;
    publicWarnings: Array<{ title: string; detail: string; action: string; severity: string }>;
  } | null;
  blockers: string[];
  warnings: string[];
  dataQuality?: RegistrationWorkspaceDataQuality | undefined;
};

export type GittensorConfigRecommendationPayload = {
  repoFullName: string;
  generatedAt: string;
  privateOnly?: boolean | undefined;
  current: Record<string, unknown> | null;
  recommended: Record<string, unknown>;
  tradeoffs: string[];
  reasons: string[];
  warnings: string[];
  dataQuality?: RegistrationWorkspaceDataQuality | undefined;
};

export type RegistrationWorkspaceSection = {
  id: string;
  title: string;
  status: WorkspaceLaneStatus;
  summary: string;
  bullets: string[];
};

export type RegistrationWorkspaceView = {
  repoFullName: string;
  generatedAt: string;
  advisoryBanner: string;
  freshness: { status: WorkspaceFreshness; warnings: string[] };
  summary: {
    ready: boolean;
    headline: string;
    recommendedMode: string;
    issuePolicy: string;
    status: WorkspaceLaneStatus;
  };
  lanes: {
    directPr: RegistrationWorkspaceSection;
    issueDiscovery: RegistrationWorkspaceSection;
    maintainerEconomics: RegistrationWorkspaceSection;
    minerGuidance: RegistrationWorkspaceSection;
  };
  operations: RegistrationWorkspaceSection[];
  policyWarnings: Array<{ title: string; detail: string; action: string; severity: string }>;
  config: {
    tradeoffs: string[];
    reasons: string[];
    warnings: string[];
    recommendedLines: string[];
    currentLines: string[];
  } | null;
};

export function isRegistrationWorkspacePublicSafe(text: string): boolean {
  return !FORBIDDEN_PUBLIC_LANGUAGE.test(text);
}

export function sanitizeRegistrationWorkspaceText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || !isRegistrationWorkspacePublicSafe(trimmed)) return null;
  return trimmed;
}

export function resolveRegistrationWorkspaceFreshness(
  readinessQuality?: RegistrationWorkspaceDataQuality,
  configQuality?: RegistrationWorkspaceDataQuality,
): { status: WorkspaceFreshness; warnings: string[] } {
  const warnings = [
    ...(readinessQuality?.warnings ?? []),
    ...(configQuality?.warnings ?? []),
  ]
    .map((entry) => sanitizeRegistrationWorkspaceText(entry))
    .filter((entry): entry is string => Boolean(entry));
  const statuses = [readinessQuality?.status, configQuality?.status].filter((entry): entry is string => Boolean(entry));
  if (statuses.includes("blocked")) return { status: "stale", warnings };
  if (readinessQuality?.partial || configQuality?.partial || statuses.includes("degraded")) {
    return { status: "degraded", warnings };
  }
  if (statuses.includes("complete")) return { status: "complete", warnings };
  return { status: warnings.length > 0 ? "degraded" : "unknown", warnings };
}

export function buildRegistrationWorkspaceView(
  readiness: RegistrationReadinessPayload,
  config: GittensorConfigRecommendationPayload | null,
): RegistrationWorkspaceView {
  const freshness = resolveRegistrationWorkspaceFreshness(readiness.dataQuality, config?.dataQuality);
  const directPrStatus: WorkspaceLaneStatus = readiness.directPrReadiness.ready
    ? "ready"
    : readiness.blockers.length > 0
      ? "blocked"
      : "warn";
  const issueDiscoveryStatus: WorkspaceLaneStatus =
    readiness.issueDiscoveryReadiness.recommendation === "not_recommended"
      ? "info"
      : readiness.issueDiscoveryReadiness.ready
        ? "ready"
        : "warn";

  const maintainerCut = readiness.maintainerCutReadiness;
  const maintainerReady = maintainerCut.ready === true;
  const maintainerEconomicsStatus: WorkspaceLaneStatus = maintainerReady ? "ready" : readiness.ready ? "warn" : "blocked";

  const labelPolicy = readiness.labelPolicy;
  const intake = readiness.contributorIntakeHealth;

  return {
    repoFullName: readiness.repoFullName,
    generatedAt: readiness.generatedAt,
    advisoryBanner:
      "Advisory workspace only. Recommendations explain tradeoffs for repo owners; they do not guarantee Gittensor payouts or miner rewards.",
    freshness,
    summary: {
      ready: readiness.ready,
      headline: readiness.ready
        ? "Repository looks ready for contributor intake with the recommended posture."
        : "Resolve blockers before inviting more outside contributor traffic.",
      recommendedMode: readiness.recommendedRegistrationMode,
      issuePolicy: readiness.issuePolicy,
      status: readiness.ready ? "ready" : readiness.blockers.length > 0 ? "blocked" : "warn",
    },
    lanes: {
      directPr: {
        id: "direct-pr",
        title: "Direct PR lane",
        status: directPrStatus,
        summary: readiness.directPrReadiness.ready
          ? "Direct-PR intake is healthy enough for the recommended registration mode."
          : "Direct-PR intake needs attention before broadening contributor traffic.",
        bullets: sanitizeBulletList(readiness.directPrReadiness.reasons),
      },
      issueDiscovery: {
        id: "issue-discovery",
        title: "Issue discovery lane",
        status: issueDiscoveryStatus,
        summary: `Recommendation: ${readiness.issueDiscoveryReadiness.recommendation.replace(/_/g, " ")}.`,
        bullets: sanitizeBulletList(readiness.issueDiscoveryReadiness.reasons),
      },
      maintainerEconomics: {
        id: "maintainer-economics",
        title: "Maintainer economics",
        status: maintainerEconomicsStatus,
        summary: stringField(maintainerCut, "summary") ?? "Maintainer-cut posture is separate from miner reward estimates.",
        bullets: sanitizeBulletList([
          ...(Array.isArray(maintainerCut.reasons) ? (maintainerCut.reasons as string[]) : []),
          ...(Array.isArray(maintainerCut.warnings) ? (maintainerCut.warnings as string[]) : []),
          typeof maintainerCut.recommendedAction === "string"
            ? `Suggested action: ${maintainerCut.recommendedAction.replace(/_/g, " ")}.`
            : "",
        ]),
      },
      minerGuidance: {
        id: "miner-guidance",
        title: "Miner scoreability (separate)",
        status: "info",
        summary:
          "Contributor/miner scoreability and queue pressure are evaluated separately from maintainer-cut economics.",
        bullets: sanitizeBulletList([
          `Contributor intake: ${stringField(intake, "level") ?? "unknown"}.`,
          `Queue burden: ${readiness.queueHealth.level} (${readiness.queueHealth.reviewablePullRequests} reviewable PRs).`,
          readiness.queueHealth.summary,
        ]),
      },
    },
    operations: [
      {
        id: "queue-health",
        title: "Queue health",
        status: queueStatus(readiness.queueHealth.level),
        summary: readiness.queueHealth.summary,
        bullets: sanitizeBulletList([
          `Burden score: ${readiness.queueHealth.burdenScore}.`,
          `Reviewable pull requests: ${readiness.queueHealth.reviewablePullRequests}.`,
        ]),
      },
      {
        id: "label-policy",
        title: "Label policy",
        status: labelPolicy.trustedPipelineReady === true ? "ready" : "warn",
        summary: "Registry labels and trusted pipeline readiness for incoming work.",
        bullets: sanitizeBulletList([
          labelPolicy.autoLabelEnabled === true
            ? `Auto-label enabled (${String(labelPolicy.label ?? "gittensor")}).`
            : "Auto-label is disabled.",
          labelPolicy.trustedPipelineReady === true
            ? "Trusted label pipeline is verified."
            : "Trusted label pipeline is not verified yet.",
          ...(Array.isArray(labelPolicy.missingOrUnusedRegistryLabels)
            ? (labelPolicy.missingOrUnusedRegistryLabels as string[]).map((label) => `Missing or unused label: ${label}`)
            : []),
        ]),
      },
      {
        id: "test-policy",
        title: "Test & validation policy",
        status: readiness.testCoverageHealth.status === "gate_ready" ? "ready" : "warn",
        summary: readiness.testCoverageHealth.note,
        bullets: sanitizeBulletList([
          `Coverage gate: ${readiness.testCoverageHealth.status}.`,
          `Check runs: ${readiness.testCoverageHealth.checkRunMode}.`,
          ...(readiness.testCoverageHealth.requiredGate ?? []).map((gate) => `Required gate: ${gate}`),
          ...readiness.testCoverageHealth.warnings,
        ]),
      },
      {
        id: "github-app",
        title: "GitHub App behavior",
        status: readiness.githubApp.installed ? "ready" : "warn",
        summary: readiness.githubApp.behavior,
        bullets: sanitizeBulletList([
          `Public surface: ${readiness.githubApp.publicSurface}.`,
          `Comment mode: ${readiness.githubApp.commentMode}.`,
          ...(readiness.githubApp.quietByDefault ? ["Quiet-by-default posture is enabled."] : []),
          ...readiness.githubApp.warnings,
        ]),
      },
    ],
    policyWarnings: (readiness.policyReadiness?.publicWarnings ?? [])
      .map((warning) => ({
        title: sanitizeRegistrationWorkspaceText(warning.title) ?? "Policy warning",
        detail: sanitizeRegistrationWorkspaceText(warning.detail) ?? "",
        action: sanitizeRegistrationWorkspaceText(warning.action) ?? "",
        severity: warning.severity,
      }))
      .filter((warning) => warning.detail.length > 0),
    config: config
      ? {
          tradeoffs: sanitizeBulletList(config.tradeoffs),
          reasons: sanitizeBulletList(config.reasons),
          warnings: sanitizeBulletList(config.warnings),
          recommendedLines: recordLines(config.recommended),
          currentLines: recordLines(config.current ?? {}),
        }
      : null,
  };
}

export function collectRegistrationWorkspacePublicText(view: RegistrationWorkspaceView): string[] {
  const chunks = [
    view.advisoryBanner,
    view.summary.headline,
    ...view.freshness.warnings,
    ...view.lanes.directPr.bullets,
    ...view.lanes.issueDiscovery.bullets,
    ...view.lanes.maintainerEconomics.bullets,
    ...view.lanes.minerGuidance.bullets,
    ...view.operations.flatMap((section) => [section.summary, ...section.bullets]),
    ...(view.config?.tradeoffs ?? []),
    ...(view.config?.reasons ?? []),
    ...view.policyWarnings.flatMap((warning) => [warning.title, warning.detail, warning.action]),
  ];
  return chunks.filter((entry) => entry.length > 0);
}

export { splitRepoFullName };

function sanitizeBulletList(entries: string[]): string[] {
  return entries.map((entry) => sanitizeRegistrationWorkspaceText(entry)).filter((entry): entry is string => Boolean(entry));
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? sanitizeRegistrationWorkspaceText(value) : null;
}

function queueStatus(level: string): WorkspaceLaneStatus {
  if (level === "low") return "ready";
  if (level === "medium") return "warn";
  if (level === "high" || level === "critical") return "blocked";
  return "info";
}

function recordLines(record: Record<string, unknown>): string[] {
  const entries = Object.entries(record);
  if (entries.length === 0) return ["{}"];
  return entries.slice(0, 10).map(([key, value]) => `${key}: ${formatValue(value)}`);
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}
