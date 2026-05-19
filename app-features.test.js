const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function extractFunctionSource(html, functionName) {
  const signature = `function ${functionName}(`;
  const start = html.indexOf(signature);
  assert.notEqual(start, -1, `${functionName} should exist in index.html`);

  const bodyStart = html.indexOf('{', start);
  let depth = 0;

  for (let i = bodyStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }

  assert.fail(`could not parse ${functionName} from index.html`);
}

function loadHtmlFunctions(html, functionNames, contextValues) {
  const context = vm.createContext({ ...contextValues });
  const source = functionNames.map((name) => extractFunctionSource(html, name)).join('\n\n');
  const exportSource = functionNames.map((name) => `${name}: ${name}`).join(', ');
  const script = new vm.Script(`${source}\nthis.__loadedFunctions = { ${exportSource} };`);
  script.runInContext(context);
  return {
    context,
    functions: context.__loadedFunctions
  };
}

function createMockElement(overrides = {}) {
  return {
    dataset: {},
    textContent: '',
    hidden: false,
    disabled: false,
    ...overrides
  };
}

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
    adjustSecs: 5,
    preset30Secs: 30,
    preset60Secs: 60,
    preset90Secs: 90,
    preset120Secs: 120,
    resetASecs: 0,
    resetBSecs: 0,
    initialCount: 3
  });

  assert.deepEqual(timerUtils.normalizeTimerSettings({ warning: 27 }), {
    seconds: 90,
    firstWarning: 27,
    secondWarning: 5,
    extraSecs: 60,
    adjustSecs: 5,
    preset30Secs: 30,
    preset60Secs: 60,
    preset90Secs: 90,
    preset120Secs: 120,
    resetASecs: 0,
    resetBSecs: 0,
    initialCount: 1
  });

  assert.equal(
    timerUtils.normalizeTimerSettings({ quickAddSecs: 42, quickRestoreSecs: 9 }).adjustSecs,
    9
  );

  assert.equal(
    timerUtils.normalizeTimerSettings({ quickAddSecs: 60, quickRestoreSecs: 10 }).adjustSecs,
    10
  );

  assert.deepEqual(timerUtils.normalizeTimerSettings({
    firstWarning: 8,
    secondWarning: 12
  }), {
    seconds: 90,
    firstWarning: 8,
    secondWarning: 7,
    extraSecs: 60,
    adjustSecs: 5,
    preset30Secs: 30,
    preset60Secs: 60,
    preset90Secs: 90,
    preset120Secs: 120,
    resetASecs: 0,
    resetBSecs: 0,
    initialCount: 1
  });

  assert.deepEqual(timerUtils.normalizeTimerSettings({
    seconds: 0,
    extraSecs: 0,
    adjustSecs: 0,
    preset30Secs: 0,
    preset60Secs: 12,
    preset90Secs: 999,
    preset120Secs: -5,
    resetASecs: -5,
    resetBSecs: 999
  }), {
    seconds: 1,
    firstWarning: 15,
    secondWarning: 5,
    extraSecs: 1,
    adjustSecs: 1,
    preset30Secs: 1,
    preset60Secs: 12,
    preset90Secs: 300,
    preset120Secs: 1,
    resetASecs: 0,
    resetBSecs: 300,
    initialCount: 1
  });

  assert.equal(timerUtils.normalizeTimerSettings({}).initialCount, 1);
  assert.equal(timerUtils.normalizeTimerSettings({}).preset120Secs, 120);
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

  assert.equal(timerUtils.getTimerAlertStage(16, 15, 5, 20), 'none');
  assert.equal(timerUtils.getTimerAlertStage(15, 15, 5, 20), 'first-warning');
  assert.equal(timerUtils.getTimerAlertStage(14, 15, 5, 20), 'none');
  assert.equal(timerUtils.getTimerAlertStage(5, 15, 5, 20), 'second-warning');
  assert.equal(timerUtils.getTimerAlertStage(2, 15, 5, 20), 'second-warning');
  assert.equal(timerUtils.getTimerAlertStage(1, 15, 5, 20), 'second-warning');
  assert.equal(timerUtils.getTimerAlertStage(0, 15, 5, 20), 'end');
  assert.equal(timerUtils.getTimerAlertStage(15, 15, 5, 15), 'none');
  assert.equal(timerUtils.getTimerAlertStage(5, 15, 5, 5), 'none');
  assert.equal(timerUtils.getTimerAlertStage(4, 15, 5, 4), 'none');
});

test('index HTML contains updated controls, labels, icon, and layout guardrails', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
  const manifest = fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8');

  assert.match(html, /v2026\.5\.19/);
  assert.doesNotMatch(html, /v2026\.5\.19\.8/);
  assert.match(sw, /werewolf-tools-v2026\.5\.19/);
  assert.doesNotMatch(sw, /werewolf-tools-v2026\.5\.19\.8/);
  assert.match(html, /id="app-version">v2026\.5\.19</);
  assert.match(html, /id="timer-pause-btn"/);
  assert.match(html, /id="timer-quick-add-btn"/);
  assert.match(html, /id="timer-quick-restore-btn"/);
  assert.match(html, />增加5秒</);
  assert.match(html, />減少5秒</);
  assert.match(html, /id="timer-preset-30"/);
  assert.match(html, /id="timer-preset-60"/);
  assert.match(html, /id="timer-preset-90"/);
  assert.match(html, /id="timer-preset-120"/);
  assert.match(html, /id="timer-preset-30"[^>]*onclick="applyTimerPreset\(this\.dataset\.seconds\)"/);
  assert.match(html, /id="timer-preset-60"[^>]*onclick="applyTimerPreset\(this\.dataset\.seconds\)"/);
  assert.match(html, /id="timer-preset-90"[^>]*onclick="applyTimerPreset\(this\.dataset\.seconds\)"/);
  assert.match(html, /id="timer-preset-120"[^>]*onclick="applyTimerPreset\(this\.dataset\.seconds\)"/);
  assert.match(html, /id="draw-start-btn"/);
  assert.match(html, /id="draw-select-all-btn"/);
  assert.match(html, /id="draw-exclude-all-btn"/);
  assert.match(html, /id="initialize-counts-btn"/);
  assert.match(html, /剩餘加時次數/);
  assert.ok(!html.includes('號碼次數調整'));
  assert.match(html, /id="initialize-counts-btn"[^>]*>所有號碼重設為1</);
  assert.match(html, /時間到第一次提示/);
  assert.match(html, /時間到第二次提示/);
  assert.match(html, /增減秒數/);
  assert.match(html, /重設按鈕一/);
  assert.match(html, /重設按鈕二/);
  assert.match(html, /重設按鈕三/);
  assert.match(html, /重設按鈕四/);
  assert.match(html, />倒數計時</);
  assert.match(html, /id="set-seconds"[^>]*min="1"[^>]*value="90"/);
  assert.match(html, /id="set-first-warning"[^>]*value="15"/);
  assert.match(html, /id="set-second-warning"[^>]*value="5"/);
  assert.match(html, /id="set-adjust-secs"[^>]*min="1"[^>]*value="5"/);
  assert.match(html, /id="set-preset-30-secs"[^>]*min="1"[^>]*value="30"/);
  assert.match(html, /id="set-preset-60-secs"[^>]*min="1"[^>]*value="60"/);
  assert.match(html, /id="set-preset-90-secs"[^>]*min="1"[^>]*value="90"/);
  assert.match(html, /id="set-preset-120-secs"[^>]*min="1"[^>]*value="120"/);
  assert.match(html, /id="clear-extra-history-btn"/);
  assert.match(html, /id="clear-draw-history-btn"/);
  assert.match(html, /id="clear-layout-history-btn"/);
  assert.match(html, /id="clear-cards-history-btn"/);
  assert.ok(!html.includes('id="extra-panel"'));
  assert.ok(!html.includes('extra-selected-text'));
  assert.ok(!html.includes('extra-remain-text'));
  assert.ok(!html.includes('本次加時對象'));
  assert.ok(!html.includes('確認加時'));
  assert.ok(!html.includes('id="selected-number-text"'));
  assert.ok(!html.includes('初始化次數為'));
  assert.ok(!html.includes('id="set-warning"'));
  assert.ok(!html.includes('固定 15 秒'));
  assert.ok(!html.includes('加時次數上限'));
  assert.ok(!html.includes('快捷加時秒數'));
  assert.ok(!html.includes('快捷還你秒數'));
  assert.ok(!html.includes('30 / 60 / 90 / 120 秒'));
  assert.ok(!html.includes('id="timer-preset-a"'));
  assert.ok(!html.includes('id="timer-preset-b"'));
  assert.ok(!html.includes('id="timer-preset-extra-row"'));
  assert.ok(!html.includes('自訂重設A'));
  assert.ok(!html.includes('自訂重設B'));
  assert.ok(!html.includes('set-reset-a-secs'));
  assert.ok(!html.includes('set-reset-b-secs'));
  assert.ok(!html.includes('set-initial-count'));
  assert.ok(!html.includes('初始化次數'));
  assert.ok(!html.includes('id="set-extra-secs"'));
  assert.ok(!html.includes('加時秒數'));
  assert.ok(!html.includes("getElementById('set-extra-secs')"));
  assert.match(html, /id="draw-result-card"[\s\S]*請按下方按鈕/);
  assert.match(html, /id="layout-result-card"[\s\S]*請按下方按鈕/);
  assert.ok(!html.includes('按下抽籤開始'));
  assert.match(html, /輸入新版型名稱/);
  assert.ok(!html.includes('輸入新版本型名稱'));
  assert.ok(!html.includes('版型抽籤'));
  assert.match(html, /抽版型/);
  assert.ok(!html.includes('aria-label="藍色酒杯"'));
  assert.match(html, /fonts\.googleapis\.com\/css2\?family=Noto\+Sans\+TC:wght@400;500;700;900&family=Lexend:wght@400;600;700;800;900&display=swap/);
  assert.match(sw, /fonts\.googleapis\.com\/css2\?family=Noto\+Sans\+TC:wght@400;500;700;900&family=Lexend:wght@400;600;700;800;900&display=swap/);
  assert.ok(!html.includes('Noto Serif TC'));
  assert.ok(!html.includes('Cinzel'));
  assert.ok(!html.includes('class="timer-label"'));
  assert.match(html, /\.layout-add-row\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(html, /body\s*\{[^}]*font-family:\s*var\(--font-ui\);[^}]*font-size:\s*20px/s);
  assert.match(html, /\.home-title h2\s*\{[^}]*font-size:\s*40px/s);
  assert.match(html, /\.menu-card \.label\s*\{[^}]*font-size:\s*20px/s);
  assert.match(html, /\.screen-title\s*\{[^}]*font-size:\s*22px/s);
  assert.match(html, /\.timer-content\s*\{[^}]*padding:\s*44px 20px 30px/s);
  assert.match(html, /\.timer-number\s*\{[^}]*font-family:\s*Arial,\s*sans-serif;[^}]*font-size:\s*112px/s);
  assert.match(html, /\.btn\s*\{[^}]*font-size:\s*20px/s);
  assert.match(html, /\.btn-sm\s*\{[^}]*font-size:\s*18px/s);
  assert.match(html, /\.form-label\s*\{[^}]*font-size:\s*17px/s);
  assert.match(html, /\.form-input\s*\{[^}]*font-family:\s*var\(--font-num\);[^}]*font-size:\s*20px/s);
  assert.match(html, /\.panel-action-row\s*\{[^}]*margin-top:\s*16px;[^}]*margin-bottom:\s*18px/s);
  assert.match(html, /\.phase-num\s*\{[^}]*font-size:\s*16px/s);
  assert.match(html, /\.phase-duration\s*\{[^}]*font-size:\s*16px/s);
  assert.match(html, /\.role-card\.witch\s*\{[^}]*#5a0000[^}]*#a01010/s);
  assert.match(html, /\.role-card\.hunter\s*\{[^}]*#0d4a2a[^}]*#1a8a4a/s);
  assert.match(html, /\.role-card\.seer\s*\{[^}]*#8e7ae6[^}]*#d6cbff/s);
  assert.match(html, /src="pic\/發言計時\.jpg"/);
  assert.match(html, /src="pic\/抽發言順序\.jpg"/);
  assert.match(html, /src="pic\/抽版型\.jpg"/);
  assert.match(html, /src="pic\/百變\.jpg"/);
  assert.match(html, /src="pic\/魔術師\.jpg"/);
  assert.match(html, /src="pic\/攝夢人\.jpg"/);
  assert.match(html, /src="pic\/女巫\.jpg"/);
  assert.match(html, /src="pic\/熊\.jpg"/);
  assert.match(html, /src="pic\/獵人\.jpg"/);
  assert.match(html, /src="pic\/預言家\.jpg"/);
  assert.match(sw, /'\.\/pic\/發言計時\.jpg'/);
  assert.match(sw, /'\.\/pic\/抽發言順序\.jpg'/);
  assert.match(sw, /'\.\/pic\/抽版型\.jpg'/);
  assert.match(sw, /'\.\/pic\/百變\.jpg'/);
  assert.match(sw, /'\.\/pic\/魔術師\.jpg'/);
  assert.match(sw, /'\.\/pic\/攝夢人\.jpg'/);
  assert.match(sw, /'\.\/pic\/女巫\.jpg'/);
  assert.match(sw, /'\.\/pic\/熊\.jpg'/);
  assert.match(sw, /'\.\/pic\/獵人\.jpg'/);
  assert.match(sw, /'\.\/pic\/預言家\.jpg'/);
  assert.match(manifest, /抽版型/);
  assert.match(html, /function updateTimerShortcutButtons\(\)\s*\{[\s\S]*增加\$\{timerSettings\.adjustSecs\}秒[\s\S]*減少\$\{timerSettings\.adjustSecs\}秒[\s\S]*\}/);
  assert.match(html, /function updateTimerPresetButtons\(\)\s*\{/);
  assert.match(html, /timer-preset-30/);
  assert.match(html, /timerSettings\.preset30Secs/);
  assert.match(html, /timerSettings\.preset60Secs/);
  assert.match(html, /timerSettings\.preset90Secs/);
  assert.match(html, /timerSettings\.preset120Secs/);
  assert.match(html, /function updateInitializeCountsButton\(\)\s*\{[\s\S]*所有號碼重設為1[\s\S]*\}/);
  assert.match(html, /function clearExtraHistory\(\)\s*\{[\s\S]*timerState\.extraHistory = \[\][\s\S]*LS\.set\('extraHistory', timerState\.extraHistory\)[\s\S]*renderExtraHistory\(\)/);
  assert.match(html, /function clearDrawHistory\(\)\s*\{[\s\S]*drawHistory = \[\][\s\S]*LS\.set\('drawHistory', drawHistory\)[\s\S]*renderDrawHistory\(\)/);
  assert.match(html, /function clearLayoutHistory\(\)\s*\{[\s\S]*layoutHistory = \[\][\s\S]*LS\.set\('layoutHistory', layoutHistory\)[\s\S]*renderLayoutHistory\(\)/);
  assert.match(html, /function clearCardsHistory\(\)\s*\{[\s\S]*cardsHistory = \[\][\s\S]*LS\.set\('cardsHistory', cardsHistory\)[\s\S]*renderCardsHistory\(\)/);
  assert.match(html, /function adjustTimerRemaining\(secondsToAdd\)\s*\{[\s\S]*Math\.max\(1, timerState\.remaining \+ secondsToAdd\)[\s\S]*updateTimerDisplay\(\)/);
  assert.match(html, /function applyQuickIncreaseTime\(\)\s*\{[\s\S]*adjustTimerRemaining\(timerSettings\.adjustSecs\)[\s\S]*\}/);
  assert.match(html, /function applyQuickDecreaseTime\(\)\s*\{[\s\S]*adjustTimerRemaining\(-timerSettings\.adjustSecs\)[\s\S]*\}/);
  assert.match(html, /let timerSettings = normalizeTimerSettings\(\{[\s\S]*extraSecs:\s*60[\s\S]*\}\);/);
  assert.match(html, /function saveTimerSettings\(\)\s*\{[\s\S]*extraSecs:\s*60[\s\S]*adjustSecs:\s*document\.getElementById\('set-adjust-secs'\)\.value[\s\S]*preset30Secs:\s*document\.getElementById\('set-preset-30-secs'\)\.value[\s\S]*preset60Secs:\s*document\.getElementById\('set-preset-60-secs'\)\.value[\s\S]*preset90Secs:\s*document\.getElementById\('set-preset-90-secs'\)\.value[\s\S]*preset120Secs:\s*document\.getElementById\('set-preset-120-secs'\)\.value[\s\S]*\}/);
  assert.match(html, /function initializeExtraCounts\(\)\s*\{[\s\S]*window\.confirm\([\s\S]*所有號碼重設為1[\s\S]*createDefaultExtraCounts\(\)[\s\S]*\}/);
  assert.match(html, /const isWarning = s <= timerSettings\.firstWarning && s > 0;/);
  assert.ok(!html.includes('font-size:12px;color:var(--text2);padding:8px">尚無紀錄'));

  const drawStartButtonIndex = html.indexOf('id="draw-start-btn"');
  const drawExcludeSectionIndex = html.indexOf('🚫 排除號碼（點擊切換）');
  assert.ok(drawStartButtonIndex !== -1);
  assert.ok(drawExcludeSectionIndex !== -1);
  assert.ok(drawStartButtonIndex < drawExcludeSectionIndex);
});

test('timer settings modal refreshes normalized values whenever it opens', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  assert.match(html, /function syncTimerSettingsInputs\(\)\s*\{[\s\S]*set-first-warning[\s\S]*timerSettings\.firstWarning[\s\S]*set-second-warning[\s\S]*timerSettings\.secondWarning[\s\S]*set-adjust-secs[\s\S]*timerSettings\.adjustSecs[\s\S]*set-preset-30-secs[\s\S]*timerSettings\.preset30Secs[\s\S]*set-preset-60-secs[\s\S]*timerSettings\.preset60Secs[\s\S]*set-preset-90-secs[\s\S]*timerSettings\.preset90Secs[\s\S]*set-preset-120-secs[\s\S]*timerSettings\.preset120Secs[\s\S]*\}/);
  assert.match(html, /function openModal\(id\)\s*\{[\s\S]*if\s*\(id === 'timer-settings'\)\s*syncTimerSettingsInputs\(\);[\s\S]*classList\.add\('active'\)/);
});

test('timer button helper functions update DOM from current settings', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const elements = {
    'timer-quick-add-btn': createMockElement(),
    'timer-quick-restore-btn': createMockElement(),
    'timer-preset-30': createMockElement({ dataset: { seconds: '30' } }),
    'timer-preset-60': createMockElement({ dataset: { seconds: '60' } }),
    'timer-preset-90': createMockElement({ dataset: { seconds: '90' } }),
    'timer-preset-120': createMockElement({ dataset: { seconds: '120' } }),
    'initialize-counts-btn': createMockElement()
  };
  const timerSettings = {
    adjustSecs: 7,
    preset30Secs: 25,
    preset60Secs: 55,
    preset90Secs: 85,
    preset120Secs: 115
  };
  const document = {
    getElementById(id) {
      return elements[id] ?? null;
    },
    querySelectorAll(selector) {
      if (selector !== '.timer-preset-btn') return [];
      return [
        elements['timer-preset-30'],
        elements['timer-preset-60'],
        elements['timer-preset-90'],
        elements['timer-preset-120']
      ];
    }
  };
  const { functions } = loadHtmlFunctions(
    html,
    ['updateTimerShortcutButtons', 'updateTimerPresetButtons', 'updateInitializeCountsButton'],
    { document, timerSettings }
  );

  functions.updateTimerShortcutButtons();
  functions.updateInitializeCountsButton();
  functions.updateTimerPresetButtons();

  assert.equal(elements['timer-quick-add-btn'].textContent, '增加7秒');
  assert.equal(elements['timer-quick-restore-btn'].textContent, '減少7秒');
  assert.equal(elements['initialize-counts-btn'].textContent, '所有號碼重設為1');
  assert.equal(elements['timer-preset-30'].dataset.seconds, '25');
  assert.equal(elements['timer-preset-30'].textContent, '重設25秒');
  assert.equal(elements['timer-preset-60'].dataset.seconds, '55');
  assert.equal(elements['timer-preset-60'].textContent, '重設55秒');
  assert.equal(elements['timer-preset-90'].dataset.seconds, '85');
  assert.equal(elements['timer-preset-90'].textContent, '重設85秒');
  assert.equal(elements['timer-preset-120'].dataset.seconds, '115');
  assert.equal(elements['timer-preset-120'].textContent, '重設115秒');
});

test('timer tick reuses the first warning sound for the second warning and does not open extra controls at end', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  let warningCalls = 0;
  let urgentCalls = 0;
  let endCalls = 0;
  let stopCalls = 0;
  let openPanelCalls = 0;
  let displayUpdates = 0;

  const timerState = {
    remaining: 6,
    alertBase: 90
  };

  const { functions, context } = loadHtmlFunctions(
    html,
    ['timerTick'],
    {
      timerState,
      timerSettings: {
        firstWarning: 15,
        secondWarning: 5
      },
      updateTimerDisplay() {
        displayUpdates++;
      },
      getTimerAlertStage() {
        return 'second-warning';
      },
      playWarning() {
        warningCalls++;
      },
      playUrgentWarning() {
        urgentCalls++;
      },
      playEnd() {
        endCalls++;
      },
      timerStop() {
        stopCalls++;
      },
      openExtraPanel() {
        openPanelCalls++;
      }
    }
  );

  functions.timerTick();

  assert.equal(timerState.remaining, 5);
  assert.equal(displayUpdates, 1);
  assert.equal(warningCalls, 1);
  assert.equal(urgentCalls, 0);
  assert.equal(endCalls, 0);
  assert.equal(stopCalls, 0);
  assert.equal(openPanelCalls, 0);

  timerState.remaining = 1;
  context.getTimerAlertStage = () => 'end';

  functions.timerTick();

  assert.equal(timerState.remaining, 0);
  assert.equal(endCalls, 1);
  assert.equal(stopCalls, 1);
  assert.equal(openPanelCalls, 0);
});

test('timer start and pause play draw and layout chimes', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  let drawChimeCalls = 0;
  let layoutChimeCalls = 0;
  let resetCalls = 0;
  let stopCalls = 0;
  let updateCalls = 0;
  let audioCtxCalls = 0;
  let intervalCalls = 0;

  const timerState = {
    remaining: 90,
    running: false,
    interval: null
  };

  const { functions } = loadHtmlFunctions(
    html,
    ['timerStart', 'timerPause'],
    {
      timerState,
      timerTick() {},
      getAudioCtx() {
        audioCtxCalls++;
      },
      playDrawChime() {
        drawChimeCalls++;
      },
      playLayoutChime() {
        layoutChimeCalls++;
      },
      timerReset() {
        resetCalls++;
        timerState.remaining = 90;
      },
      clearInterval() {},
      setInterval() {
        intervalCalls++;
        return 321;
      },
      updateTimerControls() {
        updateCalls++;
      },
      timerStop() {
        stopCalls++;
        timerState.running = false;
        timerState.interval = null;
      }
    }
  );

  functions.timerStart();

  assert.equal(audioCtxCalls, 1);
  assert.equal(drawChimeCalls, 1);
  assert.equal(layoutChimeCalls, 0);
  assert.equal(resetCalls, 0);
  assert.equal(intervalCalls, 1);
  assert.equal(updateCalls, 1);
  assert.equal(timerState.running, true);
  assert.equal(timerState.interval, 321);

  functions.timerPause();

  assert.equal(layoutChimeCalls, 1);
  assert.equal(stopCalls, 1);
});

test('audio context helper recreates closed contexts and resumes suspended audio', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  let resumeCalls = 0;
  let createdContexts = 0;
  const suspendedCtx = {
    state: 'suspended',
    resume() {
      resumeCalls++;
      this.state = 'running';
      return Promise.resolve();
    }
  };

  function MockAudioCtx() {
    createdContexts++;
    return {
      state: 'running',
      resume() {
        resumeCalls++;
        return Promise.resolve();
      }
    };
  }

  const { functions, context } = loadHtmlFunctions(
    html,
    ['getAudioCtx'],
    {
      AudioCtx: MockAudioCtx,
      audioCtx: suspendedCtx
    }
  );

  const resumedCtx = functions.getAudioCtx();
  assert.equal(resumedCtx, suspendedCtx);
  assert.equal(resumeCalls, 1);

  context.audioCtx = {
    state: 'closed',
    resume() {
      resumeCalls++;
      return Promise.resolve();
    }
  };

  const recreatedCtx = functions.getAudioCtx();
  assert.equal(createdContexts, 1);
  assert.notEqual(recreatedCtx.state, 'closed');
});

test('home branding, timer count controls, and footer copy reflect the updated UI copy', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  assert.match(html, /<title>狼人殺小幫手 v/);
  assert.match(html, />狼人殺小幫手</);
  assert.ok(!html.includes('Werewolf Tools'));
  assert.ok(!html.includes('狼人殺工具箱'));
  assert.ok(!html.includes('⚡ 加時 60 秒'));

  const speakerGridIndex = html.indexOf('id="speaker-grid"');
  const minusButtonIndex = html.indexOf('id="count-mode-minus"');
  const plusButtonIndex = html.indexOf('id="count-mode-plus"');
  const initializeButtonIndex = html.indexOf('id="initialize-counts-btn"');
  const menuGridIndex = html.indexOf('class="menu-grid"');
  const appVersionIndex = html.indexOf('id="app-version"');

  assert.ok(speakerGridIndex !== -1);
  assert.ok(minusButtonIndex !== -1);
  assert.ok(plusButtonIndex !== -1);
  assert.ok(initializeButtonIndex !== -1);
  assert.ok(menuGridIndex !== -1);
  assert.ok(appVersionIndex !== -1);
  assert.ok(speakerGridIndex < minusButtonIndex);
  assert.ok(speakerGridIndex < plusButtonIndex);
  assert.ok(speakerGridIndex < initializeButtonIndex);
  assert.ok(menuGridIndex < appVersionIndex);

  assert.ok(!html.includes('Made by Hunter'));
});

test('clear history handlers also reset the current draw, layout, and card results', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const setCalls = [];
  let drawResultRenders = 0;
  let drawHistoryRenders = 0;
  let layoutResultRenders = 0;
  let layoutHistoryRenders = 0;
  let cardsResultRenders = 0;
  let cardsHistoryRenders = 0;

  const { functions, context } = loadHtmlFunctions(
    html,
    ['clearDrawHistory', 'clearLayoutHistory', 'clearCardsHistory'],
    {
      drawHistory: [{ num: 7, order: '順序' }],
      drawCurrentResult: { num: 7, order: '順序' },
      layoutHistory: [{ name: '夢魘守衛' }],
      layoutCurrentResult: '夢魘守衛',
      cardsHistory: [{ names: '女巫、獵人' }],
      cardsCurrentResult: ['女巫', '獵人'],
      confirmClearHistory() {
        return true;
      },
      LS: {
        set(key, value) {
          setCalls.push([key, value]);
        }
      },
      renderDrawResult() {
        drawResultRenders++;
      },
      renderDrawHistory() {
        drawHistoryRenders++;
      },
      renderLayoutResult() {
        layoutResultRenders++;
      },
      renderLayoutHistory() {
        layoutHistoryRenders++;
      },
      renderCardsResult() {
        cardsResultRenders++;
      },
      renderCardsHistory() {
        cardsHistoryRenders++;
      }
    }
  );

  functions.clearDrawHistory();
  functions.clearLayoutHistory();
  functions.clearCardsHistory();

  assert.deepEqual(Array.from(context.drawHistory), []);
  assert.equal(context.drawCurrentResult, null);
  assert.deepEqual(Array.from(context.layoutHistory), []);
  assert.equal(context.layoutCurrentResult, '');
  assert.deepEqual(Array.from(context.cardsHistory), []);
  assert.deepEqual(Array.from(context.cardsCurrentResult), []);

  assert.equal(drawResultRenders, 1);
  assert.equal(drawHistoryRenders, 1);
  assert.equal(layoutResultRenders, 1);
  assert.equal(layoutHistoryRenders, 1);
  assert.equal(cardsResultRenders, 1);
  assert.equal(cardsHistoryRenders, 1);

  assert.deepEqual(setCalls.map(([key, value]) => [key, Array.isArray(value) ? Array.from(value) : value]), [
    ['drawCurrentResult', null],
    ['drawHistory', []],
    ['layoutCurrentResult', ''],
    ['layoutHistory', []],
    ['cardsCurrentResult', []],
    ['cardsHistory', []]
  ]);
});

test('initialize extra counts asks for confirmation before resetting to one', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  let persistCalls = 0;
  let renderCalls = 0;
  let remainCalls = 0;
  let confirmMessage = '';
  const timerState = {
    extraCounts: { 1: 3, 2: 2 }
  };

  let loaded = loadHtmlFunctions(html, ['initializeExtraCounts'], {
    timerState,
    createDefaultExtraCounts(initialCount = 1) {
      return { 1: initialCount, 2: initialCount };
    },
    persistTimerSelectionState() {
      persistCalls++;
    },
    renderSpeakerGrid() {
      renderCalls++;
    },
    updateExtraRemainText() {
      remainCalls++;
    },
    window: {
      confirm(message) {
        confirmMessage = message;
        return false;
      }
    }
  });

  loaded.functions.initializeExtraCounts();
  assert.deepEqual(timerState.extraCounts, { 1: 3, 2: 2 });
  assert.equal(persistCalls, 0);
  assert.equal(renderCalls, 0);
  assert.equal(remainCalls, 0);
  assert.match(confirmMessage, /所有號碼重設為1/);

  loaded = loadHtmlFunctions(html, ['initializeExtraCounts'], {
    timerState,
    createDefaultExtraCounts(initialCount = 1) {
      return { 1: initialCount, 2: initialCount };
    },
    persistTimerSelectionState() {
      persistCalls++;
    },
    renderSpeakerGrid() {
      renderCalls++;
    },
    updateExtraRemainText() {
      remainCalls++;
    },
    window: {
      confirm() {
        return true;
      }
    }
  });

  loaded.functions.initializeExtraCounts();
  assert.deepEqual(timerState.extraCounts, { 1: 1, 2: 1 });
  assert.equal(persistCalls, 1);
  assert.equal(renderCalls, 1);
  assert.equal(remainCalls, 1);
});