import { LoginForm } from "wasp/client/auth";

import { DEMO_PASSWORD, DEMO_USERNAME } from "./auth/demoCredentials";

export function LoginPage() {
  return (
    <main className="page">
      <div className="glow glow-wasp" aria-hidden="true" />
      <div className="glow glow-zerops" aria-hidden="true" />

      <article className="card auth-card">
        <header className="brand">
          <h1>Sign in</h1>
          <p className="subtitle">
            Sample username &amp; password auth — use the demo credentials below.
          </p>
        </header>

        <div className="demo-credentials">
          <p className="demo-credentials-label">Demo account</p>
          <dl className="stats">
            <div className="stat">
              <dt>Username</dt>
              <dd>{DEMO_USERNAME}</dd>
            </div>
            <div className="stat">
              <dt>Password</dt>
              <dd>{DEMO_PASSWORD}</dd>
            </div>
          </dl>
        </div>

        <div className="auth-form">
          <LoginForm
            appearance={{
              colors: {
                brand: "#f5c842",
                brandAccent: "#00d1b2",
                submitButtonText: "#0b1118",
              },
            }}
          />
        </div>
      </article>
    </main>
  );
}
