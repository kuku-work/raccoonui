import { join } from "node:path";

import type { PackagedConfig } from "./config.js";

export type PackagedNamespacePaths = {
  cacheRoot: string;
  dataRoot: string;
  logsRoot: string;
  namespaceRoot: string;
  resourceRoot: string;
  runtimeRoot: string;
};

export function resolvePackagedNamespacePaths(
  config: PackagedConfig,
  namespace = config.namespace,
): PackagedNamespacePaths {
  const namespaceRoot = join(config.namespaceBaseRoot, namespace);

  return {
    cacheRoot: join(namespaceRoot, "cache"),
    dataRoot: join(namespaceRoot, "data"),
    logsRoot: join(namespaceRoot, "logs"),
    namespaceRoot,
    resourceRoot: config.resourceRoot,
    runtimeRoot: join(namespaceRoot, "runtime"),
  };
}
