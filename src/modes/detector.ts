import type { GitHubContext } from "../github/context";
import {
  isEntityContext,
  isIssueCommentEvent,
  isIssuesEvent,
  isPullRequestEvent,
  isPullRequestReviewCommentEvent,
  isPullRequestReviewEvent,
} from "../github/context";
import { checkContainsTrigger } from "../github/validation/trigger";

export type AutoDetectedMode = "tag" | "agent";

export function detectMode(context: GitHubContext): AutoDetectedMode {
  if (context.inputs.trackProgress) {
    validateTrackProgressEvent(context);
    if (isEntityContext(context)) {
      if (
        isPullRequestEvent(context) ||
        isIssuesEvent(context) ||
        isIssueCommentEvent(context) ||
        isPullRequestReviewCommentEvent(context) ||
        isPullRequestReviewEvent(context)
      ) {
        return "tag";
      }
    }
  }

  if (isEntityContext(context)) {
    if (
      isIssueCommentEvent(context) ||
      isPullRequestReviewCommentEvent(context) ||
      isPullRequestReviewEvent(context)
    ) {
      if (context.inputs.prompt) {
        return "agent";
      }
      if (checkContainsTrigger(context)) {
        return "tag";
      }
    }

    if (isIssuesEvent(context)) {
      if (context.inputs.prompt) {
        return "agent";
      }
      if (checkContainsTrigger(context)) {
        return "tag";
      }
    }

    if (isPullRequestEvent(context)) {
      const supportedActions = ["opened", "synchronize", "ready_for_review", "reopened"];
      if (context.eventAction && supportedActions.includes(context.eventAction)) {
        if (context.inputs.prompt) {
          return "agent";
        }
      }
    }
  }

  return "agent";
}

function validateTrackProgressEvent(context: GitHubContext): void {
  const validEvents = [
    "pull_request",
    "issues",
    "issue_comment",
    "pull_request_review_comment",
    "pull_request_review",
  ];
  if (!validEvents.includes(context.eventName)) {
    throw new Error(
      `track_progress is only supported for events: ${validEvents.join(", ")}. ` +
        `Current event: ${context.eventName}`,
    );
  }

  if (context.eventName === "pull_request" && context.eventAction) {
    const validActions = ["opened", "synchronize", "ready_for_review", "reopened", "labeled"];
    if (!validActions.includes(context.eventAction)) {
      throw new Error(
        `track_progress for pull_request events is only supported for actions: ` +
          `${validActions.join(", ")}. Current action: ${context.eventAction}`,
      );
    }
  }
}
