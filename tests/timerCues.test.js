import test from "node:test";
import assert from "node:assert/strict";

import { buildPracticeTimeline, PRACTICE_PLAN } from "../src/practicePlan.js";
import { getSegmentCue } from "../src/timerCues.js";

test("start cue announces the first round", () => {
  const timeline = buildPracticeTimeline(PRACTICE_PLAN);
  const cue = getSegmentCue(null, timeline[0]);

  assert.deepEqual(cue, {
    bell: true,
    announcement: "Begin Butterfly",
  });
});

test("transition cue announces the next exercise", () => {
  const timeline = buildPracticeTimeline(PRACTICE_PLAN);
  const cue = getSegmentCue(timeline[0], timeline[1]);

  assert.deepEqual(cue, {
    bell: true,
    announcement: "Next: Rock the baby",
  });
});

test("immediate round boundary cues the next exercise when no transition exists", () => {
  const timeline = buildPracticeTimeline(PRACTICE_PLAN);
  const alternateNostril = timeline.find(
    (segment) => segment.name === "Alternate nostril breathing",
  );
  const auhm = timeline.find((segment) => segment.name === "Auhm");

  const cue = getSegmentCue(alternateNostril, auhm);

  assert.deepEqual(cue, {
    bell: true,
    announcement: "Next: Auhm",
  });
});

test("moving from transition into its round does not repeat the announcement", () => {
  const timeline = buildPracticeTimeline(PRACTICE_PLAN);
  const transition = timeline.find(
    (segment) => segment.name === "Prepare for Rock the baby",
  );
  const rockTheBaby = timeline.find((segment) => segment.name === "Rock the baby");

  assert.equal(getSegmentCue(transition, rockTheBaby), null);
});
