# Copilot Instructions

## Build、test、lint

- **Build：** 目前沒有設定。這個倉庫是直接從 repo 根目錄提供的靜態網頁應用。
- **完整測試：** `node --test`
- **單一測試檔：** `node --test app-features.test.js`
- **單一測試檔：** `node --test history-formatters.test.js`
- **Lint：** 目前沒有設定

## 高層架構

- `index.html` 是實際的應用入口，內含畫面結構、CSS，以及四個工具的大部分邏輯：發言計時、抽發言順序、版型抽籤、百變 2.0 抽牌。
- `timer-utils.js` 與 `history-formatters.js` 放的是可重用的純邏輯，同時給瀏覽器端與 Node 測試共用。兩者都採用相同模式：瀏覽器掛在 `window`，Node 透過 `module.exports` 匯出。
- 瀏覽器狀態透過 `index.html` 裡的 `LS` JSON 包裝器持久化。每個功能各自管理自己的 localStorage 狀態與歷史紀錄，進入畫面時再從狀態重新 render。
- `sw.js` 與 `manifest.json` 讓這個 app 可以作為 PWA 安裝。service worker 使用帶版本號的 cache name 與明確資產清單，所以只要快取資產有變更，就要同步更新那邊的版本資訊。

## 關鍵慣例

- 預設使用 **zh-TW**。新增或調整使用者可見文字、文件內容與 Copilot 回覆時，除非目標檔案已明確使用其他語言，否則請使用繁體中文（zh-TW）。
- `index.html` 的版本字串（`<title>` 與 `APP_VERSION`）、`sw.js` 的 `CACHE_NAME`、以及 `app-features.test.js` 內寫死的版本斷言必須同步更新。
- 純邏輯請放在 helper modules，不要再塞回 `index.html`。`index.html` 負責畫面流程、render 與事件綁定；純粹的正規化或格式化邏輯應放在共用模組中，才能直接用 Node 測試。
- 新的歷史紀錄請用 `createHistoryRecord(...)` 建立，顯示時間時請用 `formatHistoryTimestamp(r.at || r.time)`。這個 `at || time` fallback 是刻意保留，用來兼容舊資料。
- UI 文案與時間格式以 zh-TW 為主。`history-formatters.js` 刻意輸出 `YYYY/MM/DD HH:mm` 的 24 小時制，並保留已格式化的舊字串，不重新解析。
- 存取瀏覽器持久化資料時請用 `LS` helper，不要直接呼叫 `localStorage`。各功能的歷史紀錄維持「最新在前」並限制最多 10 筆。
- 計時器規則集中在 `timer-utils.js`：設定值正規化、預設加時次數、舊版 `extraCount` 遷移、warning/urgent/end 提示階段都由這個模組負責。不要在 `index.html` 內重複實作相同計時邏輯。
- 測試偏向字面與結構檢查。`app-features.test.js` 會比對精確的 ID、文案、CSS 值與 `index.html` 片段，因此只要調整 UI 或文案，通常就要同步更新對應測試。
