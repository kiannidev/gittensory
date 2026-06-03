import { execFileSync } from "node:child_process";
import { assertSourceUploadDisabled } from "./source-guard";

export type LocalBranchMetadata = {
  login: string;
  repoFullName: string;
  baseRef: string;
  headRef: string;
  branchName: string;
  baseSha?: string;
  headSha?: string;
  mergeBaseSha?: string;
  remoteTrackingSha?: string;
  commitMessages: string[];
  changedFiles: Array<{
    path: string;
    previousPath?: string;
    additions: number;
    deletions: number;
    status: string;
    binary: boolean;
  }>;
  linkedIssues: number[];
  title?: string;
  pendingCommitCount: number;
  ciStatusHints: string[];
};

export type CollectMetadataInput = {
  login: string;
  cwd: string;
  repoFullName?: string;
  baseRef?: string;
  branchName?: string;
  execFile?: typeof execFileSync;
};

type ExecFile = typeof execFileSync;

export function parseGitRemote(remoteUrl: string): string | undefined {
  const trimmed = remoteUrl.trim();
  const patterns = [/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/, /^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/, /^ssh:\/\/git@github\.com\/([^/]+)\/(.+?)(?:\.git)?$/];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1] && match?.[2]) return `${match[1]}/${match[2].replace(/\.git$/, "")}`;
  }
  return undefined;
}

export function collectLocalBranchMetadata(input: CollectMetadataInput): LocalBranchMetadata {
  assertSourceUploadDisabled();
  const execFile = input.execFile ?? execFileSync;
  const cwd = input.cwd;
  const baseRef = input.baseRef ?? defaultBaseRef(cwd, execFile);
  const remoteUrl = gitLines(cwd, ["config", "--get", "remote.origin.url"], execFile)[0] ?? "";
  const repoFullName = input.repoFullName ?? parseGitRemote(remoteUrl);
  if (!repoFullName) throw new Error("Could not infer repo from git remote; set Repo in Raycast preferences.");
  const branchName = input.branchName ?? gitLines(cwd, ["branch", "--show-current"], execFile)[0] ?? "local-branch";
  const headRef = gitLines(cwd, ["rev-parse", "--abbrev-ref", "HEAD"], execFile)[0] ?? branchName;
  const changedFiles = collectChangedFiles(cwd, baseRef, execFile);
  const commitMessages = collectCommitMessages(cwd, baseRef, execFile);
  const title = titleFromBranch(branchName) ?? firstCommitTitle(commitMessages);
  const linkedIssues = extractLinkedIssues([branchName, title, ...commitMessages].filter(Boolean).join("\n"));
  return {
    login: input.login,
    repoFullName,
    baseRef,
    headRef,
    branchName,
    baseSha: gitLines(cwd, ["rev-parse", "--verify", baseRef], execFile)[0],
    headSha: gitLines(cwd, ["rev-parse", "--verify", "HEAD"], execFile)[0],
    mergeBaseSha: gitLines(cwd, ["merge-base", baseRef, "HEAD"], execFile)[0],
    commitMessages,
    changedFiles,
    linkedIssues,
    title,
    pendingCommitCount: collectPendingCommitCount(cwd, baseRef, execFile),
    ciStatusHints: collectCiStatusHints(cwd, baseRef, changedFiles, execFile),
  };
}

function gitLines(cwd: string, args: string[], execFile: ExecFile): string[] {
  try {
    return execFile("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function defaultBaseRef(cwd: string, execFile: ExecFile): string {
  const upstream = gitLines(cwd, ["rev-parse", "--abbrev-ref", "@{upstream}"], execFile)[0];
  if (upstream?.includes("/")) return upstream;
  return "origin/main";
}

function collectPendingCommitCount(cwd: string, baseRef: string, execFile: ExecFile): number {
  const count = gitLines(cwd, ["rev-list", "--count", `${baseRef}..HEAD`], execFile)[0];
  const parsed = Number(count);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : 0;
}

function collectCommitMessages(cwd: string, baseRef: string, execFile: ExecFile): string[] {
  return gitLines(cwd, ["log", "--format=%s", `${baseRef}..HEAD`], execFile).slice(0, 30);
}

function collectChangedFiles(cwd: string, baseRef: string, execFile: ExecFile) {
  const statusRows = gitLines(cwd, ["diff", "--name-status", "-M", baseRef, "--"], execFile);
  const numstat = new Map(parseNumstat(cwd, baseRef, execFile).map((entry) => [entry.path, entry]));
  return statusRows.map((row) => {
    const fields = row.split(/\t/);
    const code = fields[0] ?? "";
    const isRename = code.startsWith("R");
    const path = isRename ? (fields[2] ?? fields[1] ?? "") : (fields[1] ?? "");
    const stats = numstat.get(path) ?? { additions: 0, deletions: 0, binary: false };
    return {
      path,
      ...(isRename && fields[1] ? { previousPath: fields[1] } : {}),
      additions: stats.additions,
      deletions: stats.deletions,
      status: statusFromCode(code),
      binary: stats.binary,
    };
  });
}

function parseNumstat(cwd: string, baseRef: string, execFile: ExecFile) {
  return gitLines(cwd, ["diff", "--numstat", "-M", baseRef, "--"], execFile).map((row) => {
    const fields = row.split(/\t/);
    const additions = fields[0] === "-" ? 0 : Number(fields[0] ?? 0);
    const deletions = fields[1] === "-" ? 0 : Number(fields[1] ?? 0);
    return {
      path: fields.slice(2).join("\t"),
      additions: Number.isFinite(additions) ? additions : 0,
      deletions: Number.isFinite(deletions) ? deletions : 0,
      binary: fields[0] === "-" || fields[1] === "-",
    };
  });
}

function collectCiStatusHints(
  cwd: string,
  baseRef: string,
  changedFiles: LocalBranchMetadata["changedFiles"],
  execFile: ExecFile,
): string[] {
  const hints: string[] = [];
  const paths = changedFiles.map((file) => file.path).filter(Boolean);
  if (paths.some((path) => /^\.github\/workflows\//i.test(path))) {
    hints.push("Workflow files changed; CI behavior may change after merge.");
  }
  const pendingCommits = collectPendingCommitCount(cwd, baseRef, execFile);
  if (pendingCommits > 0) hints.push(`${pendingCommits} local commit(s) ahead of ${baseRef}.`);
  return hints;
}

function statusFromCode(code: string): string {
  if (code.startsWith("A")) return "added";
  if (code.startsWith("M")) return "modified";
  if (code.startsWith("D")) return "deleted";
  if (code.startsWith("R")) return "renamed";
  return "unknown";
}

function titleFromBranch(branchName: string): string | undefined {
  const cleaned = branchName.replace(/^[-/_.\w]+\/(?=[^/]+$)/, "").replace(/[-_]+/g, " ").trim();
  return cleaned ? cleaned.replace(/\b\w/g, (char) => char.toUpperCase()) : undefined;
}

function firstCommitTitle(messages: string[]): string | undefined {
  return messages[0]?.trim() || undefined;
}

function extractLinkedIssues(text: string): number[] {
  const issues: number[] = [];
  for (const match of text.matchAll(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|#)\s*#?(\d+)/gi)) {
    issues.push(Number(match[1]));
  }
  return [...new Set(issues.filter((issue) => Number.isInteger(issue) && issue > 0))].sort((a, b) => a - b);
}
