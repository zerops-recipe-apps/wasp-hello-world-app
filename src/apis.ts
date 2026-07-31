import type { GetStatus } from "wasp/server/api";

/** Public health/status endpoint with DB probe. Root `/` is patched at build time
 * (see scripts/patch-api-root.cjs) because Wasp prod otherwise returns empty 200. */
export const getStatus: GetStatus = async (_req, res, context) => {
  let database: "ok" | "unreachable" = "ok";
  let visitCount: number | null = null;

  try {
    const stat = await context.entities.VisitStat.findUnique({ where: { id: 1 } });
    visitCount = stat?.count ?? null;
  } catch {
    database = "unreachable";
  }

  res.json({
    service: "wasp-hello-world-api",
    status: "ok",
    database,
    visitCount,
    clientUrl: process.env.WASP_WEB_CLIENT_URL ?? null,
    timestamp: new Date().toISOString(),
  });
};
