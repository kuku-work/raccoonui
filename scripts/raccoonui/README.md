# RaccoonUI scripts

These scripts replace the upstream desktop-app workflow (Electron / signing /
auto-update). RaccoonUI runs as a local web app — daemon listens on
`127.0.0.1:17456`, browser opens automatically.

| script | platform | purpose |
|--------|----------|---------|
| `install.{ps1,sh}` | win / mac+linux | first-time setup — checks node 22+ / git / pnpm / native build toolchain (VS C++ on Win, Xcode CLT on mac, build-essential on Linux), installs deps, seeds `.raccoonui/`, builds daemon + web |
| `start.{ps1,sh}`   | same | spawn daemon (`OD_RESOURCE_ROOT=.raccoonui`, port 17456) → wait listen → open browser → sit on daemon process |
| `update.{ps1,sh}`  | same | `git fetch origin && git pull --ff-only` → reinstall → rebuild |

## First-time install

### Windows

```powershell
git clone https://github.com/kuku-work/open-design.git
cd open-design
pwsh -File scripts\raccoonui\install.ps1
```

If install reports missing VS C++ Build Tools, run (admin elevation may be
required):

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --quiet"
```

Then re-run `install.ps1`.

### macOS / Linux

```bash
git clone https://github.com/kuku-work/open-design.git
cd open-design
./scripts/raccoonui/install.sh
```

If install reports missing Xcode CLT (mac) or build-essential (Linux), run
the suggested command and re-run `install.sh`.

## Daily use

```powershell
pwsh -File scripts\raccoonui\start.ps1   # Win
./scripts/raccoonui/start.sh             # mac/linux
```

Browser opens to `http://127.0.0.1:17456/`. Picker default is the
**raccoonai** design system. Close the browser tab — the console window stays
open running the daemon. Close the window (or Ctrl-C) to stop the daemon.

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
| `daemon 還沒 build` on `start` | run `install.{ps1,sh}` first |
| `Could not locate the bindings file` for `better-sqlite3` | C++ build toolchain missing — see install instructions |
| browser opens but daemon dies in < 30s | check console for errors; usually port collision (try `OD_PORT=17500 ./start.sh`) |
| `git pull` rejected during `update` | local commits diverged — contact kuku before forcing |
