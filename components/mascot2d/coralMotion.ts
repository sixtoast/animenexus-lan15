/** Pose in the shared SVG coordinate system. Seconds are local to each action. */
export type CoralPose={y:number;lean:number;sx:number;sy:number;head:number;headY:number;left:number;right:number;legL:number;legR:number;legY:number;legScale:number;lantern:number};
export const REST_POSE:CoralPose={y:0,lean:0,sx:1,sy:1,head:0,headY:0,left:0,right:0,legL:0,legR:0,legY:0,legScale:1,lantern:0};
export const CORAL_ACTIONS=["idle","walk","run","jump","land","happy","wave","think","sleep","surprised","point","sit","stretch","nod","shy","celebrate","bow"] as const;
export function sampleCoralMotion(anim:string,t:number,speed=0,perch="stand"):CoralPose{
 const p={...REST_POSE},s=Math.sin,breathe=s(t*Math.PI*2/4.2),ease=(v:number)=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
 p.headY=-breathe*2;p.sy=1+breathe*.0025;p.lantern=s(t*1.7)*1.1;
 switch(anim){
  case "walk":case "run":{const run=anim==="run",phase=t*Math.PI*2*(run?2.7:1.65)*(1+Math.min(1,speed)*.18),stride=run?9:5;p.legL=s(phase)*stride;p.legR=-p.legL;p.right=s(phase)*stride*.7;p.left=-s(phase)*2;p.y=-Math.abs(s(phase))*(run?11:4);p.lean=run?-1.2:0;p.head=s(phase)*.35;p.lantern=s(phase-.7)*(run?5:2.5);break}
  case "jump":p.sy=1.018;p.sx=.992;p.legL=-7;p.legR=8;p.legScale=.95;p.right=-24;p.left=5;p.head=-2;break;
  case "land":{const k=Math.max(0,1-t/.55),bounce=s(Math.min(t/.55,1)*Math.PI*2)*k;p.sy=1-bounce*.055;p.sx=1+bounce*.025;p.headY=bounce*8;break}
  case "wave":p.right=-108+s(t*9)*11;p.head=-3;p.left=2;break;
  case "point":p.right=-68;p.head=-4;break;
  case "happy":p.head=s(t*2)*2;p.right=-12;p.y=-Math.max(0,s(t*3))*4;break;
  case "celebrate":p.right=-116+s(t*8)*9;p.left=8;p.y=-Math.max(0,s(t*6))*9;p.head=s(t*3)*2;p.lantern=s(t*6-.7)*4;break;
  case "think":p.head=5;p.headY=3;p.right=8;p.lean=-.5;break;
  case "sleep":p.head=7;p.headY=8;p.sy=1+s(t*1.4)*.004;p.right=5;p.left=-2;break;
  case "surprised":p.headY=-5;p.right=-22;p.left=5;p.sy=1.012;p.y=-3;break;
  case "stretch":{const a=ease(t/.6);p.right=-140*a;p.left=10*a;p.head=-4*a;p.sy=1+.012*a;break}
  case "nod":p.headY=(1-Math.cos(Math.min(t,1.4)*Math.PI*2/.7))*4;p.head=p.headY*.25;break;
  case "shy":p.head=5;p.headY=7;p.right=12;p.left=-3;break;
  case "bow":{const a=t<.55?ease(t/.55):t<1.1?1:1-ease((t-1.1)/.65);p.headY=22*a;p.head=4*a;p.sy=1-.026*a;p.right=7*a;break}
  case "sit":break;
 }
 if(anim==="sit"||perch==="sit"){p.legScale=.72;p.legL=-12;p.legR=12;p.legY=16;p.headY+=3}
 if(perch==="crouch"){p.legScale=.85;p.sy*=.98;p.legL=-5;p.legR=5}
 if(perch==="peek-left")p.lean=-5;
 if(perch==="peek-right")p.lean=5;
 return p;
}
