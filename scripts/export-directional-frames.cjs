// Render the real React/SVG rig at deterministic animation times; no screenshot timing.
const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020,resolveJsonModule:true}}).outputText,f);
require.extensions['.png']=(m,f)=>{m.exports={src:'data:image/png;base64,'+fs.readFileSync(f).toString('base64')}};
require.extensions['.css']=m=>{m.exports={}};
const {CoralImageRig2D}=require('../components/mascot2d/CoralImageRig2D.tsx'),{TurnRig,ProfileRig}=require('../components/mascot2d/DirectionalRig.tsx');
const {sampleCoralMotion}=require('../components/mascot2d/coralMotion.ts'),{directionalValues,turnView}=require('../components/mascot2d/directionalMotion.ts');
const data=new Map();
function uri(url){if(!data.has(url))data.set(url,'data:image/png;base64,'+fs.readFileSync(root+'/public'+url).toString('base64'));return data.get(url);}
function svgAt(angle,time,anim,blink=false){
 const view=turnView(angle),p=sampleCoralMotion(anim,time),values=directionalValues(angle,time,anim);
 if(view===90&&(anim==='walk'||anim==='run')){p.y=0;p.lean=0;p.sx=1;p.sy=1;}
 let svg=view===0?renderToStaticMarkup(React.createElement(CoralImageRig2D,{anim,expression:'neutral',blink,gazeX:0,gazeY:0,blush:0,turn:0,mouthOpen:0,mouthWide:0,mouthMood:0,facingAngleDeg:angle})):
 `<svg viewBox="0 0 1024 1536"><g class="coral-whole">${renderToStaticMarkup(React.createElement(view===90?ProfileRig:TurnRig,{angle:view,openness:blink?0:1,mouthOpen:0}))}</g></svg>`;
 svg=svg.replace(/href="(\/mascot2d\/[^\"]+)"/g,(_,url)=>`href="${uri(url)}"`);
 let css=fs.readFileSync(root+'/components/mascot2d/coral-image-rig.css','utf8').replace(/@media[^{}]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,'').replace(/var\(--pose-([\w]+),[^)]+\)/g,(_,k)=>p[k]??0).replace(/var\(--([^,]+),([^)]+)\)/g,(_,k,d)=>values[k]??d);
 css=css.replace(/calc\(([^)]+)\)/g,(_,expr)=>{let unit=expr.includes('deg')?'deg':expr.includes('px')?'px':'';const raw=expr.replace(/deg|px/g,'');if(!/^[\d\seE.+*\/-]+$/.test(raw))throw Error(raw);return Function('return '+raw)()+unit});
 return svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="384" height="576" ').replace(/(<svg[^>]+>)/,'$1<style>'+css+'</style>');
}
async function main(){
 const out=path.join(root,'public/mascot2d/frames');fs.mkdirSync(out,{recursive:true});
 const check=process.argv.includes('--check');
 const poses=check?[[0,0,'idle'],[15,0,'idle'],[30,0,'idle'],[45,0,'idle'],[90,0,'walk'],[90,.24,'walk']]:[];
 if(check){let tiles=[];for(let i=0;i<poses.length;i++){let [a,t,act]=poses[i];const png=await sharp(Buffer.from(svgAt(a,t,act))).resize(256,384).flatten({background:'#514653'}).png().toBuffer();tiles.push({input:png,left:i%3*256,top:Math.floor(i/3)*410});tiles.push({input:Buffer.from(`<svg width="256" height="26"><text x="128" y="20" text-anchor="middle" font-family="sans-serif" font-size="15" fill="white">${a} degrees · ${act} ${t}</text></svg>`),left:i%3*256,top:Math.floor(i/3)*410+384});}await sharp({create:{width:768,height:820,channels:4,background:'#514653'}}).composite(tiles).png().toFile('/tmp/directional-check.png');console.log('/tmp/directional-check.png');return;}
 const manifest={fps:24,width:384,height:576,transparent:true,sequences:{}};
 for(const name of ['turn-right','turn-left','walk-right','walk-left']){
  const frames=[];const turn=name.startsWith('turn'),sign=name.endsWith('left')?-1:1,count=turn?16:24;
  for(let i=0;i<count;i++){
   const u=i/(count-1),angle=sign*(turn?45*(u*u*(3-2*u)):90),t=turn?i/24:i/(24*1.05),file=`${name}-${String(i).padStart(2,'0')}.png`;
   await sharp(Buffer.from(svgAt(angle,t,turn?'idle':'walk'))).resize(384,576).png().toFile(path.join(out,file));frames.push(file);
  }
  const fps=turn?24:25.2; manifest.sequences[name]={loop:!turn,frames,fps,durationSeconds:count/fps};
 }
 fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Exported 80 transparent PNGs and sequence metadata.');
}
main().catch(e=>{console.error(e);process.exit(1)});
