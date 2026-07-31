// Builds a clean Zerops runtime tree under .zerops/deploy/ — no Wasp dev
// symlinks, no duplicate paths. Server deps are installed fresh; Prisma CLI
// + generated client live at the deploy root for initCommands.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const deploy = path.join(root, ".zerops/deploy");
const deployWasp = path.join(deploy, ".wasp/out");
const deployServer = path.join(deployWasp, "server");
const schema = ".wasp/out/db/schema.prisma";

const npmEnv = {
  ...process.env,
  NPM_CONFIG_AUDIT: "false",
  NPM_CONFIG_ENGINE_STRICT: "false",
  NPM_CONFIG_PRODUCTION: "false",
  NPM_CONFIG_IGNORE_SCRIPTS: "false",
};

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function requirePath(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`prepare-api-deploy: missing ${rel}`);
    process.exit(1);
  }
  return abs;
}

function copyTree(src, dest) {
  fs.cpSync(src, dest, { recursive: true, dereference: true });
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

function removeExternalSymlinks(dir) {
  let removed = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(full);
      const resolved = path.resolve(path.dirname(full), target);
      if (!resolved.startsWith(deploy)) {
        fs.unlinkSync(full);
        removed += 1;
      }
    } else if (entry.isDirectory()) {
      removed += removeExternalSymlinks(full);
    }
  }
  return removed;
}

function assertNoExternalSymlinks() {
  const externalLinks = [];
  function scanSymlinks(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        const target = fs.readlinkSync(full);
        const resolved = path.resolve(path.dirname(full), target);
        if (!resolved.startsWith(deploy)) {
          externalLinks.push(`${full} -> ${target}`);
        }
      } else if (entry.isDirectory()) {
        scanSymlinks(full);
      }
    }
  }
  scanSymlinks(deploy);
  if (externalLinks.length > 0) {
    console.error("prepare-api-deploy: external symlinks remain in deploy tree:");
    for (const link of externalLinks) {
      console.error(`  ${link}`);
    }
    process.exit(1);
  }
}

requirePath(".wasp/out/server/bundle/server.js");
requirePath(".wasp/out/server/package.json");
requirePath(".wasp/out/db/schema.prisma");
requirePath(".wasp/out/libs/auth");
requirePath("scripts/migrate-prod.cjs");

rmrf(deploy);
fs.mkdirSync(deploy, { recursive: true });

copyTree(path.join(root, "scripts"), path.join(deploy, "scripts"));
fs.mkdirSync(deployWasp, { recursive: true });
copyTree(path.join(root, ".wasp/out/db"), path.join(deployWasp, "db"));
copyTree(path.join(root, ".wasp/out/libs"), path.join(deployWasp, "libs"));
copyTree(
  path.join(root, ".wasp/out/server/bundle"),
  path.join(deployServer, "bundle"),
);
fs.copyFileSync(
  path.join(root, ".wasp/out/server/package.json"),
  path.join(deployServer, "package.json"),
);
const serverPkg = JSON.parse(
  fs.readFileSync(path.join(deployServer, "package.json"), "utf8"),
);
// Rollup keeps these bundle imports external, but Wasp hoists them to the
// workspace root — declare them explicitly or the standalone install omits
// them and the server dies with ERR_MODULE_NOT_FOUND (e.g. 'zod') on Zerops.
for (const dep of ["zod", "lucia", "@lucia-auth/adapter-prisma"]) {
  const { version } = JSON.parse(
    fs.readFileSync(path.join(root, "node_modules", dep, "package.json"), "utf8"),
  );
  serverPkg.dependencies[dep] = version;
}
serverPkg.allowScripts = [
  ...(serverPkg.allowScripts ?? []),
  "@wasp.sh/lib-auth",
  "@wasp.sh/lib-vite-ssr",
  "esbuild",
];
fs.writeFileSync(
  path.join(deployServer, "package.json"),
  `${JSON.stringify(serverPkg, null, 2)}\n`,
);
copyIfExists(
  path.join(root, ".wasp/out/server/package-lock.json"),
  path.join(deployServer, "package-lock.json"),
);

// Isolated prod install in deploy tree (not a workspace) — pulls in @wasp.sh/* from file: tgz.
execSync("npm install --omit=dev --workspaces=false", {
  cwd: deployServer,
  stdio: "inherit",
  env: npmEnv,
});

const runtimePkg = {
  name: "wasp-api-runtime",
  private: true,
  allowScripts: [
    "prisma",
    "@prisma/client",
    "@prisma/engines",
    "@wasp.sh/lib-auth",
    "@wasp.sh/lib-vite-ssr",
    "esbuild",
  ],
  dependencies: {
    prisma: "5.19.1",
    "@prisma/client": "5.19.1",
  },
};
fs.writeFileSync(
  path.join(deploy, "package.json"),
  `${JSON.stringify(runtimePkg, null, 2)}\n`,
);

execSync("npm install --omit=dev --workspaces=false", {
  cwd: deploy,
  stdio: "inherit",
  env: npmEnv,
});
execSync(`npx prisma generate --schema=${schema}`, {
  cwd: deploy,
  stdio: "inherit",
  env: npmEnv,
});
copyTree(
  path.join(deploy, "node_modules/.prisma"),
  path.join(deployServer, "node_modules/.prisma"),
);

const removedLinks = removeExternalSymlinks(deploy);
if (removedLinks > 0) {
  console.log(
    `prepare-api-deploy: removed ${removedLinks} external symlink(s) from deploy tree`,
  );
}
assertNoExternalSymlinks();

requirePath(
  path.join(
    ".zerops/deploy/.wasp/out/server/node_modules/@wasp.sh/lib-auth/package.json",
  ),
);

console.log("prepare-api-deploy: ready at .zerops/deploy/");
