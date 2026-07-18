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
