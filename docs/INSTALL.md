# RaccoonUI 安裝指南

> 給 RaccoonAI 內部同事 — 雙擊桌面捷徑就能用的設計工具

---

## 它是什麼

RaccoonUI 是一個跑在你電腦上的網頁工具：

1. 雙擊桌面捷徑「**RaccoonUI**」
2. 終端機快閃，預設瀏覽器自動開 `http://localhost:17456/`
3. 直接套 RaccoonAI design system 給 LLM 用，不需要 setup dev environment 也不用記指令

**純內部使用** — 不對外發布、沒做 code-sign cert。Windows SmartScreen / macOS Gatekeeper 第一次會跳警告，按下「仍要執行」/「允許」即可。

---

## 系統需求

| 項目 | 最低 |
|------|------|
| OS | Windows 10+ / macOS 12+ / Ubuntu 22+ |
| 硬碟 | ~3 GB（含 native build toolchain） |
| RAM | 4 GB |
| 網路 | 首次安裝下載 deps，之後完全本地運作 |

---

## 第一次安裝（一次性，工程同事 ~5 分鐘 / 非工程同事 ~15–20 分鐘含環境設定）

### Step 1 — 拿到 RaccoonUI 程式碼

開 PowerShell（Win） / Terminal（Mac），跑：

```bash
git clone https://github.com/kuku-work/open-design.git
cd open-design
```

> 沒 `git` 的話：到 [git-scm.com](https://git-scm.com/) 下載安裝（Win/Mac 5 分鐘）。

### Step 2 — 跑安裝腳本

#### Windows

**非工程同事（推薦）**：用「檔案總管」進入 `scripts\raccoonui\` 資料夾，**雙擊 `install.cmd`**。會跳一個黑底終端機視窗自動跑安裝。

**工程同事**：在 PowerShell 跑

```powershell
pwsh -File scripts\raccoonui\install.ps1
```

#### macOS

```bash
./scripts/raccoonui/install.sh
```

#### Linux（Ubuntu / Debian / Fedora）

```bash
./scripts/raccoonui/install.sh
```

### Step 3 — 看到「✅ RaccoonUI 安裝完成」

腳本會自動偵測你機器缺什麼 + **直接告訴你怎麼裝**。如果它說缺某個東西（Node / VS C++ tools / Xcode CLT），照它指示裝完，**再跑一次 install 腳本即可**。常見缺件：

| 缺件 | 平台 | 解 |
|------|------|---|
| `node` < 22 | 全平台 | Win: `winget install OpenJS.NodeJS.LTS` / Mac: `brew install node@22` / Linux: 用 [nvm](https://github.com/nvm-sh/nvm) `nvm install 22` |
| `git` | 全平台 | Win: `winget install Git.Git` / Mac: `brew install git` / Linux: `sudo apt install git` |
| `pnpm` | 全平台 | install 腳本自動裝（透過 `npm install -g pnpm`），不用人工處理 |
| **VS C++ Build Tools** | Windows | 腳本印出的 `setup.exe modify ... --add VCTools ...` 那一行**用 admin PowerShell 跑**，5–15 分鐘 |
| **Xcode Command Line Tools** | macOS | `xcode-select --install` → 跳對話框點「Install」，5–10 分鐘 |
| `build-essential` | Linux | `sudo apt install build-essential`（Debian/Ubuntu）/ `sudo dnf groupinstall 'Development Tools'`（Fedora） |

裝完後桌面會出現「**RaccoonUI**」捷徑。

---

## 日常使用

### 啟動

雙擊桌面「**RaccoonUI**」捷徑。

- **Windows**: 終端機開啟 → daemon listening → 預設瀏覽器自動開 `http://localhost:17456/`
- **macOS**: Terminal 開啟 → 同上
- **Linux**: 終端機開啟 → 同上

關掉瀏覽器分頁後，**終端機視窗仍在跑 daemon**。不用了直接關終端機視窗（daemon 自動 SIGTERM 退出）。

### Picker default

開 RaccoonUI 預設選的是 **raccoonai design system**（dropdown 仍可切其他 70+ 範本，看靈感用）。

### 換 port（同 port 衝突時）

預設用 `17456`。如果跟其他服務衝突：

```powershell
# Windows
$env:OD_PORT=17500; pwsh -File scripts\raccoonui\start.ps1
```

```bash
# macOS / Linux
OD_PORT=17500 ./scripts/raccoonui/start.sh
```

---

## ⚠️ API key 設定 — 第一次用必讀

第一次開 RaccoonUI 會在 Settings 對話框要你貼 **Anthropic API key**。在 `#design-teamwork` 找 Kuku 拿。

### 它存在哪？

瀏覽器的 `localStorage`（key: `open-design:config`），**明文**。

### 風險模型（請理解）

- 任何能讀你 browser profile 的人 = 拿得到你的 API key
- 你的 API key = 能呼叫 Anthropic API 花錢
- 如果你的 browser profile 同步到雲端（Chrome / Edge sync）= key 也跟著上雲

### 對策（同事務必遵守）

- ❌ 不要把 RaccoonUI 跑在公用機器、共用的 Windows account
- ❌ 不要在 screen-share / remote-desktop 時打開 browser DevTools 看 `localStorage`
- ❌ 不要把 Anthropic API key 貼在 Slack / Email / 任何 channel — 直接到 RaccoonUI Settings 貼即可
- ✅ 不用了清掉 browser data（Chrome → Settings → Clear browsing data → 清 cookies + site data for `localhost:17456`）

### 為什麼不用 OS keyring 加密存？

我們刻意沿用上游 BYOK 設計，避免改 daemon code 跟上游 diverge。對 5–10 人內部使用這個 risk model 可接受。對外 product 我們不會這樣設計。

---

## 更新

當 `#design-teamwork` 通知「**RaccoonUI 有新版**」（每幾天一次，Kuku 跑 daily upstream audit + manual review 後決定 push 自家 fork）：

- **Windows 非工程同事**：雙擊 `scripts\raccoonui\update.cmd`
- **Windows 工程同事**：`pwsh -File scripts\raccoonui\update.ps1`
- **macOS / Linux**：`./scripts/raccoonui/update.sh`

跑 ~1–2 分鐘。結束後重新雙擊桌面 RaccoonUI 捷徑即生效。

---

## 常見問題 / Troubleshooting

### Q: 安裝時跳 `❌ Visual Studio C++ Desktop Workload 未安裝`

A: install.ps1 已經幫你印好 `setup.exe modify` 命令，**用 admin PowerShell** 跑那一行就好（不要直接複製貼上原始的 `winget install` — 那個對「已 install 的 VS」沒效，腳本幫你判斷後給的命令才對）。

### Q: 安裝時跳 `❌ Xcode Command Line Tools 未安裝`（Mac）

A: 跑 `xcode-select --install`，跳對話框點「Install」，等 5–10 分鐘下載。

### Q: 雙擊桌面捷徑啟動但 daemon 立刻死掉，console 看到 `Could not locate the bindings file` (better-sqlite3)

A: native binding 沒 build。跑：

```bash
pnpm -r rebuild better-sqlite3
```

如果還 fail，重 install 一次：

```bash
# Win
Remove-Item -Recurse -Force node_modules
pwsh -File scripts\raccoonui\install.ps1

# Mac/Linux
rm -rf node_modules
./scripts/raccoonui/install.sh
```

### Q: Windows SmartScreen 跳「Windows 已保護你的電腦 — 不明發行者」

A: 點「**其他資訊**」→「**仍要執行**」。RaccoonUI 內部使用沒簽 cert，是預期警告。同事間互信即可。

### Q: macOS Gatekeeper 不讓 .command 跑

A: 第一次右鍵 `RaccoonUI.command` → 開啟 → 系統設定 → 隱私權與安全性 → 「仍要打開」。之後雙擊就行。

### Q: 桌面捷徑看不到 / 沒生成

A: 手動跑：

```bash
# Win
pwsh -File scripts\raccoonui\make-shortcut.ps1

# Mac/Linux
./scripts/raccoonui/make-shortcut.sh
```

### Q: 我想換捷徑 icon 成 RaccoonAI logo

A:
- **Windows**: 把 `design-systems\raccoonai\assets\logo-mark-darkblue-bg.svg` 用 [convertio.co/svg-ico/](https://convertio.co/svg-ico/) 轉成 256×256 .ico，存成 `.raccoonui\icon.ico`，然後重跑 `make-shortcut.ps1`
- **macOS**: Cmd+I 看捷徑資訊 → 拖 PNG 圖到左上角小圖示替換
- **Linux**: 編輯 `~/Desktop/RaccoonUI.desktop` 的 `Icon=` 路徑

### Q: 我想停用 daemon 但桌面捷徑沒退出

A: 在 daemon 跑的那個終端機視窗按 `Ctrl+C`，或直接關視窗。daemon 有 graceful shutdown trap。

---

## 回報 bug

到 `#design-teamwork` 找 Kuku 或 @學弟（RaccoonUI agent），附上：

1. 你看到的錯誤訊息（截圖最好）
2. 你跑了什麼指令 / 動作
3. OS + 版本
   - Win: PowerShell 跑 `winver`
   - Mac/Linux: terminal 跑 `uname -a`
4. RaccoonUI 版本: terminal 進 fork-root 跑 `git rev-parse --short HEAD`

---

## 技術細節（給工程同事）

完整 reference 看 `scripts/raccoonui/README.md`，含：

- Daily upstream audit pipeline 怎麼運作（`tools/raccoonui/upstream-audit.mjs`）
- Fork best practice（merge 不 rebase / RACCOONUI-PATCH 標記 / commit prefix 等）
- daemon 路徑配置（`OD_RESOURCE_ROOT=.raccoonui` ENV）
- Web picker default 改動點（`apps/web/src/App.tsx:94`）

memory 完整脈絡：`/recall open-design`（給 Claude Code agent 用）。
