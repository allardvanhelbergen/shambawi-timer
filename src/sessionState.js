export const SESSION_PHASES = Object.freeze({
  WELCOME: "welcome",
  PRACTICE: "practice",
  COMPLETED: "completed",
});

export const SESSION_EVENTS = Object.freeze({
  START: "start",
  COMPLETE: "complete",
  RESET: "reset",
  PRACTICE_AGAIN: "practice-again",
});

const validTransitions = Object.freeze({
  [SESSION_PHASES.WELCOME]: Object.freeze({
    [SESSION_EVENTS.START]: SESSION_PHASES.PRACTICE,
  }),
  [SESSION_PHASES.PRACTICE]: Object.freeze({
    [SESSION_EVENTS.COMPLETE]: SESSION_PHASES.COMPLETED,
    [SESSION_EVENTS.RESET]: SESSION_PHASES.WELCOME,
  }),
  [SESSION_PHASES.COMPLETED]: Object.freeze({
    [SESSION_EVENTS.PRACTICE_AGAIN]: SESSION_PHASES.PRACTICE,
  }),
});

export function createSessionState() {
  return {
    phase: SESSION_PHASES.WELCOME,
    elapsedSeconds: 0,
    isRunning: false,
  };
}

export function transitionSession(session, event) {
  const nextPhase = validTransitions[session.phase]?.[event];

  if (!nextPhase) {
    return session;
  }

  if (event === SESSION_EVENTS.COMPLETE) {
    return {
      ...session,
      phase: nextPhase,
      isRunning: false,
    };
  }

  return {
    ...session,
    phase: nextPhase,
    elapsedSeconds: 0,
    isRunning: event !== SESSION_EVENTS.RESET,
  };
}
