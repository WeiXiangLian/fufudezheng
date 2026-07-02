// ===== main.js =====
// 流程控制 + 畫面更新：首頁 → 關卡地圖 → 關卡 → 結算。
// 關卡規則（過關門檻、評級、學院幣、解鎖）都在 levels.js；這裡只負責串流程。

import * as Q from './questions.js';
import * as L from './levels.js';
import * as C from './cards.js';
import * as Sound from './sound.js';
import * as Store from './storage.js';

// ---- 進行中關卡的狀態 ----
let run = null;
// run = {
//   level:      關卡設定（L 裡的物件；弱點特訓為 L.WEAK_LEVEL）
//   isWeak:     是否為弱點特訓關
//   count:      本關題數
//   answered:   已答題數
//   correct:    答對題數
//   streak:     連勝
// }
let current = null;   // 目前題目
let locked = false;   // 是否已作答（避免重複點）

let weakness = Store.getWeakness();   // 各題型弱點分數（持續存檔）

// ---- 取得畫面元素 ----
const $ = (id) => document.getElementById(id);
const el = {
  // 首頁
  homeCoins: $('home-coins'), homeStars: $('home-stars'),
  startBtn: $('start-btn'), soundToggle: $('sound-toggle'), themeToggle: $('theme-toggle'),
  gachaBtn: $('gacha-btn'), dexBtn: $('dex-btn'), dexCount: $('dex-count'),
  // 抽卡
  gachaBackBtn: $('gacha-back-btn'), gachaCoins: $('gacha-coins'), pityLeft: $('pity-left'),
  gachaResults: $('gacha-results'), draw1Btn: $('draw1-btn'), draw10Btn: $('draw10-btn'),
  // 圖鑑
  dexBackBtn: $('dex-back-btn'), dexProgress: $('dex-progress'), dexList: $('dex-list'),
  cardModal: $('card-modal'), cardModalBody: $('card-modal-body'),
  // 地圖
  mapHomeBtn: $('map-home-btn'), mapCoins: $('map-coins'), mapStars: $('map-stars'),
  weakBanner: $('weak-banner'), chapters: $('chapters'),
  // 關卡
  quitBtn: $('quit-btn'), quizTitle: $('quiz-title'),
  statStreak: $('stat-streak'), statCorrect: $('stat-correct'), progress: $('progress'),
  question: $('question'), options: $('options'),
  feedback: $('feedback'), explain: $('explain'), nextBtn: $('next-btn'),
  // 結算
  resTitle: $('res-title'), resStars: $('res-stars'),
  resCorrect: $('res-correct'), resTotal: $('res-total'), resCoins: $('res-coins'),
  resReview: $('res-review'),
  resNextBtn: $('res-next-btn'), resRetryBtn: $('res-retry-btn'), resMapBtn: $('res-map-btn'),
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

// ---- 共用：總評級星數 ----
function totalStars(progress) {
  return Object.values(progress).reduce((s, v) => s + v, 0);
}

// ---- 首頁 ----
function refreshHome() {
  el.homeCoins.textContent = Store.getCoins();
  el.homeStars.textContent = totalStars(Store.getProgress());
  const owned = Object.keys(Store.getCards()).length;
  el.dexCount.textContent = `${owned}/${C.CARDS.length}`;
}

// ---- 卡片渲染（抽卡結果與圖鑑共用）----
// owned=false 時顯示未擁有的剪影
function cardHTML(card, count, { unowned = false } = {}) {
  const gold = count >= C.GOLD_AT;
  const cls = `card-item rar-${card.rarity}`
    + (gold ? ' gold' : '')
    + (unowned ? ' unowned' : '');
  return `
    <div class="${cls}" data-card="${card.id}">
      <div class="card-rar">${card.rarity}</div>
      ${count > 1 ? `<div class="card-count">×${count}</div>` : ''}
      <div class="card-symbol">${unowned ? '❓' : card.symbol}</div>
      <div class="card-name">${unowned ? '？？？' : card.name}</div>
      <div class="card-title">${unowned ? '尚未召喚' : card.title}</div>
      ${gold ? '<div class="card-goldstar">✨金卡</div>' : ''}
    </div>`;
}

// ---- 抽卡頁 ----
function refreshGacha() {
  el.gachaCoins.textContent = Store.getCoins();
  el.pityLeft.textContent = C.PITY_LIMIT - Store.getPity();
  el.draw1Btn.disabled = Store.getCoins() < C.SINGLE_COST;
  el.draw10Btn.disabled = Store.getCoins() < C.TEN_COST;
}

function doDraw(times, cost) {
  if (!Store.spendCoins(cost)) return;
  let pity = Store.getPity();
  const results = [];
  for (let i = 0; i < times; i++) {
    const r = C.drawOne(pity);
    pity = r.newPity;
    const count = Store.addCard(r.card.id);
    results.push({ card: r.card, count, pityTriggered: r.pityTriggered });
  }
  Store.setPity(pity);

  // 逐張翻出（動畫延遲逐張排開）
  el.gachaResults.innerHTML = results.map((r, i) => {
    const html = cardHTML(r.card, r.count);
    return html.replace('class="card-item', `style="animation-delay:${i * 0.12}s" class="card-item`);
  }).join('');

  const best = results.some(r => r.card.rarity === 'SSR') ? 'SSR'
    : results.some(r => r.card.rarity === 'SR') ? 'SR' : null;
  if (best === 'SSR') Sound.playBonus();
  else if (best === 'SR') Sound.playCorrect();
  else Sound.playClick();

  bindCardTaps(el.gachaResults);
  refreshGacha();
}

// ---- 圖鑑 ----
const RARITY_ORDER = ['SSR', 'SR', 'R', 'N'];

function renderDex() {
  const cards = Store.getCards();
  const ownedCount = Object.keys(cards).length;
  el.dexProgress.textContent = `${ownedCount}/${C.CARDS.length}`;

  el.dexList.innerHTML = RARITY_ORDER.map(rar => {
    const pool = C.cardsOf(rar);
    const grid = pool.map(card => {
      const count = cards[card.id] || 0;
      return cardHTML(card, count, { unowned: count === 0 });
    }).join('');
    return `
      <div class="dex-section-title">${C.RARITIES[rar].label}・${C.RARITIES[rar].name}
        （${pool.filter(c => cards[c.id]).length}/${pool.length}）</div>
      <div class="dex-grid">${grid}</div>`;
  }).join('');

  bindCardTaps(el.dexList);
}

// 點卡片開詳情彈窗（未擁有的不開）
function bindCardTaps(root) {
  root.querySelectorAll('.card-item:not(.unowned)').forEach(elCard => {
    elCard.addEventListener('click', () => {
      const card = C.cardById(elCard.dataset.card);
      const count = Store.getCards()[card.id] || 0;
      const gold = count >= C.GOLD_AT;
      el.cardModalBody.innerHTML = `
        <div class="modal-symbol">${card.symbol}${gold ? '✨' : ''}</div>
        <div class="modal-rar rar-${card.rarity}">${card.rarity}・${C.RARITIES[card.rarity].name}${gold ? '（金卡）' : ''}</div>
        <div class="modal-name">${card.name}</div>
        <div class="modal-title">${card.title}</div>
        <div class="modal-era">${card.era}</div>
        <div class="modal-fact">${card.fact}</div>
        <div class="modal-count">擁有 ×${count}${gold ? '' : `・再 ${C.GOLD_AT - count} 張升級金卡`}</div>
        <button class="primary big" id="modal-close-btn">關閉</button>`;
      el.cardModal.classList.remove('hidden');
      $('modal-close-btn').addEventListener('click', () => el.cardModal.classList.add('hidden'));
      Sound.playClick();
    });
  });
}

// ---- 關卡地圖 ----
function renderMap() {
  const progress = Store.getProgress();
  el.mapCoins.textContent = Store.getCoins();
  el.mapStars.textContent = totalStars(progress);

  // 弱點警報
  const weakPending = Store.getWrongCount() >= L.WEAK_TRIGGER;
  el.weakBanner.classList.toggle('hidden', !weakPending);

  el.chapters.innerHTML = '';
  L.CHAPTERS.forEach((ch, ci) => {
    const unlocked = L.chapterUnlocked(ci, progress);
    const card = document.createElement('div');
    card.className = 'chapter-card' + (unlocked ? '' : ' locked');

    const got = L.chapterStars(ch, progress);
    let head = `
      <div class="chapter-head">
        <span class="chapter-name">第${ch.id}章 ${ch.name}</span>
        <span class="chapter-stars">⭐ ${got} / ${ch.levels.length * 3}</span>
      </div>
      <div class="chapter-motto">心法：${ch.motto}</div>`;
    if (!unlocked) {
      const prev = L.CHAPTERS[ci - 1];
      const prevGot = L.chapterStars(prev, progress);
      head += `<div class="chapter-lockmsg">🔒 需要第${prev.id}章 ${L.CHAPTER_UNLOCK_STARS}⭐ 解鎖（目前 ${prevGot}⭐）</div>`;
    }
    card.innerHTML = head;

    const nodes = document.createElement('div');
    nodes.className = 'level-nodes';
    ch.levels.forEach((lv, li) => {
      const open = unlocked && L.levelUnlocked(ch, li, progress);
      const stars = progress[lv.id] || 0;

      const wrap = document.createElement('div');
      wrap.className = 'node-wrap';

      const btn = document.createElement('button');
      btn.className = 'node'
        + (lv.boss ? ' boss' : '')
        + (stars > 0 ? ' done' : '')
        + (open ? '' : ' locked');
      btn.textContent = lv.boss ? '👑' : `${li + 1}`;
      if (open) {
        btn.addEventListener('click', () => {
          Sound.playClick();
          // 弱點警報中：強制先打弱點特訓
          if (Store.getWrongCount() >= L.WEAK_TRIGGER) startWeakLevel();
          else startLevel(lv);
        });
      } else {
        btn.disabled = true;
      }

      const starsDiv = document.createElement('div');
      starsDiv.className = 'node-stars';
      starsDiv.textContent = stars > 0 ? '★'.repeat(stars) : '';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'node-name';
      nameDiv.textContent = lv.name;

      wrap.append(btn, starsDiv, nameDiv);
      nodes.appendChild(wrap);
    });
    card.appendChild(nodes);
    el.chapters.appendChild(card);
  });
}

// ---- 開始關卡 ----
function startLevel(levelCfg) {
  run = {
    level: levelCfg,
    isWeak: false,
    count: L.questionCount(levelCfg),
    answered: 0, correct: 0, streak: 0,
  };
  el.quizTitle.textContent = `${levelCfg.id} ${levelCfg.name}` + (levelCfg.boss ? ' 👑' : '');
  showScreen('quiz');
  nextQuestion();
}

// 弱點特訓關：題型依弱點分數加權抽選
function startWeakLevel() {
  run = {
    level: L.WEAK_LEVEL,
    isWeak: true,
    count: L.WEAK_LEVEL.count,
    answered: 0, correct: 0, streak: 0,
  };
  el.quizTitle.textContent = `⚠️ ${L.WEAK_LEVEL.name}`;
  showScreen('quiz');
  nextQuestion();
}

// ---- 出下一題 ----
function nextQuestion() {
  const lv = run.level;
  // 弱點特訓：弱點加權抽題型；一般關卡：從關卡題型池隨機挑
  const category = run.isWeak
    ? Q.chooseCategory(weakness)
    : lv.categories[Math.floor(Math.random() * lv.categories.length)];
  current = Q.generateQuestion(lv.max, category);
  locked = false;

  el.question.textContent = current.prompt;
  el.progress.textContent = `第 ${run.answered + 1} / ${run.count} 題`;
  el.statCorrect.textContent = run.correct;
  el.statStreak.textContent = run.streak;
  el.feedback.textContent = '';
  el.feedback.className = 'feedback';
  el.explain.innerHTML = '';
  el.explain.classList.add('hidden');
  el.nextBtn.classList.add('hidden');

  el.options.innerHTML = '';
  current.options.forEach((value) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = value;
    btn.addEventListener('click', () => onAnswer(value, btn));
    el.options.appendChild(btn);
  });
}

// ---- 作答 ----
function onAnswer(value, btn) {
  if (locked) return;
  locked = true;
  run.answered++;

  const isCorrect = value === current.correct;
  el.options.querySelectorAll('.option').forEach((b) => {
    b.disabled = true;
    if (Number(b.textContent) === current.correct) b.classList.add('correct');
  });

  if (isCorrect) {
    run.correct++;
    run.streak++;
    Store.updateBestStreak(run.streak);
    el.feedback.textContent = '✅ 答對了！';
    el.feedback.className = 'feedback good';
    Sound.playCorrect();
  } else {
    btn.classList.add('wrong');
    run.streak = 0;
    el.feedback.textContent = `❌ 正確答案是 ${current.correct}`;
    el.feedback.className = 'feedback bad';
    const ex = current.explanation;
    const stepsHtml = ex.steps.map(s => `<div class="ex-step">${s}</div>`).join('');
    el.explain.innerHTML = `<div class="ex-principle">${ex.principle}</div>${stepsHtml}`;
    el.explain.classList.remove('hidden');
    Sound.playWrong();

    // 一般關卡才累積答錯計數（弱點特訓中的錯不重複計）
    if (!run.isWeak) Store.setWrongCount(Store.getWrongCount() + 1);
  }

  // 更新該題型弱點分數：答錯加重、答對減輕
  const cat = current.category;
  weakness[cat] = isCorrect
    ? Math.max(0, (weakness[cat] || 0) - 1)
    : Math.min(6, (weakness[cat] || 0) + 3);
  Store.saveWeakness(weakness);

  el.statCorrect.textContent = run.correct;
  el.statStreak.textContent = run.streak;
  el.nextBtn.textContent = run.answered >= run.count ? '看結算 →' : '下一題 →';
  el.nextBtn.classList.remove('hidden');
}

// ---- 結算 ----
function endLevel() {
  el.resCorrect.textContent = run.correct;
  el.resTotal.textContent = run.count;
  el.resReview.classList.add('hidden');
  el.resNextBtn.classList.add('hidden');
  el.resRetryBtn.classList.add('hidden');

  if (run.isWeak) {
    // 弱點特訓：打完即可，計數歸零、給固定獎勵
    Store.setWrongCount(0);
    Store.addCoins(L.WEAK_LEVEL.reward);
    el.resTitle.textContent = '💪 特訓完成！';
    el.resStars.textContent = '';
    el.resCoins.textContent = L.WEAK_LEVEL.reward;
    Sound.playBonus();
    showScreen('result');
    return;
  }

  const lv = run.level;
  const stars = L.starsFor(lv, run.correct);
  const prevStars = Store.getProgress()[lv.id] || 0;
  const isReplay = prevStars > 0;
  const coins = L.coinsFor(run.correct, stars, isReplay);

  if (stars > 0) {
    Store.saveLevelStars(lv.id, stars);
    Store.addCoins(coins);
    el.resTitle.textContent = lv.boss ? '👑 Boss 擊破！' : '🎉 過關！';
    el.resStars.innerHTML =
      '★'.repeat(stars) + `<span class="dim">${'★'.repeat(3 - stars)}</span>`;
    // 有下一關就顯示「下一關」按鈕
    const next = findNextLevel(lv.id);
    if (next) el.resNextBtn.classList.remove('hidden');
    Sound.playBonus();
  } else {
    el.resTitle.textContent = '再接再厲！';
    el.resStars.innerHTML = `<span class="dim">★★★</span>`;
    el.resRetryBtn.classList.remove('hidden');
    // 失敗畫面：顯示本關題型的心法複習
    const tips = [...new Set(lv.categories)]
      .map(c => `・${L.PRINCIPLES[c]}`).join('<br>');
    el.resReview.innerHTML =
      `<div class="review-title">先複習心法，再挑戰一次：</div>${tips}`;
    el.resReview.classList.remove('hidden');
    Sound.playWrong();
  }
  el.resCoins.textContent = coins;
  showScreen('result');
}

// 找同章或跨章的下一關（回傳關卡設定；沒有或未解鎖回傳 null）
function findNextLevel(levelId) {
  const progress = Store.getProgress();
  const flat = [];
  L.CHAPTERS.forEach((ch, ci) => ch.levels.forEach((lv, li) => flat.push({ lv, ch, ci, li })));
  const idx = flat.findIndex(x => x.lv.id === levelId);
  if (idx < 0 || idx + 1 >= flat.length) return null;
  const next = flat[idx + 1];
  const chapterOpen = L.chapterUnlocked(next.ci, progress);
  const levelOpen = L.levelUnlocked(next.ch, next.li, progress);
  return chapterOpen && levelOpen ? next.lv : null;
}

// ---- 綁定事件 ----
function bindEvents() {
  el.startBtn.addEventListener('click', () => { Sound.playClick(); renderMap(); showScreen('map'); });
  el.mapHomeBtn.addEventListener('click', () => { Sound.playClick(); refreshHome(); showScreen('home'); });

  // 抽卡與圖鑑
  el.gachaBtn.addEventListener('click', () => {
    Sound.playClick();
    el.gachaResults.innerHTML = '';
    refreshGacha();
    showScreen('gacha');
  });
  el.gachaBackBtn.addEventListener('click', () => { Sound.playClick(); refreshHome(); showScreen('home'); });
  el.draw1Btn.addEventListener('click', () => doDraw(1, C.SINGLE_COST));
  el.draw10Btn.addEventListener('click', () => doDraw(10, C.TEN_COST));

  el.dexBtn.addEventListener('click', () => { Sound.playClick(); renderDex(); showScreen('dex'); });
  el.dexBackBtn.addEventListener('click', () => { Sound.playClick(); refreshHome(); showScreen('home'); });
  el.cardModal.addEventListener('click', (e) => {
    if (e.target === el.cardModal) el.cardModal.classList.add('hidden');
  });

  el.quitBtn.addEventListener('click', () => { Sound.playClick(); renderMap(); showScreen('map'); }); // 中途離開作廢
  el.nextBtn.addEventListener('click', () => {
    Sound.playClick();
    if (run.answered >= run.count) endLevel();
    else nextQuestion();
  });

  el.resMapBtn.addEventListener('click', () => { Sound.playClick(); renderMap(); showScreen('map'); });
  el.resRetryBtn.addEventListener('click', () => {
    Sound.playClick();
    if (Store.getWrongCount() >= L.WEAK_TRIGGER) startWeakLevel();
    else startLevel(run.level);
  });
  el.resNextBtn.addEventListener('click', () => {
    Sound.playClick();
    const next = findNextLevel(run.level.id);
    if (!next) { renderMap(); showScreen('map'); return; }
    if (Store.getWrongCount() >= L.WEAK_TRIGGER) startWeakLevel();
    else startLevel(next);
  });

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
