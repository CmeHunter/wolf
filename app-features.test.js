const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

test('index HTML contains updated controls, labels, icon, and layout guardrails', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
  const manifest = fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8');

  assert.match(html, /v2026\.5\.19\.3/);
  assert.match(sw, /werewolf-tools-v2026\.5\.19\.3/);
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
  assert.match(html, /輸入新版型名稱/);
  assert.ok(!html.includes('輸入新版本型名稱'));
  assert.ok(!html.includes('版型抽籤'));
  assert.match(html, /抽版型/);
  assert.ok(!html.includes('aria-label="藍色酒杯"'));
  assert.match(html, /\.layout-add-row\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(html, /\.home-title h2\s*\{[^}]*font-size:\s*34px/s);
  assert.match(html, /\.menu-card \.label\s*\{[^}]*font-size:\s*18px/s);
  assert.match(html, /\.screen-title\s*\{[^}]*font-size:\s*20px/s);
  assert.match(html, /\.timer-number\s*\{[^}]*font-size:\s*80px/s);
  assert.match(html, /\.phase-num\s*\{[^}]*font-size:\s*14px/s);
  assert.match(html, /\.phase-duration\s*\{[^}]*font-size:\s*14px/s);
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
  assert.ok(!html.includes('font-size:12px;color:var(--text2);padding:8px">尚無紀錄'));
});

test('timer settings modal refreshes normalized values whenever it opens', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  assert.match(html, /function syncTimerSettingsInputs\(\)\s*\{[\s\S]*set-first-warning[\s\S]*timerSettings\.firstWarning[\s\S]*set-second-warning[\s\S]*timerSettings\.secondWarning[\s\S]*\}/);
  assert.match(html, /function openModal\(id\)\s*\{[\s\S]*if\s*\(id === 'timer-settings'\)\s*syncTimerSettingsInputs\(\);[\s\S]*classList\.add\('active'\)/);
});