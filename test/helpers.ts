import type { ActionInputs, ParsedGitHubContext } from "../src/github/context";

export function defaultInputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    prompt: "",
    triggerPhrase: "@grok",
    assigneeTrigger: "",
    labelTrigger: "grok",
    branchPrefix: "grok/",
    useStickyComment: false,
    trackProgress: false,
    allowedBots: "",
    botId: "41898282",
    botName: "github-actions[bot]",
    ...overrides,
  };
}

export function issueCommentContext(
  body: string,
  overrides: Partial<ParsedGitHubContext> = {},
): ParsedGitHubContext {
  return {
    runId: "1",
    eventAction: "created",
    eventName: "issue_comment",
    actor: "alice",
    entityNumber: 12,
    isPR: false,
    repository: {
      owner: "acme",
      repo: "demo",
      full_name: "acme/demo",
      default_branch: "main",
    },
    inputs: defaultInputs(),
    payload: {
      action: "created",
      comment: { body },
      issue: { number: 12, title: "Bug", body: "details", pull_request: undefined },
    } as ParsedGitHubContext["payload"],
    ...overrides,
  };
}

export function pullRequestContext(
  opts: { title?: string; body?: string; action?: string; prompt?: string } = {},
): ParsedGitHubContext {
  return {
    runId: "1",
    eventAction: opts.action ?? "opened",
    eventName: "pull_request",
    actor: "alice",
    entityNumber: 7,
    isPR: true,
    repository: {
      owner: "acme",
      repo: "demo",
      full_name: "acme/demo",
      default_branch: "main",
    },
    inputs: defaultInputs({ prompt: opts.prompt ?? "" }),
    payload: {
      action: opts.action ?? "opened",
      pull_request: {
        number: 7,
        title: opts.title ?? "Add feature",
        body: opts.body ?? "description",
        head: { ref: "feat", sha: "abc" },
        base: { ref: "main" },
      },
    } as ParsedGitHubContext["payload"],
  };
}
