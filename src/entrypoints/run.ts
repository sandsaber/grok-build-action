import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { GITHUB_API_URL, GITHUB_SERVER_URL } from "../github/api/config";
import { isEntityContext, parseGitHubContext } from "../github/context";
import {
  clearGitAuthHeader,
  commitLeftoverChanges,
  hasCommitsAhead,
  pushBranch,
} from "../github/operations/branch";
import { finalTrackingBody, updateTrackingComment } from "../github/operations/comments";
import { checkWritePermissions } from "../github/validation/permissions";
import { checkContainsTrigger } from "../github/validation/trigger";
import { setupGrokHome } from "../grok/home";
import { invokeGrok } from "../grok/invoke";
import { detectMode } from "../modes/detector";
import { prepareRun } from "../modes/prepare";

function resolveGithubToken(): string {
  return (
    process.env.OVERRIDE_GITHUB_TOKEN ||
    process.env.DEFAULT_WORKFLOW_TOKEN ||
    process.env.GITHUB_TOKEN ||
    ""
  );
}

async function skip(reason: string): Promise<void> {
  core.info(reason);
  core.setOutput("conclusion", "skipped");
}

async function main(): Promise<void> {
  const context = parseGitHubContext();
  const githubToken = resolveGithubToken();
  if (!githubToken) {
    throw new Error("A GitHub token is required (github_token or github.token)");
  }

  const apiKey = process.env.XAI_API_KEY || "";
  const authJson = process.env.GROK_AUTH_JSON || "";
  if (!apiKey && !authJson.trim()) {
    throw new Error("Provide xai_api_key or grok_auth_json");
  }

  const octokit = new Octokit({ auth: githubToken, baseUrl: GITHUB_API_URL });

  if (isEntityContext(context)) {
    const allowed = await checkWritePermissions(octokit, context);
    if (!allowed) {
      await skip(`Skipping: ${context.actor} does not have write access`);
      return;
    }
    if (!checkContainsTrigger(context) && !context.inputs.trackProgress) {
      await skip("Skipping: trigger phrase not found");
      return;
    }
  }

  const mode = detectMode(context);
  if (mode === "agent" && !context.inputs.prompt) {
    await skip("Skipping: agent mode requires a prompt");
    return;
  }
  core.info(`Mode: ${mode}`);

  const prepared = await prepareRun(octokit, context, githubToken, mode);
  const grokHome = process.env.GROK_HOME || `${process.env.RUNNER_TEMP || "/tmp"}/grok-home`;

  setupGrokHome({
    grokHome,
    authJson: apiKey ? undefined : authJson,
    mcpToml: prepared.mcpToml,
  });

  const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
  let invokeResult;
  try {
    invokeResult = await invokeGrok({
      promptFile: prepared.promptFile,
      cwd,
      grokHome,
      extraArgs: process.env.GROK_ARGS || "",
      apiKey: apiKey || undefined,
      githubToken,
      showFullOutput: process.env.SHOW_FULL_OUTPUT === "true",
    });
  } catch (error) {
    invokeResult = {
      text: error instanceof Error ? error.message : String(error),
      sessionId: "",
      structuredOutput: "",
      error: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      executionFile: "",
    };
  }

  if (prepared.branchName && prepared.baseBranch) {
    try {
      commitLeftoverChanges(cwd);
      if (hasCommitsAhead(cwd, prepared.baseBranch)) {
        pushBranch(cwd, prepared.branchName);
      }
    } catch (error) {
      core.warning(`Git push skipped: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearGitAuthHeader(cwd, GITHUB_SERVER_URL);
    }
  }

  if (prepared.commentId) {
    await updateTrackingComment(
      octokit,
      context,
      prepared.commentId,
      finalTrackingBody({
        context,
        text: invokeResult.text || invokeResult.error || "",
        branchName: prepared.branchName,
        compareUrl: prepared.compareUrl,
        failed: invokeResult.exitCode !== 0,
      }),
    );
  }

  const conclusion = invokeResult.exitCode === 0 ? "success" : "failure";
  core.setOutput("conclusion", conclusion);
  core.setOutput("execution_file", invokeResult.executionFile);
  core.setOutput("branch_name", prepared.branchName || "");
  core.setOutput("session_id", invokeResult.sessionId);
  core.setOutput("structured_output", invokeResult.structuredOutput);

  if (invokeResult.exitCode !== 0) {
    throw new Error(invokeResult.error || "Grok Build exited with a non-zero status");
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  core.setFailed(message);
  core.setOutput("conclusion", "failure");
  process.exit(1);
});
