# Timer Alert Thresholds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed timer warning sound behavior with two configurable countdown thresholds: a one-time first alert at 15 seconds by default and a repeating second alert from 5 to 1 seconds by default, while preserving the existing end sound, extra-time flow, and legacy settings migration.

**Architecture:** Keep all pure timer normalization and alert-stage logic in `timer-utils.js`, then consume that contract from `index.html` for rendering and audio playback. To keep `secondWarning < firstWarning` enforceable in every saved state, clamp `firstWarning` to `2..300` and clamp `secondWarning` to `1..(firstWarning - 1)` during normalization before writing back to localStorage.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner (`node --test`), localStorage, service worker cache versioning

---

## File Structure

- Modify: `timer-utils.js`
  - Owns `DEFAULT_TIMER_SETTINGS`, legacy settings migration, threshold normalization, and `getTimerAlertStage(...)`
- Modify: `app-features.test.js`
  - Owns the Node assertions for timer helper behavior, `index.html` text/IDs, and version-string guardrails
- Modify: `index.html`
  - Owns the timer settings modal, app version string, timer screen initialization, display warning state, and alert audio dispatch
- Modify: `sw.js`
  - Owns the PWA cache name that must stay in sync with the app version when cached assets change

## Task 1: Update shared timer logic with TDD

**Files:**
- Modify: `app-features.test.js`
- Modify: `timer-utils.js`
- Test: `app-features.test.js`

- [ ] **Step 1: Write the failing timer helper tests in `app-features.test.js`**

Replace the existing timer-settings and alert-stage assertions with this content:

```js
test('timer utils support dual warning thresholds and legacy migration', () => {
  let timerUtils;

  try {
    timerUtils = require('./timer-utils.js');
  } catch (error) {
    assert.fail(`timer utils are not implemented yet: ${error.message}`);
  }

  const settings = timerUtils.normalizeTimerSettings({
    seconds: 90,
    warning: 15,
    extraSecs: 60,
    extraCount: 3
  });

  assert.deepEqual(settings, {
    seconds: 90,
    firstWarning: 15,
    secondWarning: 5,
    extraSecs: 60,
    initialCount: 3
  });

  assert.deepEqual(timerUtils.normalizeTimerSettings({ warning: 27 }), {
    seconds: 90,
    firstWarning: 27,
    secondWarning: 5,
    extraSecs: 60,
    initialCount: 1
  });

  assert.deepEqual(timerUtils.normalizeTimerSettings({
    firstWarning: 8,
    secondWarning: 12
  }), {
    seconds: 90,
    firstWarning: 8,
    secondWarning: 7,
    extraSecs: 60,
    initialCount: 1
  });

  assert.equal(timerUtils.normalizeTimerSettings({}).initialCount, 1);
  assert.deepEqual(timerUtils.createDefaultExtraCounts(2), {
    1: 2,
    2: 2,
    3: 2,
    4: 2,
    5: 2,
    6: 2,
    7: 2,
    8: 2,
    9: 2,
    10: 2,
    11: 2,
    12: 2
  });
});

test('timer utils expose configurable first and second countdown alerts', () => {
  let timerUtils;

  try {
    timerUtils = require('./timer-utils.js');
  } catch (error) {
    assert.fail(`timer utils are not implemented yet: ${error.message}`);
  }

  assert.equal(timerUtils.getTimerAlertStage(16, 15, 5), 'none');
  assert.equal(timerUtils.getTimerAlertStage(15, 15, 5), 'first-warning');
  assert.equal(timerUtils.getTimerAlertStage(14, 15, 5), 'none');
  assert.equal(timerUtils.getTimerAlertStage(5, 15, 5), 'second-warning');
  assert.equal(timerUtils.getTimerAlertStage(2, 15, 5), 'second-warning');
  assert.equal(timerUtils.getTimerAlertStage(1, 15, 5), 'second-warning');
  assert.equal(timerUtils.getTimerAlertStage(0, 15, 5), 'end');
});
```

- [ ] **Step 2: Run the focused test file and verify it fails**

Run:

```powershell
node --test app-features.test.js
```

Expected: FAIL because `normalizeTimerSettings(...)` still returns `warning`, and `getTimerAlertStage(...)` still returns `warning` / `urgent` instead of `first-warning` / `second-warning`.

- [ ] **Step 3: Implement the shared timer logic in `timer-utils.js`**

Update `DEFAULT_TIMER_SETTINGS`, add a threshold normalizer, and change `getTimerAlertStage(...)` to the new contract:

```js
const DEFAULT_TIMER_SETTINGS = {
  seconds: 90,
  firstWarning: 15,
  secondWarning: 5,
  extraSecs: 60,
  initialCount: 1
};

function normalizeWarningThresholds(source) {
  const firstWarning = toIntInRange(
    source.firstWarning ?? source.warning,
    DEFAULT_TIMER_SETTINGS.firstWarning,
    2,
    300
  );
  const secondWarning = Math.min(
    toIntInRange(source.secondWarning, DEFAULT_TIMER_SETTINGS.secondWarning, 1, 299),
    firstWarning - 1
  );

  return { firstWarning, secondWarning };
}

function normalizeTimerSettings(saved) {
  const source = saved && typeof saved === 'object' ? saved : {};
  const { firstWarning, secondWarning } = normalizeWarningThresholds(source);

  return {
    seconds: toIntInRange(source.seconds, DEFAULT_TIMER_SETTINGS.seconds, 10, 300),
    firstWarning,
    secondWarning,
    extraSecs: toIntInRange(source.extraSecs, DEFAULT_TIMER_SETTINGS.extraSecs, 10, 300),
    initialCount: toIntInRange(
      source.initialCount ?? source.extraCount,
      DEFAULT_TIMER_SETTINGS.initialCount,
      0,
      12
    )
  };
}

function getTimerAlertStage(
  remaining,
  firstWarningThreshold = DEFAULT_TIMER_SETTINGS.firstWarning,
  secondWarningThreshold = DEFAULT_TIMER_SETTINGS.secondWarning
) {
  const remainingSeconds = parseInt(remaining, 10);
  if (!Number.isFinite(remainingSeconds) || remainingSeconds < 0) return 'none';
  if (remainingSeconds === 0) return 'end';

  const firstWarning = toIntInRange(firstWarningThreshold, DEFAULT_TIMER_SETTINGS.firstWarning, 2, 300);
  const secondWarning = Math.min(
    toIntInRange(secondWarningThreshold, DEFAULT_TIMER_SETTINGS.secondWarning, 1, 299),
    firstWarning - 1
  );

  if (remainingSeconds === firstWarning) return 'first-warning';
  if (remainingSeconds <= secondWarning) return 'second-warning';

  return 'none';
}
```

Also remove `URGENT_WARNING_SECONDS` from the exported object, because the second threshold is now configuration-driven instead of constant-driven.

- [ ] **Step 4: Run the focused test file and verify it passes**

Run:

```powershell
node --test app-features.test.js
```

Expected: PASS for the current `app-features.test.js` file, because the helper contract now matches the updated tests and the HTML assertions have not been tightened yet.

- [ ] **Step 5: Commit the helper-only change**

Run:

```powershell
git add -- app-features.test.js timer-utils.js
git commit -m "refactor: support configurable timer alert stages" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: a commit containing only `app-features.test.js` and `timer-utils.js`.

## Task 2: Wire the UI, version sync, and regression tests

**Files:**
- Modify: `app-features.test.js`
- Modify: `index.html`
- Modify: `sw.js`
- Test: `app-features.test.js`

- [ ] **Step 1: Write the failing HTML guardrail assertions in `app-features.test.js`**

Update the HTML test so it expects the new labels, IDs, and synced version number:

```js
test('index HTML contains updated controls, labels, icon, and layout guardrails', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  assert.match(html, /v2026\.5\.19\.2/);
  assert.match(html, /id="timer-pause-btn"/);
  assert.match(html, /id="timer-preset-30"/);
  assert.match(html, /id="timer-preset-60"/);
  assert.match(html, /id="timer-preset-90"/);
  assert.match(html, /id="timer-preset-120"/);
  assert.match(html, /id="draw-select-all-btn"/);
  assert.match(html, /id="draw-exclude-all-btn"/);
  assert.match(html, /id="initialize-counts-btn"/);
  assert.match(html, /初始化次數/);
  assert.match(html, /時間到第一次提示/);
  assert.match(html, /時間到第二次提示/);
  assert.match(html, /id="set-first-warning"[^>]*value="15"/);
  assert.match(html, /id="set-second-warning"[^>]*value="5"/);
  assert.ok(!html.includes('id="set-warning"'));
  assert.ok(!html.includes('固定 15 秒'));
  assert.ok(!html.includes('加時次數上限'));
  assert.ok(!html.includes('aria-label="藍色酒杯"'));
  assert.match(html, /aria-label="[^\"]*睡[^\"]*"/);
  assert.match(html, /\.layout-add-row\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(html, /\.home-title h2\s*\{[^}]*font-size:\s*34px/s);
  assert.match(html, /\.menu-card \.label\s*\{[^}]*font-size:\s*18px/s);
  assert.match(html, /\.screen-title\s*\{[^}]*font-size:\s*20px/s);
  assert.match(html, /\.timer-number\s*\{[^}]*font-size:\s*80px/s);
  assert.match(html, /\.phase-num\s*\{[^}]*font-size:\s*14px/s);
  assert.match(html, /\.phase-duration\s*\{[^}]*font-size:\s*14px/s);
  assert.ok(!html.includes('font-size:12px;color:var(--text2);padding:8px">尚無紀錄'));
});
```

- [ ] **Step 2: Run the focused test file and verify it fails on the old UI**

Run:

```powershell
node --test app-features.test.js
```

Expected: FAIL because `index.html` still contains `set-warning`, still shows the fixed-warning copy, and still uses `v2026.5.19.1`.

- [ ] **Step 3: Implement the UI and versioning changes in `index.html` and `sw.js`**

Apply these changes together so the markup, runtime behavior, and cache version stay in sync.

Update the timer settings modal in `index.html`:

```html
<div class="form-row">
  <div class="form-label">時間到第一次提示</div>
  <input class="form-input" type="number" id="set-first-warning" min="2" max="300" value="15">
</div>
<div class="form-row">
  <div class="form-label">時間到第二次提示</div>
  <input class="form-input" type="number" id="set-second-warning" min="1" max="299" value="5">
</div>
```

Bump the synced version strings:

```html
<title>狼人殺工具箱 v2026.5.19.2</title>
```

```js
const APP_VERSION = 'v2026.5.19.2';
```

```js
const CACHE_NAME = 'werewolf-tools-v2026.5.19.2';
```

Update the `TimerUtils` destructuring and timer screen initialization:

```js
const {
  createDefaultExtraCounts,
  getTimerAlertStage,
  normalizeExtraCounts,
  normalizeTimerSettings
} = window.TimerUtils;

function initTimerScreen() {
  document.getElementById('set-seconds').value = timerSettings.seconds;
  document.getElementById('set-first-warning').value = timerSettings.firstWarning;
  document.getElementById('set-second-warning').value = timerSettings.secondWarning;
  document.getElementById('set-extra-secs').value = timerSettings.extraSecs;
  document.getElementById('set-initial-count').value = timerSettings.initialCount;
  renderExtraHistory();
  timerReset();
}
```

Update the warning-style and alert dispatch logic:

```js
function updateTimerDisplay() {
  const s = timerState.remaining;
  const el = document.getElementById('timer-display');
  const prog = document.getElementById('timer-prog');
  const total = timerSettings.seconds + timerState.totalExtra;
  const ratio = Math.max(0, s / total);
  const offset = CIRCUMFERENCE * (1 - ratio);
  prog.style.strokeDashoffset = offset;

  el.textContent = s;

  const isWarning = s <= timerSettings.firstWarning && s > 0;
  el.classList.toggle('warning', isWarning || s === 0);
  document.getElementById('pulse-ring').classList.toggle('active', s === 0);

  if (s === 0) {
    prog.style.stroke = '#e74c3c';
    document.querySelector('.timer-circle-wrap').classList.add('shaking');
    setTimeout(() => document.querySelector('.timer-circle-wrap').classList.remove('shaking'), 600);
  } else if (isWarning) {
    prog.style.stroke = '#e74c3c';
  } else {
    prog.style.stroke = 'var(--gold)';
  }
}

function timerTick() {
  if (timerState.remaining <= 0) return;
  timerState.remaining--;
  updateTimerDisplay();

  const alertStage = getTimerAlertStage(
    timerState.remaining,
    timerSettings.firstWarning,
    timerSettings.secondWarning
  );
  if (alertStage === 'first-warning') playWarning();
  if (alertStage === 'second-warning') playUrgentWarning();
  if (alertStage === 'end') {
    playEnd();
    timerStop();
    openExtraPanel();
  }
}
```

Update `saveTimerSettings()` so both thresholds persist through the existing `LS` helper:

```js
function saveTimerSettings() {
  timerSettings = normalizeTimerSettings({
    seconds: document.getElementById('set-seconds').value,
    firstWarning: document.getElementById('set-first-warning').value,
    secondWarning: document.getElementById('set-second-warning').value,
    extraSecs: document.getElementById('set-extra-secs').value,
    initialCount: document.getElementById('set-initial-count').value
  });
  LS.set('timerSettings', timerSettings);
  closeModal('timer-settings');
  timerReset();
}
```

- [ ] **Step 4: Run the full test suite and verify everything passes**

Run:

```powershell
node --test
```

Expected: PASS for `app-features.test.js` and `history-formatters.test.js`.

- [ ] **Step 5: Commit the UI and cache-sync change**

Run:

```powershell
git add -- app-features.test.js index.html sw.js
git commit -m "feat: add configurable timer alert thresholds" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: a commit containing the timer settings UI, runtime wiring, version bump, cache-name bump, and final test assertions.

## Self-Review Checklist

- Spec coverage:
  - Dual threshold defaults and migration are implemented in Task 1.
  - New `first-warning` / `second-warning` stage behavior is implemented in Task 1 and consumed in Task 2.
  - UI labels, persistence, display warning state, and end behavior preservation are implemented in Task 2.
  - Version sync for `index.html`, `sw.js`, and `app-features.test.js` is implemented in Task 2.
- Placeholder scan:
  - No placeholder markers, “similar to”, or unspecified “add tests” steps remain.
- Type consistency:
  - The plan consistently uses `firstWarning`, `secondWarning`, `first-warning`, and `second-warning` across tests, helper logic, and UI wiring.
