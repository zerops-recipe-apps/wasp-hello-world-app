// Seeds the predefined demo user on Zerops after migrations.
// Idempotent — safe to run on every deploy via zsc execOnce.
const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "demo-zerops";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("seed-demo-user: DATABASE_URL is not set");
    process.exit(1);
  }

  const { sanitizeAndSerializeProviderData } = await import("wasp/server/auth");
  const { PrismaClient } = await import("@prisma/client");

  const prisma = new PrismaClient();

  try {
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
                providerData: await sanitizeAndSerializeProviderData({
                  hashedPassword: DEMO_PASSWORD,
                }),
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
