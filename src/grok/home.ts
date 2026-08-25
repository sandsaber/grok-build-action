import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type GrokHomeSetup = {
  grokHome: string;
};

export function setupGrokHome(opts: {
  grokHome: string;
  authJson?: string;
  mcpToml?: string;
}): GrokHomeSetup {
  mkdirSync(opts.grokHome, { recursive: true });

  if (opts.mcpToml) {
    writeFileSync(join(opts.grokHome, "config.toml"), opts.mcpToml, {
      encoding: "utf8",
      mode: 0o600,
    });
  }

  if (opts.authJson && opts.authJson.trim()) {
    const authPath = join(opts.grokHome, "auth.json");
    writeFileSync(authPath, opts.authJson, { encoding: "utf8", mode: 0o600 });
    chmodSync(authPath, 0o600);
  }

  return { grokHome: opts.grokHome };
}
