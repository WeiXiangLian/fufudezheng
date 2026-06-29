// ===== sound.js =====
// 用 Web Audio API「合成」音效，不需要任何音檔（離線也能用、檔案更小）。
// 瀏覽器規定：AudioContext 要在使用者第一次點擊後才能啟動，
// 所以我們在第一次播放時才建立它（lazy init）。

let ctx = null;       // AudioContext
let enabled = true;   // 是否開啟音效（由設定控制）

export function setEnabled(on) { enabled = on; }

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  // 有些瀏覽器一開始是 suspended，要 resume
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 播放一個單音：頻率 freq、長度 dur 秒、音色 type、起始延遲 delay 秒
function tone(freq, dur, type = 'sine', delay = 0) {
  const ac = ensureCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ac.currentTime + delay;
  // 用淡入淡出避免「啪」的爆音
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.18, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// 答對：兩個往上跳的音
export function playCorrect() {
  if (!enabled) return;
  tone(660, 0.12, 'triangle', 0);
  tone(880, 0.16, 'triangle', 0.1);
}

// 答錯：一個低沉的音
export function playWrong() {
  if (!enabled) return;
  tone(200, 0.25, 'sawtooth', 0);
}

// 按鈕點擊：短促一聲
export function playClick() {
  if (!enabled) return;
  tone(440, 0.05, 'square', 0);
}

// 連勝獎勵：三連音
export function playBonus() {
  if (!enabled) return;
  tone(660, 0.1, 'triangle', 0);
  tone(880, 0.1, 'triangle', 0.09);
  tone(1175, 0.18, 'triangle', 0.18);
}
