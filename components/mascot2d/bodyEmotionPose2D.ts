import type {MascotEmotions} from "@/lib/mascot/types";
const clamp=(v:number)=>Math.min(1,Math.max(0,v));
export type BodyEmotionPose={headTilt:number;headY:number;bodyX:number;bodyY:number;bodyScaleY:number;torsoLean:number;bodyScaleXDelta:number;armLeftDeg:number;armRightDeg:number;armY:number;armScaleDelta:number;torsoY:number;bowY:number;hairX:number;hairY:number;cloakY:number;cloakSpread:number;cloakRotate:number;lanternTilt:number};
export function bodyEmotionPose2D(e:MascotEmotions):BodyEmotionPose{
 const happy=clamp(e.happiness),curious=clamp(e.curiosity),bored=clamp(e.boredom),sleepy=clamp(e.sleepiness),stress=clamp(e.stress),confident=clamp(e.confidence),energy=clamp(e.energy),attention=clamp(e.attention);
 return{
  headTilt:curious*1.8+happy*.45-bored*.7-sleepy*.9+confident*.18-stress*.15,
  headY:sleepy*2.3+bored*1.1-happy*.7-confident*.45+stress*.28,
  bodyX:(curious*.18-confident*.1)*(1-stress*.35),
  bodyY:sleepy*2+bored*1.25-happy*.65-confident*.5+stress*.2,
  bodyScaleY:1+happy*.006+confident*.004+energy*.002-sleepy*.012-bored*.007-stress*.002,
  torsoLean:curious*.65+confident*.45-stress*.25-bored*.18,
  bodyScaleXDelta:confident*.018+stress*.012-sleepy*.02+happy*.006,
  armLeftDeg:-happy*2+bored*1.5+stress*.8-curious*.35,
  armRightDeg:happy*2-bored*1.5-stress*.8+curious*.35,
  armY:sleepy*2+bored*1-stress*.65-happy*.25,
  armScaleDelta:-sleepy*.015-stress*.02+confident*.006+happy*.004,
  torsoY:-confident*1+sleepy*.55+bored*.35-stress*.25-happy*.2,
  bowY:-confident*1-happy*.3+sleepy*.4+bored*.15,
  hairX:curious*1.05-stress*.22,
  hairY:-curious*.95+sleepy*.42+bored*.18,
  cloakY:sleepy*.85+bored*.55-happy*.55-confident*.28+stress*.16,
  cloakSpread:happy*.018+confident*.012+energy*.006-stress*.012-sleepy*.01-bored*.006,
  cloakRotate:(curious*.55+bored*.18-stress*.28)*1.2,
  lanternTilt:curious*2.2+happy*.55-bored*.45-stress*.7+attention*.25
 }
}
