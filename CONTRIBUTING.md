# Contributing

Use Node.js 22.19 or newer. CI uses Node.js 22.23.3.

```bash
npm ci
cp .env.example .env
npm run dev
```

Model access is configured only on the server. Automated tests use isolated temporary runtimes and simulated executors; do not point tests at a live runtime or use real model credentials. Real model acceptance must be explicitly recorded separately from simulation results.

Before submitting:

```bash
npm test
npm run test:release
node --check server.js
node --check china-full.js
node --check china-workflow.js
git diff --check
```

Keep UI copy concise. Preserve confirmed product facts and references; material samples must not be presented as certified evidence of the real product. Cover ownership, duplicate dispatch and recovery behavior when changing execution paths. Do not add automatic retries to an image call whose remote outcome may be unknown.

Commit reviewed source, public demo assets and templates only. Exclude `.env`, CLI login files, runtime, feedback exports, dependency folders and generated release archives. Changes to security interfaces must update `docs/API.md` and the OpenAPI schema. Keep release notes consistent with tests actually run.

The release builder requires a clean reviewed commit. Run `python3 scripts/prepare-release.py --commit HEAD --dry-run` after committing; it does not publish or push anything.
