# Grok Build Action

A GitHub Action that runs [Grok Build](https://github.com/xai-org/grok-build) on issues and pull requests.

Mention `@grok` to ask questions or implement changes, or pass a `prompt` for unattended automations (PR review, issue triage, scheduled jobs). Same product shape as [Claude Code Action](https://github.com/anthropics/claude-code-action), for Grok only.

The agent runs on **your** GitHub-hosted runner via the `grok` CLI. Model calls go to xAI with your key.

## Quick start

1. Add `XAI_API_KEY` as a repository secret ([console.x.ai](https://console.x.ai)).
2. Copy [`examples/grok.yml`](examples/grok.yml) to `.github/workflows/grok.yml`.

```yaml
- uses: sandsaber/grok-build-action@main
  with:
    xai_api_key: ${{ secrets.XAI_API_KEY }}
```

Pin a commit SHA in production instead of `@main`.

Comment on an issue or PR:

```
@grok what does this function do?
@grok add a null check around the parser
```

Full install: [docs/setup.md](docs/setup.md).

## Modes

The action picks a mode from the workflow context. You do not set `mode`.

| Mode      | When                                                                          | What happens                                                                                               |
| --------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Tag**   | `@grok` in a comment, review, issue/PR body, or the configured label/assignee | Tracking comment, new `grok/` branch, Grok implements or answers. No PR is opened; you get a compare link. |
| **Agent** | `prompt` is set (PR review, `schedule`, `workflow_dispatch`, …)               | Grok runs that prompt against the checkout.                                                                |

## Examples

| Workflow                  | File                                                               |
| ------------------------- | ------------------------------------------------------------------ |
| `@grok` on issues and PRs | [`examples/grok.yml`](examples/grok.yml)                           |
| Automatic PR review       | [`examples/grok-pr-review.yml`](examples/grok-pr-review.yml)       |
| New-issue triage          | [`examples/grok-issue-triage.yml`](examples/grok-issue-triage.yml) |

## Authentication

**Grok Build** (one of):

- `xai_api_key` — API key from console.x.ai (recommended for CI)
- `grok_auth_json` — contents of `~/.grok/auth.json` from an existing `grok login`

**GitHub** defaults to `github.token`. Commits and comments come from `github-actions[bot]`. For a named bot, create a GitHub App from [`github-app-manifest.json`](github-app-manifest.json) and pass its installation token as `github_token`.

## Inputs

| Input                     | Default               | Description                                                                |
| ------------------------- | --------------------- | -------------------------------------------------------------------------- |
| `xai_api_key`             |                       | xAI API key                                                                |
| `grok_auth_json`          |                       | Optional SuperGrok `auth.json`                                             |
| `github_token`            | workflow token        | GitHub token                                                               |
| `prompt`                  |                       | Agent-mode instructions                                                    |
| `trigger_phrase`          | `@grok`               | Tag-mode mention                                                           |
| `assignee_trigger`        |                       | Issue assignee that triggers a run                                         |
| `label_trigger`           | `grok`                | Issue label that triggers a run                                            |
| `grok_args`               |                       | Extra CLI flags (`--model`, `--max-turns`, `--effort`, `--json-schema`, …) |
| `base_branch`             | repo default          | Base for new branches                                                      |
| `branch_prefix`           | `grok/`               | Branch prefix                                                              |
| `track_progress`          | `false`               | Force a tracking comment                                                   |
| `use_sticky_comment`      | `false`               | Reuse one tracking comment                                                 |
| `allowed_bots`            | empty                 | Bot logins allowed to trigger; `*` allows all (risky on public repos)      |
| `path_to_grok_executable` |                       | Skip CLI install                                                           |
| `grok_version`            | `1.0.5`               | Pinned Grok Build CLI version                                              |
| `show_full_output`        | `false`               | Log full streaming-json (can leak secrets)                                 |
| `bot_name` / `bot_id`     | `github-actions[bot]` | git commit identity                                                        |

The action always passes `--yolo --no-plan --no-auto-update --output-format streaming-json` so Grok does not hang waiting for TTY approval.

## Outputs

| Output              | Description                                       |
| ------------------- | ------------------------------------------------- |
| `conclusion`        | `success`, `failure`, or `skipped`                |
| `execution_file`    | Path to the captured streaming-json log           |
| `branch_name`       | Branch created or used for this run               |
| `session_id`        | Grok session id (same-job `--resume` only)        |
| `structured_output` | JSON from `grok_args: --json-schema` when present |

## Security

Only users with **write** access can trigger the action. Bots are denied unless listed in `allowed_bots`. Issue/PR bodies are sanitized (HTML comments, zero-width characters, image alt text). Do not check out an untrusted PR head at the workspace root on `pull_request_target`.

See [docs/security.md](docs/security.md).

## Documentation

- [Setup](docs/setup.md) — secrets, permissions, custom GitHub App
- [Usage](docs/usage.md) — tag mode, agent mode, CLI flags
- [Configuration](docs/configuration.md) — how `grok` is invoked, MCP, pinning
- [Security](docs/security.md) — access control, prompt injection, `pull_request_target`
- [v1 plan](PLAN.md)

Linux GitHub-hosted runners (`ubuntu-latest`) only.

## License

[MIT No Attribution (MIT-0)](LICENSE). Use, copy, modify, and redistribute without attribution.
