# Narrative Design — Topic First, Template Last

**Read this BEFORE `framework-rules.md` and `slide-kinds.md`.**

Slide kinds are a dictionary. Framework rules are how the dictionary is used.
This file is the design order — **議題 → 剖析 → arc → beats → layout**.

A deck is good when it serves **the topic the user is in their head**, not when it
matches a template. Templates are fallbacks for when the user is stuck — they
are not the starting point.

---

## The wrong opening (vending machine)

```
Q1: 三個 pillar 是什麼?
Q2: 三個功能 + 兩個客戶見證 + roadmap?
Q3: 頁數?
```

This forces the user to fill template slots before they've articulated their topic.
The deck that comes out reads like a product spec sheet — because it was written
to fill a template, not to serve a message.

## The right opening

```
你希望設計什麼議題的簡報?
```

That's it. One open question. The user describes their topic in their own words —
"Q3 行銷檢討", "對 SAP 介紹我們", "客服效率方案 demo", "對工程團隊講 Q4 roadmap
改了哪些". Whatever shape the topic comes in, that shape is the starting point.

---

## Step 1 — 議題剖析(這是設計師動腦的地方,不是 vending machine 的)

After the user describes the topic, Claude analyzes — out loud — five dimensions.
This is **not** five questions to ask the user. It's five things Claude infers from
the topic + asks the user to correct.

### 1.1 受眾畫像 (Audience)
- 是誰?幾人?(管理層 5 人 vs 客戶會議 3 人 vs 對外 200 人 — 完全不同節奏)
- 他們現在對這議題的認知 / 立場是什麼?(skeptical / curious / supportive / hostile)
- 他們聽完後該做什麼?(buy / approve / understand / change behavior)

### 1.2 核心命題 (Core proposition)
- 這份 deck 要回答的「**那一個問題**」是什麼?— 一個,不是三個
- 如果聽眾散場後只記得一句話,那句話是什麼?
- 如果這個 message 被刪掉,deck 就不該存在

### 1.3 必要證據 (Evidence inventory)
- 為了讓 1.2 成立,需要什麼?
  - 數字?(market data / product data / cohort)
  - 案例?(customer story / case study)
  - demo?(產品截圖 / 影片 / 走查)
  - 對比?(us vs them / before vs after)
  - 視覺?(架構圖 / journey map)
- 哪些**已經有**(同事手上)?哪些**沒有需要補**(找誰拿)?

### 1.4 自然敘事弧 (Natural arc)
這個議題自帶什麼結構?從議題的本質推,不是從預設模板挑。常見幾種:

| Arc | 何時自然出現 | Beat 順序 |
|---|---|---|
| **痛 → 解** | 賣方案、推產品、提變革 | 現況痛 → 為什麼難 → 我們的解 → 證據 → 行動 |
| **疑 → 證** | 對抗既有信念、推翻誤解 | 你以為 X → 真相是 Y → 證據 → 重新定義 |
| **演進史** | Roadmap、發展回顧、年度檢討 | 過去 → 現在 → 未來 → 為什麼這樣推 |
| **對比** | 兩條路選一條、新舊系統評估 | A vs B → 維度比較 → 場景測試 → 推薦 |
| **推導** | 技術方案、架構提案、第一原理說服 | 公理 → 推論 → 驗證 → 結論 |
| **發現** | 內部分享、研究結果、insight 揭露 | 我們在找什麼 → 我們怎麼找 → 我們發現什麼 → 意義 |
| **進場** | 對新合作夥伴、新員工、新客戶介紹 | 我們是誰 → 我們在意什麼 → 我們做什麼 → 我們一起做什麼 |

從議題推弧,**不**從弧推議題。

### 1.5 結構推導 (Structure)
1.1 - 1.4 答完後,結構自然浮現:
- 大概幾段?(arc 決定段數 — 痛解 4 段、進場 4 段、對比 3-4 段)
- 每段幾頁?(每個 beat 平均 2-4 頁)
- 總頁數?(不是先選 16 頁再湊 — 是段數 × 段平均頁數浮現出來)
- 深底/淺底節奏?(hero beats = 深底,detail beats = 淺底,reset 視需求)

---

## Step 2 — 把剖析講出來給同事確認

Claude 不是把上面 5 個維度當問題逐一問同事 — 那會回到 vending machine。

正確做法:**Claude 自己先做一遍剖析,把推論講出來**,然後問:「我這樣理解你的議題對嗎?有什麼我漏掉的?」

範例 — 同事說「我要對 6/3 來賓證明 Raccoon 不只是 chatbot」:

```
我聽到的議題是「重新定義 Raccoon AI 的價值認知」。
我的初步剖析:

受眾    | 6/3 來賓 — 媒體 + 潛在客戶 + 合作夥伴混合,80-100 人
立場    | 多數人腦中還是「客服 chatbot」的舊框架
我們要他們相信的 | Raccoon 是「生成式 AI 客戶經營平台」,不是 chatbot
散場記得的一句話  | 「對話可以變成業績,不是成本」

自然弧 | 疑 → 證(他們有先入觀念,要主動拆掉再重建)
段落:
  ① 你以為的 Raccoon(對方既有認知)        2 頁
  ② 但這 3 件事 chatbot 做不到              3 頁(三個能力 demo)
  ③ 客戶實證:他們已經這樣用                3 頁(2 個 case + 1 個數字)
  ④ 重新定義:從成本中心到業績中心          1 頁(stat-hero)
  ⑤ 行動:14 天免費試 + QR                  1 頁
總計 10 頁 + 封面 + chapter 分隔 = 約 14 頁

我這樣抓對嗎?有沒有我漏掉的(例如要不要 roadmap 段?要不要競品比較?)?
```

同事此時要嘛說「對,但加 ⑥ roadmap」要嘛說「不對,我其實是要…」 — 兩種回答都比 vending machine 給的對話品質高一個量級。

---

## Step 3 — Beat 對應 Layout(這時才看 slide-kinds.md)

剖析確認後,每個 beat 浮現它需要的 layout。**這時才查字典**:

| Beat 類型 | 對應 slide kind | 為什麼 |
|---|---|---|
| 受眾既有認知 / 痛點 / 疑慮 | `pain-point` 或 `feature-screenshot` | 設置共鳴或現狀 |
| 顛覆性 single insight | `stat-hero` | 一頁一數字最有衝擊 |
| 對比立場 / 對手 | `comparison-matrix` | 理性決策視覺 |
| 三個能力 / 三個解 | `feature-screenshot` × 3 或 `flow-3step` | 看是要展示功能 vs 流程 |
| user journey 演示 | `storyboard-sequence` | 4-up 連續截圖 |
| 客戶實證 quote | `customer-quote` | 大引號 |
| 證明規模 / 社會證明 | `stat-on-logo-wall` | logo 牆 + 中央 stat |
| 整合性宣稱 | `hub-spoke-map` | 我們接得起 N 個東西 |
| 演進 / 時間軸 | `roadmap-timeline` | Q1-Q4 milestone |
| 章節呼吸 | `chapter-glass` 或 `black-pause` | 過渡而非主菜 |
| ROI 試算 | `roi-stats` | SalesKit 算盤 |
| 收尾行動 | `cta-launch` 或 `dual-qr-cta` 或 `next-step` | 看單一/雙 action |

注意:**沒有「keynote 必用 X、Y、Z」的清單**。每個 beat 看它需要什麼,挑當下最對的那個。

---

## Step 4 — 寫 + 改的判準

寫稿後 iterate 時,每次改的判準是:

> **這還在服務原本的議題嗎?**

不是「這頁好不好看」「玻璃漏光對不對」「字夠不夠大」 — 那些是 framework-rules.md 的執行層判準。
是「這頁存在的理由,是否服務 Step 1.2 的核心命題?」

如果一頁刪掉、議題還是完整 → **刪它**。
如果一頁加上、議題更鋒利 → **加它**。
如果一頁存在感模糊 → **改它**直到鋒利,或刪它。

---

## 反模式(別陷入)

### 1. 套模板再湊內容
> 「我做 16 頁 keynote 標準節奏,然後想三個 pillar 三個 feature 兩個客戶見證。」

這是把 Apple Keynote 的形式當靈魂。Apple keynote 看起來那樣是因為他們**真的有**那麼多東西要講。
你套那個節奏不代表你也有 — 通常結果是每段都被填滿但每段都單薄。

### 2. 一個議題塞兩個命題
> 「我這份 deck 要證明 Raccoon 不只是 chatbot,順便講 Q4 roadmap 改了什麼。」

兩個命題 = 兩份 deck。硬塞會兩個都講不清楚。退回去問:「**這次更想講哪一個?**」另一個下次。

### 3. 預設頁數先於分析
> 「我想做 12 頁。」

12 頁是輸出,不是輸入。輸入是議題 + 剖析。如果剖析後是 7 頁就 7 頁,18 頁就 18 頁。
**12 頁的執著是為了 fit 老闆「不要太長」的暗示** — 但 7 頁清楚的 deck 比 12 頁鬆散的更短。

### 4. 同事不確定議題就直接寫
> 同事:「先做一份對外的 deck,內容到時候再調」

這是請 Claude 用模板寫廢話。退回去 elicit:「你想對外傳達什麼?如果還沒想清楚,我們先用 10 分鐘把它想清楚再動工 —— 比花 1 小時做廢稿便宜。」

---

## 議題剖析卡關時的退路(才看 scenarios.md)

如果上面整個流程跑不順 — 同事丟了議題、Claude 剖析了、雙方都不確定弧長怎樣 —— **這時** 才翻 `scenarios.md`,把那邊的 16 頁 keynote / 11 頁 saleskit 模板**當靈感** sparkboard 看,挑類似的修改成自己的。

不要把 scenarios.md 當預設拿來用 — 它是 fallback,不是 default。
