import { REJECTION_REASONS, renderRejectionMessage } from "./rejection-templates.js";

const REJECT_RENDER_USAGE =
  "Usage: gittensory-miner reject render --reason <gate_close|maintainer_close_no_reason|superseded_by_duplicate> --repo <owner/repo> --pr <number> [--json]";

function parsePositiveInt(flag, value) {
  if (value === undefined) {
    return { error: `Missing value for ${flag}.` };
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: `Invalid value for ${flag}: must be a positive integer.` };
  }
  return { value: parsed };
}

export function parseRejectRenderArgs(args) {
  const options = {
    json: false,
    reason: undefined,
    repo: undefined,
    prNumber: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--reason") {
      const reason = args[++index];
      if (!reason) return { error: "Missing value for --reason." };
      options.reason = reason;
      continue;
    }
    if (token === "--repo") {
      const repo = args[++index];
      if (!repo) return { error: "Missing value for --repo." };
      options.repo = repo;
      continue;
    }
    if (token === "--pr") {
      const parsed = parsePositiveInt("--pr", args[++index]);
      if ("error" in parsed) return { error: parsed.error };
      options.prNumber = parsed.value;
      continue;
    }
    if (token.startsWith("-")) {
      return { error: `Unknown option: ${token}` };
    }
    return { error: REJECT_RENDER_USAGE };
  }

  if (!options.reason || !options.repo || options.prNumber === undefined) {
    return { error: REJECT_RENDER_USAGE };
  }

  return options;
}

export function parseRejectReasonsArgs(args) {
  if (args.length === 1 && args[0] === "--json") {
    return { json: true };
  }
  if (args.length === 0) {
    return { json: false };
  }
  if (args.length === 1 && args[0].startsWith("-")) {
    return { error: `Unknown option: ${args[0]}` };
  }
  return { error: "Usage: gittensory-miner reject reasons [--json]" };
}

export function runRejectRender(args) {
  const parsed = parseRejectRenderArgs(args);
  if ("error" in parsed) {
    console.error(parsed.error);
    return 2;
  }

  try {
    const message = renderRejectionMessage(parsed.reason, {
      repoFullName: parsed.repo,
      prNumber: parsed.prNumber,
    });
    if (parsed.json) {
      console.log(
        JSON.stringify({
          reason: parsed.reason,
          repoFullName: parsed.repo,
          prNumber: parsed.prNumber,
          message,
        }),
      );
    } else {
      console.log(message);
    }
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
}

export function runRejectReasons(args) {
  const parsed = parseRejectReasonsArgs(args);
  if ("error" in parsed) {
    console.error(parsed.error);
    return 2;
  }

  if (parsed.json) {
    console.log(JSON.stringify({ reasons: [...REJECTION_REASONS] }));
  } else {
    for (const reason of REJECTION_REASONS) {
      console.log(reason);
    }
  }
  return 0;
}

export function runRejectCli(subcommand, args) {
  if (subcommand === "render") return runRejectRender(args);
  if (subcommand === "reasons") return runRejectReasons(args);
  console.error(`Unknown reject subcommand: ${subcommand ?? ""}. ${REJECT_RENDER_USAGE}`);
  return 2;
}
