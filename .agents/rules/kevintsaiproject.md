---
trigger: always_on
---

# 🎯 Kevin Tsai 蔡康永 — AI 輿情監控與自動發佈系統

## 專案概述

本專案的目標是建立一套 **AI 驅動的自動化輿情監控系統**，針對「蔡康永 Kevin Tsai」進行全方位的網路聲量追蹤、內容分析、文章產出與即時通知推播，並支援每日定時排程自動執行。

---

## 🔁 核心工作流程（5 大步驟）

### Step 1：搜集（Search / Collect）

- **目標**：從多個來源自動搜集與「蔡康永」相關的最新資訊
- **資料來源**：
  - 社群平台（Facebook、X/Twitter、Instagram、Threads、YouTube 等）
  - 網路新聞（Google News、各大新聞網站）
  - 公開訊息（論壇、PTT、Dcard、部落格等）
- **使用工具**：Search Tools / Web Scraping / API 串接
- **輸出**：結構化的原始資料集（標題、內容摘要、來源連結、發佈時間）

### Step 2：分析（Analyze）

- **目標**：使用 LLM 對搜集到的資料進行深度分析
- **分析維度**：
  - ✅ **正面分析**：正面評價、好評、粉絲互動亮點
  - ❌ **負面分析**：負面輿論、爭議事件、危機預警
  - 🔍 **深度分析**：趨勢走向、輿論情緒變化、熱門關鍵詞提取
- **使用工具**：LLM（大型語言模型，如 GPT / Gemini / Claude）
- **輸出**：分析報告（含情緒分數、關鍵摘要、趨勢判斷）

### Step 3：寫文（Generate Content）

- **目標**：根據分析結果，自動生成可發佈的文章內容
- **產出格式**：
  - 網頁文章（HTML 頁面）
  - 每篇文章包含：標題、摘要、正文、資料來源引用
- **發佈平台**：專案網頁（靜態網站 / 部落格系統）
- **輸出**：完整的網頁內容，可直接部署上線

### Step 4：通知（Notify）

- **目標**：將最新的分析結果與文章連結，即時推播通知給相關人員
- **通知管道**：
  - 📱 **LINE**：透過 LINE Notify 或 LINE Bot 發送
  - ✈️ **Telegram**：透過 Telegram Bot API 發送
- **通知內容**：
  - 今日輿情摘要
  - 重要事件警示（特別是負面輿論）
  - 新文章發佈連結

### Step 5：定時排程（Scheduled Automation）

- **目標**：讓整套流程自動化，無需人工介入
- **排程頻率**：每日執行（建議每日早上 8:00 執行一次）
- **排程工具**：Cron Job / Windows Task Scheduler / GitHub Actions / n8n
- **流程觸發順序**：搜集 → 分析 → 寫文 → 通知（依序串接）

---

## 🏗️ 技術架構規範

### 前端（網頁展示）

- 使用 HTML + CSS + JavaScript 建置
- 設計風格：現代化、深色主題、具備 RWD 響應式設計
- 文章列表頁 + 文章內頁 + 分析儀表板

### 後端 / 自動化引擎

- 搜集模組：Web Scraping（Puppeteer / Cheerio）或 API 串接
- 分析模組：串接 LLM API（OpenAI / Google Gemini / Anthropic）
- 通知模組：LINE Notify API + Telegram Bot API
- 排程模組：定時觸發器（Cron / Scheduler）

### 資料格式

- 原始資料：JSON 格式儲存
- 分析報告：Markdown 或 JSON 格式
- 網頁文章：HTML 檔案

---

## 📐 開發原則

1. **模組化設計**：每個步驟獨立為一個模組，方便維護與擴展
2. **容錯處理**：每個步驟需有錯誤處理機制，單一步驟失敗不影響整體流程
3. **日誌記錄**：每次執行都要記錄 log，方便除錯與追蹤
4. **可設定性**：關鍵字、排程時間、通知對象等應可透過設定檔調整
5. **安全性**：API Key 等敏感資訊不得寫死在程式碼中，需使用環境變數

---

## 📁 建議專案結構

```
kevin-tsai-project/
├── PROJECT_RULES.md          # 本文件 — 專案規範
├── config/
│   └── settings.json         # 設定檔（關鍵字、排程、通知對象）
├── src/
│   ├── collect/              # Step 1：搜集模組
│   ├── analyze/              # Step 2：分析模組
│   ├── generate/             # Step 3：寫文模組
│   ├── notify/               # Step 4：通知模組
│   └── scheduler/            # Step 5：排程模組
├── data/
│   ├── raw/                  # 原始搜集資料
│   ├── reports/              # 分析報告
│   └── articles/             # 生成的文章
├── web/                      # 網頁前端
│   ├── index.html
│   ├── style.css
│   └── script.js
├── logs/                     # 執行日誌
├── .env                      # 環境變數（API Keys）
└── package.json
```

---

## 🎯 監控目標

- **主要關鍵字**：蔡康永、Kevin Tsai
- **延伸關鍵字**：可依需求擴充（如節目名稱、合作藝人等）
- **監控語言**：繁體中文為主，英文為輔

---

## 📌 版本紀錄

| 版本 | 日期       | 說明                                 |
| ---- | ---------- | ------------------------------------ |
| v0.1 | 2026-03-18 | 初始版本，根據白板流程圖建立專案規範 |