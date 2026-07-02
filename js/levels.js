// ===== levels.js =====
// 關卡設定檔：5 章 × 5 關，每章第 5 關為 Boss 關。
// 想調整關卡（題型、數字範圍、名稱、加關）只要改這個檔案，不用動程式。
//
// 每關欄位：
//   id         關卡編號（顯示與存檔用）
//   name       關卡名稱
//   categories 出題題型池（每題隨機從中挑一種）
//   max        數字範圍（運算元絕對值上限）
//   boss       是否為 Boss 關（10 題，其餘 8 題）

const ALL = ['add_pos', 'add_neg', 'add_mixed', 'sub_pos', 'sub_neg'];

export const CHAPTERS = [
  {
    id: 1, name: '同號加法', motto: '同性質直接相加',
    levels: [
      { id: '1-1', name: '正數相加',   categories: ['add_pos'], max: 10 },
      { id: '1-2', name: '負數相加',   categories: ['add_neg'], max: 10 },
      { id: '1-3', name: '同號混合',   categories: ['add_pos', 'add_neg'], max: 15 },
      { id: '1-4', name: '同號進階',   categories: ['add_pos', 'add_neg'], max: 20 },
      { id: '1-5', name: '同號大挑戰', categories: ['add_pos', 'add_neg'], max: 25, boss: true },
    ],
  },
  {
    id: 2, name: '異號加法', motto: '異性質抵銷，大減小',
    levels: [
      { id: '2-1', name: '小試身手',   categories: ['add_mixed'], max: 10 },
      { id: '2-2', name: '抵銷練習',   categories: ['add_mixed'], max: 15 },
      { id: '2-3', name: '正負拉鋸',   categories: ['add_mixed'], max: 20 },
      { id: '2-4', name: '加法總複習', categories: ['add_pos', 'add_neg', 'add_mixed'], max: 20 },
      { id: '2-5', name: '加法大魔王', categories: ['add_pos', 'add_neg', 'add_mixed'], max: 30, boss: true },
    ],
  },
  {
    id: 3, name: '減去正數', motto: '減法轉加法',
    levels: [
      { id: '3-1', name: '初識減法',   categories: ['sub_pos'], max: 10 },
      { id: '3-2', name: '轉加練習',   categories: ['sub_pos'], max: 15 },
      { id: '3-3', name: '減法熟練',   categories: ['sub_pos'], max: 20 },
      { id: '3-4', name: '加減混搭',   categories: ['sub_pos', 'add_mixed'], max: 20 },
      { id: '3-5', name: '減法關主',   categories: ['sub_pos', 'add_pos', 'add_neg', 'add_mixed'], max: 25, boss: true },
    ],
  },
  {
    id: 4, name: '減去負數', motto: '負負得正！',
    levels: [
      { id: '4-1', name: '負負初體驗', categories: ['sub_neg'], max: 10 },
      { id: '4-2', name: '得正練習',   categories: ['sub_neg'], max: 15 },
      { id: '4-3', name: '雙減對決',   categories: ['sub_neg', 'sub_pos'], max: 20 },
      { id: '4-4', name: '減法總複習', categories: ['sub_neg', 'sub_pos'], max: 25 },
      { id: '4-5', name: '負負得正',   categories: ['sub_neg', 'sub_pos'], max: 30, boss: true },
    ],
  },
  {
    id: 5, name: '加減綜合', motto: '全心法混用',
    levels: [
      { id: '5-1', name: '綜合暖身',   categories: ALL, max: 15 },
      { id: '5-2', name: '心法連發',   categories: ALL, max: 20 },
      { id: '5-3', name: '高手過招',   categories: ALL, max: 25 },
      { id: '5-4', name: '畢業考前哨', categories: ALL, max: 30 },
      { id: '5-5', name: '正負數之王', categories: ALL, max: 30, boss: true },
    ],
  },
];

// ---- 規則常數 ----
export const CHAPTER_UNLOCK_STARS = 10; // 開下一章需要前一章至少 10 ⭐（滿 15）
export const WEAK_TRIGGER = 10;         // 累積答錯 10 題觸發弱點特訓
export const WEAK_LEVEL = {             // 弱點特訓關的設定
  id: 'weak', name: '弱點特訓', max: 15, count: 8, reward: 5,
};

// ---- 規則計算 ----
export function questionCount(level) { return level.boss ? 10 : 8; }

// 過關門檻：75%（8 題→6 對、10 題→8 對）
export function passThreshold(level) { return Math.ceil(questionCount(level) * 0.75); }

// 評級：門檻=⭐、門檻+1=⭐⭐、全對=⭐⭐⭐，未過關=0
export function starsFor(level, correct) {
  const n = questionCount(level), pass = passThreshold(level);
  if (correct >= n) return 3;
  if (correct >= pass + 1) return 2;
  if (correct >= pass) return 1;
  return 0;
}

// 學院幣：答對數 + 評級加碼（3⭐ 已含全對額外獎勵）；重玩只給 20%
const RATING_BONUS = { 1: 10, 2: 20, 3: 35 };
export function coinsFor(correct, stars, isReplay) {
  if (stars <= 0) return 0;
  const full = correct + RATING_BONUS[stars];
  return isReplay ? Math.ceil(full * 0.2) : full;
}

// 依進度計算：某章已得的星數
export function chapterStars(chapter, progress) {
  return chapter.levels.reduce((s, lv) => s + (progress[lv.id] || 0), 0);
}

// 某章是否解鎖（第 1 章永遠開；其餘看前一章星數）
export function chapterUnlocked(index, progress) {
  if (index === 0) return true;
  return chapterStars(CHAPTERS[index - 1], progress) >= CHAPTER_UNLOCK_STARS;
}

// 某關是否解鎖（章內線性：第 1 關開、其餘要前一關至少 1⭐）
export function levelUnlocked(chapter, levelIndex, progress) {
  if (levelIndex === 0) return true;
  return (progress[chapter.levels[levelIndex - 1].id] || 0) > 0;
}

// 題型 → 心法重點（失敗畫面顯示複習提示用）
export const PRINCIPLES = {
  add_pos:   '同性質（同為正）：數字直接相加，結果為正。',
  add_neg:   '同性質（同為負）：數字直接相加，結果為負。',
  add_mixed: '異性質相加：先比絕對值定正負，再用大減小抵銷。',
  sub_pos:   '減去正數：轉成「加上負數」再判斷。',
  sub_neg:   '減去負數：負負得正，轉成「加上正數」。',
};
