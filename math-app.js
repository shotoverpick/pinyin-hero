/* 数学小勇士 —— 人教版一年级数学上册（2024新版）同步闯关与加减法游戏
 * 支持：键盘直接输入数字（0~20智能匹配）/ 屏幕一键盘点按 / 凑十法动态图解 / 统一神经网络TTS配音
 */
(() => {
'use strict';

// ======================= 存档与设置 =======================
const SAVE_KEY = 'math-hero-v1';
const DEFAULT_SETTINGS = {
  sound: true,
  voiceEngine: 'teacher',
  voiceProfileVersion: 3,
  rate: 0.9,
  gameSpeed: 'slow',
  autoHint: true,
  roundSize: 10,
  showNumpad: true
};

let save = loadSave();
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
    const settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}), voiceEngine: 'teacher', voiceProfileVersion: 3 };
    return {
      stars: s.stars || {},
      mistakes: s.mistakes || {},
      balloonBest: s.balloonBest || 0,
      tankBest: s.tankBest || 0,
      mazeBest: s.mazeBest || 0,
      rocketBest: s.rocketBest || 0,
      bonus: s.bonus || 0,
      settings
    };
  } catch (e) {
    return { stars: {}, mistakes: {}, balloonBest: 0, tankBest: 0, mazeBest: 0, rocketBest: 0, bonus: 0, settings: { ...DEFAULT_SETTINGS } };
  }
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  updateStarCount();
}
const S = () => save.settings;
function totalStars() {
  return Object.values(save.stars).reduce((a, b) => a + b, 0) + (save.bonus || 0);
}
function stickerCount() {
  return Math.min(STICKERS.length, Math.floor(totalStars() / 5));
}
function updateStarCount() {
  const el = document.querySelector('#starCount');
  if (el) el.textContent = '⭐ ' + totalStars();
}

function addMistake(q) {
  if (!q || !q.mistakeKey) return;
  const m = save.mistakes[q.mistakeKey] || {
    key: q.mistakeKey,
    eqText: q.eqDisplay || q.prompt,
    ans: q.ans,
    qType: q.qType,
    n: 0
  };
  m.n++;
  save.mistakes[q.mistakeKey] = m;
  persist();
}
function reduceMistake(key) {
  if (!key || !save.mistakes[key]) return;
  save.mistakes[key].n--;
  if (save.mistakes[key].n <= 0) delete save.mistakes[key];
  persist();
}

// ======================= 语音与音效 =======================
function mathToSpeechText(str) {
  return String(str || '').replace(/<[^>]+>/g, '').replace(/\+/g, '加').replace(/-/g, '减')
    .replace(/=/g, '等于').replace(/>/g, '大于').replace(/</g, '小于').replace(/□|\?/g, '几').replace(/\s+/g, ' ');
}
let actx = null;
function ensureAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  try {
    if (!actx || actx.state === 'closed') {
      actx = new Ctx();
    }
    if (actx.state !== 'running') {
      const p = actx.resume();
      if (p && p.catch) p.catch(() => {});
    }
  } catch (e) {
    actx = null;
  }
  return actx;
}

function stopAllSpeech() { window.TeacherVoice.stop(); }
function speak(text) {
  if (!S().sound || !text) return;
  window.TeacherVoice.speak(mathToSpeechText(text), {
    enabled: () => S().sound,
    rate: Math.max(0.7, Math.min(1.5, (S().rate || 0.9) / 0.9)),
    onerror: () => toast('老师配音暂时无法播放，请再点一次 🔊'),
    onmissing: () => toast('这句老师配音尚未准备好')
  });
}

function beep(notes, type = 'sine', vol = 0.22) {
  if (!S().sound) return;
  try {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    let t = Math.max(ctx.currentTime, 0) + 0.005;
    notes.forEach(([f, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(ctx.destination);
      o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
      o.start(t); o.stop(t + d + 0.005);
      t += d * 0.8;
    });
  } catch (e) {
    try { actx = null; } catch (e2) {}
  }
}
const sfx = {
  ok: () => beep([[587, .1], [784, .12], [1047, .24]], 'triangle', 0.25),
  bad: () => beep([[220, .16], [175, .24]], 'square', 0.12),
  key: () => beep([[587, .04], [880, .055]], 'triangle', 0.26),
  pop: () => beep([[620, .05], [940, .09]], 'triangle', 0.24),
  cannon: () => beep([[140, .06], [75, .14], [520, .12]], 'sawtooth', 0.24),
  step: () => beep([[523, .06], [659, .09]], 'triangle', 0.18),
  win: () => beep([[523, .14], [659, .14], [784, .14], [1047, .38]], 'triangle', 0.26),
};

// ======================= 通用工具 =======================
const $ = s => document.querySelector(s);
const app = $('#app');
let keyHandler = null;
let cleanup = null;

function go(render, ...args) {
  if (cleanup) { cleanup(); cleanup = null; }
  keyHandler = null;
  stopAllSpeech();
  window.scrollTo(0, 0);
  render(...args);
}
function setTitle(t) { $('#topTitle').textContent = t; }
let toastTimer;
function toast(msg, ms = 2400) {
  const t = $('#toast'); t.innerHTML = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function starsHtml(n) { return `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(3 - n)}</span></span>`; }
function confetti(n = 30) {
  const em = ['⭐', '🎉', '✨', '🌟', '🎈', '🏆'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'confetti'; d.textContent = em[i % em.length];
    d.style.left = Math.random() * 100 + 'vw';
    d.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
    d.style.animationDelay = Math.random() * .5 + 's';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 4500);
  }
}
const PRAISE = ['太棒了！', '算得真准！', '数学小天才！', '好聪明呀！', '完全正确！', '棒棒哒！', '口算小能手！'];
const praise = () => pick(PRAISE);

// 全局键盘监听（支持数字键 0~9、退格、回车、比较符号 < = >）
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'checkbox') return;
  if (!keyHandler) return;
  const k = e.key;
  if (/^[0-9]$/.test(k) || k === 'Backspace' || k === 'Enter' || k === ' ' || k === '<' || k === '>' || k === '=') {
    e.preventDefault();
    flashNumpadKey(k);
    keyHandler(k);
  }
});

function flashNumpadKey(k) {
  const el = document.querySelector(`.nkey[data-k="${k === ' ' ? 'Enter' : k}"]`);
  if (el) { el.classList.add('pressed'); setTimeout(() => el.classList.remove('pressed'), 120); }
}

// 屏幕数字键盘（支持 0~10 或 0~20 一键快选，也支持键盘打字）
function numpadHtml(maxNum = 20) {
  let h = `<div class="numpad">`;
  // 第一排：0 ~ 10
  h += `<div class="np-row">`;
  for (let i = 0; i <= 10; i++) {
    h += `<button class="nkey" data-num="${i}" data-k="${i}">${i}</button>`;
  }
  h += `</div>`;
  // 第二排：11 ~ 20（当题目范围涉及 11~20 时显示）
  if (maxNum > 10) {
    h += `<div class="np-row">`;
    for (let i = 11; i <= 20; i++) {
      h += `<button class="nkey teen" data-num="${i}">${i}</button>`;
    }
    h += `<button class="nkey del" data-k="Backspace">⌫ 重填</button>`;
    h += `</div>`;
  } else {
    h += `<div class="np-row">
      <button class="nkey del" data-k="Backspace">⌫ 清除</button>
      <button class="nkey ok" data-k="Enter">✓ 确定</button>
    </div>`;
  }
  h += `<div class="sub" style="font-size:13px">💡 可直接点上面的数字按钮，也可以按电脑键盘上的数字键（两位数如 13 连按 1 和 3）</div>`;
  return h + `</div>`;
}

function bindNumpad(root, onDirectNumber, onKeyChar) {
  root.querySelectorAll('.nkey[data-num]').forEach(b => {
    b.addEventListener('click', () => onDirectNumber(+b.dataset.num));
  });
  root.querySelectorAll('.nkey[data-k]:not([data-num])').forEach(b => {
    b.addEventListener('click', () => onKeyChar(b.dataset.k));
  });
}

// ======================= 核心可视化教具渲染器 =======================

// 1. 渲染十格阵 (10-Frame)
// mode: 'add' (a个蓝 + b个橙), 'sub' (total个蓝，其中划掉 b 个), 'make10' (凑十之后：左满10个 + 右剩 rest 个)
function renderTenFrames(a, b = 0, mode = 'add') {
  if (mode === 'sub') {
    let cells = '';
    for (let i = 0; i < 10; i++) {
      if (i < a) {
        const crossed = i >= (a - b);
        cells += `<div class="tf-cell"><div class="tf-dot blue ${crossed ? 'crossed' : ''}"></div>${crossed ? '<div class="cross-line"></div>' : ''}</div>`;
      } else {
        cells += `<div class="tf-cell"></div>`;
      }
    }
    return `<div class="ten-frames-wrap"><div class="ten-frame">${cells}</div></div>`;
  }

  const total = a + b;
  if (total <= 10 && mode !== 'make10_before') {
    let cells = '';
    for (let i = 0; i < 10; i++) {
      if (i < a) cells += `<div class="tf-cell"><div class="tf-dot blue"></div></div>`;
      else if (i < a + b) cells += `<div class="tf-cell"><div class="tf-dot orange"></div></div>`;
      else cells += `<div class="tf-cell"></div>`;
    }
    return `<div class="ten-frames-wrap"><div class="ten-frame">${cells}</div></div>`;
  }

  // 双十格阵（用于20以内进位加法）
  // mode === 'make10_after': 左边盒子里 a 个蓝 + (10-a) 个橙凑成10，右边盒子里剩 b-(10-a) 个橙
  let leftCells = '', rightCells = '';
  if (mode === 'make10_after') {
    const need = 10 - a;
    const rem = b - need;
    for (let i = 0; i < 10; i++) {
      leftCells += `<div class="tf-cell"><div class="tf-dot ${i < a ? 'blue' : 'orange'}"></div></div>`;
    }
    for (let i = 0; i < 10; i++) {
      rightCells += `<div class="tf-cell">${i < rem ? '<div class="tf-dot orange"></div>' : ''}</div>`;
    }
  } else {
    // 凑十前：左边 a 个蓝，右边 b 个橙
    for (let i = 0; i < 10; i++) {
      leftCells += `<div class="tf-cell">${i < a ? '<div class="tf-dot blue"></div>' : ''}</div>`;
    }
    for (let i = 0; i < 10; i++) {
      rightCells += `<div class="tf-cell">${i < b ? '<div class="tf-dot orange"></div>' : ''}</div>`;
    }
  }
  return `<div class="ten-frames-wrap">
    <div><div class="ten-frame">${leftCells}</div><div class="sub" style="text-align:center;margin-top:4px">${mode === 'make10_after' ? '🎉 凑成 1 个十 (10)' : `左边 ${a} 个`}</div></div>
    <div style="font-size:28px;font-weight:900;color:#fab005">${mode === 'make10_after' ? '➕' : '👉'}</div>
    <div><div class="ten-frame">${rightCells}</div><div class="sub" style="text-align:center;margin-top:4px">${mode === 'make10_after' ? `还剩 ${a + b - 10} 个` : `右边 ${b} 个`}</div></div>
  </div>`;
}

// 2. 渲染分与合枝形图 (Number Bond Tree)
// mysteryPos: 'top' | 'left' | 'right' | null
function renderBondTree(top, left, right, mysteryPos = null, userVal = '') {
  const showVal = (pos, val) => {
    if (mysteryPos === pos) return userVal !== '' ? userVal : '?';
    return val;
  };
  return `<div class="bond-tree">
    <div class="bond-node top ${mysteryPos === 'top' ? 'mystery' : ''}">${showVal('top', top)}</div>
    <div class="bond-legs">
      <svg viewBox="0 0 86 28">
        <line x1="43" y1="2" x2="14" y2="26" stroke="#ff922b" stroke-width="4" stroke-linecap="round"/>
        <line x1="43" y1="2" x2="72" y2="26" stroke="#ff922b" stroke-width="4" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="bond-children">
      <div class="bond-node ${mysteryPos === 'left' ? 'mystery' : ''}">${showVal('left', left)}</div>
      <div class="bond-node ${mysteryPos === 'right' ? 'mystery' : ''}">${showVal('right', right)}</div>
    </div>
  </div>`;
}

// 3. 渲染课本同款“凑十法”拆数步骤图（如 9 + 4 = 13，把4分成1和3，9+1=10，10+3=13）
function renderMake10Diagram(a, b, hideAns = false) {
  // 如果 a < b（比如 4 + 9），也可以支持“拆小数凑大数”或“拆右数凑左数”
  const bigFirst = a >= b;
  const need = bigFirst ? (10 - a) : (10 - b);
  const rem = bigFirst ? (b - need) : (a - need);
  const sum = a + b;
  if (bigFirst) {
    return `<div class="make10-diagram">
      <div class="m10-eq">
        <span class="m10-num hl">${a}</span>
        <span>+</span>
        <span class="m10-num">${b}</span>
        <span>=</span>
        <span class="m10-num ans">${hideAns ? '?' : sum}</span>
      </div>
      <div class="m10-sub">
        <span>🔗 <b>${a}</b> 和 <b>${need}</b> 凑成 <b>10</b></span>
        <span>｜</span>
        <span>把 <b>${b}</b> 分成 <b>${need}</b> 和 <b>${rem}</b></span>
      </div>
      <div class="m10-steps">
        <span class="m10-step-pill">① 先算：${a} + ${need} = 10</span>
        <span class="m10-step-pill">② 再算：10 + ${rem} = ${hideAns ? '?' : sum}</span>
      </div>
    </div>`;
  } else {
    return `<div class="make10-diagram">
      <div class="m10-eq">
        <span class="m10-num">${a}</span>
        <span>+</span>
        <span class="m10-num hl">${b}</span>
        <span>=</span>
        <span class="m10-num ans">${hideAns ? '?' : sum}</span>
      </div>
      <div class="m10-sub">
        <span>💡 看大数 <b>${b}</b>，把小数 <b>${a}</b> 分成 <b>${rem}</b> 和 <b>${need}</b></span>
      </div>
      <div class="m10-steps">
        <span class="m10-step-pill">① 先算：${b} + ${need} = 10</span>
        <span class="m10-step-pill">② 再算：10 + ${rem} = ${hideAns ? '?' : sum}</span>
      </div>
    </div>`;
  }
}

// 4. 渲染小棒（10根1捆 + 单根）与计数器（十位/个位）——课本第四单元 p.74~77
function renderPlaceValue(n, opts = {}) {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  let bundlesHtml = '';
  for (let t = 0; t < tens; t++) {
    bundlesHtml += `<div class="stick-bundle">
      <div class="bundle-sticks">${'<span class="stick-single"></span>'.repeat(10)}</div>
      <div class="bundle-band"></div>
      <div class="bundle-label">1个十(10根)</div>
    </div>`;
  }
  let looseHtml = '<div class="loose-sticks">';
  for (let o = 0; o < ones; o++) {
    looseHtml += `<span class="stick-single"></span>`;
  }
  looseHtml += '</div>';

  let tenBeads = '', oneBeads = '';
  for (let i = 0; i < tens; i++) tenBeads += `<div class="abacus-bead ten"></div>`;
  for (let i = 0; i < ones; i++) oneBeads += `<div class="abacus-bead one"></div>`;

  return `<div class="pv-stage">
    ${opts.hideSticks ? '' : `<div class="sticks-box">${bundlesHtml}${ones > 0 ? looseHtml : (tens === 0 ? '<span class="sub">0 根小棒</span>' : '')}</div>`}
    ${opts.hideAbacus ? '' : `<div class="abacus">
      <div class="abacus-rods">
        <div class="abacus-rod">${tenBeads}</div>
        <div class="abacus-rod">${oneBeads}</div>
      </div>
      <div class="abacus-base">
        <div class="abacus-col-label">十位</div>
        <div class="abacus-col-label">个位</div>
      </div>
      ${opts.hideDigits ? '' : `<div class="abacus-digits"><span>${tens > 0 ? tens : ''}</span><span>${ones}</span></div>`}
    </div>`}
  </div>`;
}

// 5. 渲染课本大括号看图列式 (p.45~46 `{ ?只`)
// mystery: 'total' (求总数，用加法) | 'right' (已知总数求右边，用减法) | 'left' (已知总数求左边，用减法)
function renderBraceScene(leftCount, rightCount, emoji, unit, mystery = 'total') {
  const total = leftCount + rightCount;
  const leftHtml = mystery === 'left'
    ? `<div class="brace-group mystery-box">? ${unit}</div>`
    : `<div class="brace-group">${emoji.repeat(leftCount)}</div>`;
  const rightHtml = mystery === 'right'
    ? `<div class="brace-group mystery-box">? ${unit}</div>`
    : `<div class="brace-group">${emoji.repeat(rightCount)}</div>`;
  const totalLabel = mystery === 'total' ? `? ${unit}（求一共）` : `一共 ${total} ${unit}`;

  return `<div class="brace-scene">
    <div class="brace-groups">${leftHtml}<span style="font-size:24px;color:#adb5bd">｜</span>${rightHtml}</div>
    <div class="brace-svg-wrap">
      <svg viewBox="0 0 300 28" width="100%" height="28">
        <path d="M 10 4 Q 10 15 30 15 L 135 15 Q 150 15 150 26 Q 150 15 165 15 L 270 15 Q 290 15 290 4" fill="none" stroke="#f59f00" stroke-width="4" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="brace-total">${totalLabel}</div>
  </div>`;
}

// 6. 渲染直尺数轴 (0~20)
function renderRuler(start, end, blankNums = []) {
  let ticks = '';
  for (let i = start; i <= end; i++) {
    const isBlank = blankNums.includes(i);
    ticks += `<div class="ruler-tick">
      <div class="ruler-mark"></div>
      <div class="ruler-num ${isBlank ? 'blank' : ''}">${isBlank ? '?' : i}</div>
    </div>`;
  }
  return `<div class="ruler-wrap"><div class="ruler-track">${ticks}</div></div>`;
}

// ======================= 智能题库生成器（覆盖全册 30+ 类题型） =======================
// 返回格式：{
//   qType, inputMode: 'number' | 'choice', maxNum: 10 | 20,
//   prompt, speakText, visualHtml, eqHtml, ans, choices, hintHtml, mistakeKey, eqDisplay
// }

function generateQuestion(qType) {
  const th = pick(ITEM_THEMES);
  const th2 = pick(ITEM_THEMES.filter(x => x.emoji !== th.emoji));

  switch (qType) {
    // 1. 点数 1~5
    case 'count_1_5': {
      const n = randInt(1, 5);
      const items = Array.from({ length: n }, () => `<span class="v-item">${th.emoji}</span>`).join('');
      return {
        qType, inputMode: 'number', maxNum: 10, ans: n,
        prompt: `👆 数一数，图中有几${th.unit}${th.name}？（可以点一点图标帮忙数哦）`,
        speakText: `数一数，图中有几${th.unit}${th.name}？`,
        visualHtml: `<div class="visual-items-grid" id="vGrid">${items}</div>`,
        eqHtml: `<span>有</span> <span class="eq-box" id="ansBox">?</span> <span>${th.unit}${th.name}</span>`,
        hintHtml: `一个一个点着数：${Array.from({ length: n }, (_, i) => i + 1).join('、')}，一共有 <b>${n}</b> ${th.unit}！`,
        mistakeKey: `cnt:${n}`, eqDisplay: `数一数 ${th.emoji.repeat(n)} = ${n}`
      };
    }

    // 2. 点数 6~9
    case 'count_6_9': {
      const n = randInt(6, 9);
      const items = Array.from({ length: n }, () => `<span class="v-item">${th.emoji}</span>`).join('');
      return {
        qType, inputMode: 'number', maxNum: 10, ans: n,
        prompt: `🌊 数一数，一共有几${th.unit}${th.name}？`,
        speakText: `数一数，一共有几${th.unit}${th.name}？`,
        visualHtml: `<div class="visual-items-grid" id="vGrid">${items}</div>${renderTenFrames(n, 0, 'add')}`,
        eqHtml: `<span>一共</span> <span class="eq-box" id="ansBox">?</span> <span>${th.unit}</span>`,
        hintHtml: `看十格阵：上面一排满 5 个，下面有 ${n - 5} 个，合起来是 <b>${n}</b>！`,
        mistakeKey: `cnt:${n}`, eqDisplay: `数一数(${n}) = ${n}`
      };
    }

    // 3. 看图比多少 (1~5)
    case 'compare_pic_1_5': {
      let a = randInt(1, 5), b = randInt(1, 5);
      const ans = a > b ? '>' : a < b ? '<' : '=';
      return {
        qType, inputMode: 'choice', ans,
        choices: [
          { val: '>', label: '＞', sub: '大于号（左多）' },
          { val: '=', label: '＝', sub: '等号（同样多）' },
          { val: '<', label: '＜', sub: '小于号（右多）' },
        ],
        prompt: `⚖️ 数一数、比一比：${th.emoji}(${a}) 和 ${th2.emoji}(${b}) 哪个多？选出正确的符号！`,
        speakText: `比一比，${a} 和 ${b} 中间填大于号、小于号还是等号？`,
        visualHtml: `<div class="card" style="background:#f8f9fa;padding:12px 20px;margin:6px 0">
          <div style="font-size:32px;letter-spacing:6px">${th.emoji.repeat(a)} <small style="font-size:18px;color:#666">(${a})</small></div>
          <div style="font-size:32px;letter-spacing:6px;margin-top:6px">${th2.emoji.repeat(b)} <small style="font-size:18px;color:#666">(${b})</small></div>
        </div>`,
        eqHtml: `<span>${a}</span> <span class="eq-box" id="ansBox">?</span> <span>${b}</span>`,
        hintHtml: `🐊 鳄鱼大嘴朝大数！${a === b ? `${a} 和 ${b} 同样多，填等号 ＝` : `${Math.max(a, b)} 比 ${Math.min(a, b)} 大，大嘴朝着 ${Math.max(a, b)}，填 <b>${ans}</b>`}`,
        mistakeKey: `cmp:${a}_${b}`, eqDisplay: `${a} ${ans} ${b}`
      };
    }

    // 4. 数字比大小 (1~5 / 6~9 / 11~20)
    case 'compare_1_5':
    case 'compare_6_9':
    case 'compare_11_20': {
      const [lo, hi] = qType === 'compare_1_5' ? [0, 5] : qType === 'compare_6_9' ? [4, 10] : [10, 20];
      const a = randInt(lo, hi), b = randInt(lo, hi);
      const ans = a > b ? '>' : a < b ? '<' : '=';
      return {
        qType, inputMode: 'choice', ans,
        choices: [
          { val: '>', label: '＞', sub: '大于（按 > 键）' },
          { val: '=', label: '＝', sub: '等于（按 = 键）' },
          { val: '<', label: '＜', sub: '小于（按 < 键）' },
        ],
        prompt: `🐊 比大小：在方框里填上 ＞、＜ 或 ＝（大嘴永远朝大数！）`,
        speakText: `比大小，${a} 和 ${b}，填大于号、小于号还是等号？`,
        visualHtml: hi <= 10 ? renderTenFrames(a, 0, 'add') : renderRuler(10, 20),
        eqHtml: `<span>${a}</span> <span class="eq-box" id="ansBox">?</span> <span>${b}</span>`,
        hintHtml: `在直尺上，越往右的数越大。<b>${a} ${ans} ${b}</b>！`,
        mistakeKey: `cmp:${a}_${b}`, eqDisplay: `${a} ${ans} ${b}`
      };
    }

    // 5. 方位认知（准备课：上下、前后、左右）
    case 'position_quiz': {
      const animals = ['🐶', '🐱', '🐰', '🐼', '🦊'];
      const row = shuffle(animals).slice(0, 4);
      const idx = randInt(1, 2);
      const askLeft = Math.random() < 0.5;
      const target = row[idx];
      const ansAnimal = askLeft ? row[idx - 1] : row[idx + 1];
      const dirWord = askLeft ? '左边' : '右边';
      return {
        qType, inputMode: 'choice', ans: ansAnimal,
        choices: row.map(em => ({ val: em, label: em, sub: '点我选择' })),
        prompt: `🧭 认一认左右：排排坐，请问 <b>${target}</b> 的<b>${dirWord}</b>紧挨着谁？`,
        speakText: `请问 ${target} 的${dirWord}紧挨着谁？`,
        visualHtml: `<div class="visual-items-grid" style="gap:24px;padding:18px 28px">
          ${row.map(em => `<div style="display:flex;flex-direction:column;align-items:center"><span style="font-size:48px">${em}</span></div>`).join('')}
        </div><div class="sub">👈 这边是左　｜　这边是右 👉</div>`,
        eqHtml: `<span>${target} 的${dirWord}是</span> <span class="eq-box" id="ansBox">?</span>`,
        hintHtml: `伸出你的左手和右手比一比：${target} 的${dirWord}是 <b>${ansAnimal}</b> 哦！`,
        mistakeKey: null, eqDisplay: `方位左右辨认`
      };
    }

    // 6. 第几（课本 p.19 & p.37 区分“几个”和“第几”）
    case 'ordinal_1_5':
    case 'ordinal_6_9': {
      const len = qType === 'ordinal_1_5' ? 5 : 8;
      const pool = ['🐶', '🐱', '🐰', '🐼', '🦊', '🐯', '🐸', '🐵', '🐥'];
      const line = shuffle(pool).slice(0, len);
      const fromLeft = Math.random() < 0.65;
      const targetIdx = randInt(0, len - 1);
      const target = line[targetIdx];
      const ans = fromLeft ? (targetIdx + 1) : (len - targetIdx);
      const dirText = fromLeft ? '从左边数' : '从右边数';
      return {
        qType, inputMode: 'number', maxNum: 10, ans,
        prompt: `🚩 排排队：<b>${dirText}</b>，${target} 排在第几？`,
        speakText: `排排队，${dirText}，这个小动物排在第几？`,
        visualHtml: `<div class="visual-items-grid" style="gap:14px;max-width:600px">
          ${line.map((em, i) => `<div style="display:flex;flex-direction:column;align-items:center;padding:6px 8px;border-radius:14px;background:${em === target ? '#fff3bf;border:3px solid #f59f00' : '#fff'}">
            <span style="font-size:40px">${em}</span>
            <small style="font-size:12px;color:#888">${em === target ? '⭐它' : ''}</small>
          </div>`).join('')}
        </div><div class="sub">👈 左边　　　　　　右边 👉</div>`,
        eqHtml: `<span>${dirText}，${target} 排第</span> <span class="eq-box" id="ansBox">?</span>`,
        hintHtml: `${dirText}，1、2……数到 ${target} 正好是第 <b>${ans}</b> 个！`,
        mistakeKey: `ord:${len}_${ans}`, eqDisplay: `${dirText}排第 ${ans}`
      };
    }

    // 7. 分与合（2~5 / 6~9 / 10）
    case 'bond_2_5':
    case 'bond_6_9':
    case 'bond_10': {
      const top = qType === 'bond_2_5' ? randInt(2, 5) : qType === 'bond_6_9' ? randInt(6, 9) : 10;
      const left = randInt(1, top - 1);
      const right = top - left;
      const pos = pick(['right', 'left', 'top']);
      const ans = pos === 'top' ? top : pos === 'left' ? left : right;
      const askStr = pos === 'top'
        ? `${left} 和 ${right} 合成几？`
        : `${top} 可以分成 ${pos === 'left' ? right : left} 和几？`;
      return {
        qType, inputMode: 'number', maxNum: 10, ans,
        prompt: `👐 分与合：${askStr}`,
        speakText: `分与合，${askStr}`,
        visualHtml: `<div class="row center">${renderBondTree(top, left, right, pos)}${renderTenFrames(left, right, 'add')}</div>`,
        eqHtml: pos === 'top'
          ? `<span>${left} 和 ${right} 组成</span> <span class="eq-box" id="ansBox">?</span>`
          : `<span>${top} 分成 ${pos === 'left' ? right : left} 和</span> <span class="eq-box" id="ansBox">?</span>`,
        hintHtml: `看十格阵：${left} 个蓝圆点和 ${right} 个橙圆点合起来是 ${top}，所以空格填 <b>${ans}</b>！`,
        mistakeKey: `bond:${top}_${left}_${right}_${pos}`,
        eqDisplay: `${top} 分成 ${left} 和 ${right}`
      };
    }

    // 8. 1~5 看图加法 & 口算加法
    case 'pic_add_1_5':
    case 'calc_add_1_5': {
      const a = randInt(1, 4), b = randInt(1, 5 - a);
      const sum = a + b;
      return {
        qType, inputMode: 'number', maxNum: 10, ans: sum,
        prompt: `➕ 把两部分合起来，算一算一共有多少？`,
        speakText: `${a} 加 ${b} 等于几？`,
        visualHtml: `<div class="brace-groups" style="justify-content:center;margin:8px 0">
          <div class="brace-group">${th.emoji.repeat(a)}</div>
          <span style="font-size:32px;font-weight:900;color:#f59f00">➕</span>
          <div class="brace-group">${th.emoji.repeat(b)}</div>
        </div>`,
        eqHtml: `<span>${a} + ${b} =</span> <span class="eq-box" id="ansBox">?</span>`,
        hintHtml: `从 ${a} 后面接着数 ${b} 个数（${Array.from({ length: b }, (_, i) => a + i + 1).join('、')}），一共是 <b>${sum}</b>！`,
        mistakeKey: `add:${a}+${b}`, eqDisplay: `${a} + ${b} = ${sum}`
      };
    }

    // 9. 1~5 看图减法 & 口算减法
    case 'pic_sub_1_5':
    case 'calc_sub_1_5': {
      const a = randInt(2, 5), b = randInt(1, a - 1);
      const diff = a - b;
      return {
        qType, inputMode: 'number', maxNum: 10, ans: diff,
        prompt: `➖ 原来有 ${a} 个，去掉 ${b} 个，还剩几个？`,
        speakText: `${a} 减 ${b} 等于几？`,
        visualHtml: renderTenFrames(a, b, 'sub'),
        eqHtml: `<span>${a} - ${b} =</span> <span class="eq-box" id="ansBox">?</span>`,
        hintHtml: `看十格阵：一共 ${a} 个圆点，划掉 ${b} 个，还剩下 <b>${diff}</b> 个！（因为 ${b} 和 ${diff} 组成 ${a}）`,
        mistakeKey: `sub:${a}-${b}`, eqDisplay: `${a} - ${b} = ${diff}`
      };
    }

    // 10. 0 的加减法与 0~5 混合
    case 'calc_zero':
    case 'calc_mix_1_5':
    case 'calc_mix_0_5': {
      let a, b, op, ans;
      if (qType === 'calc_zero' || Math.random() < 0.45) {
        const n = randInt(0, 5);
        const mode = randInt(0, 2);
        if (mode === 0) { a = n; b = 0; op = '+'; ans = n; }
        else if (mode === 1) { a = n; b = 0; op = '-'; ans = n; }
        else { a = n; b = n; op = '-'; ans = 0; }
      } else {
        op = Math.random() < 0.5 ? '+' : '-';
        if (op === '+') { a = randInt(1, 4); b = randInt(1, 5 - a); ans = a + b; }
        else { a = randInt(2, 5); b = randInt(1, a); ans = a - b; }
      }
      return {
        qType, inputMode: 'number', maxNum: 10, ans,
        prompt: `🐼 算一算得数是几？（记住 0 的小秘密哦）`,
        speakText: `${a} ${op === '+' ? '加' : '减'} ${b} 等于几？`,
        visualHtml: op === '+' ? renderTenFrames(a, b, 'add') : renderTenFrames(a, b, 'sub'),
        eqHtml: `<span>${a} ${op} ${b} =</span> <span class="eq-box" id="ansBox">?</span>`,
        hintHtml: b === 0
          ? `任何数加 0 或减 0，还得原来的数 <b>${a}</b>！`
          : (a === b && op === '-')
            ? `两个相同的数相减，全部拿走啦，得数是 <b>0</b>！`
            : `数一数圆点，答案是 <b>${ans}</b>！`,
        mistakeKey: `${op}:${a}${op}${b}`, eqDisplay: `${a} ${op} ${b} = ${ans}`
      };
    }

    // 11. 课本经典大括号问题 (6~7 / 8~9) p.45~46 & p.51
    case 'brace_6_7':
    case 'brace_8_9': {
      const total = qType === 'brace_6_7' ? randInt(6, 7) : randInt(8, 9);
      const left = randInt(2, total - 2);
      const right = total - left;
      const askTotal = Math.random() < 0.5;
      if (askTotal) {
        return {
          qType, inputMode: 'number', maxNum: 10, ans: total,
          prompt: `🔍 看大括号图：左边有 ${left} ${th.unit}，右边有 ${right} ${th.unit}，求“? ${th.unit}”一共有几${th.unit}？`,
          speakText: `左边有 ${left} ${th.unit}，右边有 ${right} ${th.unit}，一共有几${th.unit}？`,
          visualHtml: renderBraceScene(left, right, th.emoji, th.unit, 'total'),
          eqHtml: `<span>${left} + ${right} =</span> <span class="eq-box" id="ansBox">?</span> <span>(${th.unit})</span>`,
          hintHtml: `问号“?”在大括号下面，表示求两部分合起来一共是多少，用<b>加法</b>：${left} + ${right} = <b>${total}</b>！`,
          mistakeKey: `add:${left}+${right}`, eqDisplay: `${left} + ${right} = ${total}`
        };
      } else {
        return {
          qType, inputMode: 'number', maxNum: 10, ans: right,
          prompt: `🔍 看大括号图：一共有 ${total} ${th.unit}，左边有 ${left} ${th.unit}，右边问号处还剩几${th.unit}？`,
          speakText: `一共有 ${total} ${th.unit}，左边有 ${left} ${th.unit}，右边有几${th.unit}？`,
          visualHtml: renderBraceScene(left, right, th.emoji, th.unit, 'right'),
          eqHtml: `<span>${total} - ${left} =</span> <span class="eq-box" id="ansBox">?</span> <span>(${th.unit})</span>`,
          hintHtml: `已知总数是 ${total}，求其中一部分，要从总数里去掉左边的 ${left}，用<b>减法</b>：${total} - ${left} = <b>${right}</b>！`,
          mistakeKey: `sub:${total}-${left}`, eqDisplay: `${total} - ${left} = ${right}`
        };
      }
    }

    // 12. 6~7 / 8~9 / 10 的加减法
    case 'calc_6_7':
    case 'calc_8_9':
    case 'calc_10': {
      const target = qType === 'calc_6_7' ? randInt(6, 7) : qType === 'calc_8_9' ? randInt(8, 9) : 10;
      const op = Math.random() < 0.52 ? '+' : '-';
      const a = randInt(1, target - 1);
      const b = target - a;
      if (op === '+') {
        return {
          qType, inputMode: 'number', maxNum: 10, ans: target,
          prompt: `⚡ 快速口算：${a} 加 ${b} 等于几？`,
          speakText: `${a} 加 ${b} 等于几？`,
          visualHtml: renderTenFrames(a, b, 'add'),
          eqHtml: `<span>${a} + ${b} =</span> <span class="eq-box" id="ansBox">?</span>`,
          hintHtml: `想“分与合”：${a} 和 ${b} 组成 <b>${target}</b>！`,
          mistakeKey: `add:${a}+${b}`, eqDisplay: `${a} + ${b} = ${target}`
        };
      } else {
        return {
          qType, inputMode: 'number', maxNum: 10, ans: b,
          prompt: `⚡ 快速口算：${target} 减 ${a} 等于几？`,
          speakText: `${target} 减 ${a} 等于几？`,
          visualHtml: renderTenFrames(target, a, 'sub'),
          eqHtml: `<span>${target} - ${a} =</span> <span class="eq-box" id="ansBox">?</span>`,
          hintHtml: `想：${target} 可以分成 ${a} 和 <b>${b}</b>，所以 ${target} - ${a} = <b>${b}</b>！`,
          mistakeKey: `sub:${target}-${a}`, eqDisplay: `${target} - ${a} = ${b}`
        };
      }
    }

    // 13. 填未知数（如 6 + [ ] = 9 或 [ ] + 3 = 10）课本 p.52, p.58
    case 'missing_6_9':
    case 'missing_10':
    case 'missing_all': {
      const sum = qType === 'missing_6_9' ? randInt(6, 9) : qType === 'missing_10' ? 10 : randInt(11, 16);
      const a = sum <= 10 ? randInt(1, sum - 1) : randInt(sum - 9, 9);
      const b = sum - a;
      return {
        qType, inputMode: 'number', maxNum: 20, ans: b,
        prompt: `🧩 填未知数：<b>${a}</b> 再添上几就等于 <b>${sum}</b>？`,
        speakText: `${a} 加几等于 ${sum}？`,
        visualHtml: sum <= 10 ? renderTenFrames(a, b, 'add') : renderMake10Diagram(a, b, false),
        eqHtml: `<span>${a} +</span> <span class="eq-box" id="ansBox">?</span> <span>= ${sum}</span>`,
        hintHtml: `想减法或分与合：${sum} - ${a} = <b>${b}</b>，所以方框里填 <b>${b}</b>！`,
        mistakeKey: `miss:${a}+?=${sum}`, eqDisplay: `${a} + (${b}) = ${sum}`
      };
    }

    // 14. 连加、连减、加减混合（课本 p.59~61）
    case 'chain_add_sub':
    case 'chain_mix': {
      let a, b, c, op1, op2, step1, ans;
      const mode = qType === 'chain_add_sub' ? (Math.random() < 0.5 ? 'add' : 'sub') : (Math.random() < 0.5 ? 'add_sub' : 'sub_add');
      if (mode === 'add') {
        a = randInt(2, 5); b = randInt(1, 3); c = randInt(1, 10 - a - b);
        op1 = '+'; op2 = '+'; step1 = a + b; ans = step1 + c;
      } else if (mode === 'sub') {
        a = randInt(6, 10); b = randInt(1, 3); c = randInt(1, a - b - 1);
        op1 = '-'; op2 = '-'; step1 = a - b; ans = step1 - c;
      } else if (mode === 'add_sub') {
        a = randInt(3, 6); b = randInt(2, 10 - a); step1 = a + b;
        c = randInt(1, step1 - 1); op1 = '+'; op2 = '-'; ans = step1 - c;
      } else {
        a = randInt(5, 9); b = randInt(1, a - 2); step1 = a - b;
        c = randInt(1, 10 - step1); op1 = '-'; op2 = '+'; ans = step1 + c;
      }
      return {
        qType, inputMode: 'number', maxNum: 10, ans,
        prompt: `⛓️ 按从左到右的顺序算两步（先算前两个数的得数）：`,
        speakText: `${a} ${op1 === '+' ? '加' : '减'} ${b} ${op2 === '+' ? '加' : '减'} ${c} 等于几？`,
        visualHtml: `<div class="card" style="background:#fff9db;border:2px solid #ffd43b;padding:12px 22px;display:inline-block">
          <div style="font-size:20px;font-weight:800;color:#d9480f">💡 第一步先算：<b>${a} ${op1} ${b} = ${step1}</b></div>
          <div style="font-size:20px;font-weight:800;color:#2b8a3e;margin-top:4px">👉 第二步再算：<b>${step1} ${op2} ${c} = ?</b></div>
        </div>`,
        eqHtml: `<span>${a} ${op1} ${b} ${op2} ${c} =</span> <span class="eq-box" id="ansBox">?</span>`,
        hintHtml: `第一步 ${a} ${op1} ${b} = ${step1}，第二步 ${step1} ${op2} ${c} = <b>${ans}</b>！`,
        mistakeKey: `chain:${a}${op1}${b}${op2}${c}`, eqDisplay: `${a}${op1}${b}${op2}${c} = ${ans}`
      };
    }

    // 15. 认识立体图形（课本第三单元 p.67~69）
    case 'shape_identify':
    case 'shape_feature': {
      const sh = pick(SHAPES_3D);
      if (qType === 'shape_identify') {
        const ex = pick(sh.examples);
        return {
          qType, inputMode: 'choice', ans: sh.name,
          choices: SHAPES_3D.map(s => ({ val: s.name, label: s.name, sub: s.examples[0].emoji })),
          prompt: `📦 认一认：生活中的 <b>${ex.emoji} ${ex.name}</b> 是什么立体图形？`,
          speakText: `生活中的${ex.name}是什么立体图形？`,
          visualHtml: `<div class="card" style="font-size:68px;padding:16px 36px;background:#f8f9fa">${ex.emoji}<div style="font-size:22px;font-weight:800;margin-top:6px">${ex.name}</div></div>`,
          eqHtml: `<span>形状是：</span> <span class="eq-box" id="ansBox" style="min-width:140px;font-size:30px">?</span>`,
          hintHtml: `${ex.name} 的特点：${sh.trait} 所以它是<b>${sh.name}</b>！`,
          mistakeKey: null, eqDisplay: `${ex.name} → ${sh.name}`
        };
      } else {
        return {
          qType, inputMode: 'choice', ans: sh.name,
          choices: SHAPES_3D.map(s => ({ val: s.name, label: s.name, sub: s.examples[0].emoji })),
          prompt: `🕵️ 我说你猜：「${sh.trait}」请问我是谁？`,
          speakText: `我说你猜：${sh.trait} 请问我是谁？`,
          visualHtml: `<div class="congcong-tip" style="max-width:520px;margin:8px auto"><span class="bot">🤖</span><span>谜面：${sh.trait}</span></div>`,
          eqHtml: `<span>谜底是：</span> <span class="eq-box" id="ansBox" style="min-width:140px;font-size:30px">?</span>`,
          hintHtml: `答案是 <b>${sh.name}</b>（比如 ${sh.examples.map(e => e.name).join('、')}）！`,
          mistakeKey: null, eqDisplay: `图形特征 → ${sh.name}`
        };
      }
    }

    // 16. 数小正方体 & 图形规律（课本 p.71~72）
    case 'cube_count': {
      const presets = [
        { name: 'L形4块积木', count: 4, desc: '下层 3 个小正方体，左边上面叠了 1 个（注意它下面压着 1 个哦！）', layout: '🧱🧱🧱 + 上层1个' },
        { name: '墙角5块积木', count: 5, desc: '下层有 4 个（包含墙角被挡住的 1 个），上层有 1 个，4 + 1 = 5 个！', layout: '下层 4 个 + 上层 1 个' },
        { name: '台阶6块积木', count: 6, desc: '第一层 3 个，第二层 2 个，第三层 1 个，3 + 2 + 1 = 6 个！', layout: '3 + 2 + 1 台阶形' },
        { name: '双柱4块积木', count: 4, desc: '左柱 2 个小正方体，右柱 2 个小正方体，2 + 2 = 4 个！', layout: '2 + 2 双柱' },
      ];
      const p = pick(presets);
      return {
        qType, inputMode: 'number', maxNum: 10, ans: p.count,
        prompt: `🧱 数积木（课本第71页）：分层数一数，这堆图形一共用了几个小正方体？`,
        speakText: `数一数，这堆积木一共用了几个小正方体？别忘了数藏在下面的积木哦！`,
        visualHtml: `<div class="card" style="background:#fff9db;border:3px solid #fab005;padding:16px 26px">
          <div style="font-size:24px;font-weight:900;color:#d9480f">📐 ${p.name}（${p.layout}）</div>
          <div style="font-size:17px;color:#5f587a;margin-top:8px">${p.desc}</div>
        </div>`,
        eqHtml: `<span>一共用了</span> <span class="eq-box" id="ansBox">?</span> <span>个小正方体</span>`,
        hintHtml: `小窍门：一层一层数，上层积木下面一定垫着下层积木，一共是 <b>${p.count}</b> 个！`,
        mistakeKey: null, eqDisplay: `数正方体 = ${p.count}`
      };
    }

    case 'shape_pattern': {
      const patterns = [
        { seq: ['🥫圆柱', '🧊正方体', '🥫圆柱', '🧊正方体', '🥫圆柱'], ans: '正方体', hint: '圆柱、正方体两个一组循环，圆柱后面是正方体' },
        { seq: ['⚽球', '📦长方体', '📦长方体', '⚽球', '📦长方体'], ans: '长方体', hint: '1个球、2个长方体循环，接下来还是长方体' },
        { seq: ['🧊正方体', '🥫圆柱', '⚽球', '🧊正方体', '🥫圆柱'], ans: '球', hint: '正方体、圆柱、球三个一组循环，接下来是球' },
      ];
      const p = pick(patterns);
      return {
        qType, inputMode: 'choice', ans: p.ans,
        choices: SHAPES_3D.map(s => ({ val: s.name, label: s.name, sub: s.examples[0].emoji })),
        prompt: `🔮 找规律（课本第72页）：接下来应该摆什么图形？`,
        speakText: `找规律，接下来应该摆什么图形？`,
        visualHtml: `<div class="visual-items-grid" style="font-size:22px;font-weight:800;gap:12px">
          ${p.seq.map(x => `<span style="background:#fff;padding:8px 12px;border-radius:12px;border:2px solid #dee2e6">${x}</span>`).join('')}
          <span style="background:#fff0f6;padding:8px 14px;border-radius:12px;border:3px dashed #f06595;color:#d6336c">？</span>
        </div>`,
        eqHtml: `<span>下一个摆：</span> <span class="eq-box" id="ansBox" style="min-width:130px;font-size:28px">?</span>`,
        hintHtml: `${p.hint}，所以选 <b>${p.ans}</b>！`,
        mistakeKey: null, eqDisplay: `图形规律 → ${p.ans}`
      };
    }

    // 17. 11~20 的位值与组成（课本第四单元 p.76~77）
    case 'place_value_quiz': {
      const n = randInt(11, 20);
      const tens = Math.floor(n / 10), ones = n % 10;
      const askTotal = Math.random() < 0.7;
      if (askTotal) {
        const desc = n === 20 ? `<b>2 个十</b>合起来是多少？` : `<b>${tens} 个十</b>和 <b>${ones} 个一</b>合起来是多少？`;
        return {
          qType, inputMode: 'number', maxNum: 20, ans: n,
          prompt: `🪵 看小棒与计数器：${desc}`,
          speakText: n === 20 ? `2个十合起来是多少？` : `${tens}个十和${ones}个一合起来是多少？`,
          visualHtml: renderPlaceValue(n, { hideDigits: true }),
          eqHtml: `<span>写作：</span> <span class="eq-box" id="ansBox">?</span>`,
          hintHtml: `十位上是 ${tens}，个位上是 ${ones}，合起来就是 <b>${n}</b>！`,
          mistakeKey: `pv:${n}`, eqDisplay: `${tens}个十和${ones}个一 = ${n}`
        };
      } else {
        const askOnes = Math.random() < 0.6 && n < 20;
        const ans = askOnes ? ones : tens;
        return {
          qType, inputMode: 'number', maxNum: 10, ans,
          prompt: askOnes ? `🔢 <b>${n}</b> 里面有 ${tens} 个十和（ <b>?</b> ）个一？` : `🔢 <b>${n}</b> 里面有（ <b>?</b> ）个十${ones ? `和 ${ones} 个一` : ''}？`,
          speakText: askOnes ? `${n}里面有${tens}个十和几个一？` : `${n}里面有几个十？`,
          visualHtml: renderPlaceValue(n),
          eqHtml: `<span>填：</span> <span class="eq-box" id="ansBox">?</span>`,
          hintHtml: `从右边起第一位是个位（${ones}个一），第二位是十位（${tens}个十），所以填 <b>${ans}</b>！`,
          mistakeKey: `pv:${n}`, eqDisplay: `${n} 的十位与个位`
        };
      }
    }

    // 18. 11~20 的数序（前一个数、后一个数、中间的数）课本 p.78
    case 'num_order_11_20': {
      const n = randInt(11, 19);
      const mode = randInt(0, 2);
      const ans = mode === 0 ? n + 1 : mode === 1 ? n - 1 : n;
      const prompt = mode === 0
        ? `📏 看直尺：比 <b>${n}</b> 大 1 的数（后一个数）是几？`
        : mode === 1
          ? `📏 看直尺：比 <b>${n}</b> 小 1 的数（前一个数）是几？`
          : `📏 看直尺：<b>${n - 1}</b> 和 <b>${n + 1}</b> 中间的数是几？`;
      return {
        qType, inputMode: 'number', maxNum: 20, ans,
        prompt,
        speakText: prompt,
        visualHtml: renderRuler(10, 20, [ans]),
        eqHtml: `<span>答案是</span> <span class="eq-box" id="ansBox">?</span>`,
        hintHtml: `顺着数：${ans - 1}、<b>${ans}</b>、${ans + 1}！`,
        mistakeKey: `ord20:${ans}`, eqDisplay: `11~20数序 = ${ans}`
      };
    }

    // 19. 10加几、十几加几与相应减法（课本 p.81）
    case 'calc_10_plus':
    case 'calc_teen_no_carry': {
      let a, b, op, ans;
      if (qType === 'calc_10_plus' || Math.random() < 0.45) {
        const ones = randInt(1, 9);
        const m = randInt(0, 2);
        if (m === 0) { a = 10; b = ones; op = '+'; ans = 10 + ones; }
        else if (m === 1) { a = 10 + ones; b = ones; op = '-'; ans = 10; }
        else { a = 10 + ones; b = 10; op = '-'; ans = ones; }
      } else {
        op = Math.random() < 0.55 ? '+' : '-';
        if (op === '+') {
          const onesA = randInt(1, 7), onesB = randInt(1, 9 - onesA);
          a = 10 + onesA; b = onesB; ans = a + b;
        } else {
          const onesA = randInt(3, 9), onesB = randInt(1, onesA - 1);
          a = 10 + onesA; b = onesB; ans = a - b;
        }
      }
      return {
        qType, inputMode: 'number', maxNum: 20, ans,
        prompt: `🧮 算一算（十位不变，个位相加减）：`,
        speakText: `${a} ${op === '+' ? '加' : '减'} ${b} 等于几？`,
        visualHtml: renderPlaceValue(op === '+' ? a : ans),
        eqHtml: `<span>${a} ${op} ${b} =</span> <span class="eq-box" id="ansBox">?</span>`,
        hintHtml: op === '+'
          ? `十位上是 1 个十，个位上 ${a % 10} + ${b % 10} = ${(a + b) % 10}，合起来是 <b>${ans}</b>！`
          : `从 ${a} 里减去 ${b}，得数是 <b>${ans}</b>！`,
        mistakeKey: `teen:${a}${op}${b}`, eqDisplay: `${a} ${op} ${b} = ${ans}`
      };
    }

    // 20. 课本第82页经典难题：排队“之间”有几人
    case 'between_quiz': {
      const start = randInt(4, 11);
      const between = randInt(3, 6);
      const end = start + between + 1;
      const dotsHtml = Array.from({ length: end - start + 1 }, (_, i) => {
        const num = start + i;
        const isEnd = i === 0 || i === (end - start);
        return `<div style="display:inline-flex;flex-direction:column;align-items:center;margin:0 5px">
          <div style="width:36px;height:36px;border-radius:50%;background:${isEnd ? '#ff6b6b' : '#51cf66'};color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center">${isEnd ? '✕' : '●'}</div>
          <small style="font-weight:800;margin-top:4px;color:${isEnd ? '#c92a2a' : '#2b8a3e'}">第${num}</small>
        </div>`;
      }).join('');
      return {
        qType, inputMode: 'number', maxNum: 10, ans: between,
        prompt: `👫 排队问题（课本第82页）：小朋友排队，小悦排第 <b>${start}</b>，小宇排第 <b>${end}</b>，他们两人的<b>之间</b>有几人？（注意：不包括小悦和小宇自己哦！）`,
        speakText: `小悦排第${start}，小宇排第${end}，他们之间有几人？`,
        visualHtml: `<div class="card" style="background:#f8f9fa;padding:14px 20px">${dotsHtml}</div>`,
        eqHtml: `<span>之间有</span> <span class="eq-box" id="ansBox">?</span> <span>人</span>`,
        hintHtml: `看上面的圆点图：把两头的第${start}和第${end}打叉去掉，中间绿圆点是第 ${Array.from({ length: between }, (_, i) => start + 1 + i).join('、')}，一共有 <b>${between}</b> 人！（列式：${end} - ${start} - 1 = ${between}）`,
        mistakeKey: `btw:${start}_${end}`, eqDisplay: `第${start}和第${end}之间有 ${between} 人`
      };
    }

    // 21. 20以内进位加法：凑十法拆数专练 + 口算（课本第五单元 p.88~102）
    case 'make10_step_9':
    case 'calc_9_plus':
    case 'make10_step_876':
    case 'calc_876_plus':
    case 'calc_5432_plus': {
      let a, b;
      if (qType === 'make10_step_9' || qType === 'calc_9_plus') {
        a = 9; b = randInt(2, 9);
      } else if (qType === 'make10_step_876' || qType === 'calc_876_plus') {
        a = pick([8, 7, 6]); b = randInt(11 - a, 9);
      } else {
        a = pick([5, 4, 3, 2]); b = randInt(11 - a, 9);
      }
      const sum = a + b;
      return {
        qType, inputMode: 'number', maxNum: 20, ans: sum,
        prompt: `🔥 20以内进位加法（用“凑十法”算一算）：`,
        speakText: `${a} 加 ${b} 等于几？`,
        visualHtml: `<div>${renderMake10Diagram(a, b, true)}${renderTenFrames(a >= b ? a : b, a >= b ? b : a, 'make10_after')}</div>`,
        eqHtml: `<span>${a} + ${b} =</span> <span class="eq-box" id="ansBox">?</span>`,
        hintHtml: a >= b
          ? `看大数 ${a}，分小数 ${b}（分成 ${10 - a} 和 ${b - (10 - a)}）：先算 ${a} + ${10 - a} = 10，再算 10 + ${b - (10 - a)} = <b>${sum}</b>！`
          : `想大数加小数：因为 ${b} + ${a} = <b>${sum}</b>，所以 ${a} + ${b} = <b>${sum}</b>！`,
        mistakeKey: `carry:${a}+${b}`, eqDisplay: `${a} + ${b} = ${sum}`
      };
    }

    // 22. 算式比大小（课本 p.95, p.99：9+4 ○ 13）
    case 'compare_carry': {
      const a = randInt(6, 9), b = randInt(11 - a, 9);
      const sum = a + b;
      const delta = pick([-1, 0, 1]);
      const rightVal = sum + delta;
      const ans = sum > rightVal ? '>' : sum < rightVal ? '<' : '=';
      return {
        qType, inputMode: 'choice', ans,
        choices: [
          { val: '>', label: '＞', sub: '大于' },
          { val: '=', label: '＝', sub: '等于' },
          { val: '<', label: '＜', sub: '小于' },
        ],
        prompt: `⚖️ 先算出左边算式的得数，再和右边的数比大小：`,
        speakText: `比大小，${a}加${b} 和 ${rightVal}，填大于号、小于号还是等号？`,
        visualHtml: renderMake10Diagram(a, b, false),
        eqHtml: `<span>${a} + ${b}</span> <span class="eq-box" id="ansBox">?</span> <span>${rightVal}</span>`,
        hintHtml: `因为 ${a} + ${b} = ${sum}，而 ${sum} ${ans} ${rightVal}，所以填 <b>${ans}</b>！`,
        mistakeKey: `cmpc:${a}+${b}_${rightVal}`, eqDisplay: `${a}+${b} ${ans} ${rightVal}`
      };
    }

    // 23. 逆向求和问题（课本 p.97：领走了6个，剩下5个，原来有多少个？）
    case 'word_original_total': {
      const taken = randInt(5, 8), left = randInt(4, 8);
      const total = taken + left;
      return {
        qType, inputMode: 'number', maxNum: 20, ans: total,
        prompt: `🏀 解决问题（课本第97页）：领走了 <b>${taken}</b> ${th.unit}${th.name}，还剩下 <b>${left}</b> ${th.unit}。请问<b>原来</b>一共有多少${th.unit}${th.name}？`,
        speakText: `领走了${taken}${th.unit}${th.name}，还剩下${left}${th.unit}，原来一共有多少${th.unit}？`,
        visualHtml: `<div class="brace-scene">
          <div class="brace-groups">
            <div class="brace-group"><div><small style="font-size:13px;color:#888;display:block">领走的 ${taken}${th.unit}</small>${th.emoji.repeat(taken)}</div></div>
            <span style="font-size:28px;color:#f59f00">➕</span>
            <div class="brace-group"><div><small style="font-size:13px;color:#888;display:block">剩下的 ${left}${th.unit}</small>${th.emoji.repeat(left)}</div></div>
          </div>
          <div class="brace-total" style="margin-top:8px">求“原来有多少”＝ 领走的 ＋ 剩下的</div>
        </div>`,
        eqHtml: `<span>${taken} + ${left} =</span> <span class="eq-box" id="ansBox">?</span> <span>(${th.unit})</span>`,
        hintHtml: `求“原来有多少”，要把领走的 ${taken} ${th.unit}和剩下的 ${left} ${th.unit}合起来，用加法：${taken} + ${left} = <b>${total}</b>！`,
        mistakeKey: `carry:${taken}+${left}`, eqDisplay: `原来有 ${taken}+${left}=${total}`
      };
    }

    // 24. 多角度观察求和（课本 p.96）
    case 'word_multi_angle': {
      const front = randInt(6, 8), back = randInt(5, 8);
      const total = front + back;
      return {
        qType, inputMode: 'number', maxNum: 20, ans: total,
        prompt: `🦢 解决问题（课本第96页）：湖里前排有 <b>${front}</b> 只天鹅，后排有 <b>${back}</b> 只天鹅，一共有多少只天鹅？`,
        speakText: `前排有${front}只天鹅，后排有${back}只天鹅，一共有多少只天鹅？`,
        visualHtml: renderMake10Diagram(front, back, true),
        eqHtml: `<span>${front} + ${back} =</span> <span class="eq-box" id="ansBox">?</span> <span>(只)</span>`,
        hintHtml: `把前排和后排合起来：${front} + ${back} = <b>${total}</b> 只！`,
        mistakeKey: `carry:${front}+${back}`, eqDisplay: `${front} + ${back} = ${total}`
      };
    }

    // 25. 全册综合口算 (calc_all_mix)
    default: {
      const subTypes = ['calc_add_1_5', 'calc_sub_1_5', 'calc_6_7', 'calc_8_9', 'calc_10', 'calc_teen_no_carry', 'calc_9_plus', 'calc_876_plus'];
      return generateQuestion(pick(subTypes));
    }
  }
}

// ======================= 聪聪交互小课堂（每课专属互动讲台） =======================
function renderTeachPanel(lesson) {
  const t = lesson.teachType;
  if (t === 'count_intro' || t === 'num_1_5_compare' || t === 'num_6_9') {
    const nums = t === 'num_1_5_compare' ? [1, 2, 3, 4, 5] : t === 'num_6_9' ? [6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return `<div class="teach-box">
      <div class="congcong-tip"><span class="bot">🤖</span><span><b>聪聪小课堂：</b>点一点下面的数字卡片，听一听<b>数字儿歌</b>！记住：比大小的时候，<b>鳄鱼大嘴永远朝着大数（如 4 ＞ 2，2 ＜ 4，3 ＝ 3）</b>！</span></div>
      <div class="row center">
        ${nums.map(n => {
          const info = NUMBER_RHYMES[n];
          return `<button class="card teach-num-card" data-say="${n}，${info.rhyme}" style="padding:12px 16px;text-align:center;min-width:130px;border:2px solid #d0ebff">
            <div style="font-size:44px;font-weight:900;color:#1971c2;font-family:var(--num-font)">${n}</div>
            <div style="font-size:15px;font-weight:800;margin:4px 0">${info.items}</div>
            <div style="font-size:13px;color:#6c6587">${info.rhyme}</div>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }

  if (t === 'position_intro') {
    return `<div class="teach-box">
      <div class="congcong-tip"><span class="bot">🤖</span><span><b>聪聪小课堂：</b>上拍拍、下拍拍、前拍拍、后拍拍！举手发言用<b>右手</b>，端碗拿筷分<b>左右</b>。排排队时要注意区分<b>“几个”</b>（总数）和<b>“第几”</b>（那1个的位置）哦！</span></div>
      <div class="row center" style="gap:18px">
        <div class="card" style="background:#fff9db;text-align:center">🖐️ <b>左手</b>（靠左边的手）</div>
        <div class="card" style="background:#e7f5ff;text-align:center">✋ <b>右手</b>（写字、举手发言的手）</div>
      </div>
    </div>`;
  }

  if (t === 'bonds_1_5' || t === 'bonds_6_9') {
    const defaultN = t === 'bonds_1_5' ? 5 : 8;
    const nums = t === 'bonds_1_5' ? [2, 3, 4, 5] : [6, 7, 8, 9];
    return `<div class="teach-box">
      <div class="congcong-tip"><span class="bot">🤖</span><span><b>聪聪小课堂 · 分与合：</b>点选一个数，看看它可以分成几和几！按顺序成对记，又快又全！</span></div>
      <div class="row center" style="margin-bottom:12px">
        ${nums.map(n => `<button class="btn small ${n === defaultN ? 'blue' : 'gray'} bond-switch-btn" data-n="${n}">${n} 的分与合</button>`).join('')}
      </div>
      <div id="bondDemoArea" class="row center"></div>
    </div>`;
  }

  if (t === 'add_1_5' || t === 'sub_1_5' || t === 'zero_intro') {
    return `<div class="teach-box">
      <div class="congcong-tip"><span class="bot">🤖</span><span><b>聪聪小课堂：</b>
        ${t === 'add_1_5' ? '把两部分<b>合起来</b>求一共是多少，用<b>加法（＋）</b>！比如 3 ＋ 2 ＝ 5，读作：3加2等于5。' :
          t === 'sub_1_5' ? '从总数里<b>去掉一部分</b>求还剩多少，用<b>减法（－）</b>！比如 5 － 2 ＝ 3，读作：5减2等于3。' :
          '盘子里一个竹笋也没有，用 <b>0</b> 表示！<b>相同的两个数相减得 0（3-3=0），任何数加减 0 还得原数（4+0=4，5-0=5）</b>！'}
      </span></div>
    </div>`;
  }

  if (t === 'brace_6_7' || t === 'add_sub_8_9') {
    return `<div class="teach-box">
      <div class="congcong-tip"><span class="bot">🤖</span><span><b>聪聪解题秘诀（大括号问题）：</b><br>
      ① 问号 <b>“?” 在大括号下面</b> 👉 求两部分合起来一共是多少，用<b>加法（＋）</b>；<br>
      ② 问号 <b>“?” 在大括号上面的一侧</b> 👉 已知总数求部分，用总数减去已知部分，用<b>减法（－）</b>！</span></div>
    </div>`;
  }

  if (t === 'make_10_intro') {
    return `<div class="teach-box">
      <div class="congcong-tip"><span class="bot">🤖</span><span><b>聪聪小课堂 · 凑十儿歌（必背口诀！）：</b>点一点下面的卡片跟读，学会了凑十歌，后面算 20 以内进位加法快如闪电！</span></div>
      <div class="row center">
        ${MAKE_TEN_SONGS.map(s => `<button class="card teach-num-card" data-say="${s.text}，${s.a}加${s.b}等于10" style="border:3px solid ${s.color};text-align:center;min-width:170px;padding:12px 16px">
          <div style="font-size:32px">${s.emoji} <b>${s.a} + ${s.b} = 10</b></div>
          <div style="font-size:17px;font-weight:900;color:#d9480f;margin-top:4px">${s.text}</div>
        </button>`).join('')}
      </div>
    </div>`;
  }

  if (t === 'chain_calc') {
    return `<div class="teach-box">
      <div class="congcong-tip"><span class="bot">🤖</span><span><b>聪聪小课堂 · 连加、连减与加减混合：</b>按照<b>从左到右</b>的顺序，先算出前两个数的得数（记在心里或写在下面），再用这个得数和第三个数相加减！</span></div>
    </div>`;
  }

  if (t === 'shapes_intro' || t === 'shapes_count') {
    return `<div class="teach-box">
      <div class="congcong-tip"><span class="bot">🤖</span><span><b>聪聪小课堂 · 认识立体图形：</b>点一点图形卡片，听听它的特征！数正方体时要<b>一层一层数</b>，千万别漏掉藏在下面的积木哦！</span></div>
      <div class="row center">
        ${SHAPES_3D.map(s => `<button class="card teach-num-card" data-say="${s.name}：${s.trait}" style="border-left:8px solid ${s.color};max-width:240px;text-align:left;padding:14px">
          <div style="font-size:22px;font-weight:900;color:${s.color}">${s.examples[0].emoji} ${s.name}</div>
          <div style="font-size:14px;color:#555;margin-top:4px">${s.trait}</div>
        </button>`).join('')}
      </div>
    </div>`;
  }

  if (t === 'place_value_11_20' || t === 'teen_add_sub' || t === 'between_problem') {
    return `<div class="teach-box">
      <div class="congcong-tip"><span class="bot">🤖</span><span><b>聪聪小课堂 · 11~20的认识：</b><br>
      🌟 <b>10 个一是 1 个十</b>（10根小棒捆成1捆）。计数器从右边起，第一位是<b>个位</b>，第二位是<b>十位</b>。<br>
      🌟 算“第10和第15<b>之间</b>有几人”时，两头的第10和第15都<b>不算在内</b>（11、12、13、14，共4人）！</span></div>
    </div>`;
  }

  // 第五单元 20以内进位加法 & 第六单元总复习
  return `<div class="teach-box">
    <div class="congcong-tip"><span class="bot">🤖</span><span><b>聪聪小课堂 · 凑十法四字口诀：</b><br>
    🔥 <b>看大数，分小数，凑成十，加剩数！</b>比如算 <b>9 + 4</b>：9 差 1 凑成 10，就把 4 分成 <b>1 和 3</b>，先算 9 + 1 = 10，再算 10 + 3 = 13！</span></div>
    <div class="center">${renderMake10Diagram(9, 4, false)}</div>
  </div>`;
}

// ======================= 首页与导航 =======================
const ALL_LESSONS = [];
MATH_UNITS.forEach(u => u.lessons.forEach(l => { l.unit = u; ALL_LESSONS.push(l); }));

function homeScreen() {
  setTitle('数学小勇士 · 一年级上册');
  const mc = Object.keys(save.mistakes).length;
  app.innerHTML = `
    <div class="hero">
      <h1>🦸‍♂️ 数学小勇士</h1>
      <p>人教版一年级数学上册（2024新版）同步闯关 · 玩转加减法与凑十法！</p>
      <div class="congcong-banner">
        <span class="congcong-avatar">🤖</span>
        <span>你好呀！我是课本里的好朋友<b>聪聪</b>，快来和我一起闯关拿星星吧！</span>
      </div>
    </div>
    <div class="mode-grid">
      <button class="mode-card" style="background:linear-gradient(135deg,#4fb3e8,#228be6)" data-go="units">
        <div class="emoji">📚</div><h2>课本同步闯关</h2>
        <p>准备课 + 1~6单元全覆盖<br>从 1~5 到 20 以内进位加法</p>
        <div class="big-bg">1+1</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#f5a623,#e8590c)" data-go="lab">
        <div class="emoji">🧮</div><h2>数学魔法教具箱</h2>
        <p>凑十法神器 · 小棒计数器<br>分与合 · 课本加减法口诀表</p>
        <div class="big-bg">10</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#e86b9a,#c2255c)" data-go="balloon">
        <div class="emoji">🎈</div><h2>算式气球大作战</h2>
        <p>算式气球飞上天<br>快算出得数戳破它！</p>
        <div class="big-bg">🎈</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#4d7c0f,#15803d)" data-go="tank">
        <div class="emoji">🛡️</div><h2>坦克口算保卫战</h2>
        <p>敌方算式坦克逼近大本营<br>算出答案发射炮弹轰碎它！</p>
        <div class="big-bg">💥</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#5cc68d,#2b8a3e)" data-go="maze">
        <div class="emoji">🐒</div><h2>小猴算式走迷宫</h2>
        <p>课本第86页同款趣味迷宫<br>按得数规律帮小猴吃到水果！</p>
        <div class="big-bg">🍑</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#9b7be0,#5f3dc4)" data-go="rocket">
        <div class="emoji">🚀</div><h2>火箭点火挑战赛</h2>
        <p>课本第57页火箭发射倒数<br>60秒极速口算冲刺最高分！</p>
        <div class="big-bg">🚀</div>
      </button>
    </div>
    <div class="mini-links">
      <button class="btn purple" data-go="mistakes">📒 错题本 ${mc ? `(${mc})` : ''}</button>
      <button class="btn blue" data-go="stickers">🏆 我的贴纸 (${stickerCount()}/${STICKERS.length})</button>
      <button class="btn gray" data-go="help">👨‍👩‍👦 家长说明</button>
      <a class="btn teal" href="index.html" style="text-decoration:none">🔤 去玩拼音小勇士</a>
    </div>`;

  const modeAnnounce = {
    units: '课本同步闯关',
    lab: '数学魔法教具箱',
    balloon: '算式气球大作战',
    tank: '坦克口算保卫战',
    maze: '小猴算式走迷宫',
    rocket: '火箭点火挑战赛',
    mistakes: '错题本',
    stickers: '我的贴纸',
    help: '家长说明'
  };

  app.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.go;
    const m = {
      units: unitListScreen,
      lab: labScreen,
      balloon: balloonSetupScreen,
      tank: tankSetupScreen,
      maze: mazeScreen,
      rocket: rocketScreen,
      mistakes: mistakesScreen,
      stickers: stickerScreen,
      help: helpScreen
    };
    sfx.ok();
    go(m[key]);
    if (modeAnnounce[key]) speak(modeAnnounce[key]);
  }));
}

// ======================= 课本同步单元与课时列表 =======================
function unitListScreen() {
  setTitle('📚 课本同步闯关');
  let h = `<div class="screen-title"><button class="btn small gray" id="backHome">← 首页</button> 📚 课本同步闯关 <span class="sub">人教版一年级数学上册（2024新版）</span></div>`;
  MATH_UNITS.forEach(u => {
    h += `<div class="unit">
      <div class="unit-header">
        <span class="unit-badge" style="background:${u.color}">${u.badge}</span>
        <span class="unit-title" style="background:${u.color}">${u.unit}</span>
        <span class="unit-desc">${u.desc}</span>
      </div>
      <div class="lesson-grid">`;
    u.lessons.forEach(l => {
      const st = save.stars['lesson:' + l.id] || 0;
      h += `<button class="lesson-card" style="--c:${u.color}" data-id="${l.id}">
        <div>
          <div class="ln">${l.name}</div>
          <div class="lsub">${l.sub}</div>
        </div>
        <div class="lmeta">
          <span>📖 ${l.pages}</span>
          ${starsHtml(st)}
        </div>
      </button>`;
    });
    h += `</div></div>`;
  });
  app.innerHTML = h;
  $('#backHome').onclick = () => { sfx.ok(); go(homeScreen); };
  app.querySelectorAll('.lesson-card').forEach(b => b.addEventListener('click', () => {
    const l = ALL_LESSONS.find(x => x.id === b.dataset.id);
    sfx.ok();
    go(lessonScreen, b.dataset.id);
    if (l) speak(l.name);
  }));
}

function lessonScreen(id) {
  const l = ALL_LESSONS.find(x => x.id === id);
  setTitle('📖 ' + l.name);
  app.innerHTML = `
    <div class="screen-title">
      <button class="btn small gray" id="backUnits">← 返回目录</button>
      <span>${l.unit.unit} · ${l.name}</span>
      <span class="sub">（${l.pages}）</span>
    </div>
    ${renderTeachPanel(l)}
    <div class="card center" style="padding:24px">
      <h3 style="margin:0 0 8px;font-size:22px">🎯 准备好接受聪聪的闯关考验了吗？</h3>
      <p class="sub" style="margin:0 0 18px">本课专项知识点：${l.sub}（共 ${S().roundSize} 题，全对拿 3 颗 ⭐）</p>
      <div class="row center">
        <button class="btn green" id="btnStartQuiz" style="font-size:22px;padding:16px 36px">🚀 开始本课闯关</button>
        <button class="btn orange" id="btnOpenLab">🧮 打开魔法教具箱</button>
      </div>
    </div>`;

  $('#backUnits').onclick = () => { sfx.ok(); go(unitListScreen); };
  $('#btnOpenLab').onclick = () => { sfx.ok(); go(labScreen); speak('数学魔法教具箱'); };
  $('#btnStartQuiz').onclick = () => {
    sfx.ok();
    const questions = buildLessonQuestions(l, S().roundSize);
    go(startRound, {
      title: `闯关 · ${l.name}`,
      questions,
      starKey: 'lesson:' + l.id,
      back: () => go(lessonScreen, id),
      again: () => go(lessonScreen, id)
    });
    speak('开始本课闯关');
  };

  // 绑定讲台互动按钮
  app.querySelectorAll('.teach-num-card').forEach(b => {
    b.addEventListener('click', () => speak(b.dataset.say));
  });
  const bondBtns = app.querySelectorAll('.bond-switch-btn');
  if (bondBtns.length) {
    const renderBondsOf = n => {
      const area = $('#bondDemoArea');
      let out = '';
      for (let i = 1; i < n; i++) {
        out += renderBondTree(n, i, n - i, null);
      }
      area.innerHTML = out;
      speak(`${n}可以分成1和${n - 1}`);
    };
    renderBondsOf(+bondBtns[0].dataset.n);
    bondBtns.forEach(b => b.addEventListener('click', () => {
      bondBtns.forEach(x => { x.classList.remove('blue'); x.classList.add('gray'); });
      b.classList.remove('gray'); b.classList.add('blue');
      renderBondsOf(+b.dataset.n);
    }));
  }
}

function buildLessonQuestions(lesson, count) {
  const out = [];
  const usedKeys = new Set();
  for (let i = 0; i < count; i++) {
    const qt = lesson.qTypes[i % lesson.qTypes.length];
    let q = null;
    for (let tries = 0; tries < 8; tries++) {
      q = generateQuestion(qt);
      if (!q.mistakeKey || !usedKeys.has(q.mistakeKey)) break;
    }
    if (q.mistakeKey) usedKeys.add(q.mistakeKey);
    out.push(q);
  }
  return shuffle(out);
}

// ======================= 核心闯关答题引擎 =======================
let R = null;
let autoSubmitTimer = null;

function startRound(opts) {
  R = { ...opts, idx: 0, firstTry: 0, buf: '', wrong: 0, reveal: false, locked: false };
  setTitle(opts.title);
  app.innerHTML = `
    <div class="play-wrap">
      <div class="play-head">
        <button class="btn small gray" id="quit">✕ 退出</button>
        <div class="progress"><div id="prog"></div></div>
        <div class="pc" id="pc"></div>
      </div>
      <div class="card question" id="qCard"></div>
      <div class="card" style="padding:16px;margin-top:14px">
        <div class="feedback" id="fb"></div>
        <div id="inputArea"></div>
      </div>
    </div>`;
  $('#quit').onclick = () => opts.back();
  keyHandler = roundKey;
  showQuestion();
}

function curQ() { return R.questions[R.idx]; }

function showQuestion() {
  clearTimeout(autoSubmitTimer);
  const q = curQ();
  R.buf = ''; R.wrong = 0; R.reveal = false; R.locked = false;
  $('#prog').style.width = (R.idx / R.questions.length * 100) + '%';
  $('#pc').textContent = `${R.idx + 1} / ${R.questions.length}`;

  $('#qCard').innerHTML = `
    <button class="hint-btn" id="hntBtn" title="聪聪提示">💡</button>
    <button class="speak-btn" id="spkBtn" title="读题">🔊</button>
    <div class="prompt">${q.prompt}</div>
    <div id="visualWrap">${q.visualHtml || ''}</div>
    <div class="big-eq">${q.eqHtml}</div>
    <div id="hintPanel" class="hint-panel hidden">${q.hintHtml || ''}</div>
  `;

  $('#spkBtn').onclick = () => speak(q.speakText);
  $('#hntBtn').onclick = () => {
    $('#hintPanel').classList.remove('hidden');
    speak(q.hintHtml);
  };

  // 点按图标点数互动（帮助刚学数数的小朋友点一个标一个数字）
  let cnt = 0;
  $('#qCard').querySelectorAll('.v-item').forEach(el => {
    el.addEventListener('click', () => {
      if (!el.classList.contains('counted')) {
        cnt++;
        el.classList.add('counted');
        el.dataset.n = cnt;
        sfx.key();
        speak(String(cnt));
      }
    });
  });

  $('#fb').textContent = '';
  $('#fb').className = 'feedback';

  const inputArea = $('#inputArea');
  if (q.inputMode === 'choice') {
    inputArea.innerHTML = `<div class="choice-grid">
      ${q.choices.map((c, i) => `<button class="choice-btn" data-val="${c.val}">
        <span>${c.label}</span>
        ${c.sub ? `<small>${c.sub}</small>` : ''}
      </button>`).join('')}
    </div>`;
    inputArea.querySelectorAll('.choice-btn').forEach(b => {
      b.addEventListener('click', () => submitAnswer(b.dataset.val));
    });
  } else {
    inputArea.innerHTML = S().showNumpad ? numpadHtml(q.maxNum || 20) : `<div class="sub center">⌨️ 请按键盘上的数字键输入答案，按回车确定</div>`;
    bindNumpad(
      inputArea,
      num => { R.buf = String(num); updateAnsBox(); submitAnswer(num); },
      k => roundKey(k)
    );
  }

  setTimeout(() => speak(q.speakText), 220);
}

function updateAnsBox() {
  const box = $('#ansBox');
  if (!box) return;
  box.className = 'eq-box';
  box.textContent = R.buf !== '' ? R.buf : '?';
}

function roundKey(k) {
  if (!R || R.locked) return;
  const q = curQ();
  if (q.inputMode === 'choice') {
    if (k === '>' || k === '<' || k === '=') {
      submitAnswer(k);
    } else if (/^[1-4]$/.test(k) && q.choices[+k - 1]) {
      submitAnswer(q.choices[+k - 1].val);
    }
    return;
  }

  clearTimeout(autoSubmitTimer);
  if (/^[0-9]$/.test(k)) {
    if (R.buf.length >= 2) R.buf = '';
    R.buf += k;
    sfx.key();
    updateAnsBox();
    const num = +R.buf;
    const ansNum = +q.ans;
    // 智能免回车判题：
    // 如果输入的数字已经等于正确答案，立刻通过！
    // 如果正确答案是两位数（如 13），而小朋友刚按了第一位 '1'，等待他按第二位 '3'；
    // 如果已经按满2位或者不可能再拼出20以内的数（如第一位按了 >=3），自动判题！
    if (num === ansNum) {
      autoSubmitTimer = setTimeout(() => submitAnswer(num), 160);
    } else if (R.buf.length === 1 && (k === '1' || k === '2') && ansNum >= 10) {
      autoSubmitTimer = setTimeout(() => submitAnswer(+R.buf), 1100);
    } else {
      autoSubmitTimer = setTimeout(() => submitAnswer(num), 260);
    }
    return;
  }
  if (k === 'Backspace') {
    R.buf = R.buf.slice(0, -1);
    updateAnsBox();
    return;
  }
  if ((k === 'Enter' || k === ' ') && R.buf !== '') {
    submitAnswer(+R.buf);
  }
}

function submitAnswer(val) {
  if (!R || R.locked) return;
  clearTimeout(autoSubmitTimer);
  const q = curQ();
  const box = $('#ansBox');
  const fb = $('#fb');
  const isCorrect = String(val) === String(q.ans);

  if (isCorrect) {
    R.locked = true;
    if (R.wrong === 0) {
      R.firstTry++;
      if (R.isReview && q.mistakeKey) reduceMistake(q.mistakeKey);
    }
    if (box) { box.className = 'eq-box ok'; box.textContent = q.ans; }
    fb.className = 'feedback ok';
    fb.textContent = '🎉 ' + praise();
    sfx.ok();
    speak(praise());
    setTimeout(() => {
      R.idx++;
      R.idx >= R.questions.length ? finishRound() : showQuestion();
    }, 1250);
  } else {
    R.wrong++;
    sfx.bad();
    if (box) {
      box.className = 'eq-box';
      void box.offsetWidth;
      box.className = 'eq-box bad';
      box.textContent = val;
    }
    fb.className = 'feedback bad';
    fb.textContent = R.wrong >= 2 ? '💡 没关系，看看聪聪的提示，再试一次吧！' : '🤔 差一点点哦，再想一想！';
    R.buf = '';
    if (R.wrong >= 2 || S().autoHint) {
      const hp = $('#hintPanel');
      if (hp) hp.classList.remove('hidden');
    }
    if (R.wrong === 2) {
      addMistake(q);
      // 高亮屏幕键盘上的正确答案按钮
      const rightBtn = document.querySelector(`.nkey[data-num="${q.ans}"]`);
      if (rightBtn) rightBtn.classList.add('next');
    }
  }
}

function finishRound() {
  const n = R.questions.length;
  const ratio = R.firstTry / n;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : 1;
  const curOpts = R;
  showResult({
    stars,
    starKey: curOpts.starKey,
    line: `本轮共 ${n} 题，一次答对 <b>${curOpts.firstTry}</b> 题！`,
    again: () => go(startRound, { ...curOpts, questions: shuffle(curOpts.questions) }),
    back: curOpts.back
  });
}

function showResult({ stars, starKey, line, again, back, bonus = 0 }) {
  keyHandler = null;
  const before = stickerCount();
  if (starKey) {
    if ((save.stars[starKey] || 0) < stars) save.stars[starKey] = stars;
  }
  if (bonus) save.bonus = (save.bonus || 0) + bonus;
  persist();
  const after = stickerCount();
  const title = stars === 3 ? '🏆 完美通关！' : stars === 2 ? '👏 表现真棒！' : '💪 继续加油！';
  app.innerHTML = `<div class="card result">
    <div class="big-stars">${[1, 2, 3].map(i => `<span>${i <= stars ? '⭐' : '☆'}</span>`).join('')}</div>
    <h2>${title}</h2>
    <p class="sub" style="font-size:20px">${line}</p>
    ${after > before ? `<p style="font-size:22px;font-weight:900;color:#ff6b35">🎁 恭喜解锁新贴纸！</p><div class="sticker-new">${STICKERS[after - 1]}</div>` : ''}
    <div class="row center" style="margin-top:22px">
      <button class="btn green" id="btnAgain">🔁 再玩一次</button>
      <button class="btn blue" id="btnBack">← 返回</button>
    </div>
  </div>`;
  $('#btnAgain').onclick = again;
  $('#btnBack').onclick = back;
  sfx.win();
  confetti(stars * 15);
  speak(title);
  keyHandler = k => { if (k === 'Enter') again(); };
}

// ======================= 🧮 数学魔法教具箱（4大互动实验室） =======================
function labScreen(activeTab = 'make10') {
  setTitle('🧮 数学魔法教具箱');
  app.innerHTML = `
    <div class="screen-title">
      <button class="btn small gray" id="backHome">← 首页</button>
      <span>🧮 数学魔法教具箱</span>
      <span class="sub">动手拨一拨、拆一拆，一眼看懂加减法算理！</span>
    </div>
    <div class="row" style="margin-bottom:16px">
      <button class="btn small ${activeTab === 'make10' ? 'orange' : 'gray'}" data-tab="make10">🔟 凑十法拆数神器</button>
      <button class="btn small ${activeTab === 'abacus' ? 'purple' : 'gray'}" data-tab="abacus">🪵 小棒与计数器 (0~20)</button>
      <button class="btn small ${activeTab === 'bonds' ? 'green' : 'gray'}" data-tab="bonds">👐 分与合 & 凑十好朋友</button>
      <button class="btn small ${activeTab === 'tables' ? 'blue' : 'gray'}" data-tab="tables">📊 课本加减法口诀表</button>
    </div>
    <div id="labBody"></div>`;

  $('#backHome').onclick = () => go(homeScreen);
  app.querySelectorAll('[data-tab]').forEach(b => {
    b.addEventListener('click', () => go(labScreen, b.dataset.tab));
  });

  const body = $('#labBody');
  if (activeTab === 'make10') renderMake10Lab(body);
  else if (activeTab === 'abacus') renderAbacusLab(body);
  else if (activeTab === 'bonds') renderBondsLab(body);
  else renderTablesLab(body);
}

// 实验室 1：凑十法拆数神器
function renderMake10Lab(root) {
  let a = 9, b = 4, merged = false;
  function draw() {
    const need = 10 - a, rem = b - need, sum = a + b;
    root.innerHTML = `<div class="card center">
      <div class="congcong-tip" style="text-align:left">
        <span class="bot">🤖</span>
        <span><b>凑十法演示器（课本第五单元）：</b>选一选两个加数，点<b>「✨ 动手凑成 10」</b>，看看右边盒子里的小圆点是怎么飞到左边盒子里凑成 10 的！</span>
      </div>
      <div class="row center" style="margin-bottom:12px">
        <span style="font-weight:900;font-size:18px">第一个数：</span>
        ${[9, 8, 7, 6].map(n => `<button class="btn small ${a === n ? 'blue' : 'gray'} sel-a" data-n="${n}">${n}</button>`).join('')}
        <span style="font-weight:900;font-size:18px;margin-left:12px">加第二个数：</span>
        ${[2, 3, 4, 5, 6, 7, 8, 9].filter(n => a + n > 10).map(n => `<button class="btn small ${b === n ? 'pink' : 'gray'} sel-b" data-n="${n}">+${n}</button>`).join('')}
      </div>
      ${renderMake10Diagram(a, b, false)}
      ${renderTenFrames(a, b, merged ? 'make10_after' : 'make10_before')}
      <div class="row center" style="margin-top:14px">
        <button class="btn green" id="btnToggleMerge">${merged ? '🔄 还原分开状态' : `✨ 动手移过去 ${need} 个凑成 10！`}</button>
        <button class="btn orange" id="btnSpeakM10">🔊 听聪聪讲算理</button>
      </div>
    </div>`;

    root.querySelectorAll('.sel-a').forEach(btn => btn.addEventListener('click', () => {
      a = +btn.dataset.n;
      if (a + b <= 10) b = 11 - a;
      merged = false; sfx.key(); draw();
    }));
    root.querySelectorAll('.sel-b').forEach(btn => btn.addEventListener('click', () => {
      b = +btn.dataset.n; merged = false; sfx.key(); draw();
    }));
    root.querySelector('#btnToggleMerge').onclick = () => {
      merged = !merged;
      sfx.ok();
      draw();
      if (merged) speak(`把${b}分成${need}和${rem}，${a}加${need}凑成10，10加${rem}等于${sum}！`);
    };
    root.querySelector('#btnSpeakM10').onclick = () => {
      speak(`计算${a}加${b}，看大数${a}，分小数${b}，把${b}分成${need}和${rem}，先算${a}加${need}等于10，再算10加${rem}等于${sum}！`);
    };
  }
  draw();
}

// 实验室 2：小棒与十位/个位计数器 (0~20)
function renderAbacusLab(root) {
  let num = 13;
  function draw() {
    const tens = Math.floor(num / 10), ones = num % 10;
    const desc = num === 20
      ? '2 个十是 20（十位拨 2 颗珠子，个位是 0）'
      : num >= 10
        ? `1 个十和 ${ones} 个一合起来是 ${num}`
        : `${ones} 个一是 ${num}`;
    root.innerHTML = `<div class="card center">
      <div class="congcong-tip" style="text-align:left">
        <span class="bot">🤖</span>
        <span><b>小棒与计数器实验室（课本第四单元）：</b>满 10 根单根小棒就会捆成 <b>1 捆（1个十）</b>！试试加减 1 或加减 10，观察<b>十位</b>和<b>个位</b>的变化吧！</span>
      </div>
      <div style="font-size:48px;font-weight:900;color:#d9480f;font-family:var(--num-font)">${num}</div>
      <div style="font-size:20px;font-weight:800;color:#4a4366;margin-bottom:8px">${desc}</div>
      ${renderPlaceValue(num)}
      <div class="row center" style="margin-top:16px">
        <button class="btn blue" id="m10" ${num < 10 ? 'disabled' : ''}>-10 (拿走1捆)</button>
        <button class="btn orange" id="m1" ${num <= 0 ? 'disabled' : ''}>-1 (拿走1根)</button>
        <button class="btn green" id="p1" ${num >= 20 ? 'disabled' : ''}>+1 (添上1根)</button>
        <button class="btn pink" id="p10" ${num > 10 ? 'disabled' : ''}>+10 (添上1捆)</button>
      </div>
      <div class="np-row" style="margin-top:16px">
        ${Array.from({ length: 21 }, (_, i) => `<button class="nkey ${i === num ? 'next' : ''}" data-n="${i}" style="min-width:44px;height:44px;font-size:20px">${i}</button>`).join('')}
      </div>
    </div>`;

    const changeTo = n => {
      num = Math.max(0, Math.min(20, n));
      sfx.key();
      draw();
      speak(`${num}，${num >= 10 ? `${Math.floor(num / 10)}个十${num % 10 ? `和${num % 10}个一` : ''}` : `${num}个一`}`);
    };
    root.querySelector('#m10').onclick = () => changeTo(num - 10);
    root.querySelector('#m1').onclick = () => changeTo(num - 1);
    root.querySelector('#p1').onclick = () => changeTo(num + 1);
    root.querySelector('#p10').onclick = () => changeTo(num + 10);
    root.querySelectorAll('.nkey[data-n]').forEach(b => b.addEventListener('click', () => changeTo(+b.dataset.n)));
  }
  draw();
}

// 实验室 3：分与合 & 凑十好朋友配对游戏（课本 p.56 找朋友 & p.61 凑十出牌）
function renderBondsLab(root) {
  let cards = [];
  let selectedIdx = null;
  let matchedCount = 0;

  function initGame() {
    const pairs = [[1, 9], [2, 8], [3, 7], [4, 6], [5, 5], [0, 10]];
    cards = shuffle(pairs.flatMap(([a, b], pid) => [
      { val: a, pid, matched: false },
      { val: b, pid, matched: false }
    ]));
    selectedIdx = null;
    matchedCount = 0;
    draw();
  }

  function draw() {
    root.innerHTML = `<div class="card center">
      <div class="congcong-tip" style="text-align:left">
        <span class="bot">🤖</span>
        <span><b>凑十找朋友游戏（课本第56页）：</b>点选两张合起来等于 <b>10</b> 的数字卡片，帮它们手拉手成为好朋友吧！（一九一九好朋友，二八二八手拉手，三七三七真亲密，四六四六一起走，五五凑成一双手！）</span>
      </div>
      <div class="row center" style="gap:14px;max-width:640px;margin:18px auto">
        ${cards.map((c, idx) => `<button class="choice-btn" data-idx="${idx}" ${c.matched ? 'disabled' : ''} style="min-width:92px;min-height:105px;font-size:38px;background:${c.matched ? '#d3f9d8;color:#2b8a3e;opacity:.55' : selectedIdx === idx ? '#ff922b' : '#4fb3e8'}">
          <span>${c.val}</span>
          <small>${c.matched ? '✓ 凑成10' : '点我配对'}</small>
        </button>`).join('')}
      </div>
      ${matchedCount === 6 ? `<div style="font-size:24px;font-weight:900;color:#2b8a3e;margin:12px 0">🎉 太棒啦！所有凑十好朋友都找到啦！</div>` : ''}
      <button class="btn green" id="btnResetMatch">🔄 重新洗牌再玩一次</button>
    </div>`;

    root.querySelector('#btnResetMatch').onclick = initGame;
    root.querySelectorAll('.choice-btn[data-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.idx;
        if (cards[idx].matched || selectedIdx === idx) return;
        sfx.key();
        if (selectedIdx === null) {
          selectedIdx = idx;
          speak(String(cards[idx].val));
          draw();
        } else {
          const first = cards[selectedIdx];
          const second = cards[idx];
          if (first.val + second.val === 10) {
            first.matched = true;
            second.matched = true;
            matchedCount++;
            selectedIdx = null;
            sfx.ok();
            speak(`${first.val}和${second.val}凑成10！`);
            if (matchedCount === 6) confetti(25);
            draw();
          } else {
            sfx.bad();
            toast(`🤔 ${first.val} + ${second.val} = ${first.val + second.val}，不等于 10 哦，再找找！`, 1800);
            selectedIdx = null;
            draw();
          }
        }
      });
    });
  }
  initGame();
}

// 实验室 4：课本加减法口诀表（p.32 5以内、p.64 10以内、p.100 20以内进位加法表）
function renderTablesLab(root) {
  let tableType = 'carry20'; // 'add5' | 'add10' | 'sub10' | 'carry20'
  let hideAns = false;

  function draw() {
    let rowsHtml = '';
    if (tableType === 'carry20') {
      // 课本第100页：20以内进位加法表（第一列 9+1~9+9，第二列 8+2~8+9 ...）
      for (let r = 1; r <= 9; r++) {
        rowsHtml += `<div class="formula-row">`;
        for (let first = 9; first >= 10 - r; first--) {
          const second = r - (9 - first);
          if (first + second > 10 && second <= 9) {
            rowsHtml += `<div class="formula-cell ${hideAns ? 'hide-ans' : ''} ${first + second === 11 ? 'hl' : ''}" data-say="${first}加${second}等于${first + second}">
              ${first}+${second}=<span class="ans-part">${first + second}</span>
            </div>`;
          }
        }
        rowsHtml += `</div>`;
      }
    } else if (tableType === 'add10' || tableType === 'add5') {
      const max = tableType === 'add5' ? 5 : 10;
      for (let sum = 0; sum <= max; sum++) {
        rowsHtml += `<div class="formula-row">`;
        for (let b = 0; b <= sum; b++) {
          const a = sum - b;
          rowsHtml += `<div class="formula-cell ${hideAns ? 'hide-ans' : ''} ${sum === max ? 'hl' : ''}" data-say="${a}加${b}等于${sum}">
            ${a}+${b}=<span class="ans-part">${sum}</span>
          </div>`;
        }
        rowsHtml += `</div>`;
      }
    } else {
      // 10以内减法表
      for (let a = 0; a <= 10; a++) {
        rowsHtml += `<div class="formula-row">`;
        for (let b = 0; b <= a; b++) {
          rowsHtml += `<div class="formula-cell ${hideAns ? 'hide-ans' : ''}" data-say="${a}减${b}等于${a - b}">
            ${a}-${b}=<span class="ans-part">${a - b}</span>
          </div>`;
        }
        rowsHtml += `</div>`;
      }
    }

    root.innerHTML = `<div class="card">
      <div class="congcong-tip">
        <span class="bot">🤖</span>
        <span><b>课本算式整理表（课本第32、64、100页）：</b>点任意一个算式可以听读音！开启<b>「🙈 遮住得数自测」</b>，先心里算出得数，再点格子揭晓答案吧！</span>
      </div>
      <div class="row" style="justify-content:space-between;margin-bottom:14px">
        <div class="row">
          <button class="btn small ${tableType === 'carry20' ? 'pink' : 'gray'} t-btn" data-t="carry20">🔥 20以内进位加法表(p.100)</button>
          <button class="btn small ${tableType === 'add10' ? 'blue' : 'gray'} t-btn" data-t="add10">➕ 10以内加法表(p.64)</button>
          <button class="btn small ${tableType === 'sub10' ? 'green' : 'gray'} t-btn" data-t="sub10">➖ 10以内减法表(p.64)</button>
          <button class="btn small ${tableType === 'add5' ? 'orange' : 'gray'} t-btn" data-t="add5">🌱 5以内加法表(p.32)</button>
        </div>
        <button class="btn small ${hideAns ? 'purple' : 'teal'}" id="btnToggleAns">${hideAns ? '👀 显示全部得数' : '🙈 遮住得数自测'}</button>
      </div>
      <div class="formula-table-wrap">
        <div class="formula-grid">${rowsHtml}</div>
      </div>
    </div>`;

    root.querySelectorAll('.t-btn').forEach(b => b.addEventListener('click', () => { tableType = b.dataset.t; draw(); }));
    root.querySelector('#btnToggleAns').onclick = () => { hideAns = !hideAns; draw(); };
    root.querySelectorAll('.formula-cell').forEach(c => c.addEventListener('click', () => {
      c.classList.add('revealed');
      speak(c.dataset.say);
    }));
  }
  draw();
}

// ======================= 街机游乐场通用题池与速度预设 =======================
const SPEED_PRESETS = {
  very_slow: { label: '🐌 超慢（初学口算·约 32 秒）', balloon: { speed: 12, max: 22, accel: 0.22, interval: 6200, minInterval: 4400, maxCount: 2 }, tank: { speed: 10, max: 18, accel: 0.2, interval: 6200, minInterval: 4400, maxCount: 2 } },
  slow:      { label: '🐢 慢速（一年级推荐·约 22 秒）', balloon: { speed: 17, max: 34, accel: 0.4,  interval: 4800, minInterval: 3300, maxCount: 3 }, tank: { speed: 14, max: 27, accel: 0.35, interval: 4800, minInterval: 3300, maxCount: 3 } },
  medium:    { label: '🐇 中速（熟练巩固·约 15 秒）', balloon: { speed: 25, max: 52, accel: 0.75, interval: 3600, minInterval: 2300, maxCount: 4 }, tank: { speed: 21, max: 42, accel: 0.6,  interval: 3600, minInterval: 2300, maxCount: 4 } },
  fast:      { label: '🚀 快速（口算高手·约 10 秒）', balloon: { speed: 36, max: 80, accel: 1.3,  interval: 2800, minInterval: 1600, maxCount: 5 }, tank: { speed: 30, max: 64, accel: 1.0,  interval: 2800, minInterval: 1600, maxCount: 4 } },
};

function speedSelectHtml(id) {
  const cur = S().gameSpeed || 'slow';
  return `<select id="${id}">` + Object.entries(SPEED_PRESETS).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${v.label}</option>`).join('') + `</select>`;
}
function speedSwitchBarHtml() {
  const cur = S().gameSpeed || 'slow';
  const items = [['very_slow', '🐌 超慢'], ['slow', '🐢 慢'], ['medium', '🐇 中'], ['fast', '🚀 快']];
  return `<span class="speed-bar" title="随时切换移动速度">` + items.map(([k, txt]) => `<button class="spd-btn ${k === cur ? 'active' : ''}" data-spd="${k}">${txt}</button>`).join('') + `</span>`;
}

// 生成街机口算题（返回 { eq: '9 + 4', ans: 13, speak: '9加4', mistakeKey: 'carry:9+4' }）
function generateArcadeItem(poolIds, excludeAnswers = []) {
  for (let tries = 0; tries < 25; tries++) {
    const pid = pick(poolIds);
    let eq = '', ans = 0, mKey = '';
    if (pid === 'add_sub_5') {
      if (Math.random() < 0.55) {
        const a = randInt(0, 5), b = randInt(0, 5 - a);
        eq = `${a} + ${b}`; ans = a + b; mKey = `add:${a}+${b}`;
      } else {
        const a = randInt(1, 5), b = randInt(0, a);
        eq = `${a} - ${b}`; ans = a - b; mKey = `sub:${a}-${b}`;
      }
    } else if (pid === 'add_sub_10') {
      if (Math.random() < 0.52) {
        const sum = randInt(6, 10), a = randInt(1, sum - 1), b = sum - a;
        eq = `${a} + ${b}`; ans = sum; mKey = `add:${a}+${b}`;
      } else {
        const a = randInt(6, 10), b = randInt(1, a - 1);
        eq = `${a} - ${b}`; ans = a - b; mKey = `sub:${a}-${b}`;
      }
    } else if (pid === 'make_10') {
      const a = randInt(1, 9), b = 10 - a;
      eq = `${a} + ? = 10`; ans = b; mKey = `miss:${a}+?=10`;
    } else if (pid === 'teen_simple') {
      if (Math.random() < 0.55) {
        const a = randInt(10, 16), b = randInt(1, 19 - a);
        eq = `${a} + ${b}`; ans = a + b; mKey = `teen:${a}+${b}`;
      } else {
        const a = randInt(11, 19), b = Math.random() < 0.5 ? 10 : (a % 10 || 1);
        eq = `${a} - ${b}`; ans = a - b; mKey = `teen:${a}-${b}`;
      }
    } else if (pid === 'carry_20') {
      const a = randInt(6, 9), b = randInt(11 - a, 9);
      const swap = Math.random() < 0.3;
      const x = swap ? b : a, y = swap ? a : b;
      eq = `${x} + ${y}`; ans = x + y; mKey = `carry:${x}+${y}`;
    } else {
      // chain_10
      const a = randInt(2, 6), b = randInt(1, 4);
      if (a + b <= 9 && Math.random() < 0.5) {
        const c = randInt(1, 10 - a - b);
        eq = `${a}+${b}+${c}`; ans = a + b + c; mKey = `chain:${eq}`;
      } else {
        const c = randInt(1, a + b - 1);
        eq = `${a}+${b}-${c}`; ans = a + b - c; mKey = `chain:${eq}`;
      }
    }
    if (!excludeAnswers.includes(ans)) {
      return { eq, ans, speak: `${eq}等于${ans}`, mistakeKey: mKey, eqDisplay: `${eq} = ${ans}` };
    }
  }
  return { eq: '3 + 2', ans: 5, speak: '3加2等于5', mistakeKey: 'add:3+2', eqDisplay: '3 + 2 = 5' };
}

// ======================= 1. 🎈 算式气球大作战 =======================
const BALLOON_COLORS = ['#ff6b6b', '#ffa94d', '#fcc419', '#51cf66', '#339af0', '#845ef7', '#f06595', '#20c997'];

function balloonSetupScreen() {
  setTitle('🎈 算式气球大作战');
  app.innerHTML = `
    <div class="screen-title"><button class="btn small gray" id="backHome">← 首页</button> 🎈 算式气球大作战</div>
    <div class="card">
      <p style="font-size:18px;margin-top:0;font-weight:800">📚 选一选要练习的口算范围（可多选）：</p>
      <div class="row" id="poolChecks">
        ${ARCADE_POOLS.map(p => `<label class="chip"><input type="checkbox" value="${p.id}" ${p.defaultChecked ? 'checked' : ''}> ${p.label}</label>`).join('')}
      </div>
      <div class="setting-row" style="margin-top:12px"><span>🐢 气球上升速度</span>${speedSelectHtml('bSpeed')}</div>
      <p class="sub">🏅 最高纪录：<b>${save.balloonBest}</b> 个气球</p>
      <div class="row center"><button class="btn pink" id="startBalloon">🚀 开始戳气球</button></div>
    </div>`;
  $('#backHome').onclick = () => go(homeScreen);
  $('#bSpeed').onchange = () => { S().gameSpeed = $('#bSpeed').value; persist(); };
  $('#startBalloon').onclick = () => {
    S().gameSpeed = $('#bSpeed').value; persist();
    const poolIds = [...app.querySelectorAll('#poolChecks input:checked')].map(x => x.value);
    if (!poolIds.length) { toast('请至少勾选一个口算范围哦！'); return; }
    go(balloonGame, { poolIds, back: () => go(balloonSetupScreen) });
  };
}

function balloonGame(opts) {
  setTitle('🎈 算式气球大作战');
  const maxNum = opts.poolIds.some(p => p === 'carry_20' || p === 'teen_simple') ? 20 : 10;
  app.innerHTML = `
    <div class="hud">
      <button class="btn small gray" id="quit">✕</button>
      <span id="hearts"></span>
      <div class="typed" id="typed"></div>
      ${speedSwitchBarHtml()}
      <span>🏅 <span id="score">0</span></span>
    </div>
    <div class="balloon-stage" id="stage">
      <div class="overlay" id="ov"><div class="card center" style="max-width:460px">
        <div style="font-size:60px">🎈</div>
        <h2 style="margin:6px 0">算式气球要飞走啦！</h2>
        <p style="font-size:18px">算出气球上算式的<b>得数</b>（按键盘数字或点下方数字按钮），就能把气球戳破！漏掉 5 个就结束哦。</p>
        <button class="btn pink" id="goBtn">开始！（回车）</button>
      </div></div>
    </div>
    ${S().showNumpad ? numpadHtml(maxNum) : ''}`;

  $('#quit').onclick = () => opts.back();
  const stage = $('#stage');
  let preset = (SPEED_PRESETS[S().gameSpeed] || SPEED_PRESETS.slow).balloon;
  const G = { balloons: [], buf: '', score: 0, hearts: 5, running: false, last: 0, spawnT: 0, speed: preset.speed, interval: preset.interval, raf: 0, missed: [] };

  app.querySelectorAll('.spd-btn').forEach(btn => btn.addEventListener('click', () => {
    S().gameSpeed = btn.dataset.spd; persist();
    app.querySelectorAll('.spd-btn').forEach(b => b.classList.toggle('active', b === btn));
    const oldBase = preset.speed;
    preset = (SPEED_PRESETS[S().gameSpeed] || SPEED_PRESETS.slow).balloon;
    G.speed = Math.min(preset.max, preset.speed + G.score * preset.accel);
    G.interval = Math.max(preset.minInterval, preset.interval - G.score * 35);
    const ratio = preset.speed / (oldBase || 1);
    G.balloons.forEach(b => { b.speed *= ratio; });
  }));

  function drawHUD() {
    $('#hearts').textContent = '❤️'.repeat(G.hearts) + '🤍'.repeat(5 - G.hearts);
    $('#score').textContent = G.score;
    $('#typed').innerHTML = G.buf !== '' ? G.buf : '<span class="sub" style="font-size:15px">输入得数戳破气球</span>';
  }

  function spawn() {
    const W = stage.clientWidth;
    const usedAns = G.balloons.map(b => b.it.ans);
    const it = generateArcadeItem(opts.poolIds, usedAns);
    const el = document.createElement('div');
    el.className = 'balloon';
    const color = pick(BALLOON_COLORS);
    el.innerHTML = `<div class="body" style="background:${color};border-color:${color}">
      <div class="eq-txt">${it.eq}</div>
      <div class="eq-sub">= ?</div>
    </div><div class="string"></div>`;
    let x, tries = 0;
    do { x = 12 + Math.random() * Math.max(40, W - 140); tries++; }
    while (tries < 12 && G.balloons.some(b => Math.abs(b.x - x) < 120 && b.y < 180));
    const b = { el, it, x, y: -140, speed: G.speed * (0.88 + Math.random() * 0.24) };
    el.style.left = x + 'px';
    el.style.bottom = '0';
    el.style.transform = `translateY(${-b.y}px)`;
    el.onclick = () => speak(it.eq);
    stage.appendChild(el);
    G.balloons.push(b);
  }

  function popBalloon(b) {
    G.balloons = G.balloons.filter(x => x !== b);
    b.el.querySelector('.eq-sub').textContent = '= ' + b.it.ans;
    b.el.classList.add('pop');
    setTimeout(() => b.el.remove(), 280);
    G.score++;
    sfx.pop();
    speak(b.it.speak);
    G.speed = Math.min(preset.max, preset.speed + G.score * preset.accel);
    G.interval = Math.max(preset.minInterval, preset.interval - G.score * 35);
    G.buf = '';
    drawHUD();
  }

  function frame(t) {
    if (!G.running) return;
    const dt = Math.min(0.05, (t - (G.last || t)) / 1000);
    G.last = t;
    G.spawnT -= dt * 1000;
    if (G.spawnT <= 0 && G.balloons.length < preset.maxCount) {
      spawn();
      G.spawnT = G.interval;
    }
    const H = stage.clientHeight;
    for (const b of G.balloons.slice()) {
      b.y += b.speed * dt;
      b.el.style.transform = `translateY(${-b.y}px)`;
      if (b.y > H + 30) {
        G.balloons = G.balloons.filter(x => x !== b);
        b.el.remove();
        G.hearts--;
        G.missed.push(b.it);
        addMistake(b.it);
        sfx.bad();
        toast(`🎈 飞走啦：${b.it.eq} = <b>${b.it.ans}</b>`, 1800);
        drawHUD();
        if (G.hearts <= 0) { gameOver(); return; }
      }
    }
    G.raf = requestAnimationFrame(frame);
  }

  function tryMatchNumber(num) {
    const hit = G.balloons.find(b => b.it.ans === num);
    if (hit) {
      popBalloon(hit);
      return true;
    }
    return false;
  }

  function onKey(k) {
    if (!G.running) { if (k === 'Enter' || k === ' ') begin(); return; }
    if (k === 'Backspace') { G.buf = G.buf.slice(0, -1); drawHUD(); return; }
    if (k === 'Enter' || k === ' ') {
      if (G.buf !== '') {
        if (!tryMatchNumber(+G.buf)) { sfx.bad(); G.buf = ''; drawHUD(); }
      }
      return;
    }
    if (/^[0-9]$/.test(k)) {
      if (G.buf.length >= 2) G.buf = '';
      const nb = G.buf + k;
      const num = +nb;
      sfx.key();
      // 如果当前有气球正好等于 num，且没有另一个气球是以 nb 开头的两位数（或已经输入2位），立即戳破！
      const exact = G.balloons.find(b => b.it.ans === num);
      const prefixOther = G.balloons.some(b => b.it.ans !== num && String(b.it.ans).startsWith(nb));
      if (exact && !prefixOther) {
        popBalloon(exact);
        return;
      }
      if (G.balloons.some(b => String(b.it.ans).startsWith(nb))) {
        G.buf = nb;
        drawHUD();
        if (exact) setTimeout(() => { if (G.buf === nb && G.balloons.includes(exact)) popBalloon(exact); }, 450);
      } else {
        sfx.bad();
        G.buf = '';
        drawHUD();
      }
    }
  }

  bindNumpad(
    app,
    num => {
      if (!G.running) return;
      if (!tryMatchNumber(num)) { sfx.bad(); G.buf = ''; drawHUD(); }
    },
    k => onKey(k)
  );

  function begin() {
    $('#ov').classList.add('hidden');
    G.running = true; G.last = 0; G.spawnT = 200;
    G.raf = requestAnimationFrame(frame);
  }

  function gameOver() {
    G.running = false;
    cancelAnimationFrame(G.raf);
    if (G.score > (save.balloonBest || 0)) save.balloonBest = G.score;
    const stars = G.score >= 22 ? 3 : G.score >= 12 ? 2 : G.score >= 5 ? 1 : 0;
    const missed = [...new Map(G.missed.map(m => [m.eq, m])).values()];
    setTimeout(() => {
      showResult({
        stars, bonus: stars,
        line: `一共戳破了 <b>${G.score}</b> 个算式气球！最高纪录：${save.balloonBest}<br>${missed.length ? '要多练练：' + missed.map(m => `${m.eq}=${m.ans}`).join('　') : ''}`,
        again: () => go(balloonGame, opts),
        back: opts.back
      });
    }, 500);
  }

  keyHandler = onKey;
  $('#goBtn').onclick = begin;
  cleanup = () => { G.running = false; cancelAnimationFrame(G.raf); };
  drawHUD();
}

// ======================= 2. 🛡️ 坦克口算保卫战 =======================
function tankSetupScreen() {
  setTitle('🛡️ 坦克口算保卫战');
  app.innerHTML = `
    <div class="screen-title"><button class="btn small gray" id="backHome">← 首页</button> 🛡️ 坦克口算保卫战</div>
    <div class="card">
      <p style="font-size:18px;margin-top:0;font-weight:800">📚 选一选敌方坦克的算式范围（可多选）：</p>
      <div class="row" id="poolChecks">
        ${ARCADE_POOLS.map(p => `<label class="chip"><input type="checkbox" value="${p.id}" ${p.defaultChecked ? 'checked' : ''}> ${p.label}</label>`).join('')}
      </div>
      <div class="setting-row" style="margin-top:12px"><span>🐢 坦克推进速度</span>${speedSelectHtml('tSpeed')}</div>
      <p class="sub">🏅 最高纪录：击毁 <b>${save.tankBest}</b> 辆敌方坦克</p>
      <div class="row center"><button class="btn green" id="startTank">🛡️ 出发保卫大本营</button></div>
    </div>`;
  $('#backHome').onclick = () => go(homeScreen);
  $('#tSpeed').onchange = () => { S().gameSpeed = $('#tSpeed').value; persist(); };
  $('#startTank').onclick = () => {
    S().gameSpeed = $('#tSpeed').value; persist();
    const poolIds = [...app.querySelectorAll('#poolChecks input:checked')].map(x => x.value);
    if (!poolIds.length) { toast('请至少勾选一个口算范围哦！'); return; }
    go(tankGame, { poolIds, back: () => go(tankSetupScreen) });
  };
}

function tankGame(opts) {
  setTitle('🛡️ 坦克口算保卫战');
  const maxNum = opts.poolIds.some(p => p === 'carry_20' || p === 'teen_simple') ? 20 : 10;
  app.innerHTML = `
    <div class="hud">
      <button class="btn small gray" id="quit">✕</button>
      <span id="hearts"></span>
      <div class="typed" id="typed"></div>
      ${speedSwitchBarHtml()}
      <span>🏅 <span id="score">0</span></span>
    </div>
    <div class="tank-stage" id="stage">
      <div class="tank-danger-line"></div>
      <div class="player-base">
        <div class="player-turret" id="turret"><div class="barrel"></div></div>
        <div class="base-wall">🏰 数学大本营</div>
      </div>
      <div class="overlay" id="ov"><div class="card center" style="max-width:460px">
        <div style="font-size:60px">🛡️</div>
        <h2 style="margin:6px 0">敌方坦克逼近大本营！</h2>
        <p style="font-size:18px">快算出坦克上的算式得数，发射炮弹 💥 轰碎它！</p>
        <button class="btn green" id="goBtn">开始战斗！（回车）</button>
      </div></div>
    </div>
    ${S().showNumpad ? numpadHtml(maxNum) : ''}`;

  $('#quit').onclick = () => opts.back();
  const stage = $('#stage'), turretEl = $('#turret');
  let preset = (SPEED_PRESETS[S().gameSpeed] || SPEED_PRESETS.slow).tank;
  const G = { tanks: [], buf: '', score: 0, hearts: 5, running: false, last: 0, spawnT: 0, speed: preset.speed, interval: preset.interval, raf: 0, missed: [] };

  app.querySelectorAll('.spd-btn').forEach(btn => btn.addEventListener('click', () => {
    S().gameSpeed = btn.dataset.spd; persist();
    app.querySelectorAll('.spd-btn').forEach(b => b.classList.toggle('active', b === btn));
    const oldBase = preset.speed;
    preset = (SPEED_PRESETS[S().gameSpeed] || SPEED_PRESETS.slow).tank;
    G.speed = Math.min(preset.max, preset.speed + G.score * preset.accel);
    G.interval = Math.max(preset.minInterval, preset.interval - G.score * 35);
    const ratio = preset.speed / (oldBase || 1);
    G.tanks.forEach(t => { t.speed *= ratio; });
  }));

  function drawHUD() {
    $('#hearts').textContent = '❤️'.repeat(G.hearts) + '🤍'.repeat(5 - G.hearts);
    $('#score').textContent = G.score;
    $('#typed').innerHTML = G.buf !== '' ? G.buf : '<span class="sub" style="font-size:15px">输入得数发射炮弹</span>';
  }

  function spawn() {
    const W = stage.clientWidth;
    const usedAns = G.tanks.map(t => t.it.ans);
    const it = generateArcadeItem(opts.poolIds, usedAns);
    const el = document.createElement('div');
    el.className = 'enemy-tank';
    el.innerHTML = `<div class="tank-body"><div class="eq-txt">${it.eq}</div></div><div class="enemy-gun"></div>`;
    let x, tries = 0;
    do { x = 14 + Math.random() * Math.max(40, W - 144); tries++; }
    while (tries < 12 && G.tanks.some(t => Math.abs(t.x - x) < 125 && t.y < 140));
    const tk = { el, it, x, y: -90, speed: G.speed * (0.88 + Math.random() * 0.24) };
    el.style.transform = `translate(${x}px, ${tk.y}px)`;
    el.onclick = () => speak(it.eq);
    stage.appendChild(el);
    G.tanks.push(tk);
  }

  function aimTurretAt(t) {
    if (!turretEl || !t) return 0;
    const W = stage.clientWidth, H = stage.clientHeight;
    const bx = W / 2, by = H - 55;
    const tx = t.x + 58, ty = t.y + 45;
    const deg = Math.atan2(tx - bx, by - ty) * 180 / Math.PI;
    turretEl.style.transform = `rotate(${deg}deg)`;
    return deg;
  }

  function fireAt(t) {
    G.tanks = G.tanks.filter(x => x !== t);
    const deg = aimTurretAt(t);
    sfx.cannon();
    const W = stage.clientWidth, H = stage.clientHeight;
    const sx = W / 2 - 7, sy = H - 68;
    const tx = t.x + 51, ty = t.y + 45;
    const shell = document.createElement('div');
    shell.className = 'tank-shell';
    shell.style.transform = `translate(${sx}px, ${sy}px) rotate(${deg}deg)`;
    stage.appendChild(shell);
    requestAnimationFrame(() => {
      shell.style.transform = `translate(${tx}px, ${ty}px) rotate(${deg}deg)`;
    });

    setTimeout(() => {
      shell.remove();
      t.el.classList.add('destroyed');
      stage.classList.remove('boom-shake'); void stage.offsetWidth; stage.classList.add('boom-shake');
      const exp = document.createElement('div');
      exp.className = 'tank-explosion'; exp.textContent = '💥';
      exp.style.left = (t.x + 58) + 'px'; exp.style.top = (t.y + 50) + 'px';
      stage.appendChild(exp);
      const ft = document.createElement('div');
      ft.className = 'float-text';
      ft.textContent = `💥 ${t.it.eq} = ${t.it.ans}`;
      ft.style.left = Math.max(10, Math.min(W - 150, t.x + 10)) + 'px';
      ft.style.top = Math.max(20, t.y + 15) + 'px';
      stage.appendChild(ft);
      setTimeout(() => { t.el.remove(); exp.remove(); ft.remove(); }, 900);
    }, 180);

    G.score++;
    speak(t.it.speak);
    G.speed = Math.min(preset.max, preset.speed + G.score * preset.accel);
    G.interval = Math.max(preset.minInterval, preset.interval - G.score * 35);
    G.buf = '';
    drawHUD();
  }

  function frame(now) {
    if (!G.running) return;
    const dt = Math.min(0.05, (now - (G.last || now)) / 1000);
    G.last = now;
    G.spawnT -= dt * 1000;
    if (G.spawnT <= 0 && G.tanks.length < preset.maxCount) { spawn(); G.spawnT = G.interval; }
    const dangerY = stage.clientHeight - 145;
    for (const t of G.tanks.slice()) {
      t.y += t.speed * dt;
      t.el.style.transform = `translate(${t.x}px, ${t.y}px)`;
      if (t.y > dangerY) {
        G.tanks = G.tanks.filter(x => x !== t);
        t.el.remove();
        G.hearts--;
        G.missed.push(t.it);
        addMistake(t.it);
        sfx.bad();
        stage.classList.remove('boom-shake'); void stage.offsetWidth; stage.classList.add('boom-shake');
        toast(`⚠️ 坦克撞到大本营啦：${t.it.eq} = <b>${t.it.ans}</b>`, 1900);
        drawHUD();
        if (G.hearts <= 0) { gameOver(); return; }
      }
    }
    G.raf = requestAnimationFrame(frame);
  }

  function tryHit(num) {
    // 优先打最靠近防线的坦克
    const candidates = G.tanks.filter(t => t.it.ans === num).sort((a, b) => b.y - a.y);
    if (candidates.length) {
      fireAt(candidates[0]);
      return true;
    }
    return false;
  }

  function onKey(k) {
    if (!G.running) { if (k === 'Enter' || k === ' ') begin(); return; }
    if (k === 'Backspace') { G.buf = G.buf.slice(0, -1); drawHUD(); return; }
    if (k === 'Enter' || k === ' ') {
      if (G.buf !== '') { if (!tryHit(+G.buf)) { sfx.bad(); G.buf = ''; drawHUD(); } }
      return;
    }
    if (/^[0-9]$/.test(k)) {
      if (G.buf.length >= 2) G.buf = '';
      const nb = G.buf + k;
      const num = +nb;
      sfx.key();
      const exact = G.tanks.find(t => t.it.ans === num);
      const prefixOther = G.tanks.some(t => t.it.ans !== num && String(t.it.ans).startsWith(nb));
      if (exact && !prefixOther) { tryHit(num); return; }
      if (G.tanks.some(t => String(t.it.ans).startsWith(nb))) {
        G.buf = nb; drawHUD();
        if (exact) setTimeout(() => { if (G.buf === nb && G.tanks.includes(exact)) tryHit(num); }, 450);
      } else {
        sfx.bad(); G.buf = ''; drawHUD();
      }
    }
  }

  bindNumpad(app, num => { if (G.running && !tryHit(num)) { sfx.bad(); G.buf = ''; drawHUD(); } }, k => onKey(k));

  function begin() {
    $('#ov').classList.add('hidden');
    G.running = true; G.last = 0; G.spawnT = 250;
    G.raf = requestAnimationFrame(frame);
  }

  function gameOver() {
    G.running = false;
    cancelAnimationFrame(G.raf);
    if (G.score > (save.tankBest || 0)) save.tankBest = G.score;
    const stars = G.score >= 22 ? 3 : G.score >= 12 ? 2 : G.score >= 5 ? 1 : 0;
    const missed = [...new Map(G.missed.map(m => [m.eq, m])).values()];
    setTimeout(() => {
      showResult({
        stars, bonus: stars,
        line: `共击毁了 <b>${G.score}</b> 辆敌方坦克！最高纪录：${save.tankBest}<br>${missed.length ? '要多练练：' + missed.map(m => `${m.eq}=${m.ans}`).join('　') : ''}`,
        again: () => go(tankGame, opts),
        back: opts.back
      });
    }, 550);
  }

  keyHandler = onKey;
  $('#goBtn').onclick = begin;
  cleanup = () => { G.running = false; cancelAnimationFrame(G.raf); };
  drawHUD();
}

// ======================= 3. 🐒 小猴算式走迷宫（课本第86页同款升级版） =======================
function mazeScreen() {
  setTitle('🐒 小猴算式走迷宫');
  // 生成 4x5 网格迷宫，从左上角 (0,0) 走到右下角 (3,4)
  // 规则（与课本第86页完全一致）：下一步算式的得数比上一步大 1！（例如从得数 9 走到 10、11、12、13、14、15、16）
  const R_CNT = 4, C_CNT = 5;
  const path = [[0, 0]];
  let r = 0, c = 0;
  while (r < R_CNT - 1 || c < C_CNT - 1) {
    if (r < R_CNT - 1 && c < C_CNT - 1) {
      if (Math.random() < 0.5) r++; else c++;
    } else if (r < R_CNT - 1) r++;
    else c++;
    path.push([r, c]);
  }
  const startVal = randInt(5, 9);
  const grid = Array.from({ length: R_CNT }, () => Array(C_CNT).fill(null));

  function makeEqForTarget(target) {
    if (target <= 10) {
      if (Math.random() < 0.55) {
        const a = randInt(1, target - 1); return `${a}+${target - a}`;
      } else {
        const a = randInt(target + 1, Math.min(18, target + 8)); return `${a}-${a - target}`;
      }
    } else {
      if (Math.random() < 0.6) {
        const a = randInt(target - 9, 9); return `${a}+${target - a}`;
      } else {
        const a = randInt(target + 1, 19); return `${a}-${a - target}`;
      }
    }
  }

  path.forEach(([pr, pc], idx) => {
    const val = startVal + idx;
    grid[pr][pc] = { r: pr, c: pc, val, eq: makeEqForTarget(val), onPath: true, stepIdx: idx };
  });

  // 填充非路径格子（保证得数不等于相邻路径下一步的目标值，避免歧义）
  for (let i = 0; i < R_CNT; i++) {
    for (let j = 0; j < C_CNT; j++) {
      if (!grid[i][j]) {
        const avoid = new Set(path.map((_, idx) => startVal + idx));
        let fakeVal = randInt(3, 18);
        while (avoid.has(fakeVal)) fakeVal = randInt(2, 19);
        grid[i][j] = { r: i, c: j, val: fakeVal, eq: makeEqForTarget(fakeVal), onPath: false };
      }
    }
  }

  let curStep = 0;

  function draw() {
    const curTarget = startVal + curStep;
    const nextTarget = startVal + curStep + 1;
    let cellsHtml = '';
    for (let i = 0; i < R_CNT; i++) {
      for (let j = 0; j < C_CNT; j++) {
        const cell = grid[i][j];
        const visited = cell.onPath && cell.stepIdx <= curStep;
        const isCurrent = cell.onPath && cell.stepIdx === curStep;
        const isGoal = i === R_CNT - 1 && j === C_CNT - 1;
        cellsHtml += `<button class="maze-cell ${visited ? 'visited' : ''} ${isCurrent ? 'current' : ''}" data-r="${i}" data-c="${j}">
          <div>${isCurrent ? '🐒 ' : (isGoal ? '🍑 ' : '')}${cell.eq}</div>
          ${visited ? `<small style="font-size:13px;color:#d9480f">= ${cell.val}</small>` : ''}
        </button>`;
      }
    }

    app.innerHTML = `
      <div class="screen-title">
        <button class="btn small gray" id="backHome">← 首页</button>
        <span>🐒 小猴算式走迷宫（课本第86页）</span>
      </div>
      <div class="card center">
        <div class="congcong-tip" style="text-align:left">
          <span class="bot">🤖</span>
          <span><b>走迷宫规则：</b>从左上角的小猴 🐒 出发，<b>下一步算式的得数要比上一步大 1</b>！<br>
          当前格子得数是 <b>${curTarget}</b>，请在周围相邻格子里找出<b>得数是 ${nextTarget}</b> 的算式，帮小猴吃到右下角的水蜜桃 🍑！</span>
        </div>
        <div class="maze-grid">${cellsHtml}</div>
        <div class="row center" style="margin-top:12px">
          <button class="btn green" id="btnNewMaze">🔄 换一张新迷宫</button>
        </div>
      </div>`;

    $('#backHome').onclick = () => go(homeScreen);
    $('#btnNewMaze').onclick = () => go(mazeScreen);
    app.querySelectorAll('.maze-cell').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = +btn.dataset.r, c = +btn.dataset.c;
        const [cr, cc] = path[curStep];
        const dist = Math.abs(r - cr) + Math.abs(c - cc);
        const cell = grid[r][c];
        if (dist !== 1) {
          toast('🐒 只能走上下左右紧挨着的格子哦！', 1600);
          return;
        }
        if (cell.onPath && cell.stepIdx === curStep + 1) {
          curStep++;
          sfx.step();
          speak(`${cell.eq}等于${cell.val}`);
          if (curStep === path.length - 1) {
            save.mazeBest = (save.mazeBest || 0) + 1;
            showResult({
              stars: 3, bonus: 3,
              line: `🎉 小猴成功走出算式迷宫，吃到了大仙桃 🍑！（累计通关 ${save.mazeBest} 次）`,
              again: () => go(mazeScreen),
              back: () => go(homeScreen)
            });
          } else {
            draw();
          }
        } else {
          sfx.bad();
          btn.classList.add('wrong');
          toast(`🤔 ${cell.eq} = ${cell.val}，不等于 ${nextTarget} 哦，再算算旁边的格子！`, 2000);
        }
      });
    });
  }
  draw();
}

// ======================= 4. 🚀 火箭点火 60秒口算挑战赛（课本第57页） =======================
function rocketScreen() {
  setTitle('🚀 火箭点火挑战赛');
  app.innerHTML = `
    <div class="screen-title"><button class="btn small gray" id="backHome">← 首页</button> 🚀 火箭点火 60 秒挑战赛</div>
    <div class="card center">
      <div style="font-size:68px">🚀</div>
      <h2 style="margin:6px 0">10、9、8……点火发射！</h2>
      <p class="sub" style="font-size:18px;max-width:520px;margin:8px auto 16px">在 60 秒内尽可能多地答对加减法算式，每答对 1 题火箭就上升一级，看看你能把火箭送上多高的太空！</p>
      <div class="row center" id="poolChecks" style="margin-bottom:16px">
        ${ARCADE_POOLS.map(p => `<label class="chip"><input type="checkbox" value="${p.id}" ${p.defaultChecked ? 'checked' : ''}> ${p.label}</label>`).join('')}
      </div>
      <p class="sub">🏅 历史最高纪录：60 秒答对 <b>${save.rocketBest}</b> 题</p>
      <button class="btn purple" id="btnStartRocket" style="font-size:22px;padding:15px 38px">🔥 点火开始！</button>
    </div>`;
  $('#backHome').onclick = () => go(homeScreen);
  $('#btnStartRocket').onclick = () => {
    const poolIds = [...app.querySelectorAll('#poolChecks input:checked')].map(x => x.value);
    if (!poolIds.length) { toast('请至少勾选一个口算范围哦！'); return; }
    go(rocketPlay, poolIds);
  };
}

function rocketPlay(poolIds) {
  let timeLeft = 60, score = 0, buf = '', cur = generateArcadeItem(poolIds);
  let timer = null;
  const maxNum = poolIds.some(p => p === 'carry_20' || p === 'teen_simple') ? 20 : 10;

  function draw() {
    app.innerHTML = `
      <div class="hud">
        <button class="btn small gray" id="quit">✕ 退出</button>
        <span>⏱️ 倒计时：<b id="tLeft" style="color:#e03131">${timeLeft}</b> 秒</span>
        <span>🚀 高度：<b id="rScore" style="color:#2b8a3e">${score}</b> 题</span>
      </div>
      <div class="card question" style="min-height:200px">
        <div style="font-size:44px">🚀</div>
        <div class="big-eq" id="rEq"><span>${cur.eq.replace('= 10', '')} ${cur.eq.includes('= 10') ? '' : '='}</span> <span class="eq-box" id="rBox">${buf || '?'}</span> ${cur.eq.includes('= 10') ? '<span>= 10</span>' : ''}</div>
      </div>
      <div class="card" style="padding:14px;margin-top:12px">
        ${numpadHtml(maxNum)}
      </div>`;
    $('#quit').onclick = () => { clearInterval(timer); go(rocketScreen); };
    bindNumpad(app, num => checkNum(num), k => onKey(k));
  }

  function checkNum(num) {
    if (num === cur.ans) {
      score++;
      sfx.ok();
      buf = '';
      cur = generateArcadeItem(poolIds, [cur.ans]);
      $('#rScore').textContent = score;
      $('#rEq').innerHTML = `<span>${cur.eq.replace('= 10', '')} ${cur.eq.includes('= 10') ? '' : '='}</span> <span class="eq-box" id="rBox">?</span> ${cur.eq.includes('= 10') ? '<span>= 10</span>' : ''}`;
    } else {
      sfx.bad();
      buf = '';
      const box = $('#rBox');
      if (box) { box.className = 'eq-box bad'; box.textContent = num; }
    }
  }

  function onKey(k) {
    if (k === 'Backspace') { buf = buf.slice(0, -1); if ($('#rBox')) $('#rBox').textContent = buf || '?'; return; }
    if (k === 'Enter' || k === ' ') { if (buf !== '') checkNum(+buf); return; }
    if (/^[0-9]$/.test(k)) {
      if (buf.length >= 2) buf = '';
      buf += k;
      sfx.key();
      if ($('#rBox')) $('#rBox').textContent = buf;
      const num = +buf;
      if (num === cur.ans) {
        checkNum(num);
      } else if (buf.length >= 2 || (cur.ans < 10)) {
        setTimeout(() => checkNum(num), 150);
      }
    }
  }

  draw();
  keyHandler = onKey;
  timer = setInterval(() => {
    timeLeft--;
    const el = $('#tLeft');
    if (el) el.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      if (score > (save.rocketBest || 0)) save.rocketBest = score;
      const stars = score >= 20 ? 3 : score >= 12 ? 2 : score >= 5 ? 1 : 0;
      showResult({
        stars, bonus: stars,
        line: `🚀 火箭冲上云霄！60 秒内答对了 <b>${score}</b> 道算式！最高纪录：${save.rocketBest} 题`,
        again: () => go(rocketPlay, poolIds),
        back: () => go(rocketScreen)
      });
    }
  }, 1000);
  cleanup = () => clearInterval(timer);
}

// ======================= 错题本、贴纸册、家长说明、设置 =======================
function mistakesScreen() {
  setTitle('📒 错题本');
  const list = Object.values(save.mistakes).sort((a, b) => b.n - a.n);
  let h = `<div class="screen-title"><button class="btn small gray" id="backHome">← 首页</button> 📒 错题本 <span class="sub">答错两次的算式会自动记录在这里，练对了就会消除！</span></div>`;
  if (!list.length) {
    h += `<div class="card center" style="font-size:22px;padding:36px">🎉 错题本是空的，你是超级口算小达人！</div>`;
  } else {
    h += `<div class="mistake-list">`;
    list.forEach(m => {
      h += `<button class="mistake-card" data-say="${m.eqText}">
        <div class="eq">${m.eqText}</div>
        <div class="cnt">需巩固 ${m.n} 次</div>
      </button>`;
    });
    h += `</div>
      <div class="row center" style="margin-top:24px">
        <button class="btn purple" id="btnPracticeMistakes">💪 专项消灭错题</button>
        <button class="btn gray small" id="btnClearMistakes">清空错题本</button>
      </div>`;
  }
  app.innerHTML = h;
  $('#backHome').onclick = () => { sfx.ok(); go(homeScreen); };
  app.querySelectorAll('.mistake-card').forEach(b => b.addEventListener('click', () => {
    sfx.pop();
    speak(b.dataset.say);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }));
  if (list.length) {
    $('#btnPracticeMistakes').onclick = () => {
      sfx.ok();
      const questions = list.slice(0, 12).map(m => generateQuestion(m.qType || 'calc_all_mix'));
      go(startRound, {
        title: '💪 错题专项巩固',
        questions,
        starKey: null,
        isReview: true,
        back: () => go(mistakesScreen)
      });
      speak('错题专项巩固');
    };
    $('#btnClearMistakes').onclick = () => {
      sfx.del();
      if (confirm('确定清空错题本吗？')) { save.mistakes = {}; persist(); go(mistakesScreen); toast('错题本已清空'); }
    };
  }
}

const MATH_STICKER_NAMES = [
  '小金星', '闪耀之星', '礼花筒', '红气球', '小火箭',
  '小狮子', '小老虎', '大熊猫', '独角兽', '七色彩虹',
  '冠军奖杯', '金王冠', '蓝宝石', '闪亮爱心', '幸运四叶草',
  '小花猫', '小黄狗', '小白兔', '红狐狸', '树袋熊',
  '蓝海豚', '花蝴蝶', '粉红樱花', '大红苹果', '甜西瓜',
  '红草莓', '甜筒冰淇淋', '生日蛋糕', '彩色糖果', '小吉他',
  '游戏掌机', '太空飞碟'
];

function stickerScreen() {
  setTitle('🏆 我的贴纸');
  const n = stickerCount(), total = totalStars();
  app.innerHTML = `
    <div class="screen-title"><button class="btn small gray" id="backHome">← 首页</button> 🏆 我的贴纸册 <span class="sub">每得到 5 颗 ⭐ 就能解锁一张新贴纸（点贴纸听发音）</span></div>
    <div class="card" style="margin-bottom:16px;font-size:20px">
      你一共有 <b>${total}</b> 颗 ⭐，${n < STICKERS.length ? `再得 <b>${5 - total % 5}</b> 颗 ⭐ 就能拿到下一张贴纸啦！` : '全部 60 张贴纸都集齐啦！太厉害了！🎉'}
    </div>
    <div class="sticker-book">${STICKERS.map((s, i) => `<button type="button" class="sticker ${i < n ? '' : 'locked'}" data-i="${i}" style="cursor:pointer" title="${i < n ? '点击听发音' : '未解锁'}">${i < n ? s : '❓'}</button>`).join('')}</div>`;
  $('#backHome').onclick = () => { sfx.ok(); go(homeScreen); };
  app.querySelectorAll('.sticker').forEach(b => {
    const i = +b.dataset.i;
    b.addEventListener('click', () => {
      if (i < n) {
        sfx.win();
        b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
        const name = MATH_STICKER_NAMES[i % MATH_STICKER_NAMES.length] || '神奇贴纸';
        speak(name);
        confetti(12);
      } else {
        sfx.bad();
        toast('🔒 继续闯关赚星星，就能解锁这张贴纸啦！', 2000);
        speak('继续加油赚星星哦！');
      }
    });
  });
}

function helpScreen() {
  setTitle('👨‍👩‍👦 家长说明');
  app.innerHTML = `
    <div class="screen-title"><button class="btn small gray" id="backHome">← 首页</button> 👨‍👩‍👦 给家长的说明</div>
    <div class="card" style="font-size:17px;line-height:1.85">
      <h2 style="margin-top:0">📚 100% 同步人教版《数学》一年级上册（2024新版）</h2>
      <p>本游戏严格按照文件夹中的<b>《义务教育教科书·数学一年级上册》</b>编写，完整覆盖全册 6 大核心模块：</p>
      <ul>
        <li><b>准备课（数学游戏）</b>：校园数一数（1~10）、比多少、上下前后左右方位、区分“几个”与“第几”。</li>
        <li><b>第一单元（5以内数的认识和加、减法）</b>：1~5的认识、比大小（＞ ＜ ＝）、分与合、1~5加减法、0的认识与加减法。</li>
        <li><b>第二单元（6~10的认识和加、减法）</b>：6~10的认识与分合、<b>课本经典大括号“{ ?只”看图列式</b>、凑十歌（一九一九好朋友）、连加连减与加减混合。</li>
        <li><b>第三单元（认识立体图形）</b>：长方体、正方体、圆柱、球的特征辨认、数积木（含隐藏正方体）与图形规律。</li>
        <li><b>第四单元（11~20的认识）</b>：<b>10根小棒捆成1捆（10个一是1个十）</b>、计数器<b>十位与个位</b>、10加几与十几加减几、<b>排队“之间有几人”画图解题</b>。</li>
        <li><b>第五单元（20以内的进位加法）</b>：全册重难点！内置<b>动态“凑十法”拆数神器</b>（9加几、8/7/6加几、5/4/3/2加几）与逆向求和（“原来有多少”）应用题。</li>
      </ul>
      <p>⌨️ <b>操作方式</b>：支持<b>直接按电脑键盘数字键（0~9）</b>，智能识别一位数和两位数免回车快速判题；同时配备<b>0~20 屏幕大按钮</b>，用鼠标或 iPad 触屏点按同样丝滑。</p>
      <p>🔊 <b>语音读题</b>：考虑到一年级上学期孩子识字量有限，每道题都会自动用自然女声朗读题目和算理提示，孩子自己就能听懂并独立闯关。</p>
    </div>`;
  $('#backHome').onclick = () => go(homeScreen);
}

function settingsModal() {
  const s = S();
  const eng = 'teacher';
  const m = $('#modal');
  m.innerHTML = `<div class="card">
    <h2 style="margin-top:0">⚙️ 设置 <span class="sub" style="font-size:14px">（修改后立即生效）</span></h2>
    <div class="setting-row"><span>🔊 声音和语音读题</span><label class="switch"><input type="checkbox" id="sSound" ${s.sound ? 'checked' : ''}><span></span></label></div>
    <div class="setting-row"><span>🎙️ 配音音色</span>
      <select id="sVoice"><option value="teacher" selected>温柔女老师（统一 TTS 配音）</option>
      </select>
    </div>
    <div class="setting-row"><span>🐢 朗读语速</span><input type="range" id="sRate" min="0.6" max="1.2" step="0.1" value="${s.rate}"></div>
    <div class="setting-row"><span>🎈 气球/坦克速度</span>${speedSelectHtml('sGameSpeed')}</div>
    <div class="setting-row"><span>🔢 显示屏幕数字键盘 (0~20)</span><label class="switch"><input type="checkbox" id="sNumpad" ${s.showNumpad ? 'checked' : ''}><span></span></label></div>
    <div class="setting-row"><span>💡 答错时自动展开聪聪图解提示</span><label class="switch"><input type="checkbox" id="sHint" ${s.autoHint ? 'checked' : ''}><span></span></label></div>
    <div class="setting-row"><span>📝 每轮闯关题数</span><select id="sSize">${[6, 8, 10, 12, 15].map(n => `<option ${n === s.roundSize ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="row" style="margin-top:18px;justify-content:space-between">
      <button class="btn gray small" id="sReset">🗑️ 重置全部进度</button>
      <button class="btn green" id="sClose">好的</button>
    </div>
  </div>`;
  m.classList.remove('hidden');
  const syncAll = () => {
    s.sound = $('#sSound').checked;
    s.voiceEngine = $('#sVoice').value;
    s.rate = +$('#sRate').value;
    s.gameSpeed = $('#sGameSpeed').value;
    s.showNumpad = $('#sNumpad').checked;
    s.autoHint = $('#sHint').checked;
    s.roundSize = +$('#sSize').value;
    if (!s.sound) stopAllSpeech();
    const np = app.querySelector('.numpad');
    if (np) np.style.display = s.showNumpad ? '' : 'none';
    app.querySelectorAll('.spd-btn').forEach(b => {
      if (b.dataset.spd === s.gameSpeed && !b.classList.contains('active')) b.click();
    });
    persist();
  };
  $('#sSound').onchange = () => { syncAll(); if (s.sound) sfx.ok(); };
  $('#sVoice').onchange = () => { syncAll(); speak('小朋友你好，我是聪聪，快来一起玩数学游戏吧！'); };
  $('#sRate').onchange = () => { syncAll(); speak('你好，小朋友'); };
  $('#sGameSpeed').onchange = syncAll;
  $('#sNumpad').onchange = syncAll;
  $('#sHint').onchange = syncAll;
  $('#sSize').onchange = syncAll;
  const close = () => {
    syncAll();
    m.classList.add('hidden');
  };
  $('#sClose').onclick = close;
  $('#sReset').onclick = () => {
    if (confirm('确定要清除所有星星、贴纸和错题记录吗？')) {
      save = { stars: {}, mistakes: {}, balloonBest: 0, tankBest: 0, mazeBest: 0, rocketBest: 0, bonus: 0, settings: s };
      persist();
      m.classList.add('hidden');
      go(homeScreen);
    }
  };
  m.onclick = e => { if (e.target === m) close(); };
}

// ======================= 启动初始化 =======================
$('#btnHome').onclick = () => go(homeScreen);
$('#btnLab').onclick = () => go(labScreen);
$('#btnSettings').onclick = settingsModal;
$('#starCount').onclick = () => go(stickerScreen);
const switchBtn = $('#btnSwitchGame');
if (switchBtn) {
  switchBtn.onclick = e => {
    if (window.top && window.top !== window) {
      e.preventDefault();
      window.top.postMessage('switch:pinyin', '*');
    }
  };
}
updateStarCount();
go(homeScreen);

})();
