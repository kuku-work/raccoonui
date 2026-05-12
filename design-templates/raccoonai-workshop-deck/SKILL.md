---
name: raccoonai-workshop-deck
description: |
  RaccoonAI 品牌風格的雜誌編輯感簡報 skill。專為工作坊 / 內部分享 / 講師簡報設計：
  navy + cream + amber 三色,Noto Sans TC + Urbanist + Pontano Sans + IBM Plex Mono 四套字,
  WebGL navy 流體背景,16 種 paste-ready 版面骨架。
  Single-file HTML,橫向翻頁,鍵盤 ← →,ESC 縮圖總覽,localStorage 位置記憶。
  與既有的 raccoonai-deck(產品發表會 / saleskit)不同:這個是 workshop 講師版,內容自由度高,
  layout 多元(roadmap、bad vs better、pill-row、ladder、recap...)。
triggers:
  - "raccoonai workshop"
  - "raccoonai 工作坊"
  - "raccoonai 講師簡報"
  - "RaccoonAI 風格簡報"
  - "navy + amber deck"
  - "workshop deck raccoon"
od:
  category: brand-deck
  surface: web
  mode: deck
  scenario: workshop
  audience: workshop participants, internal team, lecture audiences
  tone: editorial, confident, restrained
  scale: 8-37 viewport-locked slides
  preview:
    type: html
    entry: assets/template.html
  brand:
    locked: true
    spec: "RaccoonAI design system (single-accent navy + amber)"
---

# RaccoonAI Workshop Deck

## 這個 Skill 做什麼

生成一份 **RaccoonAI 品牌規格的工作坊簡報**,單檔 HTML,橫向翻頁:

- **配色**:navy `#142572` + cream `#FAFAF7` + amber `#FFC648` 三色鎖死,不接受擴色
- **字體**:中文 Noto Sans TC + 英文標題 Urbanist + 英文內文 Pontano Sans + meta IBM Plex Mono
- **背景**:雙 WebGL canvas (navy fluid + 銀藍 FBM),hero 頁透出,內文頁淡至 93-96% 遮罩
- **翻頁**:鍵盤 ← →、滑鼠滾輪、觸控滑動、底部圓點 ESC 總覽
- **位置記憶**:`localStorage` 自動存,refresh 不掉位
- **版面**:16 種 layout 骨架,涵蓋 cover / section divider / 3-4 col cards / bad vs better / pill row / ladder / case study / recap / closing question / full demo
- **主題節奏**:每個 `<section>` 帶 `light` / `dark` / `hero light` / `hero dark`,系統強制檢查不連續 3 同主題

它**不**做的事:
- 不做產品發表會 / saleskit(那是 `raccoonai-deck` 的工作)
- 不接受用戶自定義色 hex(品牌鎖死)
- 不做 PPTX / Keynote 匯出(這是 HTML deck,直接瀏覽器播放)
- 不做 mobile-first 設計(這是 1920×1080 投影簡報)

## 何時使用

**合適的場景**:
- 工作坊 / 內部分享 / 講師簡報 / demo day
- 需要 RaccoonAI 品牌包裝的研究分享、產品 walkthrough、AI 教學
- 有原始 Keynote / PDF / 文件要重新做視覺
- 30 分鐘 ~ 90 分鐘的講授節奏(8-37 slides)

**不合適的場景**:
- 大量表格 / 圖表 / 數據儀表(用 Tableau / 報表工具)
- 互動式 prototype(用 web-prototype skill)
- 客戶提案 / 業務 saleskit(用 `raccoonai-deck`)
- 純資訊發布的 PDF / pitch deck(用 `simple-deck` 或 `magazine-web-ppt`)

## 工作流

### Step 1 · 需求澄清(動手前必做)

**有原始素材**(舊 Keynote / PDF / 大綱 / 講稿)→ 跳到 Step 2,不需要再多問,先讀素材抽結構。

**沒有素材、只有題目**→ 用這 6 個問題對齊:

| # | 問題 | 為什麼問 |
|---|---|---|
| 1 | **對象是誰?**(內部團隊 / 客戶 / 外部讀者 / 學生) | 決定語氣與專業深度 |
| 2 | **場景?**(現場投影 / 線上分享 / 錄影 / 上架) | 影響 hero 頁節奏密度 |
| 3 | **分享時長?** | 30 min ≈ 10-12 slides, 60 min ≈ 18-22, 90 min ≈ 28-37 |
| 4 | **整份的核心論點是什麼?**(一句話) | 沒有這個就不要動手 |
| 5 | **有沒有原始 prompt / 對話截圖 / 操作錄影?** | 影響 case study 與 demo 頁的可行性 |
| 6 | **有沒有硬約束?**(必須涵蓋的章節 / 不能出現的內容 / deadline) | 避免做完返工 |

不問顏色 / 字體 / 主題 / 風格 — **這些都鎖死了**。如果用戶嘗試自定義色,委婉拒絕:「這個 skill 是 RaccoonAI 品牌單色系統,只能用 navy + cream + amber。若需要其他配色,可以改用 magazine-web-ppt skill。」

### Step 2 · 拷貝模板

從 `assets/template.html` 拷一份到目標目錄,通常是 `項目/XXX/index.html`。同時建 `images/` 與(視需要)`videos/`。

```bash
mkdir -p "項目/XXX/images"
mkdir -p "項目/XXX/videos"
cp "<SKILL_ROOT>/assets/template.html" "項目/XXX/index.html"
```

`template.html` 是**完整可運行**檔:CSS + WebGL 雙 shader + 翻頁 JS + 字體 CDN 全部預設好,body 內留了 3 個示範 section(cover、3-col content、section divider)。其餘要靠你貼 layout 進去。

#### 2.1 拷貝後立刻改的占位符

| 位置 | 原始 | 改成 |
|---|---|---|
| `<title>` | `[REPLACE] · Deck Title` | 真實 deck 名(如 `5 個 AI 時代必學用法 · RaccoonAI Workshop`) |
| `STORE_KEY` (在 `<script>` 內) | `'raccoonAi_workshop_deck_pos'` | 改成這個 deck 獨有的 key,避免多 deck 互踩位置 |

grep `[REPLACE]` 確認沒漏。

#### 2.2 logo 檔放對

把以下 4 個檔放到 `images/`(如果還沒有,跟用戶要):
- `images/logo-white.svg` — wordmark 白色版
- `images/logo-navy.svg` — wordmark navy 版
- `images/mark-white.svg` — mark only 白色版(備用)
- `images/mark-navy.svg` — mark only navy 版(備用)

樣板的 chrome 圖示路徑已預設好,只要檔在對的位置就會自動顯示。

### Step 3 · 規劃結構

#### 3.1 列出每一頁的主題(theme)和 layout

**在貼骨架之前**,先列一張表給用戶確認:

```
01 Cover               | hero dark  | L01
02 Workshop Promise    | light      | L02 (3-stage flow)
03 Roadmap             | dark       | L03 (5 nb-rows)
04 Section 1 Divider   | hero dark  | L04
05 Demo                | light      | L05 (interactive mock)
06 Concept 3-col       | dark       | L06
07 Section 1 Takeaway  | hero light | L07
...
```

這張表能讓用戶在大量產生 HTML 之前發現「啊我不要 section divider 那麼多」或「最後一頁該是 closing,不是 sources」。

#### 3.2 主題節奏自檢

列完後 grep 一次主題序列,確認:
- 沒有連續 3 頁同主題
- 至少 1 個 `hero light` + 1 個 `hero dark`(8+ 頁)
- 每 3-4 頁有一個 hero
- Cover 是 `hero dark`、結尾推薦 `hero dark`(closing question)

詳細規則見 `references/themes.md`。

### Step 4 · 貼骨架填內容

#### 4.0 預檢:類名必須在 template.html 裡有定義

**所有版面崩壞的根源**。打開 `references/layouts.md` 頂部的 "Pre-flight class checklist",確認你要用的每個類別都在 `template.html` `<style>` 裡存在。預設都有,但如果你曾經刪過 CSS 就要補回來。

#### 4.1 從 layouts.md 挑骨架 → 貼 → 改文案

`references/layouts.md` 收了 16 種 paste-ready 骨架:

| Layout | 用途 |
|---|---|
| L01 Cover | 第 1 頁 hero dark |
| L02 3-stage flow / promise | workshop promise / 工作流程承諾 |
| L03 Numbered roadmap | 目錄 / agenda(5 nb-rows) |
| L04 Section divider | 每章開場(giant number) |
| L05 Mental model demo | 互動 mock UI(手機選字 / IDE 截圖 etc.) |
| L06 3-col concept cards | 三個概念並列 |
| L07 Takeaway hero | 章節收尾(hero + 3-stage flow) |
| L08 Bad vs Better | 兩欄比較(`grid-2-6-6`) |
| L09 4-col anatomy | 結構切片(prompt anatomy / escalation) |
| L10 Full-bleed image + caption | 對話截圖 / 影片 demo |
| L11 Surface vs Real (pill-row) | 表面任務 vs 真實問題 |
| L12 Question ladder | 4-step 環形步驟 + 句型 callout |
| L13 Recap (3xN grid) | 整本 deck 的總複習 |
| L14 Sources / references | 來源與延伸閱讀 |
| L15 Closing question | hero dark 結尾大問題 |
| L16 Full-bleed demo screenshot | 純截圖頁(live demo 系列) |

每個骨架都是完整 `<section>`,直接複製貼上、改 `[REPLACE]` 占位符即可。

#### 4.2 文字內容紀律

- **標題不要堆形容詞**:`Q4 行銷成長策略全面解析` → `Q4 行銷,只有 3 個關鍵`
- **中文標題**配合 `.h-xl` 至多 12 字/行,用 `<br>` 強制換行
- **每頁一個 claim**,不要塞 2 個主張到同一頁
- **不要 emoji**,所有箭頭用 Unicode `→`
- **不要發明統計數字**(「10x faster」「99.9%」),若無真實來源就改成定性描述

#### 4.3 圖片 / 影片資產

放到 `項目/XXX/images/` 與 `項目/XXX/videos/`。命名規範:`{頁號}-{語義}.{ext}`,例:`05-mockup.png`、`12-case-bad.jpg`、`videos/case-bad.mov`。

影片必須加 `data-deck-video` 屬性,否則會在載入時自動播放且不會跟著翻頁暫停。

```html
<video data-deck-video src="videos/case-bad.mov" poster="images/case-bad.jpg"
       preload="metadata" muted loop playsinline controls></video>
```

### Step 5 · 對照 checklist 自檢

打開 `references/checklist.md`,P0 必須全過、P1 全力過、P2/P3 視時間決定。最常踩坑的:
- ❌ 連續 3 頁同主題(P0-3)
- ❌ accent 超過 2 個/頁(P0-4)
- ❌ hero light 上用 amber 文字(P0-4,對比 1.4:1)
- ❌ 影片忘記加 `data-deck-video`(P0-8)
- ❌ 中文標題 1 字 1 行(P1-2)
- ❌ chrome label 和 kicker 寫一樣的字(P1-3)

### Step 6 · 本地預覽

直接在瀏覽器打開 `index.html`,不需要 server。圖片走相對路徑 `images/...`。

```bash
# Windows
start "" "項目/XXX/index.html"
# macOS
open "項目/XXX/index.html"
```

← → 翻頁、ESC 縮圖總覽、滾輪滑鼠都能用。

### Step 7 · 迭代

幾乎所有調整都是改 inline `style="..."`(字號 / 高度 / 間距),不要動 template `<style>`。

若用戶反饋「某頁太擠」/「某頁太空」,**先檢查 layout 選錯了嗎**(3-col 改 4-col、bad-vs-better 改 pill-row),layout 對了才談字號。

## 資源檔導覽

```
raccoonai-workshop-deck/
├── SKILL.md              ← 你正在讀
├── assets/
│   └── template.html     ← 完整可運行 seed(CSS + WebGL + 翻頁 JS + 3 示範 section)
└── references/
    ├── layouts.md        ← 16 種 paste-ready section 骨架
    ├── components.md     ← 類別系統 + 字級 + 元件規格
    ├── themes.md         ← 4 種 slide 主題(light/dark/hero light/hero dark)+ 節奏規則
    └── checklist.md      ← P0/P1/P2/P3 自檢清單
```

**載入順序建議**:
1. 先讀 `SKILL.md`(這個檔)看整體
2. Step 1 對齊需求後,讀 `themes.md` 規劃整本 deck 的主題序列
3. 動手前讀 `assets/template.html` 的 `<style>` 區塊(類別來源)
4. Step 4 挑骨架時讀 `layouts.md`(每個骨架都是完整 `<section>`)
5. 細節調整 / 為什麼用這個 class 時讀 `components.md`
6. 寫完後讀 `checklist.md` 自檢

## 核心設計原則(品牌哲學)

### 1. 單色 accent,絕不擴色

整本 deck 只有一個 accent:amber `#FFC648`。當你忍不住想加綠色(success)、紅色(error)、紫色(highlight)時,**停下來**。

唯一例外:`.flow-cell.danger` 的 `.ic` 用 RaccoonAI design system 的 `--accent-red` `#E24E24`,代表「失敗 / 風險」流程節點。

### 2. 節奏 > 內容密度

工作坊聽眾在 60 分鐘內專注力會掉。**每 3-4 頁要有一個 hero**(深淺交替)讓大腦休息。寧可內容稍少一頁、加一個 takeaway hero,也不要把 6 個重點塞到同一頁。

### 3. Chrome / kicker / foot 三條線都有事做

- **Chrome 右側**:當前 section 標籤,跨多頁穩定不變
- **Kicker**:該頁特定 hook,1-3 字描述頁主題
- **Foot 左側**:該頁能帶走的核心 anchor(8-12 字)

如果你發現自己在 chrome、kicker、foot 寫一樣的字,代表這頁可能沒有獨立的論點。

### 4. 圖片 / 影片是第一公民,不是裝飾

當頁面有截圖 / 影片時,padding 縮成 `3vh 4vw`,讓媒體佔 ~70% 視窗高度。文字壓成一行 inline(L10 骨架)。不要用「圖配文字 2 欄 50/50」這種沒重點的版面。

### 5. 拒絕 AI slop 美學

明確禁止:
- 紫色 / 漸層背景作為視覺主導
- emoji 取代 lucide / 真實圖示
- 圓角卡片 + 左邊框 accent 線(這種「Notion / 假 Linear」風格)
- 任何 fake stat(「10x faster」「99.9% uptime」)沒有來源
- 衬線中文(Noto Serif SC 在 RaccoonAI design system 裡明確排除)
- 多色 gradient hero(設計系統只允許 page-bg 一處)

如果你有疑問「這算 slop 嗎?」→ 多半算。內疚的本能通常準。

## 參考實作

本 skill 的 spec 抽自實際工作坊 deck:

- 專案路徑:`C:\raccoon_agent\creative\raccoonui\.od\projects\0527_CSworkshop_slide\index.html`
- 37 頁、5 sections、6 hero dark + 3 hero light、含 2 segment 影片 + 5 全幅截圖
- 主題:「5 個 AI 時代必學用法」工作坊

讀 SKILL 不確定 layout 怎麼長的時候,可以打開那份 `index.html` 看實作。

## Runtime tool environment(workshop 場景特化)

- Deck 是 single-file HTML,沒有 build 步驟,沒有 bundler,沒有依賴 — 直接在瀏覽器打開 `index.html` 即可運行
- 影片走相對路徑 `videos/`,圖片走 `images/`
- 字體走 Google Fonts CDN(Urbanist + Pontano Sans + Noto Sans TC + IBM Plex Mono),離線情境會 fallback 到系統字
- 1920×1080 投影 / 全螢幕(F11)是設計目標,其他比例會自動 scale 但可能裁切
