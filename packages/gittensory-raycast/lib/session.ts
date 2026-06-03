import { loadStoredAuth, type SessionStorageAdapter } from "./storage";

export type AuthenticatedMinerContext = {
  apiOrigin: string;
  token: string;
  login: string;
};

export async function requireAuthenticatedMiner(adapter: SessionStorageAdapter): Promise<AuthenticatedMinerContext> {
  const stored = await loadStoredAuth(adapter);
  if (!stored.session?.token || !stored.session.login) {
    throw new Error("Not signed in. Run the Login command first.");
  }
  return {
    apiOrigin: stored.apiOrigin,
    token: stored.session.token,
    login: stored.session.login,
  };
}
