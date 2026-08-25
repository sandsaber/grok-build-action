import { describe, expect, test } from "bun:test";
import { checkContainsTrigger } from "../src/github/validation/trigger";
import { defaultInputs, issueCommentContext, pullRequestContext } from "./helpers";

describe("checkContainsTrigger", () => {
  test("matches @grok as a standalone mention", () => {
    const context = issueCommentContext("Hey @grok please look at this");
    expect(checkContainsTrigger(context)).toBe(true);
  });

  test("matches @grok followed by punctuation", () => {
    const context = issueCommentContext("@grok, fix the nil check");
    expect(checkContainsTrigger(context)).toBe(true);
  });

  test("does not match a substring like agrok or email@grok.com", () => {
    expect(checkContainsTrigger(issueCommentContext("agrok should not fire"))).toBe(false);
    expect(checkContainsTrigger(issueCommentContext("email@grok.com hi"))).toBe(false);
  });

  test("returns true when prompt is set even without a mention", () => {
    const context = issueCommentContext("no mention here", {
      inputs: defaultInputs({ prompt: "Review this" }),
    });
    expect(checkContainsTrigger(context)).toBe(true);
  });

  test("matches @grok in a newly opened pull request body", () => {
    const context = pullRequestContext({ body: "Please @grok review" });
    expect(checkContainsTrigger(context)).toBe(true);
  });
});
