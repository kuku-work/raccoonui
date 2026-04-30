import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, open, type FileHandle } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import {
  APP_KEYS,
  OPEN_DESIGN_SIDECAR_CONTRACT,
  SIDECAR_ENV,
  SIDECAR_MESSAGES,
  SIDECAR_MODES,
  type AppKey,
  type DaemonStatusSnapshot,
  type SidecarStamp,
  type WebStatusSnapshot,
} from "@open-design/sidecar-proto";
import {
  createSidecarLaunchEnv,
  requestJsonIpc,
  resolveAppIpcPath,
  type SidecarRuntimeContext,
} from "@open-design/sidecar";
import { createProcessStampArgs, stopProcesses, waitForProcessExit } from "@open-design/platform";

import type { PackagedNamespacePaths } from "./paths.js";

const require = createRequire(import.meta.url);

export type PackagedSidecarHandle = {
  close(): Promise<void>;
  daemon: DaemonStatusSnapshot;
  web: WebStatusSnapshot;
};

type ManagedSidecarChild = {
  app: AppKey;
  child: ChildProcess;
  ipcPath: string;
  logHandle: FileHandle;
};

function resolveSidecarEntry(packageName: string, exportName: string): string {
  return require.resolve(`${packageName}/${exportName}`);
}

function logPathFor(paths: PackagedNamespacePaths, app: AppKey): string {
  return join(paths.logsRoot, app, "latest.log");
}

async function openLog(path: string): Promise<FileHandle> {
  await mkdir(dirname(path), { recursive: true });
  return await open(path, "w");
}

async function waitForStatus<T>(
  ipcPath: string,
  isReady: (status: T) => boolean,
  timeoutMs = 35_000,
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const status = await requestJsonIpc<T>(
        ipcPath,
        { type: SIDECAR_MESSAGES.STATUS },
        { timeoutMs: 800 },
      );
      if (isReady(status)) return status;
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }

  throw new Error(
    `timed out waiting for sidecar status at ${ipcPath}${
      lastError instanceof Error ? ` (${lastError.message})` : ""
    }`,
  );
}

function extractPort(url: string): string {
  const parsed = new URL(url);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
}

async function spawnSidecarChild(options: {
  app: AppKey;
  entryPath: string;
  env: NodeJS.ProcessEnv;
  nodeCommand: string | null;
  paths: PackagedNamespacePaths;
  runtime: SidecarRuntimeContext<SidecarStamp>;
}): Promise<ManagedSidecarChild> {
  const ipcPath = resolveAppIpcPath({
    app: options.app,
    contract: OPEN_DESIGN_SIDECAR_CONTRACT,
    namespace: options.runtime.namespace,
  });
  const stamp = {
    app: options.app,
    ipc: ipcPath,
    mode: SIDECAR_MODES.RUNTIME,
    namespace: options.runtime.namespace,
    source: options.runtime.source,
  } satisfies SidecarStamp;
  const logHandle = await openLog(logPathFor(options.paths, options.app));
  const childEnv = createSidecarLaunchEnv({
    base: options.paths.runtimeRoot,
    contract: OPEN_DESIGN_SIDECAR_CONTRACT,
    extraEnv: {
      ...process.env,
      ...options.env,
      NODE_ENV: "production",
      ...(options.nodeCommand == null ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
    },
    stamp,
  });
  const command = options.nodeCommand ?? process.execPath;
  const child = spawn(
    command,
    [options.entryPath, ...createProcessStampArgs(stamp, OPEN_DESIGN_SIDECAR_CONTRACT)],
    {
      cwd: process.cwd(),
      env: childEnv,
      stdio: ["ignore", logHandle.fd, logHandle.fd],
      windowsHide: true,
    },
  );

  await new Promise<void>((resolveSpawn, rejectSpawn) => {
    child.once("error", rejectSpawn);
    child.once("spawn", resolveSpawn);
  });

  return { app: options.app, child, ipcPath, logHandle };
}

async function closeManagedChild(child: ManagedSidecarChild): Promise<void> {
  try {
    await requestJsonIpc(child.ipcPath, { type: SIDECAR_MESSAGES.SHUTDOWN }, { timeoutMs: 1200 });
  } catch {
    // Fall through to process cleanup.
  }

  if (!(await waitForProcessExit(child.child.pid, 5000))) {
    await stopProcesses([child.child.pid]);
  }

  await child.logHandle.close().catch(() => undefined);
}

export async function startPackagedSidecars(
  runtime: SidecarRuntimeContext<SidecarStamp>,
  paths: PackagedNamespacePaths,
  options: { nodeCommand: string | null },
): Promise<PackagedSidecarHandle> {
  await mkdir(paths.namespaceRoot, { recursive: true });
  await mkdir(paths.cacheRoot, { recursive: true });
  await mkdir(paths.dataRoot, { recursive: true });
  await mkdir(paths.logsRoot, { recursive: true });
  await mkdir(paths.runtimeRoot, { recursive: true });

  const children: ManagedSidecarChild[] = [];

  try {
    const daemon = await spawnSidecarChild({
      app: APP_KEYS.DAEMON,
      entryPath: resolveSidecarEntry("@open-design/daemon", "sidecar"),
      env: {
        [SIDECAR_ENV.DAEMON_PORT]: "0",
        OD_DATA_DIR: paths.dataRoot,
        OD_RESOURCE_ROOT: paths.resourceRoot,
      },
      nodeCommand: options.nodeCommand,
      paths,
      runtime,
    });
    children.push(daemon);
    const daemonStatus = await waitForStatus<DaemonStatusSnapshot>(
      daemon.ipcPath,
      (status) => status.url != null,
    );
    if (daemonStatus.url == null) throw new Error("daemon did not report a URL");

    const web = await spawnSidecarChild({
      app: APP_KEYS.WEB,
      entryPath: resolveSidecarEntry("@open-design/web", "sidecar"),
      env: {
        [SIDECAR_ENV.DAEMON_PORT]: extractPort(daemonStatus.url),
        [SIDECAR_ENV.WEB_PORT]: "0",
        OD_WEB_OUTPUT_MODE: "server",
        PORT: "0",
      },
      nodeCommand: options.nodeCommand,
      paths,
      runtime,
    });
    children.push(web);
    const webStatus = await waitForStatus<WebStatusSnapshot>(
      web.ipcPath,
      (status) => status.url != null,
    );
    if (webStatus.url == null) throw new Error("web did not report a URL");

    return {
      daemon: daemonStatus,
      web: webStatus,
      async close() {
        for (const child of [...children].reverse()) {
          await closeManagedChild(child).catch((error: unknown) => {
            console.error(`failed to close packaged ${child.app} sidecar`, error);
          });
        }
      },
    };
  } catch (error) {
    for (const child of [...children].reverse()) {
      await closeManagedChild(child).catch(() => undefined);
    }
    throw error;
  }
}
