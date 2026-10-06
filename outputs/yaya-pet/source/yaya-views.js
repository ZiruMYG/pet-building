// Yaya's shared 2.5D views and grounded action renderer.
// Angles: 0 front, PI/2 facing right, PI back, 3PI/2 facing left.
// No raster sprites or horizontal-flip cuts are used at the turnarounds.
(() => {
  const TAU = Math.PI * 2;
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp01(x); return x*x*(3-2*x); };
  const mix = (a,b,t) => a+(b-a)*t;
  function travel(t,key='run') {
    const running=key==='run',period=running?6:8,half=period/2,move=running?2.3:3,turn=half-move;
    const q=((t%period)+period)%period;
    // Distance drives both the stride and the turn. Running crosses the same
    // track faster, with more strides, higher recovery and an airborne phase.
    let x,yaw,distance,speed,phase;
    if(q<move) { const v=q/move; x=mix(-1,1,smooth(v)); yaw=Math.PI/2; distance=2*smooth(v); speed=4*v*(1-v); phase=running?'向右跑':'向右走'; }
    else if(q<half) { x=1; yaw=mix(Math.PI/2,Math.PI*1.5,smooth((q-move)/turn)); distance=2; speed=0; phase='转身'; }
    else if(q<half+move) { const v=(q-half)/move; x=mix(1,-1,smooth(v)); yaw=Math.PI*1.5; distance=2+2*smooth(v); speed=4*v*(1-v); phase=running?'向左跑':'向左走'; }
    else { x=-1; yaw=mix(Math.PI*1.5,Math.PI*2.5,smooth((q-half-move)/turn)); distance=4; speed=0; phase='转回来'; }
    return {x,yaw,gait:distance*TAU*(running?2:1.5),speed,phase,period};
  }
  function viewAngle(view) {
    if(typeof view==='number') return view;
    if(view && typeof view==='object') return view.yaw || 0;
    return {front:0,side:Math.PI/2,back:Math.PI,left:Math.PI*1.5}[view] || 0;
  }
  function project(x,y,z,yaw) {
    return [x*Math.cos(yaw)+z*Math.sin(yaw),y,z*Math.cos(yaw)-x*Math.sin(yaw)];
  }
  function debugArm(D,u,arm) {
    const [a,b]=[arm.shoulder,arm.palm];
    D.flatLine([[a[0]*u,a[1]*u],[b[0]*u,b[1]*u]],'#E4568B',2);
    D.flatEllipse(a[0]*u,a[1]*u,.08*u,.08*u,'#E4568B',null,0);
    D.flatEllipse(b[0]*u,b[1]*u,.07*u,.07*u,'#308CCB',null,0);
    D.flatEllipse(arm.wrist[0]*u,arm.wrist[1]*u,.055*u,.055*u,'#FFFFFF','#308CCB',1.4);
  }
  function drawTurnedFace(D,u,S,age,yaw,cols,bodyYaw=yaw) {
    const c=Math.cos(yaw),s=Math.sin(yaw),C=D.palette,e=S.face||S;
    // Keep a turning face on one continuous projection, including exact
    // front view; swapping to another eye drawing can make its size jump.
    const rigidTurn=['turn','spin'].includes(S.action||S.state);
    if(Math.abs(s)<.0001 && c>0 && !rigidTurn) {D.flatFace(u,age,S);return;}
    const kinds=Array.isArray(e.eyes)?e.eyes:[e.eyes,e.eyes];
    for(const side of [-1,1]) {
      const visibility=smooth((c*.82-side*s*.58+.08)/.5);
      if(visibility<.005) continue;
      const eye=project(side*1.55,-5.15,1.63,yaw), w=(.57-.13*Math.abs(s))*visibility;
      eye[0]=YayaBody.fitEllipseX(eye[0],eye[1],w,.9,bodyYaw);
      const kind=kinds[side<0?0:1];
      push();translate(eye[0]*u,eye[1]*u);
      if(['happy','laugh','relieved','closed','sleepy'].includes(kind)) {
        if(S.sleeping) {
          const lid=Array.from({length:17},(_,i)=>{const a=i/8-1;return [a*w*u,(.06+.16*(1-a*a))*u];});
          D.flatLine(lid,C.ink,2.6);
        } else D.flatLine([[-w*u,.06*u],[0,(kind==='relieved'?.26:-.22)*u],[w*u,.06*u]],C.ink,2.6);
      } else if(['wide','look','curious'].includes(kind)) {
        D.flatEllipse(0,0,w*u,.88*u,C.paper,C.ink,2.3);
        const gaze=s*.1+Math.max(-1,Math.min(1,e.lookX||0))*.20;
        D.flatEllipse(gaze*u,.05*u,w*.47*u,.35*u,C.eye,null,0);
        D.flatEllipse(gaze*u-.07*u,-.11*u,.08*u,.12*u,'#FFFFFF',null,0);
      } else {
        D.flatEllipse(0,0,w*u,.82*u,C.eye,C.ink,2.2);
        D.flatEllipse(-.14*visibility*u,-.28*u,.12*visibility*u,.18*u,'#FFFFFF',null,0);
      }
      pop();
      const cheek=project(side*2.28,-3.93,1.68,yaw);
      cheek[0]=YayaBody.fitEllipseX(cheek[0],cheek[1],.64*visibility,.43,bodyYaw);
      D.flatEllipse(cheek[0]*u,cheek[1]*u,.64*visibility*u,.43*u,mixCol(cols.body,C.blush,e.blush??.22),null,0);
    }
    const mouthVisibility=smooth((c+.13)/.45);
    if(mouthVisibility>.001) {
      const mx=2.55*s*u,my=-3.58*u,mw=(.5*Math.max(.13,c))*u;
      if(['open','O','o','laugh','cheer','yawn','small'].includes(e.mouth)) {
        const height=e.mouth==='yawn'?.14+.64*(e.yawn??1):e.mouth==='cheer'?.61:e.mouth==='small'?.10:.36;
        D.flatEllipse(mx,my,mw*(e.mouth==='small'?.4:1),height*mouthVisibility*u,C.ink,null,0);
      }
      else D.flatLine([[mx-mw,my],[mx,my+.2*mouthVisibility*u],[mx+mw,my-.02*u]],C.ink,2.5);
    }
  }
  function makeArms(D,R,key,age,S,p,yaw,run,gait,speed,view={}) {
    const original=R.poseArms(key,age,S,p), sn=Math.sin(yaw), cs=Math.cos(yaw);
    return original.map(arm=>{
      const s=arm.side;
      let target=view.armTargets?.[s]||arm.palm;
      const root=project(s*2.28,-3.93,.45,yaw);
      let z=.45;
      if(arm.layer==='front') z=1.3;
      if(run) {
        const step=-Math.cos(gait+(s<0?0:Math.PI));
        // A short pendulum sweeps fore/aft in profile. Hand volume is retained.
        target=[s*3.1,-3.24-.23*Math.abs(step)*speed];
        z=.45+step*(key==='run'?1.25:.67)*speed;
      } else {
        // Front gestures reach around the body's volume, rather than being
        // projected as flat stickers when the torso rotates.
        z+=Math.max(0,3.05-Math.abs(target[0]))*.55;
      }
      let pt=project(target[0],target[1],z,yaw);
      if(key==='hug') {
        const a=window.YayaActions?.sample(key,age),squeeze=a?.reach||0;
        // Palms hold the bear from both sides. The projected shoulder stays
        // fixed; a short visible band reaches each actual grip point.
        pt=[s<0?1.25+.12*squeeze:2.80-.12*squeeze,-3.05-.09*squeeze,1];
        if(sn<0)pt[0]*=-1;
      }
      const layer=view.armTargets?.[s]?'front':arm.layer;
      const solved=R.solveArm({side:s,target:pt.slice(0,2),shoulder:root.slice(0,2),angle:arm.angle,gesture:arm.gesture,layer});
      solved.depth=root[2];
      solved.visible= Math.abs(sn)<.08 || root[2]>-.5;
      // From behind both arms sit behind the pear; from front retain gesture
      // occlusion. In profile only the near limb draws on the body surface.
      solved.foreground= Math.abs(sn)>.18 ? root[2]>.2 : cs>0 && layer==='front';
      if(key==='hug'&&cs>0)solved.foreground=true;
      return solved;
    });
  }
  function draw(x,y,u,t,state='idle',age=t,view='front',debug=false) {
    const D=window.YayaDrawing,R=window.YayaRig;
    if(!D||!R) return;
    const yaw=viewAngle(view), cs=Math.cos(yaw), sn=Math.sin(yaw), side=Math.abs(sn), front=Math.max(0,cs);
    let S=typeof state==='string'?getYayaEmotionState(state,age):state;
    const key=S.action||S.state||'idle';
    S=D.actionFace(S,key,age);
    const p=D.pose(age,S), cols=D.moodColors(S.face||S), C=D.palette,turnPose=view?.turnPose;
    if(turnPose) {
      p.dy=turnPose.bob;p.rot=turnPose.lean;p.sq=turnPose.squash;
    }
    const run=key==='run',locomotion=run||key==='walk',gait=view?.gait ?? age*TAU*(run?2.6:1.35),speed=view?.speed ?? 1;
    const a=window.YayaActions?.sample(key,age)||{nod:0,energy:0,jump:0};
    if(locomotion)p.sq=(run?.05:.015)*Math.sin(gait*2)*speed;
    const flight=run?.48*Math.pow(Math.sin(gait),2)*speed:0;
    const bob=locomotion?-flight-(run?.08:.075)*Math.abs(Math.sin(gait))*speed:p.dy||0;
    const lean=locomotion?sn*(run?.14:.025)*speed:p.rot||0;
    // Full winter-melon profile: shared volume is 86% as deep as it is wide.
    const breadth=YayaBody.breadth(yaw);
    if(!view?.hideShadow)D.flatEllipse(x+(turnPose?.bodyX||0)*u,y+.18*u,3.7*u*breadth*(1-.15*(a.energy||0)),.43*u,'rgba(48,80,100,.18)',null,0);
    const turnFeet=turnPose?.feet||[],centerDepth=turnPose?.bodyZ||0;
    const paintTurnFoot=foot=>{
      // These are world-floor coordinates. Body lean, breathing and yaw must
      // never drag a supporting sole across the ground.
      push();translate(x+foot.x*u,y+(-.24+foot.z*.11-foot.lift)*u);
      rotate(Math.sin(foot.yaw)*foot.lift*.12);
      D.flatEllipse(0,0,(1.12-.18*Math.abs(Math.sin(foot.yaw)))*u,.5*u,foot.z<centerDepth?'#D99928':cols.shade,C.ink,2.4);
      pop();
    };
    for(const foot of turnFeet.filter(f=>f.z<=centerDepth))paintTurnFoot(foot);
    push(); translate(x+(turnPose?.bodyX||0)*u,y+(bob+centerDepth*.11)*u); rotate(lean); scale(1+(p.sq||0)*.25,1-(p.sq||0)*.45);
    // A six-second turn must also finish its leaf cycle; using the independent
    // four-second leaf clock here would snap the blade at the video seam.
    const leafAge=turnPose?age*YayaLeaves.period/turnPose.duration:age;
    D.drawLeaves(u,leafAge,key,S,{yaw:turnPose?.leafYaw??yaw,gait,speed,nod:a.nod});
    const arms=makeArms(D,R,key,age,S,p,yaw,locomotion,gait,speed,view);
    // Feet are attached to the same body volume; near/far order changes with yaw.
    const feet=[-1,1].map(s=>({s,p:project(s*1.35,-.24,.1,yaw)})).sort((a,b)=>a.p[2]-b.p[2]);
    const paintFoot=foot=>{
      if(view?.seated) {
        // The same two feet hang just below the chair cushion, instead of
        // leaving a standing pair planted on the floor behind the table.
        push();translate((foot.p[0]+foot.s*.12)*u,.18*u);rotate(foot.s*.10);
        D.flatEllipse(0,0,1.04*u,.5*u,cols.shade,C.ink,2.4);pop();return;
      }
      const step=locomotion?YayaGait.foot(gait,foot.s,speed):{forward:0,lift:(foot.s<0?p.footL:p.footR)||0,angle:0};
      if(run){step.forward*=1.24;step.lift*=2;step.angle*=1.4;}
      const stride=step.forward*sn,lift=step.lift;
      push(); translate((foot.p[0]+stride)*u,((locomotion?.12:-.24)-lift)*u); rotate(step.angle*sn);
      D.flatEllipse(0,0,(1.12-.18*side)*u,.5*u,foot.p[2]<-.1?'#D99928':cols.shade,C.ink,2.4); pop();
    };
    if(!turnPose)for(const foot of feet.filter(f=>!locomotion || f.p[2]<=0)) paintFoot(foot);
    for(const arm of arms.filter(a=>!a.foreground)) D.drawRigArm(u,arm,cols);
    push(); scale(breadth,1); D.flatBody(u,cols); pop();
    if(!turnPose)for(const foot of feet.filter(f=>locomotion && f.p[2]>0)) paintFoot(foot);
    // Visibility uses each feature's surface normal: eyes disappear gradually
    // behind the contour, never popping between a two-eye and one-eye sprite.
    push();translate(0,(-4.5+.50*a.nod)*u);scale(1-.025*a.nod,1-.18*a.nod);translate(0,4.5*u);
    drawTurnedFace(D,u,S,age,yaw,cols,yaw);pop();
    if(cs>.02&&!S.sleeping) {
      const bx=2.65*sn,by=YayaBody.constants.heartY+YayaBody.surfaceArc(bx/breadth);
      push();translate(bx*u,by*u);scale(cs,1);D.flatHeart(0,0,.48*u,'#FFB07D',2);pop();
    }
    // Furniture belongs between the torso and the real foreground hands.
    // A dining table can occlude the belly without erasing the hand or
    // spawning a second arm on top of the tabletop.
    if(typeof view?.drawFurniture==='function')view.drawFurniture({u,arms,cols,yaw});
    const forearms=arms.filter(a=>a.foreground);
    for(const arm of forearms) D.drawRigArm(u,arm,cols,false,{arm:true,palm:false});
    if(typeof view?.drawProps==='function')view.drawProps({u,arms,cols,yaw});
    else if(D.drawRigProps && cs>.45) D.drawRigProps(u,key,age,arms,cols);
    if(window.YayaScenes&&key==='hug'&&cs>0)YayaScenes.drawHeld(u,key,age,arms,cols,{yaw});
    for(const arm of forearms) D.drawRigArm(u,arm,cols,false,{arm:false,palm:true});
    if(debug) {
      for(const arm of arms.filter(a=>a.foreground || cs>=0)) debugArm(D,u,arm);
      D.flatLine([[0,-7*u],[0,0]],'rgba(65,151,180,.45)',1.5);
    }
    pop();
    for(const foot of turnFeet.filter(f=>f.z>centerDepth))paintTurnFoot(foot);
    return {yaw,arms,breadth,turnPose};
  }
  function speedLines(x,y,u,age,travel) {
    if(travel.speed<.12)return;
    const D=YayaDrawing,dir=Math.sin(travel.yaw)>0?1:-1;
    for(let i=0;i<5;i++) {
      const pulse=(age*3+i*.21)%1,start=(3.8+pulse*.9)*u,length=(1.0+(i%3)*.4)*u*travel.speed;
      const yy=y-(1.5+i*.85)*u;
      D.flatLine([[x-dir*start,yy],[x-dir*(start+length),yy]],i%2?'#65B9B7':'#37988D',3.5);
    }
  }
  function perform(x,y,u,t,state='idle',age=t,debug=false) {
    const S=typeof state==='string'?getYayaEmotionState(state,age):state,key=S.action||S.state||'idle';
    const a=window.YayaActions?.sample(key,age)||{yaw:0};
    if(key==='sleep'&&window.YayaScenes)return YayaScenes.drawSleep(x,y,u,t,S,age,debug);
    if((key==='eat'||key==='drink')&&window.YayaScenes)return YayaScenes.drawMeal(x,y,u,t,S,age,debug);
    if(key==='walk'||key==='run') {
      const route=travel(age,key),size=u*.86,cx=x+route.x*530;
      if(key==='run')speedLines(cx,y,size,age,route);
      return draw(cx,y,size,t,S,age,route,debug);
    }
    const yaw=key==='hug'?1.15:['turn','spin'].includes(key)?a.yaw:0;
    const turnPose=['turn','spin'].includes(key)&&window.YayaTurns?YayaTurns.sample(key,age):undefined;
    return draw(x,y,key==='celebrate'?u*.89:u,t,S,age,{yaw,turnPose},debug);
  }
  window.YayaViews={draw,perform,travel,project,viewAngle,solveArms:makeArms,period:6};
})();
