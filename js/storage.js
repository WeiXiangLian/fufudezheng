// ===== storage.js =====
// 負責把「進度」與「設定」存進瀏覽器的 localStorage（單機保存）。
// 全部包在 try/catch 裡，萬一瀏覽器禁用儲存也不會讓程式崩潰。

const KEY = {
  coins:      'pnz_coins',       // 學院幣（抽卡貨幣）
  progress:   'pnz_progress',    // 關卡進度：{ 關卡id: 最佳評級星數 1~3 }
  wrongCount: 'pnz_wrongCount',  // 累積答錯題數（達標觸發弱點特訓）
  cards:      'pnz_cards',       // 卡片收藏：{ 卡片id: 擁有張數 }
  pity:       'pnz_pity',        // 保底計數：累積未出 SSR 的抽數
  weakness:   'pnz_weakness',    // 各題型弱點分數（答錯會升、答對會降）
  bestStreak: 'pnz_bestStreak',  // 歷史最佳連勝
  settings:   'pnz_settings',    // 設定：音效、深色模式
};

// ---- 底層小工具 ----
function readNumber(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : Number(v);
  } catch (e) {
    return fallback;
  }
}

function writeNumber(key, value) {
  try { localStorage.setItem(key, String(value)); } catch (e) {}
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
}

// ---- 學院幣 ----
export function getCoins() { return readNumber(KEY.coins, 0); }
export function addCoins(n) {
  const next = getCoins() + n;
  writeNumber(KEY.coins, next);
  return next;
}
// 扣款：餘額足夠回傳 true 並扣除，不夠回傳 false
export function spendCoins(n) {
  const now = getCoins();
  if (now < n) return false;
  writeNumber(KEY.coins, now - n);
  return true;
}

// ---- 卡片收藏 ----
export function getCards() { return readJSON(KEY.cards, {}); }
// 加一張卡，回傳該卡最新張數
export function addCard(id) {
  const c = getCards();
  c[id] = (c[id] || 0) + 1;
  writeJSON(KEY.cards, c);
  return c[id];
}

// ---- 保底計數 ----
export function getPity() { return readNumber(KEY.pity, 0); }
export function setPity(n) { writeNumber(KEY.pity, n); }

// ---- 關卡進度（只記最佳評級）----
export function getProgress() { return readJSON(KEY.progress, {}); }
export function saveLevelStars(levelId, stars) {
  const p = getProgress();
  if (stars > (p[levelId] || 0)) {
    p[levelId] = stars;
    writeJSON(KEY.progress, p);
  }
  return p;
}

// ---- 累積答錯計數（弱點特訓觸發器）----
export function getWrongCount() { return readNumber(KEY.wrongCount, 0); }
export function setWrongCount(n) { writeNumber(KEY.wrongCount, n); }

// ---- 弱點分數：{ 題型: 分數 } ----
export function getWeakness() { return readJSON(KEY.weakness, {}); }
export function saveWeakness(obj) { writeJSON(KEY.weakness, obj); }

// ---- 最佳連勝 ----
export function getBestStreak() { return readNumber(KEY.bestStreak, 0); }
export function updateBestStreak(streak) {
  const best = getBestStreak();
  if (streak > best) { writeNumber(KEY.bestStreak, streak); return streak; }
  return best;
}

// ---- 設定：{ sound, dark } ----
const DEFAULT_SETTINGS = { sound: true, dark: false };

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...readJSON(KEY.settings, {}) };
}

export function saveSettings(settings) {
  writeJSON(KEY.settings, settings);
}
