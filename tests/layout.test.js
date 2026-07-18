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
  assert.match(styles, /body::before\s*\{[^}]*transform:\s*rotate\(168deg\)/s);
  assert.match(styles, /body::after\s*\{[^}]*transform:\s*rotate\(358deg\)/s);
  assert.match(
    styles,
    /@media \(max-width:\s*700px\)[\s\S]*?body::before\s*\{[^}]*transform:\s*rotate\(162deg\)/,
  );
  assert.match(
    styles,
    /@media \(max-width:\s*700px\)[\s\S]*?body::after\s*\{[^}]*transform:\s*rotate\(354deg\)/,
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
