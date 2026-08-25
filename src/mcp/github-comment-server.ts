import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Octokit } from "@octokit/rest";
import { z } from "zod";
import { GITHUB_API_URL } from "../github/api/config";
import { sanitizeContent } from "../github/utils/sanitizer";

const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

if (!REPO_OWNER || !REPO_NAME) {
  console.error("REPO_OWNER and REPO_NAME environment variables are required");
  process.exit(1);
}

const server = new McpServer({
  name: "GitHub Comment Server",
  version: "1.0.0",
});

server.tool(
  "update_grok_comment",
  "Update the Grok Build tracking comment with progress and results",
  {
    body: z.string().describe("The updated comment content"),
  },
  async ({ body }) => {
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      const commentIdRaw = process.env.GROK_COMMENT_ID;
      if (!githubToken) {
        throw new Error("GITHUB_TOKEN environment variable is required");
      }
      if (!commentIdRaw) {
        throw new Error("GROK_COMMENT_ID environment variable is required");
      }

      const octokit = new Octokit({ auth: githubToken, baseUrl: GITHUB_API_URL });
      const result = await octokit.issues.updateComment({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        comment_id: parseInt(commentIdRaw, 10),
        body: `${sanitizeContent(body)}\n\n<!-- grok-build-action -->`,
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
