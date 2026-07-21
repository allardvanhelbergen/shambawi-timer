import {
  PRACTICE_PLAN,
  buildPracticeTimeline,
  formatClock,
  getSegmentAt,
  getTotalDuration,
} from "./practicePlan.js";
import { createRecordedVoicePlayer } from "./recordedVoice.js";
import { playSingingBowl } from "./singingBowlSound.js";
import {
  SESSION_EVENTS,
  SESSION_PHASES,
  createSessionState,
  transitionSession,
} from "./sessionState.js";
import { getSegmentCue } from "./timerCues.js";
import { findPreferredVoice } from "./voiceSelection.js";

const timeline = buildPracticeTimeline(PRACTICE_PLAN);
const totalDuration = getTotalDuration(timeline);
const roundSegments = timeline.filter((segment) => segment.type === "round");
const recordedVoicePlayer = createRecordedVoicePlayer();

const elements = {
  bellToggle: document.querySelector("#bell-toggle"),
  completedTitle: document.querySelector("#completed-title"),
  completedView: document.querySelector("#completed-view"),
  countReadout: document.querySelector("#count-readout"),
  currentTitle: document.querySelector("#current-title"),
  nextButton: document.querySelector("#next-button"),
  playButton: document.querySelector("#play-button"),
  playIcon: document.querySelector("#play-icon"),
  practiceAgainButton: document.querySelector("#practice-again-button"),
  practiceView: document.querySelector("#practice-view"),
  previousButton: document.querySelector("#previous-button"),
  resetButton: document.querySelector("#reset-button"),
  roundList: document.querySelector("#round-list"),
  sessionElapsed: document.querySelector("#session-elapsed"),
  sessionMeta: document.querySelector("#session-meta"),
  sessionProgress: document.querySelector("#session-progress"),
  timeReadout: document.querySelector("#time-readout"),
  timerRing: document.querySelector("#timer-ring"),
  voiceToggle: document.querySelector("#voice-toggle"),
  startPracticeButton: document.querySelector("#start-practice-button"),
  welcomeTitle: document.querySelector("#welcome-title"),
  welcomeView: document.querySelector("#welcome-view"),
};

const state = {
  ...createSessionState(),
  runStartedAt: 0,
  runBaseElapsed: 0,
  previousSegment: null,
  lastSegmentKey: "",
  audioContext: null,
  cueTimer: 0,
  animationFrameId: 0,
  entryGuardTimer: 0,
};

let preferredVoice = null;

function refreshPreferredVoice() {
  if (!("speechSynthesis" in window)) {
    preferredVoice = null;
    return;
  }

  preferredVoice = findPreferredVoice(window.speechSynthesis.getVoices());
}

refreshPreferredVoice();
window.speechSynthesis?.addEventListener(
  "voiceschanged",
  refreshPreferredVoice,
);

elements.sessionMeta.textContent = formatClock(totalDuration);

renderRoundList();
renderPhase();

elements.startPracticeButton.addEventListener("click", () => {
  startPractice(SESSION_EVENTS.START);
});
elements.practiceAgainButton.addEventListener("click", () => {
  startPractice(SESSION_EVENTS.PRACTICE_AGAIN);
});

elements.playButton.addEventListener("click", () => {
  if (state.isRunning) {
    pauseTimer();
    return;
  }

  startTimer();
});

elements.resetButton.addEventListener("click", resetPractice);
elements.nextButton.addEventListener("click", () => moveToAdjacentRound(1));
elements.previousButton.addEventListener("click", () => moveToAdjacentRound(-1));

function startPractice(event) {
  if (!applySessionTransition(event)) {
    return;
  }

  stopAnimationLoop();
  clearPendingCues();
  resetTimingBookkeeping();
  state.runStartedAt = performance.now();
  unlockAudio();
  maybeCueSegment(getSegmentAt(timeline, state.elapsedSeconds));
  armPracticeEntryGuard();
  renderPhase(true);
  scheduleTick();
}

function armPracticeEntryGuard() {
  clearTimeout(state.entryGuardTimer);
  elements.practiceView.classList.add("is-entry-guarded");
  state.entryGuardTimer = window.setTimeout(() => {
    elements.practiceView.classList.remove("is-entry-guarded");
    state.entryGuardTimer = 0;
  }, 450);
}

function clearPracticeEntryGuard() {
  clearTimeout(state.entryGuardTimer);
  state.entryGuardTimer = 0;
  elements.practiceView.classList.remove("is-entry-guarded");
}

function startTimer() {
  if (state.phase !== SESSION_PHASES.PRACTICE || state.isRunning) {
    return;
  }

  state.isRunning = true;
  state.runStartedAt = performance.now();
  state.runBaseElapsed = state.elapsedSeconds;
  unlockAudio();
  scheduleTick();
  render();
}

function pauseTimer() {
  if (!state.isRunning) {
    return;
  }

  state.elapsedSeconds = getLiveElapsed();
  state.isRunning = false;
  stopAnimationLoop();
  render();
}

function resetPractice() {
  if (!applySessionTransition(SESSION_EVENTS.RESET)) {
    return;
  }

  stopAnimationLoop();
  clearPendingCues();
  clearPracticeEntryGuard();
  resetTimingBookkeeping();
  renderPhase(true);
}

function applySessionTransition(event) {
  const currentSession = {
    phase: state.phase,
    elapsedSeconds: state.elapsedSeconds,
    isRunning: state.isRunning,
  };
  const nextSession = transitionSession(currentSession, event);

  if (nextSession === currentSession) {
    return false;
  }

  Object.assign(state, nextSession);
  return true;
}

function resetTimingBookkeeping() {
  state.elapsedSeconds = 0;
  state.runStartedAt = 0;
  state.runBaseElapsed = 0;
  state.previousSegment = null;
  state.lastSegmentKey = "";
}

function tick() {
  state.animationFrameId = 0;

  if (!state.isRunning || state.phase !== SESSION_PHASES.PRACTICE) {
    return;
  }

  state.elapsedSeconds = getLiveElapsed();
  const segment = getSegmentAt(timeline, state.elapsedSeconds);
  maybeCueSegment(segment);

  if (state.elapsedSeconds >= totalDuration) {
    state.elapsedSeconds = totalDuration;
    completePractice();
    return;
  }

  render();
  scheduleTick();
}

function scheduleTick() {
  if (state.animationFrameId || !state.isRunning) {
    return;
  }

  state.animationFrameId = requestAnimationFrame(tick);
}

function stopAnimationLoop() {
  if (!state.animationFrameId) {
    return;
  }

  cancelAnimationFrame(state.animationFrameId);
  state.animationFrameId = 0;
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

  if (cue.bell) {
    playBell();
  }

  state.cueTimer = window.setTimeout(() => {
    speak(cue.announcement);
  }, 650);
}

function completePractice() {
  if (!applySessionTransition(SESSION_EVENTS.COMPLETE)) {
    return;
  }

  clearTimeout(state.cueTimer);
  playBell();
  state.cueTimer = window.setTimeout(() => speak("Practice complete"), 650);
  renderPhase(true);
}

function clearPendingCues() {
  clearTimeout(state.cueTimer);
  state.cueTimer = 0;
  recordedVoicePlayer.cancel();
  window.speechSynthesis?.cancel();
}

function playBell() {
  if (!elements.bellToggle.checked) {
    return;
  }

  const context = unlockAudio();
  if (!context) {
    return;
  }

  playSingingBowl(context);
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

async function speak(text) {
  if (!elements.voiceToggle.checked) {
    return;
  }

  recordedVoicePlayer.cancel();
  window.speechSynthesis?.cancel();
  const context = unlockAudio();
  const recordedResult = await recordedVoicePlayer.play(context, text);
  if (recordedResult !== "unavailable") {
    return;
  }

  speakWithBrowser(text);
}

function speakWithBrowser(text) {
  if (!elements.voiceToggle.checked || !("speechSynthesis" in window)) {
    return;
  }

  refreshPreferredVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  if (preferredVoice) {
    utterance.voice = preferredVoice;
    utterance.lang = preferredVoice.lang;
  }
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
  const currentIndex = roundSegments.findIndex(
    (segment) => segment.number === activeRoundNumber,
  );
  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= roundSegments.length) {
    return;
  }

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

function renderPhase(shouldFocus = false) {
  const isWelcome = state.phase === SESSION_PHASES.WELCOME;
  const isPractice = state.phase === SESSION_PHASES.PRACTICE;
  const isCompleted = state.phase === SESSION_PHASES.COMPLETED;

  document.body.dataset.phase = state.phase;
  elements.welcomeView.hidden = !isWelcome;
  elements.practiceView.hidden = !isPractice;
  elements.completedView.hidden = !isCompleted;

  if (isPractice) {
    render();
  }

  if (!shouldFocus) {
    return;
  }

  const heading = isWelcome
    ? elements.welcomeTitle
    : isCompleted
      ? elements.completedTitle
      : elements.currentTitle;
  heading?.focus({ preventScroll: true });
}

function render() {
  const segment = getSegmentAt(timeline, state.elapsedSeconds);
  const currentRound = resolveCurrentRound(segment);
  const remaining = Math.ceil(segment?.remainingInSegment ?? 0);
  const segmentProgress = segment?.progress ?? 0;
  const sessionProgress = totalDuration
    ? (state.elapsedSeconds / totalDuration) * 100
    : 0;
  const elapsedWholeSeconds = Math.min(
    totalDuration,
    Math.floor(state.elapsedSeconds),
  );

  elements.currentTitle.textContent = getDisplayTitle(segment);
  elements.timeReadout.textContent = formatClock(remaining);
  elements.countReadout.textContent = getCountReadout(segment);
  elements.timerRing.style.setProperty(
    "--segment-progress",
    `${segmentProgress * 360}deg`,
  );
  elements.sessionElapsed.textContent = formatClock(elapsedWholeSeconds);
  elements.sessionProgress.style.width = `${sessionProgress}%`;
  elements.nextButton.disabled =
    currentRound?.number === roundSegments.at(-1)?.number;

  elements.playButton.title = state.isRunning ? "Pause" : "Start";
  elements.playButton.setAttribute(
    "aria-label",
    state.isRunning ? "Pause" : "Start",
  );
  elements.playIcon.classList.toggle("fa-pause", state.isRunning);
  elements.playIcon.classList.toggle("fa-play", !state.isRunning);

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

  return "";
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

function getSegmentKey(segment) {
  return segment ? `${segment.type}:${segment.startSeconds}:${segment.name}` : "";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
