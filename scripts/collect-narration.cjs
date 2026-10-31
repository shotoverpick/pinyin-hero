// 收集游戏实际使用的固定中文文案。输出清单不含存档和个人数据。
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');const stub={textContent:'',style:{}};
const ctx={window:null,document:{querySelector(){return stub},addEventListener(){}},localStorage:{getItem(){return null}},console};
ctx.window=ctx;ctx.addEventListener=()=>{};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),ctx);
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
vm.runInContext(source.split('// ======================= 启动 =======================')[0]+'this.catalog={CHAR_UNITS,PINYIN_LESSONS,ALL_CHAR_ITEMS,KEY_SAY,PRAISE,EXTRA_SYL_SPEAK,STICKER_NAMES,TONE_SETS};})();',ctx);
const c=ctx.catalog;const raw=new Set();
function add(s){if(typeof s==='string'&&s.trim())raw.add(s.trim().replace(/\s+/g,' '));}
for(const u of c.CHAR_UNITS){add(u.category+'栏目');for(const l of u.lessons){
 add(l.name);for(const key of ['text','extraText']){for(const line of l[key]||[])add(line);add((l[key]||[]).join(' '));}
 for(const word of l.words||[])add(word.split(/\s/)[0]);
 for(const item of l.writeChars||[])add(item.split(/\s/)[0]);
}}
for(const [i,l] of c.PINYIN_LESSONS.entries()){
 add(i<14?`第 ${i+1} 课，${l.name}`:l.name);
 for(const word of l.words||[])add(word.split(/\s/)[0]);
 for(const line of l.rhymeLines||[])add(line);add((l.rhymeLines||[]).join(' '));
}
for(const it of c.ALL_CHAR_ITEMS){add(it.speak);add(it.char);add(it.word);}
for(const s of [...Object.values(c.KEY_SAY),...Object.values(c.EXTRA_SYL_SPEAK),...c.PRAISE,...c.STICKER_NAMES,...c.TONE_SETS.flatMap(s=>s.chars)])add(s);
for(const match of source.matchAll(/\bspeak\('([^'\n]+)'\)/g))add(match[1]);
const block=source.match(/const modeAnnounce = \{([\s\S]*?)\n  \};/)[1];
for(const match of block.matchAll(/: '([^']+)'/g))add(match[1]);
for(const s of ['完美通关！','真不错！','继续加油！','识字栏目','阅读栏目','汉语拼音栏目','神奇贴纸'])add(s);
// 拼音混排文案由中文片段与精确拼音录音依次播放，不让TTS念英文字母。
const segments=new Set();
for(const text of raw){
 for(const part of text.split(/([a-züɑɡāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]+[0-5]?)/gi)){
  const s=part.trim().replace(/\s+/g,' ');if(/[\u3400-\u9fff]/.test(s))segments.add(s);
 }
}
const result={voice:'zh-CN-XiaoxiaoNeural',rate:'-8%',texts:[...segments].sort(),sourceTexts:[...raw].sort()};
fs.writeFileSync(path.join(root,'scripts/narration-manifest.json'),JSON.stringify(result,null,2)+'\n');
console.log(`收集 ${raw.size} 条文案，${segments.size} 段中文配音。`);
