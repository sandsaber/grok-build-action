import { parse } from "shell-quote";

const MANAGED_FLAGS = new Set([
  "--prompt-file",
  "-p",
  "--single",
  "--cwd",
  "--output-format",
  "--yolo",
  "--always-approve",
  "--no-plan",
  "--no-auto-update",
]);

export function parseGrokArgs(raw: string): string[] {
  if (!raw.trim()) {
    return [];
  }
  const tokens = parse(raw, process.env);
  const args: string[] = [];
  for (const token of tokens) {
    if (typeof token === "string") {
      args.push(token);
    } else if ("op" in token && token.op === "glob" && "pattern" in token) {
      args.push(String(token.pattern));
    }
  }
  return args;
}

export function filterUserGrokArgs(args: string[]): string[] {
  const filtered: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const flag = arg.split("=")[0];
    if (MANAGED_FLAGS.has(flag)) {
      if (!arg.includes("=") && i + 1 < args.length && !args[i + 1].startsWith("-")) {
        i += 1;
      }
      continue;
    }
    filtered.push(arg);
  }
  return filtered;
}
