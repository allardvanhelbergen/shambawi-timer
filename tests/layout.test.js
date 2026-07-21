import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

function getCssRule(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return styles.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

function getMarkupBetween(startId, endId) {
  const start = html.indexOf(`id="${startId}"`);
  const end = endId ? html.indexOf(`id="${endId}"`) : html.length;

  return start >= 0 && end > start ? html.slice(start, end) : "";
}

test("welcome, practice, and completed views are explicit siblings", () => {
  assert.match(
    html,
    /<section[^>]*id="welcome-view"[\s\S]*<section[^>]*id="practice-view"[^>]*hidden[\s\S]*<section[^>]*id="completed-view"[^>]*hidden/,
  );
  assert.doesNotMatch(
    html.match(/<section[^>]*id="welcome-view"[^>]*>/)?.[0] ?? "",
    /hidden/,
  );
});

test("ceremony views expose only their heading and primary action", () => {
  const welcome = getMarkupBetween("welcome-view", "practice-view");
  const completed = getMarkupBetween("completed-view");

  assert.match(
    welcome,
    /id="welcome-title"[^>]*tabindex="-1"[^>]*>Shambawi Mahamudra<br\s*\/>Kriya/,
  );
  assert.match(
    welcome,
    /id="start-practice-button"[^>]*aria-label="Start Shambawi Mahamudra Kriya"/,
  );
  assert.match(
    completed,
    /id="completed-title"[^>]*tabindex="-1"[^>]*>Shambawi completed/,
  );
  assert.match(
    completed,
    /id="practice-again-button"[^>]*>[\s\S]*Practice again/,
  );

  for (const ceremony of [welcome, completed]) {
    assert.doesNotMatch(ceremony, /bell-toggle|voice-toggle|round-list|timer-ring/);
  }
});

test("phase rendering owns view visibility and one-click practice entry", () => {
  assert.match(appSource, /from "\.\/sessionState\.js"/);
  assert.match(appSource, /function startPractice\(event\)/);
  assert.match(appSource, /function completePractice\(\)/);
  assert.match(appSource, /function resetPractice\(\)/);
  assert.match(appSource, /function renderPhase\(shouldFocus = false\)/);
  assert.match(appSource, /document\.body\.dataset\.phase = state\.phase/);
  assert.match(appSource, /elements\.welcomeView\.hidden =/);
  assert.match(appSource, /elements\.practiceView\.hidden =/);
  assert.match(appSource, /elements\.completedView\.hidden =/);
  assert.match(
    appSource,
    /startPractice\(SESSION_EVENTS\.START\)/,
  );
  assert.match(
    appSource,
    /startPractice\(SESSION_EVENTS\.PRACTICE_AGAIN\)/,
  );
  assert.match(appSource, /animationFrameId/);
  assert.match(appSource, /cancelAnimationFrame/);
});

test("control buttons use locally vendored Font Awesome Free Solid icons", () => {
  for (const icon of [
    "play",
    "pause",
    "backward-step",
    "forward-step",
    "rotate-left",
    "bell",
    "bell-slash",
    "comment",
    "comment-slash",
  ]) {
    assert.equal(
      existsSync(
        new URL(`../assets/fontawesome/solid/${icon}.svg`, import.meta.url),
      ),
      true,
      `${icon}.svg should be vendored locally`,
    );
  }

  assert.equal(
    existsSync(new URL("../assets/fontawesome/LICENSE.txt", import.meta.url)),
    true,
    "Font Awesome license should ship with the icons",
  );

  for (const icon of [
    "play",
    "backward-step",
    "forward-step",
    "rotate-left",
  ]) {
    assert.match(html, new RegExp(`class="fa-icon fa-${icon}"`));
  }

  for (const icon of [
    "play",
    "pause",
    "backward-step",
    "forward-step",
    "rotate-left",
    "bell",
    "bell-slash",
    "comment",
    "comment-slash",
  ]) {
    assert.match(
      getCssRule(`.fa-${icon}`),
      new RegExp(
        `--fa-icon:\\s*url\\(["']?\\.\\.\\/assets\\/fontawesome\\/solid\\/${icon}\\.svg["']?\\)`,
      ),
    );
  }

  assert.doesNotMatch(html, /style="--fa-icon:/);
  assert.doesNotMatch(appSource, /style\.setProperty\(\s*"--fa-icon"/);
  assert.match(
    appSource,
    /playIcon\.classList\.toggle\("fa-pause", state\.isRunning\)/,
  );
  assert.match(
    appSource,
    /playIcon\.classList\.toggle\("fa-play", !state\.isRunning\)/,
  );
  assert.doesNotMatch(html, /<svg\b/);
  assert.match(getCssRule(".fa-icon"), /mask:\s*var\(--fa-icon\)/);
});

test("practice entry guards against double-clicking through to timer controls", () => {
  assert.match(appSource, /function armPracticeEntryGuard\(\)/);
  assert.match(appSource, /is-entry-guarded/);
  assert.match(
    styles,
    /\.timer-panel\.is-entry-guarded\s*\{[^}]*pointer-events:\s*none/s,
  );
});

test("Still Water ceremony views use real artwork and one-viewport containment", () => {
  const ceremonyView = getCssRule(".ceremony-view");

  assert.match(styles, /url\(["']?\.\.\/assets\/still-water-ripples\.png["']?\)/);
  assert.match(
    html,
    /class="ceremony-leaves"[^>]*src="\.\/assets\/leaves-transparent\.png"/,
  );
  assert.match(html, /class="ceremony-ripples"[^>]*src="\.\/assets\/still-water-ripples\.png"/);
  assert.match(ceremonyView, /min-height:\s*100dvh/);
  assert.match(ceremonyView, /overflow:\s*hidden/);
  assert.match(styles, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
});

test("ceremony typography and actions use fixed accessible sizes", () => {
  const heading = getCssRule(".ceremony-content h1");
  const startButton = getCssRule(".ceremony-start-button");
  const againButton = getCssRule(".practice-again-button");

  assert.match(heading, /font-size:\s*48px/);
  assert.match(startButton, /width:\s*96px/);
  assert.match(startButton, /height:\s*96px/);
  assert.match(againButton, /min-height:\s*48px/);
  assert.match(
    styles,
    /@media \(max-width:\s*700px\)[\s\S]*?\.ceremony-content h1\s*\{[^}]*font-size:\s*30px/,
  );
  assert.match(
    styles,
    /@media \(max-width:\s*700px\)[\s\S]*?\.ceremony-start-button\s*\{[^}]*width:\s*72px;[^}]*height:\s*72px/,
  );
});

test("ceremony ripples animate once and respect reduced motion", () => {
  const ripples = getCssRule(".ceremony-ripples");

  assert.match(ripples, /animation:\s*ceremony-ripple-entry\s+2\.4s[^;]*\s1\s/);
  assert.doesNotMatch(ripples, /infinite/);
  assert.match(
    styles,
    /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.ceremony-ripples\s*\{[^}]*animation:\s*none/,
  );
});

test("round list and timer workspace are unframed", () => {
  const roundsPanel = getCssRule(".rounds-panel");
  const focusPanel = getCssRule(".focus-panel");

  assert.match(roundsPanel, /border:\s*0/);
  assert.match(roundsPanel, /background:\s*transparent/);
  assert.match(focusPanel, /border:\s*0/);
  assert.match(focusPanel, /background:\s*transparent/);
});

test("practice workspace omits decorative headings but keeps accessible names", () => {
  assert.match(
    html,
    /id="practice-view"[^>]*aria-label="Shambawi timer"/,
  );
  assert.match(
    html,
    /class="rounds-panel"[^>]*aria-label="Practice rounds"/,
  );
  assert.doesNotMatch(html, /id="app-title"|id="rounds-title"/);
  assert.doesNotMatch(html, /class="topbar"|class="rounds-header"/);
});

test("sound settings use icon-only on and off states inside the timer stage", () => {
  assert.match(
    html,
    /class="timer-stage"[\s\S]*class="toggles"[^>]*role="group"[^>]*aria-label="Sound settings"[\s\S]*id="bell-toggle"[^>]*aria-label="Bell sounds"[^>]*checked[\s\S]*fa-bell[\s\S]*fa-bell-slash[\s\S]*id="voice-toggle"[^>]*aria-label="Voice announcements"[^>]*checked[\s\S]*fa-comment[\s\S]*fa-comment-slash[\s\S]*id="timer-ring"/,
  );
  assert.doesNotMatch(html, /fa-volume-high|fa-volume-xmark/);
  assert.doesNotMatch(html, /<span>\s*(Bell|Voice)\s*<\/span>/);
  assert.match(getCssRule(".timer-stage"), /position:\s*relative/);
  assert.match(getCssRule(".toggles"), /position:\s*absolute/);
  assert.match(getCssRule(".toggles"), /top:\s*0/);
  assert.match(getCssRule(".toggles"), /right:\s*0/);
  assert.match(getCssRule(".sound-toggle"), /border:\s*0/);
  assert.match(getCssRule(".sound-toggle"), /border-radius:\s*50%/);
  assert.match(getCssRule(".sound-toggle"), /background:\s*transparent/);
  assert.match(
    getCssRule(".sound-toggle:hover"),
    /background:\s*var\(--panel-muted\)/,
  );
  assert.match(
    getCssRule(".sound-toggle:has(input:checked)"),
    /color:\s*rgba\(36,\s*79,\s*23,\s*0\.72\)/,
  );
  assert.match(
    getCssRule(".sound-toggle:has(input:not(:checked))"),
    /color:\s*rgba\(69,\s*89,\s*84,\s*0\.52\)/,
  );
  assert.doesNotMatch(styles, /\.sound-toggle:focus-within/);
  assert.match(
    getCssRule(".sound-toggle:has(input:focus-visible)"),
    /outline:\s*2px/,
  );
  assert.match(
    getCssRule(".sound-toggle input:checked ~ .sound-icon-on"),
    /display:\s*block/,
  );
  assert.match(
    getCssRule(".sound-toggle input:not(:checked) ~ .sound-icon-off"),
    /display:\s*block/,
  );
  assert.match(
    styles,
    /@media \(max-width:\s*700px\)[\s\S]*?\.sound-toggle\s*\{[^}]*width:\s*36px;[^}]*height:\s*36px;/,
  );
});

test("session progress shows elapsed and total time above the tracker", () => {
  assert.match(
    html,
    /class="session-progress-block"[\s\S]*class="session-progress-meta"[\s\S]*id="session-elapsed"[\s\S]*id="session-meta"[\s\S]*class="progress-track"/,
  );
  assert.doesNotMatch(html, /id="session-meta">Total /);
  assert.match(getCssRule(".session-progress-block"), /max-width:\s*590px/);
  assert.match(getCssRule(".session-progress-meta"), /display:\s*flex/);
  assert.match(
    getCssRule(".session-progress-meta"),
    /justify-content:\s*space-between/,
  );
  assert.match(appSource, /sessionElapsed:\s*document\.querySelector\("#session-elapsed"\)/);
  assert.match(
    appSource,
    /elements\.sessionMeta\.textContent = formatClock\(totalDuration\)/,
  );
  assert.match(appSource, /elements\.sessionElapsed\.textContent = formatClock\(/);
});

test("play control is horizontally centered in an asymmetric five-slot grid", () => {
  assert.match(getCssRule(".controls"), /display:\s*grid/);
  assert.match(
    getCssRule(".controls"),
    /grid-template-columns:\s*repeat\(5,\s*48px\)/,
  );
  assert.match(getCssRule(".controls"), /gap:\s*28px/);
  assert.match(getCssRule(".controls"), /justify-items:\s*center/);
  assert.match(getCssRule("#previous-button"), /grid-column:\s*2/);
  assert.match(getCssRule("#play-button"), /grid-column:\s*3/);
  assert.match(getCssRule("#next-button"), /grid-column:\s*4/);
  assert.match(getCssRule("#reset-button"), /grid-column:\s*5/);
  assert.match(getCssRule("#reset-button"), /width:\s*32px/);
  assert.match(getCssRule("#reset-button"), /height:\s*32px/);
  assert.match(getCssRule("#reset-button .fa-icon"), /width:\s*15px/);
  assert.match(getCssRule("#reset-button .fa-icon"), /height:\s*15px/);
  assert.match(getCssRule(".icon-button"), /border:\s*0/);
  assert.match(getCssRule(".icon-button"), /background:\s*transparent/);
  assert.match(
    getCssRule(".icon-button"),
    /color:\s*rgba\(36,\s*79,\s*23,\s*0\.72\)/,
  );
  assert.match(
    getCssRule(".icon-button:hover"),
    /background:\s*var\(--panel-muted\)/,
  );
  assert.match(
    getCssRule(".icon-button.primary"),
    /border:\s*1px solid var\(--forest\)/,
  );
  assert.match(
    getCssRule(".icon-button.primary:hover"),
    /background:\s*var\(--green-gray\)/,
  );
});

test("next round is disabled and inert on the final round", () => {
  assert.match(
    appSource,
    /elements\.nextButton\.disabled =\s*currentRound\?\.number === roundSegments\.at\(-1\)\?\.number/,
  );
  assert.match(
    appSource,
    /if \(nextIndex < 0 \|\| nextIndex >= roundSegments\.length\) \{\s+return;/,
  );
  assert.match(
    getCssRule(".icon-button:disabled"),
    /color:\s*rgba\(69,\s*89,\s*84,\s*0\.52\)/,
  );
  assert.match(getCssRule(".icon-button:disabled"), /cursor:\s*default/);
  assert.match(
    getCssRule(".icon-button:disabled:hover"),
    /background:\s*transparent/,
  );
});

test("timer core omits round-number labels", () => {
  assert.doesNotMatch(html, /id="round-kicker"|class="round-kicker"/);
  assert.doesNotMatch(appSource, /roundKicker|getKicker/);
  assert.doesNotMatch(styles, /\.round-kicker/);
});

test("announcement and next-round widgets are not rendered", () => {
  assert.doesNotMatch(html, /announcement-strip/);
  assert.doesNotMatch(html, /class="next-row"/);
  assert.doesNotMatch(appSource, /announcementStrip|elements\.nextRound/);
});

test("timed rounds omit a descriptor while repetition detail remains", () => {
  assert.doesNotMatch(appSource, /return "Timed round"/);
  assert.match(appSource, /return `Repetition \$\{segment\.repetition\}/);
});

test("approved meditation palette is exposed as CSS tokens", () => {
  for (const color of [
    "#876045",
    "#455954",
    "#c3dc9e",
    "#6a694e",
    "#244f17",
    "#ccd3db",
  ]) {
    assert.match(styles.toLowerCase(), new RegExp(color));
  }
});

test("outer app surface is unframed", () => {
  const timerPanel = getCssRule(".timer-panel");

  assert.match(timerPanel, /border:\s*0/);
  assert.match(timerPanel, /background:\s*transparent/);
  assert.match(timerPanel, /box-shadow:\s*none/);
});

test("generated botanical asset decorates the page", () => {
  assert.match(
    styles,
    /url\(["']?\.\.\/assets\/leaves-transparent\.png["']?\)/,
  );
  assert.match(
    getCssRule(".ceremony-leaves"),
    /filter:\s*saturate\(1\.6\) brightness\(0\.28\)/,
  );
});

test("programmatically focused phase headings do not show pointer focus rings", () => {
  assert.match(
    styles,
    /\[tabindex="-1"\]:focus\s*\{[^}]*outline:\s*none/s,
  );
});

test("botanical branches point in the reversed direction", () => {
  assert.match(
    styles,
    /body\[data-phase="practice"\]::before\s*\{[^}]*transform:\s*rotate\(168deg\)/s,
  );
  assert.match(
    styles,
    /body\[data-phase="practice"\]::after\s*\{[^}]*transform:\s*rotate\(358deg\)/s,
  );
  assert.match(
    styles,
    /@media \(max-width:\s*700px\)[\s\S]*?body\[data-phase="practice"\]::before\s*\{[^}]*transform:\s*rotate\(162deg\)/,
  );
  assert.match(
    styles,
    /@media \(max-width:\s*700px\)[\s\S]*?body\[data-phase="practice"\]::after\s*\{[^}]*transform:\s*rotate\(354deg\)/,
  );
  assert.match(
    styles,
    /\.completed-view \.ceremony-leaves\s*\{[^}]*transform-origin:\s*center bottom/s,
  );
});

test("compact mobile layout is one screen with rounds before the timer", () => {
  assert.match(styles, /@media \(max-width:\s*700px\)/);
  assert.match(styles, /height:\s*100dvh/);
  assert.match(styles, /overflow:\s*hidden/);
  assert.match(styles, /\.rounds-panel\s*\{[\s\S]*?order:\s*0/);
  assert.match(styles, /\.focus-panel\s*\{[\s\S]*?order:\s*1/);
  assert.match(
    styles,
    /@media \(max-width:\s*700px\)[\s\S]*?\.timer-ring\s*\{[^}]*align-self:\s*start;[^}]*margin-top:\s*34px;/,
  );
});

test("desktop grid keeps the timer inside its focus column", () => {
  const mainGrid = getCssRule(".main-grid");
  const timerRing = getCssRule(".timer-ring");

  assert.match(
    mainGrid,
    /grid-template-columns:\s*clamp\(300px,\s*34vw,\s*450px\)\s+minmax\(0,\s*1fr\)/,
  );
  assert.match(timerRing, /width:\s*min\(500px,\s*100%,\s*48vw\)/);
});
