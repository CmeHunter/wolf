# Timer Shortcuts And History Clear Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-page history clearing, configurable timer shortcut buttons, and 1-second minimum timer settings without playing alerts for rounds that never rose above the alert thresholds.

**Architecture:** Keep timer-setting normalization and alert-stage rules in `timer-utils.js`, then let `index.html` consume that contract for UI, localStorage persistence, and audio playback. History clearing stays local to each feature state so no shared storage keys are coupled by accident.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner (`node --test`), localStorage, PWA service worker cache

---

## File Structure

- Modify: `app-features.test.js`
- Modify: `timer-utils.js`
- Modify: `index.html`
- Modify: `sw.js`

### Task 1: Lock new behavior with failing tests

**Files:**
- Modify: `app-features.test.js`
- Test: `app-features.test.js`

- [ ] Add timer-utils assertions for 1-second minimum settings, quick shortcut defaults, and alert suppression when a round starts at or below a warning threshold.
- [ ] Add HTML guardrails for the new quick buttons, settings inputs, clear-history buttons, and clear-history handlers.
- [ ] Run `node --test app-features.test.js` and confirm the new assertions fail for the current implementation.

### Task 2: Update timer normalization and alert gating

**Files:**
- Modify: `timer-utils.js`
- Test: `app-features.test.js`

- [ ] Extend `DEFAULT_TIMER_SETTINGS` with shortcut-second fields.
- [ ] Lower timer second clamps from 10 to 1 where the setting represents a duration.
- [ ] Extend `getTimerAlertStage(...)` to accept the current alert base and suppress warnings unless the round had more time than the threshold.
- [ ] Re-run `node --test app-features.test.js` and confirm timer-utils assertions pass while UI assertions still fail.

### Task 3: Wire UI controls and persistence

**Files:**
- Modify: `index.html`
- Modify: `sw.js`
- Test: `app-features.test.js`

- [ ] Add quick timer shortcut buttons under the pause button and sync their labels from settings.
- [ ] Add two timer-settings inputs for shortcut seconds and persist them through `saveTimerSettings()`.
- [ ] Track `alertBase` in timer state and update it on reset and time-increase flows.
- [ ] Add clear-history buttons plus per-feature clear handlers that wipe only the relevant history key after confirmation.
- [ ] Bump the app/service-worker version strings.
- [ ] Run `node --test app-features.test.js` and confirm the full file passes.

### Task 4: Final regression verification

**Files:**
- Test: `app-features.test.js`
- Test: `history-formatters.test.js`

- [ ] Run `node --test`.
- [ ] Confirm no regressions in history formatting or HTML guardrails before reporting completion.