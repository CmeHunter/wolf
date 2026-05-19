(function(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.HistoryFormatters = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function() {
  const historyDateTimeFormatter = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  function toValidDate(value) {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatHistoryTimestamp(value = new Date()) {
    if (value == null || value === '') {
      return '';
    }

    const parsedDate = toValidDate(value);
    if (!parsedDate) {
      return String(value);
    }

    const parts = Object.fromEntries(
      historyDateTimeFormatter
        .formatToParts(parsedDate)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value])
    );

    return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
  }

  function createHistoryRecord(payload) {
    return {
      ...payload,
      at: new Date().toISOString()
    };
  }

  return {
    createHistoryRecord,
    formatHistoryTimestamp
  };
});