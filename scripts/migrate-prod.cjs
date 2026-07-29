// Runs Prisma migrate deploy from the Zerops runtime app root.
// Copied to migrate-prod.cjs during prod-api build and deployed alongside node_modules.
const { execFileSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const root = process.cwd();
const prismaBin = path.join(root, 'node_modules', '.bin', 'prisma');
const schema = path.join(root, '.wasp/out/db/schema.prisma');
const migrations = path.join(root, '.wasp/out/db/migrations');

if (!process.env.DATABASE_URL) {
  console.error('migrate-prod: DATABASE_URL is not set');
  process.exit(1);
}

if (!existsSync(prismaBin)) {
  console.error('migrate-prod: prisma CLI not found at', prismaBin);
  process.exit(1);
}

if (!existsSync(migrations)) {
  console.error('migrate-prod: migrations directory not found at', migrations);
  process.exit(1);
}

console.log('migrate-prod: applying migrations');
execFileSync(prismaBin, ['migrate', 'deploy', `--schema=${schema}`], {
  stdio: 'inherit',
  env: process.env,
});
