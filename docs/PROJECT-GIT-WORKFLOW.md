# RaccoonUI Project Git Workflow

> **每個 raccoonui project 一個 GitHub repo**,版控 + 多人協作走 git。
> 對應 daemon endpoint: `/api/raccoonui/projects/:id/git/*` + `/api/raccoonui/projects/import-fs`。

---

## 為什麼

raccoonui project 的「檔案」(HTML / SVG / sketches 等) 自然存 filesystem,但 daemon metadata (project name, skill, design system) 在 SQLite。**git 只 sync filesystem,不 sync DB**。

我們做了兩個處理：

1. **每個 project dir 內塞 `.raccoonui-project.json` sidecar** — daemon 寫 DB 時也 dual-write 到這個檔,git 一起 sync
2. **`POST /api/raccoonui/projects/import-fs`** — 同事 git pull 後,daemon 掃這個 sidecar 反向 INSERT 進本地 DB

對 user 來說: 創 project + push 後,別人 clone + import,他的 picker 就有同樣 project。

---

## 系統需求

| 工具 | 用途 | 檢查 |
|---|---|---|
| `gh` CLI | 創 GitHub repo + auth | `gh auth status` |
| `git` | 本地 commit / pull | `git --version` |
| daemon 跑著 | 執行 git ops | `./scripts/raccoonui/start.sh`(mac/linux) / `start.ps1`(win) |

`gh` token scope **必須含 `repo`**(預設登入會給)。`delete_repo` **不需要**(我們不從 daemon 砍 remote)。

---

## Flow 1 — 個人 backup（單人,只想要版控 + history）

### 第一次 init

```bash
# 創 project + git init + 私人 GitHub repo + push
./scripts/raccoonui/git-init-project.sh marketing-q3 "Marketing Q3 Campaign"
```

> **slug 命名規則**: `[A-Za-z0-9._-]` 最多 128 字。建議短、識別性高(例: `pitch-deck-james`、`brand-2026q1`)。

執行後:
- 本地 `.od/projects/marketing-q3/` 含 `.raccoonui-project.json` + `.gitignore`
- GitHub `<your-account>/raccoonui-proj-marketing-q3` (private)
- raccoonui picker 顯示「Marketing Q3 Campaign」

### 在 raccoonui 改檔後 commit + push

開 raccoonui UI 編輯 → 想 snapshot 這個版本:

```bash
# 用 daemon endpoint(curl 或 PowerShell Invoke-RestMethod)
curl -X POST http://localhost:17456/api/raccoonui/projects/marketing-q3/git/commit \
  -H 'Content-Type: application/json' \
  -d '{"message":"v2: 改了 hero copy"}'

curl -X POST http://localhost:17456/api/raccoonui/projects/marketing-q3/git/push
```

### 看 history

```bash
curl http://localhost:17456/api/raccoonui/projects/marketing-q3/git/history
```

回傳近 20 個 commits,含 hash / 短 hash / ISO date / author / message。

### Rollback (復原到某個 commit)

```bash
# 安全模式(revert) — 加新 commit 反 undo,history 保留
curl -X POST http://localhost:17456/api/raccoonui/projects/marketing-q3/git/rollback \
  -H 'Content-Type: application/json' \
  -d '{"commit":"<hash>","mode":"revert"}'

# 暴力模式(reset) — 砍掉之後的 commits,history 改寫(只在 local 用)
curl -X POST http://localhost:17456/api/raccoonui/projects/marketing-q3/git/rollback \
  -H 'Content-Type: application/json' \
  -d '{"commit":"<hash>","mode":"reset"}'
```

> **何時 revert vs reset?**
> - Repo 已 push 給同事用 → **永遠 revert**(reset 會撕裂他們本地 history)
> - 純個人未 push,只是改錯想還原 → reset 比較直接

---

## Flow 2 — 多人協作（Zoe 創,Rindy 接手）

### Zoe 端 — 創 + 邀請 Rindy

```bash
# 1. 創 project + push
./scripts/raccoonui/git-init-project.sh design-pitch-jan "Design Pitch Jan"

# 2. 邀請 Rindy 進 GitHub repo(用 gh CLI 設 collaborator)
gh repo edit zoe-account/raccoonui-proj-design-pitch-jan --add-collaborator rindy-account
```

之後在 Slack 把 repo URL 傳給 Rindy:
```
git@github.com:zoe-account/raccoonui-proj-design-pitch-jan.git
```

### Rindy 端 — clone + import

```bash
./scripts/raccoonui/clone-project.sh git@github.com:zoe-account/raccoonui-proj-design-pitch-jan.git
```

執行後:
- 本地 `.od/projects/design-pitch-jan/` 拿到 Zoe push 的內容
- daemon 自動 import — Rindy picker 出現「Design Pitch Jan」

### Rindy 改完後

```bash
# commit
curl -X POST http://localhost:17456/api/raccoonui/projects/design-pitch-jan/git/commit \
  -H 'Content-Type: application/json' \
  -d '{"message":"refine hero spacing"}'

# pull Zoe 的最新(萬一她也改了)
git -C .od/projects/design-pitch-jan pull --rebase

# push 回去
curl -X POST http://localhost:17456/api/raccoonui/projects/design-pitch-jan/git/push
```

### Zoe 收到 Rindy 改動

```bash
git -C .od/projects/design-pitch-jan pull
```

raccoonui daemon 不需要重啟 — file 改動 daemon 下次讀檔時拿新內容。

---

## Flow 3 — 衝突處理

兩人改同一個檔案兩個地方,push 時會被擋:

```
! [rejected]    main -> main (fetch first)
hint: Updates were rejected because the remote contains work that you do not have locally.
```

解法照 git 標準:

```bash
cd .od/projects/<slug>
git pull --rebase    # 把對方的 commit 拉下來,自己的 commit rebase 到上面
# 如果有 conflict,git 會列檔案 — 用 editor 開,手動處理 <<<<<<< / >>>>>>>
git add <修好的檔案>
git rebase --continue
# 然後再 push
curl -X POST http://localhost:17456/api/raccoonui/projects/<slug>/git/push
```

> **建議**: 兩人協作前**先講好誰改哪個檔**(在 Slack 說一聲),避免 conflict。raccoonui 不是 Figma,沒做 realtime collab。

---

## Flow 4 — 砍掉 project

### 砍本地（不動 GitHub）

```bash
curl -X DELETE http://localhost:17456/api/projects/<slug>
```

清掉 `.od/projects/<slug>/` 跟 SQLite row。GitHub repo **保留**。

### 砍 GitHub

```bash
# 第一次需要加 scope(瀏覽器一次性授權)
gh auth refresh -h github.com -s delete_repo

# 然後砍
gh repo delete <your-account>/raccoonui-proj-<slug> --yes
```

或上 GitHub 網頁 Settings → Danger Zone → Delete this repository。

> **設計決策**: daemon 故意不砍 remote — 防止誤殺別人共用的 repo。Cleanup 走 user 自己 gh CLI 或 web。

---

## Endpoint 參考

| Endpoint | Method | Body / Query | 用途 |
|---|---|---|---|
| `/api/projects` | POST | `{id,name,...}` | 創 project(slug-based id)。dual-write sidecar |
| `/api/projects/:id` | DELETE | — | 砍 project + 清 fs(不動 GitHub) |
| `/api/raccoonui/projects/import-fs` | POST | — | 掃 fs sidecar 進 DB |
| `/api/raccoonui/projects/:id/git/init` | POST | — | git init + drop .gitignore + initial commit |
| `/api/raccoonui/projects/:id/git/status` | GET | — | porcelain v1 + branch + remote check |
| `/api/raccoonui/projects/:id/git/commit` | POST | `{message}` | git add . + commit |
| `/api/raccoonui/projects/:id/git/push` | POST | `{remote?,branch?}` | push(default: origin/main) |
| `/api/raccoonui/projects/:id/git/history` | GET | `?limit=20` | 近 N 個 commits |
| `/api/raccoonui/projects/:id/git/rollback` | POST | `{commit,mode}` | mode: 'revert'(default) 或 'reset' |

---

## FAQ

### Q: slug 取錯了能改嗎?

不能直接 rename — slug 是 SQLite primary key + filesystem 路徑。要換:

```bash
# 1. 砍舊的(本地 + GitHub)
curl -X DELETE http://localhost:17456/api/projects/<舊 slug>
gh repo delete <你的 account>/raccoonui-proj-<舊 slug> --yes

# 2. 用新 slug 重來
./scripts/raccoonui/git-init-project.sh <新 slug>
```

### Q: 我同事 clone 後 picker 沒看到 project

- daemon 跑著嗎? `curl http://localhost:17456/api/design-systems`
- sidecar 在嗎? `cat .od/projects/<slug>/.raccoonui-project.json`
- 手動 trigger import: `curl -X POST http://localhost:17456/api/raccoonui/projects/import-fs`
- 還沒看到 → 重啟 daemon(startup 自動掃)

### Q: 我不想用 GitHub,只想本地 git backup 行嗎?

可以。手動跑:

```bash
PROJECT=marketing-q3
curl -X POST http://localhost:17456/api/projects -H 'Content-Type: application/json' \
  -d "{\"id\":\"$PROJECT\",\"name\":\"Marketing Q3\"}"
curl -X POST http://localhost:17456/api/raccoonui/projects/$PROJECT/git/init
# 之後 commit / history / rollback 都用 endpoint,不 push
```

只跳過 `gh repo create` + push。

### Q: push 失敗顯示 "Repository not found",但 repo 在 GitHub 上真的存在?

GitHub 對 private repo + 沒 auth 的請求**故意回 404**(不洩漏 repo 存在性,security feature)。意味:

- repo 真存在 ✓
- gh CLI 認得 repo (`gh repo view <user>/<repo>` 看得到) ✓
- 但 `git push` 用的不是 gh token → GitHub 看你像沒登入 → 回 404 → 看起來像 repo 不存在

**修法**: 跑 `gh auth setup-git`(把 gh 設為 git credential helper,一次性)。raccoonui helper script (`git-init-project` / `clone-project`) v0.4.0+ 已 preflight 自動跑這行,如果你打 daemon endpoint 直接 push 仍可能踩到這雷。

### Q: 為什麼 git/init 後 git/commit 回 "nothing to commit"?

git/init 已經把當下 fs 全 add + commit 一次當 initial snapshot 了。第二次 commit 要先有檔案改動才行。這是預期行為。

### Q: 兩個 user 都用同 slug 創 project 會撞嗎?

slug 是 user **本地 SQLite primary key**, 在不同 user 各自的 SQLite 不會撞。但 GitHub repo 名 `raccoonui-proj-<slug>` 在同一個 GitHub account 下會撞。如果 Zoe 跟 Rindy 各自 GitHub 都用同 slug — 沒事,因為 repo path 含 owner(`zoe/...` vs `rindy/...`)。

### Q: 我已經有 Figma export / Sketch 的 raw files,能塞進來 + push 嗎?

可以。創完 project 後:

```bash
cp -r ~/Downloads/exports/* .od/projects/<slug>/
curl -X POST http://localhost:17456/api/raccoonui/projects/<slug>/git/commit \
  -H 'Content-Type: application/json' \
  -d '{"message":"import figma exports"}'
curl -X POST http://localhost:17456/api/raccoonui/projects/<slug>/git/push
```

> 大型 binary(>10MB)建議走 git LFS — 不在 raccoonui 範圍,自己 setup。

---

## 限制(現階段)

- **conversations 不 sync**: 對話歷史只在本地 SQLite,git 不帶。同事 clone 後對話從零開始。理由: 對話是 personal context,push 上 GitHub 有 privacy 顧慮
- **artifacts 部分 sync**: `.artifact.json` 是 dotfile 會進 git;但對應的真實 artifact PNG/SVG 會被 git 看到 → push 上 GitHub。binary 大檔需要 git LFS
- **conflict 處理走 git CLI**: 沒做 UI 整合,衝突要懂 `git rebase` / `git mergetool`
- **沒做 daemon 端 `git pull` endpoint**: 同事拉新版要在 terminal `git -C <project-dir> pull`,daemon 不主動拉(避免 race)
