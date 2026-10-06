// Two soft, rounded leaves share one fixed stem. Blade and vein deform along
// the same centerline; poses are seekable and repeat every four seconds.
(() => {
  const TAU=Math.PI*2,period=4,root=Object.freeze([0,-6.94]);
  const shapes=Object.freeze(['natural','upright','spread','droop','cup']);
  const motions=Object.freeze(['still','breathe','sway','alternate','flap','twitch','wind']);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  function defaults(key,context={}) {
    const action=context.action||'', mood=context.mood||key;
    let shape='natural',motion='breathe',strength=1;
    if(['sad','cry','sleepy','ko','bored'].includes(mood)){shape='droop';motion=mood==='cry'?'twitch':'breathe';strength=.45;}
    else if(['shy','love','scared','nervous','disgusted'].includes(mood)){shape='cup';motion=['scared','nervous'].includes(mood)?'twitch':mood==='disgusted'?'sway':'breathe';strength=.65;}
    else if(['happy','laugh','relieved','hopeful','playful'].includes(mood)){shape=mood==='relieved'?'natural':'spread';motion=mood==='laugh'?'twitch':mood==='hopeful'?'alternate':mood==='relieved'?'breathe':'flap';strength=.65;}
    else if(['excited','surprised','starstruck','idea','proud','determined','angry','furious'].includes(mood)){shape='upright';motion=['excited','starstruck'].includes(mood)?'flap':['idea','angry','furious'].includes(mood)?'twitch':'breathe';}
    else if(['curious','confused','thinking','suspicious','mischief'].includes(mood)){shape=mood==='thinking'?'upright':'natural';motion=['curious','confused'].includes(mood)?'alternate':'sway';strength=mood==='thinking'?.35:.75;}
    else if(mood==='dizzy'){shape='spread';motion='sway';}
    if(action==='run'){shape='natural';motion='wind';}
    else if(['sleep'].includes(action)){shape='droop';motion='breathe';strength=.45;}
    else if(['eat','drink'].includes(action)){shape='natural';motion='breathe';strength=.45;}
    else if(action==='stretch'){shape='upright';motion='breathe';}
    else if(['walk','sway','dance','exercise','ball'].includes(action)){shape='natural';motion=action==='dance'?'flap':'alternate';strength=action==='walk'?.5:1;}
    else if(['jump','celebrate','play'].includes(action)){shape='spread';motion='flap';}
    else if(['cuddle','hug'].includes(action)){shape='cup';motion='breathe';}
    else if(['wave','hello'].includes(action)){shape='natural';motion='twitch';}
    else if(action==='nod'){shape='natural';motion='breathe';strength=.2;}
    else if(['turn','spin','reach'].includes(action)){shape='natural';motion='sway';}
    return {shape,motion,strength};
  }
  function pose(time,key='idle',side=1,context={}) {
    const s=side<0?-1:1,t=((time%period)+period)%period,q=t/period*TAU;
    const auto=defaults(key,context);
    const shape=shapes.includes(context.leafShape)?context.leafShape:auto.shape;
    const motion=motions.includes(context.leafMotion)?context.leafMotion:auto.motion;
    const strength=motions.includes(context.leafMotion)?1:auto.strength;
    const p={shape,motion,rot:s*.43,bend:s*.12,fold:.035,length:3.45,width:.90,sweep:0};
    if(shape==='upright')Object.assign(p,{rot:s*.16,bend:s*.035,fold:0,length:3.55,width:.83});
    if(shape==='spread')Object.assign(p,{rot:s*.77,bend:s*.20,fold:.10,length:3.38,width:.94});
    if(shape==='droop')Object.assign(p,{rot:s*.50,bend:s*2.0,fold:.70,length:3.45,width:.69});
    if(shape==='cup')Object.assign(p,{rot:s*.28,bend:-s*.95,fold:.18,length:3.15,width:.84});
    if(motion==='breathe') {
      p.rot+=s*.035*Math.sin(q)*strength;
      p.bend+=s*.06*Math.sin(q-.35)*strength;
      p.length*=1+.025*Math.sin(q)*strength;
    } else if(motion==='sway') {
      p.rot+=.18*Math.sin(q)*strength;
      p.bend+=.20*Math.sin(q-.4)*strength;
    } else if(motion==='alternate') {
      const w=Math.sin(2*q+(s>0?Math.PI:0));
      p.rot-=s*.18*w*strength;
      p.length*=1+.105*w*strength;
      p.bend+=s*.18*(1-w)*.5*strength;
    } else if(motion==='flap') {
      p.rot+=s*.25*Math.sin(3*q)*strength;
      p.bend+=s*.15*Math.sin(3*q-.35)*strength;
      p.length*=1+.035*Math.sin(3*q)*strength;
    } else if(motion==='twitch') {
      const k=clamp((t-.45)/1.25,0,1),w=Math.sin(TAU*2*k)*Math.sin(Math.PI*k)**2;
      p.rot+=s*.085*w*strength;
      p.bend+=s*.20*w*strength;
    } else if(motion==='wind') {
      const speed=clamp(context.speed??1,0,1),phase=context.gait??q*4;
      p.sweep=(-1.05+.13*Math.sin(phase-.55))*speed;
      p.rot+=s*.13*speed;
      p.fold=Math.min(.70,p.fold+.08*speed);
      p.bend+=s*.12*Math.sin(phase-.55)*speed;
    }
    if(context.action==='stretch' && !shapes.includes(context.leafShape) && !motions.includes(context.leafMotion))p.length*=1+.08*(1-Math.cos(q*2))*.5;
    if(['eat','drink'].includes(context.action) && !motions.includes(context.leafMotion))p.fold+=.025*(1-Math.cos(q*2));
    if(context.action==='nod' && !motions.includes(context.leafMotion)) {
      const nod=context.nod??globalThis.YayaActions?.sample('nod',time).nod??0;
      p.length*=1-.18*nod;p.bend+=s*.50*nod;p.rot+=s*.10*nod;
    }
    return p;
  }
  function geometry(side,p,yaw=0) {
    const cs=Math.cos(yaw),sn=Math.sin(yaw),co=Math.cos(p.rot),si=Math.sin(p.rot);
    const broad=Math.hypot(cs,.38*sn);
    function center(t) {
      const x=p.bend*t*t,y=-p.length*t+p.fold*p.length*t*t*t;
      return [x*co-y*si,x*si+y*co];
    }
    // Project the complete blade with an invertible 2.5D transform. Rebuilding
    // its normals after flattening a drooping centerline creates loops where
    // the tip folds back. This preserves the soft folded contour in profile.
    const project=([x,y])=>[x*broad-(p.sweep||0)/p.length*y*sn,y+root[1]];
    const left=[],right=[];
    for(let i=0;i<=64;i++) {
      const t=i/64,c=center(t),a=center(Math.max(0,t-.0001)),b=center(Math.min(1,t+.0001));
      const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
      let r=i===0||i===64?0:p.width*Math.sqrt(Math.sin(Math.PI*t))*smooth(t/.18);
      // A folded blade cannot be wider than its bend radius: otherwise its
      // inner edge crosses itself when droop is combined with a wind pulse.
      const vx=2*p.bend*t,vy=-p.length+3*p.fold*p.length*t*t;
      const curvature=Math.abs(vx*6*p.fold*p.length*t-vy*2*p.bend);
      if(curvature>1e-8) {
        const limit=.82*Math.hypot(vx,vy)**3/curvature;
        // Smooth minimum avoids a little pointed notch where a soft blade
        // first meets the bend limit. It always remains below both bounds.
        r/=Math.pow(1+Math.pow(r/limit,8),1/8);
      }
      const nx=-dy/len,ny=dx/len;
      left.push(project([c[0]-nx*r,c[1]-ny*r]));
      right.push(project([c[0]+nx*r,c[1]+ny*r]));
    }
    const vein=Array.from({length:25},(_,i)=>project(center(i/24*.87)));
    return {outline:[...left,...right.slice(1,-1).reverse()],vein,root:[...root],tip:project(center(1))};
  }
  globalThis.YayaLeaves=Object.freeze({pose,geometry,defaults,shapes,motions,root,period});
})();
