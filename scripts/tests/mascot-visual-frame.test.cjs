const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

function harness(){
 let now=0,nextId=0,cleanup,ref;
 const queued=new Map(),listeners=new Map();
 const media={matches:false,addEventListener:(name,fn)=>listeners.set('media:'+name,fn),removeEventListener:name=>listeners.delete('media:'+name)};
 const document={hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const module={exports:{}};
 const react={useRef:value=>ref??(ref={current:value}),useEffect:fn=>{if(!cleanup)cleanup=fn();}};
 const source=fs.readFileSync('components/mascot2d/useVisualFrame.ts','utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
  exports:module.exports,require:()=>react,window:{matchMedia:()=>media},document,
  performance:{now:()=>now},requestAnimationFrame:fn=>{queued.set(++nextId,fn);return nextId;},cancelAnimationFrame:id=>queued.delete(id),
 });
 return {hook:module.exports.useVisualFrame,queued,listeners,media,document,
  tick(time){now=time;const pending=[...queued.values()];queued.clear();pending.forEach(fn=>fn(now));},
  dispose(){cleanup();},
 };
}

test('decorative frames are capped and use latest inputs without restarting',()=>{
 const h=harness(),calls=[];
 h.hook((now,dt)=>calls.push(['first',now,dt]));
 h.tick(16);assert.equal(calls.length,0);
 h.tick(34);assert.equal(calls.length,1);
 h.hook((now,dt)=>calls.push(['latest',now,dt]));
 assert.equal(h.queued.size,1);
 h.tick(68);assert.equal(calls[1][0],'latest');
 h.tick(5000);assert.equal(calls[2][2],.05);
 h.dispose();assert.equal(h.queued.size,0);assert.equal(h.listeners.size,0);
});

test('hidden tabs and reduced motion stop scheduling, resume without duplicate loops',()=>{
 const h=harness();let calls=0;h.hook(()=>calls++);
 h.document.hidden=true;h.listeners.get('visibilitychange')();assert.equal(h.queued.size,0);
 h.document.hidden=false;h.listeners.get('visibilitychange')();assert.equal(h.queued.size,1);
 h.media.matches=true;h.listeners.get('media:change')();assert.equal(h.queued.size,0);
 h.tick(1000);assert.equal(calls,0);
 h.media.matches=false;h.listeners.get('media:change')();h.listeners.get('media:change')();assert.equal(h.queued.size,1);
 h.dispose();assert.equal(h.queued.size,0);
});
