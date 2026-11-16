import { onLang, t } from "./i18n.js";

let audio = null;
let gain = null;
let playing = false;

function label() {
  const btn = document.getElementById("sound-toggle");
  if (!btn) return;
  btn.textContent = t(playing ? "soundOn" : "soundOff");
  btn.setAttribute("aria-pressed", playing ? "true" : "false");
}

function stop() {
  if (gain && audio) {
    const now = audio.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
    const ctx = audio;
    setTimeout(() => ctx.close().catch(() => {}), 500);
  }
  audio = null;
  gain = null;
  playing = false;
  label();
}

function start() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audio = new Ctx();
  const oscA = audio.createOscillator();
  const oscB = audio.createOscillator();
  const filter = audio.createBiquadFilter();
  gain = audio.createGain();
  oscA.type = "sine";
  oscB.type = "sine";
  oscA.frequency.value = 196;
  oscB.frequency.value = 246.9;
  filter.type = "lowpass";
  filter.frequency.value = 640;
  gain.gain.value = 0.0001;
  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  oscA.start();
  oscB.start();
  gain.gain.linearRampToValueAtTime(0.012, audio.currentTime + 1.4);
  playing = true;
  label();
}

export function initSound() {
  const btn = document.getElementById("sound-toggle");
  if (!btn) return;
  label();
  btn.addEventListener("click", () => {
    if (playing) stop();
    else start();
  });
  onLang(label);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playing) stop();
  });
}
