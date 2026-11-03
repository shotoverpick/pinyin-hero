const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const saved={'pinyin-hero-v1':JSON.stringify({stars:{keep:3},mistakes:{keep:2}}),'math-hero-v1':'keep-math'},writes=[];let contexts=0;
const root={dataset:{}},ctx={document:{documentElement:root,readyState:'loading',addEventListener(){},querySelectorAll(){return[];}},localStorage:{getItem:k=>saved[k],setItem(k,v){writes.push(k);saved[k]=v;}},CustomEvent:class{constructor(t,v){this.type=t;this.detail=v.detail;}},addEventListener(){},dispatchEvent(){},setTimeout(){},AudioContext:class{constructor(){contexts++;}}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('learning-theme.js','utf8'),ctx);
ctx.LearningTheme.set('blocks');assert.equal(root.dataset.learningTheme,'blocks');assert.deepEqual(writes,['pinyin-hero-interest-v1']);assert.equal(JSON.parse(saved['pinyin-hero-v1']).stars.keep,3);assert.equal(saved['math-hero-v1'],'keep-math');
ctx.LearningTheme.setSoundProvider(()=>false);ctx.LearningTheme.play('tap');ctx.LearningTheme.play('correct');assert.equal(contexts,0);
console.log('通过：主题偏好独立保存，语文数学进度不变，静音时不触发主题音效。');
