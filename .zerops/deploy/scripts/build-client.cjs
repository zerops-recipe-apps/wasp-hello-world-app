// Runs the production client build. REACT_APP_API_URL is required by Wasp
// at vite build time; default to local API when unset (Zerops sets it in prod).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (!process.env.REACT_APP_API_URL) {
  process.env.REACT_APP_API_URL = 'http://localhost:3001';
  console.warn(
    'REACT_APP_API_URL not set — defaulting to http://localhost:3001 for local build',
  );
}

execSync('node scripts/generate-build-env.cjs', { stdio: 'inherit', env: process.env });
execSync('vite build', { stdio: 'inherit', env: process.env });

// Wasp 0.25 emits 200.html as the SPA shell; Zerops static Nginx serves index.html.
const buildDir = path.join('.wasp/out/web-app/build');
const spaEntry = path.join(buildDir, '200.html');
const nginxIndex = path.join(buildDir, 'index.html');

if (!fs.existsSync(spaEntry)) {
  console.error('Expected Wasp SPA entry at .wasp/out/web-app/build/200.html');
  process.exit(1);
}

fs.copyFileSync(spaEntry, nginxIndex);
console.log('Copied 200.html → index.html for static hosting');
