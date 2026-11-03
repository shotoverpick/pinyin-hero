/* Both games share one pre-generated neural TTS voice. No device or alternate online TTS. */
(() => {
'use strict';
let audio,serial=0,timer=null,trie=null,catalog=null;
function status(value){if(document.documentElement){document.documentElement.dataset.voiceEngine='teacher-tts-only';document.documentElement.dataset.voicePlayback=value;}}
function getAudio(){if(!audio){audio=new Audio();audio.playsInline=true;audio.preload='auto';}return audio;}
function stop(){serial++;clearTimeout(timer);if(audio){audio.onplaying=audio.onended=audio.onerror=null;audio.pause();}status('idle');}
function playSequence(segments,options={}){
 stop();const token=serial;let index=0;
 function next(){
  if(token!==serial)return;
  if(index>=segments.length||options.enabled?.()===false){status('idle');return;}
  const segment=segments[index++],a=getAudio();let finished=false;
  const fail=()=>{if(finished||token!==serial)return;finished=true;stop();status('error');options.onerror?.();};
  a.onplaying=()=>{clearTimeout(timer);status('playing');};
  a.onended=()=>{if(finished||token!==serial)return;finished=true;clearTimeout(timer);next();};
  a.onerror=fail;a.src=segment.uri||segment;
  a.preservesPitch=true;a.playbackRate=segment.type==='pinyin'?1:(options.rate||1);
  timer=setTimeout(fail,2200);
  try{const p=a.play();p?.catch(fail);}catch{fail();}
 }
 next();
}
function buildTrie(){
 const current=window.TEACHER_VOICE_DATA||{};if(trie&&catalog===current)return;
 catalog=current;trie={};
 for(const key of Object.keys(current)){let n=trie;for(const c of key)n=n[c]||(n[c]={});n.value=current[key];}
}
function clean(text){return String(text||'').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function planText(text){
 buildTrie();text=clean(text);const segments=[],missing=[];
 if(catalog[text])return{segments:[{uri:catalog[text],type:'teacher'}],missing};
 for(let i=0;i<text.length;){
  let n=trie,last=null,end=i;
  for(let j=i;j<text.length;j++){n=n[text[j]];if(!n)break;if(n.value){last=n.value;end=j+1;}}
  if(last){segments.push({uri:last,type:'teacher'});i=end;continue;}
  const cp=text.codePointAt(i),char=String.fromCodePoint(cp);
  if(/[\u3400-\u9fff0-9a-z]/i.test(char))missing.push(char);
  i+=char.length;
 }
 return{segments,missing};
}
function speak(text,options={}){const plan=planText(text);if(plan.missing.length||!plan.segments.length){stop();options.onmissing?.(plan.missing);return;}playSequence(plan.segments,options);}
window.TeacherVoice={stop,playSequence,planText,speak,getAudio,refreshCatalog(){trie=null;catalog=null;}};
})();
