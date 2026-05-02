# Branch A — Upstream Binary Route (Experiment Notes)

> **Verdict: walks into 3 hard walls. Not viable for RaccoonUI distribution.**
> Recorded 2026-05-03. Tested against `open-design-0.2.0-win-x64-setup.exe`.

## Hypothesis

Switch RaccoonUI distribution from "git clone + install.ps1 + scripts" to "download upstream `setup.exe`/`.dmg` + inject raccoonai design system via `OD_RESOURCE_ROOT` env var".

If `OD_RESOURCE_ROOT` works in the packaged binary, coworkers skip ~30 min of Node + VS BuildTools install.

## Method

1. Downloaded upstream `open-design-0.2.0-win-x64-setup.exe` (218 MB, sha256 verified `0ef09bf2...`).
2. Silent install via `setup.exe /S` → installs to `%LOCALAPPDATA%\Programs\Open Design\`.
3. Prepared test resource dir at `%USERPROFILE%\OpenDesign-test\design-systems\raccoonai\` (copied from fork).
4. Tried two injection mechanisms:
   - **Process-scope** `$env:OD_RESOURCE_ROOT = ...` then `Start-Process Open Design.exe`
   - **User-scope** `[Environment]::SetEnvironmentVariable('OD_RESOURCE_ROOT', ..., 'User')` then relaunch
5. Each time hit the daemon API (`http://127.0.0.1:<dynamic-port>/api/design-systems`) and checked whether raccoonai showed up.
6. Final fallback test: copy raccoonai/ directly into `Open Design\resources\open-design\design-systems\` and recheck API.

## Results

### Wall 1 — `OD_RESOURCE_ROOT` user env discarded by packaged shell

| Attempt | Env scope | Daemon returned | raccoonai present |
|---------|-----------|-----------------|-------------------|
| 1 | process | 130 (bundled set) | ❌ |
| 2 | user (permanent) | 130 (bundled set) | ❌ |

Why: `apps/packaged/src/sidecars.ts:124-131` — when packaged Electron spawns the daemon sidecar, it **forcibly overwrites** `OD_RESOURCE_ROOT` with `paths.resourceRoot` from packaged config. User-set env is discarded. Plus `PACKAGED_CHILD_ENV_ALLOWLIST = ["HOME","LANG","LC_ALL","LOGNAME","TMPDIR","USER"]` (sidecars.ts:30) explicitly filters the env block passed to the daemon child — `OD_RESOURCE_ROOT` isn't on the allowlist, so even if it slipped through it would be stripped.

### Wall 1b — Escape hatch via `OD_PACKAGED_CONFIG_PATH` blocked by daemon safety check

After spotting `apps/packaged/src/config.ts:8,44-55` (a higher-layer hook that's read **before** the env allowlist filtering), retested by setting `OD_PACKAGED_CONFIG_PATH=<user-config.json>` where the JSON declares a custom `resourceRoot` pointing to a user dir.

Env-propagation aside (`Start-Process` and `cmd /c start ...` both fail to propagate to the Electron main process — only `[System.Diagnostics.Process]::Start()` with `ProcessStartInfo.EnvironmentVariables` works), the chain partially succeeded:

| Layer | Result |
|-------|--------|
| Electron main reads `OD_PACKAGED_CONFIG_PATH` | ✅ honored — desktop log shows custom namespace + resourceRoot |
| Electron parent passes `OD_RESOURCE_ROOT=<user-dir>` to daemon child | ✅ child env had user dir |
| Daemon `resolveDaemonResourceRoot` accepts that user dir | ❌ **THROWS at startup** |

Daemon log captured the smoking gun:

```
Error: OD_RESOURCE_ROOT must be under the workspace root or app resources path
    at resolveDaemonResourceRoot (.../daemon/dist/src/server.js:153)
```

Source check (`apps/daemon/src/server.ts:230-243`): `safeBases = [PROJECT_ROOT, resolveProcessResourcesPath()]` — daemon validates `resourceRoot` is under one of those bases and **rejects everything else**. Both bases live inside the install dir in packaged context, so user-dir paths are structurally rejected. **The escape hatch dead-ends at the daemon's own safety check.**

Bottom line: there is no env / config combination that makes the packaged binary read raccoonai from a user-writable directory. Patching either `safeBases` or the env allowlist requires rebuilding daemon + packaged shell — i.e. forking, which is exactly what the script route already does.

### Wall 2 — Direct injection works, but is unsustainable

Copying `raccoonai/` into `%LOCALAPPDATA%\Programs\Open Design\resources\open-design\design-systems\raccoonai\` made the daemon return 131 with raccoonai immediately. So the daemon does scan the bundled dir — there's just no way to point it elsewhere.

This works once but fails as a distribution strategy:
- **Each upstream binary update wipes `resources/`** — coworkers must re-inject raccoonai after every install.
- **No Slack-triggered automation** — the user-side wrapper would have to re-copy on every launch (slow, brittle).
- Path is per-machine inside Program Files area — admin permissions if installed system-wide.

### Wall 3 — Picker default hardcoded inside `.asar`

`apps/web/src/App.tsx:94` defaults `designSystemId = 'default'`. This is compiled into the Next.js bundle that ships inside `app.asar`. Even with raccoonai injected, every coworker opens RaccoonUI to "default" not "raccoonai" — they must switch every new project.

Cannot be patched without unpacking + repacking `.asar` per upstream release.

### Bonus finding — Upstream Win auto-update is fake

`resources/app-update.yml`:
```yaml
provider: generic
url: https://updates.invalid/open-design
updaterCacheDirName: open-design-packaged-app-updater
```

`updates.invalid` is literally a non-existent domain. **The Windows v0.2.0 binary has no working auto-update** — `electron-updater` will hit DNS NXDOMAIN every check. This invalidates the earlier assumption that upstream binary brings free auto-update.

(Mac feed `latest-mac.yml` not tested on this Win machine; may or may not have the same placeholder.)

## Conclusion

Branch A cannot deliver "RaccoonAI-branded experience via upstream binary":
- No env hook → no clean injection
- Direct inject → unsustainable across updates
- Picker default → unfixable without rebuild
- Auto-update → not working anyway

The only path that delivers the brand experience is the existing **fork + script route** (Branch B's "preserve script route" position).

## Implications for INSTALL.md

The "upstream binary alternative" section drafted on `experiment/dual-path-install` (branch B) was based on an unverified assumption that `OD_RESOURCE_ROOT` would work. **That section must be rewritten** to either:
- Drop the "alternative" entirely, or
- Mention upstream binary exists but explicitly document why it cannot replace the script route (3 walls + fake auto-update)

## Cleanup actions taken

- Killed all Open Design processes
- Removed user-scope `OD_RESOURCE_ROOT` and `OD_PACKAGED_CONFIG_PATH` env vars
- Uninstalled Open Design via `Uninstall Open Design.exe /S`
- Removed `%USERPROFILE%\OpenDesign-test\`, `%USERPROFILE%\.raccoonui-test\`, `%APPDATA%\Open Design\`, `%USERPROFILE%\Downloads\upstream-od-test\`
