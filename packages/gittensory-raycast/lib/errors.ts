export class GittensoryApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "GittensoryApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof GittensoryApiError && error.status === 429;
}

export function formatMinerApiError(error: unknown): string {
  if (error instanceof GittensoryApiError) {
    if (error.status === 429) {
      if (error.retryAfterSeconds) {
        return `Rate limited. Retry in ${error.retryAfterSeconds} second(s).`;
      }
      return "Rate limited. Wait a moment and try again.";
    }
    if (error.status === 401 || error.status === 403) {
      return `${error.message} Run Login to refresh your Gittensory session.`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "request_failed";
}
