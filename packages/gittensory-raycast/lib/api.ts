import { normalizeApiOrigin } from "./config";
import { GittensoryApiError } from "./errors";
import type { FetchLike } from "./types";

export type ApiRequestOptions = {
  apiOrigin: string;
  path: string;
  method?: string;
  body?: unknown;
  token?: string | null;
  fetchImpl?: FetchLike;
};

function parseRetryAfterSeconds(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  return undefined;
}

export async function gittensoryApiRequest<T>(options: ApiRequestOptions): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const origin = normalizeApiOrigin(options.apiOrigin);
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
  };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  const response = await fetchImpl(`${origin}${options.path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : `request_failed_${response.status}`;
    throw new GittensoryApiError(message, response.status, parseRetryAfterSeconds(response.headers.get("retry-after")));
  }
  return payload;
}
