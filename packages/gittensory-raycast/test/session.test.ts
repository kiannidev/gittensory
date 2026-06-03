import { describe, expect, it } from "vitest";
import { requireAuthenticatedMiner } from "../lib/session";
import { createMemorySessionStorage, STORAGE_KEYS } from "../lib/storage";
import { VALID_SESSION_TOKEN } from "./helpers";

describe("requireAuthenticatedMiner", () => {
  it("returns session context when signed in", async () => {
    const adapter = createMemorySessionStorage({
      [STORAGE_KEYS.apiOrigin]: "http://localhost:8787",
      [STORAGE_KEYS.sessionToken]: VALID_SESSION_TOKEN,
      [STORAGE_KEYS.sessionExpiresAt]: "2099-01-01T00:00:00.000Z",
      [STORAGE_KEYS.sessionLogin]: "miner",
    });
    await expect(requireAuthenticatedMiner(adapter)).resolves.toMatchObject({ login: "miner", token: VALID_SESSION_TOKEN });
  });

  it("requires login before miner commands", async () => {
    await expect(requireAuthenticatedMiner(createMemorySessionStorage())).rejects.toThrow(/not signed in/i);
  });
});
