// Small everyday scenes use the same solved character, rather than a second
// sleeping sprite or spare hands. All dimensions below are in body units.
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  // Explicit cubic samples also work with p5 2's WebGL path implementation.
  function curve(start,segments) {
    const points=[start]; let from=start;
    for(const [a,b,end] of segments) {
      for(let i=1;i<=18;i++) {
        const q=i/18,r=1-q;
        points.push([r*r*r*from[0]+3*r*r*q*a[0]+3*r*q*q*b[0]+q*q*q*end[0],r*r*r*from[1]+3*r*r*q*a[1]+3*r*q*q*b[1]+q*q*q*end[1]]);
      }
      from=end;
    }
    return points;
  }

  function heldCenter(arms) {
    const palms = (arms || []).filter(arm => arm && arm.palm).map(arm => arm.palm);
    if (palms.length < 2) return [2.025, -3.30];
    return [(palms[0][0] + palms[1][0]) / 2, (palms[0][1] + palms[1][1]) / 2 - .25];
  }

  // Draw after the two connected arm bands, before the two real palms. The
  // teddy is parented to their midpoint, so it cannot slide out of the hug.
  function drawHeld(u, key, age, arms, cols, view) {
    if (key !== 'hug') return;
    const D = window.YayaDrawing;
    if (!D) return;
    const [cx, cy] = heldCenter(arms), ink = D.palette.ink;
    const oval = (x,y,rx,ry,col,sw=2.3) => D.flatEllipse(x*u,y*u,rx*u,ry*u,col,sw ? ink : null,sw);
    const line = (points,col=ink,sw=2) => D.flatLine(points.map(([x,y])=>[x*u,y*u]),col,sw);
    push(); translate(cx*u,cy*u);

    // A soft classic teddy silhouette: round ears, a big head, short feet.
    oval(-.56,-1.26,.32,.34,'#C58A55');
    oval(.56,-1.26,.32,.34,'#C58A55');
    oval(-.56,-1.26,.18,.19,'#F3C995',0);
    oval(.56,-1.26,.18,.19,'#F3C995',0);
    oval(-.70,.28,.31,.49,'#C58A55');
    oval(.70,.28,.31,.49,'#C58A55');
    oval(0,.24,.78,.85,'#DCA76F');
    oval(0,.35,.49,.57,'#F7D9AA',0);
    oval(-.45,.98,.37,.28,'#C58A55');
    oval(.45,.98,.37,.28,'#C58A55');
    oval(-.45,1.00,.23,.14,'#F3C995',0);
    oval(.45,1.00,.23,.14,'#F3C995',0);
    oval(0,-.81,.77,.71,'#DCA76F');
    oval(-.30,-.92,.072,.090,ink,0);
    oval(.30,-.92,.072,.090,ink,0);
    oval(0,-.58,.39,.28,'#FBE4BC',0);
    oval(0,-.68,.12,.08,ink,0);
    line([[0,-.62],[0,-.49],[-.12,-.43]],ink,1.7);
    line([[0,-.49],[.12,-.43]],ink,1.7);

    // The collar remains visible above the hugging palms and adds a clear
    // separation between the teddy's head and its small stuffed body.
    D.flatPoly([[-.04,-.12],[-.32,-.27],[-.35,.02],[-.04,.04]].map(([x,y])=>[x*u,y*u]),'#F58C89',ink,1.5);
    D.flatPoly([[.04,-.12],[.32,-.27],[.35,.02],[.04,.04]].map(([x,y])=>[x*u,y*u]),'#F58C89',ink,1.5);
    oval(0,-.08,.10,.12,'#FFB6A3',1.3);
    pop();
  }

  function drawSleep(x, y, u, t, input, age=t, debug=false) {
    const D = window.YayaDrawing, V = window.YayaViews;
    if (!D || !V) return;
    const ink = D.palette.ink, breath = .5-.5*Math.cos(TAU*age/4);
    const S = typeof input === 'string' ? getYayaEmotionState(input,age) : input || getYayaEmotionState('sleep',age);
    const oval = (cx,cy,rx,ry,col,sw=2.5) => D.flatEllipse(cx*u,cy*u,rx*u,ry*u,col,sw ? ink : null,sw);
    const line = (points,col=ink,sw=2.5) => D.flatLine(points.map(([a,b])=>[a*u,b*u]),col,sw);
    function roundBox(bx,by,bw,bh,br,col,sw=2.7) {
      push(); fill(col); if(sw){stroke(ink);strokeWeight(sw);}else noStroke();
      rectMode(CORNER); rect(bx*u,by*u,bw*u,bh*u,br*u); pop();
    }
    function quiltShape(topOffset=0) {
      const points=curve([.30,-5.57+topOffset],[
        [[1.48,-5.95+topOffset],[3.08,-5.35+topOffset],[4.50,-3.66]],
        [[5.19,-2.85],[5.31,-1.39],[4.85,-.76]],
        [[4.02,-.52],[1.66,-.47],[.25,-.72]],
        [[.48,-2.02],[.51,-4.01],[.30,-5.57+topOffset]]
      ]);
      D.flatPoly(points.map(([a,b])=>[a*u,b*u]),'#80CFCD',ink,3);
    }

    push(); translate(x,y);
    oval(-.65,.65,7.30,.36,'rgba(48,80,100,.14)',0);

    // Mattress, rounded timber frame and pillow read as a side-view bed.
    roundBox(-7.58,-3.20,.43,3.90,.20,'#D6A477');
    oval(-7.365,-3.22,.30,.30,'#EEC595');
    roundBox(5.08,-2.17,.43,2.87,.20,'#D6A477');
    oval(5.295,-2.17,.29,.29,'#EEC595');
    roundBox(-7.21,-1.14,12.32,.89,.37,'#F5FBFF');
    roundBox(-7.40,-.39,12.70,.68,.24,'#E9BF8E');
    roundBox(-6.78,.22,.47,.73,.16,'#D6A477');
    roundBox(4.12,.22,.47,.73,.16,'#D6A477');
    line([[-6.86,-.04],[4.77,-.04]],'#C18D60',1.7);

    // The pillow is beneath the upper body; the entire face stays uncovered.
    push(); translate(-3.38*u,-1.73*u); rotate(-.10);
    roundBox(-2.41,-.69,4.55,1.45,.57,'#FFF6DD');
    line([[-1.96,-.35],[-2.12,-.11],[-1.99,.19]],'#DFCFAA',1.7);
    line([[1.73,-.32],[1.87,-.06],[1.74,.22]],'#DFCFAA',1.7);
    pop();

    // One ordinary 2.5D Yaya lies across the mattress, face towards us. The
    // blanket covers the lower body; breathing changes its upper edge only.
    push(); translate(3.28*u,(-3.25-.035*breath)*u); rotate(-Math.PI/2+.035);
    const sleeping = {...S, state:'sleep', action:'sleep', emote:null,
      face:{...S.face,eyes:'closed',mouth:'o',blush:.18},
      pose:{...S.pose,dy:0,dx:0,rot:0,sq:.014*breath,left:0,right:0,footL:0,footR:0},
      leafShape:S.leafShape && S.leafShape!=='auto' ? S.leafShape : 'droop',
      leafMotion:S.leafMotion && S.leafMotion!=='auto' ? S.leafMotion : 'breathe'};
    const character = V.draw(0,0,u,t,sleeping,age,{yaw:.12,hideShadow:true},debug);
    pop();

    quiltShape(-.075*breath);
    // A soft folded edge and two seams describe the quilt without text or
    // symbols. Their positions share the same small breathing displacement.
    line(curve([.40,-5.35-.075*breath],[[[.57,-3.95],[.55,-2.08],[.40,-.87]]]),'#BCEDE0',.22*u);
    line(curve([1.65,-5.50-.045*breath],[[[2.02,-4.01],[1.93,-2.20],[1.74,-.73]]]),'#62B5B8',2);
    line(curve([3.19,-4.80],[[[3.46,-3.39],[3.49,-1.93],[3.16,-.68]]]),'#62B5B8',2);

    // Three little sleep puffs drift gently upward; no repeated text needed.
    for(let i=0;i<3;i++) {
      const q=((age/4+i/3)%1+1)%1, a=Math.sin(Math.PI*q);
      const r=(.08+i*.018)*a;
      oval(-4.62+.46*q,-4.00-1.95*q,r,r,`rgba(106,178,206,${.6*a})`,0);
    }
    pop();
    return {scene:'bed',character,breath};
  }

  window.YayaScenes = {drawSleep,drawHeld,heldCenter};
})();
