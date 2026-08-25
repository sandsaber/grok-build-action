import * as github from "@actions/github";
import type {
  IssueCommentEvent,
  IssuesAssignedEvent,
  IssuesEvent,
  PullRequestEvent,
  PullRequestReviewCommentEvent,
  PullRequestReviewEvent,
  WorkflowRunEvent,
} from "@octokit/webhooks-types";

export type ActionInputs = {
  prompt: string;
  triggerPhrase: string;
  assigneeTrigger: string;
  labelTrigger: string;
  baseBranch?: string;
  branchPrefix: string;
  useStickyComment: boolean;
  trackProgress: boolean;
  allowedBots: string;
  botId: string;
  botName: string;
};

export type WorkflowDispatchEvent = {
  action?: never;
  inputs?: Record<string, unknown>;
  ref?: string;
  repository: { name: string; owner: { login: string } };
  sender: { login: string };
  workflow: string;
};

export type RepositoryDispatchEvent = {
  action: string;
  client_payload?: Record<string, unknown>;
  repository: { name: string; owner: { login: string } };
  sender: { login: string };
};

export type ScheduleEvent = {
  action?: never;
  schedule?: string;
  repository: { name: string; owner: { login: string } };
};

const ENTITY_EVENT_NAMES = [
  "issues",
  "issue_comment",
  "pull_request",
  "pull_request_review",
  "pull_request_review_comment",
] as const;

const AUTOMATION_EVENT_NAMES = [
  "workflow_dispatch",
  "repository_dispatch",
  "schedule",
  "workflow_run",
] as const;

type EntityEventName = (typeof ENTITY_EVENT_NAMES)[number];
type AutomationEventName = (typeof AUTOMATION_EVENT_NAMES)[number];

type BaseContext = {
  runId: string;
  eventAction?: string;
  repository: {
    owner: string;
    repo: string;
    full_name: string;
    default_branch?: string;
  };
  actor: string;
  inputs: ActionInputs;
};

export type ParsedGitHubContext = BaseContext & {
  eventName: EntityEventName;
  payload:
    | IssuesEvent
    | IssueCommentEvent
    | PullRequestEvent
    | PullRequestReviewEvent
    | PullRequestReviewCommentEvent;
  entityNumber: number;
  isPR: boolean;
};

export type AutomationContext = BaseContext & {
  eventName: AutomationEventName;
  payload: WorkflowDispatchEvent | RepositoryDispatchEvent | ScheduleEvent | WorkflowRunEvent;
};

export type GitHubContext = ParsedGitHubContext | AutomationContext;

export function readActionInputs(env: NodeJS.ProcessEnv = process.env): ActionInputs {
  return {
    prompt: env.PROMPT || "",
    triggerPhrase: env.TRIGGER_PHRASE || "@grok",
    assigneeTrigger: env.ASSIGNEE_TRIGGER || "",
    labelTrigger: env.LABEL_TRIGGER || "grok",
    baseBranch: env.BASE_BRANCH || undefined,
    branchPrefix: env.BRANCH_PREFIX || "grok/",
    useStickyComment: env.USE_STICKY_COMMENT === "true",
    trackProgress: env.TRACK_PROGRESS === "true",
    allowedBots: env.ALLOWED_BOTS || "",
    botId: env.BOT_ID || "41898282",
    botName: env.BOT_NAME || "github-actions[bot]",
  };
}

export function parseGitHubContext(env: NodeJS.ProcessEnv = process.env): GitHubContext {
  const context = github.context;
  const commonFields: BaseContext = {
    runId: env.GITHUB_RUN_ID || String(context.runId),
    eventAction: context.payload.action,
    repository: {
      owner: context.repo.owner,
      repo: context.repo.repo,
      full_name: `${context.repo.owner}/${context.repo.repo}`,
      default_branch: context.payload.repository?.default_branch,
    },
    actor: context.actor,
    inputs: readActionInputs(env),
  };

  switch (context.eventName) {
    case "issues": {
      const payload = context.payload as IssuesEvent;
      return {
        ...commonFields,
        eventName: "issues",
        payload,
        entityNumber: payload.issue.number,
        isPR: false,
      };
    }
    case "issue_comment": {
      const payload = context.payload as IssueCommentEvent;
      return {
        ...commonFields,
        eventName: "issue_comment",
        payload,
        entityNumber: payload.issue.number,
        isPR: Boolean(payload.issue.pull_request),
      };
    }
    case "pull_request":
    case "pull_request_target": {
      const payload = context.payload as PullRequestEvent;
      return {
        ...commonFields,
        eventName: "pull_request",
        payload,
        entityNumber: payload.pull_request.number,
        isPR: true,
      };
    }
    case "pull_request_review": {
      const payload = context.payload as PullRequestReviewEvent;
      return {
        ...commonFields,
        eventName: "pull_request_review",
        payload,
        entityNumber: payload.pull_request.number,
        isPR: true,
      };
    }
    case "pull_request_review_comment": {
      const payload = context.payload as PullRequestReviewCommentEvent;
      return {
        ...commonFields,
        eventName: "pull_request_review_comment",
        payload,
        entityNumber: payload.pull_request.number,
        isPR: true,
      };
    }
    case "workflow_dispatch": {
      return {
        ...commonFields,
        eventName: "workflow_dispatch",
        payload: context.payload as unknown as WorkflowDispatchEvent,
      };
    }
    case "repository_dispatch": {
      return {
        ...commonFields,
        eventName: "repository_dispatch",
        payload: context.payload as unknown as RepositoryDispatchEvent,
      };
    }
    case "schedule": {
      return {
        ...commonFields,
        eventName: "schedule",
        payload: context.payload as unknown as ScheduleEvent,
      };
    }
    case "workflow_run": {
      return {
        ...commonFields,
        eventName: "workflow_run",
        payload: context.payload as unknown as WorkflowRunEvent,
      };
    }
    default:
      throw new Error(`Unsupported event type: ${context.eventName}`);
  }
}

export function isIssuesEvent(
  context: GitHubContext,
): context is ParsedGitHubContext & { payload: IssuesEvent } {
  return context.eventName === "issues";
}

export function isIssueCommentEvent(
  context: GitHubContext,
): context is ParsedGitHubContext & { payload: IssueCommentEvent } {
  return context.eventName === "issue_comment";
}

export function isPullRequestEvent(
  context: GitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestEvent } {
  return context.eventName === "pull_request";
}

export function isPullRequestReviewEvent(
  context: GitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestReviewEvent } {
  return context.eventName === "pull_request_review";
}

export function isPullRequestReviewCommentEvent(
  context: GitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestReviewCommentEvent } {
  return context.eventName === "pull_request_review_comment";
}

export function isWorkflowRunEvent(
  context: GitHubContext,
): context is AutomationContext & { payload: WorkflowRunEvent } {
  return context.eventName === "workflow_run";
}

export function isIssuesAssignedEvent(
  context: GitHubContext,
): context is ParsedGitHubContext & { payload: IssuesAssignedEvent } {
  return isIssuesEvent(context) && context.eventAction === "assigned";
}

export function isEntityContext(context: GitHubContext): context is ParsedGitHubContext {
  return ENTITY_EVENT_NAMES.includes(context.eventName as EntityEventName);
}

export function isAutomationContext(context: GitHubContext): context is AutomationContext {
  return AUTOMATION_EVENT_NAMES.includes(context.eventName as AutomationEventName);
}
