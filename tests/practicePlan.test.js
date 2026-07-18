import test from "node:test";
import assert from "node:assert/strict";

import {
  PRACTICE_PLAN,
  buildPracticeTimeline,
  formatClock,
  getSegmentAt,
} from "../src/practicePlan.js";

test("practice plan contains the requested seven rounds in order", () => {
  assert.deepEqual(
    PRACTICE_PLAN.map((round) => ({
      number: round.number,
      name: round.name,
      totalSeconds: round.totalSeconds,
      transitionSeconds: round.transitionSeconds ?? 0,
    })),
    [
      { number: 1, name: "Butterfly", totalSeconds: 120, transitionSeconds: 10 },
      {
        number: 2,
        name: "Rock the baby",
        totalSeconds: 120,
        transitionSeconds: 10,
      },
      {
        number: 3,
        name: "Cat stretch",
        totalSeconds: 150,
        transitionSeconds: 0,
      },
      {
        number: 4,
        name: "Alternate nostril breathing",
        totalSeconds: 420,
        transitionSeconds: 0,
      },
      {
        number: 5,
        name: "Auhm chanting",
        totalSeconds: 168,
        transitionSeconds: 0,
      },
      {
        number: 6,
        name: "Fluttering of the breath",
        totalSeconds: 240,
        transitionSeconds: 0,
      },
      {
        number: 7,
        name: "Locks and equalising",
        totalSeconds: 720,
        transitionSeconds: 0,
      },
    ],
  );
});

test("counting rounds expose repetition and step metadata", () => {
  const catStretch = PRACTICE_PLAN.find((round) => round.name === "Cat stretch");
  const auhm = PRACTICE_PLAN.find((round) => round.name === "Auhm chanting");

  assert.equal(catStretch.repetitions, 3);
  assert.equal(catStretch.stepsPerRepetition, 10);
  assert.equal(catStretch.stepSeconds, 5);

  assert.equal(auhm.repetitions, 21);
  assert.equal(auhm.stepSeconds, 8);
});

test("timeline inserts bell and announcement transitions between early rounds", () => {
  const timeline = buildPracticeTimeline(PRACTICE_PLAN);

  assert.equal(timeline[0].type, "round");
  assert.equal(timeline[0].name, "Butterfly");
  assert.equal(timeline[0].startSeconds, 0);
  assert.equal(timeline[0].durationSeconds, 120);

  assert.equal(timeline[1].type, "transition");
  assert.equal(timeline[1].name, "Prepare for Rock the baby");
  assert.equal(timeline[1].startSeconds, 120);
  assert.equal(timeline[1].durationSeconds, 10);
  assert.equal(timeline[1].nextRoundName, "Rock the baby");

  assert.equal(timeline[2].type, "round");
  assert.equal(timeline[2].name, "Rock the baby");
  assert.equal(timeline[2].startSeconds, 130);
});

test("getSegmentAt reports round progress and counting state", () => {
  const timeline = buildPracticeTimeline(PRACTICE_PLAN);
  const segment = getSegmentAt(timeline, 260);

  assert.equal(segment.name, "Cat stretch");
  assert.equal(segment.elapsedInSegment, 0);
  assert.equal(segment.remainingInSegment, 150);
  assert.equal(segment.repetition, 1);
  assert.equal(segment.step, 1);

  const laterSegment = getSegmentAt(timeline, 314);
  assert.equal(laterSegment.repetition, 2);
  assert.equal(laterSegment.step, 1);
});

test("formatClock renders minute and second countdowns", () => {
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(8), "0:08");
  assert.equal(formatClock(125), "2:05");
  assert.equal(formatClock(3723), "62:03");
});
