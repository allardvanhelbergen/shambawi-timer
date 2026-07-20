# Welcome And Completion States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add approved Still Water welcome and completed phases around the existing timer, with one-click immediate practice start and restart.

**Architecture:** Add a small pure session state machine for valid phase transitions, then let `src/app.js` own browser side effects such as animation frames, audio, speech, DOM visibility, and focus. Keep the practice plan, timeline, cue generation, and active timer UI unchanged. Render three sibling views with native `hidden`; use shared semantic ceremony markup and a generated bitmap ripple layer plus the existing leaf bitmap for decoration.

**Tech Stack:** Dependency-free HTML, CSS, browser JavaScript modules, Node.js `node:test`, Web Audio API, Web Speech API, GitHub Pages static build.

## Global Constraints

- Preserve every round, duration, transition, count, cue, toggle, and practice control.
- `state.phase` is the only authority for `welcome`, `practice`, and `completed` visibility.
- Start and Practice again each begin round 1 from the same user gesture; neither may require a second Play click.
- Reset from practice returns to welcome and cancels pending cues and speech.
- Repeated or stale transition events do nothing and cannot create a second animation loop.
- Ceremony views contain one heading and one action. The timer, rounds, settings, and progress must remain hidden and unfocusable outside practice.
- Use the supplied palette and real bitmap artwork. Do not draw the illustration with CSS or inline SVG.
- Ceremony views must fit without scrolling at desktop, `390x844`, and `360x800`.
- Keep the repository's relative asset paths so GitHub Pages continues to work below `/shambawi-timer/`.

---

## Task 1: Add A Tested Session State Machine

**Files:**
- Create: `src/sessionState.js`
- Create: `tests/sessionState.test.js`

- [x] **Step 1: Write failing transition tests**

Cover:

```js
const initial = createSessionState();
assert.deepEqual(initial, {
  phase: SESSION_PHASES.WELCOME,
  elapsedSeconds: 0,
  isRunning: false,
});

const started = transitionSession(initial, SESSION_EVENTS.START);
assert.equal(started.phase, SESSION_PHASES.PRACTICE);
assert.equal(started.elapsedSeconds, 0);
assert.equal(started.isRunning, true);

const completed = transitionSession(started, SESSION_EVENTS.COMPLETE);
assert.equal(completed.phase, SESSION_PHASES.COMPLETED);
assert.equal(completed.isRunning, false);

const restarted = transitionSession(completed, SESSION_EVENTS.PRACTICE_AGAIN);
assert.equal(restarted.phase, SESSION_PHASES.PRACTICE);
assert.equal(restarted.elapsedSeconds, 0);
assert.equal(restarted.isRunning, true);
```

Also assert Reset is valid only from practice and stale/repeated events return the original state object.

- [x] **Step 2: Run the focused test and confirm the expected failure**

Run: `node --test tests/sessionState.test.js`

Expected: FAIL because `src/sessionState.js` does not exist.

- [x] **Step 3: Implement the minimum state machine**

Export fixed `SESSION_PHASES`, fixed `SESSION_EVENTS`, `createSessionState()`, and `transitionSession(session, event)`. Valid transitions create a new state; invalid transitions return `session` unchanged.

- [x] **Step 4: Run the focused test**

Run: `node --test tests/sessionState.test.js`

Expected: PASS.

- [x] **Step 5: Run the full suite**

Run: `npm test`

Expected: all existing tests plus the new state tests pass.

- [x] **Step 6: Commit**

```sh
git add src/sessionState.js tests/sessionState.test.js
git commit -m "Add session phase state machine"
```

---

## Task 2: Wire Welcome, Practice, And Completed Views

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `tests/layout.test.js`

- [x] **Step 1: Add failing markup and source-contract tests**

Extend `tests/layout.test.js` to assert:

- `#welcome-view`, `#practice-view`, and `#completed-view` are sibling sections.
- Welcome is initially visible; practice and completed use native `hidden`.
- Welcome contains `#welcome-title` and `#start-practice-button` only.
- Completed contains `#completed-title` and `#practice-again-button` only.
- Ceremony headings use `tabindex="-1"` and action buttons have the approved labels.
- `app.js` imports the session state machine and has explicit `startPractice`, `completePractice`, `resetPractice`, and `renderPhase` paths.
- `renderPhase()` sets body phase data and synchronizes native `hidden` attributes.

- [x] **Step 2: Run the layout test and confirm the expected failure**

Run: `node --test tests/layout.test.js`

Expected: FAIL because the ceremony views and phase wiring do not exist.

- [x] **Step 3: Add semantic sibling views**

In `index.html`:

- Add a welcome ceremony section before the existing timer panel.
- Give the existing timer panel `id="practice-view"` and `hidden` initially.
- Add the completed ceremony section after the timer panel with `hidden` initially.
- Use a labelled circular play button on welcome and a text button on completed.
- Keep decorative illustration containers `aria-hidden="true"`; do not embed UI text in artwork.

- [x] **Step 4: Integrate phase state with timer side effects**

In `src/app.js`:

- Initialize state from `createSessionState()` and retain existing timing/audio fields.
- Track the current animation frame id so only one loop can run.
- `startPractice(SESSION_EVENTS.START)` and `startPractice(SESSION_EVENTS.PRACTICE_AGAIN)` must reject invalid transitions, cancel pending completion speech/cues, reset timing bookkeeping, transition phase, unlock audio, immediately cue round 1 once, and start one animation loop.
- The practice Play control continues to pause/resume without changing phase.
- Natural completion transitions to completed, keeps the completion bell/voice schedule alive, and focuses the completion heading.
- Reset cancels the frame, speech, and cue timeout, transitions to welcome, resets elapsed/segment state, and focuses the welcome heading.
- `renderPhase()` toggles `hidden`, sets `document.body.dataset.phase`, and only calls the existing timer rendering path while practice is active.
- Preserve Bell and Voice checkbox values during phase changes.

- [x] **Step 5: Run the focused tests**

Run: `node --test tests/sessionState.test.js tests/layout.test.js`

Expected: PASS.

- [x] **Step 6: Run the full suite**

Run: `npm test`

Expected: all tests pass with no practice-plan or cue regressions.

- [x] **Step 7: Commit**

```sh
git add index.html src/app.js tests/layout.test.js
git commit -m "Add welcome and completion flows"
```

---

## Task 3: Produce And Integrate Still Water Artwork

**Files:**
- Create: `assets/still-water-ripples.png`
- Modify: `src/styles.css`
- Modify: `tests/layout.test.js`

- [x] **Step 1: Generate the production ripple bitmap**

Use the approved desktop and mobile references as composition input. Generate only the low waterline and restrained concentric ripples, without text, controls, leaves, symbols, or a full-page background. Use a removable flat chroma background if transparency is unavailable from generation, then remove it with the image-generation utility.

Validation:

```sh
sips -g pixelWidth -g pixelHeight -g hasAlpha assets/still-water-ripples.png
```

Expected: a production-resolution PNG with alpha and stable dimensions suitable for desktop and mobile scaling.

- [x] **Step 2: Inspect the bitmap**

Verify transparent corners, no embedded text, palette-compatible green-grey/sage lines, and no accidental crop at the widest ripple.

- [x] **Step 3: Add failing visual-system contract tests**

Extend `tests/layout.test.js` to require:

- `assets/still-water-ripples.png` in ceremony CSS.
- Reuse of `assets/leaves.png` in ceremony artwork.
- `min-height: 100dvh` and `overflow: hidden` on ceremony views.
- Fixed desktop `48px` and mobile `30px` heading sizes.
- Start and Practice again targets at least `44px` high.
- A one-shot roughly `2.4s` ripple animation with no infinite iteration.
- A `prefers-reduced-motion: reduce` rule that disables ceremony animation.

- [x] **Step 4: Run the layout test and confirm the expected failure**

Run: `node --test tests/layout.test.js`

Expected: FAIL on the missing ceremony styling contracts.

- [x] **Step 5: Implement the ceremony visual system**

In `src/styles.css`:

- Add a full-viewport, unframed `.ceremony-view` layer with safe-area padding.
- Place the content group in the upper-middle and reserve the lower scene area.
- Use the generated ripple bitmap for the waterline/ripples.
- Use real `<img>` leaf layers sourced from `assets/leaves.png`, with one low-opacity vertically mirrored reflection.
- Mirror welcome lower-left composition to completed lower-right.
- Add a single 2.4-second entry animation that settles to a static final state.
- Disable that motion under reduced-motion preferences.
- Preserve existing practice CSS and restrict body-level practice leaves to `data-phase="practice"`.
- Use media-query type steps rather than viewport-sized text.
- Ensure the entire ceremony fits `390x844`, `360x800`, and short viewports with no scroll.

- [x] **Step 6: Run the focused and full tests**

Run: `node --test tests/layout.test.js`

Expected: PASS.

Run: `npm test`

Expected: all tests pass.

- [x] **Step 7: Commit**

```sh
git add assets/still-water-ripples.png src/styles.css tests/layout.test.js
git commit -m "Style Still Water ceremony states"
```

---

## Task 4: Browser QA, Documentation, And Static Build

**Files:**
- Modify: `docs/shambawi-timer.png`
- Modify: `README.md` only if the screenshot alt text or feature list becomes inaccurate

- [ ] **Step 1: Run automated verification**

Run: `npm test`

Expected: all tests pass.

Run: `npm run build:pages`

Expected: `_site` is rebuilt successfully and includes `src/sessionState.js` and `assets/still-water-ripples.png`.

- [ ] **Step 2: Start and verify the local app**

Run the app on the first available localhost port starting at `4173`, then verify HTTP 200 and expected welcome markup before opening it in the in-app Browser.

- [ ] **Step 3: Verify welcome and one-click start in Browser**

At desktop, `390x844`, and `360x800`:

- Only the welcome heading and Start action are visible initially.
- No vertical or horizontal scrolling occurs.
- Focus visibility and text contrast are clear.
- One Start click opens practice with round 1 counting down and the practice control labelled Pause.
- Reset returns directly to welcome.
- A rapid second activation cannot start a duplicate loop.

- [ ] **Step 4: Verify practice regression behavior**

- Seven rounds still render in the approved mobile-before-timer order.
- Play/pause, previous, next, reset, Bell, and Voice remain visible and usable.
- The timer fits one mobile viewport and control text/icons do not clip.
- Relative CSS, module, leaves, and ripple URLs all return HTTP 200.
- Browser console contains no uncaught errors or failed asset requests.

- [ ] **Step 5: Compare implementation to approved references**

Capture desktop and mobile implementation screenshots, place each beside its matching approved reference, and inspect the combined comparisons for composition, spacing, waterline height, illustration crop, hierarchy, and palette. Correct material mismatches before continuing.

- [ ] **Step 6: Refresh the repository screenshot**

Capture the implemented desktop welcome state as `docs/shambawi-timer.png`. Keep README copy synchronized if its screenshot description or feature list is no longer accurate.

- [ ] **Step 7: Re-run final verification**

Run: `npm test && npm run build:pages`

Expected: all tests pass and the Pages artifact builds.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 8: Commit documentation changes**

```sh
git add docs/shambawi-timer.png README.md
git commit -m "Update Shambawi welcome screenshot"
```

- [ ] **Step 9: Report final status**

Stop any temporary preview server, leave the verified app server running for the user, and report the exact localhost URL, test/build results, commit ids, and `git status --short --branch`. Do not push unless explicitly requested.
