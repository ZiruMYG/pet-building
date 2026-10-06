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
    const ink=D.palette.ink, breath = .5-.5*Math.cos(TAU*age/4);
    const S = typeof input === 'string' ? getYayaEmotionState(input,age) : input || getYayaEmotionState('sleep',age);
    const oval=(cx,cy,rx,ry,col,sw=2.5)=>D.flatEllipse(cx*u,cy*u,rx*u,ry*u,col,sw?ink:null,sw);
    const line=(points,col=ink,sw=2.5)=>D.flatLine(points.map(([a,b])=>[a*u,b*u]),col,sw);
    const curve=(start,segments)=>{
      const points=[start]; let from=start;
      for(const [a,b,end] of segments) {
        for(let i=1;i<=20;i++) {
          const q=i/20,r=1-q;
          points.push([r*r*r*from[0]+3*r*r*q*a[0]+3*r*q*q*b[0]+q*q*q*end[0],r*r*r*from[1]+3*r*r*q*a[1]+3*r*q*q*b[1]+q*q*q*end[1]]);
        }
        from=end;
      }
      return points;
    };
    const box=(bx,by,bw,bh,br,col,sw=2.6)=>{
      push();fill(col);if(sw){stroke(ink);strokeWeight(sw);}else noStroke();
      rectMode(CORNER);rect(bx*u,by*u,bw*u,bh*u,br*u);pop();
    };

    // Supine is a profile rig facing the ceiling, not a front-facing drawing
    // tipped onto its side. Rolling a right-facing profile by -90 degrees
    // leaves one cheek and one closed eye visible above the near quilt edge.
    const yaw=1.28, rotation=-Math.PI/2, sq=-.055+.014*breath;
    const sx=1+sq*.25,sy=1-sq*.45,breadth=YayaBody.breadth(yaw);
    const groundContact=Math.max(...YayaBody.outline().map(([px,py])=>
      Math.sin(rotation)*px*breadth*sx+Math.cos(rotation)*py*sy));
    const mattressTop=-1.35,bodyX=3.15,bodyY=mattressTop-groundContact;
    push();translate(x,y);
    oval(-.55,.50,6.75,.32,'rgba(48,80,100,.14)',0);

    // A low bed in side elevation. Its rail is shallow and its legs reach the
    // same floor, so the rounded body feels nestled into a real mattress.
    box(-6.85,-3.30,.38,3.70,.18,'#D6A477');
    oval(-6.66,-3.28,.25,.25,'#EAC49A');
    box(5.50,-2.18,.38,2.58,.18,'#D6A477');
    oval(5.69,-2.16,.25,.25,'#EAC49A');
    box(-6.46,mattressTop,11.97,.86,.34,'#F8FCFF');
    line([[-6.04,-.89],[5.13,-.89]],'#D5E4E9',1.6);
    box(-6.64,-.50,12.30,.56,.18,'#EDC693');
    box(-5.98,.04,.42,.57,.13,'#D6A477');
    box(4.63,.04,.42,.57,.13,'#D6A477');
    line([[-6.20,-.18],[5.20,-.18]],'#CD9D68',1.5);

    // The pillow raises the narrow crown/back-of-head, rather than sitting
    // in front of the face. The lower body's silhouette rests on the mattress.
    push();translate(-2.56*u,-1.97*u);rotate(-.045);
    box(-2.14,-.75,4.15,1.38,.54,'#FFF6DF');
    line([[-1.77,-.39],[-1.91,-.13],[-1.75,.19]],'#DFCDA4',1.7);
    line([[1.61,-.39],[1.76,-.11],[1.62,.22]],'#DFCDA4',1.7);
    pop();

    push(); translate(bodyX*u,bodyY*u); rotate(rotation);
    const sleeping = {...S, state:'sleep', action:'sleep', sleeping:true, emote:null,
      face:{...S.face,eyes:'relieved',mouth:'small',blush:.18,closed:1},
      pose:{...S.pose,dy:0,dx:0,rot:0,sq,left:0,right:0,footL:0,footR:0},
      leafShape:S.leafShape && S.leafShape!=='auto' ? S.leafShape : 'cup',
      leafMotion:S.leafMotion && S.leafMotion!=='auto' ? S.leafMotion : 'breathe'};
    const character = V.draw(0,0,u,t,sleeping,age,{yaw,sleeping:true,hideShadow:true},debug);
    pop();

    // The upper seam starts below the exposed cheek, curves over the belly,
    // and drapes toward the foot of the bed. This is a cover over a horizontal
    // pet, with a turned-down cuff instead of an upright slab of bedding.
    const rise=.05*breath;
    const quilt=curve([-.22,-6.63-rise],[
      [[.67,-7.04-rise],[1.92,-7.04-rise],[2.89,-6.21-rise]],
      [[4.08,-5.44-rise],[4.80,-3.79],[5.14,-2.05]],
      [[5.37,-1.14],[5.22,-.82],[4.95,-.69]],
      [[3.57,-.58],[.72,-.60],[-.25,-.82]],
      [[-.13,-2.08],[-.45,-4.97],[-.22,-6.63-rise]]
    ]);
    D.flatPoly(quilt.map(([a,b])=>[a*u,b*u]),'#80CFCD',ink,2.8);
    line(curve([-.11,-6.48-rise],[[[-.30,-4.99],[.11,-2.14],[-.10,-.95]]]),'#BCEDE0',.23*u);
    line(curve([1.53,-6.80-rise],[[[1.78,-4.96],[1.85,-2.20],[1.72,-.80]]]),'#65B7B7',1.9);
    line(curve([3.17,-5.85-rise],[[[3.56,-4.26],[3.69,-2.18],[3.46,-.79]]]),'#65B7B7',1.9);
    pop();
    return {scene:'bed-supine',character,breath,groundContact,yaw,rotation,mattressTop,bodyY};
  }

  function drawMeal(x,y,u,t,input,age=t,debug=false) {
    const D=window.YayaDrawing,V=window.YayaViews,R=window.YayaRig;
    if(!D||!V||!R)return;
    const original=typeof input==='string'?getYayaEmotionState(input,age):input;
    const key=original.action||original.state||'eat',q=R.actionCycle(key,age),ink=D.palette.ink;
    const bodyY=-.75,tableTop=-1.78,bowlCenter=[-.80,-2.53];
    const oval=(cx,cy,rx,ry,col,sw=2.4)=>D.flatEllipse(cx*u,cy*u,rx*u,ry*u,col,sw?ink:null,sw);
    const line=(points,col=ink,sw=2)=>D.flatLine(points.map(([a,b])=>[a*u,b*u]),col,sw);
    const poly=(points,col,sw=2.4)=>D.flatPoly(points.map(([a,b])=>[a*u,b*u]),col,sw?ink:null,sw);
    const box=(bx,by,bw,bh,br,col,sw=2.4)=>{
      push();fill(col);if(sw){stroke(ink);strokeWeight(sw);}else noStroke();
      rectMode(CORNER);rect(bx*u,by*u,bw*u,bh*u,br*u);pop();
    };
    // A fixed chair and table establish where the pet sits. The body and
    // furniture share a stable origin; only the actual hands and face eat.
    // This keeps the spoon-to-bowl contact from swimming with an idle bob.
    push();translate(x,y+bodyY*u);
    oval(0,1.23,5.85,.31,'rgba(48,80,100,.14)',0);
    for(const side of [-1,1]) {
      box(side<0?-3.45:3.13,-5.38,.32,6.68,.14,'#56AFA7');
      oval(side*3.29,-5.36,.23,.23,'#80CEC0');
    }
    box(-3.35,-5.16,6.70,.73,.29,'#83D2C1');
    line([[-2.94,-4.90],[2.94,-4.90]],'#B2EDDA',2.2);
    box(-3.58,-.24,7.16,.48,.20,'#5BB8AA');
    box(-3.35,-.44,6.7,.32,.16,'#B6E4B6',1.8);
    for(const side of [-1,1]) {
      box(side<0?-4.50:4.12,tableTop+.05,.38,3.05,.13,'#CFA06F');
      box(side<0?-3.88:3.50,tableTop+.10,.34,2.91,.13,'#DEB17E');
    }

    const seated={...original,action:key,emote:null,
      face:{...original.face,eyes:'normal',lookX:key==='eat'?-.10*(1-q.lift):.08,lookY:.12*(1-q.lift)},
      pose:{...original.pose,dx:0,dy:0,rot:0,sq:0,left:0,right:0,footL:0,footR:0}};
    const passiveSide=key==='eat'?1:-1;
    let utensil;
    const character=V.draw(0,0,u,t,seated,age,{yaw:0,seated:true,hideShadow:true,
      armTargets:{[passiveSide]:[passiveSide*2.48,-2.88]},
      drawFurniture(){
        // The rounded tabletop hides the lower belly. It is drawn before
        // the arm bands and palms, so a hand rests on it instead of through it.
        oval(0,tableTop+.22,5.10,.71,'#DCA870');
        oval(0,tableTop,5.10,.67,'#F5D59B');
        oval(-.66,tableTop-.01,1.58,.30,'#FFF1D5',0);
        if(key==='eat') {
          const [bx,by]=bowlCenter;
          // The bowl is on the table. Its rim coincides with the lowest
          // spoon tip; the hand brings that same spoon up to the mouth.
          poly([[bx-.82,by],[bx-.66,by+.53],[bx-.40,by+.70],[bx+.40,by+.70],[bx+.66,by+.53],[bx+.82,by]],'#F58F76');
          oval(bx,by,.82,.24,'#FFF9E8');
          oval(bx,by-.025,.66,.14,'#F9D788',0);
          for(const [dx,dy,col] of [[-.36,-.03,'#7DC681'],[.24,-.06,'#FFAC6B'],[-.02,.04,'#FFE7A4']])oval(bx+dx,by+dy,.13,.085,col,0);
          line([[bx-.51,by+.47],[bx+.51,by+.47]],'#FFD2AF',2.0);
        }
        // A folded napkin makes this read as an everyday meal setting.
        poly([[2.60,-1.85],[3.81,-1.73],[3.60,-1.36],[2.42,-1.50]],'#F9FAED',1.6);
        line([[2.63,-1.58],[3.50,-1.48]],'#B8D8D3',1.3);
      },
      drawProps({arms,cols}){
        utensil=R.propPose(key,age,arms);
        if(!utensil)return;
        // The grip socket is supplied by the same arm solver as the palm.
        // No scene-specific hands or line-based replacement arms are drawn.
        push();translate(utensil.grip[0]*u,utensil.grip[1]*u);rotate(utensil.angle);
        if(key==='eat') {
          poly([[-.12,-.085],[1.03,-.085],[1.03,.085],[-.12,.085]],'#91BDD0',1.7);
          oval(1.04,0,.30,.22,'#D3EBF5',1.9);
          if(utensil.foodK>.01)oval(1.04,-.085,.16*utensil.foodK,.13*utensil.foodK,'#FFB75B',1.1);
        } else {
          oval(-.1,.02,.32,.28,'#BCEEFF',2);
          oval(-.1,.02,.18,.14,cols.light,0);
          poly([[-1.06,-.48],[-.22,-.48],[-.29,.46],[-.99,.46]],'#8ED8EE',2.2);
          oval(-.64,-.48,.42,.11,'#D9F6FF',1.6);
          line([[-.89,-.02],[-.39,-.02]],'#4AA9CC',1.7);
        }
        pop();
      }
    },debug);
    pop();
    return {scene:'table-meal',character,seated:true,bodyY,tableTop,bowlCenter:key==='eat'?bowlCenter:null,
      chair:true,table:true,utensil,phase:q.lift>.8?'mouth':q.lift>.05?'lift':q.chew>.1?'chew':'scoop'};
  }

  window.YayaScenes = {drawSleep,drawMeal,drawHeld,heldCenter};
})();
