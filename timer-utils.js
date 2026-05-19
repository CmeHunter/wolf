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
    adjustSecs: 5,
    preset30Secs: 30,
    preset60Secs: 60,
    preset90Secs: 90,
    preset120Secs: 120,
    resetASecs: 0,
    resetBSecs: 0,
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

  function resolveAdjustSecs(source) {
    if (source.adjustSecs != null) return source.adjustSecs;

    const legacyShortcutValues = [
      parseInt(source.quickAddSecs, 10),
      parseInt(source.quickRestoreSecs, 10)
    ].filter((value) => Number.isFinite(value) && value > 0);

    if (legacyShortcutValues.length) return Math.min(...legacyShortcutValues);

    return DEFAULT_TIMER_SETTINGS.adjustSecs;
  }

  function normalizeTimerSettings(saved) {
    const source = saved && typeof saved === 'object' ? saved : {};
    const { firstWarning, secondWarning } = normalizeWarningThresholds(source);

    return {
      seconds: toIntInRange(source.seconds, DEFAULT_TIMER_SETTINGS.seconds, 1, 300),
      firstWarning,
      secondWarning,
      extraSecs: toIntInRange(source.extraSecs, DEFAULT_TIMER_SETTINGS.extraSecs, 1, 300),
      adjustSecs: toIntInRange(resolveAdjustSecs(source), DEFAULT_TIMER_SETTINGS.adjustSecs, 1, 300),
      preset30Secs: toIntInRange(source.preset30Secs, DEFAULT_TIMER_SETTINGS.preset30Secs, 1, 300),
      preset60Secs: toIntInRange(source.preset60Secs, DEFAULT_TIMER_SETTINGS.preset60Secs, 1, 300),
      preset90Secs: toIntInRange(source.preset90Secs, DEFAULT_TIMER_SETTINGS.preset90Secs, 1, 300),
      preset120Secs: toIntInRange(source.preset120Secs, DEFAULT_TIMER_SETTINGS.preset120Secs, 1, 300),
      resetASecs: toIntInRange(source.resetASecs, DEFAULT_TIMER_SETTINGS.resetASecs, 0, 300),
      resetBSecs: toIntInRange(source.resetBSecs, DEFAULT_TIMER_SETTINGS.resetBSecs, 0, 300),
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
    secondWarningThreshold = DEFAULT_TIMER_SETTINGS.secondWarning,
    alertBase = null
  ) {
    const remainingSeconds = parseInt(remaining, 10);
    if (!Number.isFinite(remainingSeconds) || remainingSeconds < 0) return 'none';
    if (remainingSeconds === 0) return 'end';

    const firstWarning = toIntInRange(firstWarningThreshold, DEFAULT_TIMER_SETTINGS.firstWarning, 2, 300);
    const secondWarning = Math.min(
      toIntInRange(secondWarningThreshold, DEFAULT_TIMER_SETTINGS.secondWarning, 1, 299),
      firstWarning - 1
    );

    const parsedAlertBase = parseInt(alertBase, 10);
    const canTriggerFirstWarning = !Number.isFinite(parsedAlertBase) || parsedAlertBase > firstWarning;
    const canTriggerSecondWarning = !Number.isFinite(parsedAlertBase) || parsedAlertBase > secondWarning;

    if (canTriggerFirstWarning && remainingSeconds === firstWarning) return 'first-warning';
    if (canTriggerSecondWarning && remainingSeconds <= secondWarning) return 'second-warning';

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