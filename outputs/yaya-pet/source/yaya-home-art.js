// A small house drawn in one shared, measured x/z ground plane.  Every piece
// of furniture has a footprint: its top, feet, and contact surfaces agree.
(() => {
  'use strict';
  const C={ink:'#536966',cream:'#FFF9E9',wood:'#E9BF8C',woodTop:'#F4D8AE',woodSide:'#D8AA79',mint:'#A9D7BC',mintDark:'#77B39C',blue:'#A7D8DE',peach:'#EFAD90',yellow:'#F6D373'};
  const SCALE=80, WALL=3.8;
  let activeRoom={w:10,d:8},swapAxes=false;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const objectState=(o,room=activeRoom,state={})=>state.objects?.[room.id+':'+o.id]||{};
  const tick=state=>state.time||0;
  function project(x,z,h=0,room=activeRoom){
    if(swapAxes)[x,z]=[z,x];
    const w=room.w||10,d=room.d||8;
    return {x:960+(x-z-(w-d)/2)*.82*SCALE,y:355+(x+z)*.43*SCALE-h*SCALE};
  }
  function color(col,sw=2.2){fill(col);if(sw){stroke(C.ink);strokeWeight(sw);strokeJoin(ROUND);}else noStroke();}
  function poly(points,col,sw=2.2){color(col,sw);beginShape();for(const a of points){const p=project(a[0],a[1],a[2]||0);vertex(p.x,p.y);}endShape(CLOSE);}
  function line3(points,col=C.ink,sw=2){noFill();stroke(col);strokeWeight(sw);strokeCap(ROUND);beginShape();for(const a of points){const p=project(a[0],a[1],a[2]||0);vertex(p.x,p.y);}endShape();}
  function oval3(x,z,h,rx,rz,col,sw=0){const points=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2;points.push([x+Math.cos(a)*rx,z+Math.sin(a)*rz,h]);}poly(points,col,sw);}
  function screenOval(x,z,h,w,hh,col,sw=2){const p=project(x,z,h);color(col,sw);ellipse(p.x,p.y,w,hh);}
  function roundedPoints(x,z,w,d,h,r=.12){const pts=[];r=Math.min(r,w/2,d/2);for(const [cx,cz,start] of [[x+w-r,z+r,-Math.PI/2],[x+w-r,z+d-r,0],[x+r,z+d-r,Math.PI/2],[x+r,z+r,Math.PI]])for(let i=0;i<=7;i++){const a=start+i/7*Math.PI/2;pts.push([cx+r*Math.cos(a),cz+r*Math.sin(a),h]);}return pts;}
  function slab(x,z,w,d,bottom,top,col=C.woodTop,side=C.woodSide,r=.1,sw=2.3){
    poly([[x,z+d,bottom],[x+w,z+d,bottom],[x+w,z+d,top],[x,z+d,top]],side,sw);
    poly([[x+w,z,bottom],[x+w,z+d,bottom],[x+w,z+d,top],[x+w,z,top]],side,sw);
    poly(roundedPoints(x,z,w,d,top,r),col,sw);
  }
  function box(x,z,w,d,h,col=C.woodTop,side=C.woodSide,bottom=0){slab(x,z,w,d,bottom,h,col,side,.07);}
  function shadow(o,opacity=.07){oval3(o.x+o.w/2,o.z+o.d/2,0,o.w*.56,o.d*.56,`rgba(68,82,65,${opacity})`,0);}
  function leg(x,z,h,col=C.woodSide){box(x,z,.13,.13,h,col,col);}
  function wallP(o,a,h,inset=0){return o.wall==='x0'?[inset,a,h]:[a,inset,h];}
  function wallRect(o,a,h,w,hh,col,sw=2,inset=.03){poly([wallP(o,a,h,inset),wallP(o,a+w,h,inset),wallP(o,a+w,h+hh,inset),wallP(o,a,h+hh,inset)],col,sw);}
  function wallLine(o,a,h,a2,h2,col=C.ink,sw=2,inset=.045){line3([wallP(o,a,h,inset),wallP(o,a2,h2,inset)],col,sw);}
  function wallOffset(o){return o.wall==='x0'?o.z:o.x;}
  function wallWidth(o){return o.wall==='x0'?o.d:o.w;}
  function plaque(o,a,h,txt,w=1.30){
    wallRect(o,a,h,w,.29,C.cream,1.5,.075);const p=project(...wallP(o,a+w/2,h+.145,.082));
    const rotation=(o.wall==='x0'?-1:1)*Math.atan2(.43,.82);
    // The shared renderer is WebGL: its 2D typography pass supports local CJK
    // system fonts, whereas WebGL text requires an explicitly loaded font.
    if(typeof letter==='function'){letter(txt,p.x,p.y,12,'#506862',{font:'12px "Microsoft YaHei", sans-serif',rot:rotation,ink:false});return;}
    push();translate(p.x,p.y);rotate(rotation);noStroke();fill('#506862');textAlign(CENTER,CENTER);textSize(12);textFont('Microsoft YaHei, sans-serif');text(txt,0,0);pop();
  }

  function door(room,o,state={}){
    const w=o.width||1.45,a=o.offset-(o.offsetIsCenter===false?0:w/2),hh=o.height||2.85,wall=o.wall||'z0';
    const q={wall};
    // The darker plane is another room visible through an actual wall opening.
    wallRect(q,a,0,w,hh,'#CBDDD0',0,-.16);
    wallRect(q,a+.10,.08,w-.20,hh-.14,'#EEF1D9',0,-.13);
    poly([wallP(q,a,0,0),wallP(q,a+w,0,0),wallP(q,a+w,0,-.28),wallP(q,a,0,-.28)],'#E2CDA8',1.4);
    wallRect(q,a-.10,0,.10,hh+.10,'#E7CFA6',1.8,.07);
    wallRect(q,a+w,0,.10,hh+.10,'#E7CFA6',1.8,.07);
    wallRect(q,a-.10,hh,w+.20,.12,'#F4DFBA',1.8,.07);
    // The leaf opens into the other room, leaving the walkable threshold clear.
    const open=clamp(state.doorOpen?.[o.id]||0),theta=open*Math.PI*.46;
    const hinge=wallP(q,a+.02,0,-.035),end=wallP(q,a+.02+(w-.04)*Math.cos(theta),0,-.035-(w-.04)*Math.sin(theta));
    poly([[hinge[0],hinge[1],.04],[end[0],end[1],.04],[end[0],end[1],hh-.03],[hinge[0],hinge[1],hh-.03]],'#9CC8AC',2.2);
    line3([[hinge[0],hinge[1],.38],[end[0],end[1],.38]],'#74A68F',1.8);
    const handle=YayaHomeLayout.doorHandle(o,open);screenOval(handle.x,handle.z,handle.h,8,8,'#F4D783',1.4);
    plaque(q,a+w/2-.65,hh+.17,o.label||'通往客厅',1.30);
    oval3(...(wall==='z0'?[a+w/2,.38,0]:[.38,a+w/2,0]),w*.52,.25,'#CECEAE',0);
  }

  function wall(room,wallName,col,state){
    const len=wallName==='x0'?room.d:room.w,q={wall:wallName};
    const doors=(room.doors||[]).filter(x=>x.wall===wallName).sort((a,b)=>a.offset-b.offset);
    let a=0;
    for(const d of doors){const dw=d.width||1.45,da=d.offset-(d.offsetIsCenter===false?0:dw/2);if(da>a)wallRect(q,a,0,da-a,WALL,col,0,0);wallRect(q,da,d.height||2.85,dw,WALL-(d.height||2.85),col,0,0);a=da+dw;}
    if(a<len)wallRect(q,a,0,len-a,WALL,col,0,0);
    wallLine(q,0,WALL,len,WALL,'#A3B59E',3,0);wallLine(q,0,0,0,WALL,'#A3B59E',2.3,0);
    a=0;for(const d of doors){const dw=d.width||1.45,da=d.offset-(d.offsetIsCenter===false?0:dw/2);if(da>a)wallRect(q,a,0,da-a,.15,'#E4CFAD',1,0.012);a=da+dw;}if(a<len)wallRect(q,a,0,len-a,.15,'#E4CFAD',1,.012);
    for(const d of doors)door(room,d,state);
  }

  function drawArchitecture(room,t=0,state={}){
    activeRoom=room;push();background('#F7F6EE');ellipseMode(CENTER);rectMode(CORNER);
    noStroke();fill('rgba(77,96,79,.07)');ellipse(960,902,1330,212);
    const floor=room.palette?.floor||'#EAD5B6';
    slab(0,0,room.w,room.d,-.18,0,floor,'#D6C29F',.08,2.4);
    const wet=['ensuite','bathroom'].includes(room.id);
    if(wet){
      for(let x=0;x<room.w;x+=.85)line3([[x,0,.004],[x,room.d,.004]],'#D1DED2',1.1);
      for(let z=0;z<room.d;z+=.85)line3([[0,z,.004],[room.w,z,.004]],'#D1DED2',1.1);
    }else{
      for(let z=.72;z<room.d;z+=.72){line3([[0,z,.004],[room.w,z,.004]],'#D9C4A5',1.3);for(let x=(Math.round(z/.72)%2)*1.55;x<room.w;x+=3.1)line3([[x,z-.72,.004],[x,z,.004]],'#D9C4A5',1);}
    }
    wall(room,'x0',room.palette?.wallLeft||'#F7EACB',state);wall(room,'z0',room.palette?.wallRight||'#F1E0BD',state);
    for(const o of room.furniture||[])if(o.kind!=='ceilingLamp'&&(o.mounted||['window','ac','picture','mirror','towel'].includes(o.kind)))drawMounted(o,room,t,state);
    for(const o of room.furniture||[])if(o.kind==='rug')rug(o,room);
    pop();
  }

  function rug(o,room){
    const c=o.color||room.palette?.accent||C.mint;
    poly(roundedPoints(o.x,o.z,o.w,o.d,.018,Math.min(o.w,o.d)*.22),c,1.7);
    line3(roundedPoints(o.x+.13,o.z+.13,o.w-.26,o.d-.26,.024,.45).concat([roundedPoints(o.x+.13,o.z+.13,o.w-.26,o.d-.26,.024,.45)[0]]),'#F1F1D4',2.6);
    for(const [xx,zz] of [[.24,.22],[.76,.79]])oval3(o.x+o.w*xx,o.z+o.d*zz,.027,.17,.23,'rgba(255,252,225,.45)',0);
  }

  function drawMounted(o,room,t=0,state={}){
    const os=objectState(o,room,state),t0=tick(state);
    const a=wallOffset(o),w=wallWidth(o),h=o.elevation??(o.kind==='ac'?2.85:o.kind==='window'?1.35:1.7);
    if(o.kind==='cabinet'){
      box(o.x,o.z,o.w,o.d,h+o.h,'#F1D4A8','#D7B48D',h);
      if(o.wall==='x0')for(let q=.06;q<o.d-.1;q+=.76){
        const z1=o.z+q,z2=o.z+Math.min(q+.69,o.d-.05),open=clamp(os.open||0),front=o.x+o.w+.015,angle=open*1.05;
        poly([[front,z1,h+.07],[front,z2,h+.07],[front,z2,h+o.h-.07],[front,z1,h+o.h-.07]],'#A59E83',1.3);
        for(let j=0;j<2;j++)box(front-.02,z1+.12+j*.23,.035,.15,h+.39,'#F3E1B4','#DBCCAC',h+.10);
        const lowX=front+Math.sin(angle)*(o.h-.14),lowH=h+o.h-.07-Math.cos(angle)*(o.h-.14);
        poly([[lowX,z1,lowH],[lowX,z2,lowH],[front,z2,h+o.h-.07],[front,z1,h+o.h-.07]],'#BED3AD',1.5);screenOval(lowX+.015,(z1+z2)/2,lowH+.14,5,5,'#E8C886',1);
      }
      return;
    }
    if(o.kind==='ceilingLamp'){
      const x=o.x+o.w/2,z=o.z+o.d/2;
      oval3(x,z,3.77,.14,.14,'#D1C3A1',1.7);
      line3([[x,z,3.77],[x,z,3.25]],'#BBAA83',2.5);
      oval3(x,z,3.27,.42,.42,'#EAC77A',2);
      poly([[x-.30,z,3.61],[x+.30,z,3.61],[x+.52,z,3.23],[x-.52,z,3.23]],'#F5D990',2);
      oval3(x,z,3.23,.52,.38,'#FFF0C2',2);
      oval3(x,z,3.228,.14,.12,os.on===false?'#CCC6AC':'#FFFDF0',0);if(os.on!==false){const p=project(x,z,3.2);noStroke();fill('rgba(255,231,154,.17)');ellipse(p.x,p.y+4,92,35);}return;
    }
    if(o.kind==='window'){
      const hh=o.h||1.55;
      wallRect(o,a-.09,h-.09,w+.18,hh+.18,'#EDD0A1',2.4,.06);
      wallRect(o,a,h,w,hh,'#B6E5E9',2,.085);
      wallRect(o,a+.04,h+.04,w-.08,.33,'#AAD5B1',0,.087);
      // Round cloud marks drawn directly on the window plane.
      for(const [aa,hh2,ww] of [[a+w*.28,h+hh*.73,.5],[a+w*.69,h+hh*.47,.42]]){
        const p=project(...wallP(o,aa,hh2,.10));noStroke();fill('#F7FFFF');ellipse(p.x,p.y,ww*60,ww*22);ellipse(p.x-9,p.y+1,ww*33,ww*21);ellipse(p.x+6,p.y-7,ww*31,ww*30);
      }
      wallRect(o,a+w*.48,h,.075,hh,C.cream,1.5,.14);wallRect(o,a,h+hh*.5,w,.07,C.cream,1.5,.14);
      if(os.open>.001){const theta=clamp(os.open)*.55,hinge=a+w*.5,span=w*.48,edge=hinge+span*Math.cos(theta),depth=.15+span*Math.sin(theta);
        const pts=[wallP(o,hinge,h+.04,.15),wallP(o,edge,h+.04,depth),wallP(o,edge,h+hh-.04,depth),wallP(o,hinge,h+hh-.04,.15)];poly(pts,'rgba(196,237,235,.65)',2.7);
        line3([wallP(o,hinge,h+hh*.5,.15),wallP(o,edge,h+hh*.5,depth)],C.cream,3);
        const p=project(...wallP(o,edge-.08,h+hh*.42,depth+.01));color('#D4B477',1);ellipse(p.x,p.y,5,10);
      }
      wallRect(o,a-.14,h-.10,w+.28,.10,C.woodTop,2,.22);
      wallLine(o,a-.22,h+hh+.22,a+w+.22,h+hh+.22,'#B39470',5,.10);
      for(const side of [0,1]){const aa=a-.15+side*(w-.18);wallRect(o,aa,h+.1,.34,hh+.07,'#A4CFB3',1.5,.20);wallRect(o,aa,h+hh*.42,.34,.09,'#E9CD82',1,.23);}
      return;
    }
    if(o.kind==='ac'){
      wallRect(o,a,h,w,.47,'#FBFAE9',2,.08);wallRect(o,a+.08,h+.06,w-.16,.10,'#C6D9CE',1,.11);
      for(let j=0;j<3;j++)wallLine(o,a+.10,h+.08+j*.025,a+w-.10,h+.08+j*.025,'#91B4A7',.9,.14);
      const p=project(...wallP(o,a+w-.18,h+.32,.14));noStroke();fill(os.on?'#7AC4A0':'#B7C5B4');ellipse(p.x,p.y,5,5);
      if(os.on){for(let i=0;i<3;i++){const pp=project(...wallP(o,a+w*(.22+.27*i),h+.04,.15));const k=(t0*.7+i*.22)%1;noFill();stroke('rgba(137,191,186,'+(.40*(1-k))+')');strokeWeight(2);beginShape();for(let j=0;j<8;j++){const q=j/7;vertex(pp.x+Math.sin(q*3+i)*6,pp.y+q*(18+k*20));}endShape();}}return;
    }
    if(o.kind==='mirror'){
      wallRect(o,a-.06,h-.07,w+.12,o.h||1.15,C.woodTop,2,.06);wallRect(o,a,h,w,(o.h||1.15)-.14,'#D9EFF0',1.7,.09);
      wallLine(o,a+w*.2,h+.22,a+w*.7,h+.73,'#F5FFFF',4,.11);
      if(state.phase==='mirror'||(!state.phase&&os.used)){const p=project(...wallP(o,a+w*.53,h-.60,.115));push();beginClip();wallRect(o,a+.025,h+.025,w-.05,(o.h||1.15)-.19,'#D9EFF0',0,.12);endClip();translate(p.x,p.y);scale(.82,1);shearY((o.wall==='x0'?-1:1)*Math.atan2(.43,.82));
        if(globalThis.YayaViews&&typeof getYayaEmotionState==='function'){const face=getYayaEmotionState('idle',t0);face.pose={...face.pose,dx:0,dy:0,rot:0,sq:0};face.emote=null;YayaViews.draw(0,0,18.5,t0,face,0,{yaw:0,hideShadow:true,hideProps:true,projectedArmTargets:{'-1':[-3.3,-3.5],1:[3.3,-3.5]}});}
        else{noStroke();fill('#ECD989');ellipse(0,-15,31,36);fill('#82B897');ellipse(-5,-36,9,18);ellipse(5,-36,9,18);fill('#657D71');ellipse(-6,-18,3,4);ellipse(6,-18,3,4);}pop();}return;
    }
    if(o.kind==='towel'){
      wallLine(o,a-.1,h+.5,a+w+.1,h+.5,'#91AAA4',4,.17);
      if(!os.held){wallRect(o,a,h-.15,w,.68,os.wet?'#CE9C90':o.color||'#EBAFA0',1.6,.19);wallRect(o,a+.02,h-.07,w-.04,.08,'#F6D9BB',0,.205);}return;
    }
    if(o.kind==='picture'){
      wallRect(o,a,h,w,o.h||.9,C.woodTop,2,.07);wallRect(o,a+.06,h+.07,w-.12,(o.h||.9)-.14,C.cream,1.2,.095);
      const p=project(...wallP(o,a+w*.55,h+(o.h||.9)*.56,.12));noStroke();fill('#9AC5A8');ellipse(p.x-8,p.y-5,15,26);rotate(0);fill('#F0CE78');ellipse(p.x+11,p.y+4,16,16);if(os.used){const q=project(...wallP(o,a+w*.85,h+(o.h||.9)*.85,.14));line3([wallP(o,a+w*.80,h+(o.h||.9)*.85,.14),wallP(o,a+w*.90,h+(o.h||.9)*.85,.14)],'#E2B653',2);noStroke();fill('#E2B653');ellipse(q.x,q.y,5+Math.sin(t0*2)*1.2,5+Math.sin(t0*2)*1.2);}return;
    }
  }

  // Bed-local coordinates: s runs from the wall/headboard toward the foot;
  // q runs across its width. This supports both wall orientations identically.
  function bedPoint(o,s,q,h){return o.facing==='+z'?[o.x+q,o.z+s,h]:[o.x+s,o.z+q,h];}
  function bedSize(o){return o.facing==='+z'?{length:o.d,width:o.w}:{length:o.w,width:o.d};}
  function bedPoly(o,points,col,sw=2){poly(points.map(p=>bedPoint(o,...p)),col,sw);}
  function bedTop(o,s,q,l,w,h,col,sw=2,r=.1){const points=roundedPoints(s,q,l,w,h,r);bedPoly(o,points,col,sw);}
  function bed(o,state){
    const {length:L,width:W}=bedSize(o),h=o.h||.65;
    shadow(o,.09);
    for(const [s,q] of [[.22,.16],[L-.24,.16],[.22,W-.28],[L-.24,W-.28]]){const p=bedPoint(o,s,q,0);leg(p[0],p[1],h-.12);}
    slab(o.x,o.z,o.w,o.d,h-.28,h-.13,'#EBCBA0','#D5A97D',.10,2.2);
    slab(o.x+.04,o.z+.04,o.w-.08,o.d-.08,h-.13,h,'#FFF6DE','#E4E7D0',.13,2);
    // The headboard touches the wall; the warm inset is a padded arch panel.
    bedPoly(o,[[0,.01,.12],[0,W-.01,.12],[0,W-.01,h+.65],[0,.01,h+.65]],'#DDB582',2.7);
    bedPoly(o,[[.018,.18,h-.10],[.018,W-.18,h-.10],[.018,W-.18,h+.43],[.018,.18,h+.43]],'#AFD1AB',1.8);
    bedTop(o,.20,.22,.88,W-.44,h+.075,'#FFF8E5',2,.19);
    bedTop(o,.28,.30,.73,W-.60,h+.088,'#FFFDF0',0,.18);
    const occupied=state?.inBed&&(!state.bedId||state.bedId===o.id);
    if(!occupied)drawBedCover(o,activeRoom,1,state);
  }
  function drawBedCover(o,room=activeRoom,cover=1,state={}){
    activeRoom=room;push();const {length:L,width:W}=bedSize(o),h=(o.h||.65)+.09;
    // The pet has no narrow human neck. Its eyes belong to the upper half of
    // the round body, so a occupied quilt stops farther down the mattress.
    const headEdge=2.20;
    const start=(L-.54)*(1-clamp(cover))+headEdge*clamp(cover),end=L-.07;
    const guest=room.id==='guestroom';
    bedTop(o,start,.045,end-start,W-.09,h,guest?'#AAC7E4':'#90C6B6',2.2,.10);
    // Gentle stuffed volume across the near edge; it follows the mattress.
    bedPoly(o,[[start,W-.035,h],[end,W-.035,h],[end,W-.035,h-.28],[start,W-.035,h-.22]],guest?'#92B1D1':'#76B09F',2);
    bedTop(o,start,.045,.20,W-.09,h+.014,guest?'#D5E5ED':'#C6E4C9',1.4,.03);
    for(let s=start+.48;s<end-.1;s+=.53)for(let q=.38;q<W-.16;q+=.68){const p=bedPoint(o,s,q,h+.02);oval3(p[0],p[1],p[2],.055,.085,'#DAEDD0',0);}
    pop();
  }

  function cabinet(o,room,open=0,hideHandles=false){
    const h=o.h||1.05,col=o.color||room.palette?.accent||C.mint;shadow(o);
    for(const xx of [.13,o.w-.23])for(const zz of [.10,o.d-.20])leg(o.x+xx,o.z+zz,.17);
    box(o.x,o.z,o.w,o.d,h-.065,C.woodTop,'#DEBB91',.15);
    const front=o.wall==='z0'?'z':'x';
    if(front==='x'){
      for(const q of [0,.5])poly([[o.x+o.w+.01,o.z+.06+o.d*q,.24],[o.x+o.w+.01,o.z+o.d*(q+.5)-.05,.24],[o.x+o.w+.01,o.z+o.d*(q+.5)-.05,h-.12],[o.x+o.w+.01,o.z+.06+o.d*q,h-.12]],open?'#D4C7A9':col,1.6);
      if(!open&&!hideHandles)for(const zz of [.25,.75])screenOval(o.x+o.w+.025,o.z+o.d*zz,h*.55,7,7,'#F8E0A5',1.2);
    }else{
      for(const q of [0,.5])poly([[o.x+.06+o.w*q,o.z+o.d+.01,.24],[o.x+o.w*(q+.5)-.05,o.z+o.d+.01,.24],[o.x+o.w*(q+.5)-.05,o.z+o.d+.01,h-.12],[o.x+.06+o.w*q,o.z+o.d+.01,h-.12]],col,1.6);
      if(!hideHandles)for(const xx of [.25,.75])screenOval(o.x+o.w*xx,o.z+o.d+.025,h*.55,7,7,'#F8E0A5',1.2);
    }
    slab(o.x-.04,o.z-.04,o.w+.08,o.d+.08,h-.065,h,C.woodTop,C.woodSide,.07,1.9);
  }
  // One shallow drawer actually translates out of its cabinet. The front
  // remains attached to the drawer's bottom and side walls throughout travel.
  function drawerCabinet(o,room,state={}){
    cabinet(o,room,0,true);const os=objectState(o,room,state),open=clamp(os.open||0),h=o.h||1.05,front=o.wall==='z0'?'z':'x',span=front==='x'?o.d:o.w,depth=.34*open,low=.24,high=h-.14;
    if(front==='x'){
      const x=o.x+o.w+.025,z=o.z+.07,end=z+span-.14;
      poly([[x,z,low],[x,end,low],[x,end,high],[x,z,high]],'#9F9879',1.3);
      slab(x,z,depth+.035,span-.14,low+.01,low+.065,'#D7C49B','#B79B76',.01,1);
      for(const zz of [z,end])poly([[x,zz,low],[x+depth,zz,low],[x+depth,zz,high],[x,zz,high]],'#D4B48B',1.3);
      poly([[x+depth,z,low],[x+depth,end,low],[x+depth,end,high],[x+depth,z,high]],o.color||room.palette?.accent||C.mint,1.8);screenOval(x+depth+.015,(z+end)/2,(high+low)/2,7,7,'#F8E0A5',1.2);
    }else{
      const z=o.z+o.d+.025,x=o.x+.07,end=x+span-.14;
      poly([[x,z,low],[end,z,low],[end,z,high],[x,z,high]],'#9F9879',1.3);
      slab(x,z,span-.14,depth+.035,low+.01,low+.065,'#D7C49B','#B79B76',.01,1);
      for(const xx of [x,end])poly([[xx,z,low],[xx,z+depth,low],[xx,z+depth,high],[xx,z,high]],'#D4B48B',1.3);
      poly([[x,z+depth,low],[end,z+depth,low],[end,z+depth,high],[x,z+depth,high]],o.color||room.palette?.accent||C.mint,1.8);screenOval((x+end)/2,z+depth+.015,(high+low)/2,7,7,'#F8E0A5',1.2);
    }
  }
  function objectHandle(o,amount=0){
    amount=clamp(amount);const front=o.wall==='x0'?'x':'z';
    if(o.kind==='wardrobe')return wardrobeHandle(o,amount,-1);
    if(o.kind==='bedside'||o.kind==='bookshelf')return front==='x'?{x:o.x+o.w+.04+.34*amount,z:o.z+o.d/2,h:(.24+o.h-.14)/2}:{x:o.x+o.w/2,z:o.z+o.d+.04+.34*amount,h:(.24+o.h-.14)/2};
    if(o.kind==='fridge'){const angle=amount*1.05,span=front==='x'?o.d:o.w,leaf=(span-.05)*.87,hinge=(front==='x'?o.z+o.d:o.x+o.w)-.025,along=hinge-leaf*Math.cos(angle),out=(front==='x'?o.x+o.w:o.z+o.d)+.025+leaf*Math.sin(angle);return front==='x'?{x:out,z:along,h:o.h*.465}:{x:along,z:out,h:o.h*.465};}
    return {x:o.x+o.w/2,z:o.z+o.d/2,h:(o.elevation||0)+(o.h||.8)*.7};
  }
  function wardrobeDoorPoint(o,amount,side,t=1){
    const alongX=o.wall!=='x0',span=alongX?o.w:o.d,leaf=span/2-.06,angle=clamp(amount)*1.13;
    const hinge=(alongX?o.x:o.z)+(side<0?.04:span-.04),along=hinge-side*Math.cos(angle)*leaf*t;
    const front=(alongX?o.z+o.d:o.x+o.w)+.06+Math.sin(angle)*leaf*t;
    return alongX?{x:along,z:front}:{x:front,z:along};
  }
  function wardrobeHandle(o,amount=0,side=-1){
    const leaf=(o.wall==='x0'?o.d:o.w)/2-.06;
    return {...wardrobeDoorPoint(o,amount,side,1-.13/leaf),h:1.25};
  }
  function wardrobe(o,room,state={}){
    const amount=state.openFurniture?.id===o.id?clamp(state.openFurniture.amount):clamp(objectState(o,room,state).open||0);
    cabinet(o,room,amount,true);const x=o.x+o.w,z=o.z+o.d,h=o.h||2.9;
    if(amount&&o.wall==='x0'){
      line3([[x+.04,o.z+.13,h*.75],[x+.04,o.z+o.d-.13,h*.75]],'#A38E70',2.5);
      for(const zz of [.35,.70,1.10]){const z0=o.z+Math.min(zz,o.d-.2);poly([[x+.05,z0,h*.70],[x+.05,z0+.3,h*.70],[x+.05,z0+.36,h*.41],[x+.05,z0-.05,h*.41]],zz<.6?'#A7C1B8':'#ECC39B',1.2);}
    }
    for(const side of [-1,1]){
      const opened=side===(state.openFurniture?.side??-1)?amount:0;
      const a=wardrobeDoorPoint(o,opened,side,0),b=wardrobeDoorPoint(o,opened,side,1),handle=wardrobeHandle(o,opened,side);
      poly([[a.x,a.z,.24],[b.x,b.z,.24],[b.x,b.z,h-.12],[a.x,a.z,h-.12]],o.color||room.palette?.accent||C.mint,2);
      screenOval(handle.x,handle.z,handle.h,7,7,'#F8E0A5',1.2);
    }
    // Decorative round-bottom pennant fixed to the front, not another prop.
    const badge=wardrobeDoorPoint(o,amount,-1,.43),p=project(badge.x,badge.z,h*.77);
    noStroke();fill('#F3D999');ellipse(p.x,p.y,23,26);fill('#94BA91');ellipse(p.x+2,p.y-5,9,15);
  }
  function table(o,room,state={}){
    const h=o.h||1.12;shadow(o,.06);
    for(const xx of [.14,o.w-.27])for(const zz of [.13,o.d-.26])leg(o.x+xx,o.z+zz,h-.10);
    slab(o.x,o.z,o.w,o.d,h-.12,h,o.color||C.woodTop,C.woodSide,.11,2.2);
    if(o.kind==='desk'){
      const pad={x:o.x+o.w*.25,z:o.z+o.d*.25,w:o.w*.53,d:o.d*.77};poly(roundedPoints(pad.x,pad.z,pad.w,pad.d,h+.015,.04),'#E5EDCD',1);
      book({x:o.x+o.w*.40,z:o.z+o.d*.38,w:.42,d:.56,h:h+.03},0);
      pencilPot(o.x+.22,o.z+o.d-.25,h);
      const os=objectState(o,room,state),progress=clamp(os.amount||0);if(os.used&&progress>0){
        const x=o.x+1.32,z=o.z+o.d-.22,pts=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;pts.push([x+Math.sin(a)*.18,z+Math.cos(a)*.10,h+.021]);}
        const n=Math.max(2,Math.round(progress*pts.length));line3(pts.slice(0,n),'#78A98B',2.1);if(progress>.6)line3([[x-.16,z,h+.022],[x+.14,z,h+.022]],'#78A98B',1.6);
      }

    }
  }
  function chair(o,room){
    const h=o.h||.53,accent=o.color||room.palette?.accent||C.mint;
    shadow(o,.06);for(const xx of [.07,o.w-.18])for(const zz of [.07,o.d-.18])leg(o.x+xx,o.z+zz,h);
    slab(o.x,o.z,o.w,o.d,h-.08,h,accent,'#8FAF98',.07,1.8);
    if(o.facing==='+x'||o.facing==='-x'){const xx=o.x+(o.facing==='-x'?o.w:0);poly([[xx,o.z,h],[xx,o.z+o.d,h],[xx,o.z+o.d,h+.62],[xx,o.z,h+.62]],accent,2);}
    else {const zz=o.z+(o.facing==='-z'?o.d:0);poly([[o.x,zz,h],[o.x+o.w,zz,h],[o.x+o.w,zz,h+.62],[o.x,zz,h+.62]],accent,2);}
  }
  function pencilPot(x,z,h){
    box(x-.09,z-.09,.18,.18,h+.25,'#EAB999','#D3A383',h);
    for(const [xx,col] of [[-.06,'#73AFA6'],[.02,'#E4B86A'],[.07,'#CC9D8D']])line3([[x+xx,z,h+.15],[x+xx-.04,z,h+.43]],col,3);
  }
  function plant(o,room,state={}){
    const os=objectState(o,room,state),t=tick(state),sway=(os.water||os.wet)?Math.sin(t*2)*.07:0;
    const base=o.elevation||0,h=o.h||.74,x=o.x+o.w/2,z=o.z+o.d/2,r=Math.min(o.w,o.d)*.44;
    slab(x-r*.7,z-r*.7,r*1.4,r*1.4,base,base+h*.43,'#EDC19C','#DCAA88',.07,1.7);
    oval3(x,z,base+h*.43,r*.77,r*.77,os.wet||os.water?'#8B8766':'#B9AB80',1.3);
    line3([[x,z,base+h*.41],[x,z,base+h]],'#81A779',2.3);
    for(const [xx,zz,hh,ww,aa] of [[-.12,0,.73,.34,-.5],[.14,0,.86,.30,.5],[0,.09,1,.26,.1]]){
      const p=project(x+xx,z+zz,base+h*hh);push();translate(p.x,p.y);rotate(aa+sway);color('#81B692',1.3);ellipse(0,0,ww*SCALE,h*.42*SCALE);pop();
    }
  }
  function lamp(o,room,state){
    const os=objectState(o,room,state),on=os.on??state?.lampOn??true;
    const x=o.x+o.w/2,z=o.z+o.d/2,base=o.elevation||0,h=o.h||.64;
    oval3(x,z,base+.04,.18,.18,'#D6AE79',1.7);line3([[x,z,base+.04],[x,z,base+h-.16]],'#A68E67',4);
    const p=project(x,z,base+h-.20);color(!on?'#D2CCA3':'#F6DC98',2);beginShape();vertex(p.x-17,p.y-21);vertex(p.x+17,p.y-21);vertex(p.x+27,p.y+11);vertex(p.x-27,p.y+11);endShape(CLOSE);color('#FFF0BC',1.6);ellipse(p.x,p.y+10,53,15);
    screenOval(x+.12,z,base+.10,7,7,!on?'#B2BDA0':'#FFE8A3',1.4);
  }
  function book(o,open=0){
    const x=o.x,z=o.z,w=o.w||.52,d=o.d||.62,h=o.h||.04;
    slab(x,z,w,d,h,h+.055,'#EAAB84','#C9866D',.03,1.6);
    poly(roundedPoints(x+.045,z+.035,w-.09,d-.07,h+.065,.025),'#FFF4D7',1);
    line3([[x+w*.5,z+.045,h+.07],[x+w*.5,z+d-.045,h+.07]],'#D1BD91',1.2);
    oval3(x+w*.7,z+d*.43,h+.072,w*.12,d*.14,'#9DBF9B',0);
  }
  function teddy(o){
    const x=o.x+o.w/2,z=o.z+o.d/2,h=o.elevation||0,s=(o.w||.6)*SCALE,p=project(x,z,h);
    push();translate(p.x,p.y);color('#C69B75',1.8);ellipse(-s*.21,-s*.87,s*.25,s*.27);ellipse(s*.21,-s*.87,s*.25,s*.27);ellipse(0,-s*.4,s*.59,s*.68);ellipse(0,-s*.75,s*.62,s*.57);color('#E7C49C',1.4);ellipse(0,-s*.33,s*.36,s*.4);ellipse(0,-s*.67,s*.3,s*.21);color('#C69B75',1.6);ellipse(-s*.3,-s*.38,s*.23,s*.34);ellipse(s*.3,-s*.38,s*.23,s*.34);ellipse(-s*.19,-s*.065,s*.27,s*.19);ellipse(s*.19,-s*.065,s*.27,s*.19);noStroke();fill('#584A3D');ellipse(-s*.13,-s*.77,s*.055,s*.07);ellipse(s*.13,-s*.77,s*.055,s*.07);ellipse(0,-s*.69,s*.09,s*.055);pop();
  }
  function bookshelf(o,room,state){
    drawerCabinet(o,room,state);const h=o.h||.95;
    const front=o.wall==='x0'?'x':'z';
    const cols=['#E5AD8D','#91BBC0','#E6C77E','#AAC79D'];
    for(let i=0;i<4;i++){
      const a=.13+i*.19;if(front==='x')box(o.x+o.w-.18,o.z+a,.19,.14,h+.35-(i%2)*.08,cols[i],cols[i],h+.005);
      else box(o.x+a,o.z+o.d-.20,.14,.19,h+.35-(i%2)*.08,cols[i],cols[i],h+.005);
    }
    // Interactive book and teddy are drawn by the controller from real hand
    // and surface anchors. These four upright books are fixed decoration.
  }
  function basket(o,room,state={}){
    const os=objectState(o,room,state);
    shadow(o,.06);const h=o.h||.72;
    slab(o.x+.07,o.z+.07,o.w-.14,o.d-.14,.03,h,'#E3BF94','#CCA779',.12,2);
    poly(roundedPoints(o.x,o.z,o.w,o.d,h,.14),'#E5C79C',2);poly(roundedPoints(o.x+.10,o.z+.10,o.w-.20,o.d-.20,h+.015,.10),'#BDA581',1.3);
    for(let yy=.17;yy<h;yy+=.16){line3([[o.x+.08,o.z+o.d-.065,yy],[o.x+o.w-.08,o.z+o.d-.065,yy]],'#B39268',1.2);line3([[o.x+o.w-.065,o.z+.08,yy],[o.x+o.w-.065,o.z+o.d-.08,yy]],'#B39268',1.2);}
    for(let a=.22;a<o.w-.1;a+=.21)line3([[o.x+a,o.z+o.d-.06,.07],[o.x+a,o.z+o.d-.06,h-.04]],'#EDCEA5',1.5);
    const ball=state.roomItems?.[room.id+':basket-ball'];if(!os.held&&ball&&globalThis.YayaHomeEffects){YayaHomeEffects.drawSurfaceItem(ball,room,state);}else if(!os.held){const p=project(o.x+o.w*.56,o.z+o.d*.62,h-.10);color('#A5C8E9',1.6);ellipse(p.x,p.y-18.24,43.32,43.32);noFill();stroke('#F8DEB2');strokeWeight(3);arc(p.x,p.y-18.24,23.94,41.95,-Math.PI/2,Math.PI/2);line(p.x-20.75,p.y-18.24,p.x+20.75,p.y-18.24);}
  }
  function sofa(o,room){
    shadow(o,.09);for(const xx of [.20,o.w-.3])for(const zz of [.15,o.d-.25])leg(o.x+xx,o.z+zz,.2);
    box(o.x,o.z,o.w,o.d,.52,'#B9CFAB','#97B491',.18);
    box(o.x,o.z,o.w,.27,1.17,'#C4D9B6','#9BB58F',.3);
    box(o.x,o.z,.27,o.d,.82,'#ACCAA5','#90B08C',.3);box(o.x+o.w-.27,o.z,.27,o.d,.82,'#ACCAA5','#90B08C',.3);
    for(let i=0;i<2;i++)slab(o.x+.31+i*(o.w-.62)/2,o.z+.31,(o.w-.70)/2,o.d-.40,.50,.64,'#D5E2BD','#B0C79F',.12,1.7);
    slab(o.x+.4,o.z+.34,.5,.48,.64,.78,'#F0CBA1','#D7B389',.11,1.5);
  }
  function tv(o,room){
    cabinet({...o,h:.64},room);const x=o.x+.15,z=o.z+.10,w=o.w-.3;
    poly([[x,z,.81],[x+w,z,.81],[x+w,z,1.91],[x,z,1.91]],'#657C74',2.4);
    poly([[x+.07,z+.02,.89],[x+w-.07,z+.02,.89],[x+w-.07,z+.02,1.83],[x+.07,z+.02,1.83]],'#BADACF',1.3);
    poly([[x+.12,z+.025,.94],[x+w-.12,z+.025,.94],[x+w-.12,z+.025,1.20],[x+w*.58,z+.025,1.55]],'#99C2A6',0);
    line3([[x+w*.34,z,.70],[x+w*.43,z, .81]],'#60786F',4);line3([[x+w*.68,z,.70],[x+w*.61,z,.81]],'#60786F',4);
  }
  function counter(o,room,state={}){cabinet(o,room);slab(o.x-.05,o.z-.05,o.w+.10,o.d+.10,(o.h||1.12)-.05,o.h||1.12,'#F6F1DE','#DCDCC3',.07,2);
    const os=objectState(o,room,state);if(o.kind==='counter'){const h=o.h+.02,x=o.x+o.w*.76,z=o.z+o.d*.54,k=clamp(os.tidy||0);slab(x-.35,z-.33,.7,.66,h,h+.035,'#DFC496','#BD9C77',.06,1.4);for(const [i,dx,dz,c]of [[0,-.12,-.06,'#DC9F83'],[1,.11,.05,'#EAC85E'],[2,.09,-.13,'#A5C18D']]){const a=dx*(1-k)+(i-1)*.17*k,b=dz*(1-k);screenOval(x+a,z+b,h+.11,13,14,c,1.1);line3([[x+a,z+b,h+.17],[x+a+.03,z+b,h+.22]],'#78926F',1.6);}}
  }
  function sink(o,room,state={}){
    counter(o,room);const h=(o.h||1.12)+.012,x=o.x+o.w/2,z=o.z+o.d/2;
    poly(roundedPoints(x-o.w*.31,z-o.d*.3,o.w*.62,o.d*.6,h,.13),'#9BBAB7',1.8);poly(roundedPoints(x-o.w*.24,z-o.d*.23,o.w*.48,o.d*.46,h+.002,.12),'#D5E8DF',1.1);
    const spout=o.spout||{x,z,h:h+.24};line3([[x,z-o.d*.28,h],[x,z-o.d*.28,spout.h+.14],[spout.x,spout.z,spout.h+.14],[spout.x,spout.z,spout.h]],'#82A39F',5);
    const water=objectState(o,room,state).water;if(water){const end=o.grip||{x:spout.x,z:spout.z,h:h+.02};line3([[spout.x,spout.z,spout.h],[end.x,end.z,end.h]],'rgba(111,193,206,.75)',4);line3([[spout.x,spout.z,spout.h],[end.x,end.z,end.h]],'#DEFAF4',1.4);}

  }
  function stove(o,room,state={}){
    counter(o,room);const h=(o.h||1.12)+.012;
    poly(roundedPoints(o.x+.08,o.z+.08,o.w-.16,o.d-.16,h,.045),'#C6D4C7',1.7);
    for(const [a,b] of [[.3,.3],[.72,.7]]){oval3(o.x+o.w*a,o.z+o.d*b,h+.01,.21,.21,'#769488',1.3);oval3(o.x+o.w*a,o.z+o.d*b,h+.015,.12,.12,'#B8CEBC',1);}
    const os=objectState(o,room,state),x=o.x+o.w*.68,z=o.z+o.d*.67;
    slab(x-.29,z-.28,.58,.56,h+.03,h+.34,'#DCA682','#BC8969',.16,1.8);oval3(x,z,h+.345,.29,.28,'#EFC997',1.6);oval3(x,z,h+.35,.23,.22,'#D8B777',0);
    for(const sign of [-1,1])line3([[x+sign*.29,z,h+.23],[x+sign*.42,z,h+.23]],'#9B8B70',4);
    for(let i=0;i<3;i++)oval3(x+(i-1)*.12,z+Math.sin(i*2)*.08,h+.354,.035,.045,i%2?'#8FBC8C':'#E8A376',0);
    if(os.used||os.on){for(let i=0;i<2;i++){const p=project(x+(i-.5)*.2,z,h+.46);noFill();stroke('rgba(224,228,203,.7)');strokeWeight(2);beginShape();for(let j=0;j<9;j++){const q=j/8;vertex(p.x+Math.sin(q*5+tick(state)*2+i)*3,p.y-q*27);}endShape();}}

  }
  function fridge(o,room,state={}){
    const os=objectState(o,room,state),open=clamp(os.open||0),h=o.h||2.35,z=o.z+o.d+.025;
    box(o.x,o.z,o.w,o.d,h,'#F6F7E7','#DCE4CC');
    poly([[o.x+.07,z,.10],[o.x+o.w-.07,z,.10],[o.x+o.w-.07,z,h-.07],[o.x+.07,z,h-.07]],'#C2D1BB',1.7);
    for(const hh of [.48,.92,1.38]){line3([[o.x+.12,z+.01,hh],[o.x+o.w-.12,z+.01,hh]],'#F2F3DF',4);for(let j=0;j<2;j++)box(o.x+.25+j*.48,z-.035,.23,.05,hh+.26,j?'#EBCDA0':'#C5DBAA','#B6C59F',hh+.03);}
    const angle=open*1.05,hinge=o.x+o.w-.025,x=hinge-(o.w-.05)*Math.cos(angle),edgeZ=z+(o.w-.05)*Math.sin(angle);
    poly([[hinge,z,.025],[x,edgeZ,.025],[x,edgeZ,h-.025],[hinge,z,h-.025]],'#F6F7E7',2.2);
    const ax=(q)=>hinge+(x-hinge)*q,az=q=>z+(edgeZ-z)*q;
    line3([[ax(.02),az(.02),h*.64],[ax(.98),az(.98),h*.64]],'#ADBEAB',2);
    for(const hh of [.38,.76])line3([[ax(.87),az(.87),h*hh],[ax(.87),az(.87),h*(hh+.13)]],'#8FA99A',4);
    const p=project(ax(.3),az(.3)+.015,h*.8);noStroke();fill('#E9C789');ellipse(p.x,p.y,14,18);fill('#8FB294');ellipse(p.x+3,p.y-6,7,10);
  }
  function toilet(o,state={}){
    const x=o.x+o.w/2,z=o.z+o.d*.64;shadow(o,.06);
    box(o.x+.08,o.z+.06,o.w-.16,o.d*.28,.95,'#FBFCF0','#DBE4D4');
    slab(x-o.w*.29,z-o.d*.23,o.w*.58,o.d*.42,.03,.40,'#F5F8EA','#CCDCD1',.18,1.8);
    oval3(x,z,.50,o.w*.48,o.d*.38,'#FDFDF2',2);oval3(x,z,.51,o.w*.31,o.d*.25,'#C5DFDA',1.6);
    oval3(x,z,.512,o.w*.2,o.d*.16,'#E7F3E9',0);if(objectState(o,activeRoom,state).water){const k=(tick(state)*1.4)%1;oval3(x,z,.516,o.w*(.10+k*.13),o.d*(.09+k*.12),'rgba(169,219,219,.5)',1);}screenOval(o.x+o.w*.78,o.z+.12,.89,10,6,objectState(o,activeRoom,state).water?'#8DCFBB':'#B1C8BD',1);if(objectState(o,activeRoom,state).water){const p=project(o.x+o.w*.78,o.z+.12,.89);noFill();stroke('#A9D8C2');strokeWeight(1.5);ellipse(p.x,p.y,16,11);}
  }
  function shower(o,state={}){
    slab(o.x,o.z,o.w,o.d,0,.10,'#E7EFDF','#B6CFC5',.10,2);
    oval3(o.x+o.w*.7,o.z+o.d*.55,.112,.09,.09,'#A1BBB1',1);
    const wall=o.wall||'x0';
    const p=wall==='x0'?[o.x+.06,o.z+o.d*.45]:[o.x+o.w*.45,o.z+.06];
    line3([[p[0],p[1],.4],[p[0],p[1],2.55]],'#91ADA5',4);line3([[p[0],p[1],2.55],[p[0]+.42,p[1]+.12,2.55]],'#91ADA5',4);oval3(p[0]+.42,p[1]+.12,2.53,.23,.23,'#C6DAD0',1.6);
    // Half-open glass leaves the entry and the pet visible.
    poly([[o.x+o.w,o.z, .10],[o.x+o.w,o.z+o.d*.55,.10],[o.x+o.w,o.z+o.d*.55,2.55],[o.x+o.w,o.z,2.55]],'rgba(194,229,222,.33)',2);
    line3([[o.x+o.w,o.z,2.55],[o.x+o.w,o.z+o.d,2.55],[o.x+.10,o.z+o.d,2.55]],'#A8C8B9',3);
    line3([[o.x+o.w,o.z+o.d,0],[o.x+o.w,o.z+o.d,2.55]],'#A8C8B9',2.3);screenOval(o.x+o.w+.02,o.z+o.d,.94,8,12,objectState(o,activeRoom,state).privacy?'#9FD4C4':'#DFE9CF',1);
    for(let i=0;i<4;i++)line3([[o.x+o.w,o.z+.08+i*.13,2.55],[o.x+o.w,o.z+.08+i*.13,.18]],'#D9E4CE',7);
  }

  function drawObject(o,room=activeRoom,state={}){
    activeRoom=room;push();ellipseMode(CENTER);rectMode(CORNER);
    const needsSwap=o.facing==='+x'&&['sofa','tv','fridge','toilet'].includes(o.kind);
    if(needsSwap){swapAxes=true;o={...o,x:o.z,z:o.x,w:o.d,d:o.w};}
    switch(o.kind||o.type){
      case 'bed':bed(o,state);break;
      case 'wardrobe':wardrobe(o,room,state);break;
      case 'bedside':drawerCabinet(o,room,state);break;
      case 'cabinet':cabinet(o,room);break;
      case 'basket':basket(o,room,state);break;
      case 'bookshelf':bookshelf(o,room,state);break;
      case 'desk':case 'diningTable':case 'coffeeTable':table(o,room,state);break;
      case 'chair':chair(o,room);break;
      case 'plant':plant(o,room,state);break;
      case 'lamp':lamp(o,room,state);break;
      case 'sofa':sofa(o,room);break;
      case 'tv':tv(o,room);break;
      case 'counter':counter(o,room,state);break;
      case 'sink':sink(o,room,state);break;
      case 'stove':stove(o,room,state);break;
      case 'fridge':fridge(o,room,state);break;
      case 'toilet':toilet(o,state);break;
      case 'shower':shower(o,state);break;
      case 'book':book(o,state.bookOpen||0);break;
      case 'teddy':teddy(o);break;
    }
    swapAxes=false;pop();
  }
  function objectDepth(o){return o.depth??(o.x+o.z+(o.w||0)/2+(o.d||0)/2);}
  function drawFront(room,state={}){
    activeRoom=room;push();
    // Ceiling fixtures are in front of furniture at the back wall. Keeping
    // them out of the wall layer avoids cutting their cords behind a wardrobe.
    for(const o of room.furniture||[])if(o.kind==='ceilingLamp')drawMounted(o,room,0,state);
    if(state.lampOn===false&&room.id==='bedroom'){noStroke();fill('rgba(56,74,98,.035)');rect(0,0,1920,1080);}
    pop();
  }
  globalThis.YayaHomeArt={project,drawArchitecture,drawObject,drawFront,drawBedCover,objectDepth,bedPoint,bedSize,wardrobeHandle,objectHandle,objectState,scale:SCALE,palette:C,drawBook:book,drawTeddy:teddy};
})();
