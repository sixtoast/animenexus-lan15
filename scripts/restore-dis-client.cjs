/** Soft restore/patch DislikeClient for ReverseHit.userFit + correct preference APIs. */
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "components", "DislikeClient.tsx");
if (!fs.existsSync(file)) {
  console.log("[restore] dis-client skip — file missing");
  process.exit(0);
}
let t = fs.readFileSync(file, "utf8");

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
  console.log("[restore] dis-client added userFit");
}

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
  console.log("[restore] dis-client fixed preference/profile");
}

fs.writeFileSync(file, t);
console.log("[restore] dis-client done", t.length);
