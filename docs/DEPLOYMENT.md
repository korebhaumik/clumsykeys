# Deployment: Vercel and Northflank

Last reviewed against the code and build configuration: **14 November 2026**.
See [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for actual check results and unverified
hosting/database settings. No production deployment is performed by this guide.

Northflank deployment is temporarily disabled with `if: ${{ false }}` on the deploy job in `.github/workflows/deploy-northflank.yml`. Automatic and manual runs skip deployment. Docker Hub builds and pushes remain active. To re-enable deployment, restore the original condition preserved in the workflow comment. The deployment steps below describe behavior after re-enabling it.

The backend uses a two-workflow pipeline:

1. A backend-related push to `main` (or manual build dispatch) runs **Build and Push Multiplayer Server**.
2. GitHub Actions builds `backend/Dockerfile` from the repository root and pushes `DOCKERHUB_USERNAME/clumsykeys-server` to Docker Hub with both a unique UTC timestamp/run tag and `latest`.
3. The build uploads its exact tag as the `docker-tag` artifact, retained for one day.
4. After a successful build on `main`, **Deploy Multiplayer Server to Northflank** downloads that run's artifact and updates the existing Northflank service using `northflank/deploy-to-northflank@v1`. Failed builds do not deploy.

Northflank runs the image built in CI; it does not rebuild the Git repository. Frontend-only changes do not trigger this pipeline. Manual builds from other branches publish images but do not automatically deploy them.

## Frontend: Vercel

Import the repository as a Vercel project with the **repository root** as its
Root Directory. Select **Node.js 24.x** in Build and Deployment settings. The
checked-in `vercel.json` selects Vite, pins the install command to pnpm 12.18.0,
builds with `npm run build`, and publishes only `dist`. The explicit pnpm version
matters: this repository uses pnpm 12's multi-document lockfile, while Vercel's
lockfile-version detection can select pnpm 9 or 10. Do not override the install
command with an unpinned `pnpm install`.

Font files are bundled from `src/assets/fonts` into fingerprinted Vite assets in
`dist/assets`; deploy them with the frontend. No external Google Fonts origins
are needed for font loading. The primary Comfortaa Latin subset is preloaded.

Set these **build-time** environment variables in Vercel before deploying:

| Variable                        | Value                                                                      |
| ------------------------------- | -------------------------------------------------------------------------- |
| `VITE_SERVER_URL`               | Northflank backend's public HTTPS origin, without a path or trailing slash |
| `VITE_SUPABASE_URL`             | Supabase project URL, if accounts are enabled                              |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The same project's public publishable or anon key, if accounts are enabled |

Leave both public Supabase values unset for guest-only operation. Never add
`SUPABASE_SECRET_KEY`, database passwords, or migration tokens to the frontend
project. Changing a `VITE_` variable requires a new frontend build.

The app uses **hash routes** (`/#/about`, `/#/login`, etc.), so it does not need a
catch-all SPA rewrite. Account callbacks use the root URL with an `auth_action`
query parameter and also work without a rewrite. The backend runs on Northflank;
Vercel does not need API functions or a WebSocket proxy for this configuration.

Add the exact Vercel production origin and any explicitly supported preview
origins to Northflank's `FRONTEND_ORIGINS`. Preview deployments are not implicitly
allowed. Also configure the production Supabase Auth Site URL and the
`/?auth_action=confirm` and `/?auth_action=recovery` redirect URLs as described in
[Supabase setup](SUPABASE.md). Preview account flows need their own allowed
redirect URLs.

The frontend configuration includes the response headers described below.
Confirm them on the hosted response after deploying. See the official
[Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) and
[package manager](https://vercel.com/docs/package-managers) documentation.

## Backend: Northflank setup

Create a Docker Hub repository named `clumsykeys-server`. Add these GitHub repository Actions secrets:

| Secret                      | Value                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| `DOCKERHUB_USERNAME`        | Docker Hub account owning the image                              |
| `DOCKERHUB_PASSWORD`        | Docker Hub access token with push permission                     |
| `NORTHFLANK_API_KEY`        | Northflank token allowed to update the target service deployment |
| `NORTHFLANK_PROJECT_ID`     | Clumsy Keys Northflank project ID                                |
| `NORTHFLANK_SERVICE_ID`     | Clumsy Keys multiplayer deployment service ID                    |
| `NORTHFLANK_CREDENTIALS_ID` | Northflank registry credential ID for Docker Hub                 |

Use Clumsy Keys' own project and service IDs so this workflow targets only the intended multiplayer service. These values are configured in GitHub and Northflank, never committed.

Run the build workflow once to publish the initial image. In Northflank, add Docker Hub registry credentials and create a **deployment service** using that external image. Configure:

- Image: `<dockerhub-username>/clumsykeys-server:<published-tag>`.
- Registry credentials: the credentials referenced by `NORTHFLANK_CREDENTIALS_ID`.
- Instances: **one**, with horizontal autoscaling disabled. Rooms, sessions and race timers live in process memory.
- Public port: **1440**, protocol **HTTP**, with WebSocket upgrades supported for Socket.IO. Use the public HTTPS hostname for clients.
- Readiness and liveness: HTTP `GET /health` on port **1440**; expect status `200` and `{ "ok": true }`.
- Environment: `PORT=1440`, `NODE_ENV=production`, `FRONTEND_ORIGINS=https://<frontend-host>`. Separate multiple allowed frontend origins with commas; use complete origins without paths or trailing slashes.
- Leave the image's default start command (`node build/backend/src/app.js`). Disable separate registry-triggered auto-deploys so this workflow controls releases.

Save the service IDs as GitHub secrets, then manually run the deploy workflow with the initial image tag. Later matching pushes to `main` build, publish and deploy automatically. Both workflow files must exist on the repository's default branch for GitHub's workflow dispatch/run triggers.

Set the frontend's build environment variable `VITE_SERVER_URL=https://<northflank-backend-host>` and rebuild/redeploy the frontend. Use the base HTTPS URL, without `/socket.io` or `/rooms`; Socket.IO supplies its own path. The backend's `FRONTEND_ORIGINS` must include the frontend's actual origin.

For accounts and database persistence, also set backend runtime variables
`SUPABASE_URL` and `SUPABASE_SECRET_KEY`, and frontend build variables
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Use the same project on
both sides. Never pass the secret key as a frontend build variable or Docker
build argument. The Docker context excludes `.env` files; configure secrets on
the deployment service. Migration/CLI credentials do not belong in the runtime
image. Apply reviewed migrations with `npm run db:plan` then `npm run db:push`
before releasing code that depends on them. All eight migrations listed in [Supabase setup](SUPABASE.md#migration-inventory)
are needed for the current accounts, dashboard and public solo leaderboards.
Configure Auth callbacks for the real
frontend URL as described in [Supabase setup](SUPABASE.md). Same-origin proxies
must forward `/api/` in addition to the existing room and Socket.IO routes.

## Verification and rollback

Check `https://<backend-host>/health`, then open `#/login` in two browser profiles, join the same room with distinct usernames, start a race, and refresh one client to verify reconnect. Confirm HTTP room requests and Socket.IO polling/WebSocket connections succeed without CORS errors.

To roll back, manually dispatch **Deploy Multiplayer Server to Northflank** with a previously published timestamp tag. `latest` is also accepted, but a timestamp tag identifies a specific build. Keep previous images in Docker Hub for rollback; artifact expiration does not remove the image.

Restarting, deploying or rolling back clears active rooms and sessions and interrupts races. One replica prevents rooms from being split across processes; it does not preserve rooms through redeployment.

## Local image check

```sh
docker build -f backend/Dockerfile -t clumsykeys-server .
docker run --rm -p 1440:1440 -e FRONTEND_ORIGINS=http://localhost:5173 clumsykeys-server
curl --fail http://localhost:1440/health
```

The multi-stage Node 24 image compiles TypeScript with frozen pnpm dependencies, packages only the backend and production dependencies into the final image, and runs as the unprivileged `node` user. The frontend is deployed separately.

The [general API spec](api.openapi.json) lists HTTP endpoints and Socket.IO event
payloads. Update it when adding or changing a transport contract.

For contract changes, run the local coverage/link check and an independent
OpenAPI syntax/example validator:

```sh
npm run check:docs
npx --yes @redocly/cli@2.78.0 lint docs/api.openapi.json --extends minimal --skip-rule no-unused-components --skip-rule no-server-example.com
```

The two excluded lint rules permit the intentional local development server and
schemas referenced only by the `x-socketio` extension. `check:docs` still checks
those extension references and event coverage. Neither check proves that every
documented payload is accepted or returned by every handler; verify changed
behavior through the HTTP/Socket.IO tests as well.

[Back to README](../README.md)

## Security configuration

Set `NODE_ENV=production` and `FRONTEND_ORIGINS` to the exact HTTPS frontend
origins (scheme, host and optional port; no path or trailing slash). Production
no longer adds development origins automatically. Socket.IO checks this list for
WebSocket upgrades as well as HTTP polling; native clients without Origin remain
allowed and still need the existing account/resume-token authorization.

The process limits `/api` and `/rooms` to 240 requests/minute per transport IP,
account writes to 30/minute per verified account, connection attempts to 60/minute
per transport IP, and events to 60/second per socket. There are at most 1,000 live
connections, 1,000 rooms and 50 racers per room; inbound socket packets are limited
to 16 KiB. HTTP 429 responses include `Retry-After`. Limits are process-local,
reset on restart and are not distributed abuse prevention.

**Check proxy topology before rollout.** The app deliberately ignores
`X-Forwarded-For`; clients sharing a NAT or reverse proxy share the IP quotas.
For a production proxy, enforce client-IP limits at the edge and review an
explicit trusted-proxy integration and these thresholds for expected load.
Do not enable blanket proxy trust or forward user-provided IP headers unchanged.
Keep one backend replica until room coordination and shared quotas are designed.

Express returns API-only security headers, sanitized errors and no-store
responses. `vercel.json` configures these frontend response headers; verify them
on the deployed host: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`, and a restrictive `Permissions-Policy`.
Set HSTS at the HTTPS termination point after confirming all affected hosts
support HTTPS; review `includeSubDomains` before using it. Start a document CSP
in report-only mode, allow the actual API/Supabase HTTP and WebSocket endpoints,
self-hosted resources and required font origins, then enforce it. Hash or nonce
the inline theme bootstrap in `index.html`; Svelte's dynamic styles also need an
explicit style policy. The backend's `default-src 'none'` API CSP must not be
copied to the frontend document unchanged.

Keep server secrets in backend runtime variables only. Vite rejects privileged
keys and credential-named `VITE_` variables before building. The security workflow
checks working files, reachable history and build output for common credentials,
audits dependencies, and runs lint, types, tests and builds. Its dependency gate
fails on high/critical advisories; moderate/low advisories remain visible and
require triage. Enable branch protection to require this job. Review the
[security audit](SECURITY_AUDIT.md) for remaining score-integrity and deployment
actions.

## Maintenance

Update this guide with changes to `vercel.json`, package/build commands,
`backend/Dockerfile`, runtime paths, environment handling, transport/proxy setup,
workflow triggers or deployment controls. Keep the disabled-deployment notice
until the workflow condition actually changes. Record hosted verification only
after checking the intended live service; build success alone is not a deployed
health, WebSocket, CORS or account-persistence check.
