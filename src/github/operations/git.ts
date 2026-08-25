import { spawnSync } from "node:child_process";

export function runGit(
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): string {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "unknown git error").trim();
    throw new Error(`git ${args[0]} failed: ${err}`);
  }
  return (result.stdout || "").trim();
}

export function gitSucceeds(args: string[], cwd?: string): boolean {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    cwd,
    env: process.env,
  });
  return result.status === 0;
}
