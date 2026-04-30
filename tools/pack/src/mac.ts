import { execFile } from "node:child_process";
import { access, chmod, cp, mkdir, open, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { promisify } from "node:util";

import {
  APP_KEYS,
  OPEN_DESIGN_SIDECAR_CONTRACT,
  SIDECAR_MESSAGES,
  SIDECAR_MODES,
  SIDECAR_SOURCES,
  type DesktopStatusSnapshot,
  type SidecarStamp,
} from "@open-design/sidecar-proto";
import { createSidecarLaunchEnv, requestJsonIpc, resolveAppIpcPath } from "@open-design/sidecar";
import {
  collectProcessTreePids,
  createPackageManagerInvocation,
  createProcessStampArgs,
  listProcessSnapshots,
  matchesStampedProcess,
  readLogTail,
  spawnBackgroundProcess,
  stopProcesses,
} from "@open-design/platform";

import type { ToolPackConfig } from "./config.js";

const execFileAsync = promisify(execFile);
const PRODUCT_NAME = "Open Design";

const INTERNAL_PACKAGES = [
  { directory: "packages/contracts", name: "@open-design/contracts" },
  { directory: "packages/sidecar-proto", name: "@open-design/sidecar-proto" },
  { directory: "packages/sidecar", name: "@open-design/sidecar" },
  { directory: "packages/platform", name: "@open-design/platform" },
  { directory: "apps/daemon", name: "@open-design/daemon" },
  { directory: "apps/web", name: "@open-design/web" },
  { directory: "apps/desktop", name: "@open-design/desktop" },
  { directory: "apps/packaged", name: "@open-design/packaged" },
] as const;

type PackedTarballInfo = {
  fileName: string;
  packageName: (typeof INTERNAL_PACKAGES)[number]["name"];
};

type MacPaths = {
  appBuilderConfigPath: string;
  appBuilderOutputRoot: string;
  appExecutablePath: string;
  appPath: string;
  assembledAppRoot: string;
  assembledMainEntryPath: string;
  assembledPackageJsonPath: string;
  packagedConfigPath: string;
  resourceRoot: string;
  tarballsRoot: string;
};

export type MacPackResult = {
  appPath: string;
  outputRoot: string;
  resourceRoot: string;
  runtimeNamespaceRoot: string;
  to: "app";
};

export type MacStartResult = {
  appPath: string;
  logPath: string;
  namespace: string;
  pid: number;
  status: DesktopStatusSnapshot | null;
};

export type MacStopResult = {
  gracefulRequested: boolean;
  namespace: string;
  remainingPids: number[];
  status: "not-running" | "stopped" | "partial";
  stoppedPids: number[];
};

function resolveMacAppOutputDirectoryName(): string {
  return process.arch === "arm64" ? "mac-arm64" : "mac";
}

function resolveMacPaths(config: ToolPackConfig): MacPaths {
  const namespaceRoot = config.roots.output.namespaceRoot;
  const appBuilderOutputRoot = config.roots.output.appBuilderRoot;
  const appPath = join(
    appBuilderOutputRoot,
    resolveMacAppOutputDirectoryName(),
    `${PRODUCT_NAME}.app`,
  );

  return {
    appBuilderConfigPath: join(namespaceRoot, "builder-config.json"),
    appBuilderOutputRoot,
    appExecutablePath: join(appPath, "Contents", "MacOS", PRODUCT_NAME),
    appPath,
    assembledAppRoot: join(namespaceRoot, "assembled", "app"),
    assembledMainEntryPath: join(namespaceRoot, "assembled", "app", "main.cjs"),
    assembledPackageJsonPath: join(namespaceRoot, "assembled", "app", "package.json"),
    packagedConfigPath: join(namespaceRoot, "open-design-config.json"),
    resourceRoot: join(namespaceRoot, "resources", "open-design"),
    tarballsRoot: join(namespaceRoot, "tarballs"),
  };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runPnpm(
  config: ToolPackConfig,
  args: string[],
  extraEnv: NodeJS.ProcessEnv = {},
): Promise<void> {
  const invocation = createPackageManagerInvocation(args, process.env);
  await execFileAsync(invocation.command, invocation.args, {
    cwd: config.workspaceRoot,
    env: { ...process.env, ...extraEnv },
  });
}

async function runNpmInstall(appRoot: string): Promise<void> {
  await execFileAsync("npm", ["install", "--omit=dev", "--no-package-lock"], {
    cwd: appRoot,
    env: process.env,
  });
}

async function buildWorkspaceArtifacts(config: ToolPackConfig): Promise<void> {
  const webNextEnvPath = join(config.workspaceRoot, "apps", "web", "next-env.d.ts");
  const previousWebNextEnv = await readFile(webNextEnvPath, "utf8").catch(() => null);

  await runPnpm(config, ["--filter", "@open-design/sidecar-proto", "build"]);
  await runPnpm(config, ["--filter", "@open-design/sidecar", "build"]);
  await runPnpm(config, ["--filter", "@open-design/platform", "build"]);
  await runPnpm(config, ["--filter", "@open-design/daemon", "build"]);
  try {
    await runPnpm(config, ["--filter", "@open-design/web", "build"], {
      OD_WEB_OUTPUT_MODE: "server",
    });
    await runPnpm(config, ["--filter", "@open-design/web", "build:sidecar"]);
  } finally {
    if (previousWebNextEnv == null) {
      await rm(webNextEnvPath, { force: true });
    } else {
      await writeFile(webNextEnvPath, previousWebNextEnv, "utf8");
    }
  }
  await runPnpm(config, ["--filter", "@open-design/desktop", "build"]);
  await runPnpm(config, ["--filter", "@open-design/packaged", "build"]);
}

async function copyResourceTree(config: ToolPackConfig, paths: MacPaths): Promise<void> {
  await rm(paths.resourceRoot, { force: true, recursive: true });
  await mkdir(paths.resourceRoot, { recursive: true });

  await cp(join(config.workspaceRoot, "skills"), join(paths.resourceRoot, "skills"), {
    recursive: true,
  });
  await cp(join(config.workspaceRoot, "design-systems"), join(paths.resourceRoot, "design-systems"), {
    recursive: true,
  });
  await cp(join(config.workspaceRoot, "assets", "frames"), join(paths.resourceRoot, "frames"), {
    recursive: true,
  });
  await mkdir(join(paths.resourceRoot, "bin"), { recursive: true });
  await cp(process.execPath, join(paths.resourceRoot, "bin", "node"));
  await chmod(join(paths.resourceRoot, "bin", "node"), 0o755);
}

async function collectWorkspaceTarballs(
  config: ToolPackConfig,
  paths: MacPaths,
): Promise<PackedTarballInfo[]> {
  await rm(paths.tarballsRoot, { force: true, recursive: true });
  await mkdir(paths.tarballsRoot, { recursive: true });
  const packedTarballs: PackedTarballInfo[] = [];

  for (const packageInfo of INTERNAL_PACKAGES) {
    const beforeEntries = new Set(await readdir(paths.tarballsRoot));
    await runPnpm(config, [
      "-C",
      packageInfo.directory,
      "pack",
      "--pack-destination",
      paths.tarballsRoot,
    ]);
    const afterEntries = await readdir(paths.tarballsRoot);
    const newEntries = afterEntries.filter((entry) => !beforeEntries.has(entry));
    if (newEntries.length !== 1 || newEntries[0] == null) {
      throw new Error(`expected one tarball for ${packageInfo.name}, got ${newEntries.length}`);
    }
    packedTarballs.push({ fileName: newEntries[0], packageName: packageInfo.name });
  }

  return packedTarballs;
}

async function writeAssembledApp(
  config: ToolPackConfig,
  paths: MacPaths,
  packedTarballs: PackedTarballInfo[],
): Promise<void> {
  await rm(join(config.roots.output.namespaceRoot, "assembled"), { force: true, recursive: true });
  await mkdir(paths.assembledAppRoot, { recursive: true });
  const tarballByPackage = Object.fromEntries(
    packedTarballs.map((entry) => [entry.packageName, entry.fileName] as const),
  );
  const dependencies = Object.fromEntries(
    INTERNAL_PACKAGES.map((packageInfo) => {
      const tarball = tarballByPackage[packageInfo.name];
      if (tarball == null) throw new Error(`missing tarball for ${packageInfo.name}`);
      return [packageInfo.name, `file:${relative(paths.assembledAppRoot, join(paths.tarballsRoot, tarball))}`];
    }),
  );

  await writeFile(
    paths.assembledPackageJsonPath,
    `${JSON.stringify(
      {
        dependencies,
        description: "Open Design packaged runtime",
        main: "./main.cjs",
        name: "open-design-packaged-app",
        private: true,
        productName: PRODUCT_NAME,
        version: "0.1.0",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    paths.assembledMainEntryPath,
    'import("@open-design/packaged").catch((error) => {\n  console.error("packaged entry failed", error);\n  process.exit(1);\n});\n',
    "utf8",
  );
  await writeFile(
    paths.packagedConfigPath,
    `${JSON.stringify(
      {
        namespace: config.namespace,
        namespaceBaseRoot: config.roots.runtime.namespaceBaseRoot,
        nodeCommandRelative: "open-design/bin/node",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await runNpmInstall(paths.assembledAppRoot);
}

async function runElectronBuilder(config: ToolPackConfig, paths: MacPaths): Promise<void> {
  const builderConfig = {
    appId: "io.open-design.desktop",
    asar: false,
    buildDependenciesFromSource: false,
    compression: "store",
    directories: {
      output: paths.appBuilderOutputRoot,
    },
    electronDist: config.electronDistPath,
    electronVersion: config.electronVersion,
    executableName: PRODUCT_NAME,
    extraMetadata: {
      main: "./main.cjs",
      name: "open-design-packaged-app",
      productName: PRODUCT_NAME,
      version: "0.1.0",
    },
    extraResources: [
      { from: paths.resourceRoot, to: "open-design" },
      { from: paths.packagedConfigPath, to: "open-design-config.json" },
    ],
    files: ["**/*", "!**/node_modules/.bin", "!**/node_modules/electron{,/**/*}"],
    mac: {
      category: "public.app-category.developer-tools",
      identity: null,
      target: ["dir"],
    },
    nodeGypRebuild: false,
    npmRebuild: false,
    productName: PRODUCT_NAME,
  };

  await rm(paths.appBuilderOutputRoot, { force: true, recursive: true });
  await mkdir(dirname(paths.appBuilderConfigPath), { recursive: true });
  await writeFile(paths.appBuilderConfigPath, `${JSON.stringify(builderConfig, null, 2)}\n`, "utf8");
  await execFileAsync(process.execPath, [
    config.electronBuilderCliPath,
    "--mac",
    "--projectDir",
    paths.assembledAppRoot,
    "--config",
    paths.appBuilderConfigPath,
    "--publish",
    "never",
  ], {
    cwd: config.workspaceRoot,
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: "false",
    },
  });
}

export async function packMac(config: ToolPackConfig): Promise<MacPackResult> {
  const paths = resolveMacPaths(config);
  await buildWorkspaceArtifacts(config);
  await copyResourceTree(config, paths);
  const tarballs = await collectWorkspaceTarballs(config, paths);
  await writeAssembledApp(config, paths, tarballs);
  await runElectronBuilder(config, paths);

  return {
    appPath: paths.appPath,
    outputRoot: config.roots.output.namespaceRoot,
    resourceRoot: paths.resourceRoot,
    runtimeNamespaceRoot: config.roots.runtime.namespaceRoot,
    to: config.to,
  };
}

function desktopStamp(config: ToolPackConfig): SidecarStamp {
  return {
    app: APP_KEYS.DESKTOP,
    ipc: resolveAppIpcPath({
      app: APP_KEYS.DESKTOP,
      contract: OPEN_DESIGN_SIDECAR_CONTRACT,
      namespace: config.namespace,
    }),
    mode: SIDECAR_MODES.RUNTIME,
    namespace: config.namespace,
    source: SIDECAR_SOURCES.TOOLS_PACK,
  };
}

function desktopLogPath(config: ToolPackConfig): string {
  return join(config.roots.runtime.namespaceRoot, "logs", APP_KEYS.DESKTOP, "latest.log");
}

async function waitForDesktopStatus(config: ToolPackConfig, timeoutMs = 45_000): Promise<DesktopStatusSnapshot | null> {
  const stamp = desktopStamp(config);
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await requestJsonIpc<DesktopStatusSnapshot>(stamp.ipc, { type: SIDECAR_MESSAGES.STATUS }, { timeoutMs: 1000 });
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 200));
    }
  }
  return null;
}

export async function startPackedMacApp(config: ToolPackConfig): Promise<MacStartResult> {
  const paths = resolveMacPaths(config);
  if (!(await pathExists(paths.appExecutablePath))) {
    throw new Error(`no mac .app executable found at ${paths.appExecutablePath}; run tools-pack mac build --to app first`);
  }
  const stamp = desktopStamp(config);
  const logPath = desktopLogPath(config);
  await mkdir(dirname(logPath), { recursive: true });
  const logHandle = await open(logPath, "w");

  try {
    const spawned = await spawnBackgroundProcess({
      args: createProcessStampArgs(stamp, OPEN_DESIGN_SIDECAR_CONTRACT),
      command: paths.appExecutablePath,
      cwd: paths.appPath,
      env: createSidecarLaunchEnv({
        base: join(config.roots.runtime.namespaceRoot, "runtime"),
        contract: OPEN_DESIGN_SIDECAR_CONTRACT,
        extraEnv: process.env,
        stamp,
      }),
      logFd: logHandle.fd,
    });
    const status = await waitForDesktopStatus(config);
    return {
      appPath: paths.appPath,
      logPath,
      namespace: config.namespace,
      pid: spawned.pid,
      status,
    };
  } finally {
    await logHandle.close().catch(() => undefined);
  }
}

async function findToolsPackProcessTree(config: ToolPackConfig): Promise<number[]> {
  const processes = await listProcessSnapshots();
  const rootPids = processes
    .filter((processInfo) =>
      matchesStampedProcess(processInfo, {
        mode: SIDECAR_MODES.RUNTIME,
        namespace: config.namespace,
        source: SIDECAR_SOURCES.TOOLS_PACK,
      }, OPEN_DESIGN_SIDECAR_CONTRACT),
    )
    .map((processInfo) => processInfo.pid);
  return collectProcessTreePids(processes, rootPids);
}

async function waitForNoToolsPackProcesses(config: ToolPackConfig, timeoutMs = 6000): Promise<number[]> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const pids = await findToolsPackProcessTree(config);
    if (pids.length === 0) return [];
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  return await findToolsPackProcessTree(config);
}

export async function stopPackedMacApp(config: ToolPackConfig): Promise<MacStopResult> {
  const stamp = desktopStamp(config);
  const before = await findToolsPackProcessTree(config);
  let gracefulRequested = false;

  try {
    await requestJsonIpc(stamp.ipc, { type: SIDECAR_MESSAGES.SHUTDOWN }, { timeoutMs: 1500 });
    gracefulRequested = true;
  } catch {
    gracefulRequested = false;
  }

  const remainingAfterGraceful = gracefulRequested ? await waitForNoToolsPackProcesses(config) : before;
  if (remainingAfterGraceful.length === 0) {
    return {
      gracefulRequested,
      namespace: config.namespace,
      remainingPids: [],
      status: before.length === 0 ? "not-running" : "stopped",
      stoppedPids: before,
    };
  }

  const stopped = await stopProcesses(remainingAfterGraceful);
  return {
    gracefulRequested,
    namespace: config.namespace,
    remainingPids: stopped.remainingPids,
    status: stopped.remainingPids.length === 0 ? "stopped" : "partial",
    stoppedPids: stopped.stoppedPids,
  };
}

export async function readPackedMacLogs(config: ToolPackConfig) {
  const entries = await Promise.all(
    [APP_KEYS.DESKTOP, APP_KEYS.WEB, APP_KEYS.DAEMON].map(async (app) => {
      const logPath = join(config.roots.runtime.namespaceRoot, "logs", app, "latest.log");
      return [app, { lines: await readLogTail(logPath, 200), logPath }] as const;
    }),
  );

  return {
    logs: Object.fromEntries(entries),
    namespace: config.namespace,
  };
}
