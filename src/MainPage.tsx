import { BUILD_ENV } from "./build-env";
import WaspLogo from "./assets/wasp-logo-rounded.svg";
import {
  environmentBadgeClass,
  formatBuildTime,
} from "./shared/status-page";

export function MainPage() {
  const environmentClass = environmentBadgeClass(BUILD_ENV.environment);
  const formattedBuildTime = formatBuildTime(BUILD_ENV.buildTime);

  return (
    <main className="page">
      <div className="glow glow-wasp" aria-hidden="true" />
      <div className="glow glow-zerops" aria-hidden="true" />

      <article className="card">
        <header className="brand">
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
            Wasp full-stack app deployed on Zerops — React client, Node.js API,
            and PostgreSQL.
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
        </dl>
      </article>
    </main>
  );
}
