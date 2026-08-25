# Usage

## Tag mode (`@grok`)

Use [examples/grok.yml](../examples/grok.yml). The workflow `if:` already filters for `@grok` so idle comments do not start runners.

Then on an issue or PR:

```
@grok Why is parseConfig returning nil here?
@grok Add a regression test for the empty-input case
```

The action:

1. Checks that the actor has write access
2. Posts a tracking comment
3. Creates a `grok/issue-N-…` or `grok/pr-N-…` branch
4. Runs Grok Build headlessly
5. Pushes commits if Grok made any
6. Updates the tracking comment with the answer and a compare link

It does **not** open the pull request. Click the compare link if you want one.

## Agent mode (`prompt`)

Use [examples/grok-pr-review.yml](../examples/grok-pr-review.yml) or [examples/grok-issue-triage.yml](../examples/grok-issue-triage.yml).

```yaml
- uses: sandsaber/grok-build-action@main
  with:
    xai_api_key: ${{ secrets.XAI_API_KEY }}
    prompt: |
      Review this pull request for bugs, security issues, and missing tests.
      Post findings with inline comments where a file:line is known.
```

## CLI flags

Pass extra Grok flags with `grok_args`. The action owns `--yolo`, `--no-plan`, `--no-auto-update`, `--output-format`, `--prompt-file`, and `--cwd`.

```yaml
grok_args: |
  --model grok-build
  --max-turns 20
  --effort high
```

Structured output (then read `steps.grok.outputs.structured_output`):

```yaml
grok_args: >
  --json-schema '{"type":"object","properties":{"ok":{"type":"boolean"}},"required":["ok"]}'
```

## Resume a session

`session_id` is an action output. A later step can pass `grok_args: --resume ${{ steps.grok.outputs.session_id }}` — only useful in the same job, because session files live on that runner under `GROK_HOME`.
