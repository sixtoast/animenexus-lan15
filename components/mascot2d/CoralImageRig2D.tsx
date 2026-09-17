"use client";
import type {CSSProperties} from "react";
import {FaceRig2D} from "./FaceRig2D";
import armLeft from "./arm-left.png";
import armRight from "./arm-right.png";
import body from "./body.png";
import bow from "./bow.png";
import faceBase from "./face-base.png";
import hairBack from "./hair-back.png";
import hairFront from "./hair-front.png";
import hoodBack from "./hood-back.png";
import lantern from "./lantern.png";
import legLeft from "./leg-left.png";
import legRight from "./leg-right.png";
import "./coral-image-rig.css";

type Props={expression:string;blink:boolean;gazeX:number;gazeY:number;blush:number;turn:number;mouthOpen:number;mouthWide:number;mouthMood:number};
type ArtLayer={name:string;src:string;z:number;className?:string};

/*
 * Every exported PNG is 1024x1536 and already contains its own transparent
 * registration padding. Never crop/re-target these files: doing so destroys
 * their shared coordinate system. All art is first reconstructed 1:1 here.
 */
const ART:ArtLayer[]=[
 {name:"leg-left",src:legLeft.src,z:1,className:"coral-leg coral-leg-left"},
 {name:"leg-right",src:legRight.src,z:2,className:"coral-leg coral-leg-right"},
 {name:"body",src:body.src,z:3,className:"coral-body"},
 {name:"arm-left",src:armLeft.src,z:4,className:"coral-arm coral-arm-left"},
 {name:"arm-right",src:armRight.src,z:5,className:"coral-arm coral-arm-right"},
 {name:"bow",src:bow.src,z:6,className:"coral-bow"},
 {name:"hood",src:hoodBack.src,z:7,className:"coral-hood"},
 {name:"hair-back",src:hairBack.src,z:8,className:"coral-hair-back"},
 {name:"face-base",src:faceBase.src,z:9,className:"coral-face-base"},
 {name:"hair-front",src:hairFront.src,z:11,className:"coral-hair-front"},
 {name:"lantern",src:lantern.src,z:12,className:"coral-lantern"},
];

function RegisteredLayer({layer}:{layer:ArtLayer}){
 const style={zIndex:layer.z} as CSSProperties;
 return <img className={`coral-registered-layer ${layer.className??""}`} data-layer={layer.name} src={layer.src} alt="" draggable={false} style={style}/>;
}

export function CoralImageRig2D({expression,blink,gazeX,gazeY,blush,turn,mouthOpen,mouthWide,mouthMood}:Props){
 return <div className="coral-rig" aria-hidden="true" data-registration="master-canvas">
   <div className="coral-art-stack">{ART.map(layer=><RegisteredLayer key={layer.name} layer={layer}/>)}</div>
   <div className="coral-face-rig" data-layer="face"><FaceRig2D expression={expression} blink={blink} gazeX={gazeX} gazeY={gazeY} blush={blush} turn={turn} mouthOpen={mouthOpen} mouthWide={mouthWide} mouthMood={mouthMood}/></div>
 </div>;
}
