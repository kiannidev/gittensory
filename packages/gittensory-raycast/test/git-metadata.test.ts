import { describe, expect, it } from "vitest";
import { collectLocalBranchMetadata, parseGitRemote } from "../lib/git-metadata";

describe("parseGitRemote", () => {
  it("parses github remotes", () => {
    expect(parseGitRemote("git@github.com:JSONbored/gittensory.git")).toBe("JSONbored/gittensory");
    expect(parseGitRemote("https://github.com/JSONbored/gittensory")).toBe("JSONbored/gittensory");
  });
});

describe("collectLocalBranchMetadata", () => {
  const execFile = (file: string, args: string[]) => {
    if (file !== "git") return "";
    const key = args.join(" ");
    const map: Record<string, string> = {
      "config --get remote.origin.url": "https://github.com/JSONbored/gittensory.git\n",
      "branch --show-current": "feat/demo\n",
      "rev-parse --abbrev-ref HEAD": "feat/demo\n",
      "rev-parse --verify origin/main": "base-sha\n",
      "rev-parse --verify HEAD": "head-sha\n",
      "merge-base origin/main HEAD": "merge-sha\n",
      "rev-list --count origin/main..HEAD": "2\n",
      "log --format=%s origin/main..HEAD": "feat: demo\n",
      "diff --name-status -M origin/main --": "M\tsrc/a.ts\nR100\told.ts\tnew.ts\n",
      "diff --numstat -M origin/main --": "3\t1\tsrc/a.ts\n",
      "rev-parse --abbrev-ref @{upstream}": "",
    };
    return map[key] ?? "";
  };

  it("uses repo override when remote is missing", () => {
    const metadata = collectLocalBranchMetadata({
      login: "miner",
      cwd: "/tmp/repo",
      repoFullName: "override/repo",
      execFile: ((file: string, args: string[]) => {
        if (file !== "git") return "";
        const key = args.join(" ");
        if (key === "config --get remote.origin.url") return "";
        return execFile(file, args);
      }) as never,
    });
    expect(metadata.repoFullName).toBe("override/repo");
  });

  it("collects metadata without file contents", () => {
    const metadata = collectLocalBranchMetadata({
      login: "miner",
      cwd: "/tmp/repo",
      execFile: execFile as never,
    });
    expect(metadata.repoFullName).toBe("JSONbored/gittensory");
    expect(metadata.changedFiles[0]?.path).toBe("src/a.ts");
    expect(JSON.stringify(metadata)).not.toMatch(/fileContent|sourceContent|patch body/i);
  });
});
