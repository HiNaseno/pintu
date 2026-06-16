# Open Source Checklist

Use this checklist before publishing the repository.

## Already Prepared

- `.env`, `.env.*`, `AI API.rtf`, `runtime/`, `node_modules/`, build output and zip files are ignored.
- Public API docs explain that real keys stay on the server.
- Runtime API configuration is stored under ignored `runtime/api-config.json`.
- README, LICENSE, SECURITY and CONTRIBUTING files are present.

## Before Publishing

- Run `git status --short` and confirm no secrets or generated images are staged.
- Run `git grep -n "sk-" -- .` and inspect any matches.
- Search for any private gateway domain and confirm it is not published.
- Rotate any API key that was ever pasted into a public place.
- Decide whether to keep the MIT license or replace it with another license.
- Update repository URL, contact method and product screenshots if needed.

## Recommended Commands

```bash
npm test
node --check server.js
node --check china-full.js
node --check china-workflow.js
git diff --check
git status --short
```
