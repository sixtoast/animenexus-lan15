export type GazePoint={x:number;y:number};
export type GazeSource="travel"|"environment"|"pointer"|"perch";
type Slot={point:GazePoint;expiresAt:number;priority:number};
const PRIORITY:Record<GazeSource,number>={travel:4,pointer:3,environment:2,perch:1};
export class GazeController2D{
 private slots=new Map<GazeSource,Slot>();
 set(source:GazeSource,point:GazePoint,ttlMs=Infinity){this.slots.set(source,{point,priority:PRIORITY[source],expiresAt:Number.isFinite(ttlMs)?performance.now()+ttlMs:Infinity})}
 clear(source:GazeSource){this.slots.delete(source)}
 clearAll(){this.slots.clear()}
 resolve(now=performance.now()):GazePoint{let best:Slot|null=null;for(const [source,slot] of this.slots){if(slot.expiresAt<=now){this.slots.delete(source);continue}if(!best||slot.priority>best.priority)best=slot}return best?.point??{x:0,y:0}}
}
