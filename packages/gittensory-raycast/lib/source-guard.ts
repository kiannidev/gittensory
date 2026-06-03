const FORBIDDEN_PAYLOAD_KEYS =
  /^(?:sourceContent|sourceContents|fileContent|fileContents|rawSource|rawSourceContent|content|contents|diff|patch|rawDiff)$/i;

export function assertSourceUploadDisabled(): void {
  if (/^(1|true|yes)$/i.test(process.env.GITTENSORY_UPLOAD_SOURCE ?? "false")) {
    throw new Error("GITTENSORY_UPLOAD_SOURCE=true is not supported; Raycast sends metadata only.");
  }
}

export function assertMetadataOnlyPayload(payload: Record<string, unknown>): void {
  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_PAYLOAD_KEYS.test(key)) {
      throw new Error(`Refusing to send ${key}; source contents are never uploaded.`);
    }
  }
  const changedFiles = payload.changedFiles;
  if (Array.isArray(changedFiles)) {
    for (const entry of changedFiles) {
      if (!entry || typeof entry !== "object") continue;
      for (const key of Object.keys(entry as Record<string, unknown>)) {
        if (FORBIDDEN_PAYLOAD_KEYS.test(key)) {
          throw new Error(`Refusing to send changedFiles.${key}; source contents are never uploaded.`);
        }
      }
    }
  }
}
