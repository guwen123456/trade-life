const MUTE_KEY = "trade-life-mute";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let started = false;

function AudioCtor() {
  if (typeof AudioContext !== "undefined") return AudioContext;
  const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
  return w.webkitAudioContext ?? null;
}

export function musicMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function targetGain() {
  return musicMuted() ? 0 : 0.18;
}

export function setMusicMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.18, ctx.currentTime, 0.08);
}

/** Call synchronously inside a click or tap. */
export function unlockAmbience() {
  const Ctor = AudioCtor();
  if (!Ctor) return;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  if (!started) startPad();
}

function startPad() {
  if (!ctx || started) return;
  const audio = ctx;
  started = true;
  const music = audio.createGain();
  music.gain.setValueAtTime(0, audio.currentTime);
  music.connect(audio.destination);
  master = music;
  music.gain.setTargetAtTime(targetGain(), audio.currentTime, 1.2);

  const bed = audio.createGain();
  bed.gain.value = 1;
  bed.connect(music);

  const tones = [
    { f: 110, type: "sine" as OscillatorType, v: 0.09 },
    { f: 164.81, type: "sine" as OscillatorType, v: 0.05 },
    { f: 220, type: "triangle" as OscillatorType, v: 0.03 },
  ];
  for (const tone of tones) {
    const osc = audio.createOscillator();
    osc.type = tone.type;
    osc.frequency.value = tone.f;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    const g = audio.createGain();
    g.gain.value = tone.v;
    osc.connect(filter);
    filter.connect(g);
    g.connect(bed);
    osc.start();
  }

  const seconds = 3;
  const noiseBuf = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = audio.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const nf = audio.createBiquadFilter();
  nf.type = "lowpass";
  nf.frequency.value = 280;
  const ng = audio.createGain();
  ng.gain.value = 0.02;
  noise.connect(nf);
  nf.connect(ng);
  ng.connect(bed);
  noise.start();

  document.addEventListener("visibilitychange", () => {
    if (audio.state === "suspended" && document.visibilityState === "visible") void audio.resume();
  });
}
