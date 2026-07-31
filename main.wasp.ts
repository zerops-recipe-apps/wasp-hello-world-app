import { action, api, app, page, query, route } from "@wasp.sh/spec";
import { recordVisit } from "./src/actions" with { type: "ref" };
import { getStatus } from "./src/apis" with { type: "ref" };
import { seedDemoUser } from "./src/dbSeeds" with { type: "ref" };
import { LoginPage } from "./src/LoginPage" with { type: "ref" };
import { MainPage } from "./src/MainPage" with { type: "ref" };
import { getVisitStat } from "./src/queries" with { type: "ref" };
import { serverMiddlewareFn } from "./src/serverSetup" with { type: "ref" };

export default app({
  name: "waspHelloWorldApp",
  wasp: { version: "^0.25.0" },
  title: "Wasp Hello World on Zerops",
  server: {
    middlewareConfigFn: serverMiddlewareFn,
  },
  head: [
    "<link rel='icon' href='/favicon.ico' />",
    "<link rel='stylesheet' href='/status-page.css' />",
  ],
  auth: {
    userEntity: "User",
    methods: {
      usernameAndPassword: {},
    },
    onAuthFailedRedirectTo: "/login",
  },
  db: {
    seeds: [seedDemoUser],
  },
  spec: [
    route("RootRoute", "/", page(MainPage, { authRequired: true })),
    route("LoginRoute", "/login", page(LoginPage)),
    query(getVisitStat, { entities: ["VisitStat"] }),
    action(recordVisit, { entities: ["VisitStat"] }),
    api("GET", "/status", getStatus, { auth: false, entities: ["VisitStat"] }),
  ],
});
