// Runs Prisma migrate deploy from the Zerops runtime app root.
// Copied to migrate-prod.cjs during prod-api build and deployed alongside node_modules.
const { spawnSync } = require('child_process');
const { existsSync, readdirSync } = require('fs');
const path = require('path');
const { resolveDatabaseUrl } = require('./database-url.cjs');

const root = process.cwd();
const schema = path.join(root, '.wasp/out/db/schema.prisma');
const migrationsDir = path.join(root, '.wasp/out/db/migrations');
const prismaCli = path.join(root, 'node_modules/prisma/build/index.js');
const prismaBin = path.join(root, 'node_modules/.bin/prisma');

const MAX_DB_ATTEMPTS = 60;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quoteIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`unsafe SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

function runPrisma(args, label) {
  const useNodeCli = existsSync(prismaCli);
  const command = useNodeCli ? process.execPath : prismaBin;
  const commandArgs = useNodeCli
    ? [prismaCli, ...args, `--schema=${schema}`]
    : [...args, `--schema=${schema}`];

  console.log(`migrate-prod: ${label}`);
  const result = spawnSync(command, commandArgs, {
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
    return { ok: false, status: 1, output: result.error.message };
  }

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

async function prepareDatabase() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const rows = await prisma.$queryRaw`
      SELECT
        current_user AS "user",
        current_database() AS database,
        has_schema_privilege(current_user, 'public', 'CREATE') AS "canCreate"
    `;
    const info = rows[0];
    console.log(
      `migrate-prod: connected as ${info.user} to database "${info.database}" (public CREATE: ${info.canCreate})`,
    );

    if (info.canCreate) {
      return;
    }

    try {
      await prisma.$executeRawUnsafe(
        `GRANT ALL ON SCHEMA public TO ${quoteIdent(info.user)}`,
      );
      console.log('migrate-prod: granted ALL on schema public');
    } catch (grantError) {
      const message =
        grantError instanceof Error ? grantError.message : String(grantError);
      console.error(
        'migrate-prod: cannot create objects in schema public and grant failed:',
        message,
      );
      throw grantError;
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

async function waitForDatabase() {
  const { PrismaClient } = await import('@prisma/client');

  console.log('migrate-prod: waiting for PostgreSQL to accept connections');

  for (let attempt = 1; attempt <= MAX_DB_ATTEMPTS; attempt++) {
    const prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('migrate-prod: database connection OK');
      await prepareDatabase();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === MAX_DB_ATTEMPTS) {
        console.error('migrate-prod: database never became reachable:', message);
        throw error;
      }
      console.log(
        `migrate-prod: database not ready (${attempt}/${MAX_DB_ATTEMPTS}), retrying in ${RETRY_DELAY_MS / 1000}s... (${message})`,
      );
      await sleep(RETRY_DELAY_MS);
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('migrate-prod: DATABASE_URL is not set');
    process.exit(1);
  }

  resolveDatabaseUrl();

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

  await waitForDatabase();

  const deploy = runPrisma(['migrate', 'deploy'], 'applying migrations');
  if (!deploy.ok) {
    console.error(`migrate-prod: migrate deploy exited with code ${deploy.status}`);
    process.exit(deploy.status);
  }
}

main().catch((error) => {
  console.error('migrate-prod failed:', error);
  process.exit(1);
});
