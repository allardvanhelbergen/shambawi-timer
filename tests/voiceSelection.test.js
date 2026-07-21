import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("Tara is the preferred English voice", async () => {
  const voiceSelection = await import("../src/voiceSelection.js").catch(
    () => null,
  );

  assert.ok(voiceSelection, "voice selection module should exist");
  assert.deepEqual(voiceSelection.PREFERRED_VOICE, {
    name: "Tara",
    language: "en-IN",
  });

  const tara = { name: "Tara", lang: "en-IN" };
  const selected = voiceSelection.findPreferredVoice([
    { name: "Daniel", lang: "en-GB", default: true },
    tara,
    { name: "Samantha", lang: "en-US" },
  ]);

  assert.equal(selected, tara);
});

test("missing Tara leaves the voice unset for the browser default", async () => {
  const { findPreferredVoice } = await import("../src/voiceSelection.js");

  assert.equal(
    findPreferredVoice([
      { name: "Daniel", lang: "en-GB", default: true },
      { name: "Samantha", lang: "en-US" },
    ]),
    null,
  );
  assert.equal(findPreferredVoice([]), null);
});

test("speech refreshes asynchronous voice lists and only assigns Tara", () => {
  assert.match(
    appSource,
    /import \{ findPreferredVoice \} from "\.\/voiceSelection\.js"/,
  );
  assert.match(appSource, /speechSynthesis\.getVoices\(\)/);
  assert.match(appSource, /voiceschanged/);
  assert.match(appSource, /utterance\.voice = preferredVoice/);
  assert.match(appSource, /if \(preferredVoice\)/);
});

test("the app plays recorded Tara cues before browser speech fallback", () => {
  assert.match(
    appSource,
    /import \{ createRecordedVoicePlayer \} from "\.\/recordedVoice\.js"/,
  );
  assert.match(
    appSource,
    /const recordedVoicePlayer = createRecordedVoicePlayer\(\)/,
  );
  assert.match(
    appSource,
    /await recordedVoicePlayer\.play\(context, text\)/,
  );
  assert.match(
    appSource,
    /if \(recordedResult !== "unavailable"\) \{\s+return;/,
  );
  assert.match(appSource, /speakWithBrowser\(text\)/);
  assert.match(appSource, /recordedVoicePlayer\.cancel\(\)/);
});
