import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { filterUserGrokArgs, parseGrokArgs } from "./args";
import { parseStreamLine, reduceStream, type GrokRunResult, type GrokStreamEvent } from "./stream";

export type InvokeGrokOptions = {
  promptFile: string;
  cwd: string;
  grokHome: string;
  extraArgs: string;
  apiKey?: string;
  githubToken?: string;
  showFullOutput: boolean;
  grokBin?: string;
  executionDir?: string;
};

export type InvokeGrokResult = GrokRunResult & {
  exitCode: number;
  executionFile: string;
};

export async function invokeGrok(opts: InvokeGrokOptions): Promise<InvokeGrokResult> {
  const grokBin = opts.grokBin || process.env.PATH_TO_GROK_EXECUTABLE || "grok";
  const userArgs = filterUserGrokArgs(parseGrokArgs(opts.extraArgs));
  const args = [
    "--prompt-file",
    opts.promptFile,
    "--cwd",
    opts.cwd,
    "--output-format",
    "streaming-json",
    "--yolo",
    "--no-plan",
    "--no-auto-update",
    ...userArgs,
  ];

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GROK_HOME: opts.grokHome,
    GROK_DISABLE_AUTOUPDATER: "1",
  };
  if (opts.apiKey) {
    env.XAI_API_KEY = opts.apiKey;
  }
  if (opts.githubToken) {
    env.GITHUB_TOKEN = opts.githubToken;
    env.GH_TOKEN = opts.githubToken;
  }

  const executionDir = opts.executionDir || process.env.RUNNER_TEMP || opts.grokHome;
  mkdirSync(executionDir, { recursive: true });
  const executionFile = join(executionDir, "grok-execution.jsonl");

  const events: GrokStreamEvent[] = [];
  const rawLines: string[] = [];

  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(grokBin, args, {
      cwd: opts.cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdoutBuf = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuf += chunk.toString("utf8");
      const parts = stdoutBuf.split("\n");
      stdoutBuf = parts.pop() ?? "";
      for (const line of parts) {
        rawLines.push(line);
        const event = parseStreamLine(line);
        if (!event) continue;
        events.push(event);
        logEvent(event, opts.showFullOutput);
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8").trim();
      if (text) {
        console.error(text);
      }
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (stdoutBuf.trim()) {
        rawLines.push(stdoutBuf);
        const event = parseStreamLine(stdoutBuf);
        if (event) {
          events.push(event);
          logEvent(event, opts.showFullOutput);
        }
      }
      resolve(code ?? 1);
    });
  });

  mkdirSync(dirname(executionFile), { recursive: true });
  writeFileSync(executionFile, rawLines.join("\n") + (rawLines.length ? "\n" : ""), {
    encoding: "utf8",
  });

  const reduced = reduceStream(events);
  return {
    ...reduced,
    exitCode,
    executionFile,
  };
}

function logEvent(event: GrokStreamEvent, showFullOutput: boolean): void {
  if (showFullOutput) {
    console.log(JSON.stringify(event));
    return;
  }
  if (event.type === "text" && typeof event.data === "string") {
    process.stdout.write(event.data);
  } else if (event.type === "tool_call") {
    const name = typeof event.toolName === "string" ? event.toolName : "tool";
    console.log(`[tool] ${name}`);
  } else if (event.type === "error") {
    console.error(event.message ?? "grok error");
  }
}
