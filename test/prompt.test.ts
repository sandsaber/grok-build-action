import { describe, expect, test } from "bun:test";
import { buildAgentPrompt, buildTagPrompt } from "../src/create-prompt";
import { issueCommentContext } from "./helpers";

describe("prompt construction", () => {
  test("tag prompt includes sanitized body, branch, and compare URL", () => {
    const context = issueCommentContext("@grok fix it");
    const prompt = buildTagPrompt({
      context,
      branchName: "grok/issue-12-test",
      compareUrl: "https://github.com/acme/demo/compare/main...grok/issue-12-test",
      hasCommentTool: true,
      data: {
        entity: {
          title: "Bug",
          author: "alice",
          body: "visible<!-- hidden instruction -->text",
          labels: ["bug"],
          isPR: false,
          state: "open",
        },
        comments: [],
        reviewComments: [],
        files: [],
        triggeringBody: "@grok fix it",
      },
    });
    expect(prompt).toContain("grok/issue-12-test");
    expect(prompt).toContain("update_grok_comment");
    expect(prompt).toContain("visibletext");
    expect(prompt).not.toContain("hidden instruction");
    expect(prompt).toContain("do not open a pull request");
  });

  test("agent prompt puts the caller prompt in the task section", () => {
    const context = issueCommentContext("no mention", {
      inputs: {
        ...issueCommentContext("x").inputs,
        prompt: "Triage this issue",
      },
    });
    const prompt = buildAgentPrompt({
      context,
      hasCommentTool: false,
    });
    expect(prompt).toContain("## Task");
    expect(prompt).toContain("Triage this issue");
  });
});
