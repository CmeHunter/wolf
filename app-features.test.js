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
    resetASecs: 0,
    resetBSecs: 0,
    initialCount: 1
  });

  assert.deepEqual(timerUtils.normalizeTimerSettings({
    seconds: 0,
    extraSecs: 0,
    adjustSecs: 0,
    resetASecs: -5,
    resetBSecs: 999
  }), {
    seconds: 1,
    firstWarning: 15,
    secondWarning: 5,
    extraSecs: 1,
    adjustSecs: 1,
    resetASecs: 0,
    resetBSecs: 300,
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

  assert.match(html, /v2026\.5\.19\.6/);
  assert.match(sw, /werewolf-tools-v2026\.5\.19\.6/);
  assert.match(html, /id="timer-pause-btn"/);
  assert.match(html, /id="timer-quick-add-btn"/);
  assert.match(html, /id="timer-quick-restore-btn"/);
  assert.match(html, />增加5秒</);
  assert.match(html, />減少5秒</);
  assert.match(html, /id="timer-preset-30"/);
  assert.match(html, /id="timer-preset-60"/);
  assert.match(html, /id="timer-preset-90"/);
  assert.match(html, /id="timer-preset-120"/);
  assert.match(html, /id="timer-preset-a"/);
  assert.match(html, /id="timer-preset-b"/);
  assert.match(html, /id="timer-preset-a"[^>]*hidden/);
  assert.match(html, /id="timer-preset-b"[^>]*hidden/);
  assert.match(html, /id="draw-select-all-btn"/);
  assert.match(html, /id="draw-exclude-all-btn"/);
  assert.match(html, /id="initialize-counts-btn"/);
  assert.match(html, /剩餘加時次數/);
  assert.ok(!html.includes('號碼次數調整'));
  assert.match(html, /所有號碼重設為[^<]*依照設定檔/);
  assert.match(html, /時間到第一次提示/);
  assert.match(html, /時間到第二次提示/);
  assert.match(html, /增減秒數/);
  assert.match(html, /自訂重設A/);
  assert.match(html, /自訂重設B/);
  assert.match(html, />倒數計時</);
  assert.match(html, /id="set-seconds"[^>]*min="1"[^>]*value="90"/);
  assert.match(html, /id="set-first-warning"[^>]*value="15"/);
  assert.match(html, /id="set-second-warning"[^>]*value="5"/);
  assert.match(html, /id="set-extra-secs"[^>]*min="1"[^>]*value="60"/);
  assert.match(html, /id="set-adjust-secs"[^>]*min="1"[^>]*value="5"/);
  assert.match(html, /id="set-reset-a-secs"[^>]*min="0"[^>]*value="0"/);
  assert.match(html, /id="set-reset-b-secs"[^>]*min="0"[^>]*value="0"/);
  assert.match(html, /id="clear-extra-history-btn"/);
  assert.match(html, /id="clear-draw-history-btn"/);
  assert.match(html, /id="clear-layout-history-btn"/);
  assert.match(html, /id="clear-cards-history-btn"/);
  assert.ok(!html.includes('id="selected-number-text"'));
  assert.ok(!html.includes('初始化次數為'));
  assert.ok(!html.includes('id="set-warning"'));
  assert.ok(!html.includes('固定 15 秒'));
  assert.ok(!html.includes('加時次數上限'));
  assert.ok(!html.includes('快捷加時秒數'));
  assert.ok(!html.includes('快捷還你秒數'));
  assert.ok(!html.includes('30 / 60 / 90 / 120 秒'));
  assert.match(html, /輸入新版型名稱/);
  assert.ok(!html.includes('輸入新版本型名稱'));
  assert.ok(!html.includes('版型抽籤'));
  assert.match(html, /抽版型/);
  assert.ok(!html.includes('aria-label="藍色酒杯"'));
  assert.match(html, /fonts\.googleapis\.com\/css2\?family=Noto\+Sans\+TC:wght@400;500;700;900&family=Lexend:wght@400;600;700;800;900&display=swap/);
  assert.match(sw, /fonts\.googleapis\.com\/css2\?family=Noto\+Sans\+TC:wght@400;500;700;900&family=Lexend:wght@400;600;700;800;900&display=swap/);
  assert.ok(!html.includes('Noto Serif TC'));
  assert.ok(!html.includes('Cinzel'));
  assert.match(html, /\.layout-add-row\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(html, /body\s*\{[^}]*font-family:\s*var\(--font-ui\);[^}]*font-size:\s*20px/s);
  assert.match(html, /\.home-title h2\s*\{[^}]*font-size:\s*40px/s);
  assert.match(html, /\.menu-card \.label\s*\{[^}]*font-size:\s*20px/s);
  assert.match(html, /\.screen-title\s*\{[^}]*font-size:\s*22px/s);
  assert.match(html, /\.timer-number\s*\{[^}]*font-family:\s*var\(--font-num\);[^}]*font-size:\s*92px/s);
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
  assert.match(html, /const presetAButton = document\.getElementById\('timer-preset-a'\);/);
  assert.match(html, /const presetBButton = document\.getElementById\('timer-preset-b'\);/);
  assert.match(html, /const resetASecs = timerSettings\.resetASecs;/);
  assert.match(html, /const resetBSecs = timerSettings\.resetBSecs;/);
  assert.match(html, /presetAButton\.hidden = resetASecs <= 0;/);
  assert.match(html, /presetBButton\.hidden = resetBSecs <= 0;/);
  assert.match(html, /extraRow\.hidden = resetASecs <= 0 && resetBSecs <= 0;/);
  assert.match(html, /function updateInitializeCountsButton\(\)\s*\{[\s\S]*所有號碼重設為\$\{timerSettings\.initialCount\}\(依照設定檔\)[\s\S]*\}/);
  assert.match(html, /function clearExtraHistory\(\)\s*\{[\s\S]*timerState\.extraHistory = \[\][\s\S]*LS\.set\('extraHistory', timerState\.extraHistory\)[\s\S]*renderExtraHistory\(\)/);
  assert.match(html, /function clearDrawHistory\(\)\s*\{[\s\S]*drawHistory = \[\][\s\S]*LS\.set\('drawHistory', drawHistory\)[\s\S]*renderDrawHistory\(\)/);
  assert.match(html, /function clearLayoutHistory\(\)\s*\{[\s\S]*layoutHistory = \[\][\s\S]*LS\.set\('layoutHistory', layoutHistory\)[\s\S]*renderLayoutHistory\(\)/);
  assert.match(html, /function clearCardsHistory\(\)\s*\{[\s\S]*cardsHistory = \[\][\s\S]*LS\.set\('cardsHistory', cardsHistory\)[\s\S]*renderCardsHistory\(\)/);
  assert.match(html, /function adjustTimerRemaining\(secondsToAdd\)\s*\{[\s\S]*Math\.max\(1, timerState\.remaining \+ secondsToAdd\)[\s\S]*updateTimerDisplay\(\)/);
  assert.match(html, /function applyQuickIncreaseTime\(\)\s*\{[\s\S]*adjustTimerRemaining\(timerSettings\.adjustSecs\)[\s\S]*\}/);
  assert.match(html, /function applyQuickDecreaseTime\(\)\s*\{[\s\S]*adjustTimerRemaining\(-timerSettings\.adjustSecs\)[\s\S]*\}/);
  assert.match(html, /function saveTimerSettings\(\)\s*\{[\s\S]*adjustSecs:\s*document\.getElementById\('set-adjust-secs'\)\.value[\s\S]*resetASecs:\s*document\.getElementById\('set-reset-a-secs'\)\.value[\s\S]*resetBSecs:\s*document\.getElementById\('set-reset-b-secs'\)\.value[\s\S]*\}/);
  assert.match(html, /const isWarning = s <= timerSettings\.firstWarning && s > 0;/);
  assert.ok(!html.includes('font-size:12px;color:var(--text2);padding:8px">尚無紀錄'));
});

test('timer settings modal refreshes normalized values whenever it opens', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  assert.match(html, /function syncTimerSettingsInputs\(\)\s*\{[\s\S]*set-first-warning[\s\S]*timerSettings\.firstWarning[\s\S]*set-second-warning[\s\S]*timerSettings\.secondWarning[\s\S]*set-adjust-secs[\s\S]*timerSettings\.adjustSecs[\s\S]*set-reset-a-secs[\s\S]*timerSettings\.resetASecs[\s\S]*set-reset-b-secs[\s\S]*timerSettings\.resetBSecs[\s\S]*\}/);
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
    'timer-preset-a': createMockElement({ dataset: { seconds: '0' }, hidden: true, disabled: true }),
    'timer-preset-b': createMockElement({ dataset: { seconds: '0' }, hidden: true, disabled: true }),
    'timer-preset-extra-row': createMockElement({ hidden: true }),
    'initialize-counts-btn': createMockElement()
  };
  const timerSettings = {
    adjustSecs: 7,
    resetASecs: 45,
    resetBSecs: 0,
    initialCount: 3
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
        elements['timer-preset-120'],
        elements['timer-preset-a'],
        elements['timer-preset-b']
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
  assert.equal(elements['initialize-counts-btn'].textContent, '所有號碼重設為3(依照設定檔)');
  assert.equal(elements['timer-preset-30'].textContent, '重設30秒');
  assert.equal(elements['timer-preset-a'].hidden, false);
  assert.equal(elements['timer-preset-a'].disabled, false);
  assert.equal(elements['timer-preset-a'].dataset.seconds, '45');
  assert.equal(elements['timer-preset-a'].textContent, '重設45秒');
  assert.equal(elements['timer-preset-b'].hidden, true);
  assert.equal(elements['timer-preset-extra-row'].hidden, false);

  timerSettings.resetASecs = 0;
  timerSettings.resetBSecs = 25;
  functions.updateTimerPresetButtons();

  assert.equal(elements['timer-preset-a'].hidden, true);
  assert.equal(elements['timer-preset-b'].hidden, false);
  assert.equal(elements['timer-preset-b'].disabled, false);
  assert.equal(elements['timer-preset-b'].dataset.seconds, '25');
  assert.equal(elements['timer-preset-b'].textContent, '重設25秒');
  assert.equal(elements['timer-preset-extra-row'].hidden, false);

  timerSettings.resetBSecs = 0;
  functions.updateTimerPresetButtons();

  assert.equal(elements['timer-preset-a'].hidden, true);
  assert.equal(elements['timer-preset-b'].hidden, true);
  assert.equal(elements['timer-preset-extra-row'].hidden, true);
});