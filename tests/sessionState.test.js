import test from "node:test";
import assert from "node:assert/strict";

import {
  SESSION_EVENTS,
  SESSION_PHASES,
  createSessionState,
  transitionSession,
} from "../src/sessionState.js";

test("a new session starts on the welcome phase", () => {
  assert.deepEqual(createSessionState(), {
    phase: SESSION_PHASES.WELCOME,
    elapsedSeconds: 0,
    isRunning: false,
  });
});

test("start enters practice with round one already running", () => {
  const initial = createSessionState();
  const started = transitionSession(initial, SESSION_EVENTS.START);

  assert.deepEqual(started, {
    phase: SESSION_PHASES.PRACTICE,
    elapsedSeconds: 0,
    isRunning: true,
  });
});

test("completion stops practice and exposes the completed phase", () => {
  const started = transitionSession(
    createSessionState(),
    SESSION_EVENTS.START,
  );
  const completed = transitionSession(started, SESSION_EVENTS.COMPLETE);

  assert.deepEqual(completed, {
    phase: SESSION_PHASES.COMPLETED,
    elapsedSeconds: 0,
    isRunning: false,
  });
});

test("reset returns an active practice to welcome", () => {
  const started = transitionSession(
    createSessionState(),
    SESSION_EVENTS.START,
  );
  const reset = transitionSession(started, SESSION_EVENTS.RESET);

  assert.deepEqual(reset, createSessionState());
});

test("practice again starts a fresh running practice", () => {
  const started = transitionSession(
    createSessionState(),
    SESSION_EVENTS.START,
  );
  const completed = transitionSession(started, SESSION_EVENTS.COMPLETE);
  const restarted = transitionSession(
    completed,
    SESSION_EVENTS.PRACTICE_AGAIN,
  );

  assert.deepEqual(restarted, {
    phase: SESSION_PHASES.PRACTICE,
    elapsedSeconds: 0,
    isRunning: true,
  });
});

test("stale and repeated events cannot restart an active loop", () => {
  const welcome = createSessionState();
  const started = transitionSession(welcome, SESSION_EVENTS.START);
  const completed = transitionSession(started, SESSION_EVENTS.COMPLETE);

  assert.strictEqual(
    transitionSession(welcome, SESSION_EVENTS.RESET),
    welcome,
  );
  assert.strictEqual(
    transitionSession(started, SESSION_EVENTS.START),
    started,
  );
  assert.strictEqual(
    transitionSession(started, SESSION_EVENTS.PRACTICE_AGAIN),
    started,
  );
  assert.strictEqual(
    transitionSession(completed, SESSION_EVENTS.COMPLETE),
    completed,
  );
});
