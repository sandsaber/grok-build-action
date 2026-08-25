import { describe, expect, test } from "bun:test";
import {
  GROK_ICON_URL,
  grokLead,
  TRACKING_MARKER,
  withGrokChrome,
} from "../src/github/comment-chrome";
import { initialTrackingBody } from "../src/github/operations/comments";
import { issueCommentContext } from "./helpers";

describe("Grok comment chrome", () => {
  test("lead line includes the icon and title", () => {
    const line = grokLead("**Grok Build** finished.");
    expect(line).toContain(GROK_ICON_URL);
    expect(line).toContain('width="18"');
    expect(line).toContain("**Grok Build** finished.");
  });

  test("wraps a plain update with the icon and tracking marker", () => {
    const body = withGrokChrome("Fixed the nil check.");
    expect(body.startsWith("<img src=")).toBe(true);
    expect(body).toContain("Fixed the nil check.");
    expect(body).toContain(TRACKING_MARKER);
  });

  test("does not duplicate the icon if grok already included it", () => {
    const once = withGrokChrome("hello");
    const twice = withGrokChrome(once);
    expect(twice.split(GROK_ICON_URL).length - 1).toBe(1);
  });

  test("initial tracking comment shows the icon", () => {
    const body = initialTrackingBody(issueCommentContext("@grok hi"));
    expect(body).toContain(GROK_ICON_URL);
    expect(body).toContain("is working on this");
  });
});
