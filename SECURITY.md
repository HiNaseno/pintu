# Security policy

## Deployment and sessions

The server listens on loopback by default. LAN binding requires a backend access-code hash and an exact `PINTU_ALLOWED_ORIGINS` allowlist. Generate a hash with `npm run access-code`; never store the original code in source, URLs or logs. Use HTTPS and `PINTU_COOKIE_SECURE=true` when the app is accessed through a TLS reverse proxy.

Each browser owns its jobs, uploads and feedback through a persistent HttpOnly, SameSite=Strict cookie. Writes require a matching Origin and `X-Pintu-CSRF`. This shared access code is a small-team access gate, not a multi-user account or enterprise identity system. Removing cookies loses access to that browser's existing resources.

Keep all private media behind Node ownership checks. Do not expose `runtime/` through a static server, Nginx `alias`, public backup or file share. Run the service under a dedicated unprivileged user and restrict runtime and configuration file permissions.

## Credentials and data

Model API keys, CLI login files, encryption keys and session databases stay on the server. The web configuration API is disabled. `.env.example` contains placeholders only; `.env`, runtime data, local CLI directories, databases, archives and dependencies must not be committed. The source-archive builder scans fixed commit blobs without reading deployment secrets, but a pattern scan does not replace a human review of staged changes and new commit history.

Uploads, prompts, extracted document text and masks may be sent to the chosen model provider. Choose a trusted service and process only material you are authorized to use. Feedback screenshots may contain private content; administrators must protect exports and backups.

## Execution recovery

Image actions use a durable local request ledger. A network timeout is not proof of failure. Preserve uncertain executions and reconcile existing result evidence; do not delete the ledger, replay the same action with a new identifier, or fabricate a zero-result completion. Back up the entire runtime directory and its encryption key before maintenance.

## Reporting

Report security issues privately to the repository maintainer using GitHub's private vulnerability reporting when available. Do not include real credentials, uploaded customer material, private task identifiers or full runtime logs in public issues. If a credential has been exposed, revoke or rotate it at its provider.
