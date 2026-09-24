const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(name){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/mascot2d/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});return exports;}
const {directionalValues}=load('directionalMotion');
const {sampleCoralMotion}=load('coralMotion');
test('15, 30 and 45 degrees have distinct continuous projections',()=>{
 const a=[15,30,45].map(n=>directionalValues(n,0,'idle'));
 assert.ok(a[0].turn<a[1].turn&&a[1].turn<a[2].turn);
 for(let angle=-90;angle<90;angle+=.25){
  const x=directionalValues(angle,0,'idle'),y=directionalValues(angle+.25,0,'idle');
  assert.ok(Math.abs(y.turn-x.turn)<.004);
  assert.ok(Math.abs(y['profile-mix']-x['profile-mix'])<.011);
 }
});
test('sit is monotonic and settles without an overshooting skirt',()=>{
 let previous=0;
 for(let t=0;t<1;t+=.01){const p=sampleCoralMotion('sit',t);assert.ok(p.seat>=previous&&p.seat<=1);previous=p.seat;}
 assert.equal(sampleCoralMotion('sit',2).seat,1);
});
test('kick and pointing trajectories are continuous',()=>{
 for(const action of ['sit','point'])for(let t=0;t<8;t+=.01){
  const a=sampleCoralMotion(action,t),b=sampleCoralMotion(action,t+.01);
  for(const key of ['kickL','kickR'])assert.ok(Math.abs(a[key]-b[key])<.05);
  assert.ok(Math.abs(a.right-b.right)<2);
 }
});
