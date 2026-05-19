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
    warning: 15,
    extraSecs: 60,
    initialCount: 1
  };

  const URGENT_WARNING_SECONDS = 3;

  function toIntInRange(value, fallback, min, max) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function normalizeTimerSettings(saved) {
    const source = saved && typeof saved === 'object' ? saved : {};

    return {
      seconds: toIntInRange(source.seconds, DEFAULT_TIMER_SETTINGS.seconds, 10, 300),
      warning: DEFAULT_TIMER_SETTINGS.warning,
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

  function getTimerAlertStage(remaining, warningThreshold = DEFAULT_TIMER_SETTINGS.warning, urgentThreshold = URGENT_WARNING_SECONDS) {
    const remainingSeconds = parseInt(remaining, 10);
    if (!Number.isFinite(remainingSeconds) || remainingSeconds < 0) return 'none';
    if (remainingSeconds === 0) return 'end';

    const urgentSeconds = toIntInRange(urgentThreshold, URGENT_WARNING_SECONDS, 1, 10);
    if (remainingSeconds <= urgentSeconds) return 'urgent';

    const warningSeconds = toIntInRange(warningThreshold, DEFAULT_TIMER_SETTINGS.warning, 0, 300);
    if (warningSeconds > urgentSeconds && remainingSeconds === warningSeconds) return 'warning';

    return 'none';
  }

  return {
    DEFAULT_TIMER_SETTINGS,
    URGENT_WARNING_SECONDS,
    createDefaultExtraCounts,
    getTimerAlertStage,
    normalizeExtraCounts,
    normalizeTimerSettings
  };
});