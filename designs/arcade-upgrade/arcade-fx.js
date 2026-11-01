/* Original generated sprites, frame animations, Web Audio foley, and CC0 game samples. */
(() => {
'use strict';
let ctx,master,compressor,engine,engineGain;let session=0;
const buffers={},decoding={};let soundEnabled=true;const bursts=new WeakMap();
function audioContext(){
 const Type=window.AudioContext||window.webkitAudioContext;if(!Type)return null;
 if(!ctx||ctx.state==='closed'){
  ctx=new Type();master=ctx.createGain();master.gain.value=.48;
  compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=5;
  master.connect(compressor).connect(ctx.destination);
 }
 if(ctx.state!=='running')ctx.resume().catch(()=>{});
 return ctx;
}
function prepareSamples(){
 const c=audioContext();if(!c)return;
 for(const [key,uri]of Object.entries(window.ARCADE_SOUND_DATA||{})){
  if(buffers[key]||decoding[key])continue;
  const bytes=Uint8Array.from(atob(uri.split(',')[1]),ch=>ch.charCodeAt(0));
  decoding[key]=c.decodeAudioData(bytes.buffer).then(buf=>{buffers[key]=buf;}).catch(()=>{delete decoding[key];});
 }
}
function noise(duration,frequency,volume,time,type='bandpass'){
 const c=ctx,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
 let previous=0;for(let i=0;i<data.length;i++){previous=.25*previous+.75*(Math.random()*2-1);data[i]=previous;}
 const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
 source.buffer=buffer;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.8;
 gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.004);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
 source.connect(filter).connect(gain).connect(master);source.start(time);source.stop(time+duration);
 source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
function tone(from,to,duration,volume,time,type='sine'){
 const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(from,time);o.frequency.exponentialRampToValueAtTime(Math.max(25,to),time+duration);
 g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.006);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
 o.connect(g).connect(master);o.start(time);o.stop(time+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};
}
function sample(name,volume=.6,rate=1){
 if(!buffers[name])return false;const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buffers[name];s.playbackRate.value=rate;g.gain.value=volume;s.connect(g).connect(master);s.start();s.onended=()=>{s.disconnect();g.disconnect();};return true;
}
function recording(name,volume){
 if(sample(name,volume))return;
 const started=performance.now(),currentSession=session;
 // A cold first tap may still be decoding. Never replace the recording with an electronic beep.
 decoding[name]?.then(()=>{if(soundEnabled&&session===currentSession&&ctx.state==='running'&&performance.now()-started<200)sample(name,volume);});
}
function setEnabled(enabled){soundEnabled=enabled;if(master)master.gain.setTargetAtTime(enabled?.48:0,ctx.currentTime,.015);if(!enabled)stop();}
function sound(name,enabled=true){
 setEnabled(enabled);if(!enabled||!audioContext())return;prepareSamples();const t=ctx.currentTime+.004;
 if(name==='balloon-pop'){recording('pop',.85);}
 else if(name==='pop'){noise(.105,2100,.55,t,'highpass');tone(220,65,.12,.28,t);}
 else if(name==='cannon'){if(!sample('cannon',.5,.82))noise(.32,300,.5,t);tone(95,34,.32,.4,t);noise(.07,2300,.2,t);}
 else if(name==='impact'){if(!sample('impact',.42,.85))noise(.2,680,.4,t);noise(.34,220,.19,t);}
 else if(name==='shot'){recording('shot',.65);}
 else if(name==='wing'){noise(.16,1700,.045,t,'highpass');}
 else if(name==='quack'){
  for(let i=0;i<2;i++){const at=t+i*.14;tone(460,260,.11,.07,at,'sawtooth');noise(.1,1100,.055,at);}
 }
 else if(name==='success'){tone(660,660,.09,.12,t,'triangle');tone(990,990,.14,.1,t+.055,'triangle');}
}
function stop(){session++;if(engine){try{engine.stop();}catch{}engine.disconnect();engine=null;}if(engineGain){engineGain.disconnect();engineGain=null;}}
function start(stage,kind,enabled=true){
 stop();soundEnabled=enabled;stage.classList.add('arcade-live');prepareSamples();
 if(!enabled||kind!=='tank')return;
 const begin=()=>{
  if(!stage.isConnected||!buffers.engine||!soundEnabled)return;
  engine=ctx.createBufferSource();engine.buffer=buffers.engine;engine.loop=true;engine.playbackRate.value=.7;
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=430;
  engineGain=ctx.createGain();engineGain.gain.value=.035;engine.connect(filter).connect(engineGain).connect(master);engine.start();
 };
 if(buffers.engine)begin();else setTimeout(begin,350);
}
function center(stage,element,selector){
 const target=(selector&&element.querySelector(selector))||element,r=target.getBoundingClientRect(),s=stage.getBoundingClientRect();
 return{x:r.left-s.left+r.width/2,y:r.top-s.top+r.height/2};
}
function hit(stage,element,kind,score=0){
 if(!stage||!element)return;const point=center(stage,element,kind==='tank'?'.arcade-tank-model':kind==='duck'?'.duck-art':'.body');
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 if(!reduced){
  stage.style.setProperty('--impact-x',point.x+'px');stage.style.setProperty('--impact-y',point.y+'px');
  stage.dataset.hitStopUntil=String(performance.now()+(kind==='tank'?42:kind==='duck'?28:18));
  stage.classList.remove('arcade-impact');void stage.offsetWidth;stage.classList.add('arcade-impact');
  const total=kind==='tank'?16:kind==='duck'?8:13;
  for(let i=0;i<total;i++){
   const p=document.createElement('i');p.className='arcade-particle '+kind;
   const angle=Math.PI*2*i/total+(Math.random()-.5)*.4,distance=35+Math.random()*65;
   p.style.cssText=`left:${point.x}px;top:${point.y}px;--px:${Math.cos(angle)*distance}px;--py:${Math.sin(angle)*distance+35}px;--pr:${Math.random()*420-210}deg;--hue:${Math.random()*55}deg`;
   stage.appendChild(p);setTimeout(()=>p.remove(),720);
  }
  if(kind==='tank'){stage.classList.remove('arcade-recoil');void stage.offsetWidth;stage.classList.add('arcade-recoil');}
 }
 const now=performance.now(),last=bursts.get(stage)||{at:0,count:0};last.count=now-last.at<8000?last.count+1:1;last.at=now;bursts.set(stage,last);
 if(last.count>=3){
  let badge=stage.querySelector('.arcade-combo');if(!badge){badge=document.createElement('div');badge.className='arcade-combo';stage.appendChild(badge);}
  badge.textContent=`${last.count} 连击！`;badge.classList.remove('show');void badge.offsetWidth;badge.classList.add('show');
 }
 if(kind==='tank')sound('impact',soundEnabled);
}
function recoil(stage){const gun=stage.querySelector('.arcade-turret');if(gun){gun.classList.remove('arcade-gun-fire');void gun.offsetWidth;gun.classList.add('arcade-gun-fire');}}
function frozen(stage,time){return time < +(stage.dataset.hitStopUntil||0);}
function bindHit(element,allowed,callback){
 let used=false;const activate=event=>{event.stopPropagation();if(used||!allowed())return;used=true;callback();};
 element.addEventListener('pointerdown',activate);element.addEventListener('click',activate);
}
function duck(){return '<span class="duck-art arcade-duck-sprite" aria-hidden="true"></span>';}
function tank(hero=false){return `<div class="arcade-tank-model ${hero?'hero-model':'enemy-model'}"><div class="arcade-tank-hull"></div><div class="arcade-track left-track"></div><div class="arcade-track right-track"></div><div class="arcade-turret ${hero?'hero-turret':''}" ${hero?'id="heroTurret"':''}></div></div>`;}
window.ArcadeFX={sound,start,stop,hit,recoil,duck,tank,center,frozen,setEnabled,bindHit};
document.addEventListener('pointerdown',()=>{if(soundEnabled)prepareSamples();},{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})();
