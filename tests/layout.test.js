import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

  assert.match(welcome, /id="welcome-title"[^>]*tabindex="-1"[^>]*>Start Shambawi/);
  assert.match(
    welcome,
    /id="start-practice-button"[^>]*aria-label="Start Shambawi"/,
  );
  assert.match(
    completed,
    /id="completed-title"[^>]*tabindex="-1"[^>]*>Shambawi completed/,
  );
  assert.match(completed, /id="practice-again-button"[^>]*>Practice again/);

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

test("Still Water ceremony views use real artwork and one-viewport containment", () => {
  const ceremonyView = getCssRule(".ceremony-view");

  assert.match(styles, /url\(["']?\.\.\/assets\/still-water-ripples\.png["']?\)/);
  assert.match(html, /class="ceremony-leaves"[^>]*src="\.\/assets\/leaves\.png"/);
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

test("session total is presented as part of the rounds header", () => {
  assert.match(
    html,
    /class="rounds-header"[\s\S]*id="rounds-title"[\s\S]*id="session-meta"/,
  );
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
  assert.match(styles, /url\(["']?\.\.\/assets\/leaves\.png["']?\)/);
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
});

test("compact mobile layout is one screen with rounds before the timer", () => {
  assert.match(styles, /@media \(max-width:\s*700px\)/);
  assert.match(styles, /height:\s*100dvh/);
  assert.match(styles, /overflow:\s*hidden/);
  assert.match(styles, /\.rounds-panel\s*\{[\s\S]*?order:\s*0/);
  assert.match(styles, /\.focus-panel\s*\{[\s\S]*?order:\s*1/);
  assert.match(
    styles,
    /@media \(max-width:\s*700px\)[\s\S]*?\.timer-ring\s*\{[^}]*align-self:\s*start;[^}]*margin-top:\s*14px;/,
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
