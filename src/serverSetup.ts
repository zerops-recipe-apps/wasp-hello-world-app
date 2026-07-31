import cors from "cors";
import { config, type MiddlewareConfigFn } from "wasp/server";

/**
 * Zerops SPA subdomains: static service hostname may be `app` or `client`
 * depending on import/recipe generation. Allow both so CORS works in every env.
 */
function zeropsSpaOrigins(): string[] {
  const clientUrl = process.env.WASP_WEB_CLIENT_URL;
  if (clientUrl) {
    try {
      const { hostname, protocol } = new URL(clientUrl);
      const match = hostname.match(/^(app|client)-([^.]+)\.(.+)$/);
      if (match) {
        const [, , subdomainHost, domainRest] = match;
        return [
          `${protocol}//app-${subdomainHost}.${domainRest}`,
          `${protocol}//client-${subdomainHost}.${domainRest}`,
        ];
      }
      return [clientUrl.replace(/\/$/, "")];
    } catch {
      /* fall through */
    }
  }

  const subdomainHost =
    process.env.zeropsSubdomainHost ?? process.env.PROJECT_zeropsSubdomainHost;
  if (!subdomainHost) return [];

  const region = process.env.ZEROPS_REGION ?? "prg1";
  const base = `${region}.zerops.app`;
  return [
    `https://app-${subdomainHost}.${base}`,
    `https://client-${subdomainHost}.${base}`,
  ];
}

export const serverMiddlewareFn: MiddlewareConfigFn = (middlewareConfig) => {
  const origins = [...new Set([...config.allowedCORSOrigins, ...zeropsSpaOrigins()])];

  middlewareConfig.set(
    "cors",
    cors({
      origin: origins,
      credentials: true,
    }),
  );

  return middlewareConfig;
};
