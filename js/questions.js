// ===== questions.js =====
// 出題引擎：負責「正負整數加減法選擇題」的生成，以及「滾動式自適應難度」。
// 這個檔案是純邏輯，不碰畫面，方便單獨測試。

// 三個難度等級對應的數字範圍（運算元落在 [-max, max]）
const RANGES = { 1: 10, 2: 20, 3: 30 };
export const MAX_LEVEL = 3;

// ---- 小工具 ----
function randInt(max) {
  // 回傳 [-max, max] 的整數
  return Math.floor(Math.random() * (2 * max + 1)) - max;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 把數字格式化：負數加括號，方便閱讀。 -7 -> "(-7)"， 5 -> "5"
export function fmt(n) {
  return n < 0 ? `(${n})` : `${n}`;
}

// ---- 自適應難度控制器 ----
// 規則：最近連續答對 3 題就升級；最近連續答錯 2 題就降級。
export function createAdaptive(startLevel = 1) {
  return { level: startLevel, recent: [] };
}

// 記錄一次作答結果，必要時調整難度。回傳是否有變動 {changed, direction}
export function recordResult(adaptive, isCorrect) {
  adaptive.recent.push(isCorrect);
  if (adaptive.recent.length > 5) adaptive.recent.shift();

  const r = adaptive.recent;
  const last3AllRight = r.length >= 3 && r.slice(-3).every(x => x === true);
  const last2AllWrong = r.length >= 2 && r.slice(-2).every(x => x === false);

  if (last3AllRight && adaptive.level < MAX_LEVEL) {
    adaptive.level++;
    adaptive.recent = [];
    return { changed: true, direction: 'up' };
  }
  if (last2AllWrong && adaptive.level > 1) {
    adaptive.level--;
    adaptive.recent = [];
    return { changed: true, direction: 'down' };
  }
  return { changed: false, direction: null };
}

// ---- 出題 ----
// 產生一題：{ a, b, op, prompt, correct, options[4], explanation }
export function generateQuestion(level) {
  const max = RANGES[level] || RANGES[1];
  const op = Math.random() < 0.5 ? 'add' : 'sub';

  let a, b;
  // 避免兩個都是 0 的無意義題；也避免 b=0（加/減 0 太簡單）
  do {
    a = randInt(max);
    b = randInt(max);
  } while (b === 0 || (a === 0 && b === 0));

  const correct = op === 'add' ? a + b : a - b;
  const sym = op === 'add' ? '+' : '−';
  const prompt = `${fmt(a)} ${sym} ${fmt(b)} = ?`;

  const options = buildOptions(a, b, op, correct);
  const explanation = explain(a, b, op, correct);

  return { a, b, op, prompt, correct, options, explanation };
}

// 製造選項：1 個正解 + 3 個「像學生常犯的錯」的誘答，洗牌後回傳
function buildOptions(a, b, op, correct) {
  const wrong = new Set();
  if (op === 'add') {
    wrong.add(a - b);                       // 把加看成減
    wrong.add(-(a + b));                     // 符號弄反
    wrong.add(Math.abs(a) + Math.abs(b));    // 忽略負號直接相加
  } else {
    wrong.add(a + b);                        // 把減看成加
    wrong.add(b - a);                        // 前後對調
    wrong.add(-(a - b));                     // 符號弄反
  }
  // 補一些「差一點」的誘答，確保湊得滿
  wrong.add(correct + 1);
  wrong.add(correct - 1);
  wrong.add(correct + 2);
  wrong.delete(correct);

  const picks = shuffle([...wrong]).slice(0, 3);
  return shuffle([correct, ...picks]);
}

// 產生「答錯講解」，特別加強「減去負數」這個學生最常錯的難點
function explain(a, b, op, correct) {
  const fa = fmt(a);
  if (op === 'sub' && b < 0) {
    // 例如 5 − (-3) = 5 + 3 = 8
    return `減去一個負數，要變成「加上它的相反數」：${fa} − (${b}) = ${a} + ${-b} = ${correct}。`;
  }
  if (op === 'sub') {
    return `減法可以想成「加上相反數」：${fa} − ${b} = ${a} + (${-b}) = ${correct}。`;
  }
  if (a < 0 && b < 0) {
    return `兩個負數相加，會更小（更負）：${fa} + ${fmt(b)} = ${correct}。`;
  }
  if ((a < 0) !== (b < 0)) {
    return `一正一負相加，用大的減小的、取絕對值大的那個符號：${fa} + ${fmt(b)} = ${correct}。`;
  }
  return `${fa} + ${fmt(b)} = ${correct}。`;
}
