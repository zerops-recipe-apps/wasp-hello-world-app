// Runs Prisma migrate deploy from the Zerops runtime app root.
// Copied to migrate-prod.cjs during prod-api build and deployed alongside node_modules.
const { spawnSync } = require('child_process');
const { existsSync, readdirSync } = require('fs');
const path = require('path');

const root = process.cwd();
const schema = path.join(root, '.wasp/out/db/schema.prisma');
const migrationsDir = path.join(root, '.wasp/out/db/migrations');
const prismaCli = path.join(root, 'node_modules/prisma/build/index.js');
const prismaBin = path.join(root, 'node_modules/.bin/prisma');

function runPrisma(args, label) {
  const cli = existsSync(prismaCli) ? process.execPath : prismaBin;
  const cliArgs = existsSync(prismaCli)
    ? [prismaCli, ...args, `--schema=${schema}`]
    : [...args, `--schema=${schema}`];

  console.log(`migrate-prod: ${label}`);
  const result = spawnSync(cli, cliArgs, {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    console.error(`migrate-prod: ${label} failed to start:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`migrate-prod: ${label} exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error('migrate-prod: DATABASE_URL is not set');
  process.exit(1);
}

if (!existsSync(prismaCli) && !existsSync(prismaBin)) {
  console.error('migrate-prod: prisma CLI not found in node_modules');
  process.exit(1);
}

if (!existsSync(schema)) {
  console.error('migrate-prod: schema not found at', schema);
  process.exit(1);
}

if (!existsSync(migrationsDir)) {
  console.error('migrate-prod: migrations directory not found at', migrationsDir);
  process.exit(1);
}

const migrationNames = readdirSync(migrationsDir).filter((name) =>
  /^\d/.test(name),
);
console.log(
  `migrate-prod: found ${migrationNames.length} migration(s): ${migrationNames.join(', ')}`,
);

runPrisma(['migrate', 'status'], 'checking migration status');
runPrisma(['migrate', 'deploy'], 'applying migrations');
