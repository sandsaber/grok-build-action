import { existsSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Octokit } from "@octokit/rest";
import { GITHUB_SERVER_URL } from "../api/config";
import type { ParsedGitHubContext } from "../context";
import { gitSucceeds, runGit } from "./git";

export function buildBranchName(opts: {
  prefix: string;
  isPR: boolean;
  entityNumber: number;
  now?: Date;
}): string {
  const iso = (opts.now ?? new Date()).toISOString();
  const ts = iso
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z")
    .toLowerCase();
  const type = opts.isPR ? "pr" : "issue";
  let prefix = opts.prefix || "grok/";
  prefix = prefix.replace(/^\.+/, "").replace(/\/+/g, "/");
  if (!prefix.endsWith("/") && !prefix.endsWith("-")) {
    prefix += "/";
  }
  return `${prefix}${type}-${opts.entityNumber}-${ts}`;
}

export function compareUrl(owner: string, repo: string, base: string, head: string): string {
  return `${GITHUB_SERVER_URL}/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}?quick_pull=1`;
}

export async function resolveBaseBranch(
  octokit: Octokit,
  context: ParsedGitHubContext,
): Promise<string> {
  if (context.inputs.baseBranch) {
    return context.inputs.baseBranch;
  }
  if (context.repository.default_branch) {
    return context.repository.default_branch;
  }
  const { data } = await octokit.repos.get({
    owner: context.repository.owner,
    repo: context.repository.repo,
  });
  return data.default_branch;
}

export function configureGitIdentity(opts: {
  cwd: string;
  botName: string;
  botId: string;
  token: string;
  serverUrl: string;
}): void {
  runGit(["config", "user.name", opts.botName], { cwd: opts.cwd });
  runGit(["config", "user.email", `${opts.botId}+${opts.botName}@users.noreply.github.com`], {
    cwd: opts.cwd,
  });
  const host = new URL(opts.serverUrl).host;
  runGit(["config", `http.https://${host}/.extraheader`, `AUTHORIZATION: bearer ${opts.token}`], {
    cwd: opts.cwd,
  });
}

export function clearGitAuthHeader(cwd: string, serverUrl: string): void {
  const host = new URL(serverUrl).host;
  gitSucceeds(["config", "--unset", `http.https://${host}/.extraheader`], cwd);
}

export function checkoutWorkingBranch(opts: {
  cwd: string;
  branchName: string;
  isPR: boolean;
  entityNumber: number;
  baseBranch: string;
}): void {
  if (opts.isPR) {
    runGit(["fetch", "origin", `pull/${opts.entityNumber}/head`], { cwd: opts.cwd });
    runGit(["checkout", "-B", opts.branchName, "FETCH_HEAD"], { cwd: opts.cwd });
    return;
  }
  runGit(["fetch", "origin", opts.baseBranch, "--depth=1"], { cwd: opts.cwd });
  const baseRef = `origin/${opts.baseBranch}`;
  runGit(["checkout", "-B", opts.branchName, baseRef], { cwd: opts.cwd });
}

const TRUSTED_PATHS = [".grok", "AGENTS.md", "AGENTS.override.md"] as const;

export function restoreTrustedConfig(opts: { cwd: string; baseBranch: string }): void {
  runGit(["fetch", "origin", opts.baseBranch, "--depth=1"], { cwd: opts.cwd });
  for (const rel of TRUSTED_PATHS) {
    const abs = join(opts.cwd, rel);
    const prCopy = join(opts.cwd, rel === ".grok" ? ".grok-pr" : `${rel}.pr`);
    if (existsSync(abs)) {
      if (existsSync(prCopy)) {
        rmSync(prCopy, { recursive: true, force: true });
      }
      renameSync(abs, prCopy);
    }
    const fromBase = gitSucceeds(["checkout", `origin/${opts.baseBranch}`, "--", rel], opts.cwd);
    if (!fromBase && existsSync(abs)) {
      rmSync(abs, { recursive: true, force: true });
    }
  }
}

export function commitLeftoverChanges(cwd: string): boolean {
  const status = runGit(["status", "--porcelain"], { cwd });
  if (!status) {
    return false;
  }
  runGit(["add", "-A"], { cwd });
  runGit(["commit", "-m", "Apply Grok Build changes"], { cwd });
  return true;
}

export function pushBranch(cwd: string, branchName: string): void {
  runGit(["push", "-u", "origin", branchName], { cwd });
}

export function hasCommitsAhead(cwd: string, baseBranch: string): boolean {
  if (!gitSucceeds(["rev-parse", "--verify", `origin/${baseBranch}`], cwd)) {
    return gitSucceeds(["rev-parse", "--verify", "HEAD"], cwd);
  }
  const count = runGit(["rev-list", "--count", `origin/${baseBranch}..HEAD`], { cwd });
  return Number(count) > 0;
}
