import {
  PRACTICE_PLAN,
  buildPracticeTimeline,
  formatClock,
  getSegmentAt,
  getTotalDuration,
} from "./practicePlan.js";
import { getSegmentCue } from "./timerCues.js";

const timeline = buildPracticeTimeline(PRACTICE_PLAN);
const totalDuration = getTotalDuration(timeline);
const roundSegments = timeline.filter((segment) => segment.type === "round");

const elements = {
  announcementStrip: document.querySelector("#announcement-strip"),
  bellToggle: document.querySelector("#bell-toggle"),
  countReadout: document.querySelector("#count-readout"),
  currentTitle: document.querySelector("#current-title"),
  nextButton: document.querySelector("#next-button"),
  nextRound: document.querySelector("#next-round"),
  playButton: document.querySelector("#play-button"),
  playIcon: document.querySelector("#play-icon"),
  previousButton: document.querySelector("#previous-button"),
  resetButton: document.querySelector("#reset-button"),
  roundKicker: document.querySelector("#round-kicker"),
  roundList: document.querySelector("#round-list"),
  sessionMeta: document.querySelector("#session-meta"),
  sessionProgress: document.querySelector("#session-progress"),
  timeReadout: document.querySelector("#time-readout"),
  timerRing: document.querySelector("#timer-ring"),
  voiceToggle: document.querySelector("#voice-toggle"),
};

const state = {
  elapsedSeconds: 0,
  isRunning: false,
  runStartedAt: 0,
  runBaseElapsed: 0,
  previousSegment: null,
  lastSegmentKey: "",
  audioContext: null,
  cueTimer: 0,
};

elements.sessionMeta.textContent = `${formatClock(totalDuration)} total practice`;

renderRoundList();
render();

elements.playButton.addEventListener("click", () => {
  if (state.isRunning) {
    pauseTimer();
    return;
  }

  startTimer();
});

elements.resetButton.addEventListener("click", resetTimer);
elements.nextButton.addEventListener("click", () => moveToAdjacentRound(1));
elements.previousButton.addEventListener("click", () => moveToAdjacentRound(-1));
elements.bellToggle.addEventListener("change", () => {
  elements.announcementStrip.textContent = elements.bellToggle.checked
    ? "Bell enabled"
    : "Bell muted";
});
elements.voiceToggle.addEventListener("change", () => {
  elements.announcementStrip.textContent = elements.voiceToggle.checked
    ? "Voice enabled"
    : "Voice muted";
});

function startTimer() {
  state.isRunning = true;
  state.runStartedAt = performance.now();
  state.runBaseElapsed = state.elapsedSeconds;
  unlockAudio();
  requestAnimationFrame(tick);
  render();
}

function pauseTimer() {
  state.elapsedSeconds = getLiveElapsed();
  state.isRunning = false;
  render();
}

function resetTimer() {
  clearTimeout(state.cueTimer);
  window.speechSynthesis?.cancel();
  state.elapsedSeconds = 0;
  state.isRunning = false;
  state.previousSegment = null;
  state.lastSegmentKey = "";
  elements.announcementStrip.textContent = "Ready to begin";
  render();
}

function tick() {
  if (!state.isRunning) {
    return;
  }

  state.elapsedSeconds = getLiveElapsed();
  const segment = getSegmentAt(timeline, state.elapsedSeconds);
  maybeCueSegment(segment);

  if (state.elapsedSeconds >= totalDuration) {
    state.elapsedSeconds = totalDuration;
    state.isRunning = false;
    completePractice();
    render();
    return;
  }

  render();
  requestAnimationFrame(tick);
}

function getLiveElapsed() {
  if (!state.isRunning) {
    return state.elapsedSeconds;
  }

  const delta = (performance.now() - state.runStartedAt) / 1000;
  return Math.min(totalDuration, state.runBaseElapsed + delta);
}

function maybeCueSegment(currentSegment) {
  if (!currentSegment) {
    return;
  }

  const currentKey = getSegmentKey(currentSegment);
  if (currentKey === state.lastSegmentKey) {
    return;
  }

  const cue = getSegmentCue(state.previousSegment, currentSegment);
  state.previousSegment = currentSegment;
  state.lastSegmentKey = currentKey;

  if (cue) {
    playCue(cue);
  }
}

function playCue(cue) {
  clearTimeout(state.cueTimer);
  elements.announcementStrip.textContent = cue.announcement;

  if (cue.bell) {
    playBell();
  }

  state.cueTimer = window.setTimeout(() => {
    speak(cue.announcement);
  }, 650);
}

function completePractice() {
  clearTimeout(state.cueTimer);
  elements.announcementStrip.textContent = "Practice complete";
  playBell();
  state.cueTimer = window.setTimeout(() => speak("Practice complete"), 650);
}

function playBell() {
  if (!elements.bellToggle.checked) {
    return;
  }

  const context = unlockAudio();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.38, now + 0.025);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.75);
  master.connect(context.destination);

  [528, 1056, 1584].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 0 ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(index === 0 ? 0.85 : 0.2, now);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + 1.8);
  });
}

function unlockAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    state.audioContext = new AudioContextClass();
  }

  if (state.audioContext.state === "suspended") {
    state.audioContext.resume();
  }

  return state.audioContext;
}

function speak(text) {
  if (!elements.voiceToggle.checked || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.86;
  utterance.pitch = 0.88;
  utterance.volume = 0.92;
  window.speechSynthesis.speak(utterance);
}

function moveToAdjacentRound(direction) {
  const activeSegment = getSegmentAt(timeline, state.elapsedSeconds);
  const activeRoundNumber =
    activeSegment?.type === "transition"
      ? activeSegment.roundNumber
      : activeSegment?.number;
  const currentIndex = Math.max(
    0,
    roundSegments.findIndex((segment) => segment.number === activeRoundNumber),
  );
  const nextIndex = clamp(currentIndex + direction, 0, roundSegments.length - 1);
  const nextSegment = roundSegments[nextIndex];

  setElapsed(nextSegment.startSeconds, true);
}

function setElapsed(seconds, shouldCue) {
  state.elapsedSeconds = clamp(seconds, 0, totalDuration);
  state.runBaseElapsed = state.elapsedSeconds;
  state.runStartedAt = performance.now();

  const segment = getSegmentAt(timeline, state.elapsedSeconds);
  state.previousSegment = shouldCue ? null : segment;
  state.lastSegmentKey = shouldCue ? "" : getSegmentKey(segment);
  if (shouldCue) {
    maybeCueSegment(segment);
  }

  render();
}

function render() {
  const segment = getSegmentAt(timeline, state.elapsedSeconds);
  const currentRound = resolveCurrentRound(segment);
  const nextRound = resolveNextRound(segment);
  const remaining = Math.ceil(segment?.remainingInSegment ?? 0);
  const segmentProgress = segment?.progress ?? 0;
  const sessionProgress = totalDuration
    ? (state.elapsedSeconds / totalDuration) * 100
    : 0;

  elements.currentTitle.textContent = getDisplayTitle(segment);
  elements.roundKicker.textContent = getKicker(segment, currentRound);
  elements.timeReadout.textContent = formatClock(remaining);
  elements.countReadout.textContent = getCountReadout(segment);
  elements.nextRound.textContent = nextRound?.name ?? "Complete";
  elements.timerRing.style.setProperty(
    "--segment-progress",
    `${segmentProgress * 360}deg`,
  );
  elements.sessionProgress.style.width = `${sessionProgress}%`;

  elements.playButton.title = state.isRunning ? "Pause" : "Start";
  elements.playButton.setAttribute(
    "aria-label",
    state.isRunning ? "Pause" : "Start",
  );
  elements.playIcon.setAttribute(
    "d",
    state.isRunning ? "M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" : "M8 5v14l11-7L8 5Z",
  );

  updateRoundList(currentRound, segment);
}

function renderRoundList() {
  elements.roundList.innerHTML = "";

  roundSegments.forEach((round) => {
    const item = document.createElement("li");
    item.className = "round-item";
    item.dataset.round = String(round.number);
    item.innerHTML = `
      <button type="button">
        <span class="round-number">${round.number}</span>
        <span class="round-copy">
          <strong>${round.name}</strong>
          <small>${getRoundMeta(round)}</small>
        </span>
      </button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      setElapsed(round.startSeconds, true);
    });
    elements.roundList.append(item);
  });
}

function updateRoundList(currentRound, segment) {
  elements.roundList.querySelectorAll(".round-item").forEach((item) => {
    const roundNumber = Number.parseInt(item.dataset.round ?? "0", 10);
    const round = roundSegments.find((candidate) => candidate.number === roundNumber);
    const isActive = currentRound?.number === roundNumber;
    const isComplete =
      round && state.elapsedSeconds >= round.startSeconds + round.durationSeconds;

    item.classList.toggle("is-active", isActive);
    item.classList.toggle("is-complete", Boolean(isComplete));
    item.classList.toggle(
      "is-preparing",
      isActive && segment?.type === "transition",
    );
  });
}

function getDisplayTitle(segment) {
  if (!segment) {
    return "Complete";
  }

  if (segment.type === "transition") {
    return "Prepare";
  }

  return segment.name;
}

function getKicker(segment, currentRound) {
  if (!segment || !currentRound) {
    return "Session";
  }

  if (segment.type === "transition") {
    return `Round ${currentRound.number} starts next`;
  }

  return `Round ${currentRound.number}`;
}

function getCountReadout(segment) {
  if (!segment) {
    return "Done";
  }

  if (segment.type === "transition") {
    return `Bell and announcement for ${segment.nextRoundName}`;
  }

  if (segment.stepsPerRepetition) {
    return `Repetition ${segment.repetition}/${segment.repetitions} · step ${segment.step}/${segment.stepsPerRepetition}`;
  }

  if (segment.repetitions) {
    return `Repetition ${segment.repetition}/${segment.repetitions}`;
  }

  return "Timed round";
}

function getRoundMeta(round) {
  if (round.stepsPerRepetition) {
    return `${round.repetitions} reps · ${round.stepsPerRepetition} steps · ${round.stepSeconds}s`;
  }

  if (round.repetitions) {
    return `${round.repetitions} reps · ${round.stepSeconds}s`;
  }

  const transition = round.transitionSeconds
    ? ` + ${round.transitionSeconds}s`
    : "";
  return `${formatClock(round.totalSeconds)}${transition}`;
}

function resolveCurrentRound(segment) {
  if (!segment) {
    return null;
  }

  if (segment.type === "transition") {
    return roundSegments.find((round) => round.number === segment.roundNumber);
  }

  return segment;
}

function resolveNextRound(segment) {
  if (!segment) {
    return null;
  }

  if (segment.type === "transition") {
    return roundSegments.find((round) => round.name === segment.nextRoundName);
  }

  return (
    roundSegments.find((round) => round.number === segment.number + 1) ?? null
  );
}

function getSegmentKey(segment) {
  return segment ? `${segment.type}:${segment.startSeconds}:${segment.name}` : "";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
