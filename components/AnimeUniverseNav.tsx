"use client";
import { useEffect, useState } from "react";
export const UNIVERSE_SPACES = ["story","identity","characters","creators","artwork","soundtrack","franchise","watch","personal"] as const;
const labels: Record<string,string> = {story:"Story",identity:"Identity",characters:"Characters",creators:"Creators",artwork:"Artwork",soundtrack:"Soundtrack",franchise:"Franchise",watch:"Watch",personal:"Yours"};
export function AnimeUniverseNav(){
 const [active,setActive]=useState<string>(UNIVERSE_SPACES[0]);
 useEffect(()=>{const els=UNIVERSE_SPACES.map(id=>document.getElementById(id)).filter(Boolean) as HTMLElement[]; if(!els.length)return; const ob=new IntersectionObserver(es=>{const v=es.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0]; if(v)setActive(v.target.id)},{rootMargin:"-18% 0px -58% 0px",threshold:[.05,.2,.5]}); els.forEach(e=>ob.observe(e)); return()=>ob.disconnect()},[]);
 return <nav className="anime-universe-nav" aria-label="Anime universe"><div className="anime-universe-nav__inner"><span className="anime-universe-nav__brand">UNIVERSE</span><div className="anime-universe-nav__track">{UNIVERSE_SPACES.map((id,i)=><button key={id} type="button" className={active===id?"is-active":""} aria-current={active===id?"location":undefined} onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"})}><span>{String(i+1).padStart(2,"0")}</span>{labels[id]}</button>)}</div></div></nav>;
}
