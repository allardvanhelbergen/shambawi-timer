import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("singing bowl profile is soft, sustained, and harmonically tuned", async () => {
  const sound = await import("../src/singingBowlSound.js").catch(() => null);

  assert.ok(sound, "singing bowl sound module should exist");

  const profile = sound.SINGING_BOWL_PROFILE;
  assert.ok(profile, "singing bowl profile should be exported");
  assert.ok(profile.ringDurationSeconds >= 4);
  assert.ok(profile.masterPeak <= 0.2);
  assert.ok(profile.partials.length >= 4);
  assert.ok(profile.partials.every((partial) => partial.type === "sine"));

  const baseFrequency = profile.partials[0].frequency;
  const ratios = profile.partials.map(
    (partial) => partial.frequency / baseFrequency,
  );

  assert.ok(
    ratios.every((ratio) => Math.abs(ratio - Math.round(ratio)) < 0.001),
    "bowl partials should remain exact harmonics of the fundamental",
  );
});

test("singing bowl builds stable-pitch tones without a noise strike", async () => {
  const sound = await import("../src/singingBowlSound.js");
  assert.equal(typeof sound.playSingingBowl, "function");

  const { context, nodes } = createFakeAudioContext();
  const result = sound.playSingingBowl(context, context.destination);

  assert.equal(
    nodes.oscillators.length,
    sound.SINGING_BOWL_PROFILE.partials.length,
  );
  assert.equal(nodes.bufferSources.length, 0);
  assert.equal(nodes.filters.length, 0);
  assert.equal(
    result.durationSeconds,
    sound.SINGING_BOWL_PROFILE.ringDurationSeconds,
  );
  assert.ok(
    nodes.oscillators.every(
      (oscillator) =>
        oscillator.frequency.calls.every(
          ([method]) => method === "setValueAtTime",
        ),
    ),
    "oscillator pitch should not drift during the bowl decay",
  );
});

test("timer bell delegates playback to the singing bowl", () => {
  assert.match(
    appSource,
    /import \{ playSingingBowl \} from "\.\/singingBowlSound\.js"/,
  );
  assert.match(appSource, /playSingingBowl\(context\)/);
  assert.doesNotMatch(appSource, /playGentleGong|gongSound\.js/);
});

function createFakeAudioContext() {
  const nodes = {
    bufferSources: [],
    filters: [],
    gains: [],
    oscillators: [],
  };

  const createParam = () => ({
    calls: [],
    exponentialRampToValueAtTime(value, time) {
      this.calls.push(["exponentialRampToValueAtTime", value, time]);
    },
    setValueAtTime(value, time) {
      this.calls.push(["setValueAtTime", value, time]);
    },
  });

  const createConnectable = () => ({
    connections: [],
    connect(target) {
      this.connections.push(target);
      return target;
    },
  });

  const context = {
    currentTime: 10,
    destination: { type: "destination" },
    sampleRate: 48000,
    createBiquadFilter() {
      const node = {
        ...createConnectable(),
        frequency: createParam(),
        type: "lowpass",
      };
      nodes.filters.push(node);
      return node;
    },
    createBuffer(_channels, length) {
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    },
    createBufferSource() {
      const node = {
        ...createConnectable(),
        startTimes: [],
        stopTimes: [],
        start(time) {
          this.startTimes.push(time);
        },
        stop(time) {
          this.stopTimes.push(time);
        },
      };
      nodes.bufferSources.push(node);
      return node;
    },
    createGain() {
      const node = { ...createConnectable(), gain: createParam() };
      nodes.gains.push(node);
      return node;
    },
    createOscillator() {
      const node = {
        ...createConnectable(),
        frequency: createParam(),
        startTimes: [],
        stopTimes: [],
        type: "sine",
        start(time) {
          this.startTimes.push(time);
        },
        stop(time) {
          this.stopTimes.push(time);
        },
      };
      nodes.oscillators.push(node);
      return node;
    },
  };

  return { context, nodes };
}
