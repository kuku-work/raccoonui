# tools/pack

Follow the root `AGENTS.md` and `tools/AGENTS.md` first. This tool owns the repo-external packaged build/start/stop/logs command surface.

## Owns

- Local packaging orchestration for packaged Open Design artifacts.
- mac-first build/start/stop/logs smoke commands.
- Consuming sidecar/process/path primitives from `@open-design/sidecar-proto`, `@open-design/sidecar`, and `@open-design/platform`.

## Does not own

- Product business logic.
- Sidecar protocol definitions.
- A second process identity model.
- Release publishing or signing until the local packaged runtime is stable.

## Rules

- Do not hand-build `--od-stamp-*` args; use `createProcessStampArgs` with `OPEN_DESIGN_SIDECAR_CONTRACT`.
- Do not use port numbers in data/log/runtime/cache path decisions. Namespace decides paths; ports are only transient transports.
- Keep mac v1 focused on `.app` build/start/stop/logs before adding dmg/zip/signing/release/windows.
