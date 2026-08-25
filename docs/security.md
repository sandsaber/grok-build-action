# Security

## Access control

- Only actors with **write** or **admin** on the repository can run Grok.
- **Bots are denied by default.** List logins in `allowed_bots`, or use `*` (dangerous on a public repository: any GitHub App can comment `@grok` and spend your API key).
- `workflow_dispatch` / `schedule` skip the collaborator check; GitHub already requires write to dispatch, and schedules have no external actor.

## Prompt injection

Issue bodies, comments, and review text are untrusted. The action strips HTML comments, zero-width characters, and markdown image alt text before they go into the prompt. That is not a complete defense. Review `@grok` requests from people you do not trust.

## `pull_request_target` and `workflow_run`

These events run with the **base** repository's secrets. Do **not** check out the PR head into `$GITHUB_WORKSPACE` before this action.

```yaml
- uses: actions/checkout@v5 # default = base ref
- uses: sandsaber/grok-build-action@main
```

If you need the PR files, check them out into a subdirectory, not the workspace root.

## Logs

`show_full_output` is off by default. Enabling it prints tool results to the Actions log, which is public on public repositories and may contain secrets.

Never echo `xai_api_key`, `grok_auth_json`, or tokens.

## Pull requests

The action does not open PRs. It pushes a `grok/` branch and posts a compare URL. A human creates the PR.

On PR runs, `.grok/` and `AGENTS.md` are taken from the base branch so a contributor cannot swap your project instructions for the duration of the job.
