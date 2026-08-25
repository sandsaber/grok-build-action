import { GITHUB_SERVER_URL } from "../github/api/config";
import type { FetchedGitHubData } from "../github/data/fetcher";
import {
  formatChangedFiles,
  formatComments,
  formatEntityHeader,
  formatPatches,
} from "../github/data/formatter";
import { sanitizeContent } from "../github/utils/sanitizer";
import type { GitHubContext, ParsedGitHubContext } from "../github/context";
import { isEntityContext } from "../github/context";

export type PromptOptions = {
  context: GitHubContext;
  data?: FetchedGitHubData;
  branchName?: string;
  compareUrl?: string;
  hasCommentTool: boolean;
};

function sharedInstructions(opts: PromptOptions): string {
  const lines = [
    "You are Grok Build running inside GitHub Actions on the repository checkout.",
    "",
    "Rules:",
    "- Do not print secrets, tokens, or environment variables.",
    "- Do not mention @grok in comments you create (that retriggers the action).",
    "- Do not force-push, do not merge, and do not open a pull request.",
    "- If you change files, commit on the current git branch.",
  ];
  if (opts.branchName) {
    lines.push(`- Current working branch: ${opts.branchName}`);
  }
  if (opts.compareUrl) {
    lines.push(
      `- After commits, include this compare URL so a human can open the PR: ${opts.compareUrl}`,
    );
  }
  if (opts.hasCommentTool) {
    lines.push(
      "- The tracking comment is your reply to the user. Call update_grok_comment with the answer itself (markdown). Do not mention @grok. The action adds the Grok icon; you can omit it.",
    );
  }
  if (isEntityContext(opts.context) && opts.context.isPR) {
    lines.push(
      "- For review findings on a pull request, use create_inline_comment when a specific file:line is involved.",
    );
  }
  return lines.join("\n");
}

export function buildTagPrompt(opts: PromptOptions & { context: ParsedGitHubContext }): string {
  const data = opts.data;
  if (!data) {
    throw new Error("tag mode requires fetched GitHub data");
  }
  const { context } = opts;
  const entityKind = context.isPR ? "pull request" : "issue";
  const entityUrl = `${GITHUB_SERVER_URL}/${context.repository.full_name}/${context.isPR ? "pull" : "issues"}/${context.entityNumber}`;

  return [
    sharedInstructions(opts),
    "",
    `Repository: ${context.repository.full_name}`,
    `Event: ${context.eventName}`,
    `Actor: ${context.actor}`,
    `${entityKind} : ${entityUrl}`,
    "",
    "## GitHub context",
    formatEntityHeader(data.entity),
    "",
    "## Body",
    sanitizeContent(data.entity.body) || "(empty)",
    "",
    "## Comments",
    formatComments(data.comments),
    "",
    "## Review comments",
    formatComments(data.reviewComments),
    "",
    "## Changed files",
    formatChangedFiles(data.files),
    "",
    "## Patches",
    formatPatches(data.files),
    "",
    "## Triggering text",
    sanitizeContent(data.triggeringBody) || "(empty)",
    "",
    "## Your task",
    `A user invoked ${context.inputs.triggerPhrase}. Read the triggering text, do what they asked, and follow the rules above.`,
  ].join("\n");
}

export function buildAgentPrompt(opts: PromptOptions): string {
  const { context } = opts;
  const header = [
    sharedInstructions(opts),
    "",
    `Repository: ${context.repository.full_name}`,
    `Event: ${context.eventName}`,
    `Actor: ${context.actor}`,
  ];

  if (isEntityContext(context)) {
    header.push(`Entity: ${context.isPR ? "pull request" : "issue"} #${context.entityNumber}`);
  }

  const sections = [...header, "", "## Task", context.inputs.prompt];

  if (opts.data) {
    sections.push(
      "",
      "## GitHub context",
      formatEntityHeader(opts.data.entity),
      "",
      "## Body",
      sanitizeContent(opts.data.entity.body) || "(empty)",
      "",
      "## Changed files",
      formatChangedFiles(opts.data.files),
      "",
      "## Patches",
      formatPatches(opts.data.files),
    );
  }

  return sections.join("\n");
}
