import { describe, expect, test } from "bun:test";
import { filterUserGrokArgs, parseGrokArgs } from "../src/grok/args";
import { buildBranchName } from "../src/github/operations/branch";
import { buildGithubMcpToml, renderMcpToml, tomlString } from "../src/mcp/config";

describe("grok_args", () => {
  test("keeps model and max-turns, drops action-managed flags", () => {
    const parsed = parseGrokArgs(
      "--model grok-build --max-turns 12 --yolo --output-format json --cwd /tmp",
    );
    const filtered = filterUserGrokArgs(parsed);
    expect(filtered).toEqual(["--model", "grok-build", "--max-turns", "12"]);
  });
});

describe("branch names", () => {
  test("uses grok/ prefix, entity type, number, and UTC timestamp", () => {
    const name = buildBranchName({
      prefix: "grok/",
      isPR: false,
      entityNumber: 42,
      now: new Date("2026-08-25T12:30:00.000Z"),
    });
    expect(name).toBe("grok/issue-42-20260825t123000z");
  });
});

describe("mcp toml", () => {
  test("escapes quotes in env values", () => {
    expect(tomlString('abc"def')).toBe('"abc\\"def"');
    const rendered = renderMcpToml({
      github_comment: {
        command: "bun",
        args: ["run", "server.ts"],
        env: { GITHUB_TOKEN: "ghs_abc" },
      },
    });
    expect(rendered).toContain("[mcp_servers.github_comment]");
    expect(rendered).toContain('GITHUB_TOKEN = "ghs_abc"');
  });

  test("omits the comment server when there is no tracking comment", () => {
    const rendered = buildGithubMcpToml({
      actionPath: "/action",
      token: "ghs_abc",
      owner: "acme",
      repo: "demo",
      eventName: "workflow_dispatch",
      apiUrl: "https://api.github.com",
      isPR: false,
      includeCi: false,
    });
    expect(rendered).not.toContain("github_comment");
  });

  test("includes the comment server when a tracking comment id is set", () => {
    const rendered = buildGithubMcpToml({
      actionPath: "/action",
      token: "ghs_abc",
      owner: "acme",
      repo: "demo",
      commentId: 99,
      eventName: "issue_comment",
      apiUrl: "https://api.github.com",
      isPR: false,
      includeCi: false,
    });
    expect(rendered).toContain("[mcp_servers.github_comment]");
    expect(rendered).toContain('GROK_COMMENT_ID = "99"');
  });
});
