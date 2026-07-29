// Runs the production client build. REACT_APP_API_URL is required by Wasp
// at vite build time; default to local API when unset (Zerops sets it in prod).
const { execSync } = require('child_process');

if (!process.env.REACT_APP_API_URL) {
  process.env.REACT_APP_API_URL = 'http://localhost:3001';
  console.warn(
    'REACT_APP_API_URL not set — defaulting to http://localhost:3001 for local build',
  );
}

execSync('node scripts/generate-build-env.cjs', { stdio: 'inherit', env: process.env });
execSync('vite build', { stdio: 'inherit', env: process.env });
