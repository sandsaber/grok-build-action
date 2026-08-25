# Setup

## Requirements

- A repository admin (to add secrets and workflows)
- An xAI API key from [console.x.ai](https://console.x.ai), **or** a Grok Build `auth.json` from `grok login`
- Linux GitHub-hosted runners (`ubuntu-latest`)

## 1. Add secrets

Repository **Settings → Secrets and variables → Actions**:

| Secret        | Value               |
| ------------- | ------------------- |
| `XAI_API_KEY` | API key (`xai-...`) |

Never put the key in the workflow file.

## 2. Add a workflow

Copy [examples/grok.yml](../examples/grok.yml) to `.github/workflows/grok.yml`.

Pin the action to a commit SHA once you depend on it in production:

```yaml
- uses: sandsaber/grok-build-action@<sha>
```

## 3. Permissions

The job needs:

```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
  actions: read # optional; lets Grok read CI status
```

`id-token: write` is **not** required. This action does not mint a GitHub App token via OIDC.

## Custom GitHub App (optional)

Default commits come from `github-actions[bot]`. To post as a named app:

1. Create an app from [github-app-manifest.json](../github-app-manifest.json) (GitHub **Create from manifest**).
2. Install it on the repository.
3. Generate an installation token in the workflow (`actions/create-github-app-token`) and pass it as `github_token`.

## SuperGrok session instead of an API key

On a machine where `grok login` works:

```bash
cat ~/.grok/auth.json
```

Store that JSON as secret `GROK_AUTH_JSON` and pass `grok_auth_json: ${{ secrets.GROK_AUTH_JSON }}`. Prefer an API key when you can: session files expire.

## License

This project is [MIT-0](../LICENSE).
