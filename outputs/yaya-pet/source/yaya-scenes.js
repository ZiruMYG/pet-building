// Small everyday scenes use the same solved character, rather than a second
// sleeping sprite or spare hands. All dimensions below are in body units.
(() => {
  'use strict';
  const TAU = Math.PI * 2;

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
    const breath = .5-.5*Math.cos(TAU*age/4);
    const S = typeof input === 'string' ? getYayaEmotionState(input,age) : input || getYayaEmotionState('sleep',age);

    // The relaxed body is the scene. Rotate the same connected rig onto its
    // side and keep its lowest body point on the ground throughout breathing.
    // This avoids the floating silhouette caused by a rotated standing pose.
    const yaw=.12, rotation=-Math.PI/2+.035, sq=-.10+.022*breath;
    const sx=1+sq*.25,sy=1-sq*.45,breadth=YayaBody.breadth(yaw);
    const groundContact=Math.max(...YayaBody.outline().map(([px,py])=>
      Math.sin(rotation)*px*breadth*sx+Math.cos(rotation)*py*sy));
    D.flatEllipse(x-.15*u,y+.04*u,4.30*u,.29*u,'rgba(48,80,100,.14)',null,0);
    push(); translate(x+3.35*u,y-groundContact*u); rotate(rotation);
    const sleeping = {...S, state:'sleep', action:'sleep', sleeping:true, emote:null,
      face:{...S.face,eyes:'relieved',mouth:'small',blush:.18,closed:1},
      pose:{...S.pose,dy:0,dx:0,rot:0,sq,left:0,right:0,footL:0,footR:0},
      leafShape:S.leafShape && S.leafShape!=='auto' ? S.leafShape : 'cup',
      leafMotion:S.leafMotion && S.leafMotion!=='auto' ? S.leafMotion : 'breathe'};
    const character = V.draw(0,0,u,t,sleeping,age,{yaw,sleeping:true,hideShadow:true},debug);
    pop();
    return {scene:'lying',character,breath,groundContact};
  }

  window.YayaScenes = {drawSleep,drawHeld,heldCenter};
})();
