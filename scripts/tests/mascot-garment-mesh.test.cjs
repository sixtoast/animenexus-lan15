const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(name){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(`components/mascot2d/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:()=>load('legMesh')});return exports;}
const {GARMENT_TRIANGLES,garmentVertex,garmentMatrices,bindGarmentMesh}=load('garmentMesh');
test('standing garment is unchanged and seated collar/cape stay pinned',()=>{
 for(const tri of GARMENT_TRIANGLES)for(const p of tri){
  const rest=garmentVertex(p,0,1,1);assert.equal(rest.x,p.x);assert.equal(rest.y,p.y);
  if(p.y<=252.5){const seated=garmentVertex(p,1,1,1);assert.equal(seated.x,p.x);assert.equal(seated.y,p.y);}
 }
});
test('all sit and alternating kick combinations retain shared edges and positive triangle areas',()=>{
 for(let seat=0;seat<=1;seat+=.05)for(const kick of [-1,-.5,0,.5,1]){
  garmentMatrices(seat,kick,-kick).forEach((m,i)=>{
   assert.ok(m.every(Number.isFinite));assert.ok(m[0]*m[3]-m[1]*m[2]>.2);
   for(const p of GARMENT_TRIANGLES[i]){const v=garmentVertex(p,seat,kick,-kick);assert.ok(Math.abs(m[0]*p.x+m[2]*p.y+m[4]-v.x)<1e-8);assert.ok(Math.abs(m[1]*p.x+m[3]*p.y+m[5]-v.y)<1e-8);}
  });
 }
});
test('seated lap widens and lifts the hem with bounded local kick response',()=>{
 const centre={x:305,y:505},edge={x:610,y:505};
 assert.equal(garmentVertex(centre,1,0,0).y,425);
 assert.ok(garmentVertex(edge,1,0,0).x>edge.x);
 const rest=garmentVertex(centre,1,0,0),kick=garmentVertex(centre,1,1,0);assert.ok(rest.y-kick.y>0&&rest.y-kick.y<=8);
});
test('garment returns to one rest texture and skips settled writes',()=>{
 let writes=0;const el={dataset:{},querySelectorAll:()=>GARMENT_TRIANGLES.map(()=>({setAttribute:()=>writes++}))};
 const update=bindGarmentMesh({querySelector:()=>el});update(0,0,0);assert.equal(writes,0);
 update(1,0,0);assert.equal(writes,32);update(1,0,0);assert.equal(writes,32);
 update(0,0,0);assert.equal(el.dataset.deformed,'false');
});
