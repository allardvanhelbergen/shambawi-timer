export const SINGING_BOWL_PROFILE = Object.freeze({
  masterPeak: 0.18,
  ringDurationSeconds: 4.5,
  partials: Object.freeze([
    Object.freeze({
      frequency: 220,
      level: 0.55,
      decay: 4.4,
      attack: 0.018,
      type: "sine",
    }),
    Object.freeze({
      frequency: 440,
      level: 0.22,
      decay: 3.8,
      attack: 0.035,
      type: "sine",
    }),
    Object.freeze({
      frequency: 660,
      level: 0.1,
      decay: 3.1,
      attack: 0.055,
      type: "sine",
    }),
    Object.freeze({
      frequency: 880,
      level: 0.045,
      decay: 2.5,
      attack: 0.075,
      type: "sine",
    }),
    Object.freeze({
      frequency: 1100,
      level: 0.02,
      decay: 1.8,
      attack: 0.09,
      type: "sine",
    }),
  ]),
});

const SILENCE = 0.0001;

export function playSingingBowl(
  context,
  destination = context.destination,
) {
  const profile = SINGING_BOWL_PROFILE;
  const now = context.currentTime;
  const master = context.createGain();

  master.gain.setValueAtTime(profile.masterPeak, now);
  master.gain.setValueAtTime(
    profile.masterPeak,
    now + profile.ringDurationSeconds - 0.4,
  );
  master.gain.exponentialRampToValueAtTime(
    SILENCE,
    now + profile.ringDurationSeconds,
  );
  master.connect(destination);

  profile.partials.forEach((partial) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = partial.type;
    oscillator.frequency.setValueAtTime(partial.frequency, now);

    gain.gain.setValueAtTime(SILENCE, now);
    gain.gain.exponentialRampToValueAtTime(
      partial.level,
      now + partial.attack,
    );
    gain.gain.exponentialRampToValueAtTime(
      SILENCE,
      now + partial.decay,
    );

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + partial.decay + 0.05);
  });

  return { durationSeconds: profile.ringDurationSeconds };
}
