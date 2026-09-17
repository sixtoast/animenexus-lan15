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
