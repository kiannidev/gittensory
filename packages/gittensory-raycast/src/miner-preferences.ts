import { getPreferenceValues } from "@raycast/api";

export type MinerPreferences = {
  apiOrigin?: string;
  repoPath?: string;
  repoFullName?: string;
  baseRef?: string;
};

export function getMinerPreferences(): MinerPreferences {
  return getPreferenceValues<MinerPreferences>();
}
