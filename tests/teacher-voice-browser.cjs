// Start a local HTTP server, then run with Playwright installed.
// PLAYWRIGHT_PATH=/tmp/pinyin-qa/node_modules/playwright node tests/teacher-voice-browser.cjs
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const base=process.env.GAME_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch();
 try{
 const context=await browser.newContext({viewport:{width:1024,height:900}});
 await context.addInitScript(()=>{
  window.audioLog=[];window.nativeLog=[];window.playingCount=0;
  try{if(!localStorage.getItem('teacher-qa-seeded')){
   localStorage.setItem('pinyin-hero-v1',JSON.stringify({stars:{'char:s1':2},bonus:5,settings:{voiceEngine:'local',sound:true,keyVoice:true,rate:0.8}}));
   localStorage.setItem('teacher-qa-seeded','yes');
  }}catch{}
  const realPlay=HTMLMediaElement.prototype.play;
  const uriCache=new Map();
  HTMLMediaElement.prototype.play=function(){
   if(!uriCache.size){
    for(const [key,uri] of Object.entries(window.TEACHER_VOICE_DATA||{}))uriCache.set(uri,{kind:'teacher',key});
    for(const [key,uri] of Object.entries(window.PINYIN_AUDIO_DATA||{}))uriCache.set(uri,{kind:'pinyin',key});
   }
   window.audioLog.push({...uriCache.get(this.src)||{kind:'other',key:'unlock'},rate:this.playbackRate});
   this.addEventListener('playing',()=>window.playingCount++,{once:true});
   return realPlay.call(this);
  };
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text}}});
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices(){return []},cancel(){},resume(){},speak(u){window.nativeLog.push(u.text)},paused:false}});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/index.html');
 const selected=await page.evaluate(()=>document.querySelector('#btnSettings').click());
 assert.equal(await page.locator('#sVoice').inputValue(),'teacher');
 await page.click('#sVoicePreview');
 assert.equal(await page.evaluate(()=>audioLog.at(-1).kind),'teacher');
 await page.locator('#sRate').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('change',{bubbles:true}))});
 assert.equal(await page.evaluate(()=>audioLog.at(-1).rate),1.25);
 await page.locator('#sRate').evaluate(el=>{el.value='0.8';el.dispatchEvent(new Event('change',{bubbles:true}))});
 await page.click('#sClose');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pinyin-hero-v1')));
 assert.equal(saved.stars['char:s1'],2);assert.equal(saved.bonus,5);assert.equal(saved.settings.voiceProfileVersion,3);
 for(const mode of ['pinyin','chars','write','tone','balloon','duck','pacman','tank','mistakes','stickers','help']){
  await page.click('#btnHome');await page.click(`[data-go="${mode}"]`);
  assert.equal(await page.evaluate(()=>audioLog.at(-1).kind),'teacher',mode);
 }
 const lessons=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'../scripts/narration-manifest.json'),'utf8'));
 const cards=[[0,['a','o','e']],[1,['i','u','ü']],[2,['b','p','m','f']],[3,['d','t','n','l']],[4,['g','k','h']],[5,['j','q','x']],[6,['z','c','s']],[7,['zh','ch','sh','r']],[8,['y','w']],[9,['ai','ei','ui']],[10,['ao','ou','iu']],[11,['ie','üe','er']],[12,['an','en','in','un','ün']],[13,['ang','eng','ing','ong']],[14,['zhi','chi','shi','ri','zi','ci','si','yi','wu','yu','ye','yue','yuan','yin','yun','ying']]];
 for(const [lesson,units] of cards){
  await page.click('#btnHome');await page.click('[data-go="pinyin"]');await page.click(`.lesson-card[data-i="${lesson}"]`);
  for(const unit of units){await page.locator(`.letter-card[data-x="${unit}"]`).first().click();assert.equal(await page.evaluate(()=>audioLog.at(-1).kind),'pinyin',unit);}
 }
 await page.click('#btnHome');await page.click('[data-go="pinyin"]');await page.click('.lesson-card[data-i="0"]');
 await page.evaluate(()=>{window.audioLog=[];});
 await page.locator('.tb-line').first().click();
 await page.waitForFunction(()=>audioLog.some(x=>x.kind==='pinyin'&&x.key==='a1'),{timeout:6000});
 assert.equal(await page.evaluate(()=>audioLog[0].kind),'teacher');
 await page.click('#btnHome');
 await context.setOffline(true);
 await page.click('[data-go="balloon"]');
 assert.equal(await page.evaluate(()=>audioLog.at(-1).kind),'teacher');
 await page.waitForTimeout(150);
 assert.ok(await page.evaluate(()=>playingCount>5));
 assert.deepEqual(await page.evaluate(()=>nativeLog),[]);
 await context.setOffline(false);
 await page.goto(base+'/math.html');
 for(const mode of ['units','lab','balloon','tank','maze','rocket','mistakes','stickers','help']){
  await page.click('#btnHome');await page.click(`[data-go="${mode}"]`);
  assert.equal(await page.evaluate(()=>audioLog.at(-1).kind),'teacher',mode);
 }
 assert.deepEqual(await page.evaluate(()=>nativeLog),[]);
 for(const file of ['点击开始玩-拼音小勇士.html','平板单文件合集-拼音+数学二合一.html']){
  await page.goto(base+'/'+encodeURIComponent(file));
  const surface=file.startsWith('平板')?page.frameLocator('#gameFrame'):page;
  await surface.locator('[data-go="pinyin"]').click();
  assert.equal(await surface.locator('body').evaluate(()=>audioLog.at(-1).kind),'teacher');
  await surface.locator('.lesson-card[data-i="0"]').click();
  await surface.locator('.letter-card[data-x="a"]').click();
  assert.equal(await surface.locator('body').evaluate(()=>audioLog.at(-1).key),'unit:a');
 }
 assert.deepEqual(errors,[]);
 console.log('通过：旧设置迁移与进度保留、11 个入口老师配音、音色试听/语速、47 个声韵母、16 个整体认读、混排连续播放、离线配音、两种单文件版；默认未调用设备TTS。');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
