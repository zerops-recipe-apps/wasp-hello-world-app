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
        - npm install -g @wasp.sh/wasp-cli@0.25.0 --ignore-scripts=false
        - NPM_CONFIG_IGNORE_SCRIPTS=false wasp install
        - node scripts/generate-build-env.cjs
        - wasp build
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
      buildCommands:
        - npm install -g @wasp.sh/wasp-cli@0.25.0 --ignore-scripts=false
        - NPM_CONFIG_IGNORE_SCRIPTS=false wasp install
        - wasp build
        - cd .wasp/out/server && npm run bundle
      deployFiles:
        - node_modules
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
      initCommands:
        - zsc execOnce ${appVersionId} --retryUntilSuccessful -- sh -c 'node_modules/.bin/prisma migrate deploy --schema=.wasp/out/db/schema.prisma'
      ports:
        - port: 3001
          httpSupport: true
      envVariables:
        NODE_ENV: production
        DATABASE_URL: postgresql://${db_user}:${db_password}@${db_hostname}:${db_port}/db
      start: sh -c 'cd .wasp/out/server && npm run start-production'

  - setup: dev
    build:
      base: nodejs@24
      os: ubuntu
      buildCommands:
        - npm install -g @wasp.sh/wasp-cli@0.25.0 --ignore-scripts=false
        - NPM_CONFIG_IGNORE_SCRIPTS=false wasp install
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
        DATABASE_URL: postgresql://${db_user}:${db_password}@${db_hostname}:${db_port}/db
      start: zsc noop --silent
```

### 2. Environment variables

Set these at the **project** level in your recipe `import.yaml` (see [Wasp self-hosted deployment](https://wasp.sh/docs/deployment/deployment-methods/self-hosted)):

| Variable | Service | Purpose |
|----------|---------|---------|
| `REACT_APP_API_URL` | client (`prod-client`) | Baked into the SPA at build time |
| `WASP_SERVER_URL` | API (`prod-api`) | Public URL of the API (port 3001) |
| `WASP_WEB_CLIENT_URL` | API (`prod-api`) | Public URL of the static client |

The API service also receives `DATABASE_URL` from `${db_*}` hostname references in `zerops.yaml`.

### 3. Local development

```bash
npm install -g @wasp.sh/wasp-cli@0.25.0
NPM_CONFIG_IGNORE_SCRIPTS=false wasp install
wasp start db   # optional local Postgres via Wasp
wasp start      # client :3000, server :3001
```

Production build locally:

```bash
export DATABASE_URL='postgresql://user:pass@localhost:5432/wasp'
wasp build
REACT_APP_API_URL='http://localhost:3001' npm run build:client
```

<!-- #ZEROPS_EXTRACT_END:integration-guide# -->
