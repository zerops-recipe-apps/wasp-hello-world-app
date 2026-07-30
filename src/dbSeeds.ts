import type { DbSeedFn } from "wasp/server";
import { sanitizeAndSerializeProviderData } from "wasp/server/auth";

import { DEMO_PASSWORD, DEMO_USERNAME } from "./auth/demoCredentials";

export const seedDemoUser: DbSeedFn = async (prisma) => {
  const existing = await prisma.authIdentity.findFirst({
    where: {
      providerName: "username",
      providerUserId: DEMO_USERNAME,
    },
  });

  if (existing) {
    console.log(`seedDemoUser: "${DEMO_USERNAME}" already exists — skipping`);
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
              providerData: await sanitizeAndSerializeProviderData<"username">({
                hashedPassword: DEMO_PASSWORD,
              }),
            },
          },
        },
      },
    },
  });

  console.log(`seedDemoUser: created demo user "${DEMO_USERNAME}"`);
};
