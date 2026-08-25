import type { Octokit } from "@octokit/rest";
import type { GitHubContext } from "../context";
import { isWorkflowRunEvent } from "../context";

export function isBotActor(actor: string): boolean {
  return actor.endsWith("[bot]") || actor.toLowerCase().includes("[bot]");
}

export function isAllowedBot(actor: string, allowedBots: string): boolean {
  const trimmed = allowedBots.trim();
  if (trimmed === "*") return true;
  if (!trimmed) return false;

  const allowedList = trimmed
    .split(",")
    .map((bot) =>
      bot
        .trim()
        .toLowerCase()
        .replace(/\[bot]$/, ""),
    )
    .filter((bot) => bot.length > 0);

  const normalizedActor = actor.toLowerCase().replace(/\[bot]$/, "");
  return allowedList.includes(normalizedActor);
}

function actorsToCheck(context: GitHubContext): string[] {
  const actors = [context.actor];
  if (isWorkflowRunEvent(context)) {
    const runActor = context.payload.workflow_run?.actor?.login;
    if (runActor && !actors.includes(runActor)) {
      actors.push(runActor);
    }
  }
  return actors;
}

export async function checkWritePermissions(
  octokit: Octokit,
  context: GitHubContext,
): Promise<boolean> {
  for (const actor of actorsToCheck(context)) {
    const allowed = await checkActorWritePermissions(octokit, context, actor);
    if (!allowed) return false;
  }
  return true;
}

async function checkActorWritePermissions(
  octokit: Octokit,
  context: GitHubContext,
  actor: string,
): Promise<boolean> {
  const allowedBots = context.inputs.allowedBots ?? "";

  if (isBotActor(actor)) {
    if (isAllowedBot(actor, allowedBots)) {
      return true;
    }
    return false;
  }

  try {
    const response = await octokit.repos.getCollaboratorPermissionLevel({
      owner: context.repository.owner,
      repo: context.repository.repo,
      username: actor,
    });
    const permissionLevel = response.data.permission;
    return permissionLevel === "admin" || permissionLevel === "write";
  } catch (error) {
    if (error instanceof Error && error.message.includes("is not a user")) {
      return isAllowedBot(actor, allowedBots);
    }
    throw new Error(`Failed to check permissions for ${actor}: ${error}`);
  }
}
