# Wasp Hello World Recipe App

<!-- #ZEROPS_EXTRACT_START:intro# -->
A minimal [Wasp](https://wasp.sh/) full-stack application — React client, Node.js API, PostgreSQL, and a Prisma query — deployed on [Zerops](https://zerops.io) as separate static and API services.
<!-- #ZEROPS_EXTRACT_END:intro# -->

Used within [Wasp Hello World recipe](https://app.zerops.io/recipes/wasp-hello-world) for [Zerops](https://zerops.io) platform.

⬇️ **Full recipe page and deploy with one-click**

[![Deploy on Zerops](https://github.com/zeropsio/recipe-shared-assets/blob/main/deploy-button/light/deploy-button.svg)](https://app.zerops.io/recipes/wasp-hello-world?environment=small-production)

![wasp cover](https://github.com/zerops-recipe-apps/wasp-hello-world-app/blob/main/docs/cover-wasp.svg)

## Integration Guide

<!-- #ZEROPS_EXTRACT_START:integration-guide# -->

### 1. Adding `zerops.yaml`

The main application configuration file you place at the root of your repository. It tells Zerops how to build, deploy, and run your Wasp app.

Wasp deploys as **two production services** from one repo:

- `prod-client` — builds the React SPA (`wasp build` + `vite build`) and serves static assets via Nginx.
- `prod-api` — runs the bundled Node.js server from `.wasp/out/server/bundle/` and applies Prisma migrations on deploy.

```yaml
zerops:
  - setup: prod-client
    build:
      base: nodejs@24
      buildCommands:
        - npm install --min-release-age=0
        - npx wasp install
        - node scripts/generate-build-env.cjs
        - npx wasp build
        - npm run build:client
      envVariables:
        RUNTIME_APP_ENV: production
      deployFiles:
        - .wasp/out/web-app/build/~
      cache:
        - node_modules
        - .wasp/out
    run:
      base: static

  - setup: prod-api
    build:
      base: nodejs@24
      os: ubuntu
      buildCommands:
        - NPM_CONFIG_PRODUCTION=false NPM_CONFIG_ENGINE_STRICT=false NPM_CONFIG_AUDIT=false npm install --min-release-age=0
        - npx wasp install
        - npx wasp build
        - cp -R migrations/. .wasp/out/db/migrations/
        - sh scripts/bundle-server.sh
        - node scripts/prepare-api-deploy.cjs
      deployFiles:
        - .zerops/deploy/~
      cache:
        - node_modules
        - .wasp/out
    deploy:
      readinessCheck:
        httpGet:
          port: 3001
          path: /auth/me
        failureTimeout: 300
        retryPeriod: 10
    run:
      base: nodejs@24
      os: ubuntu
      initCommands:
        - zsc execOnce ${appVersionId} --retryUntilSuccessful -- node scripts/migrate-prod.cjs
        - zsc execOnce ${appVersionId} --retryUntilSuccessful -- node scripts/seed-demo-user.cjs
      ports:
        - port: 3001
          httpSupport: true
      envVariables:
        NODE_ENV: production
        PORT: 3001
        DATABASE_URL: postgresql://${db_user}:${db_password}@${db_hostname}:${db_port}/${db_dbName}
        APP_DB_NAME: ${db_dbName}
        JWT_SECRET: wasp-zerops-hello-world-demo-jwt-v1
      start: sh -c 'cd .wasp/out/server && NODE_ENV=production node --enable-source-maps bundle/server.js'

  - setup: dev
    build:
      base: nodejs@24
      os: ubuntu
      buildCommands:
        - npm install --min-release-age=0
        - npx wasp install
      deployFiles: ./
      cache:
        - node_modules
    run:
      base: nodejs@24
      os: ubuntu
      ports:
        - port: 3000
          httpSupport: true
        - port: 3001
          httpSupport: true
      envVariables:
        DATABASE_URL: ${db_connectionString}
      start: zsc noop --silent
```

### 2. Environment variables

Set these at the **project** level in your recipe `import.yaml` as a value store (not Wasp runtime key names). `zerops.yaml` maps them into the app:

| Import variable | Mapped in `zerops.yaml` | Purpose |
|-----------------|-------------------------|---------|
| `API_URL` | `REACT_APP_API_URL` (prod-client build), `WASP_SERVER_URL` (prod-api) | Public API URL (port 3001) |
| `APP_URL` | `WASP_WEB_CLIENT_URL` (prod-api) | Public SPA URL (hostname `app`) |

Do not set `envVariables` on individual services in `import.yaml` — that key is project-level only.

Demo login (seeded on deploy): **username** `demo`, **password** `demo-zerops1`. The home page requires auth; unauthenticated users are redirected to `/login`.

The API service receives `DATABASE_URL` from `${db_*}` placeholders and runs `migrate-prod.cjs` plus `seed-demo-user.cjs` on deploy. If the API returns 502, verify `APP_URL` and `API_URL` exist on the project (re-import `import.yaml` env if needed).

### 3. Local development

```bash
npm install --min-release-age=0
npx wasp install
npx wasp start db   # optional local Postgres via Wasp
npx wasp db migrate-dev
npx wasp db seed seedDemoUser
npx wasp start      # client :3000, server :3001 — sign in with demo / demo-zerops1
```

Production build locally:

```bash
export DATABASE_URL='postgresql://user:pass@localhost:5432/wasp'
wasp build
REACT_APP_API_URL='http://localhost:3001' npm run build:client
```
<!-- #ZEROPS_EXTRACT_END:integration-guide# -->
