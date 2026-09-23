const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('typescript');
function load(file,requireMock,extra={}){const js=ts.transpileModule(fs.readFileSync(__dirname+'/../components/mascot2d/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const box={exports:{},require:requireMock,...extra};vm.runInNewContext(js,box);return box.exports}
const {sampleCoralMotion,CORAL_ACTIONS}=load('coralMotion.ts',require);
for(const action of CORAL_ACTIONS){for(let t=0;t<8;t+=.017){const p=sampleCoralMotion(action,t,.8);assert(Object.values(p).every(Number.isFinite),action);assert(p.sx>.9&&p.sx<1.1&&p.sy>.9&&p.sy<1.1,action);assert(Math.abs(p.left)<=10,'carrying arm must stay restrained')}}
assert.notEqual(sampleCoralMotion('run',.11).legL,sampleCoralMotion('walk',.11).legL);
let slots=[],cursor=0,effects=[],now=2000,timers=new Map(),nextId=1;
const react={useRef(v){const i=cursor++;return slots[i]??(slots[i]={current:v})},useState(v){const i=cursor++;if(!slots[i])slots[i]={value:v};return[slots[i].value,x=>slots[i].value=x]},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})}};
const win={setTimeout(fn,ms){const id=nextId++;timers.set(id,{fn,at:now+ms});return id}};
const clearTimeout=id=>timers.delete(id);
const {useCoralBlink}=load('useCoralBlink.ts',()=>react,{window:win,clearTimeout,performance:{now:()=>now}});
const render=(x=0,expression='idle',sleeping=false)=>{cursor=0;effects=[];const result=useCoralBlink(.1,.2,expression,{x,y:0},sleeping);effects.forEach(f=>f());return result};
const advance=ms=>{const end=now+ms;while(true){let item=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!item)break;now=item[1].at;timers.delete(item[0]);item[1].fn()}now=end};
render();render(1);assert.equal(render(1).blink,true);
// This exact sequence cancelled the old hook's reopening timeout.
advance(30);render(.2,'happy');advance(150);assert.equal(render(.2,'happy').blink,false);
assert.equal(render(.2,'sleepy',true).blink,true);assert.equal(render(.2,'idle',false).blink,false);
for(let i=0;i<200;i++){advance(20);render(i%2?'curious'.length/10:0,i%3?'happy':'idle')}
advance(250);assert.equal(render(0).blink,false);
slots.forEach(s=>s?.cleanup?.());assert.equal(timers.size,0);
console.log('PASS: 17 animation states remain finite and bounded; walk/run differ; carrying arm stays restrained.');
console.log('PASS: blink reopens across gaze/expression changes, sleeping/waking, repeated updates, and cleans up all timers.');

for(const action of ['sit','point']){
 const key=action==='sit'?'seat':'point';
 assert.equal(sampleCoralMotion(action,.15)[key],0,'anticipation must finish before artwork changes');
 assert(sampleCoralMotion(action,.6)[key]>.97,'fast action after anticipation');
 assert(Math.abs(sampleCoralMotion(action,2)[key]-1)<.01,'settled pose');
}
assert.equal(sampleCoralMotion('idle',2,0,'sit').seat,1);
console.log('PASS: sitting/pointing anticipate before revealing their authored layers, then settle.');

// Recovered artwork must remain intact and every active image must resolve.
const crypto=require('node:crypto'),path=require('node:path');
const dir=path.join(__dirname,'../public/mascot2d/generated');
const archive=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8'));
assert.equal(archive.images.length,51);
for(const entry of archive.images){const bytes=fs.readFileSync(path.join(dir,entry.file));assert.equal(bytes.length,entry.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.file)}
const source=fs.readFileSync(path.join(__dirname,'../components/mascot2d/CoralImageRig2D.tsx'),'utf8');
for(const entry of archive.images)assert.equal(source.includes(entry.file),entry.status==='used-in-animation',entry.file);
for(let t=0;t<10;t+=.02){const p=sampleCoralMotion('sit',t);assert(p.kickL>=0&&p.kickL<=1&&p.kickR>=0&&p.kickR<=1);assert(p.kickL*p.kickR<.00001,'legs alternate');if(t<1)assert.equal(p.kickL+p.kickR,0,'settle before kicking')}
assert(sampleCoralMotion('sit',2.1).kickL>.99);assert(sampleCoralMotion('sit',4.3).kickR>.99);
assert.equal(sampleCoralMotion('idle',2).kickL,0);
assert(sampleCoralMotion('point',.2).prepare>.99);assert.equal(sampleCoralMotion('point',.2).point,0);
console.log('PASS: 51 original image checksums, seven connected images, independent alternating kicks and pointing preparation.');

const {sampleSideWalk,turnView,directionalValues}=load('directionalMotion.ts',require);
for(let i=0;i<240;i++){
 const gait=sampleSideWalk(i/240/1.05);
 for(const leg of [gait.near,gait.far]){
  assert(Number.isFinite(leg.upper)&&Number.isFinite(leg.lower));
  assert(Math.abs(leg.upper+leg.lower+leg.ankle)<1e-9,'boot stays level');
  if(leg.stance)assert.equal(leg.lift,0,'stance stays grounded');
  assert(leg.lift>=0,'recovery never goes below ground');
 }
}
assert.deepEqual(sampleSideWalk(0),sampleSideWalk(1/1.05),'loop seam');
assert.equal(turnView(NaN),0);
const still=directionalValues(90,1,'walk',0,true);
assert.equal(still['side-bob'],0);assert.equal(still['side-arm'],0);
console.log('PASS: directional gait joints, grounded stance, level boots, loop seam and reduced motion.');
