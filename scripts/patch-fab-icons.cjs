const fs = require("fs");
const path = require("path");

const fabPath = path.join(__dirname, "..", "components", "FabMenu.tsx");
if (fs.existsSync(fabPath)) {
  let t = fs.readFileSync(fabPath, "utf8");
  if (!t.includes("NexusIcon") || /[\u{1F300}-\u{1F9FF}]/u.test(t) || t.includes("\u2726")) {
    const reps = [
      ["\uD83C\uDFAF Challenge", "Challenge"],
      ["\uD83D\uDCC5 Seasonal", "Seasonal"],
      ["\uD83D\uDD6F\uFE0F Night Desk", "Night Desk"],
      ["\uD83D\uDD0D Sauce", "Sauce"],
      ["\uD83C\uDF19 Tonight", "Tonight"],
      ["\u2615 Break", "Break"],
      ["\uD83C\uDFB2 Browse", "Browse"],
      ['{open ? "\u00d7" : "\u2726"}', '{open ? "Close" : "Menu"}'],
      ['{reducedMotion ? "\u2728 Full motion" : "\u23F8\uFE0F Reduce motion"}', '{reducedMotion ? "Full motion" : "Reduce motion"}'],
    ];
    for (const [a, b] of reps) t = t.split(a).join(b);
    t = t.replace(/[\u{1F300}-\u{1F9FF}]/gu, "");
    fs.writeFileSync(fabPath, t);
    console.log("[patch-fab-icons] cleaned FabMenu");
  } else {
    console.log("[patch-fab-icons] FabMenu already iconized");
  }
}

const sound = path.join(__dirname, "..", "components", "NavSoundToggle.tsx");
if (fs.existsSync(sound)) {
  let t = fs.readFileSync(sound, "utf8");
  if (t.includes("\uD83D\uDD0A") || t.includes("\uD83D\uDD07")) {
    t = t.replace(/\{on \? "\uD83D\uDD0A" : "\uD83D\uDD07"\}/g, '{on ? "Sound" : "Muted"}');
    fs.writeFileSync(sound, t);
    console.log("[patch-fab-icons] sound toggle");
  }
}

const motion = path.join(__dirname, "..", "components", "MotionToggle.tsx");
if (fs.existsSync(motion)) {
  let t = fs.readFileSync(motion, "utf8");
  if (t.includes("\u23F8") || t.includes("\u2726")) {
    t = t.replace(/\{reducedMotion \? "\u23F8" : "\u2726"\}/g, '{reducedMotion ? "Still" : "Motion"}');
    t = t.replace(/\{reducedMotion \? "\u23F8\uFE0F" : "\u2726"\}/g, '{reducedMotion ? "Still" : "Motion"}');
    fs.writeFileSync(motion, t);
    console.log("[patch-fab-icons] motion toggle");
  }
}

const toast = path.join(__dirname, "..", "components", "ToastProvider.tsx");
if (fs.existsSync(toast)) {
  let t = fs.readFileSync(toast, "utf8");
  if (t.includes("anime-toast-emoji")) {
    t = t.replace(
      /\s*: t\.emoji \? \(\s*<span className="anime-toast-emoji">\{t\.emoji\}<\/span>\s*\) : null/,
      " : null",
    );
    fs.writeFileSync(toast, t);
    console.log("[patch-fab-icons] toast emoji span removed");
  }
}

const hero = path.join(__dirname, "..", "components", "HeroGreeting.tsx");
if (fs.existsSync(hero)) {
  let t = fs.readFileSync(hero, "utf8");
  if (/[\u{1F300}-\u{1F9FF}]/u.test(t)) {
    t = t.replace(/icon: "[^"]*"/g, 'icon: "mark"');
    t = t.replace(
      /<span className="greeting-icon" aria-hidden>\s*\{g\.icon\}\s*<\/span>/,
      '<span className="greeting-icon greeting-icon--mark" aria-hidden />',
    );
    fs.writeFileSync(hero, t);
    console.log("[patch-fab-icons] hero greeting");
  }
}
