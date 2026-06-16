# Security Policy

## Secrets

Do not commit real API keys, private gateway URLs, uploaded product photos, generated images, or local runtime data.

The project intentionally ignores:

- `.env`
- `.env.*`
- `AI API.rtf`
- `runtime/`
- `node_modules/`

Use `.env.example` for placeholders only.

## Runtime API Configuration

The in-app API configuration panel stores local settings in:

```text
runtime/api-config.json
```

This file is local-only and must not be committed. The browser never receives the real API key from `GET /api/config`.

For public deployment, prefer server-side environment variables or a managed secret store instead of the local runtime config file.

## Data Sent to AI Providers

Uploaded product images, masks, prompts, and generated instructions may be sent to the configured AI provider. Users should choose a trusted provider and avoid uploading sensitive or regulated material unless they have permission to process it.

## Reporting Issues

If you find a security issue, please report it privately to the project maintainer. Do not include real API keys, customer images, or private endpoint details in public issues.
