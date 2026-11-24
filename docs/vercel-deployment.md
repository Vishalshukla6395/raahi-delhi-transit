# Deploy the complete prototype to Vercel

Use the private CLI package, not the GitHub import: GitHub intentionally has no model files.

Current production: https://raahi-live-blond.vercel.app

Public health and a real browser journey search were verified on 25 November 2026. The team disconnected Git auto-deployment. Source pushes and production deployments are separate operations.

## Update the existing deployment

Run the preparation commands below, then run `npx --yes vercel@latest --prod` from `tmp/vercel-deploy`. Preserve `tmp/vercel-deploy/.vercel`: it links this folder to the existing `raahi-live` project and keeps the production URL stable. If asked to connect Git for automatic deployments, answer No. Do not create another project for routine updates. The setup prompts further below apply only to a first deployment; if the local link is lost, link to the existing `raahi-live` project instead.

## Prepare after any source or data change

From the repository root in PowerShell:

```powershell
npm --prefix frontend run build
.\.venv\Scripts\python scripts/prepare_vercel.py
```

This creates `tmp/vercel-deploy`, which is Git-ignored. It contains the built frontend in `public/`, a FastAPI entrypoint, serving-only dependencies, and gzip-compressed network/model/report artifacts. No raw tickets, licensed source archive, database, credentials or private diagnostics are included. The model files sit outside `public/` and have no download endpoint.

## Authenticate and deploy

```powershell
npx --yes vercel@latest login
Set-Location C:\Users\visha\OneDrive\Desktop\TransportStack\tmp\vercel-deploy
npx --yes vercel@latest --prod
```

Approve browser sign-in with the same Vercel account. At deployment prompts:

- Set up and deploy: Yes.
- Scope: your Vercel account/team.
- Link to existing project: No (the imported Vite project may have incompatible root/build settings).
- Project name: `raahi-live` (or another available name).
- Code directory: `./`.
- Framework: FastAPI if prompted; otherwise accept the package's detected configuration.
- Modify settings: No; the package supplies `vercel.json`.
- Connect Git for automatic deployments: No; required private artifacts are not in GitHub.

No custom environment variables, VPS, public model URL or GitHub push are required for this local-source deployment. Vercel sets its own `VERCEL` flag. Do not set `RAAHI_DATA_DIR` to a Windows path. Keep the data files outside the public directory.

## Verify the resulting URL

Open `/health` on the deployment URL and confirm `routing_ready: true` and `data_ready: true`. Open `/` and run the supported real-data journey preset. Check explorer, evidence and browser requests too. If Vercel Deployment Protection blocks judges, configure public access for the intended production deployment in the dashboard.

The package is locally verified, not a guarantee of Vercel build compatibility, cold-start performance or concurrency capacity. Check the actual deployment logs if a build fails. Future updates require rerunning preparation and the CLI deploy from this folder; a GitHub-only redeploy cannot supply the ignored model data.

Official reference: https://vercel.com/docs/frameworks/backend/fastapi
