import type { Octokit } from "@octokit/rest";
import type { ParsedGitHubContext } from "../context";
import {
  isIssueCommentEvent,
  isIssuesEvent,
  isPullRequestEvent,
  isPullRequestReviewCommentEvent,
  isPullRequestReviewEvent,
} from "../context";
import type { FormattedComment, FormattedEntity } from "./formatter";

export type FetchedGitHubData = {
  entity: FormattedEntity;
  comments: FormattedComment[];
  reviewComments: FormattedComment[];
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
  triggeringBody: string;
  headSha?: string;
};

export async function fetchGitHubData(
  octokit: Octokit,
  context: ParsedGitHubContext,
): Promise<FetchedGitHubData> {
  const { owner, repo } = context.repository;
  const number = context.entityNumber;

  if (context.isPR) {
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: number,
    });
    const { data: comments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: number,
      per_page: 100,
    });
    const { data: reviewComments } = await octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number: number,
      per_page: 100,
    });
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: number,
      per_page: 100,
    });

    return {
      entity: {
        title: pr.title,
        author: pr.user?.login ?? "ghost",
        body: pr.body || "",
        labels: pr.labels.map((label) => (typeof label === "string" ? label : label.name || "")),
        isPR: true,
        headRef: pr.head.ref,
        baseRef: pr.base.ref,
        state: pr.state,
      },
      comments: comments.map((comment) => ({
        author: comment.user?.login ?? "ghost",
        createdAt: comment.created_at,
        body: comment.body || "",
      })),
      reviewComments: reviewComments.map((comment) => ({
        author: comment.user?.login ?? "ghost",
        createdAt: comment.created_at,
        body: comment.body || "",
        path: comment.path,
        line: comment.line,
      })),
      files: files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
      })),
      triggeringBody: extractTriggeringBody(context),
      headSha: pr.head.sha,
    };
  }

  const { data: issue } = await octokit.issues.get({
    owner,
    repo,
    issue_number: number,
  });
  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: number,
    per_page: 100,
  });

  return {
    entity: {
      title: issue.title,
      author: issue.user?.login ?? "ghost",
      body: issue.body || "",
      labels: issue.labels.map((label) => (typeof label === "string" ? label : label.name || "")),
      isPR: false,
      state: issue.state,
    },
    comments: comments.map((comment) => ({
      author: comment.user?.login ?? "ghost",
      createdAt: comment.created_at,
      body: comment.body || "",
    })),
    reviewComments: [],
    files: [],
    triggeringBody: extractTriggeringBody(context),
  };
}

export function extractTriggeringBody(context: ParsedGitHubContext): string {
  if (isIssueCommentEvent(context) || isPullRequestReviewCommentEvent(context)) {
    return context.payload.comment.body || "";
  }
  if (isPullRequestReviewEvent(context)) {
    return context.payload.review.body || "";
  }
  if (isIssuesEvent(context)) {
    return context.payload.issue.body || "";
  }
  if (isPullRequestEvent(context)) {
    return context.payload.pull_request.body || "";
  }
  return "";
}
