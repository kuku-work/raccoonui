# RaccoonUI scripts

These scripts wrap the upstream `tools-dev` lifecycle for non-engineering
coworkers. RaccoonUI runs as a local Electron desktop app — daemon listens
on `127.0.0.1:17456`, web on `:17573`, and an Electron window opens on top.

| script | platform | purpose |
|--------|----------|---------|
| `install.{ps1,sh}` | win / mac+linux | first-time setup — checks node 24+ / git / pnpm / native build toolchain (VS C++ on Win, Xcode CLT on mac, build-essential on Linux), installs deps. Also seeds `.raccoonui/` + builds dist for the legacy launcher path; the dev start path doesn't need either, but the seed/build are kept for `tools/pack` packaged release. |
| `start.{ps1,sh}`   | same | spawn `pnpm tools-dev run` (daemon @ 17456 + web @ 17573, both from source) → wait web listen → `pnpm tools-dev start desktop` to attach Electron window → sit on tools-dev process. Reads SKILL.md / design-systems / craft directly from `creative/raccoonui/` so edits show up immediately. |
| `update.{ps1,sh}`  | same | `git fetch origin && git pull --ff-only` → reinstall |
| `install.cmd` / `start.cmd` / `update.cmd` | win | double-click wrappers around the `.ps1` scripts — for non-engineering coworkers who don't want to type `pwsh -File ...` |

每個 script 開頭都有 OS guard — 跑錯 OS 會 print 引導訊息然後 exit 1，不會繼續炸。

## First-time install

### Windows

工程同事（terminal）：

```powershell
git clone https://github.com/kuku-work/raccoonui.git
cd raccoonui
pwsh -File scripts\raccoonui\install.ps1
```

非工程同事（Zoe / Nancy 之類）：在 File Explorer 雙擊 `scripts\raccoonui\install.cmd`。

If install reports missing VS C++ Build Tools, run (admin elevation may be
required):

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --quiet"
```

Then re-run `install.ps1`.

### macOS / Linux

```bash
git clone https://github.com/kuku-work/raccoonui.git
cd raccoonui
./scripts/raccoonui/install.sh
```

If install reports missing Xcode CLT (mac) or build-essential (Linux), run
the suggested command and re-run `install.sh`.

## Daily use

```powershell
pwsh -File scripts\raccoonui\start.ps1   # Win
./scripts/raccoonui/start.sh             # mac/linux
```

An Electron desktop window opens automatically against the local web UI
(`http://127.0.0.1:17573/`). Daemon API runs on `:17456`. Picker default
is the **raccoonai** design system.

The start script wraps `pnpm tools-dev run` (daemon + web from source) and
then attaches `pnpm tools-dev start desktop` on top, so SKILL.md /
design-systems / craft / prompt-templates edits in `creative/raccoonui/`
are picked up on the next API request — no need to restart or re-seed
`.raccoonui/`. The web UI is still reachable at the URL above if you want
to open it in a browser tab as well.

Close the Electron window — the console window stays open running daemon
+ web. **Close the console window (or Ctrl-C) to stop everything**
(daemon + web + desktop).

Override ports if 17456 / 17573 collide:

```powershell
$env:OD_PORT=17500;     $env:OD_WEB_PORT=17600; pwsh -File scripts\raccoonui\start.ps1
OD_PORT=17500           OD_WEB_PORT=17600       ./scripts/raccoonui/start.sh
```

## Updating

When `#design-teamwork` posts "新版可用" (or once a week, your call):

```powershell
pwsh -File scripts\raccoonui\update.ps1   # Win
./scripts/raccoonui/update.sh             # mac/linux
```

This pulls `origin/main`, reinstalls deps, rebuilds. **Never** changes
upstream remote directly — the daily upstream audit + manual review cycle
(see `tools/raccoonui/upstream-audit.mjs`) is what keeps `origin/main` safe.

## API key risk model — read before pasting

The web app stores your Anthropic API key in **browser localStorage** (key
`open-design:config`). Upstream comment summarises the threat model: "BYOK
local-first tool, key never leaves your machine".

This means anyone with read access to your browser profile (= anyone who
has owned your laptop) can read the key. For internal RaccoonAI use this is
acceptable. **Do not paste an API key into a shared browser profile** and
**do not export `localStorage` to anyone via screen-share.**

## Troubleshooting

| Symptom | Fix |
|--------|------|
| `node_modules 不在` on `start` | run `install.{ps1,sh}` (or just `pnpm install`) first |
| `daemon is already running in namespace default` | a prior tools-dev daemon is still listening on a different port — run `pnpm tools-dev stop` then re-run start |
| `Could not locate the bindings file` for `better-sqlite3` | C++ build toolchain missing — see install instructions |
| `desktop 啟動失敗` after web is up | Electron build missing — run `pnpm install` (or `install.{ps1,sh}`) again to rebuild the binary, then re-run start. Web is still reachable at `http://127.0.0.1:17573/` in the meantime. |
| Electron window opens but stays blank | web hasn't finished compiling — wait ~10s; if still blank, check `pnpm tools-dev logs web` |
| daemon dies in < 30s | check console for errors; usually port collision (try `OD_PORT=17500 ./start.sh`) |
| `git pull` rejected during `update` | local commits diverged — contact kuku before forcing |
