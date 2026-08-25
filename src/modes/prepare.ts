import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Octokit } from "@octokit/rest";
import { GITHUB_API_URL, GITHUB_SERVER_URL } from "../github/api/config";
import type { GitHubContext, ParsedGitHubContext } from "../github/context";
import { isEntityContext } from "../github/context";
import { fetchGitHubData } from "../github/data/fetcher";
import {
  buildBranchName,
  checkoutWorkingBranch,
  compareUrl,
  configureGitIdentity,
  resolveBaseBranch,
  restoreTrustedConfig,
} from "../github/operations/branch";
import { createOrReuseTrackingComment } from "../github/operations/comments";
import { buildAgentPrompt, buildTagPrompt } from "../create-prompt";
import { buildGithubMcpToml } from "../mcp/config";
import type { AutoDetectedMode } from "./detector";

export type PrepareResult = {
  promptFile: string;
  branchName?: string;
  baseBranch?: string;
  compareUrl?: string;
  commentId?: number;
  mcpToml: string;
};

function promptFilePath(): string {
  return process.env.INPUT_PROMPT_FILE || "/tmp/grok-prompt.txt";
}

function writePrompt(contents: string): string {
  const promptFile = promptFilePath();
  mkdirSync(dirname(promptFile), { recursive: true });
  writeFileSync(promptFile, contents, { encoding: "utf8" });
  return promptFile;
}

function workspace(): string {
  return process.env.GITHUB_WORKSPACE || process.cwd();
}

async function maybeCreateComment(
  octokit: Octokit,
  context: GitHubContext,
  mode: AutoDetectedMode,
): Promise<number | undefined> {
  if (!isEntityContext(context)) {
    return undefined;
  }
  if (mode === "tag" || context.inputs.trackProgress) {
    return createOrReuseTrackingComment(octokit, context);
  }
  return undefined;
}

function mcpTomlFor(
  context: GitHubContext,
  token: string,
  commentId: number | undefined,
  headSha: string | undefined,
): string {
  const actionPath = process.env.GITHUB_ACTION_PATH || process.cwd();
  return buildGithubMcpToml({
    actionPath,
    token,
    owner: context.repository.owner,
    repo: context.repository.repo,
    commentId,
    eventName: context.eventName,
    apiUrl: GITHUB_API_URL,
    isPR: isEntityContext(context) ? context.isPR : false,
    entityNumber: isEntityContext(context) ? context.entityNumber : undefined,
    headSha,
    includeCi: Boolean(process.env.DEFAULT_WORKFLOW_TOKEN),
  });
}

export async function prepareRun(
  octokit: Octokit,
  context: GitHubContext,
  token: string,
  mode: AutoDetectedMode,
): Promise<PrepareResult> {
  const cwd = workspace();
  const commentId = await maybeCreateComment(octokit, context, mode);

  if (!isEntityContext(context)) {
    const promptFile = writePrompt(buildAgentPrompt({ context, hasCommentTool: false }));
    return {
      promptFile,
      commentId,
      mcpToml: mcpTomlFor(context, token, commentId, undefined),
    };
  }

  const entityContext = context as ParsedGitHubContext;
  const data = await fetchGitHubData(octokit, entityContext);
  const headSha = data.headSha;

  let branchName: string | undefined;
  let baseBranch: string | undefined;
  let compare: string | undefined;

  if (mode === "tag") {
    baseBranch = await resolveBaseBranch(octokit, entityContext);
    branchName = buildBranchName({
      prefix: entityContext.inputs.branchPrefix,
      isPR: entityContext.isPR,
      entityNumber: entityContext.entityNumber,
    });
    configureGitIdentity({
      cwd,
      botName: entityContext.inputs.botName,
      botId: entityContext.inputs.botId,
      token,
      serverUrl: GITHUB_SERVER_URL,
    });
    checkoutWorkingBranch({
      cwd,
      branchName,
      isPR: entityContext.isPR,
      entityNumber: entityContext.entityNumber,
      baseBranch,
    });
    if (entityContext.isPR) {
      restoreTrustedConfig({ cwd, baseBranch });
    }
    compare = compareUrl(
      entityContext.repository.owner,
      entityContext.repository.repo,
      entityContext.isPR ? (data.entity.headRef ?? baseBranch) : baseBranch,
      branchName,
    );
  }

  const promptOpts = {
    context: entityContext,
    data,
    branchName,
    compareUrl: compare,
    hasCommentTool: Boolean(commentId),
  };

  const promptFile = writePrompt(
    mode === "tag" ? buildTagPrompt(promptOpts) : buildAgentPrompt(promptOpts),
  );

  return {
    promptFile,
    branchName,
    baseBranch,
    compareUrl: compare,
    commentId,
    mcpToml: mcpTomlFor(context, token, commentId, headSha),
  };
}
