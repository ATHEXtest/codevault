# CodeVault

Share and run code snippets from a link. Code is stored as **secret GitHub Gists in the user's own account** (bring your own token), so storage is free and users keep ownership. Postgres (Neon) holds only small metadata rows. Execution goes through a pluggable provider (Piston by default, Judge0 optional).

**Stack:** Next.js 15 (App Router) + TypeScript, Tailwind, CodeMirror, Neon Postgres, Vercel.

## How it works

- User pastes a GitHub token (`gist` permission). It is verified with GitHub, encrypted (AES-256-GCM) and stored in an **HttpOnly cookie**. It is never written to the database; Neon keeps only an HMAC of the token to check snippet ownership.
- "Save & Share" creates a secret Gist and a metadata row, then redirects to `/s/{gistId}`.
- Anyone with the link can view and run the snippet (no login). Owners can save new revisions; everyone else can fork. `/s/{gistId}?rev={sha}` pins a gist revision.
- `/api/execute` runs code through the configured provider, rate limited to 5 runs/min per IP.
- A daily Vercel Cron job (`/api/cron/prune`) deletes expired metadata rows.

## Setup

### 1. Neon
Create a project at https://neon.tech and copy the connection string.

### 2. Environment
```bash
cp .env.example .env.local
```
Fill in:

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN_ENCRYPTION_KEY` | Long random string. `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `DATABASE_URL` | Neon connection string |
| `CRON_SECRET` | Random string protecting `/api/cron/prune` |
| `EXECUTION_PROVIDER` | `piston` (default) or `judge0` |
| `PISTON_BASE_URL` | Optional, for a self-hosted Piston |
| `JUDGE0_BASE_URL`, `JUDGE0_API_KEY` | Only for `judge0` (self-hosted, or RapidAPI) |

### 3. Run
```bash
npm install
npm run db:init     # creates the table (also auto-created on first request)
npm run dev
```
Open http://localhost:3000 and check http://localhost:3000/api/health. It should return `{"execution":true,"database":true,...}`.

### 4. GitHub token (for users)
GitHub → Settings → Developer settings → Personal access tokens. A classic token with the `gist` scope works, or a fine-grained token with **Gists: read and write**.

### 5. Deploy
Import the repo into Vercel, add the env vars, deploy. `vercel.json` registers the cron job. Set `CRON_SECRET` so Vercel can authenticate it.

## Execution providers

`lib/execution/` is an adapter layer: `getProvider()` reads `EXECUTION_PROVIDER`. No language IDs or versions are hardcoded. Each adapter fetches the provider's language list (cached 5 min) and resolves the UI language to a runtime at request time, picking the newest match.

> The public Piston instance at emkc.org has had access restrictions at times. If `/api/health` reports `execution: false`, self-host Piston and set `PISTON_BASE_URL`, or switch to `EXECUTION_PROVIDER=judge0`.

## Notes and limits

- Rate limits are in-memory per serverless instance, which is fine at free-tier scale. For strict global limits, swap `lib/ratelimit.ts` for Upstash Redis.
- GitHub allows roughly 10 gist creates per hour per user; the app shows a clear error when hit.
- Snippets are **secret** gists: anyone with the link can read them, but they aren't listed publicly.

## Ideas next

Revision diff view, GitHub OAuth instead of pasted tokens, `/embed/[id]`, OG share images, automatic fallback between providers.
