# Contributing

Thanks for helping improve 品图 AI.

## Local Setup

```bash
npm install
cp .env.example .env
npm start
```

Open:

```text
http://localhost:5176/china-full.html
```

## Development Checks

Before opening a pull request, run:

```bash
node --check server.js
node --check china-full.js
node --check china-workflow.js
npm test
git diff --check
```

## Guidelines

- Keep real API keys out of code, docs, screenshots, and tests.
- Do not commit `runtime/`, `node_modules/`, uploaded images, or generated images.
- Preserve the product rule that the real product subject should not be changed during generation or refinement.
- Prefer small, reviewable changes.
- Keep UI copy concise and user-facing.

## Pull Request Checklist

- The app starts locally.
- Existing interactions still work.
- API errors show actionable messages.
- Mobile and desktop layouts do not overflow.
- No secrets or local generated files are included.
