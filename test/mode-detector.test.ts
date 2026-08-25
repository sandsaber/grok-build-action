import { describe, expect, test } from "bun:test";
import { detectMode } from "../src/modes/detector";
import { defaultInputs, issueCommentContext, pullRequestContext } from "./helpers";

describe("detectMode", () => {
  test("comment with @grok uses tag mode", () => {
    const context = issueCommentContext("@grok explain this");
    expect(detectMode(context)).toBe("tag");
  });

  test("comment with prompt uses agent mode", () => {
    const context = issueCommentContext("hello", {
      inputs: defaultInputs({ prompt: "Label this issue" }),
    });
    expect(detectMode(context)).toBe("agent");
  });

  test("pull_request opened with prompt uses agent mode", () => {
    const context = pullRequestContext({ prompt: "Review this PR" });
    expect(detectMode(context)).toBe("agent");
  });

  test("pull_request opened without prompt uses agent (no-op without prompt)", () => {
    const context = pullRequestContext();
    expect(detectMode(context)).toBe("agent");
  });

  test("track_progress on pull_request forces tag mode", () => {
    const context = pullRequestContext();
    context.inputs.trackProgress = true;
    expect(detectMode(context)).toBe("tag");
  });
});
