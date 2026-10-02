"use client";
import Link from "next/link";
import { usePerformance, type PerformancePrefs } from "@/components/PerformanceProvider";
import { NexusIcon } from "@/components/ui/NexusIcon";
import "./performance.css";

type Key=keyof PerformancePrefs;
const portal:[Key,string,string][]=[
["portal","Universe Portal","Use the cinematic anime-world entry experience."],
["portalScene","Portal scene","Render the atmospheric orbital scene behind the artwork."],
["portalParallax","Pointer parallax","Move Portal layers subtly with pointer movement."],
["portalViewTransition","View transitions","Animate the Portal into the anime dossier."],
["portalMask","Artwork mask","Use the cinematic artwork fade and mask treatment."],
["portalCharacters","Character layers","Render layered character figures in the Portal."],
["portalGrain","Film grain","Add grain and scanline texture to the Portal."]
];
const other:[Key,string,string][]=[
["cinematic","Cinematic effects","Enable additional ambient visual treatment."],
["sound","Interface sound","Allow AnimeNexus interface sounds and interaction cues."]
];

export default function PerformancePage(){
 const p=usePerformance();
 const row=(x:[Key,string,string])=><div className={`performance-setting-row${x[0]!=="portal"&&!p.portal?" is-disabled":""}`} key={x[0]}>
   <div><h3>{x[1]}</h3><p>{x[2]}</p></div>
   <button type="button" className="performance-switch" role="switch" aria-checked={p[x[0]]} disabled={x[0]!=="portal"&&!p.portal} onClick={()=>p.setPref(x[0],!p[x[0]])}>
    <span className="performance-switch__track"><span className="performance-switch__thumb"/></span><span className="performance-switch__state">{p[x[0]]?"ON":"OFF"}</span>
   </button>
 </div>;
 return <main className="performance-page"><div className="performance-page__shell">
  <header className="performance-header"><Link href="/" className="performance-back"><NexusIcon name="empty" size="sm"/> Back to AnimeNexus</Link><div className="performance-kicker">SYSTEM / PERFORMANCE</div><h1>Performance <em>&amp; Effects</em></h1><p>Control the visual systems that shape AnimeNexus. Changes are saved on this device.</p></header>
  <section className={`performance-safe-card${p.safeMode?" is-safe":""}`}><div><span className="performance-eyebrow">STABILITY PROFILE</span><h2>{p.safeMode?"Emergency Safe Mode":"Cinematic profile"}</h2><p>{p.safeMode?"Heavy visual systems are disabled. Re-enable individual features below when ready.":"Your current visual profile is active."}</p></div><button type="button" className="performance-safe-button" onClick={()=>p.setSafeMode(!p.safeMode)}>{p.safeMode?"Restore defaults":"Emergency safe mode"}</button></section>
  <section className="performance-section"><div className="performance-section__heading"><span>01</span><div><h2>Universe Portal</h2><p>Choose exactly how much of the cinematic entry sequence your device should render.</p></div></div><div className="performance-list">{portal.map(row)}</div></section>
  <section className="performance-section"><div className="performance-section__heading"><span>02</span><div><h2>Interface &amp; Motion</h2><p>Additional effects that can affect battery use, GPU load or motion intensity.</p></div></div><div className="performance-list">{other.map(row)}</div></section>
  <section className="performance-footer-card"><div><span className="performance-eyebrow">RECOVERY</span><h2>Need a clean baseline?</h2><p>Reset every visual preference to the default profile.</p></div><button type="button" className="performance-reset" onClick={p.reset}>Reset all effects</button></section>
 </div></main>;
}