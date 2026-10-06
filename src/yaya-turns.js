// A turn is a sequence of planted-foot steps, not a rotating display stand.
// Ground coordinates are in body units and must be drawn outside body yaw.
(() => {
  const PI=Math.PI,TAU=PI*2,RADIUS=1.35,GROUND_Z=.1;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const ease=v=>{const q=clamp(v);return q*q*q*(q*(q*6-15)+10);};
  const arc=q=>Math.sin(PI*clamp(q))**2;
  const envelope=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
  const wrap=(t,d)=>{const r=t%d;return r<0?r+d:r;};
  const duration=key=>key==='spin'?6:4;
  const plans=Object.freeze({
    // The first foot opens the turn; the second catches up under the body.
    turn:Object.freeze([
      {start:.38,end:.91,side:1,footYaw:PI/2,bodyYaw:PI/4},
      {start:1.00,end:1.53,side:-1,footYaw:PI/2,bodyYaw:PI/2},
      {start:2.50,end:3.03,side:-1,footYaw:0,bodyYaw:PI/4},
      {start:3.12,end:3.65,side:1,footYaw:0,bodyYaw:0},
    ]),
    // Three pairs of opening/catching steps turn all the way around. Each
    // pair reunites the feet, and the final pair returns to their start marks.
    spin:Object.freeze([
      {start:.44,end:1.16,side:1,footYaw:TAU/3,bodyYaw:PI/3},
      {start:1.24,end:1.96,side:-1,footYaw:TAU/3,bodyYaw:TAU/3},
      {start:2.04,end:2.76,side:1,footYaw:TAU*2/3,bodyYaw:PI},
      {start:2.84,end:3.56,side:-1,footYaw:TAU*2/3,bodyYaw:TAU*2/3},
      {start:3.64,end:4.36,side:1,footYaw:TAU,bodyYaw:PI*5/3},
      {start:4.44,end:5.16,side:-1,footYaw:TAU,bodyYaw:TAU},
    ]),
  });

  function foot(side,yaw,lift=0,contact=true,extraRadius=0) {
    const r=RADIUS+extraRadius;
    return {side,x:side*r*Math.cos(yaw),z:GROUND_Z-side*r*Math.sin(yaw),lift,yaw,contact};
  }

  function sample(key='turn',age=0) {
    const action=key==='spin'?'spin':'turn',length=duration(action);
    const t=wrap(Number.isFinite(age)?age:0,length),steps=plans[action];
    const angles={'-1':0,'1':0};
    let yaw=0,active=null,stepIndex=-1,progress=0,oldYaw=0;
    for(let i=0;i<steps.length;i++) {
      const step=steps[i];
      if(t>=step.end) {angles[step.side]=step.footYaw;yaw=step.bodyYaw;continue;}
      if(t>=step.start) {
        active=step;stepIndex=i;progress=(t-step.start)/(step.end-step.start);oldYaw=yaw;
        // The lifted foot and gaze lead. The weight-bearing body follows a
        // little later and eases to rest before the new foot is fully loaded.
        yaw+=(step.bodyYaw-yaw)*ease((progress-.12)/.79);
      }
      break;
    }

    const feet=[foot(-1,angles[-1]),foot(1,angles[1])];
    let bob=0,lean=0,squash=0,armSwing=0,faceOffset=0,leafOffset=0;
    let phase=t<steps[0].start?'anticipate':t>=steps.at(-1).end?'settle':'hold';
    if(active) {
      phase='step';
      const q=progress,e=ease(q),a=arc(q),direction=Math.sign(active.bodyYaw-oldYaw)||1;
      const angle=angles[active.side]+(active.footYaw-angles[active.side])*e;
      const index=active.side<0?0:1;
      // Swing around the planted foot instead of sliding straight through it.
      feet[index]=foot(active.side,angle,.40*a,q<=0||q>=1,.09*a);
      const support=feet[1-index],midX=(feet[0].x+feet[1].x)/2;
      lean=clamp((support.x-midX)*.043,-.05,.05)*a;
      bob=-.075*a;
      squash=.013*Math.sin(TAU*q)*a;
      armSwing=active.side*.22*a;
      faceOffset=direction*.17*envelope(q,0,.16,.65,1);
      leafOffset=-direction*.105*a;
    } else if(phase==='anticipate') {
      const q=t/steps[0].start;
      faceOffset=.18*arc(q);
      leafOffset=-.055*arc(q);
      yaw=-.035*arc(q);
      squash=.018*arc(q);
    } else if(action==='turn'&&t>1.53&&t<2.5) {
      // Look back just before the return step, while both feet stay planted.
      faceOffset=-.14*envelope(t,2.16,2.29,2.37,2.5);
      leafOffset=.045*envelope(t,2.2,2.32,2.38,2.5);
    }

    let bodyX=(feet[0].x+feet[1].x)/2;
    let bodyZ=(feet[0].z+feet[1].z)/2;
    if(active) {
      const support=feet[active.side<0?1:0],weight=.32*arc(progress);
      bodyX+=(support.x-bodyX)*weight;
      bodyZ+=(support.z-bodyZ)*weight;
    }
    bodyZ-=GROUND_Z;
    return {
      duration:length,t,yaw,faceYaw:yaw+faceOffset,leafYaw:yaw+leafOffset,
      bodyX,bodyZ,bob,lean,squash,armSwing,feet,
      turning:phase==='step'||phase==='anticipate',phase,stepIndex,progress,
    };
  }

  globalThis.YayaTurns=Object.freeze({sample,duration,plans,constants:Object.freeze({radius:RADIUS,groundZ:GROUND_Z,clearance:.40})});
})();
