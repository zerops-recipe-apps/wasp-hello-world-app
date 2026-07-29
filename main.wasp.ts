import { app, page, route } from "@wasp.sh/spec";
import { MainPage } from "./src/MainPage" with { type: "ref" };

export default app({
  name: "waspHelloWorldApp",
  wasp: { version: "^0.25.0" },
  title: "Wasp Hello World on Zerops",
  head: [
    "<link rel='icon' href='/favicon.ico' />",
    "<link rel='stylesheet' href='/status-page.css' />",
  ],
  spec: [
    route("RootRoute", "/", page(MainPage)),
  ],
});
