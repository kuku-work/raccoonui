---
description: 透過 raigc 進階 ComfyUI workflow 生成精準的品牌/行銷圖片或影片。觸發詞：「品牌貼圖」「IG 廣告圖」「raccoonai 配色」「指定 flow」「更精準的圖」「用某某 workflow 跑一張」。串接 raccoonui daemon `/api/raccoonui/generate` SSE endpoint，背後 spawn raigc CLI（含 ADR-008 workflow-id 直選）。
---

# raigc-flow — 進階 workflow 生圖/生視訊

當 user 訴求帶有「品牌風」「IG 廣告圖」「raccoonai 配色」「指定 flow」「更精準的圖」「用 brand_route_a 跑」這類關鍵字時觸發。raccoonui daemon 內建生圖（OpenAI/Volcengine/Grok）做不到 ComfyUI 進階 workflow，這時要用這個 skill 跳到 raigc 路徑。

## 前置檢查

```bash
PORT=${RACCOONUI_PORT:-17456}
curl -sf http://127.0.0.1:$PORT/api/raccoonui/workflows -o /dev/null && echo "daemon OK" || echo "daemon down — 跑 scripts/raccoonui/start.{ps1,sh}"
```

如果 daemon 沒起來，提示 user 啟動再回來。

## 流程

### 1. 拿 workflow 列表

```bash
curl -s http://127.0.0.1:$PORT/api/raccoonui/workflows | python -X utf8 -m json.tool
```

讀 `workflows[]`，每個帶：
- `id` — 直選 key（傳給 generate endpoint）
- `display_name` / `display_name_zh` — 顯示給 user 用（中文 locale 優先 zh）
- `description` — 一行說明，幫忙判斷適配場景
- `tags` — `[brand, image, comfyui, ...]` 用來 facet filter
- `media` — `image` / `video`
- `intent` — `brand` / `marketing` / `explore` / `product`
- `backend_modes` — 例如 `[comfyui_local, comfyui_cloud]`，user 端要有對應 backend

### 2. 跟 user 確認 workflow 選擇

依 user 意圖過濾：
- 「品牌風」「raccoonai 配色」「IG 品牌貼圖」→ `tags` 含 `brand` 的
- 「行銷廣告」「促銷圖」→ `tags` 含 `marketing` 的
- 「探索」「實驗」→ `intent === 'explore'`

如果只剩一個 candidate，直接用；多個就列出來請 user 挑。

### 3. 確認 prompt + projectId

- `prompt`：跟 user 對齊清楚要產什麼。raigc workflow 內建的視覺風格不需要 user 自己描述（例如 brand_route_a 自動帶 raccoon mascot + 品牌色），prompt 只寫**內容/動作/場景**就好。
- `projectId`：raccoonui 專案 id（kebab-case，例如 `marketing-ig-2026-05-04`）。如果沒明確專案，建 `raigc-flow-<timestamp>`。
- 如果 user 提到角色（character），加 `characters: ["raccoon_main"]` 之類。

### 4. POST 生成（SSE）

```bash
curl -sN -X POST http://127.0.0.1:$PORT/api/raccoonui/generate \
  -H 'Content-Type: application/json' \
  --max-time 300 \
  -d '{
    "workflowId": "image_brand_route_a",
    "prompt": "<user 確認的 prompt>",
    "projectId": "<projectId>",
    "media": "image"
  }'
```

SSE 事件流：
- `start` — 確認參數（filename / projectId）
- `progress` — raigc spawn 命令 + ComfyUI / model 進度（從 raigc stderr forward）
- `result` — 最終 JSON：`path` / `backend` / `workflow_id` / `model` / `duration_sec`
- `done` — `{ ok: true, output: <filename> }`
- `error` — 錯誤分類：
  - `RAIGC_NOT_INSTALLED` → 提示 user `uv tool install -e <repo>/product/dev/raigc`
  - `RAIGC_BAD_REQUEST` (status 400) → workflow_id 不對 / intent 不匹配
  - `RAIGC_RUNTIME` (status 503) → backend 全失敗（ComfyUI 沒開？檢查 `raigc doctor`）

### 5. 回 user 結果

成功後告訴 user：
- 產出檔位置：`<projectsRoot>/<projectId>/<filename>`（從 `start` event 的 `output` 拿 filename）
- 用的 workflow + backend + 耗時（從 `result` event）
- 預覽：在 raccoonui Web UI 開對應 project 就看得到（FileViewer 自動 render）

## 不要做的事

- ❌ 直接 spawn `raigc` CLI（雙路徑、daemon 跟 skill 不一致）
- ❌ 寫死 daemon port（讀 `RACCOONUI_PORT` env，預設 17456）
- ❌ 把 `--reference` 傳給沒 LoadImage 的 workflow（raigc 0.3.0 ADR-008 Q3 會 soft warn 到 stderr，但你應該先看 workflow 設計）
- ❌ 同時帶 `intent` 跟 `workflowId`（raigc strict check 會 reject 不匹配的組合）
- ❌ 假設所有 workflow 都能跑 — 看 `backend_modes` 確認本機有沒有對應 backend（沒 ComfyUI local 就跳 cloud-only workflow）

## 跟 raccoonui Settings picker 的關係

Settings → raigc Workflow section 也能選 active workflow 存到 config。**那是 UI flow（user 自己選），這個 skill 是 LLM agent flow（自動依需求挑）**，兩條路並行不衝突。skill 不讀 user 的 settings selection，每次重新依 user 訴求挑 workflow。
