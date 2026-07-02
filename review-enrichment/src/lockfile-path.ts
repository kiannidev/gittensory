const SUPPORTED_LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "poetry.lock",
  "go.sum",
]);

/** Lockfile basenames are case-insensitive on common filesystems — normalize separators first. */
export function lockfileBasename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

export function isSupportedLockfile(path: string): boolean {
  return SUPPORTED_LOCKFILE_NAMES.has(lockfileBasename(path).toLowerCase());
}
