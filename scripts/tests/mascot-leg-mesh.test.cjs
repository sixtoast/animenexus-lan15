const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/mascot2d/legMesh.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
const {legSkeleton,legVertex,sampleLegMesh,LEG_TRIANGLES,THIGH_LENGTH,SHIN_LENGTH,bindLegMesh}=api;
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const transform=(m,p)=>({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]});
test('standing mesh reproduces the original registered texture exactly',()=>{
 for(const t of LEG_TRIANGLES)for(const p of t){const v=legVertex(p.x,p.y,0,0);near(v.x,p.x);near(v.y,p.y);}
});
test('folded thigh and shin retain their physical lengths and share joints',()=>{
 for(let seat=0;seat<=1;seat+=.1)for(const kick of [-1,0,1]){
  const s=legSkeleton(seat,kick);near(Math.hypot(s.knee.y,s.knee.z),THIGH_LENGTH);near(Math.hypot(s.ankle.y-s.knee.y,s.ankle.z-s.knee.z),SHIN_LENGTH);
 }
 const s=legSkeleton(1,0);near(s.thigh*180/Math.PI,82);near(s.shin,0);
 assert.ok(s.knee.z>120&&s.knee.y<20);
});
test('every triangle shares exactly the same deformed edge endpoints, without inversions',()=>{
 for(let seat=0;seat<=1.001;seat+=.05)for(let kick=-1;kick<=1.001;kick+=.1){
  const matrices=sampleLegMesh(seat,kick);
  matrices.forEach((m,i)=>{
   assert.ok(m.every(Number.isFinite));assert.ok(m[0]*m[3]-m[1]*m[2]>.01);
   LEG_TRIANGLES[i].forEach(p=>{const actual=transform(m,p),expected=legVertex(p.x,p.y,seat,kick);near(actual.x,expected.x);near(actual.y,expected.y);});
  });
 }
});
test('kick moves ankle below a stable knee and all intermediate skin positions are continuous',()=>{
 const a=legSkeleton(1,-1),b=legSkeleton(1,1);near(a.knee.y,b.knee.y);near(a.knee.z,b.knee.z);assert.ok(b.ankle.z-a.ankle.z>200);
 for(let seat=0;seat<1;seat+=.01)for(const y of [94,108,124,140,158,232,248,266,430]){
  const a=legVertex(68.5,y,seat,.5),b=legVertex(68.5,y,seat+.001,.5);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1);
 }
});
test('DOM binding reuses nodes and skips settled mesh writes',()=>{
 let writes=0;const nodes=LEG_TRIANGLES.map(()=>({setAttribute:()=>writes++}));
 const update=bindLegMesh({querySelectorAll:()=>nodes});update(0,0,0);const first=writes;assert.equal(first,48);update(0,0,0);assert.equal(writes,first);update(1,.5,0);assert.equal(writes,96);
});
test('seated thighs remain visible and boots stay within the canonical stage',()=>{
 const knee=legVertex(68.5,124,1,0);assert.ok(knee.y>50&&knee.y<70);
 for(let seat=0;seat<=1;seat+=.05)for(let kick=-1;kick<=1;kick+=.05){
  const foot=legVertex(68.5,430,seat,kick);assert.ok(1060+60*seat+foot.y<=1536);
 }
});
