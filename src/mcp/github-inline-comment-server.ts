import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Octokit } from "@octokit/rest";
import { z } from "zod";
import { GITHUB_API_URL } from "../github/api/config";
import { sanitizeContent } from "../github/utils/sanitizer";

const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;
const PR_NUMBER = process.env.PR_NUMBER;

if (!REPO_OWNER || !REPO_NAME || !PR_NUMBER) {
  console.error("REPO_OWNER, REPO_NAME, and PR_NUMBER are required");
  process.exit(1);
}

const server = new McpServer({
  name: "GitHub Inline Comment Server",
  version: "1.0.0",
});

server.tool(
  "create_inline_comment",
  "Create an inline review comment on the pull request diff",
  {
    path: z.string().describe("File path in the pull request"),
    line: z.number().describe("Line number in the diff (right side by default)"),
    body: z.string().describe("Comment body"),
    side: z.enum(["LEFT", "RIGHT"]).optional().describe("Diff side"),
  },
  async ({ path, line, body, side }) => {
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        throw new Error("GITHUB_TOKEN environment variable is required");
      }
      const octokit = new Octokit({ auth: githubToken, baseUrl: GITHUB_API_URL });
      const pullNumber = parseInt(PR_NUMBER, 10);
      let commitId = process.env.HEAD_SHA;
      if (!commitId) {
        const { data: pr } = await octokit.pulls.get({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          pull_number: pullNumber,
        });
        commitId = pr.head.sha;
      }

      const result = await octokit.pulls.createReviewComment({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: pullNumber,
        commit_id: commitId,
        path,
        line,
        side: side ?? "RIGHT",
        body: sanitizeContent(body),
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ id: result.data.id }) }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  },
);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
