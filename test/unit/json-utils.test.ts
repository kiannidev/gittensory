import { describe, expect, it } from "vitest";
import {
  errorMessage,
  jsonString,
  normalizeRepoFullName,
  parseJson,
  repoParts,
  strippedErrorMessage,
} from "../../src/utils/json";

describe("json utils", () => {
  it("parseJson returns fallback on empty or invalid JSON", () => {
    expect(parseJson(null, { ok: true })).toEqual({ ok: true });
    expect(parseJson("", { ok: true })).toEqual({ ok: true });
    expect(parseJson("{bad", { ok: true })).toEqual({ ok: true });
    expect(parseJson('{"n":1}', { ok: false })).toEqual({ n: 1 });
  });

  it("jsonString stringifies values and maps undefined to null", () => {
    expect(jsonString({ a: 1 })).toBe('{"a":1}');
    expect(jsonString(undefined)).toBe("null");
  });

  it("errorMessage and strippedErrorMessage normalize unknown errors", () => {
    expect(errorMessage(new Error("boom"), "fallback")).toBe("boom");
    expect(errorMessage("plain", "fallback")).toBe("fallback");
    expect(strippedErrorMessage(new Error("Error: nested"), "fallback")).toBe(
      "nested",
    );
    expect(strippedErrorMessage("plain", "fallback")).toBe("fallback");
  });

  it("normalizeRepoFullName trims whitespace", () => {
    expect(normalizeRepoFullName("  org/app  ")).toBe("org/app");
  });

  it("repoParts splits owner and nested repo names", () => {
    expect(repoParts("")).toEqual({ owner: "", name: "" });
    expect(repoParts("org/app")).toEqual({ owner: "org", name: "app" });
    expect(repoParts("org/sub/repo")).toEqual({ owner: "org", name: "sub/repo" });
  });
});
