import type { Octokit } from "@octokit/rest";
import { GITHUB_SERVER_URL } from "../api/config";
import { grokLead, TRACKING_MARKER } from "../comment-chrome";
import type { GitHubContext, ParsedGitHubContext } from "../context";
import { isEntityContext } from "../context";
import { sanitizeContent } from "../utils/sanitizer";

export { TRACKING_MARKER, GROK_ICON_URL, grokLead, withGrokChrome } from "../comment-chrome";

export function jobUrl(context: GitHubContext): string {
  return `${GITHUB_SERVER_URL}/${context.repository.full_name}/actions/runs/${context.runId}`;
}

export function initialTrackingBody(context: GitHubContext): string {
  return [
    grokLead("**Grok Build** is working on this…"),
    "",
    `[View job](${jobUrl(context)})`,
    "",
    TRACKING_MARKER,
  ].join("\n");
}

export function finalTrackingBody(opts: {
  context: GitHubContext;
  text: string;
  branchName?: string;
  compareUrl?: string;
  failed?: boolean;
}): string {
  const heading = opts.failed
    ? grokLead("**Grok Build** failed.")
    : grokLead("**Grok Build** finished.");
  const parts = [heading, "", sanitizeContent(opts.text).trim() || "(no output)"];
  if (opts.branchName) {
    parts.push("", `Branch: \`${opts.branchName}\``);
  }
  if (opts.compareUrl) {
    parts.push("", `[Open a pull request](${opts.compareUrl})`);
  }
  parts.push("", `[View job](${jobUrl(opts.context)})`, "", TRACKING_MARKER);
  return parts.join("\n");
}

export async function createOrReuseTrackingComment(
  octokit: Octokit,
  context: ParsedGitHubContext,
): Promise<number> {
  const { owner, repo } = context.repository;

  if (context.inputs.useStickyComment) {
    const { data: comments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: context.entityNumber,
      per_page: 100,
    });
    const existing = comments.find((comment) => (comment.body || "").includes(TRACKING_MARKER));
    if (existing) {
      await octokit.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body: initialTrackingBody(context),
      });
      return existing.id;
    }
  }

  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: context.entityNumber,
    body: initialTrackingBody(context),
  });
  return data.id;
}

export async function updateTrackingComment(
  octokit: Octokit,
  context: GitHubContext,
  commentId: number,
  body: string,
): Promise<void> {
  if (!isEntityContext(context)) {
    return;
  }
  await octokit.issues.updateComment({
    owner: context.repository.owner,
    repo: context.repository.repo,
    comment_id: commentId,
    body,
  });
}
