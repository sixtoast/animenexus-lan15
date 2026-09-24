/** Independent phases: changing an action must not restart breathing or the gait. */
export function createMotionTime(){return {action:'',perch:'',elapsed:0,breath:0,gait:0};}
export function advanceMotionTime(clock:ReturnType<typeof createMotionTime>,anim:string,perch:string,speed:number,dt:number){
 dt=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0));
 if(clock.action!==anim||clock.perch!==perch){clock.action=anim;clock.perch=perch;clock.elapsed=0;}
 clock.elapsed+=dt;
 clock.breath=(clock.breath+dt*Math.PI*2/(anim==='sleep'?5.2:4.2))%(Math.PI*2);
 if(anim==='walk'||anim==='run')clock.gait=(clock.gait+dt*(anim==='run'?1.65:1.05)*(1+Math.max(0,Math.min(1,speed))*.16))%1;
 return clock;
}
