// ===== cards.js =====
// 數學家偉人堂：卡池資料 + 抽卡邏輯（機率、保底、金卡升級門檻）。
// 想調卡池（加卡、改機率、改價格）只改這個檔案。

// ---- 經濟與規則常數 ----
export const SINGLE_COST = 30;   // 單抽價格（學院幣）
export const TEN_COST = 270;     // 十連價格（省 10%）
export const PITY_LIMIT = 100;   // 保底：累積 100 抽未出 SSR，下一抽必得 SSR
export const GOLD_AT = 5;        // 同卡累積 5 張升級金卡

// ---- 稀有度 ----
export const RARITIES = {
  N:   { label: 'N',   name: '普通', rate: 0.60 },
  R:   { label: 'R',   name: '稀有', rate: 0.30 },
  SR:  { label: 'SR',  name: '史詩', rate: 0.08 },
  SSR: { label: 'SSR', name: '傳說', rate: 0.02 },
};

// ---- 卡池（30 張數學家）----
// 欄位：id、name、title 稱號、era 年代、symbol 代表符號、rarity、fact 一句故事
export const CARDS = [
  // ===== SSR 傳說 ×3 =====
  { id: 'gauss',    name: '高斯',   title: '數學王子',     era: '1777–1855', symbol: 'Σ',  rarity: 'SSR',
    fact: '小學時瞬間算出 1+2+⋯+100 = 5050，老師當場傻眼。' },
  { id: 'euler',    name: '歐拉',   title: '最美公式締造者', era: '1707–1783', symbol: 'e',  rarity: 'SSR',
    fact: '雙眼失明後靠心算繼續研究；e^iπ + 1 = 0 被譽為世上最美的公式。' },
  { id: 'newton',   name: '牛頓',   title: '微積分開創者',   era: '1643–1727', symbol: '∫',  rarity: 'SSR',
    fact: '大學因瘟疫停課，他在家「隔離」兩年，想出了微積分和萬有引力。' },

  // ===== SR 史詩 ×6 =====
  { id: 'archimedes', name: '阿基米德', title: '浮力之王',     era: '前287–前212', symbol: '⚖', rarity: 'SR',
    fact: '泡澡時發現浮力原理，興奮得跳出澡盆大喊 Eureka（我找到了）！' },
  { id: 'zu',         name: '祖沖之',   title: '圓周率之王',   era: '429–500',    symbol: 'π', rarity: 'SR',
    fact: '把圓周率算到 3.1415926，這個紀錄領先全世界約一千年。' },
  { id: 'brahmagupta', name: '婆羅摩笈多', title: '負數規則祖師', era: '598–668',  symbol: '±', rarity: 'SR',
    fact: '西元 628 年最早寫下正負數運算規則——你在這裡練的，就是他定下的！' },
  { id: 'fermat',     name: '費馬',     title: '業餘數學之王', era: '1607–1665',  symbol: 'ⁿ', rarity: 'SR',
    fact: '在書頁空白處留言「空白太小寫不下證明」，害數學家苦惱了 358 年。' },
  { id: 'riemann',    name: '黎曼',     title: '質數的守望者', era: '1826–1866',  symbol: 'ζ', rarity: 'SR',
    fact: '黎曼猜想懸賞 100 萬美元，至今無人能解。' },
  { id: 'ramanujan',  name: '拉馬努金', title: '公式魔術師',   era: '1887–1920',  symbol: '∑', rarity: 'SR',
    fact: '病床上隨口指出 1729 是最小能用兩種方式寫成兩立方數和的數。' },

  // ===== R 稀有 ×9 =====
  { id: 'pythagoras', name: '畢達哥拉斯', title: '直角三角形代言人', era: '前570–前495', symbol: '△', rarity: 'R',
    fact: '畢氏定理 a²+b²=c² 名留千古；相傳他的學派連豆子都不敢吃。' },
  { id: 'euclid',     name: '歐幾里得',   title: '幾何之父',       era: '約前300',     symbol: '∥', rarity: 'R',
    fact: '《幾何原本》當了兩千多年的教科書，史上最長壽教材。' },
  { id: 'descartes',  name: '笛卡兒',     title: '座標系發明人',   era: '1596–1650',   symbol: 'xy', rarity: 'R',
    fact: '躺在床上看天花板的蒼蠅，想出了用座標描述位置的方法。' },
  { id: 'pascal',     name: '帕斯卡',     title: '機率論先驅',     era: '1623–1662',   symbol: '▲', rarity: 'R',
    fact: '19 歲就發明了機械計算機，原本是要幫爸爸算稅。' },
  { id: 'leibniz',    name: '萊布尼茲',   title: '二進位之父',     era: '1646–1716',   symbol: 'dx', rarity: 'R',
    fact: '與牛頓為了誰先發明微積分吵了一輩子；他的二進位成了電腦的基礎。' },
  { id: 'galois',     name: '伽羅瓦',     title: '悲劇天才',       era: '1811–1832',   symbol: '⚔', rarity: 'R',
    fact: '20 歲死於決鬥，決鬥前夜狂寫數學遺書，開創了群論。' },
  { id: 'noether',    name: '諾特',       title: '對稱女王',       era: '1882–1935',   symbol: '⟲', rarity: 'R',
    fact: '愛因斯坦稱她為「史上最重要的女數學家」。' },
  { id: 'turing',     name: '圖靈',       title: '電腦科學之父',   era: '1912–1954',   symbol: '01', rarity: 'R',
    fact: '二戰破解德軍密碼機 Enigma，據估讓戰爭提早了兩年結束。' },
  { id: 'liuhui',     name: '劉徽',       title: '中國負數先驅',   era: '約225–295',   symbol: '九', rarity: 'R',
    fact: '注解《九章算術》：紅算籌表正、黑算籌表負——古人這樣算正負數！' },

  // ===== N 普通 ×12 =====
  { id: 'thales',     name: '泰勒斯',   title: '第一位數學家',   era: '前624–前546', symbol: '∠', rarity: 'N',
    fact: '只用影子和比例，就量出了金字塔的高度。' },
  { id: 'fibonacci',  name: '斐波那契', title: '兔子數列主人',   era: '1170–1250',   symbol: '🐇', rarity: 'N',
    fact: '1,1,2,3,5,8⋯ 從兔子繁殖問題誕生的數列，藏在向日葵和貝殼裡。' },
  { id: 'vieta',      name: '韋達',     title: '代數符號化推手', era: '1540–1603',   symbol: 'x', rarity: 'N',
    fact: '率先用字母代表未知數，沒有他就沒有「解 x」這回事。' },
  { id: 'napier',     name: '納皮爾',   title: '對數發明人',     era: '1550–1617',   symbol: 'log', rarity: 'N',
    fact: '發明對數把乘除變加減，天文學家的算力大解放。' },
  { id: 'bernoulli',  name: '白努利',   title: '最強數學家族',   era: '1655–1705',   symbol: 'B', rarity: 'N',
    fact: '一個家族三代出了 8 位數學家，家族聚會像研討會。' },
  { id: 'laplace',    name: '拉普拉斯', title: '天體力學大師',   era: '1749–1827',   symbol: '∇', rarity: 'N',
    fact: '拿破崙問他書裡怎麼沒提上帝，他答：「我不需要那個假設。」' },
  { id: 'cauchy',     name: '柯西',     title: '嚴謹先生',       era: '1789–1857',   symbol: 'ε', rarity: 'N',
    fact: '論文多產到把期刊塞爆，科學院因此規定論文頁數上限。' },
  { id: 'polya',      name: '波利亞',   title: '解題教練',       era: '1887–1985',   symbol: '？', rarity: 'N',
    fact: '《怎樣解題》教全世界：理解、擬定、執行、回顧四步解題。' },
  { id: 'erdos',      name: '埃爾德什', title: '流浪數學家',     era: '1913–1996',   symbol: '∞', rarity: 'N',
    fact: '一生沒有固定的家，拎著行李箱找人合寫了約 1500 篇論文。' },
  { id: 'khwarizmi',  name: '花拉子米', title: '代數命名者',     era: '780–850',     symbol: '算', rarity: 'N',
    fact: '「代數」來自他的書名、「演算法」來自他的名字。' },
  { id: 'hypatia',    name: '希帕提亞', title: '亞歷山卓之光',   era: '約360–415',   symbol: '☾', rarity: 'N',
    fact: '史上第一位留下名字的女數學家，在古亞歷山卓教數學與天文。' },
  { id: 'cantor',     name: '康托爾',   title: '無限的馴服者',   era: '1845–1918',   symbol: 'ℵ', rarity: 'N',
    fact: '證明了「無限」也有大小之分，嚇壞了當時的數學界。' },
];

// ---- 查詢工具 ----
export function cardById(id) { return CARDS.find(c => c.id === id); }
export function cardsOf(rarity) { return CARDS.filter(c => c.rarity === rarity); }

// ---- 抽卡 ----
// pity：目前累積未出 SSR 的抽數。回傳 { card, newPity, pityTriggered }
export function drawOne(pity) {
  let rarity;
  let pityTriggered = false;

  if (pity >= PITY_LIMIT - 1) {
    rarity = 'SSR';                 // 保底觸發
    pityTriggered = true;
  } else {
    const r = Math.random();
    if (r < RARITIES.SSR.rate) rarity = 'SSR';
    else if (r < RARITIES.SSR.rate + RARITIES.SR.rate) rarity = 'SR';
    else if (r < RARITIES.SSR.rate + RARITIES.SR.rate + RARITIES.R.rate) rarity = 'R';
    else rarity = 'N';
  }

  const pool = cardsOf(rarity);
  const card = pool[Math.floor(Math.random() * pool.length)];
  const newPity = rarity === 'SSR' ? 0 : pity + 1;
  return { card, newPity, pityTriggered };
}
