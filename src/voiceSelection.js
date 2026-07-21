export const PREFERRED_VOICE = Object.freeze({
  name: "Tara",
  language: "en-IN",
});

function normalizeLanguage(language = "") {
  return language.replace("_", "-").toLowerCase();
}

export function findPreferredVoice(voices = []) {
  const matchingName = voices.filter(
    (voice) => voice.name === PREFERRED_VOICE.name,
  );

  return (
    matchingName.find(
      (voice) =>
        normalizeLanguage(voice.lang) ===
        normalizeLanguage(PREFERRED_VOICE.language),
    ) ??
    matchingName[0] ??
    null
  );
}
