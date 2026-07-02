// ===== questions.js =====
// 出題引擎：正負整數加減法選擇題。包含：
//   1) 依「題型 + 數字範圍」出題（難度曲線由關卡設定檔 levels.js 控制）
//   2) 「題型」弱點加權選擇（弱點特訓關用：答錯多的題型更常出現）
//   3) 三步心法講解
// 純邏輯，不碰畫面，方便單獨測試。

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

// ---- 弱點加權的題型選擇（弱點特訓關用）----
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
// 依「數字範圍 max」與「題型 category」產生一題
export function generateQuestion(max, category) {
  const { a, b, op } = operandsFor(category, max);
  const correct = op === 'add' ? a + b : a - b;
  const sym = op === 'add' ? '+' : '−';
  const prompt = `${fmt(a)} ${sym} ${fmt(b)} = ?`;
  return {
    a, b, op, category, prompt, correct,
    options: buildOptions(a, b, op, correct),
    explanation: explain(a, b, op),
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

// ---- 講解 ----
// 心法三步：① 先判斷結果正負 → ② 同性質（同號）數字直接相加 / 異性質（異號）數字抵銷。
// 減法先轉成「加上相反數」，再套用同一套加法判斷。
// 回傳 { principle, steps[] }：原理一句 + 逐步推理（多行）。

function explainAdd(x, y) {
  const sum = x + y;
  const X = Math.abs(x), Y = Math.abs(y);

  // 有 0 的特例
  if (x === 0 || y === 0) {
    return { principle: '與 0 相加，結果就是另一個數。',
             steps: [`${fmt(x)} + ${fmt(y)} = ${sum}`] };
  }

  const sameSign = (x < 0) === (y < 0);

  // 同性質（同號）：數字直接相加
  if (sameSign) {
    const sign = x < 0 ? '負' : '正';
    const mag = X + Y;
    const step2 = sign === '正'
      ? `② 同性質直接相加：${X} + ${Y} = ${mag}`
      : `② 同性質直接相加：${X} + ${Y} = ${mag}，取負號 → ${sum}`;
    return {
      principle: '同性質（同號）：結果與兩數同號，數字直接相加。',
      steps: [`① 兩數同為${sign}數 → 結果為${sign}`, step2],
    };
  }

  // 異性質（異號）且完全抵銷
  if (sum === 0) {
    return {
      principle: '異性質（異號）且絕對值相等：完全抵銷。',
      steps: [`① 兩數絕對值相等、性質相反 → 互相抵銷`, `② 結果為 0`],
    };
  }

  // 異性質（異號）：數字抵銷（大減小），符號看絕對值較大者
  const hi = Math.max(X, Y), lo = Math.min(X, Y);
  const sign = sum < 0 ? '負' : '正';
  const diff = hi - lo;
  const step2 = sign === '正'
    ? `② 異性質要抵銷：${hi} − ${lo} = ${diff}`
    : `② 異性質要抵銷：${hi} − ${lo} = ${diff}，取負號 → ${sum}`;
  return {
    principle: '異性質（異號）：結果取絕對值較大者的符號，數字互相抵銷（大減小）。',
    steps: [`① 絕對值 ${hi} > ${lo}，較大者為${sign}數 → 結果為${sign}`, step2],
  };
}

function explain(a, b, op) {
  if (op === 'add') return explainAdd(a, b);
  // 減法：先轉成加上相反數，再套用加法判斷
  const add = explainAdd(a, -b);
  const conv = `${fmt(a)} − ${fmt(b)} = ${fmt(a)} + ${fmt(-b)}`;
  return {
    principle: '減去一個數 = 加上它的相反數；轉成加法後再判斷正負。',
    steps: [conv, ...add.steps],
  };
}
