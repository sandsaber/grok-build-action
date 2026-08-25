# grok-build-action

GitHub Action that runs Grok Build (`grok` CLI) on issues and pull requests.

- Runtime is Bun + TypeScript. Tests: `bun test`. Types: `bun run typecheck`.
- Do not fork or vendor `anthropics/claude-code-action`. Port product behavior only.
- Action-managed grok flags: `--yolo --no-plan --no-auto-update --output-format streaming-json --prompt-file --cwd`. Extra flags go through `grok_args`.
- Bots cannot trigger the action unless `allowed_bots` says so.
- Do not commit secrets. Do not log `XAI_API_KEY` or `GROK_AUTH_JSON`.
