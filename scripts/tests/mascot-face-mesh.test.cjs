const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(name){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(`components/mascot2d/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:()=>load('legMesh')});return exports;}
const {FACE_TRIANGLES,faceVertex,faceMatrices,bindFaceMeshes}=load('faceMesh');
test('rest face and eye meshes preserve original texture registration',()=>{
 for(const kind of ['face','eye-left','eye-right'])for(const m of faceMatrices(kind,120,99,0,0,0))
  m.forEach((v,i)=>assert.ok(Math.abs(v-[1,0,0,1,0,0][i])<1e-9));
});
test('gaze moves the central eye area but pins all outside edges',()=>{
 for(const kind of ['eye-left','eye-right']){
  const centre=faceVertex({x:.5,y:.5},kind,0,6,3);assert.ok(centre.x>.5&&centre.y>.5);
  for(let i=0;i<=10;i++)for(const p of [{x:0,y:i/10},{x:1,y:i/10},{x:i/10,y:0},{x:i/10,y:1}]){
   const q=faceVertex(p,kind,0,6,3);assert.ok(Math.hypot(q.x-p.x,q.y-p.y)<1e-12);
  }
 }
});
test('face and gaze extremes never invert triangles and adjacent edges remain shared',()=>{
 for(const kind of ['face','eye-left','eye-right'])for(const turn of [-1,-.5,0,.5,1])for(const gx of [-6.6,0,6.6])for(const gy of [-3.5,0,3.5]){
  const seen=new Map();
  for(const tri of FACE_TRIANGLES){
   const pts=tri.map(p=>{const q=faceVertex(p,kind,turn,gx,gy),key=`${p.x}:${p.y}`;
    if(seen.has(key))assert.deepEqual(q,seen.get(key));seen.set(key,q);return q;});
   const [a,b,c]=pts;assert.ok((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0);
  }
 }
});
test('settled, hidden-profile and closed-eye meshes skip repeated DOM writes',()=>{
 let writes=0;const mesh={dataset:{faceMesh:'eye-left',width:'120',height:'99'},querySelectorAll:()=>FACE_TRIANGLES.map(()=>({setAttribute:()=>writes++}))};
 const update=bindFaceMeshes({querySelectorAll:()=>[mesh]});
 update(0,4,1,1);assert.equal(writes,32);update(0,4,1,1);assert.equal(writes,32);
 update(1,5,1,1);update(0,5,1,0);assert.equal(writes,32);
 update(0,0,0,1);assert.equal(mesh.dataset.deformed,'false');assert.equal(writes,32);
});
