// Singleton AudioContext — must be created (or resumed) inside a user gesture.
// Call unlockAudio() at arm time (button click) so the context is ready
// when the alarm fires later from a geolocation callback.
let audioCtx = null;

function getCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioCtx();
  return audioCtx;
}

function beep(ctx, t, freq, dur) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.7, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// Call during a user gesture (button click) to unlock AudioContext on iOS/Safari.
export function unlockAudio() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  // Silent beep to satisfy iOS autoplay policy
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.001);
}

// Short confirmation tone played when the alarm is armed (user gesture context).
export function playArmConfirm() {
  const ctx = getCtx();
  if (!ctx) return;
  const doConfirm = () => beep(ctx, ctx.currentTime + 0.01, 1046, 0.15);
  if (ctx.state === 'running') {
    doConfirm();
  } else {
    ctx.resume().then(doConfirm).catch(() => {});
  }
}

// Two rising triplets. Called from a geolocation callback (no user gesture),
// so we must await resume() before scheduling oscillators.
export function playAlarm() {
  const ctx = getCtx();
  if (!ctx) return;

  const doPlay = () => {
    const t = ctx.currentTime;
    beep(ctx, t + 0.0, 880,  0.25);
    beep(ctx, t + 0.3, 1100, 0.25);
    beep(ctx, t + 0.6, 1320, 0.40);
    beep(ctx, t + 1.1, 880,  0.25);
    beep(ctx, t + 1.4, 1100, 0.25);
    beep(ctx, t + 1.7, 1320, 0.40);
  };

  if (ctx.state === 'running') {
    doPlay();
  } else {
    // resume() is async; we must await it before scheduling oscillators,
    // otherwise the notes are dropped while the context is still suspended.
    ctx.resume().then(doPlay).catch(() => {});
  }
}
