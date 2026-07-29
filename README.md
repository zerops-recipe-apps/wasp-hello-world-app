# Wasp Hello World Recipe App

<!-- #ZEROPS_EXTRACT_START:intro# -->
A minimal [Wasp](https://wasp.sh/) full-stack application — React client, Node.js server, and PostgreSQL — deployed on [Zerops](https://zerops.io) as separate static and API services with Prisma migrations.
<!-- #ZEROPS_EXTRACT_END:intro# -->

Used within [Wasp Hello World recipe](https://app.zerops.io/recipes/wasp-hello-world) for [Zerops](https://zerops.io) platform.

⬇️ **Full recipe page and deploy with one-click**

[![Deploy on Zerops](https://github.com/zeropsio/recipe-shared-assets/blob/main/deploy-button/light/deploy-button.svg)](https://app.zerops.io/recipes/wasp-hello-world?environment=small-production)

![react cover](https://github.com/zeropsio/recipe-shared-assets/blob/main/covers/svg/cover-react.svg)

## Integration Guide

<!-- #ZEROPS_EXTRACT_START:integration-guide# -->

### 1. Adding `zerops.yaml`

The main application configuration file you place at the root of your repository. It tells Zerops how to build, deploy, and run your Wasp app.

Wasp deploys as **two production services** from one repo:

- `prod-client` — builds the React SPA (`wasp build` + `vite build`) and serves static assets via Nginx.
- `prod-api` — runs the bundled Node.js server from `.wasp/out/server/bundle/` with Prisma migrations.

```yaml
zerops:
  - setup: prod-client
    build:
      base: nodejs@24
      buildCommands:
        - sed -i 's/ignore-scripts=true/ignore-scripts=false/' .npmrc
        - npm install --min-release-age=0
        - npx wasp install
        - node scripts/generate-build-env.cjs
        - npx wasp build
        - npm run build:client
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
        - sed -i 's/ignore-scripts=true/ignore-scripts=false/' .npmrc
        - npm install --min-release-age=0
        - npx wasp install
        - npx wasp build
        - cd .wasp/out/server && npm run bundle
        - cp scripts/migrate-prod.cjs migrate-prod.cjs
      deployFiles:
        - node_modules
        - migrate-prod.cjs
        - .wasp/out/server/bundle
        - .wasp/out/server/node_modules
        - .wasp/out/server/package.json
        - .wasp/out/db
      cache:
        - node_modules
        - .wasp/out
    deploy:
      readinessCheck:
        httpGet:
          port: 3001
          path: /
    run:
      base: nodejs@24
      os: ubuntu
      initCommands:
        - zsc execOnce ${appVersionId} --retryUntilSuccessful -- node migrate-prod.cjs
      ports:
        - port: 3001
          httpSupport: true
      envVariables:
        NODE_ENV: production
        DATABASE_URL: ${db_connectionString}
      start: sh -c 'cd .wasp/out/server && npm run start-production'

  - setup: dev
    build:
      base: nodejs@24
      os: ubuntu
      buildCommands:
        - sed -i 's/ignore-scripts=true/ignore-scripts=false/' .npmrc
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

The API service receives `DATABASE_URL` from `${db_connectionString}` (the managed PostgreSQL connection string).

### 3. Local development

```bash
npm install --ignore-scripts=false --min-release-age=0   # or sed flip in .npmrc like Zerops build
npx wasp install
npx wasp start db   # optional local Postgres via Wasp
npx wasp start      # client :3000, server :3001
```

Production build locally:

```bash
export DATABASE_URL='postgresql://user:pass@localhost:5432/wasp'
wasp build
REACT_APP_API_URL='http://localhost:3001' npm run build:client
```

<!-- #ZEROPS_EXTRACT_END:integration-guide# -->
