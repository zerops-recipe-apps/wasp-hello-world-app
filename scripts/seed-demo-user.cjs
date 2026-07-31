// Seeds the predefined demo user on Zerops after migrations.
// Idempotent — creates or refreshes the demo password hash on every deploy.
const path = require("path");
const { pathToFileURL } = require("url");
const { resolveDatabaseUrl } = require(path.join(__dirname, "database-url.cjs"));

const DEMO_USERNAME = "demo";
// Wasp normalizes username provider IDs to lowercase at login time.
const DEMO_PROVIDER_USER_ID = DEMO_USERNAME.toLowerCase();
const DEMO_PASSWORD = "demo-zerops1";

const MAX_DB_ATTEMPTS = 60;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDatabase(prisma) {
  for (let attempt = 1; attempt <= MAX_DB_ATTEMPTS; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === MAX_DB_ATTEMPTS) {
        throw error;
      }
      console.log(
        `seed-demo-user: database not ready (${attempt}/${MAX_DB_ATTEMPTS}), retrying... (${message})`,
      );
      await sleep(RETRY_DELAY_MS);
    }
  }
}

async function loadHashPassword() {
  const libAuth = path.join(
    __dirname,
    "../.wasp/out/server/node_modules/@wasp.sh/lib-auth/dist/node.js",
  );
  const { hashPassword } = await import(pathToFileURL(libAuth).href);
  return hashPassword;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("seed-demo-user: DATABASE_URL is not set");
    process.exit(1);
  }

  resolveDatabaseUrl();

  const hashPassword = await loadHashPassword();
  const hashedPassword = await hashPassword(DEMO_PASSWORD);
  const providerData = JSON.stringify({ hashedPassword });

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    await waitForDatabase(prisma);

    const existing = await prisma.authIdentity.findFirst({
      where: {
        providerName: "username",
        providerUserId: DEMO_PROVIDER_USER_ID,
      },
    });

    if (existing) {
      await prisma.authIdentity.update({
        where: {
          providerName_providerUserId: {
            providerName: "username",
            providerUserId: DEMO_PROVIDER_USER_ID,
          },
        },
        data: { providerData },
      });
      console.log(
        `seed-demo-user: refreshed password for "${DEMO_USERNAME}" (${DEMO_PROVIDER_USER_ID})`,
      );
      return;
    }

    await prisma.user.create({
      data: {
        auth: {
          create: {
            identities: {
              create: {
                providerName: "username",
                providerUserId: DEMO_PROVIDER_USER_ID,
                providerData,
              },
            },
          },
        },
      },
    });

    console.log(`seed-demo-user: created "${DEMO_USERNAME}"`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("seed-demo-user failed:", error);
  process.exit(1);
});
