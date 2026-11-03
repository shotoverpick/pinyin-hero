/* 两种学习主题，独立保存外观偏好，不改写学习进度。 */
(() => {
'use strict';
const key='pinyin-hero-interest-v1';let theme='cars',enabled=()=>true,ctx;
try{theme=localStorage.getItem(key)==='blocks'?'blocks':'cars';}catch{}
function apply(value,save=false){
 theme=value==='blocks'?'blocks':'cars';document.documentElement.dataset.learningTheme=theme;
 if(save)try{localStorage.setItem(key,theme);}catch{}
 document.querySelectorAll('[data-learning-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.learningThemeChoice===theme)));
 window.dispatchEvent(new CustomEvent('learning-theme-change',{detail:{theme}}));
}
function play(kind='tap'){
 if(!enabled())return;
 try{
  const Type=window.AudioContext||window.webkitAudioContext;if(!Type)return;
  if(!ctx||ctx.state==='closed')ctx=new Type();if(ctx.state!=='running')ctx.resume().catch(()=>{});
  const t=ctx.currentTime,master=ctx.createGain();master.gain.value=.055;master.connect(ctx.destination);
  const note=(from,to,delay,duration,shape='triangle')=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=shape;o.frequency.setValueAtTime(from,t+delay);o.frequency.exponentialRampToValueAtTime(to,t+delay+duration);g.gain.setValueAtTime(.001,t+delay);g.gain.exponentialRampToValueAtTime(.55,t+delay+.006);g.gain.exponentialRampToValueAtTime(.001,t+delay+duration);o.connect(g).connect(master);o.start(t+delay);o.stop(t+delay+duration);o.onended=()=>{o.disconnect();g.disconnect();};};
  if(theme==='cars'){
   if(kind==='correct'){note(150,245,0,.12);note(390,490,.1,.12);}
   else{note(190,90,0,.055);note(110,135,.025,.07);}
  }else{
   note(kind==='correct'?630:310,kind==='correct'?850:170,0,.065,'sine');
   if(kind==='correct')note(950,1150,.07,.11,'sine');
  }
  setTimeout(()=>master.disconnect(),400);
 }catch{}
}
const art=(type)=>window.QuestionIllustrations?.render(type)||'';
function heroHtml(){return `<section class="interest-hero" aria-label="兴趣学习世界"><div class="interest-copy"><span class="interest-kicker">一年级 · 每天一小步</span><h1><span class="cars-only">小车出发，去学新知识</span><span class="blocks-only">用知识搭起你的方块世界</span></h1><p>认字 · 拼音 · 声调 · 阅读 · 数学 · 手写</p><div class="interest-tags"><span>📖 课本同步</span><span>🔊 点字听读</span><span>⭐ 认真就有进步</span></div></div><div class="interest-art"><span class="cars-only">${art('car')}</span><span class="blocks-only">${art('pixel-house')}</span><div class="interest-road"><i></i><i></i><i></i><i></i><i></i></div></div></section>`;}
function setup(){
 apply(theme);
 const top=document.querySelector('.topbar')||document.querySelector('.switch-bar');
 if(top){const picker=document.createElement('div');picker.className='learning-theme-picker';picker.setAttribute('aria-label','选择学习世界');picker.innerHTML='<button type="button" data-learning-theme-choice="cars" aria-label="汽车学习城">🚗 <span>汽车城</span></button><button type="button" data-learning-theme-choice="blocks" aria-label="方块学习世界">🧱 <span>方块世界</span></button>';top.appendChild(picker);picker.querySelectorAll('button').forEach(b=>b.onclick=()=>apply(b.dataset.learningThemeChoice,true));apply(theme);}
 document.addEventListener('pointerdown',e=>{const b=e.target.closest('button,a,[role="button"]');if(!b||b.disabled||b.matches('.key,[data-read-char],[data-read-syl],.ql-choice,.ql-listen,#ql-speak,#spk'))return;play('tap');},{capture:true,passive:true});
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('button,a')&&!e.repeat)play('tap');});
}
window.LearningTheme={get:()=>theme,set:(value)=>apply(value,true),setSoundProvider:fn=>{enabled=fn;},isSoundEnabled:()=>enabled(),play,heroHtml,decorateHome(root){if(!root.querySelector('.interest-hero'))root.insertAdjacentHTML('afterbegin',heroHtml());}};
window.addEventListener('storage',e=>{if(e.key===key)apply(e.newValue);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
