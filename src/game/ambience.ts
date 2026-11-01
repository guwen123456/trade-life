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

  // 和弦垫：Am–F–C–G 缓慢轮换，每 8 秒用滑音过渡到下一组。
  // 旧版是三个固定音高无限嗡，听久了像风扇；现在和弦在走，底噪还是港口的。
  const chords: number[][] = [
    [110.0, 164.81, 261.63], // Am：A2 · E3 · C4
    [87.31, 130.81, 220.0], // F：F2 · C3 · A3
    [130.81, 164.81, 196.0], // C：C3 · E3 · G3
    [98.0, 146.83, 246.94], // G：G2 · D3 · B3
  ];
  const toneTypes: OscillatorType[] = ["sine", "sine", "triangle"];
  const toneGains = [0.08, 0.05, 0.03];
  const padFilter = audio.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 520;
  padFilter.connect(bed);
  const oscs = chords[0].map((f, i) => {
    const osc = audio.createOscillator();
    osc.type = toneTypes[i];
    osc.frequency.value = f;
    const g = audio.createGain();
    g.gain.value = toneGains[i];
    osc.connect(g);
    g.connect(padFilter);
    osc.start();
    return osc;
  });
  let chordIdx = 0;
  window.setInterval(() => {
    chordIdx = (chordIdx + 1) % chords.length;
    const t = audio.currentTime;
    chords[chordIdx].forEach((f, i) => {
      oscs[i].frequency.setTargetAtTime(f, t, 1.6);
    });
  }, 8000);

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
