# Multiplayer deployment

Northflank deployment is temporarily disabled with `if: ${{ false }}` on the deploy job in `.github/workflows/deploy-northflank.yml`. Automatic and manual runs skip deployment. Docker Hub builds and pushes remain active. To re-enable deployment, restore the original condition preserved in the workflow comment. The deployment steps below describe behavior after re-enabling it.

This mirrors Catan's two-workflow pipeline:

1. A backend-related push to `main` (or manual build dispatch) runs **Build and Push Multiplayer Server**.
2. GitHub Actions builds `backend/Dockerfile` from the repository root and pushes `DOCKERHUB_USERNAME/clumsykeys-server` to Docker Hub with both a unique UTC timestamp/run tag and `latest`.
3. The build uploads its exact tag as the `docker-tag` artifact, retained for one day.
4. After a successful build on `main`, **Deploy Multiplayer Server to Northflank** downloads that run's artifact and updates the existing Northflank service using `northflank/deploy-to-northflank@v1`. Failed builds do not deploy.

Northflank runs the image built in CI; it does not rebuild the Git repository. Frontend-only changes do not trigger this pipeline. Manual builds from other branches publish images but do not automatically deploy them.

## One-time setup

Create a Docker Hub repository named `clumsykeys-server`. Add these GitHub repository Actions secrets:

| Secret | Value |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub account owning the image |
| `DOCKERHUB_PASSWORD` | Docker Hub access token with push permission |
| `NORTHFLANK_API_KEY` | Northflank token allowed to update the target service deployment |
| `NORTHFLANK_PROJECT_ID` | Clumsy Keys Northflank project ID |
| `NORTHFLANK_SERVICE_ID` | Clumsy Keys multiplayer deployment service ID |
| `NORTHFLANK_CREDENTIALS_ID` | Northflank registry credential ID for Docker Hub |

Use Clumsy Keys' own project and service IDs so this workflow does not update Catan's service. These values are configured in GitHub and Northflank, never committed.

Run the build workflow once to publish the initial image. In Northflank, add Docker Hub registry credentials and create a **deployment service** using that external image. Configure:

- Image: `<dockerhub-username>/clumsykeys-server:<published-tag>`.
- Registry credentials: the credentials referenced by `NORTHFLANK_CREDENTIALS_ID`.
- Instances: **one**, with horizontal autoscaling disabled. Rooms, sessions and race timers live in process memory.
- Public port: **1440**, protocol **HTTP**, with WebSocket upgrades supported for Socket.IO. Use the public HTTPS hostname for clients.
- Readiness and liveness: HTTP `GET /health` on port **1440**; expect status `200` and `{ "ok": true }`.
- Environment: `PORT=1440`, `NODE_ENV=production`, `FRONTEND_ORIGINS=https://<frontend-host>`. Separate multiple allowed frontend origins with commas; use complete origins without paths or trailing slashes.
- Leave the image's default start command (`node build/app.js`). Disable separate registry-triggered auto-deploys so this workflow controls releases.

Save the service IDs as GitHub secrets, then manually run the deploy workflow with the initial image tag. Later matching pushes to `main` build, publish and deploy automatically. Both workflow files must exist on the repository's default branch for GitHub's workflow dispatch/run triggers.

Set the frontend's build environment variable `VITE_SERVER_URL=https://<northflank-backend-host>` and rebuild/redeploy the frontend. Use the base HTTPS URL, without `/socket.io` or `/rooms`; Socket.IO supplies its own path. The backend's `FRONTEND_ORIGINS` must include the frontend's actual origin.

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

[Back to README](../README.md)
