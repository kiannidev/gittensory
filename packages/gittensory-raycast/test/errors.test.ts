import { describe, expect, it } from "vitest";
import { GittensoryApiError, formatMinerApiError, isRateLimited } from "../lib/errors";

describe("formatMinerApiError", () => {
  it("includes retry guidance for rate limits", () => {
    const error = new GittensoryApiError("too_many_requests", 429, 30);
    expect(formatMinerApiError(error)).toMatch(/Retry in 30 second/i);
    expect(isRateLimited(error)).toBe(true);
  });

  it("handles generic rate limits without retry-after", () => {
    expect(formatMinerApiError(new GittensoryApiError("too_many_requests", 429))).toMatch(/Wait a moment/i);
  });

  it("suggests login refresh for auth failures", () => {
    expect(formatMinerApiError(new GittensoryApiError("forbidden", 403))).toMatch(/Login/i);
    expect(formatMinerApiError(new GittensoryApiError("unauthorized", 401))).toMatch(/Login/i);
  });

  it("falls back for unknown errors", () => {
    expect(formatMinerApiError(new Error("boom"))).toBe("boom");
    expect(formatMinerApiError(null)).toBe("request_failed");
  });
});
