(function(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.TimerUtils = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function() {
  const DEFAULT_TIMER_SETTINGS = {
    seconds: 90,
    firstWarning: 15,
    secondWarning: 5,
    extraSecs: 60,
    initialCount: 1
  };

  function toIntInRange(value, fallback, min, max) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

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

  function createDefaultExtraCounts(initialCount = DEFAULT_TIMER_SETTINGS.initialCount) {
    const normalizedInitialCount = toIntInRange(initialCount, DEFAULT_TIMER_SETTINGS.initialCount, 0, 12);
    const counts = {};

    for (let i = 1; i <= 12; i++) {
      counts[i] = normalizedInitialCount;
    }

    return counts;
  }

  function normalizeExtraCounts(saved, initialCount = DEFAULT_TIMER_SETTINGS.initialCount) {
    const counts = createDefaultExtraCounts(initialCount);
    if (!saved || typeof saved !== 'object') return counts;

    for (let i = 1; i <= 12; i++) {
      const value = parseInt(saved[i], 10);
      if (Number.isFinite(value) && value >= 0) counts[i] = value;
    }

    return counts;
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

  return {
    DEFAULT_TIMER_SETTINGS,
    createDefaultExtraCounts,
    getTimerAlertStage,
    normalizeExtraCounts,
    normalizeTimerSettings
  };
});