// 芽芽 / Yaya: an original pear-shaped electronic pet, independent of Clawd.
(() => {
  const YAYA_STYLE = (typeof PROJECT !== 'undefined' && PROJECT.yayaStyle) || 'bright';
  const PALETTE = YAYA_STYLE === 'paper' ? {
    body:'#F7D878', light:'#FFE9A8', shade:'#E8B84F', leaf:'#83C985', leafLight:'#B7E49A', leafShade:'#4F9C6B',
    ink:'#60402B', eye:'#513522', cheek:'#F39A7D', blush:'#F7B18D', heart:'#F47F79', mint:'#B9DED0', carpet:'#9CCEBE', paper:'#FBF1DA'
  } : {
    body:'#FFD45A', light:'#FFE98A', shade:'#EBAE32', leaf:'#63C98B', leafLight:'#B9EF96', leafShade:'#2E8C5A',
    ink:'#26384B', eye:'#1F3042', cheek:'#FF8B82', blush:'#FFB1A0', heart:'#FF6C86', mint:'#A7E4D2', carpet:'#9BE4CE', paper:'#F5FBFF'
  };
  const YC = PALETTE;

  // Kept local so the original character module is not required by this independent pet.
  function heartPts(cx,cy,r,n=22) {
    const p=[];
    for(let i=0;i<n;i++) { const a=i/n*TAU;
      p.push([cx+16*Math.pow(Math.sin(a),3)*r/16,
        cy-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*r/16]);
    }
    return p;
  }

  // Public, data-driven state vocabulary. Actions are short-lived; moods are safe resting states.
  const MOODS = ['idle','curious','happy','excited','laugh','love','shy','proud','relieved','sad','cry','angry','furious','scared','surprised','confused','thinking','idea','determined','sleepy','bored','nervous','suspicious','disgusted','dizzy','cool','starstruck','ko','playful','mischief','hopeful'];
  const ACTIONS = ['hello','cuddle','eat','play','sleep'];
  // Directional motion vocabulary stays separate from the five interaction clips.
  // These loops are intentionally short, readable gestures that can later be
  // mapped to live controls on a learning device.
  const MOTION_ACTIONS = [
    'wave','hug','jump','sway','spin','walk','reach','stomp','turn','nod','celebrate',
    // Daily routines are deliberately separate clips so a learning-device UI
    // can label them with concrete verbs instead of making children infer a
    // generic ``play`` animation.
    'drink','run','exercise','stretch','ball','dance'
  ];
  const STATE_ALIASES = {
    feed:'eat', touch:'cuddle', nap:'sleep', think:'thinking',
    water:'drink', hydrate:'drink', jog:'run', football:'ball'
  };
  const ACTION_MOODS = {
    hello:'happy', cuddle:'love', eat:'happy', play:'playful', sleep:'sleepy',
    wave:'happy', hug:'love', jump:'excited', sway:'happy', spin:'playful',
    walk:'curious', reach:'hopeful', stomp:'determined', turn:'curious',
    nod:'happy', celebrate:'excited', drink:'happy', run:'excited',
    exercise:'excited', stretch:'relieved', ball:'playful', dance:'playful'
  };
  const EMOTION_PROFILES = {
    idle:      { eyes:'normal', mouth:'smile', blush:.22, lookX:0, lookY:0, tilt:0, arms:'soft' },
    // Curiosity needs an open, searching gaze and a question cue.  The old
    // `look` eye shifted the whole dark eye and read as worry at small sizes.
    curious:   { eyes:'curious', mouth:'tinySmile', blush:.28, lookX:.42, lookY:-.2, tilt:.08, arms:'oneUp', emote:'?' },
    happy:     { eyes:'happy', mouth:'smile', blush:.55, lookX:0, lookY:-.05, tilt:0, arms:'up', emote:'spark' },
    excited:   { eyes:'wide', mouth:'open', blush:.45, lookX:0, lookY:-.1, tilt:0, arms:'up', emote:'spark', take:1 },
    // Crossed eyes suggested an electric shock.  A curved happy eye is much
    // more legible as laughter, especially on the bright flat preset.
    laugh:     { eyes:'laugh', mouth:'laugh', blush:.7, lookX:0, lookY:0, tilt:-.04, arms:'coverMouth', emote:'spark' },
    love:      { eyes:'heart', mouth:'cat', blush:.9, lookX:0, lookY:.05, tilt:.06, arms:'frontFists', emote:'hearts' },
    shy:       { eyes:'look', mouth:'wobble', blush:1, lookX:-.5, lookY:.55, tilt:-.08, arms:'coverEye' },
    // Give relief and pride different eye/mouth channels.  Relief relaxes
    // downward; pride keeps the chin high and uses a small confident smirk.
    proud:     { eyes:'proud', mouth:'smirk', blush:.45, tint:'gold', tintK:.3, lookX:0, lookY:-.3, tilt:.02, arms:'down', emote:'spark' },
    relieved:  { eyes:'relieved', mouth:'smile', blush:.35, lookX:0, lookY:.08, tilt:.02, arms:'down', emote:'sweat' },
    sad:       { eyes:'sad', mouth:'frown', blush:.08, tint:'blue', tintK:.35, lookX:0, lookY:.5, tilt:.03, arms:'down', emote:'cloud' },
    cry:       { eyes:'cry', mouth:'wail', blush:.08, tint:'blue', tintK:.2, lookX:0, lookY:.35, tilt:.02, arms:'up', emote:'cloud' },
    angry:     { eyes:'narrow', mouth:'frown', blush:.7, tint:'rosy', tintK:.25, lookX:.7, lookY:.15, tilt:-.03, arms:'turnAway', emote:'huff' },
    furious:   { eyes:'narrow', mouth:'puff', blush:.9, tint:'rosy', tintK:.35, lookX:0, lookY:.05, tilt:-.04, arms:'frontFists', emote:'vein' },
    scared:    { eyes:'scared', mouth:'wobble', blush:.08, tint:'pale', tintK:.4, lookX:.45, lookY:.2, tilt:0, arms:'up', emote:'sweat' },
    surprised: { eyes:'wide', mouth:'O', blush:.2, lookX:0, lookY:-.18, tilt:0, arms:'coverMouth', emote:'!' , take:1.3 },
    confused:  { eyes:['narrow','wide'], mouth:'wobble', blush:.25, lookX:.35, lookY:-.1, tilt:.1, arms:'palmUp', emote:'question' },
    thinking:  { eyes:'look', mouth:'flat', blush:.2, lookX:.5, lookY:-.8, tilt:.05, arms:'chin', emote:'dots' },
    idea:      { eyes:'shine', mouth:'grin', blush:.4, lookX:0, lookY:-.45, tilt:0, arms:'oneUp', emote:'bulb' },
    determined:{ eyes:'normal', mouth:'flat', blush:.35, lookX:0, lookY:-.1, tilt:.03, arms:'frontFists', emote:null },
    sleepy:    { eyes:'sleepy', mouth:'o', blush:.18, lookX:0, lookY:.2, tilt:.04, arms:'down', emote:'zzz', closed:1 },
    bored:     { eyes:'narrow', mouth:'flat', blush:.12, lookX:-.3, lookY:.4, tilt:-.04, arms:'down', emote:'dots' },
    nervous:   { eyes:'look', mouth:'wobble', blush:.35, lookX:.55, lookY:.15, tilt:.02, arms:'soft', emote:'sweat' },
    suspicious:{ eyes:'look', mouth:'flat', blush:.2, lookX:.75, lookY:.2, tilt:-.06, arms:'peek', emote:null },
    disgusted: { eyes:'squeeze', mouth:'frown', blush:.22, tint:'green', tintK:.25, lookX:0, lookY:.2, tilt:-.08, arms:'pushAway', emote:'odor' },
    dizzy:     { eyes:'swirl', mouth:'wobble', blush:.35, lookX:0, lookY:0, tilt:.12, arms:'soft', emote:'stars' },
    cool:      { eyes:'narrow', mouth:'smirk', blush:.25, lookX:.35, lookY:0, tilt:.04, arms:'up', emote:'music' },
    starstruck:{ eyes:'spark', mouth:'open', blush:.65, tint:'gold', tintK:.25, lookX:0, lookY:-.25, tilt:.02, arms:'up', emote:'stars' },
    ko:        { eyes:'sleepy', mouth:'wobble', blush:.2, tint:'pale', tintK:.25, lookX:0, lookY:.2, tilt:.1, arms:'down', emote:'zzz' },
    playful:   { eyes:'wink', mouth:'tongue', blush:.55, lookX:.15, lookY:0, tilt:.06, arms:'up', emote:'music' },
    mischief:  { eyes:'wink', mouth:'tongue', blush:.45, lookX:.3, lookY:0, tilt:.04, arms:'pointCheek', emote:null },
    hopeful:   { eyes:'shine', mouth:'cat', blush:.5, lookX:0, lookY:-.4, tilt:.03, arms:'rub', emote:'spark' },
  };
  function normalizePetState(state='idle') {
    const raw = state && typeof state === 'object' ? (state.action || state.state || 'idle') : state;
    const key = STATE_ALIASES[raw] || raw;
    return EMOTION_PROFILES[key] ? key : ([...ACTIONS,...MOTION_ACTIONS].includes(key) ? key : 'idle');
  }
  function getYayaEmotionState(state='idle', age=0) {
    const key = normalizePetState(state), action = [...ACTIONS,...MOTION_ACTIONS].includes(key) ? key : null;
    const moodKey = ACTION_MOODS[action] || key;
    const base = EMOTION_PROFILES[moodKey] || EMOTION_PROFILES.idle;
    const pop = base.take ? backOut(seg(age, 0, .35)) : 1;
    const fade = base.emote && base.fade ? 1 - seg(age, 1.2, 1.8) : 1;
    const direction = state && typeof state === 'object' && state.direction < 0 ? -1 : 1;
    const view = state && typeof state==='object' ? state.view : undefined;
    return { state:key, mood:moodKey, action, direction, view, age, emote:base.emote, emoteK:clamp(pop*fade), emoteAge:age, face:{...base}, pose:{...base} };
  }

  function pear(u) {
    const q=[ [0,-7],[-.8,-6.9],[-1.8,-6.55],[-2.5,-5.7],[-2.85,-4.6],
      [-3.15,-3.3],[-3.2,-2],[-3,-1],[-2.35,-.35],[-1.3,-.08],[0,0],
      [1.3,-.08],[2.35,-.35],[3,-1],[3.2,-2],[3.15,-3.3],
      [2.85,-4.6],[2.5,-5.7],[1.8,-6.55],[.8,-6.9] ];
    return through(q.map(([x,y])=>[x*u,y*u]),5);
  }
  function leaf(u,side,drift) {
    const s=side<0?-1:1;
    return [[0,0],[s*.6,-.3],[s*1.55,-1.1],[s*2.5,-2.15],[s*2.75,-3.15],
      [s*2.25,-3.85],[s*1.15,-3.9],[s*.25,-3.3],[0,-2]].map(([x,y])=>[x*u+drift,y*u]);
  }
  // The leaves are a second expression channel: they fold down for sadness,
  // turn inward for shyness, and spring up with a happy surprise.
  function leafPose(age,key,side,action='') {
    const wave=Math.sin(age*TAU*1.55+(side>0?1.1:0));
    let rot=side*.1, drift=side*.02*wave, sx=1, sy=1, dy=0;
    if(key==='sad'){rot+=side*1.05;drift-=side*.18;sx=.92;sy=.88;}
    else if(key==='cry'){rot+=side*1.25;drift-=side*.2;sx=.9;sy=.82;}
    else if(key==='sleepy'){rot+=side*.72;drift-=side*.1;sx=.95;sy=.91;}
    else if(key==='ko'){rot+=side*.9;drift-=side*.15;sx=.92;sy=.86;}
    else if(key==='shy'){rot-=side*.34;drift-=side*.14;sx=.96;sy=.95;}
    else if(key==='love'){rot+=side*.22;drift-=side*.06;}
    else if(key==='happy'){rot+=side*.14+side*.09*wave;sy=1.04;}
    else if(key==='excited'||key==='surprised'||key==='starstruck'){rot+=side*.04+side*.16*wave;sy=1.07;dy=-.05*Math.abs(Math.sin(age*TAU));}
    else if(key==='curious'||key==='thinking'||key==='confused'){rot-=side*.12;drift+=side*.04;}
    else if(key==='angry'||key==='furious'){rot-=side*.25;sy=1.02;}
    else if(key==='disgusted'){rot-=side*.78;drift-=side*.05;sx=.98;sy=.95;}
    else if(key==='scared'){rot-=side*.42;drift+=side*.08*wave;}
    else if(key==='dizzy'){rot+=side*(.4+.12*Math.sin(age*TAU*1.7));}
    if(action==='wave') rot+=side*.1*wave;
    if(action==='walk'||action==='sway') drift-=side*.08*Math.sin(age*TAU/2);
    if(action==='jump'||action==='celebrate'){rot+=side*.08*wave;sy*=1.05;}
    if(action==='spin') rot+=side*.25*Math.sin(age*TAU/2);
    if(action==='reach') rot+=side*.16;
    if(action==='drink') {rot+=side*.04*wave;drift-=side*.035;}
    if(action==='run') {rot+=side*.13*wave;drift-=side*.12*Math.sin(age*TAU/1.1);sy*=1.04;}
    if(action==='exercise') {rot+=side*.18*wave;drift-=side*.09*Math.sin(age*TAU/1.25);sy*=1.06;}
    if(action==='stretch') {rot-=side*.18;sy*=1.06;dy-=.08*Math.abs(Math.sin(age*TAU/2));}
    if(action==='ball') {rot+=side*.1*wave;drift+=side*.06*Math.sin(age*TAU*1.4);}
    if(action==='dance') {rot+=side*.16*wave;drift+=side*.09*Math.sin(age*TAU/1.2);sy*=1.05;}
    return {rot,drift,sx,sy,dy};
  }
  function blink(t,phase) {
    const q=frac((t+phase)/3.15);
    return q<.1?ease(q/.1):q<.2?ease((.2-q)/.1):0;
  }
  function foot(u,side,bob) {
    const s=side<0?-1:1;
    push(); translate(s*1.35*u,-.38*u+bob); rotate(s*.04);
    paint(ellPts(0,0,1.34*u,.66*u,18,.04*u,-.08),{wash:YC.light,fill:YC.shade,fillOp:55,tex:.55,ink:YC.ink,sw:.9}); pop();
  }
  function face(u,t,state) {
    const S=typeof state==='string'?getYayaEmotionState(state,t):state||getYayaEmotionState('idle',t);
    const key=S.state||'idle', e=S.face||S, kinds=Array.isArray(e.eyes)?e.eyes:e.eyes==='wink'?['happy','wink']:[e.eyes||'normal',e.eyes||'normal'];
    const close=e.closed ?? e.half ?? blink(t,.18), ey=(-5.15+(e.lookY||0)*.3)*u;
    const look=(e.lookX||0)+(key==='eat'?.28:key==='drink'?-.12:key==='play'||key==='ball'?.1*Math.sin(t*4):0);
    const drawEye=(kind,s)=>{
      const lx=look*u*.34, ly=(e.lookY||0)*u*.22;
      const line=(pts,w=1,c=.25)=>inkLine(pts.map(([a,b])=>[a*u+lx,b*u+ly]),.72*w,YC.ink,'ink',c);
      if(close>.92 && ['normal','look','wide'].includes(kind)) { line([[-.42,.05],[0,.1],[.42,.05]],1,.45); return; }
      switch(kind){
        case 'happy': line([[-.62,.32],[0,-.28],[.62,.32]],1.15,.4); break;
        case 'wink': line([[-.62,.28],[0,-.22],[.62,.28]],1.15,.4); break;
        case 'closed': line([[-.6,.08],[0,.33],[.6,.08]],1.15,.4); break;
        case 'relieved': line([[-.62,.02],[0,.34],[.62,.02]],1.05,.42); break;
        case 'proud':
          // A lifted, half-lidded gaze reads confident rather than sleepy.
          line([[-.64,.18],[0,-.14],[.64,.18]],1.05,.42);
          line([[-.52,.33],[0,.42],[.52,.33]],.55,.5); break;
        case 'curious':
          // Keep the eye open and round while moving only the pupil.  This
          // avoids the worried, slanted eye produced by shifting the whole
          // dark shape (the previous `look` implementation).
          paint(ellPts(lx,ly,.72*u,.92*u,18),{wash:YC.paper,ink:YC.ink,sw:.62});
          paint(ellPts(lx+.12*u,ly+.12*u,.27*u,.38*u,12),{wash:YC.eye,ink:YC.ink,sw:.35});
          paint(ellPts(lx+.04*u,ly-.12*u,.1*u,.14*u,8),{wash:YC.paper,ink:null}); break;
        case 'sleepy': paint(rectPts(-.45*u+lx,-.1*u+ly,.9*u,.48*u,u*.03),{wash:YC.ink,ink:null}); line([[-.65,.1],[0,.02],[.65,.12]],.9,.35); break;
        case 'narrow': paint(rectPts(-.55*u+lx,-.08*u+ly,1.1*u,.55*u,u*.03),{wash:YC.ink,ink:null}); break;
        case 'sad': case 'teary': {
          const P=[[-.55,s<0?-.12:-.72],[.55,s<0?-.72:-.12],[.55,.62],[-.55,.62]];
          paint(P.map(([a,b])=>[a*u+lx,b*u+ly]),{wash:YC.ink,ink:null});
          if(kind==='teary') paint(ellPts(lx,1.02*u+ly,.42*u,.58*u,12),{wash:'#87C9E6',fill:'#FFFFFF',fillOp:55,ink:YC.ink,sw:.35});
          break;
        }
        case 'cry':
          paint(ellPts(lx,ly,.66*u,.82*u,16),{wash:YC.paper,ink:YC.ink,sw:.56});
          paint(ellPts(lx,ly+.2*u,.25*u,.34*u,10),{wash:YC.eye,ink:YC.ink,sw:.3});
          paint(ellPts(lx-.08*u,ly-.12*u,.1*u,.14*u,8),{wash:YC.paper,ink:null});
          paint(ellPts(lx+s*.2*u,.92*u+ly,.3*u,.46*u,12),{wash:'#87C9E6',fill:'#FFFFFF',fillOp:50,ink:YC.ink,sw:.35}); break;
        case 'squeeze': line([[-.48,-.5],[.48,.5]],1.1,0); line([[.48,-.5],[-.48,.5]],1.1,0); break;
        case 'shine': paint(ellPts(lx,ly,.62*u,1.02*u,16),{wash:YC.ink,ink:null}); paint(ellPts(lx-.2*u,ly-.38*u,.22*u,.3*u,10),{wash:YC.paper,ink:null}); paint(ellPts(lx+.18*u,ly+.35*u,.12*u,.12*u,8),{wash:YC.paper,ink:null}); break;
        case 'scared': paint(ellPts(lx,ly,.8*u,1.02*u,16),{wash:YC.paper,ink:YC.ink,sw:.58}); paint(ellPts(lx,ly+.08*u,.24*u,.34*u,10),{wash:YC.ink,ink:null}); break;
        case 'blank': paint(ellPts(lx,ly,.72*u,.96*u,14),{wash:YC.paper,ink:YC.ink,sw:.58}); break;
        case 'spark': paint(starPts(lx,ly,.9*u,.45,5,t),{wash:YC.heart,ink:YC.ink,sw:.4}); break;
        case 'heart': paint(heartPts(lx,ly,.72*u,18),{wash:YC.heart,fill:'#FFB07D',fillOp:75,ink:YC.ink,sw:.45}); break;
        case 'x': line([[-.48,-.48],[.48,.48]],1,0); line([[.48,-.48],[-.48,.48]],1,0); break;
        case 'swirl': { const sp=[]; for(let i=0;i<14;i++){const a=i*.72+t*4*s,r=i*.07*u;sp.push([lx+Math.cos(a)*r,ly+Math.sin(a)*r]);} inkLine(sp,.5,YC.leafShade,'inkfine',.5); break; }
        case 'dot': paint(ellPts(lx,ly,.32*u,.4*u,12),{wash:YC.ink,ink:null}); break;
        case 'wide': {
          paint(ellPts(lx,ly,.68*u,.98*u,18),{wash:YC.eye,fill:YC.ink,fillOp:40,tex:.45,ink:YC.ink,sw:.72});
          paint(ellPts(lx-.18*u,ly-.32*u,.18*u,.25*u,12),{wash:YC.paper,ink:null}); break;
        }
        default: {
          const wide=e.wide||1;
          paint(ellPts(lx,ly,.56*u*wide,.82*u*wide,18,.025*u),{wash:YC.eye,fill:YC.ink,fillOp:40,tex:.45,ink:YC.ink,sw:.72});
          paint(ellPts(lx-.18*u,ly-.27*u,.16*u,.2*u,12,.01*u),{wash:YC.paper,ink:null});
        }
      }
    };
    for(const s of [-1,1]) { boilSeed('yaya-eye-'+s); push(); translate(s*1.55*u,ey); drawEye(kinds[s<0?0:1],s); pop(); }
    for(const s of [-1,1]) paint(ellPts(s*2.28*u,-3.93*u,.64*u,.43*u,18,.03*u),{wash:YC.cheek,fill:YC.blush,fillOp:95*(e.blush??.22),tex:.5,ink:null});
    const m=e.mouth||'smile', line=(pts,w=.72,c=.5)=>inkLine(pts.map(([a,b])=>[a*u,b*u]),w,YC.ink,'ink',c);
    if(m==='o'||m==='O'||m==='open') paint(ellPts(0,-3.58*u,m==='O'?.5*u:.34*u,m==='O'?.58*u:.42*u,16,.02*u),{wash:m==='O'? '#4A1F2A':YC.ink,ink:YC.ink,sw:.4});
    else if(m==='wide'||m==='grin') { paint(ellPts(0,-3.56*u,m==='grin'?.62*u:.55*u,.3*u,16,.02*u),{wash:YC.ink,ink:null}); inkLine([[-.28*u,-3.55*u],[.28*u,-3.55*u]],.4,YC.paper,'inkfine',.3); }
    else if(m==='small') paint(ellPts(0,-3.55*u,.16*u,.12*u,12,.01*u),{wash:YC.ink,ink:null});
    else if(m==='tinySmile') line([[-.34,-3.58],[0,-3.43],[.34,-3.58]],.58,.42);
    else if(m==='tiny') line([[-.28,-3.58],[0,-3.49],[.28,-3.58]],.58,.5);
    else if(m==='frown') line([[-.5,-3.45],[0,-3.72],[.5,-3.45]],.72,.5);
    else if(m==='flat') line([[-.46,-3.58],[.46,-3.58]],.72,.2);
    else if(m==='wobble') line([[-.7,-3.58],[-.35,-3.78],[0,-3.58],[.35,-3.78],[.7,-3.58]],.6,.3);
    else if(m==='cat') line([[-.65,-3.58],[-.32,-3.35],[0,-3.58],[.32,-3.35],[.65,-3.58]],.62,.5);
    else if(m==='smirk') line([[-.55,-3.55],[.18,-3.5],[.65,-3.78]],.72,.5);
    else if(m==='laugh') { paint(ellPts(0,-3.55,.72*u,.48*u,14),{wash:YC.ink,ink:null}); paint(ellPts(0,-3.3,.38*u,.16*u,10),{wash:YC.cheek,ink:null}); }
    else if(m==='wail') { paint(ellPts(0,-3.55,.82*u,.65*u,14),{wash:'#4A1F2A',ink:YC.ink,sw:.4}); paint(ellPts(0,-3.2,.42*u,.17*u,10),{wash:YC.cheek,ink:null}); }
    else if(m==='tongue') { paint(ellPts(.2*u,-3.4*u,.38*u,.32*u,12),{wash:YC.cheek,ink:YC.ink,sw:.4}); line([[-.65,-3.6],[0,-3.4],[.62,-3.6]],.62,.5); }
    else if(m==='yawn') paint(ellPts(0,-3.55,.52*u,.78*u,14),{wash:'#4A1F2A',ink:YC.ink,sw:.4});
    else line([[-.5,-3.65],[0,-3.43],[.5,-3.65]],.72,.5);
    if(['shy','curious','thinking','nervous'].includes(key)) { line([[-2.15,-6.12],[-1.45,-6.3]],.58,.4); line([[1.45,-6.3],[2.15,-6.12]],.58,.4); }
    if(['sad','cry'].includes(key)) { line([[-2.15,-6.3],[-1.45,-6.1]],.58,.35); line([[1.45,-6.1],[2.15,-6.3]],.58,.35); }
  }
  function badge(u,shine) {
    if(shine>.02) glow(0,-2*u,1.2*u,'#FFC66B',.2*shine);
    paint(heartPts(0,-2.05*u,.48*u,24),{wash:YC.heart,fill:'#FFB07D',fillOp:75,tex:.45,ink:YC.ink,sw:.55});
    for(let i=0;i<8;i++){ const a=i*TAU/8+Math.PI/8;
      inkLine([[Math.cos(a)*.78*u,-2.05*u+Math.sin(a)*.78*u],
        [Math.cos(a)*1.05*u,-2.05*u+Math.sin(a)*1.05*u]],.55,'#E8AA38','inkfine',.35); }
  }
  function pose(age,state) {
    const S=typeof state==='string'?getYayaEmotionState(state,age):state||getYayaEmotionState('idle',age);
    const key=S.state||'idle', e=S.pose||S, direct=typeof state!=='string'&&e.dy!==undefined;
    const p=direct?{dy:e.dy||0,sq:e.sq||0,rot:e.rot||0,left:e.left??.35,right:e.right??.35,dx:e.dx||0,footL:e.footL||0,footR:e.footR||0}:{dy:-.09*Math.sin(age*TAU/2),sq:.025*Math.sin(age*TAU),rot:e.tilt||0,left:.35,right:.35,dx:0,footL:0,footR:0};
    const dir=S.direction||e.direction||1;
    if(direct) { p.dx*=dir; if(key==='reach'){ if(dir<0){p.left=1.12;p.right=-.2;} else {p.left=-.2;p.right=1.12;} } return p; }
    if(key==='cuddle'){p.rot=-.08+.03*Math.sin(age*2.2);p.left=-.28;p.right=-.55;p.dy-=.1;}
    if(key==='sleep'){p.rot=.045*Math.sin(age*1.3);p.left=-.38;p.right=-.42;p.dy=-.03*Math.sin(age*1.6);}
    if(key==='hello'){p.left=1.05+.25*Math.sin(age*TAU*2.2);p.right=.12;}
    if(key==='wave'){p.left=1.05+.3*Math.sin(age*TAU*2.2);p.right=.12;p.rot=.035*Math.sin(age*TAU/2);}
    if(key==='eat'){p.left=.92;p.right=.92;}
    // Daily-care and exercise clips keep the cheek anchors stable while the
    // body, feet and leaves share one readable phase. Front props are layered
    // by the shared arm solver and its palm-owned prop sockets.
    if(key==='drink'){p.left=.28;p.right=.9;p.dy+=.015*Math.sin(age*TAU*1.5);p.rot=.025*Math.sin(age*TAU/2);}
    if(key==='stretch'){const a=Math.sin(age*TAU/1.8);p.left=1.08+.12*a;p.right=1.08-.12*a;p.dy-=.16*Math.abs(Math.sin(age*TAU/1.8));p.sq-=.025;p.rot=.035*a;}
    if(key==='run'){const a=Math.sin(age*TAU/1.1), b=Math.sin(age*TAU*2.2);p.dx=1.15*a;p.dy-=.13*Math.abs(a);p.rot=.1*a;p.sq+=.035*Math.abs(a);p.left=.7+.3*b;p.right=.42-.25*b;p.footL=.38*Math.sin(age*TAU*2.2);p.footR=-p.footL;}
    if(key==='exercise'){const a=Math.sin(age*TAU/1.25), b=Math.sin(age*TAU*2.5);p.dx=.28*a;p.dy-=.24*Math.abs(a);p.rot=.12*a;p.sq+=.045*Math.abs(a);p.left=1+.42*b;p.right=1-.42*b;p.footL=.3*b;p.footR=-.3*b;}
    if(key==='ball'){const a=Math.sin(age*TAU/1.5), b=Math.sin(age*TAU*1.5);p.dx=.2*a;p.dy-=.08*Math.abs(a);p.rot=.06*a;p.left=.72+.34*b;p.right=.35-.16*b;p.footL=.15*Math.max(0,a);p.footR=-.1*Math.max(0,-a);}
    if(key==='dance'){const a=Math.sin(age*TAU/1.35), b=Math.sin(age*TAU*2.7);p.dx=.38*a;p.dy-=.2*Math.abs(a);p.rot=.11*a;p.sq+=.02*Math.abs(b);p.left=.86+.4*b;p.right=.86-.4*b;p.footL=.24*b;p.footR=-.24*b;}
    if(key==='play'){const a=age<1.7?jump(age,.35,1.15,1.35):jump(age,2,2.8,1.35);p.dy+=a.dy;p.sq+=a.sq;p.left=.8+.35*Math.sin(age*9);p.right=.35;}
    if(key==='hug'){p.rot=-.08+.03*Math.sin(age*2.2);p.left=-.28;p.right=-.55;p.dy-=.1;}
    if(key==='jump'){const a=jump(age,.2,.9,1.45);p.dy+=a.dy;p.sq+=a.sq;p.left=1.02;p.right=1.02;}
    if(key==='sway'){const a=Math.sin(age*TAU/1.6);p.dx=.22*a;p.rot=.07*a;p.left=.45+.14*a;p.right=.45-.14*a;}
    // A readable turn-in-place keeps the full silhouette on a learning-device
    // screen; the larger spin can be composed later around a centered rig.
    if(key==='spin'){p.rot=.16*Math.sin(age*TAU/2);p.dx=.12*Math.sin(age*TAU/2);p.left=.62;p.right=.62;p.sq=.025*Math.sin(age*TAU*2);}
    if(key==='walk'){const a=Math.sin(age*TAU/2);p.dx=1.18*a;p.dy-=.09*Math.abs(a);p.left=.35+.18*Math.sin(age*TAU*2);p.right=.35-.18*Math.sin(age*TAU*2);p.footL=.28*Math.sin(age*TAU*2);p.footR=-p.footL;}
    if(key==='reach'){p.left=-.2;p.right=1.12+.14*Math.sin(age*TAU/2);p.dx=.12;}
    if(key==='stomp'){const a=Math.abs(Math.sin(age*TAU*2));p.dy+=.05*a;p.sq+=.09*a;p.left=.18;p.right=.18;p.footL=.35*a;p.footR=.35*a;}
    if(key==='turn'){p.rot=.2*Math.sin(age*TAU/2);p.dx=.12*Math.sin(age*TAU/2);p.left=.4;p.right=.4;}
    if(key==='nod'){const a=Math.sin(age*TAU*2);p.rot=.1*a;p.dy+=.06*Math.abs(a);p.left=.25;p.right=.25;}
    if(key==='celebrate'){const a=Math.sin(age*TAU*2);p.dy-=.34*Math.abs(Math.sin(age*TAU));p.left=1.05+.2*a;p.right=1.05-.2*a;p.sq-=.03;}
    if(key==='curious'){p.left=.92+.12*Math.sin(age*4);p.right=-.15;p.rot=.12+.025*Math.sin(age*TAU/2);p.dy-=.06*Math.abs(Math.sin(age*TAU/2));}
    if(key==='happy'){p.left=.72+.28*Math.sin(age*TAU*2);p.right=.72-.28*Math.sin(age*TAU*2);p.dy-=.5*Math.abs(Math.sin(age*TAU));p.sq+=.06*Math.max(0,Math.cos(age*TAU*2));}
    if(key==='shy'){p.left=-.42+.08*Math.sin(age*3);p.right=-.52;p.dy-=.03*Math.sin(age*2);}
    if(key==='comforted'){p.left=-.4;p.right=-.4;p.dy-=.06*Math.abs(Math.sin(age*TAU/2));}
    if(key==='surprised'){const a=take(age,.2,.9);p.dy+=a.dy;p.sq+=a.sq;p.left=1.1;p.right=1.1;}
    if(key==='sleepy'){p.left=-.35;p.right=-.35;p.dy-=.03*Math.sin(age*1.7);}
    if(key==='excited'){const a=take(age,.15,1);p.dy+=a.dy;p.sq+=a.sq;p.left=1+.45*Math.sin(age*TAU*2);p.right=1-.45*Math.sin(age*TAU*2);}
    if(key==='laugh'){const c=Math.pow(Math.max(0,Math.sin(age*TAU*.55)),2.2);p.dy-=.05*c;p.sq+=.025*c-.012;p.rot=-.025+.012*Math.sin(age*TAU*1.1);p.left=-.34+.035*c;p.right=-.34+.035*c;}
    if(key==='love'){p.rot=.06+.04*Math.sin(age*TAU*.5);p.left=-.22+.12*Math.sin(age*2);p.right=-.22-.12*Math.sin(age*2);p.dy-=.2*Math.abs(Math.sin(age*TAU/2));}
    if(key==='proud'){p.sq-=.08;p.dy-=.2+.08*Math.abs(Math.sin(age*TAU));p.rot=-.03;p.left=-.72;p.right=-.72;}
    if(key==='relieved'){p.sq+=.05*Math.sin(age*TAU*.35);p.dy+=.06-.1*Math.abs(Math.sin(age*TAU/2));p.rot=.04;p.left=-.72;p.right=-.72;}
    if(key==='sad'){p.sq+=.1;p.rot=.07;p.left=-.9;p.right=-.9;p.dy+=.12+.04*Math.sin(age*TAU/2);p.footL=-.08;p.footR=.08;}
    if(key==='cry'){p.sq+=.1*Math.sin(age*TAU*2);p.rot=.05;p.dy+=.06-.12*Math.abs(Math.sin(age*TAU*1.5));p.left=.7+.12*Math.sin(age*TAU*5);p.right=.7-.12*Math.sin(age*TAU*5);}
    if(key==='confused'){p.rot=.09*Math.sin(age*TAU*.45);p.left=.12;p.right=1.18+.12*Math.sin(age*TAU*2.5);p.dy-=.06*Math.abs(Math.sin(age*TAU/2));}
    if(key==='thinking'){p.rot=.05;p.left=-.28+.22*Math.sin(age*TAU*.45);p.right=.75;p.dy-=.04*Math.abs(Math.sin(age*TAU/2));}
    if(key==='idea'){p.left=.16+.2*Math.sin(age*TAU);p.right=1.22+.1*Math.sin(age*TAU*2);p.dy-=.26*Math.abs(Math.sin(age*TAU));p.sq-=.03;}
    if(key==='bored'){p.left=-.8+.04*Math.sin(age*2);p.right=-.8-.04*Math.sin(age*2);p.sq+=.03-.08*Math.abs(Math.sin(age*TAU/2));}
    if(key==='nervous'){p.left=-.05+.18*Math.sin(age*TAU*5);p.right=-.05+.18*Math.sin(age*TAU*5+1);p.dx=.14*Math.sin(age*TAU*2);}
    if(key==='dizzy'){p.rot=.1*Math.sin(age*TAU*.8);p.dy-=.14*Math.abs(Math.cos(age*TAU*.8));p.left=.28+.5*Math.sin(age*TAU*1.04);p.right=.28-.5*Math.sin(age*TAU*1.04);}
    if(key==='playful'){const k=Math.sin(age*TAU/2);p.dx=.35*k;p.dy-=.32*Math.abs(Math.sin(age*TAU));p.rot=.08*k;p.left=.55+.38*k;p.right=.55-.38*k;}
    if(key==='hopeful'){p.sq-=.04;p.dy-=.14*Math.abs(Math.sin(age*TAU/2));p.left=-.18+.08*Math.sin(age*TAU*1.4);p.right=-.18-.08*Math.sin(age*TAU*1.4);}
    if(key==='angry'){const a=Math.sin(age*TAU*.35);p.dx=.15*a;p.rot=.12+.035*a;p.sq+=.025*Math.abs(a);p.left=-.46;p.right=-.46;}
    if(key==='furious'){p.dx=.08*Math.sin(age*TAU*10);p.sq+=.08*Math.abs(Math.sin(age*TAU*4));p.left=.3;p.right=.3;}
    if(key==='scared'){p.sq-=.04;p.left=1.02+.08*Math.sin(age*TAU*12);p.right=1.02+.08*Math.sin(age*TAU*13);p.dx=.08*Math.sin(age*TAU*18);}
    if(key==='determined'){p.rot=.04;p.left=.2+.65*Math.abs(Math.sin(age*TAU/2));p.right=.2+.65*Math.abs(Math.cos(age*TAU/2));p.dy-=.1*Math.abs(Math.sin(age*TAU));}
    if(key==='cool'){p.rot=.03;p.left=-.35;p.right=.7+.1*Math.sin(age*TAU);}
    if(key==='starstruck'){p.left=1.05+.3*Math.sin(age*TAU*2);p.right=1.05-.3*Math.sin(age*TAU*2);p.dy-=.45*Math.abs(Math.sin(age*TAU));}
    if(key==='ko'){p.sq+=.08+.04*Math.sin(age*TAU*.4);p.rot=.08;p.left=-.75;p.right=-.75;}
    if(key==='mischief'){const r=Math.sin(age*TAU*1.4);p.left=-.05+.1*r;p.right=-.05-.1*r;p.rot=.08*r;p.dy-=.04*Math.abs(r);}
    return p;
  }
  function moodColors(e) {
    const tint={pale:'#F1E6D7',blue:'#9ACAE7',rosy:'#EF8EA8',gold:'#F0BE46',green:'#A8CE8B'}[e.tint];
    if(!tint||!(e.tintK>0)) return {body:YC.body,light:YC.light,shade:YC.shade};
    const k=.48*clamp(e.tintK);
    return {body:mixCol(YC.body,tint,k),light:mixCol(YC.light,tint,k*.7),shade:mixCol(YC.shade,tint,k)};
  }
  function yayaEmote(kind,x,y,u,k=1,age=0) {
    if(!kind) return; const p=backOut(k); if(p<.02) return;
    const s=u*.9, sw=clamp(s/15,.4,2), P=pts=>pts.map(([a,b])=>[a*s,b*s]);
    push(); translate(x,y); scale(p);
    const dot=(dx,dy=1.1,col=YC.heart)=>paint(ellPts(dx*s,dy*s,.28*s,.28*s,12),{wash:col,ink:YC.ink,sw:sw*.6});
    if(kind==='!'){ inkLine([[0,-2.2*s],[0,.35*s]],sw,YC.heart,'ink',.4); dot(0,1.1,YC.heart); }
    else if(kind==='?'){ inkLine(P([[-.55,-1.4],[-.15,-2.05],[.55,-1.75],[.35,-.7],[0,-.25]]),sw,YC.leafShade,'ink',.4); dot(0,1.05,YC.leafShade); }
    else if(kind==='zzz'){ for(let i=0;i<3;i++){const ph=frac(age*.38+i/3), a=Math.sin(ph*Math.PI); if(a<.08) continue; const z=.55+ph*.55; push(); translate((i-1)*.8*s,-ph*3.2*s); rotate(-.1); inkLine(P([[-.55,-.5],[.55,-.5],[-.45,.5],[.55,.5]]),sw*.75,YC.mint,'ink',.3); pop();} }
    else if(kind==='sweat'){ for(const [dx,dy] of [[0,0],[1.35,.9]]) paint(P([[dx,dy-1.1],[dx+.55,dy],[dx,dy+.7],[dx-.55,dy]]),{wash:'#8CCCE8',fill:'#FFFFFF',fillOp:60,ink:YC.ink,sw:sw*.5,curv:.7}); }
    else if(kind==='spark'){ const tw=1+.12*Math.sin(age*12); paint(starPts(0,0,1.45*s*tw,.4,5,age*2),{wash:YC.paper,fill:'#FFC66B',fillOp:85,ink:YC.ink,sw:sw*.45}); paint(starPts(1.9*s,1.1*s,.62*s,.4,5,age*2),{wash:YC.heart,ink:YC.ink,sw:sw*.35}); }
    else if(kind==='heart'){ paint(heartPts(0,0,1.5*s*(1+.12*pulse(age))),{wash:YC.heart,fill:'#FFB07D',fillOp:85,ink:YC.ink,sw:sw*.45}); }
    else if(kind==='hearts'){ for(let i=0;i<3;i++){const ph=frac(age*.55+i/3), a=Math.sin(ph*Math.PI); if(a<.1) continue; paint(heartPts((Math.sin(ph*6+i*2)*.7+i*.7-.7)*s,-ph*3.2*s,s*(.36+.45*a)),{wash:YC.heart,fill:'#FFB07D',fillOp:85,ink:YC.ink,sw:sw*.4});} }
    else if(kind==='bulb'){ glow(0,-1.25*s,3.2*s,'#FFD27A',.7+.2*Math.sin(age*10)); paint(ellPts(0,-1.25*s,1.05*s,1.1*s,16),{wash:'#FFE68A',fill:YC.paper,fillOp:90,ink:YC.ink,sw:sw*.5}); inkLine([[-.45*s,.15*s],[.45*s,.15*s]],sw*.6,YC.leafShade,'ink',0); }
    else if(kind==='dots'){ for(let i=0;i<3;i++){const ph=frac(age/1.8), q=backOut(clamp((ph-i*.22)*6)); if(q<.02) continue; paint(ellPts((i-1)*1.1*s,0,.3*s*q,.3*s*q,10),{wash:YC.ink,ink:null});} }
    else if(kind==='music'){ for(let i=0;i<2;i++){const yy=Math.sin(age*5+i)*.28*s, xx=(i?1.5:-.7)*s; paint(ellPts(xx,1.05*s+yy,.38*s,.28*s,10),{wash:YC.heart,ink:YC.ink,sw:sw*.35}); inkLine([[xx+.32*s,1.05*s+yy],[xx+.32*s,-1.25*s+yy],[xx+1*s,-.7*s+yy]],sw*.65,YC.ink,'ink',0);} }
    else if(kind==='stars'){ for(let i=0;i<3;i++){const a=age*4+i*TAU/3; paint(starPts(Math.cos(a)*3.2*s,Math.sin(a)*.75*s,.55*s,.4,5,age*2),{wash:'#FFC66B',fill:YC.paper,fillOp:60,ink:YC.ink,sw:sw*.4});} }
    else if(kind==='cloud'){ const c=[]; for(let i=0;i<24;i++){const a=i/24*TAU; c.push([Math.cos(a)*2.2*s,Math.sin(a)*.8*s-.2*s]);} paint(c,{wash:'#B4C2D4',fill:'#A3A8C4',fillOp:55,ink:YC.ink,sw:sw*.5,curv:.4}); for(let i=0;i<4;i++){const ph=frac(age*1.5+i*.2); inkLine([[(i-1.5)*.8*s,.65*s+ph*.7*s],[(i-1.5)*.8*s,.95*s+ph*.7*s]],sw*.65,'#8CCCE8','ink',0);} }
    else if(kind==='odor'){ for(const sd of [-1,0,1]){const ph=age*1.6+sd*.7, xx=sd*1.1*s, pts=[]; for(let i=0;i<12;i++){const q=i/11; pts.push([xx+Math.sin(ph+q*TAU)*.22*s,(.6-q*2.4)*s]);} inkLine(pts,sw*.55,YC.leafShade,'inkfine',.3);} }
    else if(kind==='steam'){ for(const sd of [-1,1]) for(let j=0;j<2;j++){const ph=frac(age/.9+j*.5+(sd>0?.25:0)), r=(.35+ph*.55)*s, cx=sd*(1.8+ph*1.2)*s, cy=(.2-ph*2.8)*s, pts=[]; for(let i=0;i<14;i++){const a=i/14*TAU; pts.push([cx+Math.cos(a)*r*(1+.16*Math.abs(Math.sin(a*2.5))),cy+Math.sin(a)*r*.8]);} paint(pts,{wash:'#FFD59A',washOp:220*(1-ph*.75),ink:ph<.6?YC.ink:null,sw:sw*.35});} }
    pop();
  }
  function flatPoly(points, fillCol, strokeCol=YC.ink, sw=3) {
    push(); fill(fillCol); if(strokeCol){stroke(strokeCol);strokeWeight(sw);}else noStroke(); strokeJoin(ROUND); beginShape();
    points.forEach(([px,py])=>vertex(px,py)); endShape(CLOSE); pop();
  }
  function flatLine(points, col=YC.ink, sw=3) {
    push(); noFill(); stroke(col); strokeWeight(sw); strokeJoin(ROUND); beginShape();
    points.forEach(([px,py])=>vertex(px,py)); endShape(); pop();
  }
  function flatEllipse(cx,cy,rx,ry,fillCol,strokeCol=YC.ink,sw=3) {
    push(); fill(fillCol); if(strokeCol){stroke(strokeCol);strokeWeight(sw);} else noStroke(); ellipse(cx,cy,rx*2,ry*2); pop();
  }
  function flatHeart(cx,cy,r,fillCol=YC.heart,sw=2) { flatPoly(heartPts(cx,cy,r,28),fillCol,YC.ink,sw); }
  function flatStar(cx,cy,r,fillCol='#FFD45A',sw=2) { flatPoly(starPts(cx,cy,r,.42,5,-Math.PI/2),fillCol,YC.ink,sw); }
  // The flat renderer still uses the same pose vocabulary as the textured
  // renderer. Keeping these helpers small makes arm/foot motion readable at
  // learning-device scale without introducing a second rig.
  function flatFoot(u,side,bob=0,cols={}) {
    const s=side<0?-1:1, shade=cols.shade||YC.shade;
    push(); translate(s*1.35*u,-.38*u+bob); rotate(s*.04);
    flatEllipse(0,0,1.34*u,.66*u,shade,YC.ink,2.1); pop();
  }
  // One solved band and one constant-radius palm per side. Shoulder edges
  // stay open; wrist edges overlap the palm for every target direction.
  function drawRigArm(u,arm,cols={},paper=false,parts={arm:true,palm:true}) {
    const P=pts=>pts.map(([x,y])=>[x*u,y*u]), ink=YC.ink;
    const handFill=mixCol(cols.light||YC.light,'#FFF8D6',.48);
    if(parts.arm!==false) {
      if(paper) {
        paint(P(arm.band),{wash:cols.body||YC.body,fill:cols.light||YC.light,fillOp:70,ink:null,curv:0});
        arm.edges.forEach(edge=>inkLine(P(edge),.62,ink,'ink',0));
      } else {
        flatPoly(P(arm.band),cols.body||YC.body,null,0);
        arm.edges.forEach(edge=>flatLine(P(edge),ink,2.5));
      }
    }
    if(parts.palm===false) return;
    push(); translate(arm.palm[0]*u,arm.palm[1]*u); rotate(arm.angle);
    if(paper) paint(ellPts(0,0,arm.radius*u,arm.radius*u,24,0),{wash:handFill,fill:cols.light||YC.light,fillOp:45,ink,sw:.75,curv:.35});
    else flatEllipse(0,0,arm.radius*u,arm.radius*u,handFill,ink,2.8);
    const detail=(points,w=1.25)=>paper?inkLine(P(points),w*.4,ink,'inkfine',.2):flatLine(P(points),ink,w);
    if(['grip','fist','seams'].includes(arm.gesture)) {
      detail([[-.22,-.1],[.16,-.15]]); detail([[-.15,.1],[.16,.08]],1.05);
    } else if(arm.gesture==='fingers') {
      detail([[-.22,-.24],[-.2,-.38]],1);detail([[0,-.27],[0,-.42]],1);detail([[.2,-.24],[.22,-.38]],1);
    } else if(arm.gesture==='point') detail([[-.02,-.16],[.06,-.42]],1.2);
    pop();
  }
  // Props are children of the solved palm socket. They are drawn after the
  // arm band but BEFORE its palm, so the fingers naturally cover the grip.
  function drawRigProps(u,key,age,arms,cols={},paper=false) {
    const P=pts=>pts.map(([x,y])=>[x*u,y*u]), ink=YC.ink;
    const shape=(points,col,sw=2)=>paper?paint(P(points),{wash:col,fill:col,fillOp:85,ink,sw:sw*.3,curv:0}):flatPoly(P(points),col,ink,sw);
    const lineAt=(points,col=ink,sw=2)=>paper?inkLine(P(points),sw*.28,col,'inkfine',.2):flatLine(P(points),col,sw);
    const oval=(x,y,rx,ry,col,sw=2)=>paper?paint(ellPts(x*u,y*u,rx*u,ry*u,24,0),{wash:col,fill:col,fillOp:75,ink:sw?ink:null,sw:sw*.3}):flatEllipse(x*u,y*u,rx*u,ry*u,col,sw?ink:null,sw);
    const prop=YayaRig.propPose(key,age,arms);
    if(prop) {
      push();translate(prop.grip[0]*u,prop.grip[1]*u);rotate(prop.angle);
      if(prop.kind==='spoon') {
        // The handle begins inside the hand, not at a second shoulder/arm.
        shape([[-.12,-.085],[1.03,-.085],[1.03,.085],[-.12,.085]],'#91BDD0',1.7);
        oval(1.04,0,.3,.22,'#D3EBF5',1.9);
        if(prop.foodK>.01) oval(1.04,-.085,.16*prop.foodK,.13*prop.foodK,'#FFB75B',1.1);
      } else {
        // Handle joins the cup and is occluded by the one true round palm.
        oval(-.1,.02,.32,.28,'#BCEEFF',2);
        oval(-.1,.02,.18,.14,cols.light||YC.light,0);
        shape([[-1.06,-.48],[-.22,-.48],[-.29,.46],[-.99,.46]],'#8ED8EE',2.2);
        oval(-.64,-.48,.42,.11,'#D9F6FF',1.6);
        lineAt([[-.89,-.02],[-.39,-.02]],'#4AA9CC',1.7);
      }
      pop();
      if(key==='eat') {
        // A stationary bowl gives the scoop/lift/bite/return cycle context.
        oval(-2.15,-1.12,.67,.18,'#FFF9DB',1.8);
        shape([[-2.82,-1.12],[-2.62,-.59],[-1.68,-.59],[-1.48,-1.12]],'#FF9D81',2);
        oval(-2.15,-1.12,.62,.15,'#FFF9DB',1.5);
        for(const x of [-2.47,-2.15,-1.85]) oval(x,-1.17,.15,.09,'#FFE294',0);
      }
    } else if(key==='exercise') {
      for(const arm of arms) {
        push();translate(arm.sockets.grip[0]*u,arm.sockets.grip[1]*u);rotate(arm.angle);
        shape([[-.86,-.1],[.86,-.1],[.86,.1],[-.86,.1]],'#88B7C8',1.8);
        for(const side of [-1,1]) {
          oval(side*.85,0,.2,.39,'#FFAB6E',2);
          oval(side*1.01,0,.13,.29,'#FFD56A',1.6);
        }
        pop();
      }
    } else if(key==='ball') {
      const q=.5+.5*Math.sin(age*TAU/2),bx=3.4,by=-.73-1.55*q;
      oval(bx,by,.66,.66,'#FF8A74',2.4);
      lineAt([[bx-.42,by-.26],[bx+.42,by+.22]],'#FFE89A',2.4);
      lineAt([[bx-.1,by-.62],[bx+.12,by+.6]],'#FFE89A',1.4);
    } else if(key==='run') {
      lineAt([[-2.8,.76],[-1.7,.76]],'#74C9B4',2.2);
      lineAt([[-3.1,.48],[-2.2,.48]],'#74C9B4',1.7);
    } else if(key==='dance'&&!paper) {
      const a=Math.sin(age*TAU/2);flatStar((a>0?3.6:-3.6)*u,-6.6*u,.26*u,'#FFD45A',1.3);
    }
  }
  function drawRigLayer(u,arms,layer,cols={},paper=false,parts) {
    arms.filter(arm=>arm.layer===layer).forEach(arm=>drawRigArm(u,arm,cols,paper,parts));
  }
  function actionFace(S,key,age) {
    if(key!=='eat'&&key!=='drink') return S;
    const q=YayaRig.actionCycle(key,age),face={...(S.face||S)};
    face.mouth=q.mouthOpen>.25?(key==='eat'?'open':'o'):q.chew>.25?'puff':'smile';
    return {...S,face};
  }
  function flatLeaf(u,side,drift,lp={}) { push(); translate(0,-6.9*u+(lp.dy||0)*u); rotate(lp.rot||0); scale(lp.sx||1,lp.sy||1); flatPoly(leaf(u,side,drift),YC.leaf,YC.ink,3); flatLine([[0,0],[side<0?-2.15*u:2.15*u,-2.65*u]],YC.leafShade,2); pop(); }
  function flatFace(u,t,S) {
    const e=S.face||S, key=S.state||'idle', kinds=Array.isArray(e.eyes)?e.eyes:e.eyes==='wink'?['happy','wink']:[e.eyes||'normal',e.eyes||'normal'];
    const cheekCol=mixCol(moodColors(e).body,YC.blush,clamp(e.blush??.22));
    const look=(e.lookX||0)*u*.36, ey=(-5.15+(e.lookY||0)*.3)*u, close=e.closed??e.half??blink(t,.18);
    for(const s of [-1,1]) {
      const ex=s*1.55*u+look, kind=kinds[s<0?0:1]; push(); translate(ex,ey);
      if(close>.92 && ['normal','look','wide'].includes(kind)) flatLine([[-.42*u,.05*u],[0,.1*u],[.42*u,.05*u]],YC.ink,2.8);
      else if(kind==='happy'||kind==='closed') flatLine([[-.62*u,.28*u],[0,-.25*u],[.62*u,.28*u]],YC.ink,3);
      else if(kind==='laugh') { flatLine([[-.68*u,.34*u],[0,-.32*u],[.68*u,.34*u]],YC.ink,3.2); flatLine([[-.42*u,.16*u],[0,.03*u],[.42*u,.16*u]],YC.ink,1.4); }
      else if(kind==='wink') flatLine([[-.68*u,.28*u],[0,-.22*u],[.68*u,.28*u]],YC.ink,3.1);
      else if(kind==='relieved') flatLine([[-.62*u,.02*u],[0,.34*u],[.62*u,.02*u]],YC.ink,2.8);
      else if(kind==='proud') {
        // Half-open upward gaze: pride should not collapse into the same
        // closed-eye smile used by relief.
        flatEllipse(0,.16*u,.66*u,.58*u,YC.eye,YC.ink,2.1);
        flatLine([[-.68*u,-.16*u],[0,-.36*u],[.68*u,-.16*u]],YC.ink,2.6);
        flatEllipse(-.14*u,-.04*u,.11*u,.13*u,YC.paper,null,0);
      }
      else if(kind==='curious') {
        flatEllipse(0,0,.72*u,.92*u,YC.paper,YC.ink,2.4);
        flatEllipse(.12*u,.12*u,.27*u,.38*u,YC.eye,YC.ink,1.2);
        flatEllipse(.04*u,-.12*u,.1*u,.14*u,YC.paper,null,0);
      }
      else if(kind==='look') {
        // Side-eye moves only the pupil; the white eye stays round and calm.
        flatEllipse(0,0,.68*u,.86*u,YC.paper,YC.ink,2.3);
        flatEllipse((e.lookX||0)*.22*u,(e.lookY||0)*.16*u,.25*u,.34*u,YC.eye,YC.ink,1.1);
        flatEllipse((e.lookX||0)*.22*u-.07*u,(e.lookY||0)*.16*u-.13*u,.09*u,.12*u,YC.paper,null,0);
      }
      else if(kind==='shine') {
        flatEllipse(0,0,.67*u,.94*u,YC.eye,YC.ink,2.2);
        flatEllipse(-.18*u,-.3*u,.2*u,.28*u,YC.paper,null,0);
        flatEllipse(.18*u,.28*u,.11*u,.13*u,YC.paper,null,0);
      }
      else if(kind==='wide') {
        flatEllipse(0,0,.74*u,1.03*u,YC.paper,YC.ink,2.4);
        flatEllipse((e.lookX||0)*.18*u,(e.lookY||0)*.16*u,.26*u,.37*u,YC.eye,YC.ink,1.1);
        flatEllipse(-.1*u,-.35*u,.1*u,.14*u,YC.paper,null,0);
      }
      else if(kind==='normal') {
        flatEllipse(0,0,.57*u,.82*u,YC.eye,YC.ink,2.2);
        flatEllipse(-.17*u,-.28*u,.16*u,.2*u,YC.paper,null,0);
      }
      else if(kind==='sleepy') { flatLine([[-.6*u,.1*u],[0,.02*u],[.6*u,.12*u]],YC.ink,2.6); }
      else if(kind==='squeeze') {
        // Pinched, asymmetric lids read as disgust; reserve X eyes for KO/dizzy.
        flatLine([[-.62*u,.08*u],[-.2*u,-.12*u],[.22*u,.1*u],[.62*u,-.02*u]],YC.ink,2.8);
        flatLine([[-.35*u,.22*u],[.35*u,.22*u]],YC.ink,1.3);
      }
      else if(kind==='heart') flatHeart(0,0,.62*u,YC.heart,2);
      else if(kind==='spark') flatStar(0,0,.7*u,YC.heart,2);
      else if(kind==='swirl') { const pts=[]; for(let i=0;i<14;i++){const a=i*.72+t*4*s,r=i*.065*u;pts.push([Math.cos(a)*r,Math.sin(a)*r]);} flatLine(pts,YC.leafShade,2.4); }
      else if(kind==='narrow') {
        flatEllipse(0,0,.62*u,.34*u,YC.eye,YC.ink,2);
        if(key==='suspicious'||key==='cool') flatEllipse((e.lookX||0)*.26*u,-.02*u,.1*u,.08*u,YC.paper,null,0);
      }
      else if(kind==='x') { flatLine([[-.45*u,-.45*u],[.45*u,.45*u]],YC.ink,3); flatLine([[.45*u,-.45*u],[-.45*u,.45*u]],YC.ink,3); }
      else if(kind==='sad') {
        flatEllipse(0,.04*u,.66*u,.8*u,YC.paper,YC.ink,2.2);
        flatEllipse(0,.22*u,.24*u,.32*u,YC.eye,YC.ink,1.1);
        flatEllipse(-.08*u,.1*u,.1*u,.13*u,YC.paper,null,0);
        const tearY=.84*u+.08*u*Math.sin(t*3+s);
        flatPoly([[s*.18*u,tearY-.24*u],[s*.38*u,tearY],[s*.18*u,tearY+.34*u],[s*-.02*u,tearY]],'#9AD8EE',YC.ink,0.8);
      }
      else if(kind==='cry') {
        flatEllipse(0,.04*u,.66*u,.8*u,YC.paper,YC.ink,2.2);
        flatEllipse(0,.22*u,.24*u,.32*u,YC.eye,YC.ink,1.1);
        flatEllipse(-.08*u,.1*u,.1*u,.13*u,YC.paper,null,0);
        const tearY=.82*u+.12*u*Math.sin(t*5+s);
        flatPoly([[s*.18*u,tearY-.3*u],[s*.42*u,tearY],[s*.18*u,tearY+.42*u],[s*-.06*u,tearY]],'#8ED3ED',YC.ink,1.1);
      }
      else if(kind==='scared') { flatEllipse(0,0,.82*u,1.03*u,YC.paper,YC.ink,2.5); flatEllipse(0,.08*u,.23*u,.35*u,YC.eye,YC.ink,1.5); }
      else { const wide=(e.wide||1)*(kind==='wide'?1.18:1); flatEllipse(0,0,.57*u*wide,.82*u*wide,YC.eye,YC.ink,2.2); flatEllipse(-.17*u,-.28*u,.16*u,.2*u,YC.paper,null,0); }
      pop();
    }
    const puff=e.mouth==='puff' ? .18+.06*Math.abs(Math.sin(t*TAU*.7)) : 0;
    for(const s of [-1,1]) flatEllipse(s*2.28*u,-3.93*u,.64*u+puff*u,.43*u+puff*u*.65,cheekCol,null,0);
    const m=e.mouth||'smile', y=-3.58*u;
    if(m==='o'||m==='O'||m==='yawn') flatEllipse(0,y,m==='O'?.48*u:.34*u,m==='yawn'?.62*u:.42*u,YC.ink,YC.ink,1.5);
    else if(m==='open') { flatEllipse(0,y,.5*u,.5*u,YC.ink,YC.ink,1.5); flatLine([[-.34*u,y-.2*u],[.34*u,y-.2*u]],YC.paper,2); flatEllipse(0,y+.2*u,.25*u,.11*u,YC.cheek,null,0); }
    else if(m==='puff') flatEllipse(0,y,.24*u,.3*u,YC.ink,YC.ink,1.4);
    else if(m==='wide'||m==='grin') flatEllipse(0,y,m==='grin'?.62*u:.55*u,.3*u,YC.ink,YC.ink,1.5);
    else if(m==='laugh') { flatEllipse(0,y,.68*u,.38*u,YC.ink,YC.ink,1.5); flatLine([[-.46*u,y-.1*u],[.46*u,y-.1*u]],YC.paper,2.1); flatEllipse(0,y+.2*u,.26*u,.1*u,YC.cheek,null,0); }
    else if(m==='flat') flatLine([[-.46*u,y],[.46*u,y]],YC.ink,2.6);
    else if(m==='tinySmile') flatLine([[-.34*u,y],[0,y+.15*u],[.34*u,y]],YC.ink,2.2);
    else if(m==='small') flatEllipse(0,y,.17*u,.12*u,YC.ink,YC.ink,1.2);
    else if(m==='smile') flatLine([[-.5*u,y-.03*u],[0,y+.2*u],[.5*u,y-.03*u]],YC.ink,2.7);
    else if(m==='frown') flatLine([[-.5*u,y+.18*u],[0,y-.16*u],[.5*u,y+.18*u]],YC.ink,2.7);
    else if(m==='wail') { flatEllipse(0,y,.82*u,.65*u,YC.ink,YC.ink,1.5); flatEllipse(0,y+.35*u,.42*u,.17*u,YC.cheek,null,0); }
    else if(m==='wobble') flatLine([[-.7*u,y],[-.35*u,y+.2*u],[0,y],[.35*u,y+.2*u],[.7*u,y]],YC.ink,2.4);
    else if(m==='cat') flatLine([[-.65*u,y],[-.32*u,y+.23*u],[0,y],[.32*u,y+.23*u],[.65*u,y]],YC.ink,2.4);
    else if(m==='smirk') flatLine([[-.55*u,y],[.18*u,y+.03*u],[.65*u,y-.22*u]],YC.ink,2.5);
    else if(m==='tongue') { flatLine([[-.65*u,y],[0,y+.2*u],[.62*u,y]],YC.ink,2.3); flatEllipse(.2*u,y+.12*u,.3*u,.23*u,YC.cheek,YC.ink,1.3); }
    else flatLine([[-.5*u,y],[0,y-.2*u],[.5*u,y]],YC.ink,2.7);
    if(['shy','thinking','nervous'].includes(key)){ flatLine([[-2.15*u,-6.12*u],[-1.45*u,-6.3*u]],YC.ink,2.2); flatLine([[1.45*u,-6.3*u],[2.15*u,-6.12*u]],YC.ink,2.2); }
    if(key==='curious'){
      // Curiosity lifts the outer brow, while sadness lifts the inner brow.
      flatLine([[-2.18*u,-6.5*u],[-1.42*u,-6.25*u]],YC.ink,2.4);
      flatLine([[1.42*u,-6.25*u],[2.18*u,-6.5*u]],YC.ink,2.4);
    }
    if(['sad','cry'].includes(key)){ flatLine([[-2.15*u,-6.1*u],[-1.45*u,-6.5*u]],YC.ink,2.5); flatLine([[1.45*u,-6.5*u],[2.15*u,-6.1*u]],YC.ink,2.5); }
    if(key==='proud'){ flatLine([[-2.18*u,-6.48*u],[-1.45*u,-6.3*u]],YC.ink,2.1); flatLine([[1.45*u,-6.3*u],[2.18*u,-6.48*u]],YC.ink,2.1); }
    if(['angry','furious'].includes(key)){
      // Inner brow pressure is the primary cartoon anger cue.
      flatLine([[-2.18*u,-6.5*u],[-1.45*u,-6.08*u]],YC.ink,2.8);
      flatLine([[1.45*u,-6.08*u],[2.18*u,-6.5*u]],YC.ink,2.8);
    }
    if(key==='determined'){
      flatLine([[-2.15*u,-6.34*u],[-1.45*u,-6.22*u]],YC.ink,2.4);
      flatLine([[1.45*u,-6.22*u],[2.15*u,-6.34*u]],YC.ink,2.4);
    }
    if(key==='suspicious') flatLine([[-2.18*u,-6.52*u],[-1.45*u,-6.12*u]],YC.ink,2.5);
    if(key==='bored'){
      flatLine([[-2.15*u,-6.2*u],[-1.45*u,-6.18*u]],YC.ink,2);
      flatLine([[1.45*u,-6.18*u],[2.15*u,-6.2*u]],YC.ink,2);
    }
    if(key==='cool') flatLine([[-2.18*u,-6.16*u],[-1.45*u,-6.42*u]],YC.ink,2.2);
  }
  function flatEmote(kind,x,y,u,age) {
    if(!kind) return; const s=u*.9;
    if(kind==='spark'){flatStar(x,y,.9*s,'#FFD45A',2);flatStar(x+1.8*s,y+1.1*s,.45*s,YC.heart,1.5);}
    else if(kind==='heart') flatHeart(x,y,1.4*s,YC.heart,2);
    else if(kind==='hearts') for(let i=0;i<3;i++){const a=age*.7+i*TAU/3;flatHeart(x+Math.cos(a)*2.8*s,y+Math.sin(a)*.35*s-2.2*s,.35*s,YC.heart,1.4);}
    else if(kind==='stars') for(let i=0;i<3;i++){const a=age*4+i*TAU/3;flatStar(x+Math.cos(a)*3.5*s,y+Math.sin(a)*.8*s,.55*s,'#FFD45A',1.5);}
    else if(kind==='dots') {
      const phase=frac(age*.8)*4;
      for(let i=0;i<3;i++){
        const q=clamp(phase-i), k=q<.12?0:.78+.22*Math.sin(Math.min(1,q)*Math.PI);
        flatEllipse(x+(i-1)*.95*s,y-i*.22*s,.25*s*k,.25*s*k,YC.ink,null,0);
      }
    }
    else if(kind==='zzz') for(let i=0;i<3;i++) flatLine([[x+(i-1)*.75*s,y-i*.5*s],[x+(i-1)*.75*s+.45*s,y-i*.5*s],[x+(i-1)*.75*s-.35*s,y+.35*s-i*.5*s],[x+(i-1)*.75*s+.45*s,y+.35*s-i*.5*s]],'#73B7CF',2);
    else if(kind==='!') {flatLine([[x,y-1.8*s],[x,y+.2*s]],YC.heart,3);flatEllipse(x,y+.7*s,.18*s,.18*s,YC.heart,null,0);}
    else if(kind==='?') {flatLine([[x-.55*s,y-.95*s],[x,y-1.55*s],[x+.55*s,y-.95*s],[x+.2*s,y-.05*s]],YC.leafShade,3.4);flatEllipse(x+.06*s,y+.62*s,.22*s,.22*s,YC.leafShade,null,0);}
    else if(kind==='question') {const q=1.12+.12*Math.sin(age*TAU*.7);flatLine([[x-.62*s*q,y-1.05*s*q],[x,y-1.7*s*q],[x+.62*s*q,y-1.05*s*q],[x+.22*s*q,y-.08*s*q]],YC.leafShade,4.2);flatEllipse(x+.08*s*q,y+.62*s*q,.25*s*q,.25*s*q,YC.leafShade,null,0);}
    else if(kind==='bulb'){
      const q=.5+.5*Math.sin(age*TAU*1.15), k=.88+.22*q;
      flatEllipse(x,y-1.0*s-.38*s*q,.72*s*k,.78*s*k,'#FFE268',YC.ink,2);
      flatLine([[x-.3*s,y-.12*s-.38*s*q],[x+.3*s,y-.12*s-.38*s*q]],YC.leafShade,2);
      flatLine([[x-.25*s,y+.08*s],[x+.25*s,y+.08*s]],YC.leafShade,2);
      for(const side of [-1,1]) flatLine([[x+side*.8*s,y-1.05*s-.38*s*q],[x+side*1.12*s,y-1.25*s-.38*s*q]],'#FFD45A',2.2);
    }
    else if(kind==='sweat'){flatPoly([[x,y-.9*s],[x+.42*s,y],[x,y+.52*s],[x-.42*s,y]],'#8ED3ED',YC.ink,1.4);}
    else if(kind==='music'){flatEllipse(x,y,.35*s,.25*s,YC.heart,YC.ink,1.5);flatLine([[x+.28*s,y],[x+.28*s,y-1.4*s],[x+.95*s,y-.95*s]],YC.ink,2);}
    else if(kind==='cloud'){
      flatEllipse(x,y,.95*s,.48*s,'#B5C4D6',YC.ink,1.8);
      flatEllipse(x-.62*s,y-.22*s,.58*s,.52*s,'#B5C4D6',YC.ink,1.6);
      flatEllipse(x+.48*s,y-.2*s,.62*s,.58*s,'#B5C4D6',YC.ink,1.6);
      for(let i=0;i<3;i++){
        const xx=x+(i-1)*.72*s, yy=y+.58*s+Math.sin(age*3+i)*.12*s;
        flatLine([[xx,yy],[xx,yy+.42*s]],'#8ED3ED',2);
      }
    }
    else if(kind==='odor'){
      // Three small drifting wisps make disgust distinct from sadness' rain cloud.
      for(let i=0;i<3;i++){
        const xx=x+(i-1)*.7*s, yy=y+Math.sin(age*3+i)*.12*s;
        flatLine([[xx,yy+.55*s],[xx-.16*s,yy],[xx+.05*s,yy-.55*s]],YC.leafShade,2.1);
      }
    }
    else if(kind==='huff'){
      const q=.5+.5*Math.sin(age*TAU*.8);
      flatEllipse(x+1.05*s,y-.15*s,.55*s*q,.32*s*q,'#D6E0E8',YC.ink,1.2);
      flatEllipse(x+1.6*s,y-.55*s,.34*s*q,.22*s*q,'#D6E0E8',YC.ink,1.1);
    }
    else if(kind==='vein'){
      const q=.72+.28*Math.sin(age*TAU*.7), xx=x+2.75*s, yy=y+2.25*s;
      flatLine([[xx,yy],[xx+.34*s*q,yy-.3*s*q],[xx+.7*s*q,yy-.12*s*q]],'#D95B62',2.8);
      flatLine([[xx+.34*s*q,yy-.3*s*q],[xx+.25*s*q,yy-.68*s*q]],'#D95B62',2.5);
    }
    else if(kind==='steam'){
      for(const side of [-1,1]){
        const xx=x+side*(.7+Math.sin(age*3+side)*.2)*s;
        flatLine([[xx,y+.65*s],[xx+side*.18*s,y],[xx,y-.72*s]],'#F0A06B',2.2);
      }
    }
  }
  function drawYayaFlat(x,y,u,t,state='idle',age=t) {
    const input=typeof state==='string'?getYayaEmotionState(state,age):state||getYayaEmotionState('idle',age), key=input.state||'idle', S=actionFace(input,key,age), p=pose(age,S), bob=p.dy*u, dx=(p.dx||0)*u, cols=moodColors(S.face||S), arms=YayaRig.poseArms(key,age,S,p);
    push(); flatEllipse(x+dx,y+.05*u,3.9*u,.55*u,'rgba(48,80,100,.22)',null,0); pop();
    push(); translate(x+dx,y+bob); rotate(p.rot||0); scale(1+(p.sq||0)*.45,1-(p.sq||0));
    const lpL=leafPose(age,key,-1,S.action), lpR=leafPose(age,key,1,S.action);
    flatLeaf(u,-1,lpL.drift*u,lpL); flatLeaf(u,1,lpR.drift*u,lpR);
    flatFoot(u,-1,p.footL*u,cols); flatFoot(u,1,p.footR*u,cols);
    drawRigLayer(u,arms,'back',cols);
    flatPoly(pear(u),cols.light,YC.ink,3.5);
    flatHeart(0,-2.05*u,.48*u,'#FFB07D',2); flatFace(u,age,S);
    drawRigLayer(u,arms,'front',cols,false,{arm:true,palm:false});
    drawRigProps(u,key,age,arms,cols);
    drawRigLayer(u,arms,'front',cols,false,{arm:false,palm:true});
    pop();
    const question=['?','question'].includes(S.emote), emoteX=question?x+4.8*u:S.emote==='huff'?x+2.7*u:x+dx, emoteY=question?y+bob-10.3*u:S.emote==='huff'?y+bob-5.8*u:y+bob-8.65*u;
    flatEmote(S.emote,emoteX,emoteY,u*.92,S.emoteAge??age);
  }
  function drawYaya(x,y,u,t,state='idle',age=t) {
    if(FLAT_PAINT && state?.view && window.YayaViews) return YayaViews.draw(x,y,u,t,state,age,state.view,Boolean(state.debug));
    if(FLAT_PAINT) return drawYayaFlat(x,y,u,t,state,age);
    const input=typeof state==='string'?getYayaEmotionState(state,age):state||getYayaEmotionState('idle',age), key=input.state||'idle', S=actionFace(input,key,age), p=pose(age,S), bob=p.dy*u, dx=(p.dx||0)*u, cols=moodColors(S.face||S), arms=YayaRig.poseArms(key,age,S,p);
    boilSeed('yaya-shadow'); paint(ellPts(x+dx,y+.05*u,3.9*u*(1-.1*p.dy),.55*u,28,.04*u),
      {fill:YC.ink,fillOp:45,bleed:.25,tex:.3,ink:null});
    push(); translate(x+dx,y+bob); rotate(p.rot); scale(1+p.sq*.45,1-p.sq);
    const lpL=leafPose(age,key,-1,S.action), lpR=leafPose(age,key,1,S.action);
    push(); translate(0,-6.9*u+lpL.dy*u); rotate(lpL.rot); scale(lpL.sx,lpL.sy);
    paint(leaf(u,-1,lpL.drift*u),{wash:YC.leafLight,fill:YC.leaf,fillOp:130,bleed:.08,tex:.7,ink:YC.ink,sw:.9,curv:.35});
    inkLine([[0,0],[-2.15*u,-2.65*u]],.72,YC.leafShade,'inkfine',.5); pop();
    push(); translate(0,-6.9*u+lpR.dy*u); rotate(lpR.rot); scale(lpR.sx,lpR.sy);
    paint(leaf(u,1,lpR.drift*u),{wash:YC.leafLight,fill:YC.leaf,fillOp:130,bleed:.08,tex:.7,ink:YC.ink,sw:.9,curv:.35});
    inkLine([[0,0],[2.15*u,-2.65*u]],.72,YC.leafShade,'inkfine',.5); pop();
    foot(u,-1,p.footL*u+.03*u*Math.sin(age*2.1)); foot(u,1,p.footR*u+.03*u*Math.sin(age*2.1+1.4));
    drawRigLayer(u,arms,'back',cols,true);
    paint(pear(u),{wash:cols.body,fill:cols.light,fillOp:95,bleed:.09,tex:.65,ink:YC.ink,sw:1.05,curv:.35});
    badge(u,(key==='cuddle'||key==='comforted'||key==='love')?.8:0); face(u,age,S);
    drawRigLayer(u,arms,'front',cols,true,{arm:true,palm:false});
    drawRigProps(u,key,age,arms,cols,true);
    drawRigLayer(u,arms,'front',cols,true,{arm:false,palm:true});
    pop();
    const question=['?','question'].includes(S.emote), emoteX=question?x+4.8*u:S.emote==='huff'?x+2.7*u:x+dx, emoteY=question?y+bob-10.3*u:S.emote==='huff'?y+bob-5.8*u:y+bob-8.65*u;
    yayaEmote(S.emote,emoteX,emoteY,u*.92,S.emoteK??1,S.emoteAge??age);
  }
  function yayaStage(t,state='idle',age=t) {
    if(FLAT_PAINT) {
      background(YC.paper); push(); noStroke(); fill('#EAF7FF'); ellipse(960,230,1440,720); fill('#B8F0E1'); ellipse(960,960,2360,470); pop();
      for(let i=0;i<13;i++){const gx=170+hash(i*4.1)*1580, gy=850+hash(i*6.7)*170; flatEllipse(gx,gy,28+hash(i)*23,9+hash(i+2)*7,YC.leafLight,null,0);}
      flatLine([[160,830],[180,770],[218,745]],YC.leafShade,3); flatLine([[1760,840],[1738,770],[1702,748]],YC.leafShade,3);
      if(normalizePetState(state)==='run' && window.YayaViews) {
        const travel=YayaViews.travel(age);
        YayaViews.draw(960+travel.x*550,900,60,t,state,age,travel); return;
      }
      drawYaya(960,900,72,t,state,age); return;
    }
    boilSeed('yaya-stage');
    paint(rectPts(-100,-100,W+200,H+200),{wash:YC.paper,ink:null});
    paint(ellPts(960,230,720,360,36,8),{fill:YAYA_STYLE==='paper'?'#FFF8E9':'#EAF7FF',fillOp:255,bleed:.35,tex:.45,ink:null});
    paint(ellPts(960,960,1180,235,40,7),{wash:YC.carpet,fill:YAYA_STYLE==='paper'?YC.mint:'#B8F0E1',fillOp:255,bleed:.22,tex:.7,ink:null});
    for(let i=0;i<13;i++){const x=170+hash(i*4.1)*1580,y=850+hash(i*6.7)*170;
      paint(ellPts(x,y+Math.sin(t*1.2+i*2.4)*4,28+hash(i)*23,9+hash(i+2)*7,14,2),{wash:YC.leafLight,washOp:70,ink:null});}
    inkLine([[160,830],[180,770],[218,745]],1,YC.leafShade,'inkfine',.5);
    inkLine([[1760,840],[1738,770],[1702,748]],1,YC.leafShade,'inkfine',.5);
    drawYaya(960,900,72,t,state,age);
  }
  function yayaFeel(name,t,over={}) {
    const S=getYayaEmotionState(name,t), face={...S.face,...over}, poseNow=pose(t,S.state);
    return {...S,...over,face,pose:{...S.pose,...poseNow},emote:over.emote??S.emote,emoteK:over.emoteK??S.emoteK,emoteAge:over.emoteAge??S.emoteAge};
  }
  function yayaAction(name,direction=1,age=0) {
    const key=normalizePetState(name), S=getYayaEmotionState(key,age), p=pose(age,key), dir=direction<0?-1:1;
    return {...S,direction:dir,pose:{...S.pose,...p,direction:dir}};
  }
  function yayaEmotions(t,keys,opts={}) {
    if(!keys||!keys.length) return yayaFeel('idle',t);
    let i=0; while(i+1<keys.length&&t>=keys[i+1][0]) i++;
    const [tc,name,over]=keys[i], age=t-tc, cur=yayaFeel(name,t,over), nextT=i+1<keys.length?keys[i+1][0]:Infinity;
    const prev=i>0?yayaFeel(keys[i-1][1],t,keys[i-1][2]):null;
    if(prev&&age<.5){
      const k=backOut(seg(age,0,.4)), kc=ease(seg(age,0,.3));
      const old=prev.pose||{}, now=cur.pose||{};
      for(const f of ['dx','dy','sq','rot','left','right']) now[f]=lerp(old[f]||0,now[f]||0,k);
      for(const f of ['blush','lookX','lookY']) cur.face[f]=lerp(prev.face?.[f]||0,cur.face?.[f]||0,kc);
      cur.pose=now;
    }
    const profile=EMOTION_PROFILES[cur.mood]||EMOTION_PROFILES.idle;
    const t1=prev?take(t,tc,(profile.take??.55)*(opts.take??1)):{dy:0,sq:0};
    const nextName=i+1<keys.length?keys[i+1][1]:null, nextP=nextName?EMOTION_PROFILES[getYayaEmotionState(nextName,nextT).mood]:null;
    const t2=nextP?take(t,nextT,(nextP.take??.55)*(opts.take??1)):{dy:0,sq:0};
    cur.pose.dy=(cur.pose.dy||0)+t1.dy+t2.dy; cur.pose.sq=(cur.pose.sq||0)+t1.sq+t2.sq;
    const squint=nextT-t<.1?1-(nextT-t)/.1:age<.14&&prev?1-age/.14:0;
    if(squint>.01) cur.face.half=Math.max(cur.face.half||0,clamp(squint));
    cur.emoteK=cur.emote&&prev&&prev.emote!==cur.emote?seg(age,.06,.32):cur.emoteK;
    cur.emoteAge=age;
    return cur;
  }
  window.YayaDrawing={flatPoly,flatLine,flatEllipse,flatLeaf,flatHeart,flatFace,flatFoot,pear,pose,leafPose,moodColors,palette:YC,drawRigArm,drawRigProps,drawRigLayer,actionFace};
  window.drawYaya=drawYaya; window.yayaStage=yayaStage; window.YAYA_STYLE=YAYA_STYLE;
  window.getYayaEmotionState=getYayaEmotionState; window.normalizePetState=normalizePetState;
  window.yayaFeel=yayaFeel; window.yayaEmotions=yayaEmotions; window.yayaAction=yayaAction;
  window.YAYA_MOODS=[...MOODS]; window.YAYA_ACTIONS=[...ACTIONS,...MOTION_ACTIONS]; window.YAYA_MOTION_ACTIONS=[...MOTION_ACTIONS];
  // timeline.js owns the lexical LOOPS table; use it when present so --loop=yaya_idle works.
  const loopTable = typeof LOOPS !== 'undefined' ? LOOPS : (window.LOOPS=window.LOOPS||{});
  [...new Set([...MOODS,...ACTIONS,...MOTION_ACTIONS])].forEach(state=>{
    const key='yaya_'+state, duration=state==='run'?8:4;
    loopTable[key]=t=>yayaStage(t,state,frac(t/duration)*duration); loopTable[key].len=duration;
  });
})();
