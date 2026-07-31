// Wasp prod builds register GET / as an empty 200. Patch the generated route
// so opening the API URL in a browser shows a short status page (JSON for API clients).
const fs = require("fs");
const path = require("path");

const routesFile = path.join(".wasp/out/server/src/routes/index.js");
if (!fs.existsSync(routesFile)) {
  console.error(`patch-api-root: missing ${routesFile} — run wasp build first`);
  process.exit(1);
}

const src = fs.readFileSync(routesFile, "utf8");
const marker = "res.status(200).send();";

if (!src.includes(marker)) {
  if (src.includes("wasp-hello-world-api")) {
    console.log("patch-api-root: root handler already patched");
    process.exit(0);
  }
  console.error("patch-api-root: production empty root handler not found");
  process.exit(1);
}

const handler = `function (_req, res) {
      const payload = {
        service: "wasp-hello-world-api",
        status: "ok",
        message: "Wasp API is running on Zerops.",
        endpoints: {
          status: "/status",
          authMe: "/auth/me",
          login: "/auth/username/login",
        },
        clientUrl: process.env.WASP_WEB_CLIENT_URL || null,
        docs: "https://wasp.sh/docs",
      };
      const accept = _req.headers.accept || "";
      if (accept.includes("text/html")) {
        const client = payload.clientUrl
          ? \`<p>Open the client: <a href="\${payload.clientUrl}">\${payload.clientUrl}</a></p>\`
          : "";
        res.status(200).type("html").send(\`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Wasp API</title>
<style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1.25rem;line-height:1.6;color:#111}
code{background:#f4f4f5;padding:.12rem .35rem;border-radius:4px}a{color:#2563eb}</style></head>
<body><h1>Wasp Hello World API</h1><p>Status: <strong>ok</strong></p>
<p>Try <code>GET /status</code> for JSON health, or sign in on the client app.</p>
\${client}<ul><li><a href="/status">/status</a></li><li><a href="/auth/me">/auth/me</a></li></ul></body></html>\`);
      } else {
        res.status(200).json(payload);
      }
    }`;

const patched = src.replace(
  /function \(_req, res\) \{\s*res\.status\(200\)\.send\(\);\s*\}/,
  handler,
);

if (patched === src) {
  console.error("patch-api-root: replace failed");
  process.exit(1);
}

fs.writeFileSync(routesFile, patched);
console.log("patch-api-root: production root handler patched");
