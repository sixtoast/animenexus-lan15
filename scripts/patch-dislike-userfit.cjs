/** Ensure ReverseHit includes userFit; fix broken blend/build calls if present. */
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "components", "DislikeClient.tsx");
if (!fs.existsSync(file)) {
  console.log("[patch-dislike] skip — file missing");
  process.exit(0);
}
let t = fs.readFileSync(file, "utf8");

// Always ensure userFit is on the push object
const badPush = `out.push({
          anime: c,
          ...scored,
          reasonSource: profile.reasonSource,
        });`;
const goodPush = `out.push({
          anime: c,
          ...scored,
          userFit,
          reasonSource: profile.reasonSource,
        });`;
if (t.includes(badPush)) {
  t = t.replace(badPush, goodPush);
  console.log("[patch-dislike] added userFit to ReverseHit push");
} else if (t.includes("userFit,\n          reasonSource")) {
  console.log("[patch-dislike] userFit already present");
}

// Fix incorrect rewrite of run() preference + profile construction
const brokenLiked = `const liked = entries
        .filter((e) => e.watchStatus === "completed" || e.userRating >= 7)
        .slice(0, 40)
        .map((e) => ({
          id: e.id,
          title: e.title,
          genres: e.genres,
          score: e.score,
        })) as Anime[];

      const userVec =
        liked.length > 0
          ? blendUserVector(
              liked.map((a) => getBestAvailableFingerprint(a).fingerprint),
            )
          : buildUserPreferenceVector([]);

      const sourceFp = getBestAvailableFingerprint(anime);
      const profile = buildDislikeProfile(
        { animeId: anime.id, fingerprint: sourceFp.fingerprint },
        reasons,
        userVec,
      );`;

const fixedRun = `const rs = getBestAvailableFingerprint(anime);
      let userVec: Record<string, number> | null = null;
      try {
        if (entries.length >= 2) {
          const user = buildUserPreferenceVector(entries);
          userVec = blendUserVector(user, {
            stable: 0.7,
            mediumTerm: 0.2,
            recent: 0.1,
            session: 0,
          });
        }
      } catch {
        userVec = null;
      }

      const profile = buildDislikeProfile(rs.fingerprint, reasons, userVec);`;

if (t.includes(brokenLiked)) {
  t = t.replace(brokenLiked, fixedRun);
  console.log("[patch-dislike] restored preference/profile construction");
}

fs.writeFileSync(file, t);
console.log("[patch-dislike] done", t.length);
