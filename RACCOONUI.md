# RaccoonUI 🦝

> RaccoonAI 內部設計工具。fork 自 [`nexu-io/open-design`](https://github.com/nexu-io/open-design)，鎖品牌、加上自家工作流，**不對外發行**。

> 上游 README 在 [`README.md`](./README.md) — 那是 Open Design 產品介紹頁，這份文件是 RaccoonUI 內部使用版。

---

## 我們為什麼 fork 而不是直接用上游

| | 上游 Open Design | RaccoonUI |
|---|---|---|
| 對象 | 公開社群 / 任何 BYOK 使用者 | RaccoonAI 內部 5–10 人（James / Rindy / Zoe / Nancy / Rani 等） |
| 品牌 | 中性、不綁特定品牌 | picker 預設 `raccoonai`、design system + assets 完整內建 |
| 發行 | 桌面 app + auto-update | **腳本啟動 + 桌面捷徑**（對標 ComfyUI / SD WebUI 模式） |
| 多人協作 | 單機 | per-project git workflow（commit / push / 創 GitHub repo） |
| 變動策略 | 收 PR 演進 | daily audit upstream → selective merge → **永不 PR back** |

簡單說：**上游解了 agent harness、12 CLIs adapter、media generation pipeline 這些重活；我們把它當底座，加上品牌一致性 + 內部協作 + 不對外的取捨。**

完整戰略推導見 `C:\Users\<user>\.claude\projects\C--raccoon-agent-creative-raccoonui\memory\project_raccoonui.md`（內部 memory）。

---

## 快速啟動

> 第一次安裝請先讀 [`docs/INSTALL.md`](./docs/INSTALL.md)。已 onboard 的同事直接從「日常啟動」開始即可。

### 兩種啟動模式

| 模式 | 指令 | 用途 | 特色 |
|---|---|---|---|
| **Launcher（同事日常）** | `scripts/raccoonui/start.cmd`（Win 雙擊）<br>`pwsh -File scripts/raccoonui/start.ps1`（Win pwsh）<br>`./scripts/raccoonui/start.sh`（mac/linux） | 寫程式以外的同事 | 跑 prebuild dist/out、port 17456、自動開瀏覽器、關 console 即停 |
| **Dev（kuku 改 code 用）** | `pnpm tools-dev` | 開發 / debug | 跑 Next.js HMR + tsc-watch + Electron desktop window，改 src 自動 reload |

兩個**不能同時跑**（會搶 port）。dev 模式測完切回 launcher 前先 `pnpm tools-dev stop`。

### 安裝 / 更新 / 啟動

```powershell
# Windows — 工程同事
pwsh -File scripts/raccoonui/install.ps1   # 第一次：檢查 node 22+/git/pnpm/VS C++ → 裝 deps → seed .raccoonui/ → build
pwsh -File scripts/raccoonui/update.ps1    # 之後更新：偵測當前 branch → ff-pull → rebuild → 補 seed missing resource
pwsh -File scripts/raccoonui/start.ps1     # 啟動：daemon on http://127.0.0.1:17456 → 自動開瀏覽器
```

```bash
# macOS / Linux
./scripts/raccoonui/install.sh
./scripts/raccoonui/update.sh
./scripts/raccoonui/start.sh
```

```cmd
:: 非工程同事（Zoe / Nancy 等）— 雙擊 .cmd 不用打字
scripts\raccoonui\install.cmd
scripts\raccoonui\update.cmd
scripts\raccoonui\start.cmd
```

腳本詳細行為見 [`scripts/raccoonui/README.md`](./scripts/raccoonui/README.md)。

---

## RaccoonUI 獨有功能

上游沒有、是 RaccoonUI 自家加的部分：

### 1. RaccoonAI 品牌鎖定

- Picker 預設選 `raccoonai` design system（`apps/web/src/App.tsx`）
- `design-systems/raccoonai/` 完整 spec：DESIGN.md（746 行）+ logos（19 個）+ 字體（Pontano Sans + 思源黑體 + Urbanist）
- 4 藍 token stack：`--brand-primary` / `--button-dark-blue` / `--primary` / `--brand-light`（HSL channel 格式）

### 2. Per-project Git Workflow

每個 project 一個 GitHub repo，內部同事可獨立 commit / push / revert。Settings 內有 Project Git section + 一鍵「Create GitHub repo」。

詳見 [`docs/PROJECT-GIT-WORKFLOW.md`](./docs/PROJECT-GIT-WORKFLOW.md)。

```
POST /api/raccoonui/projects/:id/git/{init,commit,push,history,rollback,create-remote}
POST /api/raccoonui/projects/import-fs        # 同事 git clone 後自動回 DB
```

Auth 走每個人自己的 `gh` CLI，daemon 不存 token。

### 3. raigc Bridge（內部 ComfyUI / 進階生圖）

把 raigc CLI（`product/dev/raigc`）的 workflow registry 接到 picker，讓 user 直接從 Settings 選 `image_brand_route_a` 等 ComfyUI workflow 跑生圖。

```
GET  /api/raccoonui/workflows              # 列出所有 raigc workflow
POST /api/raccoonui/generate               # 直接跑某個 workflow
```

### 4. Tweaks 對 raw HTML 的支援（2026-05-08 新增）

上游 Inspect commit (38eb78a3) 把 Tweaks Picker / Pods 的 contract 收緊成「element 必須有 `data-od-id` / `data-screen-label`」。raw HTML / 手動 import 的檔案會靜默失效。

我們的處理：
- **Banner**：偵測到 boardMode 開啟但 iframe 0 個 anchor → 顯示警告（不再靜默）
- **Retag-anchors endpoint**：一鍵 mirror 既有 `id="X"` → 加上 `data-od-id="X"`，hand-written / 重生成的檔案不用走 LLM 也能 opt-in contract

```
POST /api/raccoonui/projects/:id/files/*/retag-anchors
```

### 5. Daily Upstream Audit + Protocol E2E

```
tools/raccoonui/upstream-audit.mjs          # daily cron
e2e/scripts/raccoonui-protocol.e2e.live.test.ts   # 15 個 test 守 raccoonui contract
```

每天 06:00 cron `git fetch upstream → diff 分流（auto-pass / auto-flag）→ Slack 推 #design-teamwork → 寫 audit-logs/<date>.md`。kuku review 後手動 merge。Protocol e2e 在 audit 後自動跑，紅了 Slack 警示。

完整 Fork Maintenance Best Practice（patch 標記、conflict SOP、namespace 隔離）見內部 memory `project_raccoonui.md`。

---

## 目錄結構（簡）

```
raccoonui/
├── apps/
│   ├── daemon/                       # Express + SQLite，serve API + static web/out
│   │   └── src/raccoonui/             # ★ raccoonui-only：retag-anchors / git-bridge / raigc-bridge
│   ├── web/                          # Next.js
│   └── desktop|packaged|sidecar/     # 上游 Electron 包裝層 — 我們不 build 不 ship
├── design-systems/                   # 130+ 個品牌 spec，含 raccoonai/
├── skills/                           # 74 個 skill prompt
├── scripts/raccoonui/                # ★ 同事入口：install / start / update / make-shortcut
├── tools/raccoonui/                  # ★ 自家工具：upstream-audit
├── e2e/scripts/raccoonui-protocol.*  # ★ contract e2e harness
├── docs/
│   ├── INSTALL.md                    # 一次性 onboarding
│   └── PROJECT-GIT-WORKFLOW.md       # per-project git 操作指南
├── audit-logs/                       # daily audit markdown（gitignored 內容、PATCHES.md tracked）
└── .raccoonui/                       # 用戶 runtime resource layer，gitignored
```

★ 標記的目錄 / 路徑都是 raccoonui-only，不會跟上游 conflict。

---

## 常見坑

| 症狀 | 解 |
|---|---|
| Launcher mode picker 是空的 / 沒 skills | `.raccoonui/` 漏 seed → 跑 `update.ps1` 自動補 |
| 改了 `apps/web/src/...` 但 launcher 看不到新版 | launcher 跑 prebuild、不會 HMR — 跑 `pnpm --filter @open-design/web build` 或切回 `pnpm tools-dev` |
| Tweaks Picker 在某個 HTML 上 hover 沒反應 | 檔案沒 `data-od-id`。開 Tweaks 看 banner，按「從 id 屬性自動加上錨點」 |
| 私 GitHub repo push 顯示 404 | 跑 `gh auth setup-git`（不是 `gh auth login`） |
| `git pull` 在 update.ps1 失敗 | 你 commit 領先 origin/branch — 先 push 或暫存 |
| daemon EADDRINUSE :17456 | 上次 launcher 沒 clean stop。`update.ps1` / `start.ps1` 內含 stale daemon kill，再跑一次即可 |

---

## 約定

- **永不 push PR 回上游**（鐵律）。我們是 fork、不是貢獻者。
- **永遠用 merge 不 rebase**（origin 已 push 給同事，rebase 會撕裂）。
- **改上游檔案要標 `// RACCOONUI-PATCH: <reason> — <date>`**，方便未來 conflict 一次找全。
- **新東西優先放 `raccoonui` namespace**（`apps/{daemon,web}/raccoonui/` / `scripts/raccoonui/` / `tools/raccoonui/`），最後才考慮改 upstream 檔。

完整鐵律見內部 memory `project_raccoonui.md → Fork Maintenance Best Practice`。
