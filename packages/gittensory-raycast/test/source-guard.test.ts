import { describe, expect, it } from "vitest";
import { assertMetadataOnlyPayload, assertSourceUploadDisabled } from "../lib/source-guard";

describe("source guard", () => {
  it("rejects upload env flag", () => {
    const previous = process.env.GITTENSORY_UPLOAD_SOURCE;
    process.env.GITTENSORY_UPLOAD_SOURCE = "true";
    expect(() => assertSourceUploadDisabled()).toThrow(/metadata only/i);
    process.env.GITTENSORY_UPLOAD_SOURCE = previous;
  });

  it("rejects forbidden payload keys", () => {
    expect(() => assertMetadataOnlyPayload({ fileContent: "secret" })).toThrow(/never uploaded/i);
    expect(() => assertMetadataOnlyPayload({ changedFiles: [{ path: "a.ts", diff: "code" }] })).toThrow(/never uploaded/i);
  });

  it("allows metadata-only branch payloads", () => {
    expect(() =>
      assertMetadataOnlyPayload({
        login: "miner",
        repoFullName: "o/r",
        changedFiles: [{ path: "src/a.ts", additions: 1, deletions: 0, status: "modified", binary: false }],
      }),
    ).not.toThrow();
  });
});
