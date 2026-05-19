# 發言計時雙階段提示設計

## 目標

將發言計時的倒數提示音從固定規則改為兩個可設定門檻：

- 第一次提示：預設 15 秒，倒數到該秒數時響一次
- 第二次提示：預設 5 秒，從該秒數開始到 1 秒期間每秒都響

0 秒時維持現有結束音與加時面板行為不變。

## 現況

- `timer-utils.js` 目前只保留單一 `warning` 設定，且正規化後固定回到 15。
- `getTimerAlertStage(...)` 目前回傳 `warning`、`urgent`、`end` 三種階段，其中 `urgent` 由固定常數 `URGENT_WARNING_SECONDS = 3` 控制。
- `index.html` 的計時設定視窗顯示「倒數提示音（固定 15 秒與最後 3 秒）」，並使用停用的 `set-warning` 欄位。
- `timerTick()` 依 alert stage 觸發 `playWarning()`、`playUrgentWarning()` 與 `playEnd()`。

## 設計摘要

本次沿用既有的純邏輯與畫面分工：

- `timer-utils.js` 負責設定值正規化與提示階段判斷
- `index.html` 負責設定欄位、畫面顯示與音效觸發

不新增新模組，不調整加時、歷史紀錄、開始/暫停/重設等既有流程。

## 設定模型

`DEFAULT_TIMER_SETTINGS` 調整為：

```js
{
  seconds: 90,
  firstWarning: 15,
  secondWarning: 5,
  extraSecs: 60,
  initialCount: 1
}
```

### 正規化規則

- `firstWarning` 允許範圍：1 到 300
- `secondWarning` 允許範圍：1 到 299
- `secondWarning` 必須小於 `firstWarning`
- 若使用者輸入無效值，回退到預設值
- 若使用者輸入使 `secondWarning >= firstWarning`，則自動修正為合理值，優先保留較大的第一次提示門檻與較小的第二次提示門檻

### 舊資料相容

若 localStorage 仍是舊格式：

- `warning` 存在時，轉成 `firstWarning = warning`
- `secondWarning` 不存在時，補預設值 `5`

這樣既有使用者不需要手動重設即可延續原本的第一次提示習慣。

## 提示階段

`getTimerAlertStage(...)` 改為回傳：

- `first-warning`：倒數剛好等於 `firstWarning`
- `second-warning`：倒數值大於 0 且小於等於 `secondWarning`
- `end`：倒數值等於 0
- `none`：其他情況

### 觸發規則

- 第一次提示只在命中 `firstWarning` 當下響一次
- 第二次提示從 `secondWarning` 到 `1` 秒期間每秒都響
- `0` 秒只播放結束音，不再重複第二次提示音

若門檻設定接近，仍以正規化後的結果保證：

- `first-warning` 與 `second-warning` 不會在同一秒同時成立
- 第二次提示一定發生在第一次提示之後

## UI 變更

計時設定視窗調整為兩個可編輯欄位：

- `時間到第一次提示`
- `時間到第二次提示`

預設值分別為 `15` 與 `5`。

原本固定提示文案移除，改為讓欄位名稱直接對應行為，避免誤解第二次提示只會響一次。

## 畫面與音效行為

- 倒數數字與圓環的紅色警示樣式，仍從 `firstWarning` 開始套用到倒數結束
- `playWarning()` 用於第一次提示
- 現有 `playUrgentWarning()` 沿用為第二次提示音，並在第二次提示區間內每秒觸發一次
- `playEnd()`、加時面板、加時紀錄與加時次數管理維持現狀

這樣可以保留目前使用者已習慣的緊迫音色與視覺節奏，只把固定門檻改成可設定門檻。

## 實作影響

### `timer-utils.js`

- 更新預設設定欄位
- 擴充 `normalizeTimerSettings(...)` 的遷移與門檻修正邏輯
- 移除固定 `URGENT_WARNING_SECONDS` 對計時提示的依賴
- 更新 `getTimerAlertStage(...)` 的參數與回傳值

### `index.html`

- 更新設定 modal 欄位與文案
- 載入與顯示 `firstWarning`、`secondWarning`
- `saveTimerSettings()` 改為儲存兩個提示門檻
- `updateTimerDisplay()` 的 warning 樣式判斷改為使用 `firstWarning`
- `timerTick()` 改以新階段控制提示音

### 測試

`app-features.test.js` 需要更新：

- `normalizeTimerSettings(...)` 預設值斷言
- 舊 `warning` 遷移斷言
- `getTimerAlertStage(...)` 的新階段斷言
- `index.html` 的新文案、欄位 ID、預設值與版本字串斷言

## 錯誤處理

- 不額外新增寬鬆 fallback 分支
- 所有輸入都透過既有正規化流程修正到合法範圍
- 非法值不靜默跳過，而是轉成預設或修正後的安全值，再回寫到畫面與 localStorage

## 非目標

本次不包含：

- 新增第三個以上的提示門檻
- 變更提示音音色或音量
- 調整加時規則
- 重構整體計時器 UI
