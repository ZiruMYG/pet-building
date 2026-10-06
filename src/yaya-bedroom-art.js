// A persistent room in one coordinate system. Props stay at their real anchors
// until the controller parents them to the pet's solved hand sockets.
(() => {
  'use strict';
  const C={ink:'#36585C',wall:'#FFF4D8',floor:'#F1D6AF',wood:'#E6B47E',woodLight:'#F6D4A3',woodDark:'#C99160',mint:'#83CDBD',mintLight:'#B9E4CE',teal:'#51ABA4',cream:'#FFFBED',peach:'#F8AA86',pink:'#F2B4A1',blue:'#B9E3E9'};
  const layout=Object.freeze({
    width:1920,height:1080,wallFloor:610,
    bed:{x:425,y:790,u:28,mattressTop:752.2,bodyX:513.2,pillow:{x:353.32,y:734.84},approach:{x:627,y:835},hit:{x:232,y:588,w:360,h:220}},
    shelf:{x:1535,y:744,left:1347,right:1723,top:625},
    book:{x:1415,y:625,size:48,hit:{x:1366,y:563,w:98,h:65}},teddy:{x:1600,y:625,u:24,hit:{x:1555,y:542,w:90,h:86}},
    lamp:{x:170,y:702,touch:{x:206,y:659},approach:{x:300,y:808},hit:{x:116,y:583,w:108,h:112}},
    window:{x:1030,y:285,hit:{x:817,y:115,w:426,h:344}},rug:{x:1030,y:860,rx:410,ry:146},
    read:{x:1150,y:920},play:{x:1000,y:920},bedside:{x:170,y:790}
  });
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  let unit=1;
  function style(fillColor,sw=3,strokeColor=C.ink){fill(fillColor);if(sw){stroke(strokeColor);strokeWeight(sw*unit);}else noStroke();}
  function box(x,y,w,h,r,col,sw=3){push();rectMode(CORNER);style(col,sw);rect(x*unit,y*unit,w*unit,h*unit,r*unit);pop();}
  function oval(x,y,w,h,col,sw=3){push();ellipseMode(CENTER);style(col,sw);ellipse(x*unit,y*unit,w*unit,h*unit);pop();}
  function linePath(points,col=C.ink,sw=3){push();noFill();stroke(col);strokeWeight(sw*unit);strokeCap(ROUND);strokeJoin(ROUND);beginShape();for(const [x,y] of points)vertex(x*unit,y*unit);endShape();pop();}
  function curvePoints(start,segments){const points=[start];let from=start;for(const [a,b,e] of segments){for(let i=1;i<=16;i++){const q=i/16,r=1-q;points.push([r*r*r*from[0]+3*r*r*q*a[0]+3*r*q*q*b[0]+q*q*q*e[0],r*r*r*from[1]+3*r*r*q*a[1]+3*r*q*q*b[1]+q*q*q*e[1]]);}from=e;}return points;}
  function path(start,segments,col,sw=3,strokeColor=C.ink){push();style(col,sw,strokeColor);beginShape();for(const p of curvePoints(start,segments))vertex(p[0]*unit,p[1]*unit);endShape(CLOSE);pop();}
  function curve(start,segments,col=C.ink,sw=3){linePath(curvePoints(start,segments),col,sw);}
  function star(x,y,r,col,rotation=0,sw=0){push();translate(x*unit,y*unit);rotate(rotation);style(col,sw);beginShape();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.46:r;vertex(Math.cos(a)*rr*unit,Math.sin(a)*rr*unit);}endShape(CLOSE);pop();}
  function leaf(x,y,s,a,col=C.mint){push();translate(x*unit,y*unit);rotate(a);path([0,0],[[[-s*.76,-s*.14],[-s*.88,-s*.77],[-s*.28,-s]],[[s*.16,-s*.75],[s*.27,-s*.27],[0,0]]],col,0);pop();}

  function drawWindow(t=0){
    const x=1030,y=285,w=410,h=326;
    box(x-w/2-15,y-h/2-15,w+30,h+30,46,'#F3DDAC',3.5);
    box(x-w/2,y-h/2,w,h,33,'#BCEBF0',3);
    // The outdoor scene is deliberately quiet: broad cloud and hill shapes.
    oval(1149,207,71,71,'#FFE49A',0);
    for(const [cx,cy,ss] of [[940,222,1],[1112,310,.72]]){
      oval(cx-36*ss,cy,80*ss,36*ss,'#F6FFFF',0);oval(cx,cy-12*ss,66*ss,51*ss,'#F6FFFF',0);oval(cx+35*ss,cy+1*ss,70*ss,33*ss,'#F6FFFF',0);
    }
    path([826,430],[[[912,354],[951,373],[1022,419]],[[1101,372],[1160,374],[1234,414]],[[1234,446],[1070,447],[826,447]]],'#A0D8AF',0);
    box(1019,122,21,326,8,'#FFF9E8',2.2);box(826,282,409,17,7,'#FFF9E8',2.2);
    box(801,441,458,22,9,'#F6D4A3',3);
    linePath([[788,113],[1273,113]],C.woodDark,10);
    oval(783,113,19,19,C.woodDark,0);oval(1277,113,19,19,C.woodDark,0);
    for(const side of [-1,1]){
      const cx=x+side*235,sway=Math.sin(t*.65+side)*2;
      path([cx-43,119],[[[cx-49,215],[cx-27+sway,290],[cx-46,402]],[[cx-14,422],[cx+15,424],[cx+45,404]],[[cx+22+sway,278],[cx+46,207],[cx+39,119]],[[cx+16,112],[cx-21,113],[cx-43,119]]],'#A3D9C0',2.5);
      curve([cx-14,135],[[[cx-25,226],[cx+3+sway,301],[cx-16,395]]],'#78BEA6',2);
      for(let j=0;j<4;j++)leaf(cx+15*(j%2?1:-1),184+j*52,18,side*.35,C.cream);
      box(cx-32,287,65,13,6,'#F3D691',2);
    }
  }

  function drawPicture(){
    box(274,210,234,225,23,C.woodLight,3.5);box(289,225,204,195,12,C.cream,2);
    oval(433,267,38,38,'#FFCF72',0);
    path([292,386],[[[339,309],[376,319],[413,366]],[[443,333],[470,346],[490,380]],[[490,417],[352,417],[292,417]]],'#AFDAB7',0);
    curve([379,375],[[[379,354],[379,324],[378,307]]],C.teal,5);
    leaf(378,335,50,-.42,'#66BBA0');leaf(380,336,48,1.0,'#87CDAB');
    oval(332,387,20,8,'#F2C36C',0);oval(456,395,21,8,'#F2C36C',0);
  }

  function drawDoor(){
    box(1751,251,150,378,25,'#E5C795',4);
    box(1764,264,124,349,21,'#C7E4CC',3);
    box(1780,283,92,149,14,'#D9EDCF',2);
    box(1780,451,92,137,14,'#D9EDCF',2);
    oval(1787,445,15,15,'#F2CB7C',2);
    box(1804,315,47,57,12,'#FFF7DC',2);
    leaf(1828,357,26,.08,C.teal);
  }

  function drawBackground(t=0,options={}){
    const lampOn=options.lampOn!==false;
    push();rectMode(CORNER);background(C.wall);
    // One clear floor plane gives every step and item a persistent place.
    box(0,610,1920,470,0,C.floor,0);
    box(0,594,1920,27,0,'#E5C59C',0);linePath([[0,595],[1920,595]],'#C9B38E',3);
    linePath([[0,621],[1920,621]],'#F8E8CC',3);
    for(const yy of [744,904,1060])linePath([[0,yy],[1920,yy]],'#DEBD95',2);
    for(const [xx,ya,yb] of [[565,621,744],[1230,621,744],[245,744,904],[1390,744,904],[640,904,1060],[1720,904,1060]])linePath([[xx,ya],[xx,yb]],'#DEBD95',2);
    // A soft elliptical rug is the open play zone, clear of the furniture.
    oval(1030,871,847,300,'rgba(116,103,77,.07)',0);
    oval(1030,860,820,292,'#B6DCCD',3);
    oval(1030,859,772,247,'#CDE8CF',0);
    curve([672,854],[[[730,754],[1261,754],[1382,854]]],'#EFF2C9',5);
    curve([683,884],[[[827,1000],[1257,988],[1375,883]]],'#EFF2C9',5);
    for(const [xx,yy,ss,aa] of [[728,875,17,-.6],[1270,958,15,.9],[1320,817,14,.8]])leaf(xx,yy,ss,aa,'#A5CCB0');
    drawWindow(t);drawPicture();drawDoor();
    // The leaf-and-moon mobile belongs to the bed, kept above walking space.
    linePath([[607,74],[607,169]],'#B6B78F',2.5);
    curve([550,180],[[[573,161],[626,161],[649,180]]],C.woodDark,4);
    linePath([[565,178],[565,231]],'#B6B78F',2);
    linePath([[609,171],[609,216]],'#B6B78F',2);
    linePath([[646,182],[646,250]],'#B6B78F',2);
    star(565,247,18,'#F4C76E',.16,2);star(646,267,14,'#92CCB1',-.10,2);
    oval(609,235,34,40,'#F4CE77',2);oval(617,227,24,30,C.wall,0);
    if(lampOn)oval(173,606,145,143,'rgba(255,223,144,.17)',0);
    pop();
  }

  function drawBed(){
    const {x,y,u}=layout.bed;
    push();translate(x,y);const oldUnit=unit;unit=u;
    oval(-.55,.50,13.5,.64,'rgba(72,88,71,.13)',0);
    box(-6.85,-3.30,.38,3.70,.18,C.woodDark,.105);oval(-6.66,-3.28,.50,.50,C.woodLight,.10);
    box(5.50,-2.18,.38,2.58,.18,C.woodDark,.105);oval(5.69,-2.16,.50,.50,C.woodLight,.10);
    // A small rounded headboard makes the low bed instantly recognizable.
    box(-6.66,-2.75,.30,2.31,.12,C.wood,.085);
    box(-6.46,-1.35,11.97,.86,.34,C.cream,.10);
    linePath([[-6.04,-.89],[5.13,-.89]],'#D5E4D7',.065);
    box(-6.64,-.50,12.30,.56,.18,C.woodLight,.10);
    box(-5.98,.04,.42,.57,.13,C.woodDark,.10);box(4.63,.04,.42,.57,.13,C.woodDark,.10);
    linePath([[-6.20,-.18],[5.20,-.18]],'#D6A570',.06);
    push();translate(-2.56*u,-1.97*u);rotate(-.045);
    box(-2.14,-.75,4.15,1.38,.54,'#FFF5D9',.095);
    curve([-1.77,-.39],[[[-1.93,-.13],[-1.88,.01],[-1.75,.19]]],'#DECAA0',.064);
    curve([1.61,-.39],[[[1.83,-.11],[1.77,.10],[1.62,.22]]],'#DECAA0',.064);
    pop();unit=oldUnit;pop();
  }

  function drawShelf(options){
    const {x,y}=layout.shelf;
    oval(x,y+9,399,31,'rgba(72,88,71,.13)',0);
    box(x-178,639,356,94,18,C.woodLight,3.5);
    for(const dx of [-147,133])box(x+dx,724,18,28,6,C.woodDark,2.5);
    box(x-188,625,376,16,9,'#F4D09C',3.5);
    box(x-163,650,151,67,11,'#B8D7B5',2.5);box(x+12,650,151,67,11,'#F6E2B8',2.5);
    box(x-160,686,145,26,7,'#93BCAA',0);
    // Upright spare books stay in the cubby while the large picture book is
    // picked up from the top. Their graphic pattern is visible at room scale.
    for(const [dx,w,h,col] of [[29,18,48,'#EDA380'],[50,21,57,'#8CC5C5'],[74,16,42,'#E4C46E'],[95,23,54,'#9DBCA7']]){
      box(x+dx,713-h,w,h,4,col,1.8);linePath([[x+dx+5,704],[x+dx+w-5,704]],'#FFF4D6',2);
    }
    oval(x-88,672,29,13,'#5E9588',0);
    if(options.bookOnShelf!==false)drawBook(layout.book.x,layout.book.y,layout.book.size,0,0);
    if(options.teddyOnShelf!==false)drawTeddy(layout.teddy.x,layout.teddy.y,layout.teddy.u);
    // Tiny rounded plant at the far end; it never blocks the pickup anchors.
    const px=1688;
    path([px-22,597],[[[px-19,620],[px-15,624],[px,624]],[[px+15,624],[px+19,620],[px+22,597]],[[px+6,592],[px-6,592],[px-22,597]]],'#EDA887',2);
    oval(px,597,44,12,'#F3C4A4',2);
    leaf(px,594,36,-.65,C.teal);leaf(px,594,44,.42,C.mint);leaf(px,594,28,1.00,'#72B79C');
  }

  function drawLamp(lampOn){
    const {x,y}=layout.bedside;
    oval(x,y+3,126,20,'rgba(72,88,71,.11)',0);
    for(const dx of [-39,29])box(x+dx,y-27,12,33,4,C.woodDark,2);
    box(x-52,y-91,104,65,12,C.woodLight,3);
    box(x-57,y-98,114,14,7,C.wood,3);
    box(x-42,y-75,84,37,8,'#FAE7BB',2);oval(x,y-57,12,9,C.woodDark,0);
    // Switch contact is part of the lamp base, not a floating UI marker.
    box(x-5,y-143,10,42,4,'#D7AA72',2);
    oval(x,y-100,59,12,'#EBC88D',2);
    path([x-34,y-198],[[[x-42,y-187],[x-44,y-164],[x-47,y-157]],[[x-17,y-150],[x+17,y-150],[x+47,y-157]],[[x+44,y-164],[x+42,y-187],[x+34,y-198]],[[x+12,y-204],[x-12,y-204],[x-34,y-198]]],lampOn?'#FFE5A5':'#E5D9B9',2.8);
    oval(x,y-197,68,15,lampOn?'#FFF0BC':'#EEE7D1',2.4);
    star(x,y-177,11,lampOn?'#E8BD63':'#B8AF99',0,0);
    linePath([[206,633],[206,654]],'#B48F61',2);
    oval(206,659,11,14,lampOn?'#F6CB6B':'#ACBDAC',1.7);
  }

  function drawFurniture(options={}){
    push();drawBed();drawLamp(options.lampOn!==false);drawShelf(options);
    // An unoccupied bed has a loosely folded cover. For a sleeping pet, call
    // drawQuilt after drawing the rig, so the same cover occludes its body.
    if(!options.bedOccupancy)drawQuilt({...layout.bed,cover:options.cover??0});
    pop();
  }

  function quiltGrip(cover,breath=0){
    const k=clamp(cover),b=layout.bed;
    return {x:b.x-.22*b.u,y:b.y+(-3.65+(-2.98-.05*breath)*k)*b.u};
  }

  function drawQuilt({x=layout.bed.x,y=layout.bed.y,u=layout.bed.u,cover=1,breath=0}={}){
    const k=clamp(cover),rise=.05*breath;
    // The folded cuff stays by the sleeping shoulder, within a short hand's
    // reach. Its grip is the very same left contour vertex at every phase.
    // The lower drape keeps its foot-of-bed support as the cuff is pulled up.
    const mix=(a,b)=>a+(b-a)*k;
    const point=(a,b)=>[mix(a[0],b[0]),mix(a[1],b[1])];
    const full=[[-.22,-6.63-rise],[.67,-7.04-rise],[1.92,-7.04-rise],[2.89,-6.21-rise],[4.08,-5.44-rise],[4.80,-3.79],[5.14,-2.05],[5.37,-1.14],[5.22,-.82],[4.95,-.69],[3.57,-.58],[.72,-.60],[-.25,-.82],[-.13,-2.08],[-.45,-4.97],[-.22,-6.63-rise]];
    const flat=[[-.22,-3.65],[.16,-3.96],[1.62,-4.04],[2.65,-3.45],[3.91,-2.74],[4.87,-1.74],[5.22,-.80],[5.21,-.54],[5.12,-.45],[4.95,-.45],[3.77,-.45],[.72,-.43],[-.25,-.64],[-.13,-1.60],[-.55,-3.18],[-.22,-3.65]];
    const q=full.map((v,i)=>point(flat[i],v));
    const seg=[];for(let i=1;i<q.length;i+=3)seg.push([q[i],q[i+1],q[i+2]]);
    push();translate(x,y);const oldUnit=unit;unit=u;path(q[0],seg,'#80CFCD',.10);
    // Two padded, rounded folds explain the empty-bed volume. Their seams
    // disappear as the fabric unfolds; the hand-contact contour stays exact.
    const foldAlpha=(1-k)*(1-k);
    path([.12,-2.82],[[[.65,-3.04],[1.73,-3.02],[2.69,-2.53]],[[3.54,-2.10],[4.12,-1.63],[4.48,-1.20]],[[3.70,-1.34],[2.66,-2.12],[1.82,-2.21]],[[1.05,-2.36],[.55,-2.09],[.14,-2.22]],[[-.04,-2.36],[-.05,-2.66],[.12,-2.82]]],`rgba(191,233,219,${.9*foldAlpha})`,0);
    curve([.17,-2.23],[[[1.05,-2.10],[1.43,-2.46],[2.59,-1.99]],[[3.40,-1.63],[4.07,-1.12],[4.48,-1.20]]],`rgba(76,160,161,${.9*foldAlpha})`,.075);
    path([.13,-1.67],[[[.80,-1.90],[2.13,-1.53],[3.04,-1.16]],[[3.57,-.97],[4.09,-.77],[4.78,-.76]],[[4.32,-.61],[3.51,-.68],[2.79,-.92]],[[1.63,-1.30],[.66,-1.15],[.20,-1.23]],[[-.01,-1.31],[-.02,-1.52],[.13,-1.67]]],`rgba(183,226,215,${.82*foldAlpha})`,0);
    curve([.19,-1.25],[[[1.11,-1.15],[1.70,-1.31],[2.79,-.93]],[[3.38,-.71],[4.14,-.59],[4.78,-.76]]],`rgba(76,160,161,${.86*foldAlpha})`,.065);
    // The curled end sits on the mattress rather than forming a pointed tip.
    curve([4.88,-.70],[[[4.68,-.82],[4.42,-.83],[4.37,-.69]],[[4.45,-.57],[4.70,-.58],[4.88,-.70]]],`rgba(67,142,147,${foldAlpha})`,.065);
    curve([-.11,mix(-3.51,-6.48-rise)],[[[mix(-.30,-.30),mix(-2.93,-4.99)],[mix(.04,.11),mix(-1.43,-2.14)],[-.10,mix(-.81,-.95)]]],'#C3EEE0',.23);
    curve([1.53,mix(-3.78,-6.80-rise)],[[[mix(1.64,1.78),mix(-2.76,-4.96)],[mix(1.71,1.85),mix(-1.47,-2.20)],[1.72,-.80]]],'#65B7B7',.067);
    curve([3.17,mix(-3.09,-5.85-rise)],[[[mix(3.52,3.56),mix(-2.19,-4.26)],[mix(3.55,3.69),mix(-1.26,-2.18)],[3.46,-.79]]],'#65B7B7',.067);
    star(2.40,mix(-2.1,-4.0),.25,'#D4F0CB',.15,0);
    // The fold crease opens continuously instead of popping away at a key.
    curve([.15,mix(-2.72,-4.10)],[[[1.34,mix(-3.16,-4.35)],[3.85,mix(-2.30,-3.29)],[4.85,-1.07]]],`rgba(182,232,219,${.75*(1-k)})`,.075);
    unit=oldUnit;pop();return {cover:k,grip:{x:x+q[0][0]*u,y:y+q[0][1]*u}};
  }

  // Object origin is the bottom center. A shelf pickup can preserve its
  // world position, then bind it to a hand without changing the artwork.
  function drawBook(x,y,size=48,open=0,page=0){
    const k=clamp(open);
    push();translate(x,y+(k>=.05?.15*size:0));const oldUnit=unit;unit=size;
    if(k<.05){
      box(-.72,-.68,1.44,.68,.10,'#ECAA80',.06);
      box(-.61,-.59,1.21,.49,.06,'#FFF4D2',.026);
      linePath([[-.59,0],[.64,0]],'#D28663',.035);
      leaf(0,-.18,.33,-.42,'#68B798');leaf(.025,-.19,.30,.74,'#90CCA6');
    }else{
      const width=1.03*k+.39;
      path([0,-.15],[[[-.20,-.27],[-width*.69,-.13],[-width,-.19]],[[-width-.04,-.46],[-width-.04,-.82],[-width,-1.05]],[[-width*.56,-1.07],[-.29,-1.20],[0,-.94]],[[.29,-1.20],[width*.56,-1.07],[width,-1.05]],[[width+.04,-.82],[width+.04,-.46],[width,-.19]],[[width*.69,-.13],[.20,-.27],[0,-.15]]],'#ECAA80',.045);
      path([0,-.23],[[[-.30,-.40],[-width*.65,-.26],[-width+.09,-.30]],[[-width+.07,-.50],[-width+.07,-.79],[-width+.09,-.96]],[[-width*.58,-.98],[-.29,-1.07],[0,-.88]],[[.29,-1.07],[width*.58,-.98],[width-.09,-.96]],[[width-.07,-.79],[width-.07,-.50],[width-.09,-.30]],[[width*.65,-.26],[.30,-.40],[0,-.23]]],C.cream,.025);
      curve([0,-.88],[[[-.025,-.64],[-.025,-.41],[0,-.23]]],'#D6C49B',.028);
      // Broad story pictures remain legible when this book is only a few
      // dozen pixels wide in the room: sunshine over a hill, then a sprout.
      const ps=Math.min(1,width/.95);
      box(-width+.14,-.95,Math.max(.10,width-.28),.47,.065,'#C8EAE8',0);
      oval(-width*.39,-.80,.25*ps,.25*ps,'#F4C85C',0);
      path([-width+.15,-.50],[[[-width*.77,-.80],[-width*.51,-.67],[-width*.31,-.52]],[[-width*.23,-.58],[-.15,-.62],[-.14,-.50]],[[-width*.41,-.48],[-width*.74,-.48],[-width+.15,-.50]]],'#82BF99',0);
      box(.14,-.95,Math.max(.10,width-.28),.47,.065,'#F7E6B9',0);
      oval(width*.53,-.53,.62*ps,.11,'#B4CFA2',0);
      linePath([[width*.53,-.55],[width*.53,-.79]],'#4A9B80',.044);
      leaf(width*.52,-.67,.27*ps,-.69,'#65B38D');leaf(width*.54,-.65,.27*ps,.71,'#80C199');
      linePath([[-width+.19,-.40],[-.19,-.42]],'#B8CEB8',.035);linePath([[.19,-.42],[width-.19,-.40]],'#B8CEB8',.035);
      const flip=Math.max(0,Math.sin(page*Math.PI));
      if(flip>.015){
        path([0,-.88],[[[.21*flip,-1.03],[.71*flip,-1.03],[.88*flip,-.94]],[[.86*flip,-.77],[.85*flip,-.48],[.81*flip,-.31]],[[.48*flip,-.29],[.19*flip,-.38],[0,-.23]],[[.01,-.43],[.01,-.66],[0,-.88]]],'#FFFBEA',.026);
        oval(.47*flip,-.70,.33*flip,.28,'#F5D98D',0);
        curve([.15*flip,-.45],[[[.35*flip,-.59],[.53*flip,-.44],[.72*flip,-.48]]],'#A6C99E',.045);
      }
    }
    unit=oldUnit;pop();
  }

  function drawTeddy(x,y,u=24){
    if(!window.YayaScenes||!window.YayaDrawing)return;
    push();translate(x,y-1.26*u);
    YayaScenes.drawHeld(u,'hug',0,[{palm:[0,.25]},{palm:[0,.25]}],{},{});
    pop();
  }

  window.YayaBedroomArt={layout,palette:C,drawBackground,drawFurniture,drawQuilt,quiltGrip,drawBook,drawTeddy};
})();

