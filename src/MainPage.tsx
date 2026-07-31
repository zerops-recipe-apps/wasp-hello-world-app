import { useEffect } from "react";
import {
  getVisitStat,
  recordVisit,
  useAction,
  useQuery,
} from "wasp/client/operations";
import { logout } from "wasp/client/auth";
import type { AuthUser } from "wasp/auth";
import { BUILD_ENV } from "./build-env";
import WaspLogo from "./assets/wasp-logo-rounded.svg";
import {
  environmentBadgeClass,
  formatBuildTime,
} from "./shared/status-page";

export function MainPage({ user }: { user: AuthUser }) {
  const { data: visitStat, isLoading, error, refetch } = useQuery(getVisitStat);
  const recordVisitFn = useAction(recordVisit);

  useEffect(() => {
    void recordVisitFn(undefined).then(() => refetch());
  }, [recordVisitFn, refetch]);
  const environmentClass = environmentBadgeClass(BUILD_ENV.environment);
  const formattedBuildTime = formatBuildTime(BUILD_ENV.buildTime);
  const username = user.identities.username?.id ?? "user";

  return (
    <main className="page">
      <div className="glow glow-wasp" aria-hidden="true" />
      <div className="glow glow-zerops" aria-hidden="true" />

      <article className="card">
        <header className="brand">
          <div className="page-toolbar">
            <p className="signed-in-as">
              Signed in as <strong>{username}</strong>
            </p>
            <button type="button" className="btn-logout" onClick={logout}>
              Log out
            </button>
          </div>

          <div className="logo-strip">
            <img src={WaspLogo} alt="Wasp" className="logo logo-wasp" />
            <span className="sep" aria-hidden="true" />
            <img
              src="/zerops-logo.webp"
              alt="Zerops"
              className="logo logo-zerops"
            />
          </div>

          <h1>Hello from Zerops!</h1>
          <p className="subtitle">
            Wasp full-stack app on Zerops — React client, Node.js API,
            PostgreSQL via Prisma, and username auth.
          </p>
        </header>

        <dl className="stats">
          <div className="stat">
            <dt>Framework</dt>
            <dd>Wasp {BUILD_ENV.version}</dd>
          </div>
          <div className="stat">
            <dt>Environment</dt>
            <dd>
              <span className={`badge ${environmentClass}`}>
                {BUILD_ENV.environment}
              </span>
            </dd>
          </div>
          <div className="stat">
            <dt>Build time</dt>
            <dd>{formattedBuildTime}</dd>
          </div>
          <div className="stat">
            <dt>Database</dt>
            <dd>
              {isLoading && "Connecting…"}
              {error && "Unavailable"}
              {visitStat && `Visit count ${visitStat.count}`}
            </dd>
          </div>
        </dl>
      </article>
    </main>
  );
}
