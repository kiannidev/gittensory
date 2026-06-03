import { assertNoForbiddenPublicText, sanitizePublicText } from "./sanitize";

const UNSAFE_PACKET_LINE =
  /\b(reward\w*|score\w*|wallet|hotkey|coldkey|mnemonic|farming|payout|ranking|raw[-_\s]?trust|trust[-_\s]?score|private[-_\s]?reviewability|reviewability)\b|\/Users\/|\/home\/|\/tmp\/|[A-Z]:\\Users\\/i;

export function extractPrPacketMarkdown(payload: {
  prPacket?: { markdown?: string };
  actions?: Array<{ actionType?: string; payload?: { prPacket?: { markdown?: string } } }>;
}): string | null {
  const direct = payload.prPacket?.markdown;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const action = payload.actions?.find((entry) => entry.actionType === "prepare_pr_packet");
  const nested = action?.payload?.prPacket?.markdown;
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  return null;
}

export function requirePublicSafePacketMarkdown(markdown: string): string {
  const unsafeLine = markdown.split(/\r?\n/).find((line) => UNSAFE_PACKET_LINE.test(line));
  if (unsafeLine) {
    throw new Error("Refusing to copy unsafe public packet markdown from the server.");
  }
  assertNoForbiddenPublicText(markdown);
  return markdown;
}

export function sanitizePacketForClipboard(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map((line) => sanitizePublicText(line))
    .join("\n");
}
