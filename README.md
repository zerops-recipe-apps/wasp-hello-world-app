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
        # Full install before bundle (tsc/rollup/@tsconfig/node24 are devDeps), prune after.
        - cd .wasp/out/server && NPM_CONFIG_AUDIT=false NPM_CONFIG_ENGINE_STRICT=false npm install
        - cd .wasp/out/server && npm run bundle
        - cd .wasp/out/server && npm prune --omit=dev
      deployFiles:
        - .wasp/out/server/bundle
        - .wasp/out/server/node_modules
        - .wasp/out/server/package.json
        - .wasp/out/libs
      cache:
        - node_modules
        - .wasp/out
    run:
      base: nodejs@24
      os: ubuntu
      ports:
        - port: 3001
          httpSupport: true
      envVariables:
        NODE_ENV: production
        DATABASE_URL: postgresql://${db_user}:${db_password}@${db_hostname}:${db_port}/${db_dbName}
        JWT_SECRET: wasp-zerops-hello-world-demo-jwt-v1
      start: sh -c 'cd .wasp/out/server && node --enable-source-maps bundle/server.js'

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

Set these at the **project** level in your recipe `import.yaml` (see [Wasp self-hosted deployment](https://wasp.sh/docs/deployment/deployment-methods/self-hosted)):

| Variable | Service | Purpose |
|----------|---------|---------|
| `REACT_APP_API_URL` | client (`prod-client`) | Baked into the SPA at build time |
| `WASP_SERVER_URL` | API (`prod-api`) | Public URL of the API (port 3001) |
| `WASP_WEB_CLIENT_URL` | API (`prod-api`) | Public URL of the static client |

Demo login (seeded on deploy): **username** `demo`, **password** `demo-zerops`. The home page requires auth; unauthenticated users are redirected to `/login`.

The API service receives `DATABASE_URL` from `${db_connectionString}` and runs `migrate-prod.cjs` plus `seed-demo-user.cjs` on deploy.

### 3. Local development

```bash
npm install --min-release-age=0
npx wasp install
npx wasp start db   # optional local Postgres via Wasp
npx wasp db migrate-dev
npx wasp db seed seedDemoUser
npx wasp start      # client :3000, server :3001 — sign in with demo / demo-zerops
```

Production build locally:

```bash
export DATABASE_URL='postgresql://user:pass@localhost:5432/wasp'
wasp build
REACT_APP_API_URL='http://localhost:3001' npm run build:client
```

<!-- #ZEROPS_EXTRACT_END:integration-guide# -->
