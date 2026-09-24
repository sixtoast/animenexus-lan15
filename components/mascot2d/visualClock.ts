/** Shared visual scheduler. Site preference overrides OS preference, as MotionProvider does. */
type Listener={frame:(now:number,dt:number,reduced:boolean)=>void;fps:number;last:number;staticFrame:boolean};
const listeners=new Set<Listener>();
let stop:(()=>void)|undefined;
let refresh:()=>void=()=>{};
export function subscribeVisualClock(frame:Listener['frame'],fps=60,staticFrame=false){
 const listener:Listener={frame,fps,last:performance.now(),staticFrame};
 listeners.add(listener);
 if(!stop){
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let raf=0;
  const reduced=()=>{const pref=document.documentElement.dataset.motion;return pref==='reduced'||(pref!=='full'&&media.matches);};
  const tick=(now:number)=>{
   raf=0;
   for(const item of listeners){
    const elapsed=now-item.last;
    if(elapsed+0.1>=1000/item.fps){item.last=now;item.frame(now,Math.min(.05,Math.max(0,elapsed/1000)),false);}
   }
   if(listeners.size)raf=requestAnimationFrame(tick);
  };
  const sync=()=>{
   cancelAnimationFrame(raf);raf=0;
   const now=performance.now();for(const item of listeners)item.last=now;
   if(document.hidden)return;
   if(reduced()){for(const item of listeners)if(item.staticFrame)item.frame(now,0,true);}
   else if(listeners.size)raf=requestAnimationFrame(tick);
  };
  refresh=()=>{if(!document.hidden&&reduced())for(const item of listeners)if(item.staticFrame)item.frame(performance.now(),0,true);};
  const observer=new MutationObserver(sync);
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
  media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
  stop=()=>{cancelAnimationFrame(raf);observer.disconnect();media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);refresh=()=>{};};
  sync();
 }else refresh();
 return ()=>{listeners.delete(listener);if(!listeners.size){stop?.();stop=undefined;}};
}
export function refreshVisualClock(){refresh();}
