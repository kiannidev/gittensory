export type ParsedRejectRenderArgs =
  | {
      reason: string;
      repo: string;
      prNumber: number;
      json: boolean;
    }
  | { error: string };

export type ParsedRejectReasonsArgs = { json: boolean } | { error: string };

export function parseRejectRenderArgs(args: string[]): ParsedRejectRenderArgs;

export function parseRejectReasonsArgs(args: string[]): ParsedRejectReasonsArgs;

export function runRejectRender(args: string[]): number;

export function runRejectReasons(args: string[]): number;

export function runRejectCli(subcommand: string | undefined, args: string[]): number;
