#!/bin/sh
# Prod-api: install server deps (incl. dev), bundle, then prune for deploy.
# Never run npm install --omit=dev before bundle — removes @tsconfig/node24, tsc, rollup.
set -e
cd .wasp/out/server
export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_ENGINE_STRICT=false
export NPM_CONFIG_PRODUCTION=false
npm install
npm run bundle
npm prune --omit=dev
test -f bundle/server.js
