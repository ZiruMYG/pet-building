// Yaya's 2.5D turntable. One body, one shoulder pair and one palm pair.
// Angles: 0 front, PI/2 facing right, PI back, 3PI/2 facing left.
// No raster sprites or horizontal-flip cuts are used at the turnarounds.
(() => {
  const TAU = Math.PI * 2;
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp01(x); return x*x*(3-2*x); };
  const mix = (a,b,t) => a+(b-a)*t;
  const wrap = t => ((t % 8)+8)%8;

  function travel(t) {
    const q=wrap(t);
    // Run 3 s, plant both feet and turn 1 s, then repeat back. Position and
    // velocity meet at each boundary. Gait follows distance, so planted feet
    // cannot keep cycling when the character has stopped to turn.
    let x,yaw,distance,speed,phase;
    if(q<3) { const v=q/3; x=mix(-1,1,smooth(v)); yaw=Math.PI/2; distance=2*smooth(v); speed=4*v*(1-v); phase='向右跑'; }
    else if(q<4) { x=1; yaw=mix(Math.PI/2,Math.PI*1.5,smooth(q-3)); distance=2; speed=0; phase='转身'; }
    else if(q<7) { const v=(q-4)/3; x=mix(1,-1,smooth(v)); yaw=Math.PI*1.5; distance=2+2*smooth(v); speed=4*v*(1-v); phase='向左跑'; }
    else { x=-1; yaw=mix(Math.PI*1.5,Math.PI*2.5,smooth(q-7)); distance=4; speed=0; phase='转回来'; }
    return {x,yaw,gait:distance*TAU*2,speed,phase,period:8};
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
  function drawTurnedFace(D,u,S,age,yaw,cols) {
    const c=Math.cos(yaw),s=Math.sin(yaw),C=D.palette,e=S.face||S;
    if(Math.abs(s)<.0001 && c>0) {D.flatFace(u,age,S);D.flatHeart(0,YayaBody.constants.heartY*u,.48*u,'#FFB07D',2);return;}
    const kinds=Array.isArray(e.eyes)?e.eyes:[e.eyes,e.eyes];
    for(const side of [-1,1]) {
      const visibility=smooth((c*.82-side*s*.58+.08)/.5);
      if(visibility<.005) continue;
      const eye=project(side*1.55,-5.15,1.63,yaw), w=(.57-.13*Math.abs(s))*visibility;
      eye[0]=YayaBody.fitEllipseX(eye[0],eye[1],w,.9,yaw);
      const kind=kinds[side<0?0:1];
      push();translate(eye[0]*u,eye[1]*u);
      if(['happy','laugh','relieved','closed','sleepy'].includes(kind)) {
        D.flatLine([[-w*u,.06*u],[0,(kind==='relieved'?.26:-.22)*u],[w*u,.06*u]],C.ink,2.6);
      } else if(['wide','look','curious'].includes(kind)) {
        D.flatEllipse(0,0,w*u,.88*u,C.paper,C.ink,2.3);
        D.flatEllipse(s*.1*u,.05*u,w*.47*u,.35*u,C.eye,null,0);
        D.flatEllipse(s*.1*u-.07*u,-.11*u,.08*u,.12*u,'#FFFFFF',null,0);
      } else {
        D.flatEllipse(0,0,w*u,.82*u,C.eye,C.ink,2.2);
        D.flatEllipse(-.14*visibility*u,-.28*u,.12*visibility*u,.18*u,'#FFFFFF',null,0);
      }
      pop();
      const cheek=project(side*2.28,-3.93,1.68,yaw);
      cheek[0]=YayaBody.fitEllipseX(cheek[0],cheek[1],.64*visibility,.43,yaw);
      D.flatEllipse(cheek[0]*u,cheek[1]*u,.64*visibility*u,.43*u,mixCol(cols.body,C.blush,e.blush??.22),null,0);
    }
    const mouthVisibility=smooth((c+.13)/.45);
    if(mouthVisibility>.001) {
      const mx=2.55*s*u,my=-3.58*u,mw=(.5*Math.max(.13,c))*u;
      if(['open','O','laugh'].includes(e.mouth)) D.flatEllipse(mx,my,mw,.36*mouthVisibility*u,C.ink,null,0);
      else D.flatLine([[mx-mw,my],[mx,my+.2*mouthVisibility*u],[mx+mw,my-.02*u]],C.ink,2.5);
    }
    if(c>.02) {
      const bx=2.65*s,by=YayaBody.constants.heartY+YayaBody.surfaceArc(bx/YayaBody.breadth(yaw));
      push();translate(bx*u,by*u);scale(c,1);D.flatHeart(0,0,.48*u,'#FFB07D',2);pop();
    }
  }
  function makeArms(D,R,key,age,S,p,yaw,run,gait,speed) {
    const original=R.poseArms(key,age,S,p), sn=Math.sin(yaw), cs=Math.cos(yaw);
    return original.map(arm=>{
      const s=arm.side;
      let target=arm.palm;
      const root=project(s*2.28,-3.93,.45,yaw);
      let z=.45;
      if(arm.layer==='front') z=1.3;
      if(run) {
        const step=-Math.cos(gait+(s<0?0:Math.PI));
        // A short pendulum sweeps fore/aft in profile. Hand volume is retained.
        target=[s*3.1,-3.24-.23*Math.abs(step)*speed];
        z=.45+step*.83*speed;
      } else {
        // Front gestures reach around the body's volume, rather than being
        // projected as flat stickers when the torso rotates.
        z+=Math.max(0,3.05-Math.abs(target[0]))*.55;
      }
      const pt=project(target[0],target[1],z,yaw);
      const solved=R.solveArm({side:s,target:pt.slice(0,2),shoulder:root.slice(0,2),angle:arm.angle,gesture:arm.gesture,layer:arm.layer});
      solved.depth=root[2];
      solved.visible= Math.abs(sn)<.08 || root[2]>-.5;
      // From behind both arms sit behind the pear; from front retain gesture
      // occlusion. In profile only the near limb draws on the body surface.
      solved.foreground= Math.abs(sn)>.18 ? root[2]>.2 : cs>0 && arm.layer==='front';
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
    const p=D.pose(age,S), cols=D.moodColors(S.face||S), C=D.palette;
    const run=key==='run', gait=view?.gait ?? age*TAU*2, speed=view?.speed ?? 1;
    if(run) p.sq=.025*Math.sin(gait*2)*speed;
    const bob=run?-.18*Math.abs(Math.sin(gait))*speed:p.dy||0;
    const lean=run?sn*.065*speed:p.rot||0;
    // Full winter-melon profile: shared volume is 86% as deep as it is wide.
    const breadth=YayaBody.breadth(yaw);
    D.flatEllipse(x,y+.18*u,3.7*u*breadth,.43*u,'rgba(48,80,100,.18)',null,0);
    push(); translate(x,y+bob*u); rotate(lean); scale(1+(p.sq||0)*.25,1-(p.sq||0)*.45);
    D.drawLeaves(u,age,key,S,{yaw,gait,speed});
    const arms=makeArms(D,R,key,age,S,p,yaw,run,gait,speed);
    // Feet are attached to the same body volume; near/far order changes with yaw.
    const feet=[-1,1].map(s=>({s,p:project(s*1.35,-.24,.1,yaw)})).sort((a,b)=>a.p[2]-b.p[2]);
    const paintFoot=foot=>{
      const step=run?YayaGait.foot(gait,foot.s,speed):{forward:0,lift:(foot.s<0?p.footL:p.footR)||0,angle:0};
      const stride=step.forward*sn,lift=step.lift;
      push(); translate((foot.p[0]+stride)*u,((run?.12:-.24)-lift)*u); rotate(step.angle*sn);
      D.flatEllipse(0,0,(1.12-.18*side)*u,.5*u,foot.p[2]<-.1?'#D99928':cols.shade,C.ink,2.4); pop();
    };
    for(const foot of feet.filter(f=>!run || f.p[2]<=0)) paintFoot(foot);
    for(const arm of arms.filter(a=>!a.foreground)) D.drawRigArm(u,arm,cols);
    push(); scale(breadth,1); D.flatBody(u,cols); pop();
    for(const foot of feet.filter(f=>run && f.p[2]>0)) paintFoot(foot);
    // Visibility uses each feature's surface normal: eyes disappear gradually
    // behind the contour, never popping between a two-eye and one-eye sprite.
    drawTurnedFace(D,u,S,age,yaw,cols);
    const forearms=arms.filter(a=>a.foreground);
    for(const arm of forearms) D.drawRigArm(u,arm,cols,false,{arm:true,palm:false});
    if(D.drawRigProps && cs>.45) D.drawRigProps(u,key,age,arms,cols);
    for(const arm of forearms) D.drawRigArm(u,arm,cols,false,{arm:false,palm:true});
    if(debug) {
      for(const arm of arms.filter(a=>a.foreground || cs>=0)) debugArm(D,u,arm);
      D.flatLine([[0,-7*u],[0,0]],'rgba(65,151,180,.45)',1.5);
    }
    pop();
    return {yaw,arms,breadth};
  }
  window.YayaViews={draw,travel,project,viewAngle,period:8};
})();
