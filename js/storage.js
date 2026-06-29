// ===== storage.js =====
// 負責把「進度」與「設定」存進瀏覽器的 localStorage（單機保存）。
// 全部包在 try/catch 裡，萬一瀏覽器禁用儲存也不會讓程式崩潰。

const KEY = {
  totalStars: 'pnz_totalStars',   // 累積總星星
  bestStreak: 'pnz_bestStreak',   // 歷史最佳連勝
  settings:   'pnz_settings',     // 設定：音效、深色模式
  weakness:   'pnz_weakness',     // 各題型弱點分數（答錯會升、答對會降）
};

// 讀一個數字，讀不到就回傳預設值
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

export function getTotalStars() { return readNumber(KEY.totalStars, 0); }
export function addStars(n) {
  const next = getTotalStars() + n;
  writeNumber(KEY.totalStars, next);
  return next;
}

export function getBestStreak() { return readNumber(KEY.bestStreak, 0); }
// 只有比舊紀錄高才更新，回傳最新的最佳連勝
export function updateBestStreak(streak) {
  const best = getBestStreak();
  if (streak > best) { writeNumber(KEY.bestStreak, streak); return streak; }
  return best;
}

// 設定：{ sound: true/false, dark: true/false }
const DEFAULT_SETTINGS = { sound: true, dark: false };

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try { localStorage.setItem(KEY.settings, JSON.stringify(settings)); } catch (e) {}
}

// 弱點分數：{ 題型: 分數 }。讀不到就回傳空物件。
export function getWeakness() {
  try {
    const raw = localStorage.getItem(KEY.weakness);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveWeakness(obj) {
  try { localStorage.setItem(KEY.weakness, JSON.stringify(obj)); } catch (e) {}
}
