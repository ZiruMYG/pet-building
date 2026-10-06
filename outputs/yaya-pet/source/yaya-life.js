// Session-only life simulation. Needs select a small purposeful sequence; the
// renderer remains replaceable. Only visible, unpaused playback advances time.
(() => {
  'use strict';
  const clamp = n => Math.max(0, Math.min(100, n));
  const step = (clip, seconds, label, effect = {}) => ({clip, seconds, label, effect});
  const plans = {
    observe: {label:'看看周围', reason:'听到一点动静，看看花园里有什么。', steps:[step('emotion:curious',4,'好像有什么新东西'),step('turn',4,'转过身看一看'),step('idle',4,'安静听一会儿',{boredom:-8})]},
    explore: {label:'散一小会儿步',reason:'去花园另一边逛逛，再回来陪你。',steps:[step('emotion:curious',4,'想去那边看看'),step('walk',8,'慢慢走一圈',{boredom:-18,fatigue:3}),step('emotion:relieved',4,'散完步，放松一下')]},
    play: {label:'自己玩球',reason:'想玩一会儿小球。',steps:[step('emotion:hopeful',4,'期待着小游戏'),step('ball',8,'推一推自己的小球',{boredom:-30,fatigue:4,thirst:3}),step('emotion:happy',4,'玩得很开心')]},
    dance: {label:'哼着歌晃一晃',reason:'心情轻快，动一动身体。',steps:[step('emotion:happy',4,'今天心情不错'),step('dance',4,'轻轻跳一小段',{boredom:-22,fatigue:3}),step('emotion:relieved',4,'停下来歇一歇')]},
    cuddle: {label:'抱抱小熊',reason:'把小熊抱在怀里，安静待一会儿。',steps:[step('emotion:love',4,'想抱抱小熊'),step('hug',8,'抱紧自己的泰迪熊',{boredom:-20,fatigue:-3}),step('emotion:relieved',4,'抱一抱，很安心')]},
    exercise: {label:'活动一下',reason:'有精神，去小跑一会儿。',steps:[step('stretch',4,'先舒展一下'),step('run',6,'轻快地跑一个来回',{fatigue:8,thirst:8,boredom:-25}),step('drink',4,'运动后喝一口水',{thirst:-24}),step('emotion:relieved',4,'停下来缓一缓')]},
    meal: {label:'吃一顿小饭',reason:'肚子有点饿，去桌边坐好吃饭。',steps:[step('emotion:hopeful',4,'想吃一顿香香的饭'),step('eat',8,'坐在桌边，一口一口吃',{hunger:-48}),step('drink',4,'饭后喝一点水',{thirst:-25}),step('emotion:relieved',4,'吃饱了，舒服地休息')]},
    water: {label:'喝点水',reason:'想喝水了，拿起自己的杯子。',steps:[step('drink',4,'拿好杯子，慢慢喝',{thirst:-48}),step('emotion:relieved',4,'喝完水舒服多了')]},
    rest: {label:'睡个小觉',reason:'有点困了，回到床上休息。',steps:[step('emotion:sleepy',4,'眼皮有点重了'),step('sleep',24,'盖好被子，睡个小觉',{fatigue:-54}),step('stretch',4,'睡醒了，打个哈欠'),step('emotion:relieved',4,'精神恢复啦')]}
  };
  function create(options={}) {
    const random=options.random||Math.random;
    const s={enabled:options.enabled!==false,clock:0,waiting:options.wait??10,plan:null,index:-1,current:null,remaining:0,
      needs:{hunger:36,thirst:28,fatigue:20,boredom:35,...options.needs},recent:{},history:[],completed:0};
    const copy=()=>JSON.parse(JSON.stringify(s));
    const affect=effect=>{for(const [key,value] of Object.entries(effect||{}))if(key in s.needs)s.needs[key]=clamp(s.needs[key]+value);};
    const history=(label)=>{s.history.unshift({label,at:s.clock});s.history=s.history.slice(0,6);};
    function choose() {
      const n=s.needs;
      if(n.fatigue>=68)return 'rest';
      if(n.thirst>=60)return 'water';
      if(n.hunger>=62)return 'meal';
      const available=['observe','explore','play','dance','cuddle','exercise'].filter(key=>s.recent[key]===undefined||s.clock-s.recent[key]>100);
      const choices=available;
      if(!choices.length)return null;
      if(n.boredom>=62&&choices.includes('play'))return 'play';
      return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
    }
    function nextStep() {
      const plan=plans[s.plan];
      s.index++;
      if(s.index>=plan.steps.length) {
        history(`${plan.label} · 完成`);s.completed++;s.plan=null;s.index=-1;s.current=null;
        s.waiting=9+Math.floor(random()*10);
        return {clip:'idle',label:'安静陪你一会儿',rest:true};
      }
      const current=plan.steps[s.index];s.current={...current};s.remaining=current.seconds;
      return {...current,plan:s.plan,reason:plan.reason,index:s.index,total:plan.steps.length};
    }
    function begin(key=choose()) {
      if(!s.enabled)return null;
      if(key===null){s.plan=null;s.index=-1;s.current=null;s.remaining=0;s.waiting=10;return {clip:'idle',label:'刚刚玩过，先歇一小会儿',rest:true};}
      if(!plans[key])return null;
      s.plan=key;s.recent[key]=s.clock;s.index=-1;history(plans[key].label);
      return nextStep();
    }
    function tick(dt,{blocked=false}={}) {
      if(blocked||!Number.isFinite(dt)||dt<=0)return null;
      dt=Math.min(dt,.5);s.clock+=dt;
      // No elapsed-wall-clock debt is stored when the app is closed/hidden.
      affect({hunger:dt*.10,thirst:dt*.13,fatigue:dt*.07,boredom:dt*.16});
      if(!s.enabled)return null;
      if(s.current) {
        s.remaining-=dt;
        if(s.remaining<=0){affect(s.current.effect);return nextStep();}
      } else {s.waiting-=dt;if(s.waiting<=0)return begin();}
      return null;
    }
    function interrupt(label='回应你的互动') {
      s.plan=null;s.index=-1;s.current=null;s.remaining=0;s.waiting=16;
      history(label);
    }
    function setEnabled(value) {s.enabled=Boolean(value);interrupt(s.enabled?'继续自己的小日子':'安静陪伴');s.waiting=s.enabled?3:16;}
    function satisfy(key,dt=1) {
      const effects={eat:{hunger:-45},drink:{thirst:-42},play:{boredom:-28},ball:{boredom:-28},exercise:{boredom:-20,fatigue:7,thirst:7},cuddle:{boredom:-15},sleep:{fatigue:-dt*.9}};
      affect(effects[key]);
    }
    return Object.freeze({tick,begin,interrupt,setEnabled,satisfy,getState:copy});
  }
  globalThis.YayaLife=Object.freeze({create,plans});
})();
