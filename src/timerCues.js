export function getSegmentCue(previousSegment, currentSegment) {
  if (!currentSegment || previousSegment === currentSegment) {
    return null;
  }

  if (!previousSegment && currentSegment.type === "round") {
    return buildCue(`${currentSegment.name}`);
  }

  if (currentSegment.type === "transition") {
    return buildCue(`Next: ${currentSegment.nextRoundName}`);
  }

  if (currentSegment.type === "round" && previousSegment?.type !== "transition") {
    return buildCue(`Next: ${currentSegment.name}`);
  }

  return null;
}

function buildCue(announcement) {
  return {
    bell: true,
    announcement,
  };
}
