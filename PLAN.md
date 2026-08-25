# Grok Build GitHub Action

**Goal:** Ship a public GitHub Action that does for [Grok Build](https://github.com/xai-org/grok-build) what [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) does for Claude Code: `@grok` on issues/PRs, plus unattended automations via an explicit `prompt`.

**Workspace:** Implement in this repo. Do not fork or vendor `claude-code-action`. Port the product, not the tree.

---

## Product

A composite GitHub Action that:

1. **Tag mode** — wakes on `@grok` (configurable) in issue/PR comments, review comments, reviews, issue bodies/titles, optional assignee/label.
2. **Agent mode** — runs a caller-supplied `prompt` for automations (PR review, triage, docs, scheduled jobs). Auto-detected: `prompt` present → agent; otherwise tag if the trigger matches.
3. Runs **Grok Build** headlessly on the workflow runner (`grok --prompt-file`), not a raw xAI chat API wrapper.
4. Posts a tracking comment, implements code on a new branch, and leaves a compare-link for the human to open the PR (same default as Claude: no auto-opened PR).

| Surface        | Claude Code Action                            | This action                                                                      |
| -------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| Trigger        | `@claude`                                     | `@grok`                                                                          |
| Agent runtime  | Claude Code CLI + Agent SDK                   | Grok Build CLI (`grok`)                                                          |
| Auth (model)   | Anthropic API / OAuth / cloud providers       | `XAI_API_KEY` (primary), optional `GROK_AUTH_JSON`                               |
| Auth (GitHub)  | Official Claude GitHub App, or `github_token` | `github_token` (default `github.token`); optional custom GitHub App via manifest |
| Modes          | tag / agent, auto-detected                    | same                                                                             |
| Progress       | sticky tracking comment                       | same                                                                             |
| Code changes   | new branch + compare URL                      | same (`grok/` prefix)                                                            |
| GitHub tools   | in-repo MCP servers                           | same idea, Grok `config.toml` MCP                                                |
| Structured out | `--json-schema` → `structured_output`         | `grok_args: --json-schema`                                                       |

---

## Out of v1

- Amazon Bedrock / Google Vertex / Microsoft Foundry
- Anthropic workload-identity federation
- Official xAI GitHub App (ship a custom-app manifest instead)
- Claude Agent SDK, `.claude/` config, `CLAUDE.md`
- `include_fix_links` into a desktop app
- Inline-comment classification via a second model
- `allowed_non_write_users` + bubblewrap isolation
- Plugin marketplace install inputs

---

## Assumptions

1. Runtime is Grok Build CLI, installed on the runner.
2. Default trigger is `@grok`, branch prefix `grok/`.
3. Primary model auth is `XAI_API_KEY`. Optional `grok_auth_json` writes `auth.json`.
4. GitHub identity is `GITHUB_TOKEN` by default.
5. Do not open PRs automatically. Commit to `grok/...` and post a compare URL.
6. English for all repo artifacts.
7. MIT license stays as-is.
8. Linux GitHub-hosted runners first.
9. Pin the Grok CLI version (`curl -fsSL https://x.ai/cli/install.sh | bash -s <version>`).

---

## Architecture

Composite `action.yml` installs Bun + a pinned `grok` binary, then runs `src/entrypoints/run.ts`:

1. Parse GitHub context
2. Write-access + trigger check
3. Detect mode (tag vs agent)
4. Prepare branch + tracking comment + prompt
5. Write `$GROK_HOME` MCP servers
6. `grok --prompt-file --yolo --no-plan --no-auto-update --output-format streaming-json`
7. Parse stream, update comment, set outputs

Always-on CI flags: `--yolo` (no TTY), `--no-plan` (would hang), `--no-auto-update`. Extra flags go through `grok_args`.

---

## Phased delivery

- **Phase 1** — Scaffold (`action.yml`, Bun, TypeScript, CI, README)
- **Phase 2** — GitHub orchestration (context, trigger, permissions, prompt, comments, branch) + unit tests
- **Phase 3** — Grok runner + tag/agent loop (MVP)
- **Phase 4** — MCP servers, examples, docs, GitHub App manifest

---

## Success criteria

- Comment `@grok explain this` → tracking comment + answer
- `prompt:` on `pull_request` → review without an `@grok` mention
- `@grok fix the nil check` on an issue → `grok/issue-N-…` branch + compare link, no auto-opened PR
- No write permission → skip, do not run Grok
- `bun test` and `bun run typecheck` pass
