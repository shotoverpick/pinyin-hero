const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(root+'/all.html','utf8');
let stopped={pinyin:0,math:0};
const nodes=Object.fromEntries(['pinyinFrame','mathFrame','btnPinyin','btnMath'].map(id=>[id,{style:{},classList:{toggle(){}},contentWindow:{TeacherVoice:{stop(){stopped[id==='pinyinFrame'?'pinyin':'math']++}}}}]));
const ctx={document:{getElementById(id){return nodes[id]}},window:{addEventListener(){}},history:{replaceState(){}},location:{hash:''},navigator:{}};
for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))vm.runInNewContext(m[1],ctx);
ctx.switchGame('math');assert.equal(stopped.pinyin,1);assert.equal(stopped.math,0);
ctx.switchGame('pinyin');assert.equal(stopped.math,1);
for(const file of ['index.html','math.html']){
 const doc=fs.readFileSync(root+'/'+file,'utf8');
 for(const m of doc.matchAll(/<script src="([^"]+)"/g))assert.ok(fs.existsSync(root+'/'+m[1].split('?')[0]),m[1]);
 assert.match(doc,/teacher-voice-player\.js\?v=tts3/);
}
console.log('通过：线上二合一切换会停止另一游戏的配音，所有版本化脚本路径有效。');
