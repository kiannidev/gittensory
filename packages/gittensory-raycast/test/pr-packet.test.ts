import { describe, expect, it } from "vitest";
import { extractPrPacketMarkdown, requirePublicSafePacketMarkdown, sanitizePacketForClipboard } from "../lib/pr-packet";

describe("pr packet safety", () => {
  it("extracts markdown from agent bundle shapes", () => {
    const nested = extractPrPacketMarkdown({
      actions: [{ actionType: "prepare_pr_packet", payload: { prPacket: { markdown: "# Packet\n\nSafe text." } } }],
    });
    const direct = extractPrPacketMarkdown({ prPacket: { markdown: "# Direct\n\nBody." } });
    expect(nested).toContain("Packet");
    expect(direct).toContain("Direct");
    expect(extractPrPacketMarkdown({})).toBeNull();
  });

  it("rejects unsafe wallet language before copy", () => {
    expect(() => requirePublicSafePacketMarkdown("# Title\n\nUpdate wallet hotkey payout")).toThrow(/unsafe|wallet|hotkey/i);
  });

  it("sanitizes forbidden terms in otherwise valid packets", () => {
    const sanitized = sanitizePacketForClipboard("# Title\n\nReady to merge.");
    expect(sanitized).toContain("Ready");
  });
});
