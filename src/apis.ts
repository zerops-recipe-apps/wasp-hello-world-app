import type { GetApiRoot, GetStatus } from "wasp/server/api";

const SERVICE_NAME = "wasp-hello-world-api";

/** Landing page for the API URL: HTML for browsers, JSON for API clients. */
export const getApiRoot: GetApiRoot = (req, res) => {
  const clientUrl = process.env.WASP_WEB_CLIENT_URL ?? null;

  if (req.accepts(["json", "html"]) === "html") {
    res.type("html").send(renderApiRootPage(clientUrl));
    return;
  }

  res.json({
    service: SERVICE_NAME,
    status: "ok",
    message: "Wasp API is running on Zerops.",
    endpoints: {
      status: "/status",
      up: "/up",
      authMe: "/auth/me",
      login: "/auth/username/login",
    },
    clientUrl,
    docs: "https://wasp.sh/docs",
  });
};

/** Public health/status endpoint with DB probe. */
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
    service: SERVICE_NAME,
    status: "ok",
    database,
    visitCount,
    clientUrl: process.env.WASP_WEB_CLIENT_URL ?? null,
    timestamp: new Date().toISOString(),
  });
};

function renderApiRootPage(clientUrl: string | null): string {
  const clientLink = clientUrl
    ? `<p>Open the client: <a href="${clientUrl}">${clientUrl}</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Wasp API</title>
<style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1.25rem;line-height:1.6;color:#111}
code{background:#f4f4f5;padding:.12rem .35rem;border-radius:4px}a{color:#2563eb}</style></head>
<body><h1>Wasp Hello World API</h1><p>Status: <strong>ok</strong></p>
<p>Try <code>GET /status</code> for JSON health, or sign in on the client app.</p>
${clientLink}<ul><li><a href="/status">/status</a></li><li><a href="/up">/up</a></li><li><a href="/auth/me">/auth/me</a></li></ul></body></html>`;
}
