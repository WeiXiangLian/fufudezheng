// ===== questions.js =====
// 出題引擎：正負整數加減法選擇題。包含三套機制：
//   1) 滾動式「難度」自適應（控制數字範圍大小）
//   2) 「題型」分類與弱點加權（答錯的題型會更常出現）
//   3) 專業的答錯講解
// 純邏輯，不碰畫面，方便單獨測試。

// 三個難度等級對應的數字範圍（運算元絕對值上限）
const RANGES = { 1: 10, 2: 20, 3: 30 };
export const MAX_LEVEL = 3;

// 題型分類（依「運算 + 正負號型態」區分學生的不同弱點）
export const CATEGORIES = ['add_pos', 'add_neg', 'add_mixed', 'sub_pos', 'sub_neg'];

// ---- 小工具 ----
function randInt(max) { return Math.floor(Math.random() * (2 * max + 1)) - max; } // [-max, max]
function posInt(max) { return 1 + Math.floor(Math.random() * max); }               // [1, max]
function negInt(max) { return -posInt(max); }                                      // [-max, -1]

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 數字格式化：負數加括號。 -7 -> "(-7)"， 5 -> "5"
export function fmt(n) { return n < 0 ? `(${n})` : `${n}`; }

// ---- 自適應「難度」控制器（連對 3 升級、連錯 2 降級）----
export function createAdaptive(startLevel = 1) {
  return { level: startLevel, recent: [] };
}

export function recordResult(adaptive, isCorrect) {
  adaptive.recent.push(isCorrect);
  if (adaptive.recent.length > 5) adaptive.recent.shift();
  const r = adaptive.recent;
  const last3AllRight = r.length >= 3 && r.slice(-3).every(x => x === true);
  const last2AllWrong = r.length >= 2 && r.slice(-2).every(x => x === false);
  if (last3AllRight && adaptive.level < MAX_LEVEL) {
    adaptive.level++; adaptive.recent = [];
    return { changed: true, direction: 'up' };
  }
  if (last2AllWrong && adaptive.level > 1) {
    adaptive.level--; adaptive.recent = [];
    return { changed: true, direction: 'down' };
  }
  return { changed: false, direction: null };
}

// ---- 弱點加權的題型選擇 ----
// weights：{ 題型: 弱點分數 }。每個題型基礎權重 1，再加上弱點分數。
// 答錯的題型分數高 → 被抽中的機率高 → 反覆出現複習。
export function chooseCategory(weights = {}) {
  const weighted = CATEGORIES.map(c => ({ c, w: 1 + (weights[c] || 0) }));
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of weighted) {
    r -= x.w;
    if (r <= 0) return x.c;
  }
  return CATEGORIES[0];
}

// ---- 出題 ----
// 依「難度 level」與「題型 category」產生一題
export function generateQuestion(level, category) {
  const max = RANGES[level] || RANGES[1];
  const { a, b, op } = operandsFor(category, max);
  const correct = op === 'add' ? a + b : a - b;
  const sym = op === 'add' ? '+' : '−';
  const prompt = `${fmt(a)} ${sym} ${fmt(b)} = ?`;
  return {
    a, b, op, category, prompt, correct,
    options: buildOptions(a, b, op, correct),
    explanation: explain(a, b, op, correct),
  };
}

// 依題型產生運算元（範圍由 max 控制）
function operandsFor(category, max) {
  switch (category) {
    case 'add_pos':   return { op: 'add', a: posInt(max), b: posInt(max) };
    case 'add_neg':   return { op: 'add', a: negInt(max), b: negInt(max) };
    case 'add_mixed': return Math.random() < 0.5
      ? { op: 'add', a: posInt(max), b: negInt(max) }
      : { op: 'add', a: negInt(max), b: posInt(max) };
    case 'sub_pos':   return { op: 'sub', a: randInt(max), b: posInt(max) }; // 減去正數
    case 'sub_neg':   return { op: 'sub', a: randInt(max), b: negInt(max) }; // 減去負數（難點）
    default:          return { op: 'add', a: randInt(max), b: posInt(max) };
  }
}

// 選項：1 個正解 + 3 個「像學生常犯的錯」的誘答，洗牌
function buildOptions(a, b, op, correct) {
  const wrong = new Set();
  if (op === 'add') {
    wrong.add(a - b);
    wrong.add(-(a + b));
    wrong.add(Math.abs(a) + Math.abs(b));
  } else {
    wrong.add(a + b);                     // 把減看成加（最常見）
    wrong.add(b - a);
    wrong.add(-(a - b));
  }
  wrong.add(correct + 1);
  wrong.add(correct - 1);
  wrong.add(correct + 2);
  wrong.delete(correct);
  const picks = shuffle([...wrong]).slice(0, 3);
  return shuffle([correct, ...picks]);
}

// ---- 專業講解 ----
// 回傳 { principle, steps }：原理一句 + 逐步計算一行。
function explain(a, b, op, correct) {
  const fa = fmt(a), fb = fmt(b);
  const A = Math.abs(a), B = Math.abs(b);

  // 減法：一律轉成「加上相反數」
  if (op === 'sub') {
    const principle = b < 0
      ? '減去一個負數，等於加上它的相反數，運算轉為加法。'
      : '減法可轉為加法：減去一個數，等於加上它的相反數。';
    const steps = `${fa} − ${fb} = ${fmt(a)} + ${fmt(-b)} = ${correct}`;
    return { principle, steps };
  }

  // 加法 — 同號（皆正）
  if (a >= 0 && b >= 0) {
    return { principle: '同號相加：兩數絕對值相加，和的符號不變。',
             steps: `${a} + ${b} = ${correct}` };
  }
  // 加法 — 同號（皆負）
  if (a < 0 && b < 0) {
    return { principle: '同號相加：兩數絕對值相加，結果取相同的負號。',
             steps: `|${a}| + |${b}| = ${A} + ${B} = ${A + B}，取負號得 ${correct}` };
  }
  // 加法 — 異號且和為 0（互為相反數）
  if (correct === 0) {
    return { principle: '兩數互為相反數，其和為 0。',
             steps: `${fa} + ${fb} = 0` };
  }
  // 加法 — 異號
  const hi = Math.max(A, B), lo = Math.min(A, B);
  return {
    principle: '異號相加：取兩數絕對值相減，差的符號與絕對值較大的數相同。',
    steps: `較大絕對值 ${hi} − 較小絕對值 ${lo} = ${hi - lo}，${correct < 0 ? '取負號' : '取正號'}得 ${correct}`,
  };
}
