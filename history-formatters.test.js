const test = require('node:test');
const assert = require('node:assert/strict');

test('formatHistoryTimestamp returns zh-TW full date and time in 24-hour format', () => {
  let formatHistoryTimestamp;

  try {
    ({ formatHistoryTimestamp } = require('./history-formatters.js'));
  } catch (error) {
    assert.fail(`history formatter is not implemented yet: ${error.message}`);
  }

  const formatted = formatHistoryTimestamp('2026-05-19T08:09:00+08:00');

  assert.equal(formatted, '2026/05/19 08:09');
});

test('formatHistoryTimestamp preserves legacy preformatted history values', () => {
  let formatHistoryTimestamp;

  try {
    ({ formatHistoryTimestamp } = require('./history-formatters.js'));
  } catch (error) {
    assert.fail(`history formatter is not implemented yet: ${error.message}`);
  }

  assert.equal(formatHistoryTimestamp('下午 08:09'), '下午 08:09');
});