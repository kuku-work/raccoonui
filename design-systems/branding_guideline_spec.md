# Branding Guideline Spec

> **設計師寫給 LLM 的品牌語言指南。**
> 你定義「品牌感受」與「視覺規則」，agent 處理 CSS、HSL 換算、breakpoint 等工程實作。
>
> Source of truth：[`docs/spec.md`](../docs/spec.md) §4 + [`docs/examples/DESIGN.sample.md`](../docs/examples/DESIGN.sample.md)。
> Reference 範本：[`raccoonai/DESIGN.md`](raccoonai/DESIGN.md)（token 完整度範本）+ [`notion/DESIGN.md`](notion/DESIGN.md)（招牌視覺命名範本）。

---

## 角色分工：你 vs Agent

寫 DESIGN.md 之前先確認誰負責什麼。

| 你（設計師）負責 | Agent（LLM）負責 |
|-----------------|-----------------|
| 品牌氣氛、色彩故事、字體個性 | CSS 變數命名、HSL 數值換算 |
| 招牌視覺命名（visual signature） | hover / focus / disabled 等狀態變體展開 |
| 禁忌清單（哪些絕對不能做） | breakpoint 響應式實作 |
| 組件「感受」（圓潤？銳利？） | radius / padding 數值落地 |
| Reference 品牌與精神參考 | A11y 對比度檢查、無障礙標準 |

**心法：你給氛圍與規則，agent 給數字與程式碼。**
你不需要懂 HSL 是什麼、不需要算對比度、不需要寫 CSS variable — 但你必須清楚講出「我要什麼樣的感受」。

---

## Roadmap 全景

```
Stage 0  品牌定錨        ← 半天到一天，最重要
Stage 1  方向探索        ← 半天，利用 144 個 reference
Stage 2  寫你的 DESIGN.md  ← 主戰場，7 個 step
Stage 3  驗證 & 交付      ← 半天
```

| Stage | 你產出什麼 | Exit Criteria |
|-------|-----------|---------------|
| 0 | 1-page Brand Brief | 五個必答問題全有答案 |
| 1 | 5 個 candidate + 收斂 | 1 個 winner direction |
| 2 | `DESIGN.md` 9 段完整 | 18 條 checklist 全打勾 |
| 3 | 部署版本 + commit | dual-lens review 通過 |

---

# Stage 0 — 品牌定錨

> 不是設計，是策略。跳過這一步 = Stage 2 寫到一半才發現方向錯。

## Step 0.1 — 五個必答問題

沒有答案就不要動筆。

| # | 問題 | 範例（raccoonai） |
|---|------|-------------------|
| 1 | 這套設計**拒絕什麼**？ | 拒絕 glow（發光感）、毛玻璃、彩虹漸層 |
| 2 | 核心顏色有**幾個 role**（不是幾色）？ | 4 個藍色 role：身份藍 / CTA 填色藍 / 互動藍 / 強調藍 |
| 3 | 字體只用**一套**還是**分場景**？ | 只用一套：`Pontano Sans + 思源黑體` |
| 4 | 唯一允許的**破例**是什麼？ | 全系統零漸層，唯一例外是首頁底部那條漸層 |
| 5 | 這套系統**不適合什麼場景**？ | 不適合做「modern AI 發光感」品牌 |

> **註**：role 指這個顏色「在介面上扮演什麼角色」（身份識別 / 點擊按鈕 / 警告 / 背景...）。
> 同一個藍色用在 logo 和用在按鈕，雖然色相一樣，但是兩個 role。

## Step 0.2 — 寫 1-page Brand Brief

包含：
- **Mission**（一句話）
- **Voice**（3-5 個形容詞）
- **Target user**（具體 persona，不是「年輕人」）
- **競品 3-5 個**（連 URL）
- **「拒絕什麼」段落**（最少 3 條）

> **Linus 警告**：跟 stakeholder 對齊**「不是什麼」**這段，不要對齊「是什麼」。
> 「是什麼」永遠發散，「不是什麼」會收斂。

---

# Stage 1 — 方向探索

> 不要從零畫，先從 144 個 reference 中選。

## Step 1.1 — 預選 8-12 個 candidate

打開 [`design-systems/README.md`](README.md) 的 category 表，依 brand DNA 圈出候選：

| Category | 適合什麼品牌 |
|----------|------------|
| AI & LLM（claude / cohere / x-ai...） | AI 工具、agent 平台 |
| Productivity（notion / linear-app / cal...） | SaaS、效率工具 |
| Editorial（warm-editorial / atelier-zero / kami） | 內容平台、雜誌、出版 |
| Themed（agentic / brutalism / editorial...） | 風格實驗 |

## Step 1.2 — OD picker 對比 5 個

跑 raccoonui daemon：
```bash
pnpm tools-dev run web --daemon-port 17456 --web-port 17573
```

**同一個 prompt + 切換 5 個 design system = 純設計差異對比。**

範例 prompt：
> "Hero section for a B2B AI customer-service platform, 中文標題 + 英文副標 + CTA 按鈕 + 產品截圖"

跑 5 次，每次切一個 design system，截圖比對。

## Step 1.3 — Comparison Sheet

| DESIGN.md | 第一印象 | 適合度 | 需修改 |
|-----------|---------|--------|--------|
| claude | 太書卷氣 | 6/10 | 顏色換掉 |
| linear-app | 太冷峻 | 7/10 | 增加溫度 |
| notion | 溫暖剛好 | 8/10 | 主色不合 |
| ... | | | |

收斂到 **1 個 winner**（最多 2 個再跑一輪）。

**Exit criteria：** 你能用一句話講「為什麼這個贏，其他輸」。

---

# Stage 2 — 寫你的 DESIGN.md（核心 7 步）

> 每一步對應 DESIGN.md 的一個（或數個）章節。
> 順序很重要：**先寫 Step 1 + Step 6，再寫其他**。

## 9 段 vs 7 步驟對照表

| Step | 對應 DESIGN.md 章節 |
|------|---------------------|
| Step 1 寫品牌氣氛 | §1 Visual Theme & Atmosphere |
| Step 2 選色彩故事 | §2 Color Palette & Roles |
| Step 3 定字體個性 | §3 Typography Rules |
| Step 4 命名招牌視覺 | 跨 §1 / §6 / §9 |
| Step 5 設定組件感受 | §4 Components / §5 Layout / §6 Depth / §8 Responsive |
| Step 6 寫禁忌清單 | §7 Do's and Don'ts |
| Step 7 寫 Agent 對話指南 | §9 Agent Prompt Guide |

---

## Step 1 — 寫品牌氣氛（§1 Theme & Atmosphere）

### Why
這是 LLM 唯一會反覆掃描的段落，定下整個 system 的決策邊界。
寫得模糊，後面所有決策都會偏。

### Do
1. 寫一段 80-150 字 prose，描述：
   - Mood（沉穩？活潑？）
   - Reading rhythm（緊湊？舒展？）
   - 視覺語言（書頁？儀表板？廣告海報？）
2. 寫**「不是什麼」段落**（≥ 3 條反例）
3. 列 `Key Characteristics:` bullet（5-8 條摘要）

### Check
- [ ] 一個沒看過品牌的人讀完能說出「拒絕做什麼」
- [ ] Key Characteristics 每條都具體（不是「一致」「優雅」這種廢話）

### Reference
- [`raccoonai/DESIGN.md`](raccoonai/DESIGN.md) §1 開頭那段「reading room, not glow」是黃金示範
- [`notion/DESIGN.md`](notion/DESIGN.md) §1 「a blank canvas that gets out of your way」是另一種寫法

---

## Step 2 — 選色彩故事（§2 Color Palette & Roles）

### Why
顏色不是「我喜歡藍」，是「藍色在介面上扮演哪些角色」。

### Do

1. **先列「角色」，再選「顏色」。** 你需要這幾個 role：

| 必須 | Role | 中文 | 範例 |
|------|------|------|------|
| ✅ | Identity | 品牌身份色 | Logo、頁首、行銷主視覺 |
| ✅ | CTA | 主按鈕色 | "立即註冊" 那顆 |
| ✅ | Interactive | 互動回饋色 | 連結、focus 邊框、選中狀態 |
| ✅ | Background | 主背景色 | 整頁底色 |
| ✅ | Surface | 卡片色 | 浮起的內容區 |
| ✅ | Text Primary | 主文字色 | 標題與內文 |
| ✅ | Text Muted | 次要文字色 | 說明、時間戳、placeholder |
| ✅ | Border | 邊框色 | 分隔線 |
| ✅ | Status Success / Warning / Danger | 狀態色 | 成功 / 警告 / 錯誤 |
| 選用 | Accent | 重點強調色 | 一頁限用 1 次 |

> **註**：identity 和 CTA 可以是同一色相但**不同明度**。
> 例如 raccoonai：identity 是深藏青、CTA 是稍亮一點的藏青、focus ring 是更亮的天藍 — 三個都「藍」但角色不同。

2. **每個 role 給一個顏色（hex 或描述都行，agent 會補完）：**

```
範例（你寫成這樣就夠了）：
Identity: 深藏青 #142572
CTA: 比 identity 再亮一點的藏青
Interactive: 天藍色，明度高一點
Background: 純白
Text Primary: 接近黑，帶一點點暖
Border: 非常淡的灰，幾乎看不見
```

Agent 會幫你：
- 換算 HSL 值
- 生成 hover / focus / disabled / pressed 變體
- 配合 alpha 透明度（半透明用法）

3. **寫「隔離區」規則（Quarantine Rules）。** 如果你允許某些彩色用於特定區域：

```markdown
### 隔離區顏色（quarantined — 永遠不出現在主 UI / 行銷頁）
- 標籤分類：藍 / 綠 / 橘 / 紫
- 頭像底色：紫 / 綠 / 橘
- Chart 五色：[列出]
```

> **註**：quarantine 是設計術語，意思是「把這些彩色關進特定使用情境」。
> 沒寫 quarantine = agent 會把 chart 顏色拿來當 CTA。

### Check
- [ ] 每個必須 role 有對應顏色
- [ ] Identity 和 CTA 的差異講得清楚
- [ ] 如有彩色，有寫 quarantine 段落

### Reference
- [`raccoonai/DESIGN.md`](raccoonai/DESIGN.md) §2「Avatar & Tag Categories」段是 quarantine 黃金範本
- [`notion/DESIGN.md`](notion/DESIGN.md) §2 用「Notion Blue 是核心 UI 唯一彩色」一句話定 governance

---

## Step 3 — 定字體個性（§3 Typography Rules）

### Why
字體是品牌的「聲音」。serif 像在朗讀，sans 像在對話，mono 像在打字機上敲擊。

### Do

1. **選 1-2 個字體（最多）：**
   - 主要 UI 字體（必須）
   - CJK 字體（必須，給中文用）
   - Code mono（選用）

2. **寫字體個性描述：**

```markdown
範例：
- 大標題（48px+）：感覺**緊湊有力**，字距偏緊（agent 會給 -1.5px tracking）
- 內文（16px）：感覺**舒展易讀**，字距正常
- 標籤（12px）：感覺**清晰可辨**，字距稍寬
```

3. **告訴 agent 用幾種重量（建議 4 種）：**
   - **400 閱讀重量**（內文）
   - **500 互動重量**（按鈕、導覽連結）
   - **600 強調重量**（小標、活躍狀態）
   - **700 宣告重量**（大標題）

> **註**：「重量」（weight）指字的粗細。400 是普通、700 是粗體。
> 多數品牌用 4 級就夠了，再多會稀釋層級感。

### Check
- [ ] 字體選擇有理由（不是「我覺得好看」）
- [ ] 大標 / 內文 / 標籤的「感受」分別有描述
- [ ] 重量規劃清楚

### Reference
- [`notion/DESIGN.md`](notion/DESIGN.md) §3 的 16-row hierarchy 表是工程級完整範本
- [`raccoonai/DESIGN.md`](raccoonai/DESIGN.md) §3 用「思源黑體與 Pontano Sans 一起載入」處理中英混排

---

## Step 4 — 命名招牌視覺（Visual Signatures）⭐

### Why
**這是讓 agent 真的懂你品牌的關鍵步驟。** 也是 80% 設計師會偷工的地方。

給每個品牌特色一個**有畫面感的名字**，agent 之後可以這樣 invoke：
> "用 Whisper Border 包這張卡，背景採 Warm Alternation"

vs 沒命名：
> "用 1px solid rgba(0,0,0,0.1) 包這張卡，背景在 #ffffff 和 #f6f5f4 交替"

第一句設計師讀得懂、agent 也讀得懂。第二句只有工程師讀得懂。

### Do

找出你品牌 **3-5 個獨特視覺特徵**，每個取名。

**命名公式：**

| Pattern | 範例 |
|---------|------|
| `<質感> + <元素>` | Whisper Border / Soft Card / Crisp Pill |
| `<行為> + <元素>` | Warm Alternation / Pulsing Focus / Drifting Gradient |
| `<層級> + Stack` | Layered Blue Stack / Multi-layer Shadow Stack |

**寫進 DESIGN.md 的格式：**

```markdown
### Visual Signatures

**Whisper Border** — 卡片邊框只用 1px 極淡灰，幾乎看不見的分隔
- 用在：所有 card / divider / 區塊邊界
- 為什麼：避免介面感覺擁擠，分隔來自空白與微對比

**Warm Alternation** — 區塊背景在純白與暖灰之間交替
- 用在：landing page 區塊背景
- 為什麼：創造節奏感，不靠粗線分隔

**Pill Badge** — 9999px radius 的圓角標籤，淺色底 + 深色字
- 用在：狀態、新功能標、分類
- 為什麼：跟方角按鈕區隔，標籤一眼可辨
```

**寫在哪：** §1 Key Characteristics + §6 Depth + §9 Iteration Guide 三處交叉提及。

### Check
- [ ] 命名 ≥ 3 個 visual signature
- [ ] 每個有「用在哪」+「為什麼」
- [ ] 名稱有畫面感（不是 "Brand Border #1"）

### Reference
- [`notion/DESIGN.md`](notion/DESIGN.md) 的 Whisper Border / Warm Alternation / Pill Badge 是黃金範本

---

## Step 5 — 設定組件感受（§4 + §5 + §6 + §8）

### Why
組件是品牌的「肌肉記憶」。按鈕該圓還該方？卡片該浮還該扁？這些感受加總成品牌調性。

### Do

對每個組件，寫**感受**而非數值（agent 補數值）：

#### 5.1 Button 感受

```markdown
範例：
- 主按鈕：感覺**穩重有份量**，圓角中等（不要太圓像 pill、不要太銳利）
- 次按鈕：透明底 + 邊框，感覺**克制**
- Ghost 按鈕：純文字 + hover 出現底色，感覺**輕巧**
- 按下去的回饋：輕微縮放 + 顏色加深（agent 會做 scale(0.98)）
```

#### 5.2 Card 感受

```markdown
範例：
- 一般卡片：感覺**輕飄飄**，幾乎沒陰影、邊框極淡
- 重要卡片：感覺**浮起一階**，多層柔和陰影
- 圓角程度：中等偏大（給溫暖感）
```

#### 5.3 列出「招牌組件」（distinctive components）

你品牌獨有的 2-3 個組件，給規格：

```markdown
範例：
**Trust Bar**
- 客戶 logo 排成一列，灰階呈現
- 每個 logo 高度 32px，左右 padding 24px
- 上下加 caption「值得信賴的 100+ 團隊在使用」

**Metric Card**
- 大數字（48px 粗體）+ 描述（16px 細體）
- 卡片用 Whisper Border + 大白底
- 適用：landing 數據展示、定價頁
```

#### 5.4 Layout 感受

```markdown
範例：
- 主內容寬度：約 1200px（讓人覺得不窄不寬）
- 區塊與區塊間：寬鬆，感覺呼吸（agent 會給 64-120px）
- 行動裝置：堆疊單欄，padding 縮小但不擠
```

#### 5.5 深度感受

```markdown
範例：
- 整體調性：**扁平偏溫和**，不要 dramatic shadow
- 浮層級：最多 3 層（一般 / 卡片浮起 / modal）
- 不要：發光、霓虹、glassmorphism
```

#### 5.6 響應式

```markdown
範例：
- 桌機（1024px+）：完整體驗
- 平板（640-1023px）：側欄收成抽屜
- 手機（<640px）：單欄、padding -33%、字級調整
```

> **註**：breakpoint 指介面在「桌機 / 平板 / 手機」之間切換的尺寸點。
> 這裡你只要描述「在小螢幕上感覺如何」即可。

### Check
- [ ] Button / Card / Input 有感受描述
- [ ] 命名 2-3 個招牌組件並給規格
- [ ] 響應式策略清楚

---

## Step 6 — 寫禁忌清單（§7 Do's/Don'ts）

### Why
這是 agent **唯一能拒絕做某事**的依據。沒寫禁忌 = agent 什麼都會做。
也是品牌守護的最後一道防線。

### Do

寫 **≥ 5 條具體 ❌**，每條配對 ✅：

**好的範例（具體可驗證）：**
```markdown
❌ 不要使用毛玻璃 / backdrop-blur 效果
✅ 用實心卡片 + 極淡邊框

❌ 不要在主 UI 出現綠色或橘色（quarantine 範圍以外）
✅ 主 UI 只用四個藍 + 黑白灰

❌ 卡片圓角不可超過 24px、不可低於 8px
✅ 統一用 16px

❌ 同一頁面不能有兩個 saturated CTA 顏色
✅ 一頁只有一個主 CTA 顏色
```

**壞的範例（廢話、不可驗證）：**
```markdown
❌ 不要破壞品牌一致性 ← 廢話
❌ 注意可讀性          ← 廢話
❌ 保持優雅            ← 廢話
```

### Check
- [ ] ≥ 5 條 ❌ 都是可驗證規則（不是空話）
- [ ] 每條 ❌ 配對 ✅

### Reference
- [`raccoonai/DESIGN.md`](raccoonai/DESIGN.md) Key Characteristics 中「zero blur, zero textures, zero spot illustrations」就是禁忌的精華

---

## Step 7 — 寫 Agent 對話指南（§9 Agent Prompt Guide）

### Why
這是給 LLM 看的「使用說明書」。最常被忽略，但**這段決定 agent 用得順不順**。

### Do

三段式齊全（採 Notion §9 結構）：

#### 7.1 Quick Reference

9-12 行 token 對照表，agent 可直接貼進 prompt：

```markdown
### Quick Reference
- 主 CTA 色：深藏青 (#142671)
- 主背景：純白 (#FFFFFF)
- 主文字：接近黑 (#0A0A0A)
- 次文字：中灰 (#737373)
- 邊框：1px 極淡灰 (#E5E5E5)
- Focus 框：天藍 (#6B8FEB)
- 連結：CTA 色
```

#### 7.2 Example Prompts（≥ 5 條完整範例）

```markdown
### Example Prompts

1. "做一個 hero section：白底，標題 48px 粗體深藏青，副標 20px 中灰，
   CTA 用主按鈕色（deep navy）+ 16px radius + 白字。右側放產品截圖
   配 Whisper Border。"

2. "做一個 metric card：白底 + Whisper Border，左上放 48px 粗體大數字
   （主 CTA 色），下方 16px 中灰描述文字。卡片 padding 32px。"

3. "做一個 pricing 表格：三欄，中間欄用 Pill Badge 標 'Most popular'，
   背景使用 Warm Alternation 與其他兩欄區隔。"

4. ...
5. ...
```

#### 7.3 Iteration Guide（5-10 條 meta-rule）

```markdown
### Iteration Guide
1. 顏色不在 token 表內 = 不要用，改回來最近的 token
2. 字距隨 size 變化：48px+ 用緊湊（-1.5px），16px 正常，12px 寬鬆
3. 一頁只有一個主 CTA 色，其他用 outline / ghost
4. 邊框永遠是 Whisper Border 等級，不要加粗
5. 陰影用多層柔和堆疊，不要單層硬陰影
6. 區塊背景用 Warm Alternation，不要靠粗線分隔
7. quarantine 顏色（chart / avatar / tag）絕不出現在 CTA / hero / nav
```

### Check
- [ ] Quick Reference 一目瞭然
- [ ] ≥ 5 條 Example Prompts
- [ ] ≥ 5 條 Iteration Guide

### Reference
- [`notion/DESIGN.md`](notion/DESIGN.md) §9 是黃金範本，整段可直接模仿結構

---

# Stage 3 — 驗證 & 交付

## Step 3.1 — 18 條 ship 前 checklist（設計師版）

- [ ] §1 含「不是什麼」段落（≥ 3 條反例）
- [ ] §1 含 Key Characteristics（5-8 條）
- [ ] §2 必須 role 全有顏色
- [ ] §2 Identity 與 CTA 的差異有描述
- [ ] §2 含 quarantine 段落（如有彩色）
- [ ] §3 字體選擇有理由
- [ ] §3 大標 / 內文 / 標籤感受分別描述
- [ ] §3 重量規劃 ≥ 4 級
- [ ] **命名 ≥ 3 個 visual signature**
- [ ] visual signature 在 §1 §6 §9 三處交叉提及
- [ ] §4 Button / Card / Input 感受描述齊全
- [ ] §4 命名 ≥ 2 個招牌組件
- [ ] §5 Layout / 響應式 / 深度感受齊全
- [ ] §7 ≥ 5 條具體 ❌（每條可驗證）
- [ ] §7 每條 ❌ 配對 ✅
- [ ] §9 Quick Reference 完整
- [ ] §9 ≥ 5 條 Example Prompts
- [ ] §9 ≥ 5 條 Iteration Guide

## Step 3.2 — Dual-lens Review

雙視角檢查（feedback memory: `feedback_dual_lens_review_before_ship`）：

| 視角 | 你問什麼 |
|------|---------|
| **品牌守門員** | 這份 DESIGN.md 跟 brand brief「拒絕的東西」有衝突嗎？ |
| **實戰顧問** | LLM 拿到這份能直接生成符合品牌的 hero / pricing / about 嗎？ |

兩個視角都通過才 ship。

## Step 3.3 — Ship

1. DESIGN.md 放進 `design-systems/<your-brand>/DESIGN.md`
2. 重啟 daemon，picker 自動偵測
3. 跑 5 個 test prompt（hero / pricing / about / blog / contact）
4. 寫 1-paragraph changelog 給未來迭代用

---

# 名詞註解（給設計師）

工程術語對照表，遇到不熟的回來查：

| 術語 | 設計師理解 | 工程師術語 |
|------|-----------|-----------|
| Token | 一個有名字的設計值 | CSS variable |
| Role | 顏色在介面上扮演的角色 | semantic token |
| Variant | 同一組件的不同樣式（主按鈕、次按鈕） | component variant |
| State 變體 | 同一顏色在 hover / focus / disabled 的變化 | interaction state |
| Quarantine | 把某些顏色「關起來」只用在特定區域 | scoped color domain |
| HSL | 色相 / 飽和 / 亮度的色彩表示法 | hue, saturation, lightness |
| Alpha | 透明度 | opacity / alpha channel |
| Letter-spacing / tracking | 字母間距 | letter-spacing |
| Line-height / leading | 行高 | line-height |
| Breakpoint | 桌機 / 平板 / 手機的切換尺寸點 | media query breakpoint |
| Elevation | 視覺上的高低層級 | z-index + shadow stack |
| Radius | 圓角程度 | border-radius |
| WCAG AA | 國際無障礙標準（對比度要求） | accessibility contrast standard |

**心法：** 你不需要記這些術語，agent 會處理。
但如果 agent 問你「要不要 0.1 alpha 的 whisper border」，你要能讀懂 = 「要不要極淡（10% 透明）的細邊框」。

---

# Reference 範本

撰寫時雙開以下兩份對照：

| 範本 | 強項 | 行數 |
|------|------|------|
| [`raccoonai/DESIGN.md`](raccoonai/DESIGN.md) | Color role 完整、quarantine 範本、token 工程級完整度 | 746 |
| [`notion/DESIGN.md`](notion/DESIGN.md) | §9 Agent Prompt Guide 三段式、visual signature 命名範本、letter-spacing per size 表 | 312 |

**理想 DESIGN.md = raccoonai 的 color governance + Notion 的 §9 + 你品牌的 visual signatures。**

---

# 與其他文件的關係

| 文件 | 角色 | 關係 |
|------|------|------|
| [`docs/spec.md`](../docs/spec.md) | OD 產品 spec | 定義 DESIGN.md 在系統中的位置（§4） |
| [`docs/skills-protocol.md`](../docs/skills-protocol.md) | Skill 規範 | 定義 skill 如何 reference DESIGN.md |
| [`docs/examples/DESIGN.sample.md`](../docs/examples/DESIGN.sample.md) | 最小範例 | 9 段結構的最小可行範本 |
| [`design-systems/README.md`](README.md) | DESIGN.md 目錄 | 列出 bundled 144 個 design systems |
| **本文件** | 撰寫策略 | 規範**如何**寫一份合格的 DESIGN.md |
