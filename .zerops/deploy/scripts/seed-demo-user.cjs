// Seeds the predefined demo user on Zerops after migrations.
// Idempotent — safe to run on every deploy via zsc execOnce.
const path = require("path");
const { resolveDatabaseUrl } = require(path.join(__dirname, "database-url.cjs"));

const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "demo-zerops";
// Argon2 hash for "demo-zerops" (Wasp @wasp.sh/lib-auth / username provider format).
const DEMO_PROVIDER_DATA = JSON.stringify({
  hashedPassword:
    "$argon2id$v=19$m=19456,t=2,p=1$yhCB1BCbCegdKdPDKSm04A$if6PbSBu4J38cn83Yse+e3vLNksIxkR5AcIghHo/7V0",
});

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

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("seed-demo-user: DATABASE_URL is not set");
    process.exit(1);
  }

  resolveDatabaseUrl();

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    await waitForDatabase(prisma);

    const existing = await prisma.authIdentity.findFirst({
      where: {
        providerName: "username",
        providerUserId: DEMO_USERNAME,
      },
    });

    if (existing) {
      console.log(`seed-demo-user: "${DEMO_USERNAME}" already exists — skipping`);
      return;
    }

    await prisma.user.create({
      data: {
        auth: {
          create: {
            identities: {
              create: {
                providerName: "username",
                providerUserId: DEMO_USERNAME,
                providerData: DEMO_PROVIDER_DATA,
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
