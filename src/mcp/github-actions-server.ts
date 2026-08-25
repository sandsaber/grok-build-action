import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Octokit } from "@octokit/rest";
import { z } from "zod";
import { GITHUB_API_URL } from "../github/api/config";

const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

if (!REPO_OWNER || !REPO_NAME) {
  console.error("REPO_OWNER and REPO_NAME environment variables are required");
  process.exit(1);
}

const server = new McpServer({
  name: "GitHub Actions Server",
  version: "1.0.0",
});

server.tool(
  "get_ci_status",
  "List recent GitHub Actions workflow runs for this pull request head SHA",
  {
    per_page: z.number().optional().describe("Number of runs to return (default 10)"),
  },
  async ({ per_page }) => {
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        throw new Error("GITHUB_TOKEN environment variable is required");
      }
      const octokit = new Octokit({ auth: githubToken, baseUrl: GITHUB_API_URL });
      const headSha = process.env.HEAD_SHA;
      const { data } = await octokit.actions.listWorkflowRunsForRepo({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        per_page: per_page ?? 10,
        ...(headSha ? { head_sha: headSha } : {}),
      });
      const runs = data.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        html_url: run.html_url,
        head_sha: run.head_sha,
      }));
      return {
        content: [{ type: "text" as const, text: JSON.stringify(runs, null, 2) }],
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
