// Small, local effects complete a physical interaction. Furniture owns world
// effects; the solved wrist owns held props. No extra arms are drawn here.
(() => {
  'use strict';
  const PI=Math.PI,clamp=x=>Math.max(0,Math.min(1,x));
  const os=(r,o,s)=>s.objects?.[r.id+':'+o.id]||{};
  const project=(r,a)=>YayaHomeArt.project(a[0],a[1],a[2]||0,r);
  function poly(r,points,col,sw=1.8){fill(col);if(sw){stroke('#637C72');strokeWeight(sw);strokeJoin(ROUND);}else noStroke();beginShape();for(const a of points){const p=project(r,a);vertex(p.x,p.y);}endShape(CLOSE);}
  function line3(r,points,col,sw=2){noFill();stroke(col);strokeWeight(sw);strokeCap(ROUND);beginShape();for(const a of points){const p=project(r,a);vertex(p.x,p.y);}endShape();}
  function drawWorld(room,s,t=s.time||0){
    // Low switches are reachable control points for ceiling fixtures. Their
    // height is fixed, irrespective of the location of the ceiling object.
    for(const o of room.furniture){const state=os(room,o,s);if(!o.switch)continue;const q=o.switch,wall=q.wall||o.wall||'z0',width=.16,bottom=q.h||.9;
      const a=wall==='x0'?[q.x||.07,q.z-.08,bottom-.09]:[q.x-.08,q.z||.07,bottom-.09];
      poly(room,wall==='x0'?[[a[0],a[1],a[2]],[a[0],a[1]+width,a[2]],[a[0],a[1]+width,a[2]+.18],[a[0],a[1],a[2]+.18]]:[[a[0],a[1],a[2]],[a[0]+width,a[1],a[2]],[a[0]+width,a[1],a[2]+.18],[a[0],a[1],a[2]+.18]],'#EEE8CD',1.2);
      const p=project(room,[q.x,q.z,bottom]);noStroke();fill(state.on?'#86B596':'#B8BCA5');ellipse(p.x,p.y,4,6);
    }
  }
  function drawHeld(u,s,arms,colors){
    const obj=s.heldObject;if(!obj)return;const d=YayaDrawing,side=obj.hand??obj.side??1;
    let point=arms.find(a=>a.side===side)?.palm||arms[0]?.palm;if(!point)return;
    if(side==='both'||obj.twoHands)point=[(arms[0].palm[0]+arms[1].palm[0])/2,(arms[0].palm[1]+arms[1].palm[1])/2];
    const x=point[0]*u+(obj.gripOffset?.[0]||0)*u,y=point[1]*u+(obj.gripOffset?.[1]||0)*u;push();translate(x,y);rotate(obj.angle||0);
    const E=(x,y,rx,ry,c,stroke='#526E67',sw=1.5)=>d.flatEllipse(x*u,y*u,rx*u,ry*u,c,stroke,sw),P=(pts,c,sw=1.5)=>d.flatPoly(pts.map(p=>p.map(n=>n*u)),c,'#526E67',sw),L=(pts,c,sw=1.8)=>d.flatLine(pts.map(p=>p.map(n=>n*u)),c,sw);
    switch(obj.kind){
      case 'ball':E(0,-.80,.95,.95,'#A5C8E9');noFill();stroke('#FBE8BD');strokeWeight(3);arc(0,-.80*u,1.05*u,1.84*u,-PI/2,PI/2);line(-.91*u,-.80*u,.91*u,-.80*u);break;
      case 'towel':P([[-1.44,0],[1.44,0],[1.38,2.35],[.54,2.30],[-.2,2.38],[-1.37,2.32]],obj.wet?'#D7A494':'#EDBEA8');L([[-1.33,2.05],[1.33,2.05]],'#F7DEBC',4);L([[-.68,.1],[-.76,2.16]],'#DDA88F',1.2);break;
      case 'remote':push();translate(0,-.65*u);P([[-.19,-.38],[.19,-.38],[.22,.38],[-.22,.38]],'#DCE7CF');E(0,-.19,.065,.065,'#DDA78C',null,0);for(const dy of [.01,.16])for(const dx of [-.08,.08])E(dx,dy,.035,.035,'#8BAA99',null,0);pop();break;
      case 'wateringCan':E(.06,.27,.37,.33,'#A5CEC5');E(.06,.27,.23,.21,'#F8F6E8');P([[-.48,.40],[.65,.40],[.57,1.93],[-.38,1.93]],'#A7D5CD');P([[.55,.90],[1.30,.19],[1.40,.32],[.61,1.25]],'#A7D5CD');E(1.35,.255,.11,.16,'#80B3B1');E(.09,.42,.56,.13,'#C5E5D9');break;
      case 'spoon':P([[-.10,-.05],[.94,-.05],[.94,.06],[-.10,.06]],'#B8C9B7');E(1.02,0,.22,.14,'#E6CF9C');break;
      case 'fruit':E(0,.05,.34,.36,'#E7B57C');L([[0,-.26],[.05,-.43]],'#78966E',2.2);E(.12,-.35,.14,.06,'#92BA86',null,0);break;
      case 'cloth':P([[-.90,-.22],[.95,-.12],[.91,.72],[-.94,.65]],'#D4E3C0');L([[-.77,.49],[.76,.56]],'#A0BD98',1.8);break;
      case 'pencil':L([[0,.0],[.62,-.42]],'#B7A070',4);L([[.57,-.38],[.72,-.49]],'#5C776D',2);break;
    }
    pop();
    if(obj.kind==='wateringCan'&&s.waterTarget){
      const room=YayaHomeLayout.rooms[s.room],target=YayaHomeArt.project(s.waterTarget.x,s.waterTarget.z,s.waterTarget.h||0,room),tf=YayaHomeModel.bodyTransform(s),dx=target.x-tf.x,dy=target.y-tf.y,c=Math.cos(-tf.rotation),si=Math.sin(-tf.rotation),tx=(dx*c-dy*si)/tf.sx,ty=(dx*si+dy*c)/tf.sy,a=obj.angle||0,sx=x+(1.35*Math.cos(a)-.255*Math.sin(a))*u,sy=y+(1.35*Math.sin(a)+.255*Math.cos(a))*u;
      for(let i=0;i<3;i++){const k=((s.time||0)*1.4+i*.31)%1,px=sx+(tx-sx)*k,py=sy+(ty-sy)*k+Math.sin(PI*k)*5;d.flatEllipse(px,py,1.7,3.3,'rgba(117,195,211,.8)',null,0);}
    }
  }
  function drawSurfaceItem(item,room,s){
    const p=YayaHomeArt.project(item.anchor.x,item.anchor.z,item.anchor.h||0,room);push();translate(p.x,p.y);
    drawHeld(s.u||22.8,{...s,heldObject:{...item,hand:1},waterTarget:null},[{side:1,palm:[0,0]},{side:-1,palm:[0,0]}]);pop();
  }
  function drawForeground(room,s,t=s.time||0){
    push();ellipseMode(CENTER);
    for(const o of room.furniture){const state=os(room,o,s);
      if(o.kind==='shower'){
        const open=clamp(state.privacy??state.open??0),x=o.x+o.w+.018,near=o.z+o.d,span=o.d*.83*open;
        if(state.water){const start=[o.x+.48,o.z+o.d*.45+.12,2.49];for(let i=0;i<7;i++){const phase=(t*1.15+i*.13)%1;const h=2.45-phase*2.18;line3(room,[[start[0]+(i-3)*.045,start[1]+(i%2)*.04,h],[start[0]+(i-3)*.055,start[1]+(i%2)*.05,h-.17]],'rgba(124,187,202,.76)',1.6);}}
        if(open>.005){const z0=o.z+.08,z1=Math.min(o.z+o.d,z0+.46+span);poly(room,[[x,z0,.18],[x,z1,.18],[x,z1,2.53],[x,z0,2.53]],'#BADACA',1.5);for(let z=z0+.06;z<z1;z+=.17)line3(room,[[x+.01,z,.23],[x+.01,z,2.50]],'#A6CBB9',1.2);line3(room,[[x+.014,z0,.48],[x+.014,z1,.48]],'#E3E7C6',4);
          // The curtain rounds the front corner too: the camera sees both
          // outward faces, so one isolated sheet would reveal the occupant.
          const reach=o.w*clamp((open-.25)/.75),xx=x-reach,zz=o.z+o.d+.015;if(reach>.01){poly(room,[[xx,zz,.18],[x,zz,.18],[x,zz,2.53],[xx,zz,2.53]],'#C9E0CF',1.5);for(let a=xx+.08;a<x;a+=.17)line3(room,[[a,zz+.01,.23],[a,zz+.01,2.5]],'#B5D2BE',1.2);line3(room,[[xx,zz+.02,.48],[x,zz+.02,.48]],'#E9EDD2',4);}
        }
      }
      if(o.kind==='toilet'&&state.privacy>.005){const k=clamp(state.privacy||0),front=o.x+.02+(o.w+.22)*k,z0=o.z-.07,z1=z0+.045+(o.d+.165)*k,h=1.86;
        // The folding modesty screen is part of this activity, not an overlay
        // covering the whole room. It stands on two visible floor feet.
        poly(room,[[front,z0,0],[front,z1,0],[front,z1,h],[front,z0,h]],'#B9CBB6',1.7);for(let z=z0+.22;z<z1;z+=.31)line3(room,[[front+.01,z,.10],[front+.01,z,h-.05]],'#A3BBA8',1.3);for(const z of [z0+.1,z1-.1])line3(room,[[front-.12,z,0],[front+.16,z,0]],'#708F7F',4);
        const wing=front-(o.w+.28)*k;poly(room,[[wing,z1,0],[front,z1,0],[front,z1,h],[wing,z1,h]],'#C4D4BD',1.7);for(let x=wing+.16;x<front;x+=.29)line3(room,[[x,z1+.01,.10],[x,z1+.01,h-.05]],'#ABC2AE',1.2);
        if(k>.4){const p=project(room,[front+.02,(z0+z1)/2,h*.66]);noStroke();fill('#F0E5BC');ellipse(p.x,p.y,24*k,27);fill('#8AAD8D');ellipse(p.x+2,p.y-3,8*k,14);}
      }
      if(o.kind==='sink'&&state.water&&o.grip){const p=project(room,[o.grip.x,o.grip.z,o.grip.h]);for(let i=0;i<4;i++){const a=(t*2+i*.8),x=p.x+Math.cos(a)*16,y=p.y+Math.sin(a)*6+3;noStroke();fill('rgba(181,235,238,.85)');ellipse(x,y,3.5,4.5);}}
      if(o.kind==='plant'&&state.water){const p=project(room,[o.x+o.w/2,o.z+o.d/2,(o.elevation||0)+o.h*.44]);for(let i=0;i<3;i++){const k=(t+i*.27)%1;noStroke();fill('rgba(116,187,199,'+(.6*(1-k))+')');ellipse(p.x+(i-1)*8,p.y-k*6,3,3);}}
    }
    const lights=room.furniture.filter(o=>o.kind==='ceilingLamp');if(lights.length&&lights.every(o=>os(room,o,s).on===false)){noStroke();fill('rgba(68,88,108,.075)');rect(0,0,1920,1080);}
    pop();
  }
  globalThis.YayaHomeEffects={drawWorld,drawHeld,drawSurfaceItem,drawForeground};
})();
