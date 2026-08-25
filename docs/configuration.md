# Configuration

## How Grok is invoked

```bash
export XAI_API_KEY="..."
export GROK_HOME="$RUNNER_TEMP/grok-home"
export GROK_DISABLE_AUTOUPDATER=1

grok --prompt-file "$PROMPT_FILE" \
  --cwd "$GITHUB_WORKSPACE" \
  --output-format streaming-json \
  --yolo \
  --no-plan \
  --no-auto-update \
  $GROK_ARGS
```

`GROK_HOME` is isolated under the runner temp directory so MCP config and optional `auth.json` do not touch the runner user profile.

## MCP servers

Before spawn, the action writes `$GROK_HOME/config.toml` with:

| Server                  | Tools                   | When                                                   |
| ----------------------- | ----------------------- | ------------------------------------------------------ |
| `github_comment`        | `update_grok_comment`   | Tag mode, or agent mode with `track_progress`          |
| `github_inline_comment` | `create_inline_comment` | Pull requests                                          |
| `github_ci`             | `get_ci_status`         | Pull requests when the workflow token can read Actions |

These are stdio MCP servers shipped in this repo and started with Bun.

## Trusted config on pull requests

On PR tag-mode runs, `.grok/` and `AGENTS.md` are restored from the **base** branch. The PR copies are moved aside to `.grok-pr` / `AGENTS.md.pr`. Everything else stays at the PR head.

Hooks or MCP servers defined only on the PR head are untrusted; do not rely on them for security.

## Pinning the CLI

`grok_version` defaults to `1.0.5` (`curl -fsSL https://x.ai/cli/install.sh | bash -s -- 1.0.5`). Bump it when you want a newer Grok Build. `path_to_grok_executable` skips install entirely (custom images, Nix, etc.).
