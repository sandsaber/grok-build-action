import type { ParsedGitHubContext } from "../context";
import {
  isIssueCommentEvent,
  isIssuesAssignedEvent,
  isIssuesEvent,
  isPullRequestEvent,
  isPullRequestReviewCommentEvent,
  isPullRequestReviewEvent,
} from "../context";

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function triggerRegex(phrase: string): RegExp {
  return new RegExp(`(^|\\s)${escapeRegExp(phrase)}([\\s.,!?;:]|$)`, "i");
}

export function checkContainsTrigger(context: ParsedGitHubContext): boolean {
  const { assigneeTrigger, labelTrigger, triggerPhrase, prompt } = context.inputs;

  if (prompt) {
    return true;
  }

  if (isIssuesAssignedEvent(context)) {
    const triggerUser = assigneeTrigger.replace(/^@/, "");
    const assigneeUsername = context.payload.assignee?.login || "";
    if (triggerUser && assigneeUsername === triggerUser) {
      return true;
    }
  }

  if (isIssuesEvent(context) && context.eventAction === "labeled") {
    const labelName = "label" in context.payload ? (context.payload.label?.name ?? "") : "";
    if (labelTrigger && labelName.toLowerCase() === labelTrigger.toLowerCase()) {
      return true;
    }
  }

  const regex = triggerRegex(triggerPhrase);

  if (isIssuesEvent(context) && context.eventAction === "opened") {
    const body = context.payload.issue.body || "";
    const title = context.payload.issue.title || "";
    if (regex.test(body) || regex.test(title)) {
      return true;
    }
  }

  if (isPullRequestEvent(context)) {
    const body = context.payload.pull_request.body || "";
    const title = context.payload.pull_request.title || "";
    if (regex.test(body) || regex.test(title)) {
      return true;
    }
  }

  if (
    isPullRequestReviewEvent(context) &&
    (context.eventAction === "submitted" || context.eventAction === "edited")
  ) {
    const reviewBody = context.payload.review.body || "";
    if (regex.test(reviewBody)) {
      return true;
    }
  }

  if (isIssueCommentEvent(context) || isPullRequestReviewCommentEvent(context)) {
    const commentBody = context.payload.comment.body || "";
    if (regex.test(commentBody)) {
      return true;
    }
  }

  return false;
}
