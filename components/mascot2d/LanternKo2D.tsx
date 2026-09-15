"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { LanternKo2DProps } from "./types";
import styles from "./lantern-ko-2d.module.css";

const clamp = (v: number, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));

/**
 * Independent 2.5D Lantern-ko renderer.
 * Behaviour stays authoritative upstream. This component only maps existing
 * mascot pose inputs to layered artwork and CSS transforms.
 *
 * The current shapes are an intentionally lightweight rig-preview. Production
 * transparent artwork slots into the same named layers without changing the API.
 */
export function LanternKo2D({
  expression,
  emotions,
  lookBias = { x: 0, y: 0 },
  anim,
  yaw = 0,
  speed = 0,
  justLanded = false,
  className = "",
}: LanternKo2DProps) {
  const root = useRef<HTMLDivElement>(null);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let timer = 0;
    let cancelled = false;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setBlink(true);
        window.setTimeout(() => setBlink(false), 115);
        schedule();
      }, 2400 + Math.random() * 3200);
    };
    schedule();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  const pose = useMemo(() => {
    const gx = clamp(lookBias.x) * 7;
    const gy = clamp(lookBias.y) * 5;
    const blush = Math.max(0.12, Math.min(0.9, emotions.happiness * 0.34 + emotions.stress * 0.28));
    const happy = ["happy", "excited", "proud", "smug", "mischievous"].includes(expression);
    const sad = ["sad", "scared"].includes(expression);
    return { gx, gy, blush, happy, sad };
  }, [lookBias.x, lookBias.y, emotions.happiness, emotions.stress, expression]);

  const vars = {
    "--gaze-x": `${pose.gx}px`,
    "--gaze-y": `${pose.gy}px`,
    "--head-x": `${clamp(lookBias.x) * 2.5}px`,
    "--head-y": `${clamp(lookBias.y) * 1.8}px`,
    "--yaw": `${clamp(yaw, -0.6, 0.6) * 3}deg`,
    "--blush": pose.blush,
    "--energy": Math.max(0.2, emotions.energy),
    "--speed": Math.min(1, speed),
  } as CSSProperties;

  return (
    <div
      ref={root}
      className={`${styles.root} ${justLanded ? styles.landed : ""} ${className}`}
      style={vars}
      data-expression={expression}
      data-anim={anim}
      aria-label="Lantern-ko"
    >
      <div className={styles.shadow} />
      <div className={styles.backCloak} data-layer="back-cloak" />
      <div className={styles.body} data-layer="body">
        <div className={`${styles.arm} ${styles.armLeft}`} />
        <div className={`${styles.arm} ${styles.armRight}`} />
        <div className={styles.torso} />
        <div className={styles.bow}><i /><i /><b /></div>
      </div>

      <div className={styles.headRig}>
        <div className={styles.hood} data-layer="hood" />
        <div className={styles.hairBack} data-layer="hair" />
        <div className={styles.face} data-layer="face">
          <div className={`${styles.blush} ${styles.blushLeft}`} />
          <div className={`${styles.blush} ${styles.blushRight}`} />

          {([-1, 1] as const).map(side => (
            <div key={side} className={`${styles.eye} ${side < 0 ? styles.eyeLeft : styles.eyeRight} ${blink ? styles.blink : ""}`}>
              <div className={styles.sclera} />
              <div className={styles.irisRig}>
                <div className={styles.iris} />
                <div className={styles.irisGold} />
                <div className={styles.pupil} />
                <div className={styles.highlightLarge} />
                <div className={styles.highlightSmall} />
              </div>
              <div className={styles.upperLash} />
            </div>
          ))}

          <div className={`${styles.brow} ${styles.browLeft} ${pose.sad ? styles.browSadLeft : ""}`} />
          <div className={`${styles.brow} ${styles.browRight} ${pose.sad ? styles.browSadRight : ""}`} />
          <div className={`${styles.mouth} ${pose.happy ? styles.mouthHappy : ""} ${pose.sad ? styles.mouthSad : ""}`} />
        </div>
        <div className={styles.hairFront} data-layer="hair" />
        <div className={styles.lantern} data-layer="lantern"><span /><b /></div>
      </div>
    </div>
  );
}
