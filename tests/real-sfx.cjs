const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const played = [], pending = [];
let oscillators = 0;
const param = () => ({value: 0, setTargetAtTime(){}});
const node = () => ({connect(){return this;},disconnect(){}});
class AudioContext {
 constructor(){this.state='running';this.currentTime=0;this.destination={};}
 createGain(){return {...node(),gain:param()};}
 createDynamicsCompressor(){return {...node(),threshold:param(),ratio:param()};}
 decodeAudioData(bytes){return new Promise(resolve=>pending.push(()=>resolve({bytes})));}
 createBufferSource(){return {...node(),playbackRate:param(),start(){played.push(this.buffer);}};}
 createOscillator(){oscillators++;throw Error('Real recordings must not synthesize a tone');}
}
const scope = {window:{AudioContext},document:{addEventListener(){}},performance:{now:()=>0},atob,Uint8Array,setTimeout};
vm.createContext(scope);
vm.runInContext(fs.readFileSync('designs/arcade-upgrade/arcade-sound-data.js','utf8'),scope);
vm.runInContext(fs.readFileSync('designs/arcade-upgrade/arcade-fx.js','utf8'),scope);
(async()=>{
 const fx=scope.window.ArcadeFX;
 fx.sound('balloon-pop');
 assert.equal(played.length,0,'cold tap waits for actual recording');
 pending.splice(0).forEach(resolve=>resolve());
 await new Promise(setImmediate);
 assert.equal(played.length,1,'cold tap plays once after decoding');
 fx.sound('shot');
 assert.equal(played.length,2,'shot plays a recording');
 assert.notEqual(played[0],played[1],'balloon and shotgun are distinct recordings');
 fx.sound('balloon-pop',false);
 assert.equal(played.length,2,'mute suppresses recording');
 assert.equal(oscillators,0);
 for(const name of ['app.js','math-app.js']){
  const source=fs.readFileSync(name,'utf8');
  assert.match(source,/sfx\.balloonPop\(\);\s*window\.ArcadeFX\?\.hit\(stage, b\.el, 'pop'/);
 }
 console.log('真实气球/猎枪录音、冷启动单次播放、静音、语文数学气球接线通过');
})().catch(e=>{console.error(e);process.exitCode=1;});
