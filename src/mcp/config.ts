export type McpServerSpec = {
  command: string;
  args: string[];
  env: Record<string, string>;
};

export function tomlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function renderMcpToml(servers: Record<string, McpServerSpec>): string {
  const parts: string[] = [];
  for (const [name, spec] of Object.entries(servers)) {
    parts.push(`[mcp_servers.${name}]`);
    parts.push(`command = ${tomlString(spec.command)}`);
    parts.push(`args = [${spec.args.map(tomlString).join(", ")}]`);
    const envBody = Object.entries(spec.env)
      .map(([key, value]) => `${key} = ${tomlString(value)}`)
      .join(", ");
    parts.push(`env = { ${envBody} }`);
    parts.push("");
  }
  return parts.join("\n");
}

export function bunServerArgs(scriptRel: string, actionPath: string): string[] {
  return ["--no-env-file", `run`, `${actionPath}/${scriptRel}`];
}

export function buildGithubMcpToml(opts: {
  actionPath: string;
  token: string;
  owner: string;
  repo: string;
  commentId?: number;
  eventName: string;
  apiUrl: string;
  isPR: boolean;
  entityNumber?: number;
  headSha?: string;
  includeCi: boolean;
}): string {
  const bun = process.execPath.includes("bun") ? process.execPath : "bun";
  const servers: Record<string, McpServerSpec> = {};

  if (opts.commentId) {
    servers.github_comment = {
      command: bun,
      args: bunServerArgs("src/mcp/github-comment-server.ts", opts.actionPath),
      env: {
        GITHUB_TOKEN: opts.token,
        REPO_OWNER: opts.owner,
        REPO_NAME: opts.repo,
        GITHUB_EVENT_NAME: opts.eventName,
        GITHUB_API_URL: opts.apiUrl,
        GROK_COMMENT_ID: String(opts.commentId),
      },
    };
  }

  if (opts.isPR && opts.entityNumber) {
    servers.github_inline_comment = {
      command: bun,
      args: bunServerArgs("src/mcp/github-inline-comment-server.ts", opts.actionPath),
      env: {
        GITHUB_TOKEN: opts.token,
        REPO_OWNER: opts.owner,
        REPO_NAME: opts.repo,
        PR_NUMBER: String(opts.entityNumber),
        GITHUB_API_URL: opts.apiUrl,
        ...(opts.headSha ? { HEAD_SHA: opts.headSha } : {}),
      },
    };
  }

  if (opts.includeCi && opts.isPR) {
    servers.github_ci = {
      command: bun,
      args: bunServerArgs("src/mcp/github-actions-server.ts", opts.actionPath),
      env: {
        GITHUB_TOKEN: process.env.DEFAULT_WORKFLOW_TOKEN || opts.token,
        REPO_OWNER: opts.owner,
        REPO_NAME: opts.repo,
        PR_NUMBER: String(opts.entityNumber ?? ""),
        GITHUB_API_URL: opts.apiUrl,
        ...(opts.headSha ? { HEAD_SHA: opts.headSha } : {}),
      },
    };
  }

  return renderMcpToml(servers);
}
