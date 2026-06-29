// ===== main.js =====
// 流程控制 + 畫面更新。把三個邏輯模組（出題、音效、存檔）串起來。
// （Phase 1 先把畫面操作放這裡；之後畫面變複雜可再拆出 ui.js）

import * as Q from './questions.js';
import * as Sound from './sound.js';
import * as Store from './storage.js';

// ---- 本回合的狀態 ----
let session = null;     // { answered, correct, roundStars, score, streak, bestStreak }
let adaptive = null;    // 自適應難度控制器
let current = null;     // 目前題目
let locked = false;     // 是否已作答（避免重複點）

// ---- 取得畫面元素 ----
const $ = (id) => document.getElementById(id);
const el = {
  homeStars: $('home-stars'), homeBest: $('home-best'),
  startBtn: $('start-btn'), soundToggle: $('sound-toggle'), themeToggle: $('theme-toggle'),
  endBtn: $('end-btn'),
  statScore: $('stat-score'), statStreak: $('stat-streak'), statStars: $('stat-stars'),
  levelDots: $('level-dots'), question: $('question'), options: $('options'),
  feedback: $('feedback'), explain: $('explain'), nextBtn: $('next-btn'),
  resCorrect: $('res-correct'), resTotal: $('res-total'), resStars: $('res-stars'),
  resStreak: $('res-streak'), resTotalStars: $('res-total-stars'),
  againBtn: $('again-btn'), homeBtn: $('home-btn'),
};

// ---- 設定（音效 / 深色模式）----
let settings = Store.getSettings();

function applySettings() {
  Sound.setEnabled(settings.sound);
  document.documentElement.setAttribute('data-theme', settings.dark ? 'dark' : 'light');
  el.soundToggle.textContent = settings.sound ? '🔊 音效' : '🔇 靜音';
  el.soundToggle.classList.toggle('off', !settings.sound);
  el.themeToggle.textContent = settings.dark ? '☀️ 淺色' : '🌙 深色';
}

// ---- 畫面切換 ----
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ---- 首頁數據 ----
function refreshHome() {
  el.homeStars.textContent = Store.getTotalStars();
  el.homeBest.textContent = Store.getBestStreak();
}

// ---- 開始一回合 ----
function startSession() {
  session = { answered: 0, correct: 0, roundStars: 0, score: 0, streak: 0, bestStreak: 0 };
  adaptive = Q.createAdaptive(1);
  showScreen('quiz');
  updateStats();
  nextQuestion();
}

// ---- 出下一題 ----
function nextQuestion() {
  current = Q.generateQuestion(adaptive.level);
  locked = false;

  el.question.textContent = current.prompt;
  el.feedback.textContent = '';
  el.feedback.className = 'feedback';
  el.explain.classList.add('hidden');
  el.nextBtn.classList.add('hidden');
  renderLevelDots();

  // 重建選項按鈕
  el.options.innerHTML = '';
  current.options.forEach((value) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = value;
    btn.addEventListener('click', () => onAnswer(value, btn));
    el.options.appendChild(btn);
  });
}

function renderLevelDots() {
  let dots = '';
  for (let i = 1; i <= Q.MAX_LEVEL; i++) dots += i <= adaptive.level ? '●' : '○';
  el.levelDots.textContent = dots;
}

// ---- 作答 ----
function onAnswer(value, btn) {
  if (locked) return;
  locked = true;
  session.answered++;

  const isCorrect = value === current.correct;
  // 鎖住所有選項，並標出正解
  el.options.querySelectorAll('.option').forEach((b) => {
    b.disabled = true;
    if (Number(b.textContent) === current.correct) b.classList.add('correct');
  });

  if (isCorrect) {
    session.correct++;
    session.streak++;
    if (session.streak > session.bestStreak) session.bestStreak = session.streak;
    session.score += 10;

    // 星星：每題 1 顆，每連勝到 5 的倍數多給 2 顆
    let earned = 1;
    const bonus = session.streak % 5 === 0;
    if (bonus) earned += 2;
    session.roundStars += earned;

    el.feedback.textContent = bonus ? `✅ 連勝獎勵！ +⭐${earned}` : `✅ 答對了！ +⭐${earned}`;
    el.feedback.className = 'feedback good';
    bonus ? Sound.playBonus() : Sound.playCorrect();
  } else {
    btn.classList.add('wrong');
    session.streak = 0;
    el.feedback.textContent = `❌ 正確答案是 ${current.correct}`;
    el.feedback.className = 'feedback bad';
    el.explain.textContent = current.explanation;
    el.explain.classList.remove('hidden');
    Sound.playWrong();
  }

  Q.recordResult(adaptive, isCorrect);
  updateStats();
  el.nextBtn.classList.remove('hidden');
}

function updateStats() {
  el.statScore.textContent = session.score;
  el.statStreak.textContent = session.streak;
  el.statStars.textContent = session.roundStars;
}

// ---- 結束回合 → 結算 ----
function endSession() {
  const totalStars = Store.addStars(session.roundStars);
  const best = Store.updateBestStreak(session.bestStreak);

  el.resCorrect.textContent = session.correct;
  el.resTotal.textContent = session.answered;
  el.resStars.textContent = session.roundStars;
  el.resStreak.textContent = session.bestStreak;
  el.resTotalStars.textContent = totalStars;
  void best; // 已寫入儲存

  showScreen('result');
}

// ---- 綁定事件 ----
function bindEvents() {
  el.startBtn.addEventListener('click', () => { Sound.playClick(); startSession(); });
  el.endBtn.addEventListener('click', () => { Sound.playClick(); endSession(); });
  el.nextBtn.addEventListener('click', () => { Sound.playClick(); nextQuestion(); });
  el.againBtn.addEventListener('click', () => { Sound.playClick(); startSession(); });
  el.homeBtn.addEventListener('click', () => { Sound.playClick(); refreshHome(); showScreen('home'); });

  el.soundToggle.addEventListener('click', () => {
    settings.sound = !settings.sound;
    Store.saveSettings(settings);
    applySettings();
    Sound.playClick();
  });
  el.themeToggle.addEventListener('click', () => {
    settings.dark = !settings.dark;
    Store.saveSettings(settings);
    applySettings();
  });
}

// ---- 啟動 ----
applySettings();
refreshHome();
bindEvents();
