export type ParsedCiWaitArgs =
  | {
      repoFullName: string;
      prNumber: number;
      json: boolean;
      maxAttempts: number | undefined;
      minIntervalMs: number | undefined;
      maxIntervalMs: number | undefined;
    }
  | { error: string };

export function parseCiWaitArgs(args: string[]): ParsedCiWaitArgs;

export function runCiWait(
  args: string[],
  input: { env?: Record<string, string | undefined> },
): Promise<number>;
