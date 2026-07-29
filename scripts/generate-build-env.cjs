// Generates src/build-env.ts with build-time constants.
// Runs in prod-client buildCommands before wasp build — Vite inlines
// the result into the client bundle at build time.

const { readFileSync, writeFileSync } = require('fs');

const mainWasp = readFileSync('./main.wasp.ts', 'utf-8');
const versionMatch = mainWasp.match(/version:\s*"\^?([^"]+)"/);
const version = versionMatch ? versionMatch[1] : 'unknown';

const environment =
  process.env.RUNTIME_APP_ENV || process.env.NODE_ENV || 'development';

const content = `// Auto-generated at build time by scripts/generate-build-env.cjs.
// Do not edit — this file is overwritten on every build.
export const BUILD_ENV = {
  version: '${version}',
  buildTime: '${new Date().toISOString()}',
  environment: '${environment}',
};
`;

writeFileSync('src/build-env.ts', content);
console.log('Build env generated: Wasp', version);
