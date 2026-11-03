/* 拼音小勇士 —— 一年级拼音打字游戏
 * 玩法：打拼音字母 + 数字键 1~4 表示声调（0 表示轻声），v 键打 ü
 */
(() => {
'use strict';

// ======================= 拼音工具 =======================
const TONE_CHARS = {
  'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
  'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
  'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
  'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
  'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
  'ǖ': ['ü', 1], 'ǘ': ['ü', 2], 'ǚ': ['ü', 3], 'ǜ': ['ü', 4],
};
const MARKED = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };

function parsePinyin(s) {
  let plain = '', tone = 0;
  for (const ch of s) {
    if (TONE_CHARS[ch]) { plain += TONE_CHARS[ch][0]; tone = TONE_CHARS[ch][1]; }
    else plain += ch;
  }
  return { plain, tone, key: plain.replace(/ü/g, 'v') };
}

// 标调规则：有 a 标 a，没 a 找 o e，i u 并列标在后
function toneIndex(plain) {
  if (plain.includes('a')) return plain.indexOf('a');
  if (plain.includes('e')) return plain.indexOf('e');
  if (plain.includes('ou')) return plain.indexOf('o');
  for (let i = plain.length - 1; i >= 0; i--) if ('iouü'.includes(plain[i])) return i;
  return -1;
}

function toneText(plain, tone) {
  const i = toneIndex(plain);
  if (!tone || i < 0) return plain;
  return plain.slice(0, i) + MARKED[plain[i]][tone - 1] + plain.slice(i + 1);
}

// 渲染拼音（自绘声调符号，字体统一，教材式单层 ɑ、单环 ɡ）
// tone: 0/null 不标；'?' 显示问号
function stdPyChar(ch) {
  if (ch === 'a') return 'ɑ';
  if (ch === 'g') return 'ɡ';
  return ch;
}
function renderPy(plain, tone, extraClass = '') {
  plain = plain.replace(/v/g, 'ü');
  const idx = (tone && tone !== 0) ? toneIndex(plain) : -1;
  let html = '';
  [...plain].forEach((ch, i) => {
    const disp = stdPyChar(ch);
    if (i === idx) {
      const base = ch === 'i' ? 'ı' : disp;
      const cls = tone === '?' ? 'q' : 't' + tone;
      html += `<span class="tv ${cls} ${ch === 'ü' ? 'hi' : ''}">${base}</span>`;
    } else html += escapeHtml(disp);
  });
  return `<span class="py ${extraClass}">${html || '&nbsp;'}</span>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
function splitSyl(p) {
  for (const i of INITIALS) if (p.startsWith(i) && p.length > i.length) return [i, p.slice(i.length)];
  return ['', p];
}
// 判断一个音节是否只用到了已学过的声母/韵母
function sylKnown(plain, known) {
  let [ini, fin] = splitSyl(plain);
  if (ini && !known.has(ini)) return false;
  if (ini && 'jqxy'.includes(ini) && fin[0] === 'u') fin = 'ü' + fin.slice(1);
  if (known.has(fin)) return true;
  if ('iuü'.includes(fin[0]) && known.has(fin[0]) && known.has(fin.slice(1))) return true;
  return false;
}

// ======================= 数据整理 =======================
const ALL_LESSONS = [];
const POLY_CHARS = new Set(['地de0', '着zhao2', '数shu3', '长zhang3']);
CHAR_UNITS.forEach(u => u.lessons.forEach(l => { l.unit = u; ALL_LESSONS.push(l); }));

function charItem(s) {
  const [char, py, word] = s.split(' ');
  const p = parsePinyin(py);
  const id = char + p.key + p.tone;
  // 对于多音字（如 地de/dì、着zhe/zháo、数shǔ/shù、长zhǎng/cháng），把词语放在前面或用“词里的字”，让神经网络 TTS 自动读对多音字音调
  return {
    type: 'char', char, word, py, plain: p.plain, tone: p.tone, key: p.key,
    id, poly: POLY_CHARS.has(id),
    speak: `${word}，${word}的${char}`,
  };
}
const LESSON_ITEMS = {};
ALL_LESSONS.forEach(l => { LESSON_ITEMS[l.id] = (l.items || []).map(charItem); });
// 专项分类引用已有字卡；仅在相同读音不存在时创建新记录。
const sharedCharItems = new Map();
ALL_LESSONS.filter(l => !l.reuseItems).forEach(l => LESSON_ITEMS[l.id].forEach(item => {
  if (!sharedCharItems.has(item.id)) sharedCharItems.set(item.id, item);
}));
ALL_LESSONS.filter(l => l.reuseItems).forEach(l => {
  LESSON_ITEMS[l.id] = l.reuseItems.map(raw => {
    const item = charItem(raw);
    if (!sharedCharItems.has(item.id)) sharedCharItems.set(item.id, item);
    return sharedCharItems.get(item.id);
  });
});
const ALL_CHAR_ITEMS = ALL_LESSONS.filter(l => !l.unit.supplemental).flatMap(l => LESSON_ITEMS[l.id]);

// 为音节提供自然的汉字拟音（用于课本拼读音节表发声与练习）
const SYL_SPEAK_MAP = {};
ALL_CHAR_ITEMS.forEach(c => {
  const k = c.plain + c.tone;
  if (!SYL_SPEAK_MAP[k]) SYL_SPEAK_MAP[k] = { char: c.char, word: c.word, speak: c.char };
});
const EXTRA_SYL_SPEAK = {
  'a1': '啊', 'a2': '啊', 'a3': '啊', 'a4': '啊',
  'o1': '喔', 'o2': '哦', 'o3': '喔', 'o4': '哦',
  'e1': '婀', 'e2': '鹅', 'e3': '恶', 'e4': '饿',
  'i1': '衣', 'i2': '姨', 'i3': '椅', 'i4': '艺',
  'u1': '乌', 'u2': '无', 'u3': '五', 'u4': '雾',
  'ü1': '迂', 'ü2': '鱼', 'ü3': '雨', 'ü4': '玉',
  'ba3': '把', 'bo1': '波', 'bi2': '鼻', 'bu4': '布',
  'pa2': '爬', 'po4': '破', 'pi1': '批', 'pu3': '普',
  'ma3': '马', 'mo1': '摸', 'mi3': '米', 'mu4': '木',
  'fa1': '发', 'fo2': '佛', 'fu3': '斧',
  'da3': '打', 'de2': '得', 'di1': '低', 'du2': '读',
  'ta1': '他', 'te4': '特', 'ti1': '梯', 'tu2': '图',
  'na3': '哪', 'ne2': '呢', 'ni3': '你', 'nu4': '怒',
  'lü3': '旅', 'la1': '拉', 'le4': '乐', 'li4': '立', 'lu4': '路', 'lü4': '绿',
  'ga1': '嘎', 'ge4': '个', 'gu1': '姑', 'ka3': '卡', 'ke1': '科', 'ku3': '苦',
  'ha1': '哈', 'he1': '喝', 'hu3': '虎', 'gua1': '瓜', 'gua4': '挂', 'guo1': '锅',
  'kua1': '夸', 'kuo4': '阔', 'hua1': '花', 'huo3': '火',
  'ji1': '鸡', 'ju1': '居', 'qi1': '七', 'qu1': '区', 'xi1': '西', 'xu1': '须',
  'jia1': '家', 'qia1': '掐', 'xia2': '霞',
  'za1': '扎', 'ze2': '责', 'zu3': '组', 'zuo1': '桌',
  'ca1': '擦', 'ce4': '测', 'cu1': '粗', 'cuo1': '搓',
  'sa1': '撒', 'se4': '色', 'su1': '苏', 'suo3': '锁',
  'zi3': '子', 'ci3': '此', 'si1': '丝',
  'zha1': '扎', 'zhe4': '这', 'zhu4': '住', 'zhua1': '抓',
  'cha1': '插', 'che1': '车', 'chu1': '出', 'chuo1': '戳',
  'sha3': '傻', 'she2': '舌', 'shu1': '书', 'shuo1': '说',
  're4': '热', 'ru3': '乳', 'ruo4': '弱',
  'zhi1': '知', 'chi1': '吃', 'shi1': '狮', 'ri4': '日',
  'ya1': '鸭', 'ya2': '牙', 'ya3': '雅', 'ya4': '亚',
  'wa1': '蛙', 'wa2': '娃', 'wa3': '瓦', 'wa4': '袜',
  'yu2': '鱼', 'ye1': '椰', 'yue4': '月', 'yuan2': '圆', 'yin1': '音', 'yun2': '云', 'yun4': '运', 'ying1': '鹰'
};

function renderWordRuby(wStr) {
  const parts = wStr.trim().split(/\s+/);
  const hz = parts[0];
  const pyList = parts.slice(1);
  if (!pyList.length) return `<span class="word-hz">${escapeHtml(hz)}</span>`;
  const pyHtml = pyList.map(p => {
    const parsed = parsePinyin(p);
    return renderPy(parsed.plain, parsed.tone);
  }).join(' ');
  return `<span class="word-py">${pyHtml}</span><span class="word-hz">${escapeHtml(hz)}</span>`;
}

function letterItem(letter) {
  const info = LETTER_INFO[letter] || {};
  return { type: 'letter', letter, plain: letter, key: letter.replace(/ü/g, 'v'), tone: null, speak: info.say || letter, emoji: info.emoji || '', id: 'L' + letter };
}

// ======================= 存档 =======================
const SAVE_KEY = 'pinyin-hero-v1';
const DEFAULT_SETTINGS = { sound: true, keyVoice: true, voiceEngine: 'teacher', voiceProfileVersion: 3, rate: 0.8, gameSpeed: 'slow', kbHint: true, pyHint: false, roundSize: 10, showKb: true };
let save = loadSave();
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
    const settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
    // 本次音色升级覆盖旧版自动/在线选择，保留学习进度及其他偏好。
    settings.voiceEngine = 'teacher'; settings.voiceProfileVersion = 3;
    return { stars: s.stars || {}, mistakes: s.mistakes || {}, balloonBest: s.balloonBest || 0, duckBest: s.duckBest || 0, pacBest: s.pacBest || 0, tankBest: s.tankBest || 0, settings, bonus: s.bonus || 0 };
  } catch (e) { return { stars: {}, mistakes: {}, balloonBest: 0, duckBest: 0, pacBest: 0, tankBest: 0, settings: { ...DEFAULT_SETTINGS }, bonus: 0 }; }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} updateStarCount(); }
const S = () => save.settings;
window.LearningTheme?.setSoundProvider(()=>S().sound);
function totalStars() { return Object.values(save.stars).reduce((a, b) => a + b, 0) + (save.bonus || 0); }
function stickerCount() { return Math.min(STICKERS.length, Math.floor(totalStars() / 5)); }
function updateStarCount() { $('#starCount').textContent = '⭐ ' + totalStars(); }

function addMistake(item) {
  if (item.type !== 'char') return;
  const m = save.mistakes[item.id] || { s: `${item.char} ${item.py} ${item.word}`, n: 0 };
  m.n++; save.mistakes[item.id] = m; persist();
}
function reduceMistake(item) {
  const m = save.mistakes[item.id];
  if (!m) return;
  m.n--; if (m.n <= 0) delete save.mistakes[item.id];
  persist();
}

// ======================= 声音与按键发音 =======================
let actx = null;
function ensureAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  try {
    if (!actx || actx.state === 'closed') {
      actx = new Ctx();
    }
    // iPadOS Safari 常在播放语音/切后台后进入 'interrupted' 或 'suspended' 状态，必须在每次交互时唤醒
    if (actx.state !== 'running') {
      const p = actx.resume();
      if (p && p.catch) p.catch(() => {});
    }
  } catch (e) {
    actx = null;
  }
  return actx;
}

let speakSeq = 0;
function stopAllSpeech() { speakSeq++; window.TeacherVoice.stop(); }
// ======================= 键盘按键与拼音统一TTS发音 =======================
const KEY_SAY = {
  a: '啊', b: '玻', c: '雌', d: '得', e: '鹅', f: '佛', g: '哥', h: '喝',
  i: '衣', j: '鸡', k: '科', l: '勒', m: '摸', n: '讷', o: '喔', p: '坡',
  q: '七', r: '日', s: '思', t: '特', u: '乌', v: '迂', 'ü': '迂',
  w: '乌', x: '西', y: '衣', z: '资',
  '1': '一声', '2': '二声', '3': '三声', '4': '四声', '0': '轻声', '5': '轻声'
};

const SAY_TO_KEY = {
  a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h',
  i: 'i', j: 'j', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p',
  q: 'q', r: 'r', s: 's', t: 't', u: 'u', v: 'v', 'ü': 'v', w: 'w',
  x: 'x', y: 'y', z: 'z',
  '啊': 'a', '玻': 'b', '雌': 'c', '得': 'd', '鹅': 'e', '佛': 'f', '哥': 'g', '喝': 'h',
  '衣': 'i', '鸡': 'j', '科': 'k', '勒': 'l', '摸': 'm', '讷': 'n', '喔': 'o', '坡': 'p',
  '七': 'q', '日': 'r', '思': 's', '特': 't', '乌': 'u', '迂': 'v', '西': 'x', '资': 'z',
  '一声': '1', '二声': '2', '三声': '3', '四声': '4', '轻声': '0',
  '1': '1', '2': '2', '3': '3', '4': '4', '0': '0', '5': '0'
};

// 单一朗读通道：新的按键会停止上一段，避免快速输入时叠音。
let speechWatchdog = null;

function normalizePinyinInput(value) {
  return String(value || '').toLowerCase().normalize('NFC')
    .replace(/ɑ/g, 'a').replace(/ɡ/g, 'g').replace(/u:/g, 'ü').replace(/v/g, 'ü').normalize('NFC');
}
function pinyinRecordingKey(value, tone = null) {
  const raw = normalizePinyinInput(value);
  const numbered = raw.match(/^([a-zü]+)([0-5])$/);
  const parsed = parsePinyin(numbered ? numbered[1] : raw);
  const base = parsed.plain.replace(/ü/g, 'v');
  const data = window.PINYIN_AUDIO_DATA || {};
  const explicit = tone !== null || numbered || parsed.tone > 0;
  if (explicit) {
    const t = tone !== null ? tone : numbered ? +numbered[2] : parsed.tone;
    // i、u、ü 单独成音节时，录音库按 yi、wu、yu 的规范拼写命名。
    const spelledBase = ({i: 'yi', u: 'wu', v: 'yu', ve: 'yue', vn: 'yun'})[base] || base;
    const key = spelledBase + (t === 5 ? 0 : t);
    return data[key] ? key : null;
  }
  if (data['unit:' + base]) return 'unit:' + base;
  return data[base + '1'] ? base + '1' : null;
}

function playRecording(uri, fallback, options = {}) {
  stopAllSpeech();
  window.TeacherVoice.playSequence([{uri, type: options.type || 'pinyin'}], {
    rate: options.rate || 1,
    enabled: () => S().sound,
    onerror: fallback
  });
}

function speakPinyin(value, tone = null) {
  if (!S().sound) return;
  const key = pinyinRecordingKey(value, tone);
  if (key) {
    playRecording(window.PINYIN_AUDIO_DATA[key], () => {
      toast('这段拼音录音暂时无法播放，请再点一次 🔊');
    });
    return;
  }
  // 没有录音时使用已知汉字帮助发音，不能将拉丁拼音交给系统念英文字母。
  const parsed = parsePinyin(normalizePinyinInput(value));
  const t = tone === null ? parsed.tone : tone;
  const hit = SYL_SPEAK_MAP[parsed.plain + t];
  const say = (hit && hit.speak) || EXTRA_SYL_SPEAK[parsed.plain + t]
    || (LETTER_INFO[parsed.plain] || {}).say;
  if (say) speak(say);
  else toast('这个拼音暂时没有录音，请检查输入');
}

function playKeyVoice(k) {
  if (!S().sound || S().keyVoice === false) return;
  const raw = String(k).toLowerCase();
  const key = SAY_TO_KEY[raw] || raw;
  if (/^[0-5]$/.test(key)) {
    const normalized = key === '5' ? '0' : key;
    speak(KEY_SAY[normalized]);
    return;
  }
  speakPinyin(key);
}

// 读取实际已输入的组合；不偷用题目答案，错声调也按所选声调读。
function playTypedPinyin(buffer, lastKey) {
  if (!S().sound || S().keyVoice === false) return;
  const raw = normalizePinyinInput(buffer);
  if (pinyinRecordingKey(raw)) { speakPinyin(raw); return; }
  // 拼写尚未完成时，优先读出已经组成的韵母，其次读本次字母。
  const plain = raw.replace(/[0-5]$/, '');
  const [, final] = splitSyl(plain);
  if (!/[0-5]$/.test(raw) && pinyinRecordingKey(final)) speakPinyin(final);
  else playKeyVoice(lastKey);
}

function speakItem(item) {
  if (!item) return;
  if (item.type === 'letter') speakPinyin(item.letter || item.plain);
  else if (item.type === 'syl') speakPinyin(item.plain, item.tone);
  else if(item.type==='char' || item.char){
    const py=item.py || toneText(item.plain,item.tone),uri=(window.QUESTION_CHARACTER_VOICE||{})[item.char+'|'+py];
    if(uri){if(S().sound)playRecording(uri,()=>toast('请再点一次听读音'),{type:'pinyin'});}
    else speakPinyin(item.plain,item.tone);
  }else speak(item.speak || item.char);
}

// 中文讲解使用预生成的老师配音；混排拼音接回对应的教学录音。
function teacherVoicePlan(text) {
  const segments = [], missing = [];
  const parts = String(text).trim().replace(/\s+/g, ' ')
    .split(/([a-züɑɡāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]+[0-5]?)/gi);
  for (const part of parts) {
    const value = part.trim();
    if (!value) continue;
    if (/[\u3400-\u9fff]/.test(value)) {
      const plan = window.TeacherVoice.planText(value);
      segments.push(...plan.segments); missing.push(...plan.missing);
    } else if (/[a-züɑɡāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]/i.test(value)) {
      const key = pinyinRecordingKey(value);
      if (key) segments.push({uri: window.PINYIN_AUDIO_DATA[key], type: 'pinyin'});
      else missing.push(value);
    }
  }
  return {segments, missing};
}
function speakTeacher(text) {
  const plan = teacherVoicePlan(text);
  if (plan.missing.length || !plan.segments.length) {
    stopAllSpeech(); toast('这句老师配音尚未准备好'); return;
  }
  stopAllSpeech();
  window.TeacherVoice.playSequence(plan.segments, {
    enabled: () => S().sound,
    rate: Math.max(0.7, Math.min(1.5, (S().rate || 0.8) / 0.8)),
    onerror: () => toast('老师配音暂时无法播放，请再点一次 🔊')
  });
}
function speak(text) {
  if (!S().sound || !text) return;
  const value = String(text).trim();
  if (/^[a-züɑɡāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]+[0-5]?$/i.test(value)) speakPinyin(value);
  else speakTeacher(value);
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
      o.start(t);
      o.stop(t + d + 0.005);
      t += d * 0.8;
    });
  } catch (e) {
    try { actx = null; } catch (e2) {}
  }
}
const sfx = {
  ok: () => beep([[784, .12], [1047, .25]], 'triangle', 0.25),
  bad: () => beep([[220, .18], [180, .25]], 'square', 0.12),
  key: () => beep([[587, .04], [880, .055]], 'triangle', 0.26),
  del: () => beep([[440, .035], [330, .045]], 'triangle', 0.22),
  tone: (t = 1) => {
    const n = +t;
    if (n === 1) beep([[784, .11]], 'triangle', 0.25);
    else if (n === 2) beep([[587, .06], [880, .09]], 'triangle', 0.25);
    else if (n === 3) beep([[659, .05], [494, .05], [784, .08]], 'triangle', 0.25);
    else if (n === 4) beep([[988, .05], [523, .09]], 'triangle', 0.25);
    else beep([[659, .05]], 'triangle', 0.22);
  },
  pop: () => window.ArcadeFX?.sound('pop', S().sound),
  balloonPop: () => window.ArcadeFX?.sound('balloon-pop', S().sound),
  shot: () => window.ArcadeFX?.sound('shot', S().sound),
  cannon: () => window.ArcadeFX?.sound('cannon', S().sound),
  quack: () => window.ArcadeFX?.sound('quack', S().sound),
  waka: () => beep([[340, .05], [460, .06]], 'triangle', 0.14),
  win: () => beep([[523, .15], [659, .15], [784, .15], [1047, .4]], 'triangle', 0.26),
};



// ======================= 界面工具 =======================
const $ = s => document.querySelector(s);
const app = $('#app');
let keyHandler = null;        // 当前接收键盘输入的处理函数
let cleanup = null;           // 离开页面时清理（定时器等）
let onSettingsChange = null;  // 游戏进行中修改设置时的实时刷新回调

function go(render, ...args) {
  if (cleanup) { cleanup(); cleanup = null; }
  keyHandler = null;
  onSettingsChange = null;
  stopAllSpeech();
  window.ArcadeFX?.stop();
  window.scrollTo(0, 0);
  render(...args);
}
function setTitle(t) { $('#topTitle').textContent = t; }
let toastTimer;
function toast(msg, ms = 2200) {
  const t = $('#toast'); t.innerHTML = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function starsHtml(n) { return `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(3 - n)}</span></span>`; }
function confetti(n = 30) {
  const em = ['⭐', '🎉', '✨', '🌟', '🎈', '💖'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'confetti'; d.textContent = em[i % em.length];
    d.style.left = Math.random() * 100 + 'vw';
    d.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
    d.style.animationDelay = Math.random() * .6 + 's';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 4500);
  }
}
const PRAISE = ['太棒了！', '真厉害！', '答对啦！', '好聪明！', '你真行！', '棒棒哒！', '了不起！'];
const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

const TONE_SVG = {
  1: '<svg viewBox="0 0 40 20"><path d="M5 10H35" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/></svg>',
  2: '<svg viewBox="0 0 40 20"><path d="M12 17L28 3" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/></svg>',
  3: '<svg viewBox="0 0 40 20"><path d="M8 4L20 16L32 4" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/></svg>',
  4: '<svg viewBox="0 0 40 20"><path d="M12 3L28 17" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/></svg>',
};
const TONE_NAMES = { 1: '一声平', 2: '二声扬', 3: '三声拐弯', 4: '四声降' };

// ======================= 全局键盘 =======================
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'checkbox') return;
  if (e.isComposing || e.key === 'Process' || e.keyCode === 229) {
    toast('⌨️ 请先切换成<b>英文输入法</b>（按一下 Caps Lock 键或 Ctrl+空格）', 3500);
    return;
  }
  if (!keyHandler) return;
  let k = e.key;
  if (k.length === 1) k = k.toLowerCase();
  if (/^[a-zü]$/.test(k) || /^[0-5]$/.test(k) || k === 'Backspace' || k === 'Enter' || k === ' ') {
    e.preventDefault();
    flashKey(k);
    keyHandler(k);
  }
});
function flashKey(k) {
  const el = document.querySelector(`.key[data-k="${k === ' ' ? 'Enter' : k}"]`);
  if (el) { el.classList.add('pressed'); setTimeout(() => el.classList.remove('pressed'), 120); }
}

// 屏幕键盘（iPad / 触屏也能玩，字母与教材汉语拼音完全一致，声调直接显示符号）
function keyboardHtml(withTones = true) {
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  let h = '<div class="kb">';
  if (withTones) {
    h += '<div class="kb-row tone-row" role="group" aria-label="选择拼音声调">';
    [1, 2, 3, 4].forEach(t => {
      const name = ['一声', '二声', '三声', '四声'][t - 1];
      h += `<button class="key tone t${t}" data-k="${t}" title="${TONE_NAMES[t]}，数字键 ${t}" aria-label="${name}" aria-pressed="false"><span class="tone-svg-wrap">${TONE_SVG[t]}</span><span class="tone-name">${name}</span></button>`;
    });
    h += '<button class="key tone t0" data-k="0" title="轻声，数字键 0" aria-label="轻声" aria-pressed="false">轻声</button>';
    h += '<button class="key wide ok" data-k="Enter">✓ 确定</button></div>';
  }
  rows.forEach((r, ri) => {
    h += '<div class="kb-row">';
    [...r].forEach(c => {
      const pyChar = c === 'v' ? 'ü' : c;
      h += `<button class="key" data-k="${c}">${renderPy(pyChar)}</button>`;
    });
    if (ri === 2) h += '<button class="key wide del" data-k="Backspace">⌫ 删除</button>';
    h += '</div>';
  });
  if (!withTones) h += '<div class="kb-row"><button class="key wide ok" data-k="Enter">✓ 确定</button></div>';
  return h + '</div>';
}
function syncToneSelection(buffer, tone) {
  const value = tone !== undefined ? tone : /[0-5]$/.test(buffer || '') ? +buffer.slice(-1) : null;
  app.querySelectorAll('.key.tone').forEach(button => {
    const selected = value !== null && +(button.dataset.k) === (value === 5 ? 0 : value);
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function bindKeyboard(root) {
  root.querySelectorAll('.key').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.k;
    flashKey(k);
    if (keyHandler) keyHandler(k);
  }));
}

function inputPanelHtml(withTones = true) {
  return `<div class="kb-mount" data-tones="${withTones ? '1' : '0'}">${S().showKb ? keyboardHtml(withTones) : ''}</div>`;
}
function syncKeyboardMount() {
  const mount = app.querySelector('.kb-mount');
  if (mount) {
    const withTones = mount.dataset.tones === '1';
    mount.innerHTML = S().showKb ? keyboardHtml(withTones) : '';
    bindKeyboard(mount);
  }
  const kbCard = app.querySelector('.kb-card');
  if (kbCard) {
    kbCard.classList.toggle('hidden', !S().showKb);
  }
}
function applySettingsLive() {
  window.ArcadeFX?.setEnabled(S().sound);
  if (!S().sound) stopAllSpeech();
  syncKeyboardMount();
  if (typeof onSettingsChange === 'function') {
    try { onSettingsChange(); } catch (e) {}
  }
}
function highlightKey(k) {
  document.querySelectorAll('.key.next').forEach(e => e.classList.remove('next'));
  if (!k) return;
  const el = document.querySelector(`.key[data-k="${k}"]`);
  if (el) el.classList.add('next');
}

// ======================= 首页 =======================
function homeScreen() {
  setTitle('拼音小勇士');
  const mc = Object.keys(save.mistakes).length;
  app.innerHTML = `
    ${window.LearningTheme?.heroHtml() || ''}
    <div class="hero">
      <h1>🦸 拼音小勇士</h1>
      <p>人教版（部编）《语文》一年级上册 · 课文、汉语拼音、识字表、写字表 100% 同步！</p>
    </div>
    <div class="textbook-bar card">
      <div class="tb-head">📚 <b>课本三大栏目同步学</b> <span class="sub">（与课本目录、课文原文、儿歌、词语完全对应）</span></div>
      <div class="tb-grid">
        <button class="tb-btn" style="--c:#4fb3e8" data-cat="识字">
          <span class="tb-icon">📖</span>
          <div>
            <div class="tb-title">识字栏目（第一、六单元）</div>
            <div class="tb-desc">1 天地人 · 2 金木水火土 · 3 口耳目手足 · 4 日月山川 · 5 对韵歌 · 6 日月明 · 7 小书包 · 8 升国旗</div>
          </div>
        </button>
        <button class="tb-btn" style="--c:#5cc68d" data-cat="汉语拼音">
          <span class="tb-icon">🔤</span>
          <div>
            <div class="tb-title">汉语拼音栏目（第二、三、四单元）</div>
            <div class="tb-desc">1 a o e ～ 14 ang eng ing ong · 整体认读音节 · 课本拼读、看图词语、儿歌、生字</div>
          </div>
        </button>
        <button class="tb-btn" style="--c:#f5a623" data-cat="阅读">
          <span class="tb-icon">📗</span>
          <div>
            <div class="tb-title">阅读栏目（第五、七、八单元）</div>
            <div class="tb-desc">1 秋天 · 2 江南 · 3 雪地里的小画家 · 4 四季 · 5 小小的船 · 6 影子 · 7 两件宝 · 8 比尾巴 · 9 乌鸦喝水 · 10 雨点儿</div>
          </div>
        </button>
      </div>
    </div>
    <div class="row center" style="margin-bottom:18px"><button class="btn green" id="interestReading">🚗 汽车与我的世界 · 兴趣阅读</button></div>
    <div class="mode-grid">
      <button class="mode-card" style="background:linear-gradient(135deg,#5cc68d,#3aa876)" data-go="pinyin">
        <div class="emoji">🔤</div><h2>汉语拼音（14 课）</h2><p>第二～四单元 a o e 到 ang eng ing ong<br>含课本音节、看图词语、儿歌与生字</p><div class="big-bg">ɑoe</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#4fb3e8,#2f8fd0)" data-go="chars">
        <div class="emoji">🏯</div><h2>识字·阅读·课文闯关</h2><p>第一～八单元全部课文原文 + 语文园地<br>识字表 280 字 + 写字表 100 字</p><div class="big-bg">字</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#e11d48,#be123c)" data-go="write">
        <div class="emoji">🖌️</div><h2>田字格写汉字</h2><p>课本写字表 100 字 + 识字表 280 字<br>用手写笔一笔一画描红练笔顺！</p><div class="big-bg">写</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#f5a623,#f07f1e)" data-go="tone">
        <div class="emoji">🎵</div><h2>声调小精灵</h2><p>一声平、二声扬<br>三声拐弯、四声降</p><div class="big-bg">ǎ</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#e86b9a,#c94f80)" data-go="balloon">
        <div class="emoji">🎈</div><h2>气球大作战</h2><p>气球飞上天<br>快打出拼音把它戳破！</p><div class="big-bg">🎈</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#9b7be0,#6f52b8)" data-go="duck">
        <div class="emoji">🦆</div><h2>打野鸭</h2><p>野鸭飞过芦苇荡<br>快打拼音瞄准击落它！</p><div class="big-bg">🦆</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#ffb703,#e85d04)" data-go="pacman">
        <div class="emoji">🟡</div><h2>拼音吃豆人</h2><p>迷宫里吃掉汉字能量豆<br>小心别被小幽灵抓到！</p><div class="big-bg">ᗧ</div>
      </button>
      <button class="mode-card" style="background:linear-gradient(135deg,#4d7c0f,#15803d)" data-go="tank">
        <div class="emoji">🛡️</div><h2>坦克保卫战</h2><p>敌方坦克逼近大本营<br>打拼音发射炮弹轰碎它！</p><div class="big-bg">💥</div>
      </button>
    </div>
    <div class="mini-links">
      <button class="btn purple" data-go="mistakes">📒 错题本 ${mc ? `(${mc})` : ''}</button>
      <button class="btn blue" data-go="stickers">🏆 我的贴纸 (${stickerCount()}/${STICKERS.length})</button>
      <button class="btn gray" data-go="help">👨‍👩‍👦 家长说明</button>
    </div>`;
  if ($('#interestReading')) $('#interestReading').onclick=()=>go(charListScreen,'课外阅读');
  const modeAnnounce = {
    pinyin: '汉语拼音',
    chars: '识字与阅读闯关',
    write: '田字格写汉字',
    tone: '声调小精灵',
    balloon: '气球大作战',
    duck: '打野鸭',
    pacman: '拼音吃豆人',
    tank: '坦克保卫战',
    mistakes: '错题本',
    stickers: '我的贴纸',
    help: '家长说明'
  };
  app.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.go;
    const m = { pinyin: pinyinListScreen, tone: toneHomeScreen, chars: () => charListScreen('all'), write: hanziWriteListScreen, balloon: balloonSetupScreen, duck: duckSetupScreen, pacman: pacmanSetupScreen, tank: tankSetupScreen, mistakes: mistakesScreen, stickers: stickerScreen, help: helpScreen };
    sfx.ok();
    go(m[key]);
    if (modeAnnounce[key]) speak(modeAnnounce[key]);
  }));
  app.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
    const cat = b.dataset.cat;
    sfx.ok();
    if (cat === '汉语拼音') {
      go(pinyinListScreen);
      speak('汉语拼音栏目');
    } else {
      go(charListScreen, cat);
      speak(cat + '栏目');
    }
  }));
}

// ======================= 拼音乐园（第二～四单元 · 汉语拼音） =======================
function pinyinListScreen() {
  setTitle('🔤 汉语拼音（第二～四单元）');
  const groups = [
    { title: '第二单元 · 汉语拼音（单韵母 + 声母）', color: '#5cc68d', indices: [0, 1, 2, 3], yuandiId: 'y2', yuandiName: '语文园地二（识字加油站 · 日积月累《画》）' },
    { title: '第三单元 · 汉语拼音（声母 + 整体认读音节）', color: '#34b3a0', indices: [4, 5, 6, 7, 8], yuandiId: 'y3', yuandiName: '语文园地三（课程表识字 · 成语日积月累）' },
    { title: '第四单元 · 汉语拼音（复韵母 + 鼻韵母 + 整体认读音节）', color: '#209cee', indices: [9, 10, 11, 12, 13], yuandiId: 'y4', yuandiName: '语文园地四（时间识字 · 古诗《悯农》）' },
    { title: '汉语拼音总复习 · 整体认读音节总表（16 个）', color: '#e86b9a', indices: [14], yuandiId: null }
  ];

  let h = `<div class="screen-title">🔤 汉语拼音栏目 <span class="sub">课本第二、三、四单元 · 共 14 课 + 语文园地二～四</span></div>
    <div class="cat-tabs">
      <button class="cat-tab active">🔤 汉语拼音 14 课详学</button>
      <button class="cat-tab" id="goCharPy">📋 按识字表看汉语拼音生字</button>
      <button class="cat-tab" id="goAllUnits">📚 查看全部八个单元目录</button>
    </div>`;

  groups.forEach(g => {
    h += `<div class="unit"><div class="unit-title" style="background:${g.color}">${g.title}</div><div class="lesson-grid">`;
    g.indices.forEach(i => {
      const l = PINYIN_LESSONS[i];
      const st = Math.max(save.stars['letter:' + l.id] || 0, save.stars['syl:' + l.id] || 0);
      const charLesson = l.charLessonId ? ALL_LESSONS.find(x => x.id === l.charLessonId) : null;
      const charListStr = charLesson ? LESSON_ITEMS[charLesson.id].map(x => x.char).join(' ') : '单韵母四声练习';
      h += `<button class="lesson-card" style="--c:${g.color}" data-i="${i}">
        <div class="ln-row"><span class="ln">${i < 14 ? `第 ${i + 1} 课` : '总复习'} · ${l.name}</span><span class="pg-badge">${l.page}</span></div>
        <div class="lp">${l.id === 'p15' ? '<span style="font-size:18px">zhi chi shi ri zi ci si…</span>' : l.items.map(x => renderPy(x)).join(' ')}</div>
        ${l.zhengti && l.zhengti.length ? `<div class="zt-line">整体认读：${l.zhengti.map(x => renderPy(x)).join(' ')}</div>` : ''}
        <div class="lc" style="font-size:15px">📖 ${l.rhymeTitle.replace(/^[^\s]+\s*/, '')}｜生字：${charListStr}</div>
        ${starsHtml(st)}
      </button>`;
    });
    if (g.yuandiId) {
      const yl = ALL_LESSONS.find(x => x.id === g.yuandiId);
      const yChars = yl ? LESSON_ITEMS[yl.id].map(x => x.char).join(' ') : '';
      h += `<button class="lesson-card" style="--c:${g.color}" data-char-id="${g.yuandiId}">
        <div class="ln-row"><span class="ln">📒 ${yl.name}</span><span class="pg-badge">${yl.page}</span></div>
        <div class="lc" style="font-size:15px;white-space:normal">${g.yuandiName}</div>
        <div class="lc">生字：${yChars}</div>
        ${starsHtml(save.stars['char:' + g.yuandiId] || 0)}
      </button>`;
    }
    h += `</div></div>`;
  });

  app.innerHTML = h;
  $('#goCharPy').onclick = () => { sfx.ok(); go(charListScreen, '汉语拼音'); speak('按识字表看生字'); };
  $('#goAllUnits').onclick = () => { sfx.ok(); go(charListScreen, 'all'); speak('全部八个单元目录'); };
  app.querySelectorAll('.lesson-card[data-i]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i;
    const l = PINYIN_LESSONS[i];
    sfx.ok();
    go(pinyinLessonScreen, i);
    if (l && !window.QUESTION_LEARNING?.['h'+(i+1)]) speak(i < 14 ? `第 ${i + 1} 课，${l.name}` : l.name);
  }));
  app.querySelectorAll('.lesson-card[data-char-id]').forEach(b => b.addEventListener('click', () => {
    const yl = ALL_LESSONS.find(x => x.id === b.dataset.charId);
    sfx.ok();
    go(charLessonScreen, b.dataset.charId);
    if (yl) speak(yl.name);
  }));
}

function knownLetters(upto) {
  const s = new Set();
  PINYIN_LESSONS.slice(0, upto + 1).forEach(l => {
    l.items.forEach(x => s.add(x));
    if (l.zhengti) l.zhengti.forEach(x => s.add(x));
  });
  return s;
}

function speakSyllable(sylStr) {
  speakPinyin(sylStr);
}

function pinyinLessonScreen(i, original = false) {
  if (!original && window.QUESTION_LEARNING?.['h'+(i+1)]) return questionLearningHome('h'+(i+1));
  const l = PINYIN_LESSONS[i];
  const charLesson = l.charLessonId ? ALL_LESSONS.find(x => x.id === l.charLessonId) : null;
  const charItems = charLesson ? LESSON_ITEMS[charLesson.id] : [];
  setTitle('🔤 ' + l.name);

  let h = `<div class="screen-title">
      <button class="btn small gray" id="back">← 返回</button>
      <span>${l.unit} · ${i < 14 ? `第 ${i + 1} 课` : ''} ${l.name}</span>
      <span class="pg-badge">${l.page}</span>
    </div>
    <p class="sub">👆 点一点字母、音节、词语和儿歌，跟着课本一起读一读、练一练！</p>

    <div class="section-block">
      <div class="sec-head">① 本课${l.typeLabel}（点卡片听发音）</div>
      <div class="letter-grid">`;
  l.items.forEach(x => {
    const info = LETTER_INFO[x] || {};
    h += `<button class="letter-card" data-x="${x}"><div class="em">${info.emoji || ''}</div><div class="lt">${renderPy(x)}</div><div class="rh">${info.rhyme || ''}</div></button>`;
  });
  h += `</div></div>`;

  if (l.zhengti && l.zhengti.length) {
    h += `<div class="section-block">
      <div class="sec-head">② 本课整体认读音节（不用拼，直接整体认读）</div>
      <div class="letter-grid">`;
    l.zhengti.forEach(x => {
      const info = LETTER_INFO[x] || {};
      h += `<button class="letter-card zt-card" data-x="${x}"><div class="em">${info.emoji || '⭐'}</div><div class="lt">${renderPy(x)}</div><div class="rh">整体认读：${info.rhyme || info.say || x}</div></button>`;
    });
    h += `</div></div>`;
  }

  if (l.syllables && l.syllables.length) {
    h += `<div class="section-block card">
      <div class="sec-head" style="margin-top:0">③ 课本拼读音节表（点音节听读音）</div>
      <div class="syl-pill-grid">`;
    l.syllables.forEach(s => {
      const p = parsePinyin(s);
      const hintChar = (SYL_SPEAK_MAP[p.plain + p.tone] && SYL_SPEAK_MAP[p.plain + p.tone].char) || EXTRA_SYL_SPEAK[p.plain + p.tone] || '';
      h += `<button class="syl-pill" data-syl="${escapeHtml(s)}">
        <span class="sp-py">${renderPy(p.plain, p.tone)}</span>
        ${hintChar ? `<span class="sp-hz">${hintChar}</span>` : ''}
      </button>`;
    });
    h += `</div></div>`;
  }

  if (l.words && l.words.length) {
    h += `<div class="section-block card">
      <div class="sec-head" style="margin-top:0">④ 课本看图学词语（点词语听读音）</div>
      <div class="word-card-grid">`;
    l.words.forEach(w => {
      const hz = w.trim().split(/\s+/)[0];
      h += `<button class="word-pill" data-word="${escapeHtml(hz)}">${renderWordRuby(w)}</button>`;
    });
    h += `</div></div>`;
  }

  if (l.rhymeLines && l.rhymeLines.length) {
    const fullRhyme = l.rhymeLines.join('');
    h += `<div class="section-block card textbook-box">
      <div class="tb-box-head">
        <span>⑤ ${l.rhymeTitle}</span>
        <button class="btn small green" id="readRhyme">🔊 朗读儿歌</button>
      </div>
      <div class="tb-lines">
        ${l.rhymeLines.map(line => `<div class="tb-line" data-line="${escapeHtml(line)}" title="点击朗读这一句">🔊 ${escapeHtml(line)}</div>`).join('')}
      </div>
    </div>`;
  }

  if (charItems.length) {
    h += `<div class="section-block card">
      <div class="tb-box-head">
        <span>⑥ 本课会认生字（识字表 · 共 ${charItems.length} 个字）</span>
        <button class="btn small blue" id="goCharLesson">🏯 进入本课生字闯关 →</button>
      </div>
      <div class="char-grid" style="margin-top:10px">
        ${charItems.map((c, idx) => `<button class="char-card" data-ci="${idx}"><div>${renderPy(c.plain, c.tone)}</div><div class="hz">${c.char}</div><div class="wd">${c.word}</div></button>`).join('')}
      </div>
    </div>`;
  }

  h += `<div class="row center" style="margin-top:26px">
      <button class="btn green" id="m1">⌨️ 找字母（打字母）</button>
      <button class="btn orange" id="m2">🎵 课本音节打字（带声调）</button>
      ${charItems.length ? `<button class="btn blue" id="m3">🏯 打本课生字（${charItems.map(c => c.char).join('')}）</button>` : ''}
    </div>
    <p class="sub center" style="text-align:center;margin-top:12px">${renderPy('ü')} 在键盘上用 <b>v</b> 键来打哦！</p>`;

  app.innerHTML = h;
  $('#back').onclick = () => { sfx.ok(); go(pinyinListScreen); };
  app.querySelectorAll('.letter-card').forEach(b => b.addEventListener('click', () => {
    const x = b.dataset.x;
    sfx.pop();
    speakPinyin(x);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }));
  app.querySelectorAll('.syl-pill').forEach(b => b.addEventListener('click', () => {
    sfx.pop();
    speakSyllable(b.dataset.syl);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }));
  app.querySelectorAll('.word-pill').forEach(b => b.addEventListener('click', () => {
    sfx.pop();
    speak(b.dataset.word);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }));
  app.querySelectorAll('.tb-line').forEach(el => el.addEventListener('click', () => {
    sfx.pop();
    speak(el.dataset.line);
  }));
  if ($('#readRhyme')) $('#readRhyme').onclick = () => { sfx.ok(); speak(l.rhymeLines.join(' ')); };
  if ($('#goCharLesson')) $('#goCharLesson').onclick = () => {
    sfx.ok();
    go(charLessonScreen, l.charLessonId);
    speak('本课生字闯关');
  };
  app.querySelectorAll('.char-card[data-ci]').forEach(b => b.addEventListener('click', () => {
    sfx.pop();
    speakItem(charItems[+b.dataset.ci]);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }));

  $('#m1').onclick = () => {
    sfx.ok();
    const baseLetters = [...l.items, ...(l.zhengti || [])];
    let items = [...baseLetters, ...baseLetters];
    const prev = PINYIN_LESSONS.slice(0, i).flatMap(x => x.items);
    items = items.concat(shuffle(prev).slice(0, 4));
    go(startRound, { title: `找字母 · ${l.name}`, items: shuffle(items.map(letterItem)), requireTone: false, starKey: 'letter:' + l.id, back: () => go(pinyinLessonScreen, i) });
    speak('找字母');
  };
  $('#m2').onclick = () => {
    sfx.ok();
    go(startRound, { title: `课本音节打字 · ${l.name}`, items: sylItemsFor(i), requireTone: true, starKey: 'syl:' + l.id, back: () => go(pinyinLessonScreen, i), mode: 'syl' });
    speak('课本音节打字');
  };
  if ($('#m3')) {
    $('#m3').onclick = () => {
      sfx.ok();
      go(startRound, { title: `本课生字闯关 · ${l.name}`, items: roundItems(charItems), requireTone: true, starKey: 'char:' + l.charLessonId, back: () => go(pinyinLessonScreen, i) });
      speak('生字闯关');
    };
  }
}

// 单韵母带声调（用于第1、2课，以及音节不够时补充）
const VOWEL_TONE_SPEAK = { i: ['衣', '姨', '椅', '艺'], u: ['乌', '无', '五', '雾'], 'ü': ['迂', '鱼', '雨', '玉'], e: ['婀', '鹅', '恶', '饿'], a: ['啊', '啊', '啊', '啊'], o: ['喔', '哦', '喔', '哦'] };
function vowelToneItems(vowels) {
  const out = [];
  vowels.forEach(v => [1, 2, 3, 4].forEach(t => out.push({ type: 'syl', plain: v, tone: t, key: v.replace('ü', 'v'), speak: (VOWEL_TONE_SPEAK[v] || [])[t - 1], id: v + t })));
  return out;
}
function sylItemsFor(i) {
  const n = S().roundSize;
  const l = PINYIN_LESSONS[i];
  const seen = new Set(), lessonPool = [];

  // 优先把本课课本上的拼读音节和本课生字加入题库
  if (l.charLessonId && LESSON_ITEMS[l.charLessonId]) {
    LESSON_ITEMS[l.charLessonId].forEach(c => {
      if (!c.tone) return;
      const k = c.key + c.tone;
      seen.add(k);
      lessonPool.push({ type: 'syl', plain: c.plain, tone: c.tone, key: c.key, char: c.char, word: c.word, speak: c.speak, id: c.id });
    });
  }
  (l.syllables || []).forEach(s => {
    const p = parsePinyin(s);
    if (!p.tone) return;
    const k = p.key + p.tone;
    if (seen.has(k)) return;
    seen.add(k);
    const mapHit = SYL_SPEAK_MAP[p.plain + p.tone];
    const extraSpeak = EXTRA_SYL_SPEAK[p.plain + p.tone];
    lessonPool.push({
      type: 'syl', plain: p.plain, tone: p.tone, key: p.key,
      char: mapHit ? mapHit.char : (extraSpeak || ''),
      word: mapHit ? mapHit.word : '课本拼读音节',
      speak: mapHit ? mapHit.speak : (extraSpeak || s),
      id: 'syl_' + k
    });
  });

  let items = shuffle(lessonPool).slice(0, n);
  if (items.length < n) {
    const known = knownLetters(i);
    if (i >= 14) PINYIN_LESSONS.forEach(x => x.items.forEach(y => known.add(y)));
    const pool = [];
    ALL_CHAR_ITEMS.forEach(c => {
      if (!c.tone) return;
      const k = c.key + c.tone;
      if (seen.has(k) || !sylKnown(c.plain, known)) return;
      seen.add(k);
      pool.push({ type: 'syl', plain: c.plain, tone: c.tone, key: c.key, char: c.char, word: c.word, speak: c.speak, id: c.id });
    });
    items = items.concat(shuffle(pool).slice(0, n - items.length));
  }
  if (items.length < n) {
    const known = knownLetters(i);
    const vowels = ['a', 'o', 'e', 'i', 'u', 'ü'].filter(v => known.has(v));
    items = items.concat(shuffle(vowelToneItems(vowels)).slice(0, n - items.length));
  }
  return shuffle(items);
}

// ======================= 汉字闯关（识字 · 汉语拼音 · 阅读） =======================
let currentCharFilter = 'all';
function charListScreen(filterCat) {
  if (typeof filterCat === 'string') currentCharFilter = filterCat;
  const cat = currentCharFilter || 'all';
  setTitle('🏯 课本同步：识字 · 汉语拼音 · 阅读');

  const tabs = [
    ['all', '📚 全部课本单元（第一～八单元）'],
    ['识字', '📖 识字栏目（第一、六单元）'],
    ['汉语拼音', '🔤 汉语拼音栏目（第二～四单元）'],
    ['阅读', '📗 阅读栏目（第五、七、八单元）'],
    ['数学识字', '🔷 数学识字素材'],
    ['试卷专项', '📝 试卷专项识字'],
    ['课外阅读', '🚗 课外兴趣阅读']
  ];

  let h = `<div class="screen-title">🏯 课本同步学习与闯关 <span class="sub">识字表 280 字 · 写字表 100 字 · 课文原文全收录</span></div>
    <div class="cat-tabs">
      ${tabs.map(([k, label]) => `<button class="cat-tab ${cat === k ? 'active' : ''}" data-f="${k}">${label}</button>`).join('')}
    </div>`;

  CHAR_UNITS.filter(u => cat === 'all' || u.category === cat).forEach(u => {
    h += `<div class="unit">
      <div class="unit-title" style="background:${u.color}">${u.unit} <span style="opacity:.85;font-size:14px;font-weight:600">（${u.supplemental ? '拓展素材' : '课本「' + u.category + '」栏目'}）</span></div>
      <div class="lesson-grid">`;
    u.lessons.forEach(l => {
      const cItems = LESSON_ITEMS[l.id] || [];
      const isPurePy = cItems.length === 0 && l.pinyinLessonIdx !== undefined;
      const st = isPurePy
        ? Math.max(save.stars['letter:p' + (l.pinyinLessonIdx + 1)] || 0, save.stars['syl:p' + (l.pinyinLessonIdx + 1)] || 0)
        : (save.stars['char:' + l.id] || 0);
      const textPreview = (l.text && l.text[0]) ? l.text[0] : '';
      h += `<button class="lesson-card" style="--c:${u.color}" data-id="${l.id}">
        <div class="ln-row"><span class="ln">${l.name}</span><span class="pg-badge">${l.page || ''}</span></div>
        ${textPreview ? `<div class="lt-preview">${escapeHtml(textPreview)}</div>` : ''}
        <div class="lc">${isPurePy ? '🔤 单韵母与四声练习' : `生字(${cItems.length})：` + cItems.map(x => x.char).join('')}</div>
        ${l.writeChars && l.writeChars.length ? `<div class="write-preview">✍️ 会写：${l.writeChars.map(w => w.split(' ')[0]).join(' ')}</div>` : ''}
        ${starsHtml(st)} ${save.stars['tone:' + l.id] ? '<span title="声调练习">🎵</span>' : ''}
      </button>`;
    });
    h += '</div></div>';
  });
  app.innerHTML = h;
  app.querySelectorAll('.cat-tab').forEach(b => b.addEventListener('click', () => {
    sfx.ok();
    go(charListScreen, b.dataset.f);
  }));
  app.querySelectorAll('.lesson-card').forEach(b => b.addEventListener('click', () => {
    const l = ALL_LESSONS.find(x => x.id === b.dataset.id);
    sfx.ok();
    if (l && (!l.items || !l.items.length) && l.pinyinLessonIdx !== undefined) {
      go(pinyinLessonScreen, l.pinyinLessonIdx);
      if (l && !window.QUESTION_LEARNING?.[l.id]) speak(l.name);
    } else {
      go(charLessonScreen, b.dataset.id);
      if (l && !window.QUESTION_LEARNING?.[l.id]) speak(l.name);
    }
  }));
}

// 题意理解练习：每次抽取一组题，原字卡与历史记录保持原样。
// 逐字拼音与点读。点字只朗读，不会提交选项。
function questionReading(text) {
  const value=String(text),pinyin=(window.QUESTION_PINYIN||{})[value]||[];
  let html='';
  for(let i=0;i<value.length;i++){
    const c=value[i],py=pinyin[i];
    if(py){html+=`<button type="button" class="ql-read-char" data-read-char="${escapeHtml(c)}" data-read-py="${escapeHtml(py)}" aria-label="${escapeHtml(c+'，'+py)}"><ruby>${escapeHtml(c)}<rt>${escapeHtml(py)}</rt></ruby></button>`;}
    else if(/[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(c)){
      const token=value.slice(i).match(/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+[0-5]?/i)[0];
      html+=`<button type="button" class="ql-read-syl" data-read-syl="${escapeHtml(token)}" aria-label="听拼音 ${escapeHtml(token)}">${escapeHtml(token)}</button>`;i+=token.length-1;
    }else html+=`<span class="ql-reading-punctuation">${escapeHtml(c)}</span>`;
  }
  return `<span class="ql-reading">${html}</span>`;
}
function bindQuestionReading(root=app){
  root.querySelectorAll('[data-read-char]').forEach(button=>button.onclick=e=>{
    e.stopPropagation();const char=button.dataset.readChar,py=button.dataset.readPy;
    const uri=(window.QUESTION_CHARACTER_VOICE||{})[char+'|'+py];
    if(uri){if(S().sound)playRecording(uri,()=>toast('请再点一次听读音'),{type:'pinyin'});}
    else{const parsed=parsePinyin(py);speakPinyin(parsed.plain,parsed.tone);}
  });
  root.querySelectorAll('[data-read-syl]').forEach(button=>button.onclick=e=>{e.stopPropagation();speakPinyin(button.dataset.readSyl);});
}
function questionPicture(visual){
 if(!visual)return '';
 return `<div class="ql-picture"><div class="ql-picture-caption">${questionReading(visual.caption||'看图想一想')}</div><div class="ql-picture-items ${escapeHtml(visual.layout||'cards')}">${visual.items.map(item=>`<figure class="ql-figure">${window.QuestionIllustrations?.render(item.symbol)||''}${item.label?`<figcaption>${questionReading(item.label)}</figcaption>`:''}</figure>`).join('')}</div></div>`;
}
function questionTheme(unit){return unit.extracurricular?(unit.icon==='🚗'?'cars':'blocks'):(window.LearningTheme?.get()||'cars');}
function questionLearningHome(id, chapterId) {
  const unit = window.QUESTION_LEARNING[id];
  const chapter=unit.chapters.find(c=>c.id===chapterId)||unit.chapters[0];
  const theme=questionTheme(unit);
  setTitle(unit.title);
  const groups = [...new Set(unit.questions.map(q => q.group))];
  const items = LESSON_ITEMS[id] || [];
  const chapterText=[...(chapter.words||[]),...(chapter.story||[])].join('');
  const pool=items.filter(item=>chapterText.includes(item.char));
  const lessonItems=pool.length?pool:items;
  const writingItems = lessonItems.filter(item => (window.HANZI_STROKE_DATA || {})[item.char]);
  const story=chapter.themeStories?.[theme]||chapter.story||[];
  const pinyinIndex=unit.pinyinLessonIdx;
  app.innerHTML = `<div class="ql-shell ql-home" data-unit="${escapeHtml(id)}" data-chapter="${escapeHtml(chapter.id)}">
    <div class="ql-breadcrumb"><button class="btn small gray" id="ql-back">← 返回单元目录</button><span>${escapeHtml(unit.sourceUnit||unit.title)}</span><span>→ ${escapeHtml(chapter.name)}</span></div>
    <div class="ql-home-heading"><div class="ql-unit-icon">${window.QuestionIllustrations?.render(theme==='cars'?'car':'pixel-house')}</div><div><div class="ql-eyebrow">${theme==='cars'?'汽车学习城 · 知识加油站':'方块学习世界 · 小小建造师'}</div><h1>${escapeHtml(unit.title)}</h1><p>${escapeHtml(unit.subtitle)}</p></div></div>
    ${unit.chapters.length>1?`<div class="ql-chapters" aria-label="选择章节">${unit.chapters.map((c,i)=>`<button class="ql-chapter" data-chapter-choice="${escapeHtml(c.id)}" aria-pressed="${c.id===chapter.id}"><span class="ql-chapter-num">第 ${i+1} 站 · ${unit.questions.filter(q=>q.chapter===c.id).length} 题</span><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.page)}</small></button>`).join('')}</div>`:''}
    <div class="ql-theme-scene">${window.QuestionIllustrations?.render(theme==='cars'?'car':'grass-block')}<span>${escapeHtml(chapter.name)} · 今天只练这一章</span></div>
    ${story.length?`<section class="ql-story"><div class="ql-story-header"><h2>📖 ${chapter.themeStories?'主题改编小故事':'先读一读'}</h2><span class="ql-reading-help">点一个字，读一个字</span></div><p class="ql-reading-help">每个字上方有拼音，点一下字就能听读音。</p>${story.map(line=>`<p class="ql-story-line">${questionReading(line)}</p>`).join('')}${chapter.storyVisual?questionPicture(chapter.storyVisual):''}</section>`:''}
    <div class="ql-word-strip">${(chapter.words||[]).map(word=>`<div class="ql-word">${questionReading(word)}</div>`).join('')}</div>
    <div class="ql-modes">${groups.map((group, i) => `<button class="ql-mode" data-group="${i}"><span class="ql-mode-icon">${i?'🌟':'🔎'}</span><strong>${escapeHtml(group)}</strong><span>${i?'读懂内容，学习知识':'认识题目在说什么'}</span><span class="ql-mode-count">本章 ${unit.questions.filter(q=>q.group===group&&q.chapter===chapter.id).length} 题 · 本单元共 ${unit.questions.filter(q=>q.group===group).length} 题</span><b>抽 4 题，练一练 →</b></button>`).join('')}</div>
    <div class="ql-section-title">✏️ 本章字音与书写</div>
    <div class="ql-skills"><button class="ql-skill" id="ql-pinyin"><b>🔤 拼音闯关</b><span>听读音、拼字母</span></button><button class="ql-skill" id="ql-tone"><b>🎵 声调练习</b><span>分清一二三四声</span></button><button class="ql-skill" id="ql-write" ${writingItems.length?'':'disabled'}><b>🖌️ 田字格手写</b><span>${writingItems.length?`本章 ${writingItems.length} 字可描红`:'本课先练拼音认读'}</span></button></div>
    <button class="btn blue ql-library" id="ql-library">📚 打开原课内容、字卡与练习</button>
    <p class="ql-source">${escapeHtml(chapter.page)}${chapter.themeStories?' · 兴趣故事为原创改编，学习目标与原课一致。':''}</p>
    ${chapter.sources?`<p class="ql-source">资料参考：${chapter.sources.map(s=>`<a target="_blank" rel="noopener" href="${escapeHtml(s.url)}">${escapeHtml(s.title)}</a>`).join(' · ')}。短文为项目原创启蒙读物。</p>`:''}
  </div>`;
  $('#ql-back').onclick = () => go(charListScreen,unit.extracurricular?'课外阅读':currentCharFilter);
  $('#ql-library').onclick = () => pinyinIndex!==undefined?go(pinyinLessonScreen,pinyinIndex,true):go(charLessonScreen,id,true);
  const back=()=>go(questionLearningHome,id,chapter.id);
  $('#ql-pinyin').onclick = () => pinyinIndex!==undefined
    ?go(startRound,{title:'本课拼音闯关',items:PINYIN_LESSONS[pinyinIndex].items.map(letterItem),requireTone:false,starKey:'letter:'+PINYIN_LESSONS[pinyinIndex].id,back})
    :go(startRound,{title:'本章拼音闯关',items:roundItems(lessonItems),requireTone:true,starKey:'char:'+id,back});
  $('#ql-tone').onclick = () => {const tones=pinyinIndex!==undefined?sylItemsFor(pinyinIndex):lessonItems.filter(item=>item.tone);go(startToneRound,{title:'本章声调练习',items:roundItems(tones),starKey:'tone:'+id,back});};
  $('#ql-write').onclick=()=>go(hanziWriteScreen,{title:'本章田字格手写',items:writingItems,startIdx:0,starKey:'write:'+id,back});
  app.querySelectorAll('[data-chapter-choice]').forEach(b=>b.onclick=()=>go(questionLearningHome,id,b.dataset.chapterChoice));
  app.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>startQuestionChapter(id,chapter.id,groups[Number(b.dataset.group)]));
  bindQuestionReading();
}
function startQuestionChapter(id,chapterId,group){
 const unit=window.QUESTION_LEARNING[id],theme=questionTheme(unit);
 const questions=shuffle(unit.questions.filter(q=>q.chapter===chapterId&&q.group===group)).slice(0,4).sort((a,b)=>(a.level||1)-(b.level||1)).map(q=>({...q,prompt:q.variants?.[theme]?.prompt||q.prompt,theme,choices:shuffle(q.options.map((text,index)=>({text,correct:index===q.answer})))}));
 go(questionLearningRound,id,group,questions,0,0);
}
let lastEncouragement = '';
function learningPraise(kind) {
  const pool = (window.QUESTION_ENCOURAGEMENT || {})[kind] || ['答对啦！'];
  const choices = pool.filter(text => text !== lastEncouragement);
  const text = choices[Math.floor(Math.random() * choices.length)] || pool[0];
  lastEncouragement = text;
  return text;
}
function questionLearningRound(id, group, questions, index, correctCount) {
  const q=questions[index],unit=window.QUESTION_LEARNING[id],chapter=unit.chapters.find(c=>c.id===q.chapter);
  let answered=false,missed=false;
  setTitle(chapter.name+' · '+group);
  app.innerHTML=`<div class="ql-shell ql-round">
    <div class="ql-round-head"><button class="btn small gray" id="ql-quit">← 返回本章</button><span>${escapeHtml(chapter.name)} · ${escapeHtml(group)}</span><b>${index+1} / ${questions.length}</b></div>
    <div class="ql-star-trail" aria-label="完成一题，点亮一颗星">${questions.map((_,i)=>`<span class="${i<index?'lit':''}" data-star="${i}">${i<index?'⭐':'☆'}</span>`).join('')}<small>认真练一题，点亮一颗星</small></div>
    <div class="ql-progress" aria-label="练习进度"><span style="width:${100*(index+1)/questions.length}%"></span></div>
    <div class="ql-theme-scene">${window.QuestionIllustrations?.render(q.theme==='cars'?'car':'grass-block')}<span>${q.theme==='cars'?'汽车学习卡':'方块学习牌'} · ${escapeHtml(q.skill)}</span></div>
    <div class="ql-stimulus"><div class="ql-question"><div class="ql-question-label">🔎 自己读题，仔细看图</div><h2>${questionReading(q.prompt)}</h2><p class="ql-reading-help">点字听读音；选好后，点“选这个”。</p></div>
    ${questionPicture(q.visual)}</div>
    <div class="ql-options">${q.choices.map((c,i)=>`<div class="ql-option-row"><div class="ql-choice-panel" data-choice-panel="${i}"><div class="ql-option-reading">${questionReading(c.text)}</div><button class="ql-choice" data-choice="${i}" aria-label="选择${String.fromCharCode(65+i)}：${escapeHtml(c.text)}">${String.fromCharCode(65+i)}<br>选这个</button></div></div>`).join('')}</div>
    ${(chapter.originalStory||chapter.story||[]).length?`<details class="ql-reference"><summary>📖 回看本章课文或故事（点字听读）</summary>${(chapter.originalStory||chapter.story).map(line=>`<p class="ql-story-line">${questionReading(line)}</p>`).join('')}</details>`:''}
    <div class="ql-actions"><button class="btn small orange" id="ql-hint">💡 我需要提示</button></div>
    <div class="ql-feedback" id="ql-feedback" role="status" aria-live="polite"></div>
    <button class="btn green ql-next hidden" id="ql-next">下一题 →</button>
  </div>`;
  const showHint=()=>{const feedback=$('#ql-feedback');feedback.className='ql-feedback hint';feedback.innerHTML='💡 '+questionReading(q.hint);bindQuestionReading(feedback);};
  $('#ql-quit').onclick=()=>go(questionLearningHome,id,q.chapter);
  $('#ql-hint').onclick=()=>{if(!answered)showHint();};
  app.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{
    if(answered)return;
    const n=Number(b.dataset.choice),c=q.choices[n],feedback=$('#ql-feedback');
    if(!c.correct){window.LearningTheme?.play('tap');missed=true;app.querySelector(`[data-choice-panel="${n}"]`).classList.add('try-again');showHint();return;}
    answered=true;app.querySelector(`[data-choice-panel="${n}"]`).classList.add('correct');
    const praiseText=learningPraise(missed?'retry':'first');feedback.className='ql-feedback success';
    feedback.innerHTML='<strong class="ql-praise">🌟 '+escapeHtml(praiseText)+'</strong>'+questionReading(q.explain);bindQuestionReading(feedback);
    const star=app.querySelector(`[data-star="${index}"]`);star.textContent='⭐';star.classList.add('lit','new-star');
    if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)confetti(8);
    window.LearningTheme?.play('correct');speak(praiseText);
    app.querySelectorAll('[data-choice]').forEach(choice=>choice.disabled=true);
    const next=$('#ql-next');next.classList.remove('hidden');next.textContent=index+1===questions.length?'完成啦 →':'下一题 →';
    next.onclick=()=>{const count=correctCount+(missed?0:1);if(index+1<questions.length)go(questionLearningRound,id,group,questions,index+1,count);else go(questionLearningFinish,id,group,count,questions.length,q.chapter);};
  });
  bindQuestionReading();
}
function questionLearningFinish(id,group,correct,total,chapterId){
  setTitle('练习完成');const finishPraise=learningPraise('finish');
  app.innerHTML=`<div class="ql-shell"><div class="ql-finish"><div class="ql-icon">🎉</div><h1>你完成啦！</h1><div class="ql-finish-stars">${'⭐'.repeat(total)}</div><p class="ql-finish-praise">${escapeHtml(finishPraise)}</p><p>一共练了 ${total} 题，其中 ${correct} 题一次选对。</p><p>遇到不认识的字，可以回去再听一听。</p><button class="btn green" id="ql-again">本章再练一组</button> <button class="btn blue" id="ql-home">返回本章</button></div></div>`;
  $('#ql-again').onclick=()=>startQuestionChapter(id,chapterId,group);
  $('#ql-home').onclick=()=>go(questionLearningHome,id,chapterId);
  speak(finishPraise);
}
window.addEventListener('learning-theme-change',()=>{const home=app.querySelector('.ql-home');if(home)go(questionLearningHome,home.dataset.unit,home.dataset.chapter);});

function charLessonScreen(id, original = false) {
  if (!original && window.QUESTION_LEARNING?.[id]) return questionLearningHome(id);
  const l = ALL_LESSONS.find(x => x.id === id);
  const items = LESSON_ITEMS[id] || [];
  const writeSet = new Set((l.writeChars || []).map(w => w.split(' ')[0]));
  setTitle('🏯 ' + l.name);

  let h = `<div class="screen-title">
      <button class="btn small gray" id="back">← 返回目录</button>
      <span>${l.unit.unit} · ${l.name}</span>
      <span class="pg-badge">${l.page || ''}</span>
      ${l.pinyinLessonIdx !== undefined ? `<button class="btn small green" id="goPyLesson" style="margin-left:auto">🔤 去拼音乐园学本课拼音</button>` : ''}
    </div>`;

  // 1. 课文原文 / 儿歌 / 识字加油站
  if (l.text && l.text.length) {
    h += `<div class="section-block card textbook-box">
      <div class="tb-box-head">
        <span>${l.textTitle || '📖 课本原文'} <small class="sub">（点任意句子可单句跟读）</small></span>
        <button class="btn small green" id="readMainText">🔊 朗读课文</button>
      </div>
      <div class="tb-lines">
        ${l.text.map(line => `<div class="tb-line" data-line="${escapeHtml(line)}">🔊 ${escapeHtml(line)}</div>`).join('')}
      </div>
    </div>`;
  }

  // 2. 日积月累（语文园地古诗/名言）
  if (l.extraText && l.extraText.length) {
    h += `<div class="section-block card textbook-box extra">
      <div class="tb-box-head">
        <span>${l.extraTitle || '🌟 日积月累'} <small class="sub">（点任意句子可单句跟读）</small></span>
        <button class="btn small orange" id="readExtraText">🔊 朗读日积月累</button>
      </div>
      <div class="tb-lines">
        ${l.extraText.map(line => `<div class="tb-line" data-line="${escapeHtml(line)}">🔊 ${escapeHtml(line)}</div>`).join('')}
      </div>
    </div>`;
  }

  // 3. 课本重点词语
  if (l.words && l.words.length) {
    h += `<div class="section-block card">
      <div class="sec-head" style="margin-top:0">📝 课本词语（点词语听读音）</div>
      <div class="word-card-grid">
        ${l.words.map(w => {
          const hz = w.trim().split(/\s+/)[0];
          return `<button class="word-pill" data-word="${escapeHtml(hz)}">${renderWordRuby(w)}</button>`;
        }).join('')}
      </div>
    </div>`;
  }

  // 4. 本课识字表生字（会认字）
  h += `<div class="section-block">
    <div class="sec-head">🀄 本课识字表生字（会认字 · 共 ${items.length} 个，点字卡听读音和组词）</div>
    <div class="char-grid">`;
  items.forEach((c, i) => {
    const isWrite = writeSet.has(c.char);
    h += `<button class="char-card ${c.poly ? 'poly-card' : ''}" data-i="${i}">
      <div class="card-badges">
        ${c.poly ? '<span class="c-badge poly">多音字</span>' : ''}
        ${isWrite ? '<span class="c-badge write">✍️会写</span>' : ''}
      </div>
      <div>${renderPy(c.plain, c.tone)}</div>
      <div class="hz">${c.char}</div>
      <div class="wd">${c.word}</div>
    </button>`;
  });
  h += `</div></div>`;

  // 5. 本课写字表生字（会写字）
  const writeItems = (l.writeChars || []).map(w => {
    const [hz, py] = w.split(' ');
    const found = ALL_CHAR_ITEMS.find(c => c.char === hz);
    return charItem(`${hz} ${py} ${found ? found.word : hz}`);
  });
  if (writeItems.length) {
    h += `<div class="section-block card write-box">
      <div class="tb-box-head">
        <span>✍️ 本课写字表（课后田字格要求会写的字 · 共 ${writeItems.length} 个，点字卡即可用笔描红）</span>
        <button class="btn small" style="background:#e11d48" id="mWriteBox">🖌️ 手写笔练写字表</button>
      </div>
      <div class="write-grid">
        ${writeItems.map((c, wi) => `<button class="write-card" data-wi="${wi}">
            <div class="w-py">${renderPy(c.plain, c.tone)}</div>
            <div class="tzg mini"><span class="hz">${c.char}</span></div>
            <div style="font-size:12px;color:#b45309;margin-top:4px">🖌️ 点我描红</div>
          </button>`).join('')}
      </div>
    </div>`;
  }

  h += `<div class="row center" style="margin-top:26px">
      <button class="btn" style="background:#e11d48" id="mWriteAll">🖌️ 田字格手写练字</button>
      ${l.reuseItems ? '<button class="btn green" id="mOrdered">📖 顺序认字</button>' : ''}
      <button class="btn blue" id="mType">⌨️ 打字闯关</button>
      <button class="btn orange" id="mTone">🎵 声调练习</button>
      <button class="btn pink" id="mBalloon">🎈 气球大作战</button>
      <button class="btn purple" id="mDuck">🦆 打野鸭</button>
      <button class="btn green" id="mPac">🟡 吃豆人</button>
      <button class="btn" style="background:#4d7c0f" id="mTank">🛡️ 坦克大战</button>
    </div>`;
  app.innerHTML = h;
  $('#back').onclick = () => { sfx.ok(); go(charListScreen, currentCharFilter); };
  if ($('#goPyLesson')) $('#goPyLesson').onclick = () => { sfx.ok(); go(pinyinLessonScreen, l.pinyinLessonIdx); speak('拼音乐园'); };
  if ($('#readMainText')) $('#readMainText').onclick = () => { sfx.ok(); speak(l.text.join(' ')); };
  if ($('#readExtraText')) $('#readExtraText').onclick = () => { sfx.ok(); speak(l.extraText.join(' ')); };
  app.querySelectorAll('.tb-line').forEach(el => el.addEventListener('click', () => {
    sfx.pop();
    speak(el.dataset.line);
  }));
  app.querySelectorAll('.word-pill').forEach(b => b.addEventListener('click', () => {
    sfx.pop();
    speak(b.dataset.word);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }));
  app.querySelectorAll('.char-card[data-i]').forEach(b => b.addEventListener('click', () => {
    sfx.pop();
    speakItem(items[+b.dataset.i]);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }));
  const back = () => go(charLessonScreen, id, true);
  app.querySelectorAll('.write-card[data-wi]').forEach(b => b.addEventListener('click', () => {
    const wi = +b.dataset.wi;
    const it = writeItems[wi];
    sfx.ok();
    go(hanziWriteScreen, { title: `写字表描红 · ${l.name}`, items: writeItems, startIdx: wi, starKey: 'write:' + id, back });
    if (it) speakItem(it);
  }));
  if ($('#mWriteBox')) {
    $('#mWriteBox').onclick = () => {
      sfx.ok();
      go(hanziWriteScreen, { title: `写字表描红 · ${l.name}`, items: writeItems, startIdx: 0, starKey: 'write:' + id, back });
      speak('写字表描红');
    };
  }
  $('#mWriteAll').onclick = () => {
    sfx.ok();
    const pool = writeItems.length ? writeItems : items;
    go(hanziWriteScreen, { title: `田字格手写 · ${l.name}`, items: pool, startIdx: 0, starKey: 'write:' + id, back });
    speak('田字格练字');
  };
  if ($('#mOrdered')) $('#mOrdered').onclick = () => {
    sfx.ok();
    go(startRound, {title: `顺序认字 · ${l.name}`, items: items.slice(), ordered: true, requireTone: true, starKey: 'char:' + id, back});
  };
  $('#mType').onclick = () => {
    sfx.ok();
    go(startRound, { title: `打字闯关 · ${l.name}`, items: roundItems(items), requireTone: true, starKey: 'char:' + id, back });
    speak('打字闯关');
  };
  $('#mTone').onclick = () => {
    sfx.ok();
    const t = items.filter(x => x.tone);
    go(startToneRound, { title: `声调练习 · ${l.name}`, items: roundItems(t), starKey: 'tone:' + id, back });
    speak('声调练习');
  };
  $('#mBalloon').onclick = () => { sfx.ok(); go(balloonGame, { pool: items, back }); speak('气球大作战'); };
  $('#mDuck').onclick = () => { sfx.ok(); go(duckGame, { pool: items, back }); speak('打野鸭'); };
  $('#mPac').onclick = () => { sfx.ok(); go(pacmanGame, { pool: items, back }); speak('拼音吃豆人'); };
  $('#mTank').onclick = () => { sfx.ok(); go(tankGame, { pool: items, back }); speak('坦克保卫战'); };
}

// 一轮题目：按设置的每轮题目数量生成（字数不够时自动循环补齐）
function roundItems(items, targetSize = S().roundSize) {
  if (!items || !items.length) return [];
  const n = Math.max(1, targetSize || S().roundSize || 10);
  let out = shuffle(items);
  while (out.length < n) out = out.concat(shuffle(items));
  return out.slice(0, n);
}

// ======================= 田字格手写笔练汉字（写字表 100 字 + 识字表 280 字） =======================
let currentWriteScope = 'write100';
function hanziWriteListScreen(scope) {
  if (typeof scope === 'string') currentWriteScope = scope;
  setTitle('🖌️ 田字格手写汉字');

  let h = `<div class="screen-title">🖌️ 田字格手写汉字 <span class="sub">用手写笔一笔一画练笔顺，写错笔顺会自动提示！</span></div>
    <div class="cat-tabs">
      <button class="cat-tab ${currentWriteScope === 'write100' ? 'active' : ''}" data-s="write100">✍️ 课本《写字表》必写 100 字</button>
      <button class="cat-tab ${currentWriteScope === 'all280' ? 'active' : ''}" data-s="all280">🀄 课本《识字表》全部 280 字</button>
    </div>`;

  CHAR_UNITS.forEach(u => {
    const lessonsWithChars = u.lessons.filter(l =>
      currentWriteScope === 'write100' ? (l.writeChars && l.writeChars.length) : (l.items && l.items.length)
    );
    if (!lessonsWithChars.length) return;
    h += `<div class="unit"><div class="unit-title" style="background:${u.color}">${u.unit}</div><div class="lesson-grid">`;
    lessonsWithChars.forEach(l => {
      const list = currentWriteScope === 'write100'
        ? l.writeChars.map(w => w.split(' ')[0])
        : LESSON_ITEMS[l.id].map(x => x.char);
      const st = save.stars['write:' + l.id] || 0;
      h += `<button class="lesson-card" style="--c:${u.color}" data-id="${l.id}">
        <div class="ln-row"><span class="ln">${l.name}</span><span class="pg-badge">${l.page || ''}</span></div>
        <div class="lc" style="font-size:22px;color:#2d2640">🖌️ ${list.join(' ')}</div>
        <div class="write-preview">共 ${list.length} 个汉字 · 点卡片进入田字格描红</div>
        ${starsHtml(st)}
      </button>`;
    });
    h += `</div></div>`;
  });

  app.innerHTML = h;
  app.querySelectorAll('.cat-tab').forEach(b => b.addEventListener('click', () => {
    sfx.ok();
    go(hanziWriteListScreen, b.dataset.s);
  }));
  app.querySelectorAll('.lesson-card').forEach(b => b.addEventListener('click', () => {
    const l = ALL_LESSONS.find(x => x.id === b.dataset.id);
    if (!l) return;
    const writeItems = (l.writeChars || []).map(w => {
      const [hz, py] = w.split(' ');
      const found = ALL_CHAR_ITEMS.find(c => c.char === hz);
      return charItem(`${hz} ${py} ${found ? found.word : hz}`);
    });
    const pool = (currentWriteScope === 'write100' && writeItems.length) ? writeItems : LESSON_ITEMS[l.id];
    sfx.ok();
    go(hanziWriteScreen, {
      title: `田字格手写 · ${l.name}`,
      items: pool,
      startIdx: 0,
      starKey: 'write:' + l.id,
      back: () => go(hanziWriteListScreen, currentWriteScope)
    });
    speak(l.name);
  }));
}

function hanziWriteScreen(opts) {
  const items = opts.items || [];
  if (!items.length) { opts.back(); return; }
  let idx = opts.startIdx || 0;
  let showOutline = true; // true: 描红跟写；false: 听音默写
  let totalMistakes = 0;
  let completedCount = 0;
  let writer = null;

  setTitle('🖌️ ' + opts.title);

  app.innerHTML = `
    <div class="play-wrap">
      <div class="play-head">
        <button class="btn small gray" id="quit">← 返回</button>
        <div class="progress"><div id="prog"></div></div>
        <div class="pc" id="pc"></div>
      </div>

      <div class="card hw-hanzi-stage">
        <div class="hw-hanzi-body">
          <div class="hw-left-col">
            <div class="hw-mode-switch">
              <button class="cat-tab active" id="modeTrace" type="button">🖌️ 描红跟写</button>
              <button class="cat-tab" id="modeDictate" type="button">🧠 听音默写</button>
            </div>

            <div class="hw-hanzi-info">
              <div class="hw-py" id="hzPy"></div>
              <div class="hw-word" id="hzWord"></div>
              <button class="speak-btn" id="spk" title="听读音">🔊</button>
            </div>

            <div class="hw-stroke-status" id="strokeStatus">👆 请拿手写笔在田字格里按笔顺一笔一画写出来</div>

            <div class="row center" style="margin-top:10px;gap:8px">
              <button class="btn small gray" id="prevChar" type="button">◀ 上一字</button>
              <button class="btn small blue" id="btnAnimate" type="button">🎬 演示笔顺</button>
              <button class="btn small orange" id="btnHint" type="button">💡 提示下一笔</button>
              <button class="btn small purple" id="btnRedo" type="button">🧽 重写</button>
              <button class="btn small green" id="nextChar" type="button">下一字 ▶</button>
            </div>

            <div class="hw-char-strip" id="charStrip"></div>
          </div>

          <div class="hw-right-col">
            <div class="tzg-writer-wrap">
              <div class="tzg writer-box" id="writerTarget"></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  $('#quit').onclick = () => { sfx.ok(); opts.back(); };

  function renderStrip() {
    $('#charStrip').innerHTML = items.map((c, i) =>
      `<button type="button" class="strip-char ${i === idx ? 'active' : ''}" data-i="${i}">${c.char}</button>`
    ).join('');
    app.querySelectorAll('.strip-char').forEach(b => b.addEventListener('click', () => {
      sfx.pop();
      idx = +b.dataset.i;
      loadChar();
      speak(items[idx].speak);
    }));
  }

  function loadChar() {
    const it = items[idx];
    $('#prog').style.width = ((idx) / items.length * 100) + '%';
    $('#pc').textContent = `${idx + 1} / ${items.length}`;
    $('#hzPy').innerHTML = renderPy(it.plain, it.tone);
    $('#hzWord').innerHTML = it.word ? it.word.replace(it.char, `<b>${it.char}</b>`) : it.char;
    renderStrip();

    const target = $('#writerTarget');
    target.innerHTML = '';
    const strokeData = (window.HANZI_STROKE_DATA || {})[it.char];
    if (!window.HanziWriter || !strokeData) {
      target.innerHTML = `<span class="hz">${it.char}</span>`;
      $('#strokeStatus').textContent = '⚠️ 暂无该字笔顺数据';
      return;
    }

    const totalStrokes = strokeData.strokes.length;
    $('#strokeStatus').className = 'hw-stroke-status';
    $('#strokeStatus').innerHTML = `共 <b>${totalStrokes}</b> 画 · 请用手写笔写第 <b>1</b> 画`;

    writer = window.HanziWriter.create(target, it.char, {
      width: 280,
      height: 280,
      padding: 16,
      showOutline: showOutline,
      showCharacter: false,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 220,
      strokeColor: '#1e293b',
      outlineColor: '#e2e8f0',
      drawingColor: '#e11d48',
      drawingWidth: 22,
      highlightColor: '#3b82f6',
      showHintAfterMisses: 2,
      leniency: 1.35,
      charDataLoader: (ch, onComplete) => onComplete(strokeData)
    });

    startQuiz(totalStrokes, it);

  }

  function startQuiz(totalStrokes, it) {
    if (!writer) return;
    writer.quiz({
      onCorrectStroke: data => {
        sfx.key();
        const nextNum = data.strokeNum + 2;
        if (nextNum <= totalStrokes) {
          $('#strokeStatus').className = 'hw-stroke-status ok';
          $('#strokeStatus').innerHTML = `👍 第 ${data.strokeNum + 1} 画写对啦！继续写第 <b>${nextNum}</b> / ${totalStrokes} 画`;
        }
      },
      onMistake: data => {
        totalMistakes++;
        sfx.bad();
        $('#strokeStatus').className = 'hw-stroke-status bad';
        $('#strokeStatus').innerHTML = `💪 第 <b>${data.strokeNum + 1}</b> 画笔顺或方向不对哦，注意看蓝色闪烁提示！`;
      },
      onComplete: summary => {
        completedCount++;
        sfx.ok();
        confetti(12);
        $('#strokeStatus').className = 'hw-stroke-status win';
        $('#strokeStatus').innerHTML = `🎉 ${praise()} 「${it.char}」写得真工整！（失误 ${summary.totalMistakes} 次）`;
        speak(`${praise()} ${it.speak}`);
        setTimeout(() => {
          if (idx < items.length - 1) {
            idx++;
            loadChar();
          } else if (completedCount >= items.length) {
            const stars = totalMistakes <= items.length ? 3 : totalMistakes <= items.length * 3 ? 2 : 1;
            showResult({
              stars,
              starKey: opts.starKey,
              line: `完成了 ${items.length} 个汉字的田字格手写练习！`,
              again: () => go(hanziWriteScreen, { ...opts, startIdx: 0 }),
              back: opts.back
            });
          }
        }, 1600);
      }
    });
  }

  $('#spk').onclick = () => { sfx.key(); speak(items[idx].speak); };
  $('#modeTrace').onclick = () => {
    sfx.key();
    showOutline = true;
    $('#modeTrace').classList.add('active');
    $('#modeDictate').classList.remove('active');
    if (writer) writer.showOutline();
  };
  $('#modeDictate').onclick = () => {
    sfx.key();
    showOutline = false;
    $('#modeDictate').classList.add('active');
    $('#modeTrace').classList.remove('active');
    if (writer) writer.hideOutline();
  };
  $('#btnAnimate').onclick = () => {
    if (!writer) return;
    sfx.ok();
    const it = items[idx];
    const strokeData = (window.HANZI_STROKE_DATA || {})[it.char];
    $('#strokeStatus').className = 'hw-stroke-status';
    $('#strokeStatus').innerHTML = `🎬 正在演示「${it.char}」的标准笔顺…`;
    speakItem(it);
    writer.animateCharacter({
      onComplete: () => {
        setTimeout(() => {
          writer.hideCharacter();
          if (showOutline) writer.showOutline();
          startQuiz(strokeData ? strokeData.strokes.length : 1, it);
          $('#strokeStatus').innerHTML = `👆 现在轮到你用手写笔来写「${it.char}」啦！`;
        }, 500);
      }
    });
  };
  $('#btnHint').onclick = () => {
    sfx.key();
    if (writer && writer._quiz) writer._quiz._hanziWriter.highlightStroke(writer._quiz._currentStrokeIndex);
  };
  $('#btnRedo').onclick = () => { sfx.del(); loadChar(); };
  $('#prevChar').onclick = () => { if (idx > 0) { sfx.key(); idx--; loadChar(); } };
  $('#nextChar').onclick = () => { if (idx < items.length - 1) { sfx.key(); idx++; loadChar(); } };

  loadChar();
}

// ======================= 打字闯关核心 =======================
let R = null; // 当前回合

function syncRoundSizeLive() {
  if (!R || !R.items || !R.items.length || R.isReview || R.ordered) return;
  const targetN = Math.max(R.idx + 1, S().roundSize || 10);
  const pool = (R.sourcePool && R.sourcePool.length) ? R.sourcePool : R.items.slice();
  if (R.items.length < targetN) {
    while (R.items.length < targetN) {
      R.items = R.items.concat(shuffle(pool));
    }
    R.items = R.items.slice(0, targetN);
  } else if (R.items.length > targetN) {
    R.items = R.items.slice(0, targetN);
  }
  const progEl = $('#prog'), pcEl = $('#pc');
  if (progEl) progEl.style.width = (R.idx / R.items.length * 100) + '%';
  if (pcEl) pcEl.textContent = `${R.idx + 1} / ${R.items.length}`;
}

function startRound(opts) {
  const sourcePool = (opts.pool && opts.pool.length) ? opts.pool.slice() : opts.items.slice();
  const initialItems = (opts.isReview || opts.ordered) ? opts.items.slice() : roundItems(sourcePool, S().roundSize);
  R = { ...opts, sourcePool, items: initialItems, idx: 0, firstTry: 0, buf: '', tone: null, wrong: 0, reveal: false, locked: false };
  setTitle(opts.title);
  app.innerHTML = `
    <div class="play-wrap round-screen">
      <div class="play-head">
        <button class="btn small gray" id="quit">✕</button>
        <div class="progress"><div id="prog"></div></div>
        <div class="pc" id="pc"></div>
      </div>
      <div class="round-top-grid">
        <div class="card question" id="q"></div>
        <div class="card ans-card">
          <div class="answer-box" id="ans"></div>
          <div class="feedback" id="fb"></div>
          <div class="tone-tip" id="tip"></div>
        </div>
      </div>
      <div class="card kb-card ${S().showKb ? '' : 'hidden'}">
        ${inputPanelHtml(opts.requireTone)}
      </div>
    </div>`;
  $('#quit').onclick = () => { sfx.ok(); opts.back(); };
  bindKeyboard(app);
  keyHandler = roundKey;
  onSettingsChange = () => {
    syncRoundSizeLive();
    updateAnswer();
  };
  showQuestion();
}

function curItem() { return R.items[R.idx]; }

function showQuestion() {
  const it = curItem();
  R.buf = ''; R.tone = null; R.wrong = 0; R.reveal = false; R.locked = false;
  $('#prog').style.width = (R.idx / R.items.length * 100) + '%';
  $('#pc').textContent = `${R.idx + 1} / ${R.items.length}`;
  let q = '';
  if (it.type === 'char') {
    q = `<div class="prompt">点出这个字的<b>拼音字母</b>，再点<b>声调符号</b></div>
      <div class="hintpy" id="hintpy">${S().pyHint ? renderPy(it.plain, it.tone) : ''}</div>
      <div class="tzg" style="cursor:pointer" title="点击听发音"><span class="hz">${it.char}</span></div>
      <div class="word">${it.word.replace(it.char, `<b>${it.char}</b>`)}</div>`;
  } else if (it.type === 'letter') {
    q = `<div class="prompt">在键盘上找到这${it.letter.length > 1 ? '几' : '个'}字母，打出来！</div>
      <div class="emoji-hint">${it.emoji}</div>
      <div class="bigletter" style="cursor:pointer" title="点击听发音">${renderPy(it.letter)}</div>
      <div class="hintpy" id="hintpy"></div>`;
  } else {
    q = `<div class="prompt">照着拼音点出字母，别忘了点<b>声调符号</b></div>
      <div class="bigpy" style="cursor:pointer" title="点击听发音">${renderPy(it.plain, it.tone)}</div>
      <div class="word">${it.char ? `${it.char}（${it.word}）` : '&nbsp;'}</div>
      <div class="hintpy" id="hintpy" style="min-height:0"></div>`;
  }
  q += `<button class="speak-btn" id="spk" title="再听一遍">🔊</button>
        <button class="hint-btn" id="hnt" title="小提示">💡</button>`;
  $('#q').innerHTML = q;
  $('#spk').onclick = () => { sfx.key(); speakItem(it); };
  $('#hnt').onclick = () => { sfx.key(); R.reveal = true; updateAnswer(); };
  $('#q .tzg')?.addEventListener('click', () => { sfx.pop(); speakItem(it); });
  $('#q .bigletter')?.addEventListener('click', () => { sfx.pop(); speakItem(it); });
  $('#q .bigpy')?.addEventListener('click', () => { sfx.pop(); speakItem(it); });
  $('#fb').textContent = ''; $('#fb').className = 'feedback';
  $('#tip').innerHTML = R.requireTone
    ? `声调：<span class="k" style="color:var(--t1)">ˉ</span>一声 <span class="k" style="color:var(--t2)">ˊ</span>二声 <span class="k" style="color:var(--t3)">ˇ</span>三声 <span class="k" style="color:var(--t4)">ˋ</span>四声${it.tone === 0 ? '　（这个字读<b>轻声</b>，点 <span class="k">轻声</span>）' : ''}`
    : '';
  updateAnswer();

}

function updateAnswer() {
  if (!R || !R.items || !curItem()) return;
  const it = curItem();
  syncToneSelection(R.buf, R.tone);
  const ans = $('#ans');
  if (ans) {
    ans.className = 'answer-box';
    ans.innerHTML = (R.buf || R.tone ? renderPy(R.buf, R.tone) : '') + '<span class="cursor"></span>';
  }
  const hp = $('#hintpy');
  if (hp && it.type === 'char') {
    hp.innerHTML = (S().pyHint || R.reveal) ? renderPy(it.plain, it.tone) : '';
  }
  // 键盘提示：高亮下一个应该按的键
  if (S().kbHint && (R.reveal || it.type === 'letter' || it.type === 'syl' || S().pyHint)) {
    let next = null;
    if (!it.key.startsWith(R.buf)) next = 'Backspace';
    else if (R.buf.length < it.key.length) next = it.key[R.buf.length];
    else if (R.requireTone && R.tone !== it.tone) next = R.tone !== null ? 'Backspace' : String(it.tone);
    highlightKey(next);
  } else highlightKey(null);
}

function roundKey(k) {
  if (R.locked) return;
  const it = curItem();
  if (/^[a-zü]$/.test(k)) {
    if (R.buf.length >= 8) return;
    R.buf += k === 'ü' ? 'v' : k;
    playTypedPinyin(R.buf, k);
    updateAnswer();
    if (!R.requireTone && (R.buf.length >= it.key.length || !it.key.startsWith(R.buf))) setTimeout(check, 150);
    return;
  }
  if (/^[0-5]$/.test(k)) {
    if (!R.requireTone) return;
    R.tone = (k === '0' || k === '5') ? 0 : +k;
    playTypedPinyin(R.buf + R.tone, String(R.tone));
    updateAnswer();
    if (R.buf) setTimeout(check, 220);
    return;
  }
  if (k === 'Backspace') {
    sfx.del();
    if (R.tone !== null) R.tone = null; else R.buf = R.buf.slice(0, -1);
    updateAnswer();
    return;
  }
  if (k === 'Enter' || k === ' ') {
    sfx.key();
    if (R.buf) check();
  }
}

function check() {
  if (R.locked) return;
  const it = curItem();
  const okL = R.buf === it.key;
  const okT = !R.requireTone || (it.tone === 0 ? (R.tone === 0 || R.tone === null) : R.tone === it.tone);
  const ans = $('#ans'), fb = $('#fb');
  if (okL && okT) {
    R.locked = true;
    if (R.wrong === 0) { R.firstTry++; if (R.isReview) reduceMistake(it); }
    ans.className = 'answer-box ok';
    ans.innerHTML = renderPy(it.plain, R.requireTone ? it.tone : null);
    const praiseText=praise();
    fb.className = 'feedback ok'; fb.textContent = '🎉 ' + praiseText;
    highlightKey(null);
    sfx.ok();
    speak(praiseText);
    setTimeout(() => { R.idx++; R.idx >= R.items.length ? finishRound() : showQuestion(); }, 1500);
    return;
  }
  R.wrong++;
  sfx.bad();
  ans.className = 'answer-box'; void ans.offsetWidth; ans.className = 'answer-box bad';
  fb.className = 'feedback bad';
  if (okL) {
    fb.innerHTML = '拼音对啦！👍 声调再想想，听一听 🔊';
    R.tone = null;
  } else {
    fb.textContent = R.wrong >= 2 ? '没关系，看看提示，照着打一遍 💪' : '不对哦，再试一次 💪';
    R.buf = ''; R.tone = null;
  }
  if (R.wrong === 2) { addMistake(it); R.reveal = true; }
  setTimeout(updateAnswer, 450);
}

function finishRound() {
  const n = R.items.length, ratio = R.firstTry / n;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : 1;
  showResult({ stars, starKey: R.starKey, line: `一共 ${n} 题，一次就答对 ${R.firstTry} 题`, again: () => go(startRound, { ...R, items: R.ordered ? R.items.slice() : shuffle(R.items) }), back: R.back });
}

function showResult({ stars, starKey, line, again, back, bonus = 0 }) {
  keyHandler = null;
  const before = stickerCount();
  if (starKey) { if ((save.stars[starKey] || 0) < stars) save.stars[starKey] = stars; }
  if (bonus) save.bonus = (save.bonus || 0) + bonus;
  persist();
  const after = stickerCount();
  const title = stars === 3 ? '🏆 完美通关！' : stars === 2 ? '👏 真不错！' : '💪 继续加油！';
  app.innerHTML = `<div class="card result">
      <div class="big-stars">${[1, 2, 3].map(i => `<span>${i <= stars ? '⭐' : '☆'}</span>`).join('')}</div>
      <h2>${title}</h2>
      <p class="sub" style="font-size:20px">${line}</p>
      ${after > before ? `<p style="font-size:22px;font-weight:800">🎁 获得新贴纸！</p><div class="sticker-new">${STICKERS[after - 1]}</div>` : ''}
      <div class="row center" style="margin-top:20px">
        <button class="btn green" id="again">🔁 再玩一次</button>
        <button class="btn blue" id="back2">← 返回</button>
      </div></div>`;
  $('#again').onclick = again;
  $('#back2').onclick = back;
  sfx.win(); confetti(stars * 15);
  speak(title.replace(/[^\u4e00-\u9fa5！]/g, ''));
  keyHandler = k => { if (k === 'Enter') again(); };
}

// ======================= 声调小精灵 =======================
function toneHomeScreen() {
  setTitle('🎵 声调小精灵');
  const demo = TONE_SETS[0];
  let h = `<div class="screen-title">🎵 声调小精灵</div>
    <div class="card">
      <p style="font-size:20px;margin-top:0">🎶 <b>声调歌</b>：一声平，二声扬，三声拐弯，四声降。点一点，听一听：</p>
      <div class="tone-song">`;
  [1, 2, 3, 4].forEach(t => {
    h += `<button class="tone-demo tone-color t${t}" data-t="${t}">
      ${TONE_SVG[t]}<div>${renderPy(demo.base, t)}</div><div class="hz">${demo.chars[t - 1]}</div><div class="rh">${TONE_NAMES[t]}</div></button>`;
  });
  h += `</div>
      <p class="sub" style="margin-bottom:0">小秘诀：<b>有 ɑ 不放过，没 ɑ 找 o e，i u 并列标在后</b>。拼读时，先点拼音字母，再点声调符号 <b>ˉ ˊ ˇ ˋ</b>。</p>
    </div>
    <div class="row center" style="margin-top:24px">
      <button class="btn orange" id="tA">🎵 四声练一练（妈麻马骂…）</button>
      <button class="btn blue" id="tB">📚 课本生字选声调</button>
    </div>`;
  app.innerHTML = h;
  app.querySelectorAll('.tone-demo').forEach(b => b.addEventListener('click', () => {
    const t = +b.dataset.t;
    sfx.tone(t);
    speakPinyin(demo.base, t);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }));
  $('#tA').onclick = () => {
    sfx.ok();
    const items = [];
    TONE_SETS.forEach(s => s.chars.forEach((c, i) => { if (c) items.push({ char: c, plain: s.base, tone: i + 1, key: s.base, speak: c, word: '' }); }));
    go(startToneRound, { title: '四声练一练', items: shuffle(items).slice(0, S().roundSize), starKey: 'tone:sets', back: () => go(toneHomeScreen) });
    speak('四声练一练');
  };
  $('#tB').onclick = () => {
    sfx.ok();
    go(charListScreen);
    speak('课本生字选声调');
  };
}

function startToneRound(opts) {
  const sourcePool = (opts.pool && opts.pool.length) ? opts.pool.slice() : opts.items.slice();
  const initialItems = roundItems(sourcePool, S().roundSize);
  R = { ...opts, sourcePool, items: initialItems, idx: 0, firstTry: 0, wrong: 0, locked: false };
  setTitle(opts.title);
  app.innerHTML = `
    <div class="play-wrap">
      <div class="play-head">
        <button class="btn small gray" id="quit">✕</button>
        <div class="progress"><div id="prog"></div></div>
        <div class="pc" id="pc"></div>
      </div>
      <div class="card question" id="q"></div>
      <div class="feedback" id="fb"></div>
      <div class="tone-btns">${[1, 2, 3, 4].map(t => `<button class="tone-btn t${t}" data-t="${t}">${TONE_SVG[t]}<div>${TONE_NAMES[t]}</div></button>`).join('')}</div>
      <p class="sub" style="text-align:center">听一听读音，点击上方对应的声调符号吧！</p>
    </div>`;
  $('#quit').onclick = () => { sfx.ok(); opts.back(); };
  app.querySelectorAll('.tone-btn').forEach(b => b.addEventListener('click', () => {
    sfx.tone(+b.dataset.t);
    toneAnswer(+b.dataset.t);
  }));
  keyHandler = k => { if (/^[1-4]$/.test(k)) { sfx.tone(+k); toneAnswer(+k); } };
  onSettingsChange = () => syncRoundSizeLive();
  toneQuestion();
}
function toneQuestion() {
  const it = R.items[R.idx];
  R.wrong = 0; R.locked = false;
  $('#prog').style.width = (R.idx / R.items.length * 100) + '%';
  $('#pc').textContent = `${R.idx + 1} / ${R.items.length}`;
  $('#q').innerHTML = `<div class="prompt">听一听，这个字读第几声？</div>
    <div class="bigpy" id="tpy" style="cursor:pointer" title="点击听发音">${renderPy(it.plain, '?')}</div>
    <div class="tzg" style="cursor:pointer" title="点击听发音"><span class="hz">${it.char}</span></div>
    <div class="word">${it.word ? it.word.replace(it.char, `<b>${it.char}</b>`) : '&nbsp;'}</div>
    <button class="speak-btn" id="spk">🔊</button>`;
  $('#spk').onclick = () => { sfx.key(); speakItem(it); };
  $('#q .tzg')?.addEventListener('click', () => { sfx.pop(); speakItem(it); });
  $('#q .bigpy')?.addEventListener('click', () => { sfx.pop(); speakItem(it); });
  $('#fb').textContent = ''; $('#fb').className = 'feedback';

}
function toneAnswer(t) {
  if (R.locked) return;
  const it = R.items[R.idx];
  const fb = $('#fb');
  if (t === it.tone) {
    R.locked = true;
    if (R.wrong === 0) R.firstTry++;
    $('#tpy').innerHTML = renderPy(it.plain, it.tone, `tone-color t${it.tone}`);
    fb.className = 'feedback ok'; fb.textContent = `🎉 ${praise()} 是${TONE_NAMES[t]}的第 ${t} 声！`;
    sfx.ok(); speak(praise());
    setTimeout(() => { R.idx++; R.idx >= R.items.length ? finishToneRound() : toneQuestion(); }, 1500);
  } else {
    R.wrong++;
    sfx.bad();
    fb.className = 'feedback bad';
    fb.textContent = R.wrong >= 2 ? `提示：它是「${TONE_NAMES[it.tone]}」哦` : '再听一听 👂';
    if (R.wrong === 2 && it.id) addMistake(it);

  }
}
function finishToneRound() {
  const n = R.items.length, ratio = R.firstTry / n;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : 1;
  const o = R;
  showResult({ stars, starKey: o.starKey, line: `一共 ${n} 题，一次就答对 ${o.firstTry} 题`, again: () => go(startToneRound, { ...o, items: shuffle(o.items) }), back: o.back });
}

// ======================= 气球大作战 =======================
const SPEED_PRESETS = {
  very_slow: { label: '🐌 超慢（初学找键·约 32 秒）', balloon: { speed: 12, max: 22, accel: 0.25, interval: 6500, minInterval: 4500, maxCount: 2 }, duck: { speed: 24, max: 45, accel: 0.5, interval: 6500, minInterval: 4500, maxCount: 2 }, pac: { ghostMs: 1450, ghostCount: 1 }, tank: { speed: 10, max: 18, accel: 0.2, interval: 6500, minInterval: 4500, maxCount: 2 } },
  slow:      { label: '🐢 慢速（一年级推荐·约 20 秒）', balloon: { speed: 18, max: 35, accel: 0.45, interval: 5000, minInterval: 3400, maxCount: 3 }, duck: { speed: 36, max: 68, accel: 0.8, interval: 5000, minInterval: 3400, maxCount: 3 }, pac: { ghostMs: 980, ghostCount: 2 }, tank: { speed: 15, max: 28, accel: 0.35, interval: 5000, minInterval: 3400, maxCount: 3 } },
  medium:    { label: '🐇 中速（熟练巩固·约 14 秒）', balloon: { speed: 26, max: 55, accel: 0.8,  interval: 3800, minInterval: 2400, maxCount: 4 }, duck: { speed: 52, max: 98, accel: 1.4, interval: 3800, minInterval: 2400, maxCount: 3 }, pac: { ghostMs: 680, ghostCount: 3 }, tank: { speed: 22, max: 44, accel: 0.65, interval: 3800, minInterval: 2400, maxCount: 4 } },
  fast:      { label: '🚀 快速（高手挑战·约 10 秒）', balloon: { speed: 38, max: 85, accel: 1.4,  interval: 2900, minInterval: 1600, maxCount: 5 }, duck: { speed: 72, max: 135, accel: 2.2, interval: 2800, minInterval: 1600, maxCount: 4 }, pac: { ghostMs: 460, ghostCount: 3 }, tank: { speed: 32, max: 68, accel: 1.1, interval: 2800, minInterval: 1600, maxCount: 4 } },
};
function speedSelectHtml(id) {
  const cur = S().gameSpeed || 'slow';
  return `<select id="${id}">` + Object.entries(SPEED_PRESETS).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${v.label}</option>`).join('') + `</select>`;
}
function speedSwitchBarHtml() {
  const cur = S().gameSpeed || 'slow';
  const items = [['very_slow', '🐌 超慢'], ['slow', '🐢 慢'], ['medium', '🐇 中'], ['fast', '🚀 快']];
  return `<span class="speed-bar" title="随时切换飞行速度">` + items.map(([k, txt]) => `<button class="spd-btn ${k === cur ? 'active' : ''}" data-spd="${k}">${txt}</button>`).join('') + `</span>`;
}

function balloonSetupScreen() {
  setTitle('🎈 气球大作战');
  let h = `<div class="screen-title">🎈 气球大作战</div>
    <div class="card">
      <p style="font-size:18px;margin-top:0">选一选要练习的课文（可以多选）：</p>
      <div class="row" id="units">`;
  CHAR_UNITS.forEach((u, i) => { h += `<label class="chip"><input type="checkbox" value="${i}" ${i < 2 ? 'checked' : ''}> ${u.unit}</label>`; });
  h += `</div>
      <div class="setting-row"><span>🐢 气球上升速度</span>${speedSelectHtml('bSpeed')}</div>
      <div class="setting-row"><span>🎵 要标声调符号（ˉ ˊ ˇ ˋ）</span><label class="switch"><input type="checkbox" id="bTone" checked><span></span></label></div>
      <div class="setting-row" style="border:none"><span>👀 气球上显示拼音（简单模式）</span><label class="switch"><input type="checkbox" id="bPy" ${S().pyHint ? 'checked' : ''}><span></span></label></div>
      <p class="sub">🏅 最高分：${save.balloonBest}</p>
      <div class="row center"><button class="btn pink" id="start">🚀 开始游戏</button></div>
    </div>`;
  app.innerHTML = h;
  $('#bSpeed').onchange = () => { S().gameSpeed = $('#bSpeed').value; persist(); };
  $('#bPy').onchange = () => { S().pyHint = $('#bPy').checked; persist(); };
  onSettingsChange = () => {
    if ($('#bSpeed')) $('#bSpeed').value = S().gameSpeed || 'slow';
    if ($('#bPy')) $('#bPy').checked = !!S().pyHint;
  };
  $('#start').onclick = () => {
    sfx.ok();
    S().gameSpeed = $('#bSpeed').value; S().pyHint = $('#bPy').checked; persist();
    const sel = [...app.querySelectorAll('#units input:checked')].map(x => +x.value);
    if (!sel.length) { toast('请至少选一个单元哦'); return; }
    const pool = sel.flatMap(i => CHAR_UNITS[i].lessons.flatMap(l => LESSON_ITEMS[l.id]));
    go(balloonGame, { pool, needTone: $('#bTone').checked, showPy: $('#bPy').checked, back: () => go(balloonSetupScreen) });
    speak('气球大作战开始');
  };
}

const BALLOON_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac', '#38d9a9'];

function balloonGame(opts) {
  const needTone = opts.needTone !== false;
  let showPy = opts.showPy !== undefined ? !!opts.showPy : !!S().pyHint;
  setTitle('🎈 气球大作战');
  app.innerHTML = `
    <div class="hud">
      <button class="btn small gray" id="quit">✕</button>
      <span id="hearts"></span>
      <div class="typed" id="typed"></div>
      ${speedSwitchBarHtml()}
      <span>🏅 <span id="score">0</span></span>
    </div>
    <div class="balloon-stage" id="stage">
      <div class="overlay" id="ov"><div class="card" style="text-align:center;max-width:460px">
        <div style="font-size:60px">🎈</div>
        <h2 style="margin:6px 0">气球要飞走啦！</h2>
        <p style="font-size:18px">点出气球上汉字的拼音${needTone ? '，<b>再点声调符号</b>' : ''}，<br>就能把气球戳破！漏掉 5 个就结束哦。</p>
        <button class="btn pink" id="go">开始！（回车）</button>
      </div></div>
    </div>
    ${inputPanelHtml(needTone)}`;
  bindKeyboard(app);
  $('#quit').onclick = () => { sfx.ok(); opts.back(); };

  const stage = $('#stage');
  let preset = (SPEED_PRESETS[S().gameSpeed] || SPEED_PRESETS.slow).balloon;
  const G = { balloons: [], buf: '', score: 0, hearts: 5, running: false, last: 0, spawnT: 0, speed: preset.speed, interval: preset.interval, raf: 0, missed: [] };
  function applyBalloonSpeed(spdKey) {
    S().gameSpeed = spdKey; persist();
    app.querySelectorAll('.spd-btn').forEach(b => b.classList.toggle('active', b.dataset.spd === spdKey));
    const oldBase = preset.speed;
    preset = (SPEED_PRESETS[spdKey] || SPEED_PRESETS.slow).balloon;
    G.speed = Math.min(preset.max, preset.speed + G.score * preset.accel);
    G.interval = Math.max(preset.minInterval, preset.interval - G.score * 35);
    const ratio = preset.speed / (oldBase || 1);
    G.balloons.forEach(b => { b.speed *= ratio; });
  }
  app.querySelectorAll('.spd-btn').forEach(btn => btn.addEventListener('click', () => {
    sfx.key();
    applyBalloonSpeed(btn.dataset.spd);
  }));
  onSettingsChange = () => {
    applyBalloonSpeed(S().gameSpeed || 'slow');
    showPy = !!S().pyHint;
    G.balloons.forEach(b => {
      const body = b.el.querySelector('.body');
      if (body) {
        body.innerHTML = `${showPy ? `<div class="bp">${renderPy(b.it.plain, b.it.tone)}</div>` : ''}<div class="hz">${b.it.char}</div>`;
      }
    });
  };
  const drawHUD = () => {
    $('#hearts').textContent = '❤️'.repeat(G.hearts) + '🤍'.repeat(5 - G.hearts);
    $('#score').textContent = G.score;
    $('#typed').innerHTML = G.buf ? renderPy(G.buf.replace(/[0-5]$/, ''), /[1-4]$/.test(G.buf) ? +G.buf.slice(-1) : null) : '<span class="sub" style="font-size:18px">在这里显示你打的拼音</span>';
    syncToneSelection(G.buf);
  };
  const answerOf = it => needTone ? it.key + it.tone : it.key;

  function spawn() {
    const W = stage.clientWidth;
    const used = G.balloons.map(b => answerOf(b.it));
    const cand = shuffle(opts.pool).find(it => {
      const a = answerOf(it);
      // 避免两个气球答案重复或互为前缀（防止打字时分不清）
      return !used.some(u => u === a || (!needTone && (u.startsWith(a) || a.startsWith(u))));
    });
    if (!cand) return;
    const el = document.createElement('div');
    el.className = 'balloon';
    el.style.setProperty('--balloon-hue', Math.floor(Math.random() * 300) + 'deg');
    const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    el.innerHTML = `<div class="body" style="background:${color};border-color:${color}">${showPy ? `<div class="bp">${renderPy(cand.plain, cand.tone)}</div>` : ''}<div class="hz">${cand.char}</div></div><div class="string"></div>`;
    // 选择一个不和已有气球重叠的横向位置
    let x, tries = 0;
    do { x = 10 + Math.random() * (W - 124); tries++; } while (tries < 12 && G.balloons.some(b => Math.abs(b.x - x) < 115 && b.y < 200));
    const b = { el, it: cand, x, y: -140, speed: G.speed * (0.85 + Math.random() * 0.3) };
    el.style.left = x + 'px';
    el.style.transform = `translateY(${-b.y}px)`;
    el.style.bottom = '0';
    el.style.top = 'auto';
    el.style.cursor = 'pointer';
    window.ArcadeFX.bindHit(el, () => G.running && G.balloons.includes(b), () => pop(b));
    stage.appendChild(el);
    G.balloons.push(b);
  }

  function frame(t) {
    if (!G.running) return;
    const dt = Math.min(0.05, (t - (G.last || t)) / 1000);
    G.last = t;
    if (window.ArcadeFX?.frozen(stage, t)) { G.raf = requestAnimationFrame(frame); return; }
    G.spawnT -= dt * 1000;
    if (G.spawnT <= 0 && G.balloons.length < preset.maxCount) { spawn(); G.spawnT = G.interval; }
    const H = stage.clientHeight;
    for (const b of G.balloons.slice()) {
      b.y += b.speed * dt;
      b.el.style.transform = `translateY(${-b.y}px)`;
      b.el.style.left = (b.x + Math.sin(b.y / 80 + b.x) * 7) + 'px';
      if (b.y > H + 10) escape(b);
    }
    G.raf = requestAnimationFrame(frame);
  }

  function escape(b) {
    remove(b);
    G.hearts--;
    G.missed.push(b.it);
    addMistake(b.it);
    sfx.bad();
    toast(`飞走了：${b.it.char} ${toneText(b.it.plain, b.it.tone)}`, 1800);
    drawHUD();
    if (G.hearts <= 0) gameOver();
  }
  function remove(b) { G.balloons = G.balloons.filter(x => x !== b); b.el.remove(); }

  function pop(b) {
    G.balloons = G.balloons.filter(x => x !== b);
    b.el.classList.add('boom');
    const ft = document.createElement('div');
    ft.className = 'float-text'; ft.textContent = '+1 ' + toneText(b.it.plain, b.it.tone);
    ft.style.left = b.x + 'px'; ft.style.bottom = (b.y + 60) + 'px';
    stage.appendChild(ft);
    setTimeout(() => { b.el.remove(); ft.remove(); }, 1200);
    G.score++;
    sfx.balloonPop();
    window.ArcadeFX?.hit(stage, b.el, 'pop', G.score);
    speakPinyin(b.it.plain, b.it.tone);
    // 越来越快（按所选速度档位温和递增）
    G.speed = Math.min(preset.max, preset.speed + G.score * preset.accel);
    G.interval = Math.max(preset.minInterval, preset.interval - G.score * 35);
    G.spawnT = Math.min(G.spawnT, 520);
    G.buf = '';
    drawHUD();
  }

  function markTargets() {
    G.balloons.forEach(b => b.el.classList.toggle('target', !!G.buf && answerOf(b.it).startsWith(G.buf)));
  }

  function onKey(k) {
    if (!G.running) { if (k === 'Enter' || k === ' ') begin(); return; }
    if (k === 'Backspace') { sfx.del(); G.buf = G.buf.slice(0, -1); drawHUD(); markTargets(); return; }
    if (k === 'Enter' || k === ' ') {
      sfx.key();
      const hit = G.balloons.find(b => answerOf(b.it) === G.buf || (!needTone && b.it.key === G.buf));
      if (hit) pop(hit);
      return;
    }
    let ch = k === 'ü' ? 'v' : k;
    if (/^[05]$/.test(ch)) ch = '0';
    if (!needTone && /^[0-9]$/.test(ch)) return;
    if (needTone && /^[0-9]$/.test(ch) && !G.buf) return;
    const nb = G.buf + ch;
    const ans = b => needTone ? (b.it.tone ? b.it.key + b.it.tone : b.it.key + '0') : b.it.key;
    const matches = G.balloons.filter(b => ans(b).startsWith(nb));
    if (!matches.length) {
      sfx.bad();
      const t = $('#typed'); t.style.background = '#ffe1e1'; setTimeout(() => t.style.background = '', 250);
      if (/^[0-9]$/.test(ch)) { drawHUD(); return; } // 声调错了，保留字母重新选
      G.buf = ''; drawHUD(); markTargets(); return;
    }
    G.buf = nb;
    playTypedPinyin(G.buf, ch);
    const exact = matches.find(b => ans(b) === nb);
    if (exact && (needTone || matches.length === 1)) { pop(exact); markTargets(); return; }
    drawHUD(); markTargets();
  }

  function begin() {
    sfx.ok();
    $('#ov').classList.add('hidden');
    G.running = true; window.ArcadeFX?.start(stage, 'pop', S().sound); G.last = 0; G.spawnT = 300;
    G.raf = requestAnimationFrame(frame);
  }

  function gameOver() {
    G.running = false; window.ArcadeFX?.stop();
    cancelAnimationFrame(G.raf);
    if (G.score > save.balloonBest) save.balloonBest = G.score;
    const stars = G.score >= 30 ? 3 : G.score >= 15 ? 2 : G.score >= 5 ? 1 : 0;
    const missed = [...new Map(G.missed.map(m => [m.id, m])).values()];
    setTimeout(() => {
      showResult({
        stars, bonus: stars, line: `戳破了 ${G.score} 个气球！最高分 ${save.balloonBest}<br>${missed.length ? '要多练练：' + missed.map(m => `${m.char}(${toneText(m.plain, m.tone)})`).join('　') : ''}`,
        again: () => go(balloonGame, opts), back: opts.back,
      });
    }, 600);
  }

  keyHandler = onKey;
  $('#go').onclick = begin;
  cleanup = () => { G.running = false; window.ArcadeFX?.stop(); cancelAnimationFrame(G.raf); };
  drawHUD();
}

// ======================= 打野鸭 =======================
function duckSetupScreen() {
  setTitle('🦆 打野鸭');
  let h = `<div class="screen-title">🦆 打野鸭</div>
    <div class="card">
      <p style="font-size:18px;margin-top:0">选一选要练习的课文（可以多选）：</p>
      <div class="row" id="units">`;
  CHAR_UNITS.forEach((u, i) => { h += `<label class="chip"><input type="checkbox" value="${i}" ${i < 2 ? 'checked' : ''}> ${u.unit}</label>`; });
  h += `</div>
      <div class="setting-row"><span>🐢 野鸭飞行速度</span>${speedSelectHtml('dSpeed')}</div>
      <div class="setting-row"><span>🎵 要标声调符号（ˉ ˊ ˇ ˋ）</span><label class="switch"><input type="checkbox" id="dTone" checked><span></span></label></div>
      <div class="setting-row" style="border:none"><span>👀 野鸭木牌上显示拼音（简单模式）</span><label class="switch"><input type="checkbox" id="dPy" ${S().pyHint ? 'checked' : ''}><span></span></label></div>
      <p class="sub">🏅 最高分：${save.duckBest || 0}</p>
      <div class="row center"><button class="btn purple" id="start">🎯 开始狩猎</button></div>
    </div>`;
  app.innerHTML = h;
  $('#dSpeed').onchange = () => { S().gameSpeed = $('#dSpeed').value; persist(); };
  $('#dPy').onchange = () => { S().pyHint = $('#dPy').checked; persist(); };
  onSettingsChange = () => {
    if ($('#dSpeed')) $('#dSpeed').value = S().gameSpeed || 'slow';
    if ($('#dPy')) $('#dPy').checked = !!S().pyHint;
  };
  $('#start').onclick = () => {
    sfx.ok();
    S().gameSpeed = $('#dSpeed').value; S().pyHint = $('#dPy').checked; persist();
    const sel = [...app.querySelectorAll('#units input:checked')].map(x => +x.value);
    if (!sel.length) { toast('请至少选一个单元哦'); return; }
    const pool = sel.flatMap(i => CHAR_UNITS[i].lessons.flatMap(l => LESSON_ITEMS[l.id]));
    go(duckGame, { pool, needTone: $('#dTone').checked, showPy: $('#dPy').checked, back: () => go(duckSetupScreen) });
    speak('打野鸭开始');
  };
}

const DUCK_THEMES = [
  { head: '#1b7a43', body: '#8d5524', wing: '#6d3f18', beak: '#ffb703' }, // 绿头野鸭
  { head: '#2b59c3', body: '#7f5539', wing: '#5c3d28', beak: '#fb8500' }, // 蓝羽野鸭
  { head: '#d97706', body: '#fde68a', wing: '#f59e0b', beak: '#ef4444' }, // 金色小黄鸭
  { head: '#7209b7', body: '#9d4edd', wing: '#5a189a', beak: '#ffbe0b' }, // 紫羽彩鸭
];

function duckSvg(theme) {
  return window.ArcadeFX.duck();
}

function duckGame(opts) {
  const needTone = opts.needTone !== false;
  let showPy = opts.showPy !== undefined ? !!opts.showPy : !!S().pyHint;
  setTitle('🦆 打野鸭');
  app.innerHTML = `
    <div class="hud">
      <button class="btn small gray" id="quit">✕</button>
      <span id="hearts"></span>
      <div class="typed" id="typed"></div>
      ${speedSwitchBarHtml()}
      <span>🦆 <span id="score">0</span></span>
    </div>
    <div class="duck-stage" id="stage">
      <div class="duck-scenery">
        <div class="duck-sun"></div>
        <div class="duck-reeds" style="left:16px">🌾🌿</div>
        <div class="duck-reeds" style="right:18px">🌿🌾</div>
        <div class="duck-grass"></div>
        <div class="hound-pop" id="hound">🐶</div>
      </div>
      <div class="overlay" id="ov"><div class="card" style="text-align:center;max-width:460px">
        <div style="font-size:60px">🦆🎯</div>
        <h2 style="margin:6px 0">野鸭飞出来啦！</h2>
        <p style="font-size:18px">看准野鸭木牌上的汉字，点出拼音${needTone ? '<b>再点声调符号</b>' : ''}，<br>就能开枪击落野鸭！飞跑 5 只就结束哦。</p>
        <button class="btn purple" id="go">🎯 开始狩猎！（回车）</button>
      </div></div>
    </div>
    ${inputPanelHtml(needTone)}`;
  bindKeyboard(app);
  $('#quit').onclick = () => { sfx.ok(); opts.back(); };

  const stage = $('#stage');
  const hound = $('#hound');
  let houndTimer = null;
  function popHound(emoji) {
    hound.textContent = emoji;
    hound.classList.add('show');
    clearTimeout(houndTimer);
    houndTimer = setTimeout(() => hound.classList.remove('show'), 1100);
  }

  let preset = (SPEED_PRESETS[S().gameSpeed] || SPEED_PRESETS.slow).duck;
  const G = { ducks: [], buf: '', score: 0, hearts: 5, running: false, last: 0, spawnT: 0, speed: preset.speed, interval: preset.interval, raf: 0, missed: [] };
  function applyDuckSpeed(spdKey) {
    S().gameSpeed = spdKey; persist();
    app.querySelectorAll('.spd-btn').forEach(b => b.classList.toggle('active', b.dataset.spd === spdKey));
    const oldBase = preset.speed;
    preset = (SPEED_PRESETS[spdKey] || SPEED_PRESETS.slow).duck;
    G.speed = Math.min(preset.max, preset.speed + G.score * preset.accel);
    G.interval = Math.max(preset.minInterval, preset.interval - G.score * 35);
    const ratio = preset.speed / (oldBase || 1);
    G.ducks.forEach(d => { d.speed *= ratio; });
  }
  app.querySelectorAll('.spd-btn').forEach(btn => btn.addEventListener('click', () => {
    sfx.key();
    applyDuckSpeed(btn.dataset.spd);
  }));
  onSettingsChange = () => {
    applyDuckSpeed(S().gameSpeed || 'slow');
    showPy = !!S().pyHint;
    G.ducks.forEach(d => {
      const sign = d.el.querySelector('.sign');
      if (sign) {
        sign.innerHTML = `${showPy ? `<div class="bp">${renderPy(d.it.plain, d.it.tone)}</div>` : ''}<div class="hz">${d.it.char}</div>`;
      }
    });
  };
  const drawHUD = () => {
    $('#hearts').textContent = '❤️'.repeat(G.hearts) + '🤍'.repeat(5 - G.hearts);
    $('#score').textContent = G.score;
    $('#typed').innerHTML = G.buf ? renderPy(G.buf.replace(/[0-5]$/, ''), /[1-4]$/.test(G.buf) ? +G.buf.slice(-1) : null) : '<span class="sub" style="font-size:18px">打拼音瞄准野鸭 🎯</span>';
    syncToneSelection(G.buf);
  };
  const answerOf = it => needTone ? (it.tone ? it.key + it.tone : it.key + '0') : it.key;

  function spawn() {
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const used = G.ducks.map(d => answerOf(d.it));
    const cand = shuffle(opts.pool).find(it => {
      const a = answerOf(it);
      return !used.some(u => u === a || (!needTone && (u.startsWith(a) || a.startsWith(u))));
    });
    if (!cand) return;

    const dir = Math.random() < 0.5 ? 1 : -1;
    const theme = DUCK_THEMES[Math.floor(Math.random() * DUCK_THEMES.length)];
    const el = document.createElement('div');
    el.className = 'duck' + (dir === -1 ? ' left' : '');
    el.innerHTML = `<div class="duck-inner">
      <div class="crosshair"></div>
      ${duckSvg(theme)}
      <div class="sign">
        ${showPy ? `<div class="bp">${renderPy(cand.plain, cand.tone)}</div>` : ''}
        <div class="hz">${cand.char}</div>
      </div>
    </div>`;

    const maxY = Math.max(70, H - 230);
    let baseY, tries = 0;
    do {
      baseY = 18 + Math.random() * maxY;
      tries++;
    } while (tries < 10 && G.ducks.some(d => Math.abs(d.baseY - baseY) < 68));

    const d = {
      el, it: cand, dir,
      x: dir === 1 ? -130 : W + 10,
      y: baseY, baseY,
      amp: 12 + Math.random() * 16,
      freq: 1.8 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      age: 0,
      speed: G.speed * (0.85 + Math.random() * 0.35),
    };
    el.style.transform = `translate(${d.x}px, ${d.y}px)`;
    el.style.cursor = 'pointer';
    window.ArcadeFX.bindHit(el, () => G.running && G.ducks.includes(d), () => shoot(d));
    stage.appendChild(el);
    G.ducks.push(d);
    sfx.quack();
  }

  function frame(t) {
    if (!G.running) return;
    const dt = Math.min(0.05, (t - (G.last || t)) / 1000);
    G.last = t;
    if (window.ArcadeFX?.frozen(stage, t)) { G.raf = requestAnimationFrame(frame); return; }
    G.spawnT -= dt * 1000;
    if (G.spawnT <= 0 && G.ducks.length < preset.maxCount) { spawn(); G.spawnT = G.interval; }
    const W = stage.clientWidth;
    for (const d of G.ducks.slice()) {
      d.age += dt;
      d.x += d.dir * d.speed * dt;
      d.y = d.baseY + Math.sin(d.age * d.freq + d.phase) * d.amp;
      d.el.style.transform = `translate(${d.x}px, ${d.y}px)`;
      d.el.style.setProperty('--bank', (Math.cos(d.age * d.freq + d.phase) * 3.2) + 'deg');
      if ((d.dir === 1 && d.x > W + 20) || (d.dir === -1 && d.x < -140)) escape(d);
    }
    G.raf = requestAnimationFrame(frame);
  }

  function escape(d) {
    remove(d);
    G.hearts--;
    G.missed.push(d.it);
    addMistake(d.it);
    sfx.bad();
    popHound('🐶💦');
    toast(`野鸭飞跑了：${d.it.char} ${toneText(d.it.plain, d.it.tone)}`, 1800);
    drawHUD();
    if (G.hearts <= 0) gameOver();
  }
  function remove(d) { G.ducks = G.ducks.filter(x => x !== d); d.el.remove(); }

  function shoot(d) {
    G.ducks = G.ducks.filter(x => x !== d);
    d.el.classList.remove('target');
    d.el.classList.add('hit');
    stage.classList.remove('flash'); void stage.offsetWidth; stage.classList.add('flash');

    window.ArcadeFX?.hit(stage, d.el, 'duck', G.score + 1);

    const ft = document.createElement('div');
    ft.className = 'float-text';
    ft.textContent = '🎯 +1 ' + toneText(d.it.plain, d.it.tone);
    ft.style.left = Math.max(10, Math.min(stage.clientWidth - 150, d.x + 10)) + 'px';
    ft.style.top = Math.max(20, d.y) + 'px';
    stage.appendChild(ft);
    setTimeout(() => { d.el.remove(); ft.remove(); }, 950);

    G.score++;
    sfx.shot();
    popHound('🐶👍');
    speakPinyin(d.it.plain, d.it.tone);
    G.speed = Math.min(preset.max, preset.speed + G.score * preset.accel);
    G.interval = Math.max(preset.minInterval, preset.interval - G.score * 35);
    G.spawnT = Math.min(G.spawnT, 520);
    G.buf = '';
    drawHUD();
  }

  function markTargets() {
    G.ducks.forEach(d => d.el.classList.toggle('target', !!G.buf && answerOf(d.it).startsWith(G.buf)));
  }

  function onKey(k) {
    if (!G.running) { if (k === 'Enter' || k === ' ') begin(); return; }
    if (k === 'Backspace') { sfx.del(); G.buf = G.buf.slice(0, -1); drawHUD(); markTargets(); return; }
    if (k === 'Enter' || k === ' ') {
      sfx.key();
      const hit = G.ducks.find(d => answerOf(d.it) === G.buf || (!needTone && d.it.key === G.buf));
      if (hit) shoot(hit);
      return;
    }
    let ch = k === 'ü' ? 'v' : k;
    if (/^[05]$/.test(ch)) ch = '0';
    if (!needTone && /^[0-9]$/.test(ch)) return;
    if (needTone && /^[0-9]$/.test(ch) && !G.buf) return;
    const nb = G.buf + ch;
    const matches = G.ducks.filter(d => answerOf(d.it).startsWith(nb));
    if (!matches.length) {
      sfx.bad();
      const t = $('#typed'); t.style.background = '#ffe1e1'; setTimeout(() => t.style.background = '', 250);
      if (/^[0-9]$/.test(ch)) { drawHUD(); return; }
      G.buf = ''; drawHUD(); markTargets(); return;
    }
    G.buf = nb;
    playTypedPinyin(G.buf, ch);
    const exact = matches.find(d => answerOf(d.it) === nb);
    if (exact && (needTone || matches.length === 1)) { shoot(exact); markTargets(); return; }
    drawHUD(); markTargets();
  }

  function begin() {
    sfx.ok();
    $('#ov').classList.add('hidden');
    G.running = true; window.ArcadeFX?.start(stage, 'duck', S().sound); G.last = 0; G.spawnT = 250;
    G.raf = requestAnimationFrame(frame);
  }

  function gameOver() {
    G.running = false; window.ArcadeFX?.stop();
    cancelAnimationFrame(G.raf);
    if (G.score > (save.duckBest || 0)) save.duckBest = G.score;
    const stars = G.score >= 25 ? 3 : G.score >= 12 ? 2 : G.score >= 5 ? 1 : 0;
    const missed = [...new Map(G.missed.map(m => [m.id, m])).values()];
    setTimeout(() => {
      showResult({
        stars, bonus: stars, line: `成功击落了 ${G.score} 只野鸭！最高纪录 ${save.duckBest}<br>${missed.length ? '要多练练：' + missed.map(m => `${m.char}(${toneText(m.plain, m.tone)})`).join('　') : ''}`,
        again: () => go(duckGame, opts), back: opts.back,
      });
    }, 600);
  }

  keyHandler = onKey;
  $('#go').onclick = begin;
  cleanup = () => { G.running = false; window.ArcadeFX?.stop(); cancelAnimationFrame(G.raf); clearTimeout(houndTimer); };
  drawHUD();
}

// ======================= 拼音吃豆人 =======================
const PAC_MAP = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0],
  [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  [0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];
const PAC_ROWS = PAC_MAP.length;
const PAC_COLS = PAC_MAP[0].length;
const GHOST_COLORS = ['#ff4d6d', '#00bbf9', '#f15bb5'];

function bfsPath(sr, sc, tr, tc) {
  if (sr === tr && sc === tc) return [];
  const q = [[sr, sc, []]];
  const vis = new Set([sr + ',' + sc]);
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  while (q.length) {
    const [r, c, path] = q.shift();
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      const k = nr + ',' + nc;
      if (nr >= 0 && nr < PAC_ROWS && nc >= 0 && nc < PAC_COLS && PAC_MAP[nr][nc] === 0 && !vis.has(k)) {
        const np = [...path, [nr, nc]];
        if (nr === tr && nc === tc) return np;
        vis.add(k);
        q.push([nr, nc, np]);
      }
    }
  }
  return [];
}

function pacmanSetupScreen() {
  setTitle('🟡 拼音吃豆人');
  let h = `<div class="screen-title">🟡 拼音吃豆人</div>
    <div class="card">
      <p style="font-size:18px;margin-top:0">选一选要练习的课文（可以多选）：</p>
      <div class="row" id="units">`;
  CHAR_UNITS.forEach((u, i) => { h += `<label class="chip"><input type="checkbox" value="${i}" ${i < 2 ? 'checked' : ''}> ${u.unit}</label>`; });
  h += `</div>
      <div class="setting-row"><span>👻 小幽灵移动速度</span>${speedSelectHtml('pSpeed')}</div>
      <div class="setting-row"><span>🎵 要标声调符号（ˉ ˊ ˇ ˋ）</span><label class="switch"><input type="checkbox" id="pTone" checked><span></span></label></div>
      <div class="setting-row" style="border:none"><span>👀 汉字豆上显示拼音（简单模式）</span><label class="switch"><input type="checkbox" id="pPy" ${S().pyHint ? 'checked' : ''}><span></span></label></div>
      <p class="sub">🏅 最高分：${save.pacBest || 0}</p>
      <div class="row center"><button class="btn orange" id="start">🟡 进入迷宫</button></div>
    </div>`;
  app.innerHTML = h;
  $('#pSpeed').onchange = () => { S().gameSpeed = $('#pSpeed').value; persist(); };
  $('#pPy').onchange = () => { S().pyHint = $('#pPy').checked; persist(); };
  onSettingsChange = () => {
    if ($('#pSpeed')) $('#pSpeed').value = S().gameSpeed || 'slow';
    if ($('#pPy')) $('#pPy').checked = !!S().pyHint;
  };
  $('#start').onclick = () => {
    sfx.ok();
    S().gameSpeed = $('#pSpeed').value; S().pyHint = $('#pPy').checked; persist();
    const sel = [...app.querySelectorAll('#units input:checked')].map(x => +x.value);
    if (!sel.length) { toast('请至少选一个单元哦'); return; }
    const pool = sel.flatMap(i => CHAR_UNITS[i].lessons.flatMap(l => LESSON_ITEMS[l.id]));
    go(pacmanGame, { pool, needTone: $('#pTone').checked, showPy: $('#pPy').checked, back: () => go(pacmanSetupScreen) });
    speak('拼音吃豆人开始');
  };
}

function pacmanGame(opts) {
  const needTone = opts.needTone !== false;
  let showPy = opts.showPy !== undefined ? !!opts.showPy : !!S().pyHint;
  setTitle('🟡 拼音吃豆人');
  app.innerHTML = `
    <div class="hud">
      <button class="btn small gray" id="quit">✕</button>
      <span id="hearts"></span>
      <div class="typed" id="typed"></div>
      ${speedSwitchBarHtml()}
      <span>🟡 <span id="score">0</span></span>
    </div>
    <div class="pac-stage" id="stage">
      <div class="pac-grid" id="grid"></div>
      <div class="overlay" id="ov"><div class="card" style="text-align:center;max-width:480px">
        <div style="font-size:56px">🟡 ⋯ 👻</div>
        <h2 style="margin:6px 0">拼音吃豆人！</h2>
        <p style="font-size:18px">迷宫里有<b>汉字能量豆</b>，打出哪个字的拼音${needTone ? '<b>+声调</b>' : ''}，<br>吃豆人就会自动跑过去吃掉它，还能把小幽灵吓跑！</p>
        <button class="btn orange" id="go">🟡 开始吃豆！（回车）</button>
      </div></div>
    </div>
    ${inputPanelHtml(needTone)}`;
  bindKeyboard(app);
  $('#quit').onclick = () => { sfx.ok(); opts.back(); };

  const gridEl = $('#grid');
  gridEl.style.gridTemplateColumns = `repeat(${PAC_COLS}, 1fr)`;
  gridEl.style.gridTemplateRows = `repeat(${PAC_ROWS}, 1fr)`;

  const cells = [];
  for (let r = 0; r < PAC_ROWS; r++) {
    cells[r] = [];
    for (let c = 0; c < PAC_COLS; c++) {
      const div = document.createElement('div');
      div.className = 'pac-cell' + (PAC_MAP[r][c] === 1 ? ' wall' : '');
      if (PAC_MAP[r][c] === 0 && !(r === 3 && c === 5)) {
        const dot = document.createElement('div');
        dot.className = 'pac-dot';
        div.appendChild(dot);
      }
      gridEl.appendChild(div);
      cells[r][c] = div;
    }
  }

  let preset = (SPEED_PRESETS[S().gameSpeed] || SPEED_PRESETS.slow).pac;
  const stageEl = $('#stage');
  const G = {
    pac: { r: 3, c: 5, dir: 0, el: null },
    ghosts: [],
    beans: [],
    beanSeq: 0,
    buf: '',
    wrongStreak: 0,
    score: 0,
    hearts: 5,
    running: false,
    moving: false,
    scaredUntil: 0,
    invincibleUntil: 0,
    missed: [],
    ghostTimer: null,
    stepTimers: [],
  };

  // 创建吃豆人 DOM
  const pacEl = document.createElement('div');
  pacEl.className = 'pac-actor';
  pacEl.style.width = (100 / PAC_COLS) + '%';
  pacEl.style.height = (100 / PAC_ROWS) + '%';
  pacEl.innerHTML = `<div class="pacman-body"><div class="pacman-mouth"></div></div>`;
  gridEl.appendChild(pacEl);
  G.pac.el = pacEl;

  function placeActor(actor) {
    actor.el.style.transform = `translate(${actor.c * 100}%, ${actor.r * 100}%)`;
    if (actor === G.pac) {
      const body = actor.el.querySelector('.pacman-body');
      if (body) body.style.transform = actor.dir === 180 ? 'scaleX(-1)' : `rotate(${actor.dir}deg)`;
    }
  }
  placeActor(G.pac);

  const ghostSpawns = [[0, 0], [0, PAC_COLS - 1], [PAC_ROWS - 1, 0]];
  function syncGhostCount() {
    while (G.ghosts.length < preset.ghostCount) {
      const i = G.ghosts.length;
      const [sr, sc] = ghostSpawns[i % ghostSpawns.length];
      const el = document.createElement('div');
      el.className = 'pac-actor';
      el.style.width = (100 / PAC_COLS) + '%';
      el.style.height = (100 / PAC_ROWS) + '%';
      el.innerHTML = `<div class="pac-ghost" style="background:${GHOST_COLORS[i % GHOST_COLORS.length]}"><div class="eyes"><span></span><span></span></div></div>`;
      gridEl.appendChild(el);
      const g = { r: sr, c: sc, lr: sr, lc: sc, startR: sr, startC: sc, el };
      placeActor(g);
      G.ghosts.push(g);
    }
    while (G.ghosts.length > preset.ghostCount) {
      const g = G.ghosts.pop();
      g.el.remove();
    }
  }
  syncGhostCount();

  const answerOf = it => needTone ? (it.tone ? it.key + it.tone : it.key + '0') : it.key;

  const drawHUD = () => {
    $('#hearts').textContent = '❤️'.repeat(G.hearts) + '🤍'.repeat(5 - G.hearts);
    $('#score').textContent = G.score;
    $('#typed').innerHTML = G.buf ? renderPy(G.buf.replace(/[0-5]$/, ''), /[1-4]$/.test(G.buf) ? +G.buf.slice(-1) : null) : '<span class="sub" style="font-size:18px">打汉字拼音，引导吃豆人去吃它！</span>';
    syncToneSelection(G.buf);
  };

  function spawnBean() {
    const usedAns = G.beans.map(b => answerOf(b.it));
    const cand = shuffle(opts.pool).find(it => {
      const a = answerOf(it);
      return !usedAns.some(u => u === a || (!needTone && (u.startsWith(a) || a.startsWith(u))));
    });
    if (!cand) return;

    const candidates = [];
    for (let r = 0; r < PAC_ROWS; r++) {
      for (let c = 0; c < PAC_COLS; c++) {
        if (PAC_MAP[r][c] !== 0) continue;
        if (Math.abs(r - G.pac.r) + Math.abs(c - G.pac.c) < 2) continue;
        if (G.beans.some(b => Math.abs(b.r - r) + Math.abs(b.c - c) < 2)) continue;
        candidates.push([r, c]);
      }
    }
    if (!candidates.length) return;
    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    G.beanSeq++;
    const isSuper = (G.beanSeq % 3 === 0); // 每第 3 颗是带闪电的超级能量豆
    const el = document.createElement('div');
    el.className = 'pac-bean' + (isSuper ? ' super' : '');
    el.innerHTML = `${showPy ? `<div class="bp">${renderPy(cand.plain, cand.tone)}</div>` : ''}<div class="hz">${cand.char}</div>`;
    const dot = cells[r][c].querySelector('.pac-dot');
    if (dot) dot.style.display = 'none';
    const bObj = { r, c, it: cand, el, isSuper };
    el.style.cursor = 'pointer';
    el.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (G.running && !G.moving) runToBean(bObj);
    });
    cells[r][c].appendChild(el);
    G.beans.push(bObj);
  }

  for (let i = 0; i < 5; i++) spawnBean();

  function hurtPac(msg) {
    G.hearts--;
    G.invincibleUntil = Date.now() + 1800;
    sfx.bad();
    stageEl.classList.remove('hurt'); void stageEl.offsetWidth; stageEl.classList.add('hurt');
    if (G.beans.length) {
      const nearest = G.beans.slice().sort((a, b) => (Math.abs(a.r - G.pac.r) + Math.abs(a.c - G.pac.c)) - (Math.abs(b.r - G.pac.r) + Math.abs(b.c - G.pac.c)))[0];
      G.missed.push(nearest.it);
      addMistake(nearest.it);
    }
    toast(msg, 1800);
    drawHUD();
    if (G.hearts <= 0) gameOver();
  }

  function updateScaredVisual() {
    const scared = Date.now() < G.scaredUntil;
    G.ghosts.forEach(g => {
      const body = g.el.querySelector('.pac-ghost');
      if (body) body.classList.toggle('scared', scared);
    });
  }

  function eatBean(bean) {
    G.beans = G.beans.filter(b => b !== bean);
    bean.el.remove();
    G.score += bean.isSuper ? 8 : 5;
    G.wrongStreak = 0;
    sfx.ok();
    speakPinyin(bean.it.plain, bean.it.tone);

    const ft = document.createElement('div');
    ft.className = 'float-text';
    ft.textContent = (bean.isSuper ? '⚡ +8 ' : '😋 +5 ') + toneText(bean.it.plain, bean.it.tone);
    ft.style.left = ((bean.c + 0.5) / PAC_COLS * 100) + '%';
    ft.style.top = ((bean.r + 0.5) / PAC_ROWS * 100) + '%';
    gridEl.appendChild(ft);
    setTimeout(() => ft.remove(), 1100);

    // 只有吃到带 ⚡ 的超级能量豆，小幽灵才会变蓝害怕 3.5 秒
    if (bean.isSuper) {
      G.scaredUntil = Date.now() + 3500;
      updateScaredVisual();
      setTimeout(updateScaredVisual, 3600);
    }

    spawnBean();
    // 如果沿途小黄点吃得差不多了，重新铺满小黄点奖励
    const remainingDots = gridEl.querySelectorAll('.pac-dot');
    if (remainingDots.length < 6) {
      for (let r = 0; r < PAC_ROWS; r++) {
        for (let c = 0; c < PAC_COLS; c++) {
          if (PAC_MAP[r][c] === 0 && !cells[r][c].querySelector('.pac-dot') && !G.beans.some(b => b.r === r && b.c === c)) {
            const dot = document.createElement('div');
            dot.className = 'pac-dot';
            cells[r][c].appendChild(dot);
          }
        }
      }
    }
    drawHUD();
  }

  function checkGhostCollision() {
    if (!G.running) return;
    const now = Date.now();
    for (const g of G.ghosts) {
      if (g.r === G.pac.r && g.c === G.pac.c) {
        if (now < G.scaredUntil) {
          // 吃掉害怕的小幽灵加分！
          G.score += 10;
          sfx.pop();
          toast('⚡ 撞飞小幽灵 +10 分！', 1400);
          g.r = g.startR; g.c = g.startC;
          placeActor(g);
          drawHUD();
        } else if (now > G.invincibleUntil) {
          // 无论在原地发呆还是跑路途中撞上正常幽灵，都会被咬伤扣心！
          G.stepTimers.forEach(clearTimeout);
          G.stepTimers = [];
          G.moving = false;
          g.r = g.startR; g.c = g.startC;
          placeActor(g);
          hurtPac('👻 哎呀，被小幽灵抓到啦！扣 1 颗 ❤️');
          break;
        }
      }
    }
  }

  function runToBean(bean) {
    G.moving = true;
    G.buf = '';
    markTargets();
    drawHUD();
    const path = bfsPath(G.pac.r, G.pac.c, bean.r, bean.c);
    if (!path.length) {
      eatBean(bean);
      G.moving = false;
      return;
    }
    path.forEach(([nr, nc], i) => {
      const t = setTimeout(() => {
        if (!G.running) return;
        const dr = nr - G.pac.r, dc = nc - G.pac.c;
        if (dc === 1) G.pac.dir = 0;
        else if (dc === -1) G.pac.dir = 180;
        else if (dr === -1) G.pac.dir = 270;
        else if (dr === 1) G.pac.dir = 90;
        G.pac.r = nr; G.pac.c = nc;
        placeActor(G.pac);

        // 吃掉沿途小黄点
        const dot = cells[nr][nc].querySelector('.pac-dot');
        if (dot && dot.style.display !== 'none') {
          dot.remove();
          G.score += 1;
          sfx.waka();
        } else if (i % 2 === 0) {
          sfx.waka();
        }

        checkGhostCollision();

        if (i === path.length - 1) {
          eatBean(bean);
          G.moving = false;
        }
      }, i * 125);
      G.stepTimers.push(t);
    });
  }

  function ghostStep() {
    if (!G.running) return;
    updateScaredVisual();
    const scared = Date.now() < G.scaredUntil;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    G.ghosts.forEach((g, gi) => {
      if (!scared) {
        // 用 BFS 寻路主动追击吃豆人（第 1 只幽灵 90% 走最短路，其他幽灵 70% 走最短路形成包抄）
        const path = bfsPath(g.r, g.c, G.pac.r, G.pac.c);
        if (path.length && Math.random() < (gi === 0 ? 0.9 : 0.7)) {
          g.lr = g.r; g.lc = g.c;
          g.r = path[0][0]; g.c = path[0][1];
          placeActor(g);
          return;
        }
      }
      const valid = dirs
        .map(([dr, dc]) => [g.r + dr, g.c + dc])
        .filter(([nr, nc]) => nr >= 0 && nr < PAC_ROWS && nc >= 0 && nc < PAC_COLS && PAC_MAP[nr][nc] === 0);
      if (!valid.length) return;
      const forward = valid.filter(([nr, nc]) => !(nr === g.lr && nc === g.lc));
      const choices = forward.length ? forward : valid;
      choices.sort((a, b) => {
        const da = Math.abs(a[0] - G.pac.r) + Math.abs(a[1] - G.pac.c);
        const db = Math.abs(b[0] - G.pac.r) + Math.abs(b[1] - G.pac.c);
        return scared ? db - da : da - db;
      });
      const pick = choices[0];
      g.lr = g.r; g.lc = g.c;
      g.r = pick[0]; g.c = pick[1];
      placeActor(g);
    });
    checkGhostCollision();
  }

  function restartGhostTimer() {
    clearInterval(G.ghostTimer);
    if (G.running) G.ghostTimer = setInterval(ghostStep, preset.ghostMs);
  }

  function applyPacSpeed(spdKey) {
    S().gameSpeed = spdKey; persist();
    app.querySelectorAll('.spd-btn').forEach(b => b.classList.toggle('active', b.dataset.spd === spdKey));
    preset = (SPEED_PRESETS[spdKey] || SPEED_PRESETS.slow).pac;
    syncGhostCount();
    restartGhostTimer();
  }
  app.querySelectorAll('.spd-btn').forEach(btn => btn.addEventListener('click', () => {
    sfx.key();
    applyPacSpeed(btn.dataset.spd);
  }));
  onSettingsChange = () => {
    applyPacSpeed(S().gameSpeed || 'slow');
    showPy = !!S().pyHint;
    G.beans.forEach(b => {
      b.el.innerHTML = `${showPy ? `<div class="bp">${renderPy(b.it.plain, b.it.tone)}</div>` : ''}<div class="hz">${b.it.char}</div>`;
    });
  };

  function markTargets() {
    G.beans.forEach(b => b.el.classList.toggle('target', !!G.buf && answerOf(b.it).startsWith(G.buf)));
  }

  function onKey(k) {
    if (!G.running) { if (k === 'Enter' || k === ' ') begin(); return; }
    if (G.moving) return;
    if (k === 'Backspace') { sfx.del(); G.buf = G.buf.slice(0, -1); drawHUD(); markTargets(); return; }
    if (k === 'Enter' || k === ' ') {
      sfx.key();
      const hit = G.beans.find(b => answerOf(b.it) === G.buf || (!needTone && b.it.key === G.buf));
      if (hit) runToBean(hit);
      return;
    }
    let ch = k === 'ü' ? 'v' : k;
    if (/^[05]$/.test(ch)) ch = '0';
    if (!needTone && /^[0-9]$/.test(ch)) return;
    if (needTone && /^[0-9]$/.test(ch) && !G.buf) return;
    const nb = G.buf + ch;
    const matches = G.beans.filter(b => answerOf(b.it).startsWith(nb));
    if (!matches.length) {
      sfx.bad();
      const t = $('#typed'); t.style.background = '#ffe1e1'; setTimeout(() => t.style.background = '', 250);
      G.wrongStreak++;
      // 打错拼音惩罚：幽灵立刻逼近一步；连续打错 3 次直接扣 1 颗心！
      ghostStep();
      if (G.wrongStreak >= 3) {
        G.wrongStreak = 0;
        hurtPac('❌ 连续打错 3 次拼音，扣 1 颗 ❤️！');
      }
      if (/^[0-9]$/.test(ch)) { drawHUD(); return; }
      G.buf = ''; drawHUD(); markTargets(); return;
    }
    G.buf = nb;
    playTypedPinyin(G.buf, ch);
    const exact = matches.find(b => answerOf(b.it) === nb);
    if (exact && (needTone || matches.length === 1)) { runToBean(exact); return; }
    drawHUD(); markTargets();
  }

  function begin() {
    sfx.ok();
    $('#ov').classList.add('hidden');
    G.running = true;
    restartGhostTimer();
  }

  function gameOver() {
    G.running = false; window.ArcadeFX?.stop();
    clearInterval(G.ghostTimer);
    G.stepTimers.forEach(clearTimeout);
    if (G.score > (save.pacBest || 0)) save.pacBest = G.score;
    const stars = G.score >= 80 ? 3 : G.score >= 40 ? 2 : G.score >= 15 ? 1 : 0;
    const missed = [...new Map(G.missed.map(m => [m.id, m])).values()];
    setTimeout(() => {
      showResult({
        stars, bonus: stars, line: `吃豆人得了 ${G.score} 分！最高纪录 ${save.pacBest}<br>${missed.length ? '要多练练：' + missed.map(m => `${m.char}(${toneText(m.plain, m.tone)})`).join('　') : ''}`,
        again: () => go(pacmanGame, opts), back: opts.back,
      });
    }, 500);
  }

  keyHandler = onKey;
  $('#go').onclick = begin;
  cleanup = () => { G.running = false; window.ArcadeFX?.stop(); clearInterval(G.ghostTimer); G.stepTimers.forEach(clearTimeout); };
  drawHUD();
}

// ======================= 坦克保卫战 =======================
function tankSetupScreen() {
  setTitle('🛡️ 坦克保卫战');
  let h = `<div class="screen-title">🛡️ 坦克保卫战</div>
    <div class="card">
      <p style="font-size:18px;margin-top:0">选一选要练习的课文（可以多选）：</p>
      <div class="row" id="units">`;
  CHAR_UNITS.forEach((u, i) => { h += `<label class="chip"><input type="checkbox" value="${i}" ${i < 2 ? 'checked' : ''}> ${u.unit}</label>`; });
  h += `</div>
      <div class="setting-row"><span>🐢 敌方坦克推进速度</span>${speedSelectHtml('tSpeed')}</div>
      <div class="setting-row"><span>🎵 要标声调符号（ˉ ˊ ˇ ˋ）</span><label class="switch"><input type="checkbox" id="tTone" checked><span></span></label></div>
      <div class="setting-row" style="border:none"><span>👀 坦克装甲牌上显示拼音（简单模式）</span><label class="switch"><input type="checkbox" id="tPy" ${S().pyHint ? 'checked' : ''}><span></span></label></div>
      <p class="sub">🏅 最高分：${save.tankBest || 0}</p>
      <div class="row center"><button class="btn" style="background:#4d7c0f" id="start">🛡️ 保卫大本营</button></div>
    </div>`;
  app.innerHTML = h;
  $('#tSpeed').onchange = () => { S().gameSpeed = $('#tSpeed').value; persist(); };
  $('#tPy').onchange = () => { S().pyHint = $('#tPy').checked; persist(); };
  onSettingsChange = () => {
    if ($('#tSpeed')) $('#tSpeed').value = S().gameSpeed || 'slow';
    if ($('#tPy')) $('#tPy').checked = !!S().pyHint;
  };
  $('#start').onclick = () => {
    sfx.ok();
    S().gameSpeed = $('#tSpeed').value; S().pyHint = $('#tPy').checked; persist();
    const sel = [...app.querySelectorAll('#units input:checked')].map(x => +x.value);
    if (!sel.length) { toast('请至少选一个单元哦'); return; }
    const pool = sel.flatMap(i => CHAR_UNITS[i].lessons.flatMap(l => LESSON_ITEMS[l.id]));
    go(tankGame, { pool, needTone: $('#tTone').checked, showPy: $('#tPy').checked, back: () => go(tankSetupScreen) });
    speak('坦克保卫战开始');
  };
}

const TANK_COLORS = [
  { hull: '#dc2626', turret: '#991b1b', barrel: '#fca5a5' }, // 红色重坦
  { hull: '#2563eb', turret: '#1e40af', barrel: '#93c5fd' }, // 蓝色装甲
  { hull: '#d97706', turret: '#92400e', barrel: '#fde68a' }, // 沙漠黄坦
  { hull: '#7c3aed', turret: '#5b21b6', barrel: '#ddd6fe' }, // 紫色突击坦
];

function enemyTankSvg(c) {
  return window.ArcadeFX.tank(false);
}

function heroTurretSvg() {
  return window.ArcadeFX.tank(true);
}

function tankGame(opts) {
  const needTone = opts.needTone !== false;
  let showPy = opts.showPy !== undefined ? !!opts.showPy : !!S().pyHint;
  setTitle('🛡️ 坦克保卫战');
  app.innerHTML = `
    <div class="hud">
      <button class="btn small gray" id="quit">✕</button>
      <span id="hearts"></span>
      <div class="typed" id="typed"></div>
      ${speedSwitchBarHtml()}
      <span>💥 <span id="score">0</span></span>
    </div>
    <div class="tank-stage" id="stage">
      <div class="tank-lanes"></div>
      <div class="tank-base" id="base">
        <div class="brick-wall"></div>
        <div class="hero-tank">
          ${heroTurretSvg()}
          <div class="base-eagle">🦅 大本营</div>
        </div>
      </div>
      <div class="overlay" id="ov"><div class="card" style="text-align:center;max-width:480px">
        <div style="font-size:58px">🛡️💥🚜</div>
        <h2 style="margin:6px 0">保卫老鹰大本营！</h2>
        <p style="font-size:18px">敌方装甲坦克正从上方开过来！<br>点出坦克上汉字的拼音${needTone ? '<b>+声调符号</b>' : ''}，<br>我方金色坦克就会旋转炮塔发射炮弹轰碎它！</p>
        <button class="btn" style="background:#4d7c0f" id="go">💥 开始战斗！（回车）</button>
      </div></div>
    </div>
    ${inputPanelHtml(needTone)}`;
  bindKeyboard(app);
  $('#quit').onclick = () => { sfx.ok(); opts.back(); };

  const stage = $('#stage');
  const turretEl = $('#heroTurret');
  let preset = (SPEED_PRESETS[S().gameSpeed] || SPEED_PRESETS.slow).tank;
  const G = { tanks: [], buf: '', score: 0, hearts: 5, running: false, last: 0, spawnT: 0, speed: preset.speed, interval: preset.interval, raf: 0, missed: [] };

  const drawHUD = () => {
    $('#hearts').textContent = '❤️'.repeat(G.hearts) + '🤍'.repeat(5 - G.hearts);
    $('#score').textContent = G.score;
    $('#typed').innerHTML = G.buf ? renderPy(G.buf.replace(/[0-5]$/, ''), /[1-4]$/.test(G.buf) ? +G.buf.slice(-1) : null) : '<span class="sub" style="font-size:18px">打拼音瞄准敌方坦克开炮 💥</span>';
    syncToneSelection(G.buf);
  };
  const answerOf = it => needTone ? (it.tone ? it.key + it.tone : it.key + '0') : it.key;

  function applyTankSpeed(spdKey) {
    S().gameSpeed = spdKey; persist();
    app.querySelectorAll('.spd-btn').forEach(b => b.classList.toggle('active', b.dataset.spd === spdKey));
    const oldBase = preset.speed;
    preset = (SPEED_PRESETS[spdKey] || SPEED_PRESETS.slow).tank;
    G.speed = Math.min(preset.max, preset.speed + G.score * preset.accel);
    G.interval = Math.max(preset.minInterval, preset.interval - G.score * 35);
    const ratio = preset.speed / (oldBase || 1);
    G.tanks.forEach(t => { t.speed *= ratio; });
  }
  app.querySelectorAll('.spd-btn').forEach(btn => btn.addEventListener('click', () => {
    sfx.key();
    applyTankSpeed(btn.dataset.spd);
  }));
  onSettingsChange = () => {
    applyTankSpeed(S().gameSpeed || 'slow');
    showPy = !!S().pyHint;
    G.tanks.forEach(t => {
      const sign = t.el.querySelector('.sign');
      if (sign) {
        sign.innerHTML = `${showPy ? `<div class="bp">${renderPy(t.it.plain, t.it.tone)}</div>` : ''}<div class="hz">${t.it.char}</div>`;
      }
    });
  };

  function spawn() {
    const W = stage.clientWidth;
    const used = G.tanks.map(t => answerOf(t.it));
    const cand = shuffle(opts.pool).find(it => {
      const a = answerOf(it);
      return !used.some(u => u === a || (!needTone && (u.startsWith(a) || a.startsWith(u))));
    });
    if (!cand) return;

    // 4 条车道，优先选顶部没有坦克的车道
    const lanes = [0, 1, 2, 3].filter(l => !G.tanks.some(t => t.lane === l && t.y < 145));
    if (!lanes.length) return;
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const laneW = W / 4;
    const x = lane * laneW + (laneW - 116) / 2;

    const theme = TANK_COLORS[Math.floor(Math.random() * TANK_COLORS.length)];
    const el = document.createElement('div');
    el.className = 'enemy-tank';
    el.innerHTML = `<div class="sign">
        ${showPy ? `<div class="bp">${renderPy(cand.plain, cand.tone)}</div>` : ''}
        <div class="hz">${cand.char}</div>
      </div>
      ${enemyTankSvg(theme)}
      <div class="crosshair"></div>`;

    const t = { el, it: cand, lane, x, y: -125, speed: G.speed * (0.9 + Math.random() * 0.2) };
    el.style.transform = `translate(${t.x}px, ${t.y}px)`;
    el.style.cursor = 'pointer';
    window.ArcadeFX.bindHit(el, () => G.running && G.tanks.includes(t), () => fireAt(t));
    stage.appendChild(el);
    G.tanks.push(t);
  }

  function frame(ts) {
    if (!G.running) return;
    const dt = Math.min(0.05, (ts - (G.last || ts)) / 1000);
    G.last = ts;
    if (window.ArcadeFX?.frozen(stage, ts)) { G.raf = requestAnimationFrame(frame); return; }
    G.spawnT -= dt * 1000;
    if (G.spawnT <= 0 && G.tanks.length < preset.maxCount) { spawn(); G.spawnT = G.interval; }
    const H = stage.clientHeight;
    const dangerY = H - 178; // 逼近大本营防线
    for (const t of G.tanks.slice()) {
      t.y += t.speed * dt;
      t.el.style.transform = `translate(${t.x}px, ${t.y}px)`;
      if (t.y > dangerY) breach(t);
    }
    G.raf = requestAnimationFrame(frame);
  }

  function breach(t) {
    remove(t);
    G.hearts--;
    G.missed.push(t.it);
    addMistake(t.it);
    sfx.bad();
    stage.classList.remove('boom-shake'); void stage.offsetWidth; stage.classList.add('boom-shake');
    toast(`⚠️ 敌方坦克撞到了大本营：${t.it.char} ${toneText(t.it.plain, t.it.tone)}`, 1900);
    drawHUD();
    if (G.hearts <= 0) gameOver();
  }
  function remove(t) { G.tanks = G.tanks.filter(x => x !== t); t.el.remove(); }

  function aimTurretAt(targetTank) {
    if (!turretEl || !targetTank) return 0;
    const W = stage.clientWidth, H = stage.clientHeight;
    const bx = W / 2, by = H - 55;
    const tx = targetTank.x + 58, ty = targetTank.y + 60;
    const deg = Math.atan2(tx - bx, by - ty) * 180 / Math.PI;
    turretEl.style.transform = `rotate(${deg}deg)`;
    return deg;
  }

  function fireAt(t) {
    G.tanks = G.tanks.filter(x => x !== t);
    t.el.classList.remove('target');
    const deg = aimTurretAt(t);
    sfx.cannon();
    window.ArcadeFX?.recoil(stage);

    // 发射炮弹动画
    const W = stage.clientWidth, H = stage.clientHeight;
    const sx = W / 2 - 7, sy = H - 68;
    const tx = t.x + 51, ty = t.y + 60;
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
      window.ArcadeFX?.hit(stage, t.el, 'tank', G.score);
      stage.classList.remove('boom-shake'); void stage.offsetWidth; stage.classList.add('boom-shake');

      const exp = document.createElement('div');
      exp.className = 'tank-explosion';
      exp.textContent = '💥';
      exp.style.left = (t.x + 58) + 'px';
      exp.style.top = (t.y + 68) + 'px';
      stage.appendChild(exp);

      const ft = document.createElement('div');
      ft.className = 'float-text';
      ft.textContent = '💥 +1 ' + toneText(t.it.plain, t.it.tone);
      ft.style.left = Math.max(10, Math.min(W - 150, t.x + 10)) + 'px';
      ft.style.top = Math.max(20, t.y + 20) + 'px';
      stage.appendChild(ft);

      setTimeout(() => { t.el.remove(); exp.remove(); ft.remove(); }, 950);
    }, 180);

    G.score++;
    speakPinyin(t.it.plain, t.it.tone);
    G.speed = Math.min(preset.max, preset.speed + G.score * preset.accel);
    G.interval = Math.max(preset.minInterval, preset.interval - G.score * 35);
    G.spawnT = Math.min(G.spawnT, 520);
    G.buf = '';
    drawHUD();
  }

  function markTargets() {
    let locked = null;
    G.tanks.forEach(t => {
      const m = !!G.buf && answerOf(t.it).startsWith(G.buf);
      t.el.classList.toggle('target', m);
      if (m && (!locked || t.y > locked.y)) locked = t;
    });
    if (locked) aimTurretAt(locked);
  }

  function onKey(k) {
    if (!G.running) { if (k === 'Enter' || k === ' ') begin(); return; }
    if (k === 'Backspace') { sfx.del(); G.buf = G.buf.slice(0, -1); drawHUD(); markTargets(); return; }
    if (k === 'Enter' || k === ' ') {
      sfx.key();
      const hit = G.tanks.find(t => answerOf(t.it) === G.buf || (!needTone && t.it.key === G.buf));
      if (hit) fireAt(hit);
      return;
    }
    let ch = k === 'ü' ? 'v' : k;
    if (/^[05]$/.test(ch)) ch = '0';
    if (!needTone && /^[0-9]$/.test(ch)) return;
    if (needTone && /^[0-9]$/.test(ch) && !G.buf) return;
    const nb = G.buf + ch;
    const matches = G.tanks.filter(t => answerOf(t.it).startsWith(nb));
    if (!matches.length) {
      sfx.bad();
      const typedEl = $('#typed'); typedEl.style.background = '#ffe1e1'; setTimeout(() => typedEl.style.background = '', 250);
      if (/^[0-9]$/.test(ch)) { drawHUD(); return; }
      G.buf = ''; drawHUD(); markTargets(); return;
    }
    G.buf = nb;
    playTypedPinyin(G.buf, ch);
    const exact = matches.find(t => answerOf(t.it) === nb);
    if (exact && (needTone || matches.length === 1)) { fireAt(exact); markTargets(); return; }
    drawHUD(); markTargets();
  }

  function begin() {
    sfx.ok();
    $('#ov').classList.add('hidden');
    G.running = true; window.ArcadeFX?.start(stage, 'tank', S().sound); G.last = 0; G.spawnT = 250;
    G.raf = requestAnimationFrame(frame);
  }

  function gameOver() {
    G.running = false; window.ArcadeFX?.stop();
    cancelAnimationFrame(G.raf);
    if (G.score > (save.tankBest || 0)) save.tankBest = G.score;
    const stars = G.score >= 25 ? 3 : G.score >= 12 ? 2 : G.score >= 5 ? 1 : 0;
    const missed = [...new Map(G.missed.map(m => [m.id, m])).values()];
    setTimeout(() => {
      showResult({
        stars, bonus: stars, line: `轰碎了 ${G.score} 辆敌方坦克！最高纪录 ${save.tankBest}<br>${missed.length ? '要多练练：' + missed.map(m => `${m.char}(${toneText(m.plain, m.tone)})`).join('　') : ''}`,
        again: () => go(tankGame, opts), back: opts.back,
      });
    }, 600);
  }

  keyHandler = onKey;
  $('#go').onclick = begin;
  cleanup = () => { G.running = false; window.ArcadeFX?.stop(); cancelAnimationFrame(G.raf); };
  drawHUD();
}

// ======================= 错题本 =======================
function mistakesScreen() {
  setTitle('📒 错题本');
  const list = Object.entries(save.mistakes).sort((a, b) => b[1].n - a[1].n);
  let h = `<div class="screen-title">📒 错题本 <span class="sub">做错两次的字会自动记在这里，练对了就会消失</span></div>`;
  if (!list.length) {
    h += `<div class="card" style="text-align:center;font-size:22px">🎉 错题本是空的，真棒！</div>`;
  } else {
    h += `<div class="mistake-list">`;
    list.forEach(([id, m]) => {
      const c = charItem(m.s);
      h += `<button class="char-card" data-s="${escapeHtml(m.s)}"><div>${renderPy(c.plain, c.tone)}</div><div class="hz">${c.char}</div><div class="wd">${c.word}</div><div class="cnt">错 ${m.n} 次</div></button>`;
    });
    h += `</div><div class="row center" style="margin-top:24px"><button class="btn purple" id="practice">💪 练习错题</button><button class="btn gray small" id="clear">清空</button></div>`;
  }
  app.innerHTML = h;
  app.querySelectorAll('.char-card').forEach(b => b.addEventListener('click', () => {
    sfx.pop();
    speakItem(charItem(b.dataset.s));
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }));
  if (list.length) {
    $('#practice').onclick = () => {
      sfx.ok();
      go(startRound, { title: '练习错题', items: shuffle(list.map(([, m]) => charItem(m.s))).slice(0, 15), requireTone: true, starKey: null, isReview: true, back: () => go(mistakesScreen) });
      speak('练习错题');
    };
    $('#clear').onclick = () => {
      sfx.del();
      if (confirm('确定清空错题本吗？')) { save.mistakes = {}; persist(); go(mistakesScreen); toast('错题本已清空'); }
    };
  }
}

// ======================= 贴纸 =======================
const STICKER_NAMES = [
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
  app.innerHTML = `<div class="screen-title">🏆 我的贴纸 <span class="sub">每得到 5 颗 ⭐ 就能解锁一张新贴纸（点贴纸听发音）</span></div>
    <div class="card" style="margin-bottom:16px;font-size:20px">你一共有 <b>${total}</b> 颗 ⭐，${n < STICKERS.length ? `再得 <b>${5 - total % 5}</b> 颗就能拿到下一张贴纸！` : '全部贴纸都集齐啦！🎉'}</div>
    <div class="sticker-book">${STICKERS.map((s, i) => `<button type="button" class="sticker ${i < n ? '' : 'locked'}" data-i="${i}" style="cursor:pointer" title="${i < n ? '点击听发音' : '未解锁'}">${i < n ? s : '❓'}</button>`).join('')}</div>`;

  app.querySelectorAll('.sticker').forEach(b => {
    const i = +b.dataset.i;
    b.addEventListener('click', () => {
      if (i < n) {
        sfx.win();
        b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
        const name = STICKER_NAMES[i] || '神奇贴纸';
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

// ======================= 家长说明 =======================
function helpScreen() {
  setTitle('👨‍👩‍👦 家长说明');
  app.innerHTML = `<div class="card" style="font-size:17px;line-height:1.8">
    <h2 style="margin-top:0">👨‍👩‍👦 给家长的说明</h2>
    <p>📚 内容来自部编版《语文》一年级上册：<b>汉语拼音 14 课</b> + 整体认读音节，以及课本<b>识字表全部 280 个生字</b>（按课文顺序排列，含多音字 地 de、着 zháo、数 shǔ、长 zhǎng）。</p>
    <p>⌨️ <b>打字方法</b>：先打拼音字母，再按数字键选声调：<b>1</b>=ˉ 一声、<b>2</b>=ˊ 二声、<b>3</b>=ˇ 三声、<b>4</b>=ˋ 四声、<b>0</b>=轻声。<b>ü 用 v 键</b>打（如 女 = nv3，绿 = lv4）。</p>
    <p>🈶 <b>请切换到英文输入法</b>（Mac 上按一下 Caps Lock，或 Ctrl+空格）。中文输入法下按键会被拦截。</p>
    <p>🎯 <b>推荐学习顺序</b>：拼音乐园（跟课本进度）→ 声调小精灵 → 汉字闯关（先“学一学”再闯关）→ 气球大作战巩固。</p>
    <p>💡 每题答错两次会出现提示，并且屏幕键盘会<b>闪烁提示下一个要按的键</b>，帮助孩子熟悉键盘。答错的字会进入<b>错题本</b>。</p>
    <p>🔊 拼音点读和键盘跟读使用内置 TTS 配音，可离线播放。连续输入会读出已组成的拼音；选声调后读带调音节。中文讲解默认使用内置的温柔女老师配音，由神经网络 TTS 合成。可在设置中试听并调节语速。</p>
    <p class="sub">全部朗读统一使用女老师神经网络 TTS 合成配音。拼音配音来源和声调处理记录见项目 AUDIO_SOURCES.md。</p>
    <p>💾 进度保存在本机浏览器里。可在 ⚙️ 设置中调整题量、提示和朗读速度，或重置进度。</p>
    <p>⏰ 建议每次玩 15~20 分钟，注意保护眼睛哦！</p>
  </div>`;
}

// ======================= 设置 =======================
function settingsModal() {
  const s = S();
  const eng = s.voiceEngine || 'teacher';
  const m = $('#modal');
  m.innerHTML = `<div class="card">
    <h2 style="margin-top:0">⚙️ 设置 <span class="sub" style="font-size:14px">（修改后立即生效）</span></h2>
    <div class="setting-row"><span>🔊 声音和朗读</span><label class="switch"><input type="checkbox" id="sSound" ${s.sound ? 'checked' : ''}><span></span></label></div>
    <div class="setting-row"><span>🔤 输入拼音跟读</span><label class="switch"><input type="checkbox" id="sKeyVoice" ${s.keyVoice !== false ? 'checked' : ''}><span></span></label></div>
    <p class="sub">温柔女老师配音已内置，离线也能听。拼音组合和四声也使用同一女老师声线的合成配音。</p>
    <div class="setting-row"><span>🎙️ 中文讲解语音</span>
      <select id="sVoice">
        <option value="teacher" ${eng === 'teacher' ? 'selected' : ''}>温柔女老师（内置配音·推荐）</option>
      </select>
    </div>
    <div class="setting-row"><span>🔈 老师音色试听</span><button class="btn small green" id="sVoicePreview">听老师说话</button></div>
    <div class="setting-row"><span>🐢 朗读速度</span><input type="range" id="sRate" min="0.5" max="1.2" step="0.1" value="${s.rate}"></div>
    <div class="setting-row"><span>🎈 气球/野鸭飞行速度</span>${speedSelectHtml('sGameSpeed')}</div>
    <div class="setting-row"><span>⌨️ 显示屏幕键盘</span><label class="switch"><input type="checkbox" id="sKb" ${s.showKb ? 'checked' : ''}><span></span></label></div>
    <div class="setting-row"><span>✨ 键盘闪烁提示下一个键</span><label class="switch"><input type="checkbox" id="sKbHint" ${s.kbHint ? 'checked' : ''}><span></span></label></div>
    <div class="setting-row"><span>👀 闯关时显示拼音提示（简单模式）</span><label class="switch"><input type="checkbox" id="sPy" ${s.pyHint ? 'checked' : ''}><span></span></label></div>
    <div class="setting-row"><span>📝 每轮题目数量</span><select id="sSize">${[5, 8, 10, 15, 20].map(n => `<option ${n === s.roundSize ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="row" style="margin-top:18px;justify-content:space-between">
      <button class="btn gray small" id="sReset">🗑️ 重置全部进度</button>
      <button class="btn green" id="sClose">好的</button>
    </div></div>`;
  m.classList.remove('hidden');

  const syncAllFromControls = () => {
    s.sound = $('#sSound').checked;
    s.keyVoice = $('#sKeyVoice').checked;
    s.voiceEngine = $('#sVoice').value;
    s.rate = +$('#sRate').value;
    s.gameSpeed = $('#sGameSpeed').value;
    s.showKb = $('#sKb').checked;
    s.kbHint = $('#sKbHint').checked;
    s.pyHint = $('#sPy').checked;
    s.roundSize = +$('#sSize').value;
    persist();
    applySettingsLive();
  };

  $('#sSound').onchange = () => {
    syncAllFromControls();
    if (s.sound) sfx.ok();
  };
  $('#sKeyVoice').onchange = () => {
    syncAllFromControls();
    if (s.sound && s.keyVoice) playKeyVoice('a');
  };
  $('#sVoicePreview').onclick = () => {
    syncAllFromControls();
    speak('小朋友你好，快来一起学拼音吧！');
  };
  $('#sVoice').onchange = () => {
    syncAllFromControls();
    speak('小朋友你好，快来一起学拼音吧！');
  };
  $('#sRate').onchange = () => {
    syncAllFromControls();
    speak('你好，小朋友');
  };
  $('#sGameSpeed').onchange = syncAllFromControls;
  $('#sKb').onchange = syncAllFromControls;
  $('#sKbHint').onchange = syncAllFromControls;
  $('#sPy').onchange = syncAllFromControls;
  $('#sSize').onchange = syncAllFromControls;

  const close = () => {
    syncAllFromControls();
    m.classList.add('hidden');
  };
  $('#sClose').onclick = close;
  $('#sReset').onclick = () => {
    if (confirm('确定要清除所有星星、贴纸和错题吗？')) {
      save = { stars: {}, mistakes: {}, balloonBest: 0, duckBest: 0, pacBest: 0, tankBest: 0, settings: s, bonus: 0 };
      persist(); m.classList.add('hidden'); go(homeScreen);
    }
  };
  m.onclick = e => { if (e.target === m) close(); };
}

// ======================= 启动 =======================
$('#btnHome').onclick = () => go(homeScreen);
$('#btnSettings').onclick = settingsModal;
$('#starCount').onclick = () => go(stickerScreen);
const switchBtn = $('#btnSwitchGame');
if (switchBtn) {
  switchBtn.onclick = e => {
    if (window.top && window.top !== window) {
      e.preventDefault();
      window.top.postMessage('switch:math', '*');
    }
  };
}
updateStarCount();
const arcadePreview = new URLSearchParams(location.search).get('play');
const previewGame = {duck: duckGame, tank: tankGame, balloon: balloonGame}[arcadePreview];
if (previewGame) go(previewGame, {pool: ALL_CHAR_ITEMS.slice(0,40), needTone:true, showPy:true, back:()=>go(homeScreen)});
else go(homeScreen);

})();
