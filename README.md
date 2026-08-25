# Grok Build Action

A GitHub Action that runs [Grok Build](https://github.com/xai-org/grok-build) on issues and pull requests. It is the Grok equivalent of [Claude Code Action](https://github.com/anthropics/claude-code-action): mention `@grok` to ask questions or implement changes, or pass a `prompt` for unattended automations (review, triage, scheduled jobs).

The agent runs on **your** GitHub-hosted runner via the `grok` CLI. Model calls go to xAI with your `XAI_API_KEY`.

## Quick start

1. Add `XAI_API_KEY` as a repository secret ([console.x.ai](https://console.x.ai)).
2. Copy [`examples/grok.yml`](examples/grok.yml) to `.github/workflows/grok.yml`.

```yaml
- uses: sandsaber/grok-build-action@main
  with:
    xai_api_key: ${{ secrets.XAI_API_KEY }}
```

Comment on an issue or PR:

```
@grok what does this function do?
@grok add a null check around the parser
```

## Modes

The action picks a mode from the workflow context. You do not set `mode`.

| Mode      | When                                                                          | What happens                                                                                               |
| --------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Tag**   | `@grok` in a comment, review, issue/PR body, or the configured label/assignee | Tracking comment, new `grok/` branch, Grok implements or answers. No PR is opened; you get a compare link. |
| **Agent** | `prompt` is set (PR review, `schedule`, `workflow_dispatch`, …)               | Grok runs that prompt against the checkout.                                                                |

## Authentication

**Grok Build** (one of):

- `xai_api_key` — API key from console.x.ai (recommended for CI)
- `grok_auth_json` — contents of `~/.grok/auth.json` from an existing `grok login`

**GitHub** — defaults to `github.token`. For a named bot identity, create a GitHub App from [`github-app-manifest.json`](github-app-manifest.json) and pass its installation token as `github_token`.

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

`conclusion`, `execution_file`, `branch_name`, `session_id`, `structured_output`.

## Security

Only users with **write** access can trigger the action. Bots are denied unless listed in `allowed_bots`. Issue/PR bodies are sanitized (HTML comments, zero-width characters, image alt text). Do not check out an untrusted PR head at the workspace root on `pull_request_target`. See [docs/security.md](docs/security.md).

## Docs

- [Setup](docs/setup.md)
- [Usage](docs/usage.md)
- [Configuration](docs/configuration.md)
- [Security](docs/security.md)
- [v1 plan](PLAN.md)

## License

MIT
