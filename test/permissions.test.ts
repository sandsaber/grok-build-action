import { describe, expect, test } from "bun:test";
import {
  checkWritePermissions,
  isAllowedBot,
  isBotActor,
} from "../src/github/validation/permissions";
import { issueCommentContext } from "./helpers";

describe("bot policy", () => {
  test("treats [bot] logins as bots", () => {
    expect(isBotActor("dependabot[bot]")).toBe(true);
    expect(isBotActor("alice")).toBe(false);
  });

  test("denies bots by default", () => {
    expect(isAllowedBot("dependabot[bot]", "")).toBe(false);
  });

  test("allows an explicit bot login", () => {
    expect(isAllowedBot("dependabot[bot]", "dependabot[bot],renovate[bot]")).toBe(true);
  });

  test("allows all bots when allowed_bots is *", () => {
    expect(isAllowedBot("whatever[bot]", "*")).toBe(true);
  });
});

describe("checkWritePermissions", () => {
  test("skips bots that are not allowlisted without calling GitHub", async () => {
    const context = issueCommentContext("@grok hi");
    context.actor = "dependabot[bot]";
    const octokit = {
      repos: {
        getCollaboratorPermissionLevel: async () => {
          throw new Error("should not be called for bots");
        },
      },
    };
    const allowed = await checkWritePermissions(octokit as never, context);
    expect(allowed).toBe(false);
  });

  test("allows humans with write access", async () => {
    const context = issueCommentContext("@grok hi");
    const octokit = {
      repos: {
        getCollaboratorPermissionLevel: async () => ({
          data: { permission: "write" },
        }),
      },
    };
    const allowed = await checkWritePermissions(octokit as never, context);
    expect(allowed).toBe(true);
  });

  test("denies humans with read access", async () => {
    const context = issueCommentContext("@grok hi");
    const octokit = {
      repos: {
        getCollaboratorPermissionLevel: async () => ({
          data: { permission: "read" },
        }),
      },
    };
    const allowed = await checkWritePermissions(octokit as never, context);
    expect(allowed).toBe(false);
  });
});
