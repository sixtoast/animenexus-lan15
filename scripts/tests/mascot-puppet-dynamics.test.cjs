const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/mascot2d/puppetDynamics.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject});
const {channel,advanceSpring,lidState,advanceLid,expressionTargets}=exportsObject;
test('interruption preserves position and momentum, then reverses and settles',()=>{
 const s=channel();for(let i=0;i<8;i++)advanceSpring(s,45,1/60);
 const value=s.value,velocity=s.velocity;
 advanceSpring(s,-45,1/240);
 assert.ok(Math.abs(s.value-value)<2);assert.ok(s.velocity>0&&s.velocity<velocity);
 for(let i=0;i<300;i++)advanceSpring(s,-45,1/60);
 assert.ok(Math.abs(s.value+45)<.001);assert.ok(Math.abs(s.velocity)<.001);
});
test('spring is bounded under stalled frames and similar at 30/60/120 Hz',()=>{
 const endpoints=[30,60,120].map(hz=>{const s=channel();for(let i=0;i<hz/2;i++)advanceSpring(s,45,1/hz);return s.value;});
 assert.ok(Math.max(...endpoints)-Math.min(...endpoints)<.3);
 const s=channel();for(let i=0;i<500;i++){advanceSpring(s,i%2?90:-90,20);assert.ok(Number.isFinite(s.value)&&Math.abs(s.value)<100);}
});
test('upper lid closes faster than reopening and interrupted blinks stay continuous',()=>{
 const s=lidState();for(let i=0;i<7;i++)advanceLid(s,0,.01);assert.equal(s.value,0);
 for(let i=0;i<7;i++)advanceLid(s,1,.01);assert.ok(s.value>0&&s.value<.6);
 const previous=s.value;advanceLid(s,0,.001);assert.ok(Math.abs(s.value-previous)<.01);
 for(let i=0;i<20;i++)advanceLid(s,1,.01);assert.equal(s.value,1);
});
test('expression channels blend independently and have bounded eye and mouth targets',()=>{
 const sad=expressionTargets('sad',.4,.7,0);assert.equal(sad.mouth,.4);assert.equal(sad.slump,1);assert.equal(sad.curve,-1);
 const sleepy=expressionTargets('sleepy',0,0,0);assert.equal(sleepy.eye,.62);
 const surprise=expressionTargets('surprised',0,0,0);assert.equal(surprise.mouth,.8);assert.ok(surprise.brow<0);
});
