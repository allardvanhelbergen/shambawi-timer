import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const expectedCues = [
  ["Butterfly", "butterfly.wav"],
  ["Rock the baby", "rock-the-baby.wav"],
  ["Cat stretch", "cat-stretch.wav"],
  ["Alternate nostril breathing", "alternate-nostril-breathing.wav"],
  ["Auhm chanting", "auhm-chanting.wav"],
  ["Fluttering of the breath", "fluttering-of-the-breath.wav"],
  ["Locks and equalising", "locks-and-equalising.wav"],
  ["Next: Rock the baby", "next-rock-the-baby.wav"],
  ["Next: Cat stretch", "next-cat-stretch.wav"],
  [
    "Next: Alternate nostril breathing",
    "next-alternate-nostril-breathing.wav",
  ],
  ["Next: Auhm chanting", "next-auhm-chanting.wav"],
  [
    "Next: Fluttering of the breath",
    "next-fluttering-of-the-breath.wav",
  ],
  ["Next: Locks and equalising", "next-locks-and-equalising.wav"],
  ["Practice complete", "practice-complete.wav"],
];

test("recorded Tara cue support is available", async () => {
  const recordedVoice = await import("../src/recordedVoice.js").catch(
    () => null,
  );

  assert.ok(recordedVoice, "recorded voice module should exist");
});

test("every timer announcement maps to a Tara recording", async () => {
  const { getRecordedCueUrl } = await import("../src/recordedVoice.js");

  for (const [announcement, filename] of expectedCues) {
    assert.equal(
      getRecordedCueUrl(announcement),
      `./assets/voice/tara/${filename}`,
    );
  }

  assert.equal(getRecordedCueUrl("Unknown announcement"), null);
});

test("every mapped Tara recording exists", async () => {
  const { getRecordedCueUrl } = await import("../src/recordedVoice.js");

  for (const [announcement] of expectedCues) {
    const assetUrl = getRecordedCueUrl(announcement);
    const assetPath = new URL(`../${assetUrl.slice(2)}`, import.meta.url);
    assert.equal(existsSync(assetPath), true, `${announcement} recording missing`);
  }
});

test("recorded voice player decodes, caches, and plays Tara cues", async () => {
  const { createRecordedVoicePlayer } = await import(
    "../src/recordedVoice.js"
  );
  const fetchCalls = [];
  const decodedBuffer = { id: "decoded Tara audio" };
  const sources = [];
  let decodeCalls = 0;
  const context = {
    destination: { id: "destination" },
    async decodeAudioData() {
      decodeCalls += 1;
      return decodedBuffer;
    },
    createBufferSource() {
      const source = {
        buffer: null,
        connectedTo: null,
        started: false,
        stopped: false,
        connect(target) {
          this.connectedTo = target;
        },
        start() {
          this.started = true;
        },
        stop() {
          this.stopped = true;
        },
      };
      sources.push(source);
      return source;
    },
    createGain() {
      return {
        gain: { value: 0 },
        connectedTo: null,
        connect(target) {
          this.connectedTo = target;
        },
      };
    },
  };
  const player = createRecordedVoicePlayer({
    async fetchAudio(url) {
      fetchCalls.push(url);
      return {
        ok: true,
        async arrayBuffer() {
          return new ArrayBuffer(4);
        },
      };
    },
  });

  assert.equal(await player.play(context, "Butterfly"), "played");
  assert.equal(await player.play(context, "Butterfly"), "played");
  assert.deepEqual(fetchCalls, ["./assets/voice/tara/butterfly.wav"]);
  assert.equal(decodeCalls, 1);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].stopped, true);
  assert.equal(sources[1].buffer, decodedBuffer);
  assert.equal(sources[1].started, true);
  assert.equal(sources[1].connectedTo.gain.value, 0.92);
  assert.equal(sources[1].connectedTo.connectedTo, context.destination);
});

test("recorded voice player reports unavailable audio for browser fallback", async () => {
  const { createRecordedVoicePlayer } = await import(
    "../src/recordedVoice.js"
  );
  const player = createRecordedVoicePlayer({
    async fetchAudio() {
      return { ok: false };
    },
  });
  const context = {
    async decodeAudioData() {
      throw new Error("should not decode a failed response");
    },
  };

  assert.equal(await player.play(context, "Butterfly"), "unavailable");
  assert.equal(await player.play(context, "Unknown announcement"), "unavailable");
  assert.equal(await player.play(null, "Butterfly"), "unavailable");
});

test("cancelled Tara playback does not start or trigger fallback", async () => {
  const { createRecordedVoicePlayer } = await import(
    "../src/recordedVoice.js"
  );
  let releaseFetch;
  let sourceCreated = false;
  const responsePromise = new Promise((resolve) => {
    releaseFetch = resolve;
  });
  const player = createRecordedVoicePlayer({
    fetchAudio() {
      return responsePromise;
    },
  });
  const context = {
    async decodeAudioData() {
      return { id: "decoded" };
    },
    createBufferSource() {
      sourceCreated = true;
      return {};
    },
  };

  const playback = player.play(context, "Butterfly");
  player.cancel();
  releaseFetch({
    ok: true,
    async arrayBuffer() {
      return new ArrayBuffer(4);
    },
  });

  assert.equal(await playback, "cancelled");
  assert.equal(sourceCreated, false);
});
