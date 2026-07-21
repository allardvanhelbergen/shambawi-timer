const RECORDED_CUE_FILES = new Map([
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
]);

export function getRecordedCueUrl(announcement) {
  const filename = RECORDED_CUE_FILES.get(announcement);
  return filename ? `./assets/voice/tara/${filename}` : null;
}

export function createRecordedVoicePlayer({
  fetchAudio = (url) => fetch(url),
} = {}) {
  const buffers = new Map();
  let currentSource = null;
  let requestId = 0;

  function stopCurrentSource() {
    if (!currentSource) {
      return;
    }

    currentSource.stop();
    currentSource = null;
  }

  async function loadBuffer(context, url) {
    if (buffers.has(url)) {
      return buffers.get(url);
    }

    const response = await fetchAudio(url);
    if (!response?.ok) {
      throw new Error(`Could not load recorded voice cue: ${url}`);
    }

    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    buffers.set(url, buffer);
    return buffer;
  }

  return {
    cancel() {
      requestId += 1;
      stopCurrentSource();
    },

    async play(context, announcement) {
      const url = getRecordedCueUrl(announcement);
      if (!context || !url) {
        return "unavailable";
      }

      const activeRequestId = ++requestId;
      stopCurrentSource();

      try {
        const buffer = await loadBuffer(context, url);
        if (activeRequestId !== requestId) {
          return "cancelled";
        }

        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        gain.gain.value = 0.92;
        source.connect(gain);
        gain.connect(context.destination);
        source.addEventListener?.("ended", () => {
          if (currentSource === source) {
            currentSource = null;
          }
        });
        currentSource = source;
        source.start();
        return "played";
      } catch {
        return activeRequestId === requestId ? "unavailable" : "cancelled";
      }
    },
  };
}
