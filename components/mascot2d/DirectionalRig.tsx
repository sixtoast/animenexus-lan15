"use client";
import {useId} from "react";
import assets from "./turnAssets.json";
import grip from "./poses/grip.png";
import arm from "./arm-right.png";
import leg from "./leg-left.png";
type Rect = [number, number, number, number];
type Cut = {src: string; box: number[]; canvas: number[]; clip?: string};
export function Sprite({asset, target, name}: {asset: Cut; target: Rect; name: string}) {
 const clipId=useId().replace(/:/g,"");
 return <svg x={target[0]} y={target[1]} width={target[2]} height={target[3]} viewBox={asset.box.join(" ")} preserveAspectRatio="none" overflow="hidden" data-direction-part={name}>{asset.clip&&<defs><clipPath id={clipId}><path d={asset.clip}/></clipPath></defs>}<image clipPath={asset.clip?`url(#${clipId})`:undefined} href={asset.src} width={asset.canvas[0]} height={asset.canvas[1]}/></svg>;
}
const original = (src: string, box: Rect): Cut => ({src, box, canvas: [1024,1536]});
function Draft({index, target, name}: {index: keyof typeof assets; target: Rect; name: string}) {return <Sprite asset={assets[index]} target={target} name={name}/>;}
export function TurnRig({angle, openness, mouthOpen}: {angle: 15|30|45; openness: number; mouthOpen: number}) {
 const id=useId().replace(/:/g,"");
 const set=angle===15?{hood:"3",back:"27",face:"6",hair:"15",eye:"8",mouth:"1",dress:"7",cape:"5"}:angle===30?{hood:"30",back:"37",face:"11",hair:"25",eye:"10",mouth:"16",dress:"20",cape:"9"}:{hood:"40",back:"34",face:"18",hair:"48",eye:"19",mouth:"33",dress:"43",cape:"42"};
 const d=(key: keyof typeof set,target:Rect)=><Draft index={set[key] as keyof typeof assets} target={target} name={`${angle}-${key}`}/>;
 const shift=(angle-15)*.65;
 return <g className={`coral-angle-view coral-angle-${angle}`} data-direction-view={angle}>
  <g className="coral-direction-facing">
   <Sprite asset={original(leg.src,[337,119,336,1274])} target={[434,1060,115,430]} name="far-leg"/>
   <Sprite asset={original(leg.src,[337,119,336,1274])} target={[563,1060,120,430]} name="near-leg"/>
   <Sprite asset={original(arm.src,[76,169,871,1078])} target={[662,698,206,344]} name="free-arm"/>
   {d("dress",[330,687,421,432])}{d("cape",[268,647,490,261])}
   <Sprite asset={original(grip.src,[106,166,872,1200])} target={[177,677,290,526]} name="carrying-arm"/>
   <path d={`M${566+shift} 596 h54 l-3 76 q-23 20 -49 0Z`} fill="#f8dcc5" stroke="#bd9682" strokeWidth="2"/>
   <g transform="translate(0 30)"><g className="coral-head-action">
    {d("hood",[176,74,640,565])}{d("back",[264,203,484,425])}
    {d("face",[380+shift,274,338-shift*.4,367])}
    <defs><clipPath id={`${id}-eyes`}><rect x="400" y={536-104*openness} width="345" height={104*openness}/></clipPath></defs>
    <g clipPath={`url(#${id}-eyes)`}>
     <Draft index={set.eye as keyof typeof assets} target={[494+shift,455,112,91]} name="near-eye"/>
     <Draft index="49" target={[670+shift*.25,460,angle===45?40:64,78]} name="far-eye"/>
    </g>
    {openness<.1&&<g stroke="#49333b" strokeWidth="5" fill="none" strokeLinecap="round"><path d={`M${500+shift} 521 q45 18 95 0`}/><path d={`M${674+shift*.25} 519 q18 13 36 0`}/></g>}
    {mouthOpen<.08?d("mouth",[603+shift*.4,578,28,8]):<ellipse cx={618+shift*.4} cy="580" rx="12" ry={5+mouthOpen*16} fill="#763c40"/>}
    <g className="coral-direction-hair">{d("hair",[256,18,543,625])}</g>
   </g></g>
  </g>
 </g>;
}
const atlas = (box: Rect): Cut => ({src:"/mascot2d/profile-parts-v2.png",box,canvas:[1024,1536]});
export function ProfileRig({openness,mouthOpen}: {openness:number;mouthOpen:number}) {
 const id=useId().replace(/:/g,"");
 const head={...atlas([0,25,380,495]),clip:"M0 25 H380 V300 H368 V430 L330 520 H0Z"};
 // Keep calf and boot in one drawing: the old ankle crop split the cuff on every step.
 const limb=(side:"near"|"far")=><g className={`coral-side-leg coral-side-${side}`}><Sprite asset={atlas([419,645,195,345])} target={[-62,-25,124,225]} name={`${side}-thigh`}/><g className={`coral-side-shin coral-shin-${side}`}><Sprite asset={atlas([755,680,242,345])} target={[-53,-32,143,262]} name={`${side}-shin-boot`}/></g></g>;
 return <g className="coral-profile-view" data-direction-view="90"><g className="coral-direction-facing"><g className="coral-side-body">
  <g>{limb("far")}</g>{limb("near")}
  <g className="coral-side-free-arm"><Sprite asset={atlas([85,675,220,315])} target={[501,677,166,315]} name="free-arm"/></g>
  <Sprite asset={{...atlas([367,149,371,404]),clip:"M480 149 H738 V553 H367 V365 L418 225 Z"}} target={[297,630,460,494]} name="torso-cape"/>
  <g className="coral-side-carry"><Sprite asset={atlas([755,136,245,438])} target={[528,696,208,461]} name="sleeve-hand-lantern"/></g>
  <path d="M599 565 h47 l-4 101 q-19 12 -40 -5Z" fill="#f8dcc5" stroke="#bd9682" strokeWidth="2"/>
  <g transform="translate(0 38)"><g transform="translate(610 650) scale(1.25 1) translate(-610 -650)"><g className="coral-side-head">
   <Sprite asset={head} target={[241,15,506,660]} name="profile-head"/>
   <defs><clipPath id={`${id}-eye`}><rect x="612" y={523-openness*98} width="100" height={openness*98}/></clipPath></defs>
   <g clipPath={`url(#${id}-eye)`}><Sprite asset={atlas([120,1229,160,153])} target={[620,428,82,94]} name="profile-eye"/></g>
   {openness<.1&&<path d="M625 505 q29 17 66 -4" fill="none" stroke="#49333b" strokeWidth="5" strokeLinecap="round"/>}
   <path d="M630 413 q26 -11 50 -3" fill="none" stroke="#b38d77" strokeWidth="3"/>
   {mouthOpen<.08?<path d="M692 562 q9 6 18 -2" fill="none" stroke="#a76e57" strokeWidth="2.5"/>:<ellipse cx="701" cy="563" rx="7" ry={4+mouthOpen*13} fill="#763c40"/>}
  </g></g></g>
 </g></g></g>;
}
