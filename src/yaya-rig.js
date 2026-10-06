// Pure body-space geometry. No canvas/p5 dependency: the renderer consumes this
// same rig for both paint styles, and props use the solved hand sockets.
(() => {
  const TAU = Math.PI * 2;
  const constants = Object.freeze({ shoulderX:2.28, shoulderY:-3.93, palmRadius:.64, armHalfWidth:.36, maxReach:2.05 });
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const smooth=(n)=>{const t=clamp(n);return t*t*(3-2*t);};
  const ramp=(t,a,b)=>smooth((t-a)/(b-a));
  const mix=(a,b,k)=>a+(b-a)*k;
  const phase=age=>((age%4)+4)%4;
  const add=(a,b,k=1)=>[a[0]+b[0]*k,a[1]+b[1]*k];

  function solveArm({side=1,target,shoulder,angle=0,gesture='',layer='front'}={}) {
    side=side<0?-1:1;
    const root=shoulder ? [...shoulder] : [side*constants.shoulderX,constants.shoulderY];
    const requested=target ? [...target] : [side*3.55,-3.9];
    const dx=requested[0]-root[0],dy=requested[1]-root[1],distance=Math.hypot(dx,dy);
    const direction=distance>1e-9 ? [dx/distance,dy/distance] : [side,0];
    const normal=[-direction[1],direction[0]];
    const reach=Math.min(distance,constants.maxReach),palm=add(root,direction,reach);
    // Both wrist corners terminate INSIDE the circular palm. Unlike a fixed
    // horizontal offset, this overlap is invariant under every arm direction.
    const wrist=add(palm,direction,-Math.min(.26,reach*.4));
    const half=constants.armHalfWidth,wristHalf=half*.9;
    const a=add(root,normal,half),b=add(wrist,normal,wristHalf);
    const c=add(wrist,normal,-wristHalf),d=add(root,normal,-half);
    return {side,shoulder:root,palm,radius:constants.palmRadius,direction,normal,angle,gesture,layer,reach,
      requested,clamped:distance>constants.maxReach,wrist,band:[a,b,c,d],edges:[[a,b],[d,c]],
      sockets:{grip:[...palm]}};
  }
  function pointAt(arm,x=0,y=0) {
    const c=Math.cos(arm.angle),s=Math.sin(arm.angle);
    return [arm.palm[0]+x*c-y*s,arm.palm[1]+x*s+y*c];
  }
  function actionCycle(key,age=0) {
    const t=phase(age);
    if(key==='eat') {
      const lift=ramp(t,.35,1.3)*(1-ramp(t,1.8,2.7));
      return {t,lift,mouthOpen:ramp(t,.85,1.22)*(1-ramp(t,1.7,1.95)),
        foodK:1-ramp(t,1.45,1.72)+ramp(t,3.3,3.85),
        chew:ramp(t,1.85,2.05)*(1-ramp(t,3.15,3.4))*(.5+.5*Math.sin(TAU*t*2))};
    }
    if(key==='drink') {
      const lift=ramp(t,.35,1.25)*(1-ramp(t,2.1,2.95));
      return {t,lift,mouthOpen:ramp(t,1.05,1.3)*(1-ramp(t,2,2.2)),sip:ramp(t,1.3,1.5)*(1-ramp(t,1.9,2.1))};
    }
    return {t,lift:.5-.5*Math.cos(TAU*t/4),mouthOpen:0};
  }

  function poseArms(key='idle',age=0,S={},p={}) {
    const t=phase(age),a=TAU*t/4,mode=(S.face||S).arms||'';
    const beat=globalThis.YayaActions?.sample(key,age)||{lift:.5-.5*Math.cos(a),reach:.5-.5*Math.cos(a),wave:Math.sin(a*3),crouch:0,energy:0};
    const arms=[-1,1].map(side=>{
      const lift=side<0 ? (p.left??.35) : (p.right??.35);
      // Default palms remain full-size outside the pear, with the short upper
      // arm hidden behind the body. Lift changes location around the root.
      const theta=.2-.56*lift;
      return solveArm({side,target:[side*(2.28+1.27*Math.cos(theta)),-3.93+1.27*Math.sin(theta)],angle:side*.1,layer:'back'});
    });
    const set=(side,x,y,angle=0,gesture='')=>{
      arms[side<0?0:1]=solveArm({side,target:[x,y],angle,gesture,layer:'front'});
    };
    const q=actionCycle(key,t),wave=Math.sin(a*2),pulse=Math.sin(a);
    if(key==='eat') set(-1,mix(-1.8,-1.16,q.lift),mix(-2.85,-3.46,q.lift),mix(.3,-.115,q.lift),'grip');
    else if(key==='drink') set(1,mix(1.85,1.24,q.lift),mix(-2.82,-3.45,q.lift),mix(0,-.5,q.lift),'grip');
    else if(key==='stretch') for(const s of [-1,1]) set(s,s*mix(3.45,2.83,beat.lift),mix(-3.82,-5.86,beat.lift),s*.12,'fingers');
    else if(key==='wave'||key==='hello') {
      const s=S.direction<0?-1:1,k=beat.lift;
      // Wave the entire short arm around its fixed shoulder. The palm reaches
      // outside the silhouette; wrist-only wobble is too small to read.
      const angle=mix(.05,-.65,k)+beat.wave*.26;
      const radius=mix(1.27,1.95,k);
      set(s,s*(constants.shoulderX+Math.cos(angle)*radius),constants.shoulderY+Math.sin(angle)*radius,beat.wave*.18,'fingers');
    }
    else if(key==='reach') {
      const s=S.direction<0?-1:1,k=beat.reach;
      set(s,s*(constants.shoulderX+mix(1.27,2.02,k)),mix(-3.88,-3.96,k),s*.05,'fingers');
    }
    else if(key==='celebrate') for(const s of [-1,1]) {
      const k=beat.lift;
      set(s,s*(constants.shoulderX+mix(1.22,1.4,k)),constants.shoulderY+mix(.18,-1.36,k)+beat.crouch*.22,s*(-.22+.1*k),'fingers');
    }
    else if(key==='hug'||key==='cuddle') for(const s of [-1,1]) {
      const k=beat.reach;
      set(s,s*mix(3.4,1.39,k),mix(-3.85,-3.32,k),-s*.26,'grip');
    }
    else if(key==='sleep') for(const s of [-1,1]) {
      if(S.sleeping)set(s,s*2.65,-2.55,s*.12);
      else set(s,s*2.6,-3.3,s*.12);
    }
    else if(key==='turn'||key==='spin') {
      // Turning keeps relaxed arms by the lower flanks. Shoulder-height
      // default palms read as a T-pose even when the feet are stepping well.
      // A tiny counter-swing follows the planted-foot clock, never the old
      // left/right lift values. Full palms and fixed shoulder roots remain.
      const swing=globalThis.YayaTurns?.sample(key,age).armSwing||0;
      for(const s of [-1,1]) set(s,s*3.00+swing*.18,-2.16+s*swing*.07,s*.08);
    }
    else if(key==='exercise') for(const s of [-1,1]) {const lift=.5-.5*Math.cos(a*2);set(s,s*(3.05-.1*lift),-4.15-1.12*lift,s*.12,'grip');}
    else if(key==='dance') for(const s of [-1,1]) {const lift=.5+.5*Math.sin(a*2+s*Math.PI/2);set(s,s*(2.9+.1*lift),-3.48-1.92*lift,s*.2,'fingers');}
    else if(key==='ball') set(1,2.6+.15*wave,-2.6-.2*wave,-.3,'fingers');
    else if(S.action) return arms;
    else if(mode==='coverMouth') {const s=key==='laugh'?-1:1;set(s,s*(1.22+.02*pulse),-3.46+.025*Math.sin(a*4),s*.2,'fingers');}
    else if(mode==='frontFists') for(const s of [-1,1]) set(s,s*(1.3+.04*Math.sin(a*2+s)),-2.6-.04*Math.abs(wave),s*.12,'fist');
    else if(mode==='coverEye') {set(-1,-1.42+.03*wave,-5.04,-.1,'fingers');set(1,1.36,-2.9,.32);}
    else if(mode==='chin') set(1,1.06,-2.92,-.54,'seams');
    else if(mode==='rub') for(const s of [-1,1]) set(s,s*(1.18+.08*Math.sin(a*4+s)),-2.6+.035*s*Math.cos(a*4),s*.18);
    else if(mode==='palmUp') set(1,1.9,-2.58,-.68,'fingers');
    else if(mode==='peek') set(1,1.55,-5.2,-.16,'fingers');
    else if(mode==='pushAway') for(const s of [-1,1]) set(s,s*(2.05+.06*Math.sin(a*2+s)),-2.78,s*.86,'fingers');
    else if(mode==='pointCheek') set(1,2.1,-3.3,-.48,'point');
    else if(mode==='turnAway') for(const s of [-1,1]) set(s,s*1.3,-2.55,s*.48,'fist');
    return arms;
  }
  function propPose(key,age,arms) {
    const q=actionCycle(key,age),arm=arms[key==='eat'?0:1];
    if(key==='eat') return {kind:'spoon',hand:arm.side,grip:[...arm.sockets.grip],angle:arm.angle,
      tip:pointAt(arm,1.04,0),foodK:q.foodK,cycle:q};
    if(key==='drink') return {kind:'cup',hand:arm.side,grip:[...arm.sockets.grip],angle:arm.angle,
      center:pointAt(arm,-.64,0),rim:pointAt(arm,-.64,-.48),cycle:q};
    return null;
  }
  globalThis.YayaRig=Object.freeze({constants,solveArm,poseArms,actionCycle,pointAt,propPose});
})();
