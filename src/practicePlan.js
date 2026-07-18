export const PRACTICE_PLAN = [
  {
    number: 1,
    name: "Butterfly",
    totalSeconds: 2 * 60,
    transitionSeconds: 10,
  },
  {
    number: 2,
    name: "Rock the baby",
    totalSeconds: 2 * 60,
    transitionSeconds: 10,
  },
  {
    number: 3,
    name: "Cat stretch",
    totalSeconds: 3 * 10 * 5,
    repetitions: 3,
    stepsPerRepetition: 10,
    stepSeconds: 5,
  },
  {
    number: 4,
    name: "Alternate nostril breathing",
    totalSeconds: 7 * 60,
  },
  {
    number: 5,
    name: "Auhm chanting",
    totalSeconds: 21 * 8,
    repetitions: 21,
    stepSeconds: 8,
  },
  {
    number: 6,
    name: "Fluttering of the breath",
    totalSeconds: 4 * 60,
  },
  {
    number: 7,
    name: "Locks and equalising",
    totalSeconds: 12 * 60,
  },
];

export function buildPracticeTimeline(rounds) {
  let cursor = 0;
  const timeline = [];

  rounds.forEach((round, index) => {
    timeline.push({
      ...round,
      type: "round",
      startSeconds: cursor,
      durationSeconds: round.totalSeconds,
    });
    cursor += round.totalSeconds;

    const nextRound = rounds[index + 1];
    if (nextRound && round.transitionSeconds > 0) {
      timeline.push({
        type: "transition",
        name: `Prepare for ${nextRound.name}`,
        startSeconds: cursor,
        durationSeconds: round.transitionSeconds,
        nextRoundName: nextRound.name,
        roundNumber: nextRound.number,
      });
      cursor += round.transitionSeconds;
    }
  });

  return timeline;
}

export function getTotalDuration(timeline) {
  const finalSegment = timeline.at(-1);
  if (!finalSegment) {
    return 0;
  }

  return finalSegment.startSeconds + finalSegment.durationSeconds;
}

export function getSegmentAt(timeline, elapsedSeconds) {
  const totalDuration = getTotalDuration(timeline);
  const boundedElapsed = Math.min(Math.max(0, elapsedSeconds), totalDuration);
  const segment =
    timeline.find(
      (item) =>
        boundedElapsed >= item.startSeconds &&
        boundedElapsed < item.startSeconds + item.durationSeconds,
    ) ?? timeline.at(-1);

  if (!segment) {
    return null;
  }

  const elapsedInSegment = Math.min(
    Math.max(0, boundedElapsed - segment.startSeconds),
    segment.durationSeconds,
  );
  const remainingInSegment = Math.max(
    0,
    segment.durationSeconds - elapsedInSegment,
  );

  return {
    ...segment,
    elapsedInSegment,
    remainingInSegment,
    progress:
      segment.durationSeconds === 0
        ? 1
        : elapsedInSegment / segment.durationSeconds,
    ...getCountingState(segment, elapsedInSegment),
  };
}

function getCountingState(segment, elapsedInSegment) {
  if (segment.type !== "round" || !segment.repetitions || !segment.stepSeconds) {
    return {};
  }

  const stepIndex = Math.min(
    Math.floor(elapsedInSegment / segment.stepSeconds),
    getTotalSteps(segment) - 1,
  );
  const stepsPerRepetition = segment.stepsPerRepetition ?? 1;

  return {
    repetition: Math.floor(stepIndex / stepsPerRepetition) + 1,
    step: (stepIndex % stepsPerRepetition) + 1,
    totalSteps: getTotalSteps(segment),
  };
}

function getTotalSteps(segment) {
  return segment.repetitions * (segment.stepsPerRepetition ?? 1);
}

export function formatClock(totalSeconds) {
  const boundedSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(boundedSeconds / 60);
  const seconds = boundedSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
