// Interactive, deterministic inspection of the shared Yaya rig and multi-view renderer.
// No artwork is duplicated here: every panel calls YayaViews.draw with the same time.
(() => {
  'use strict';
  const names = {idle:'站好',eat:'吃饭',drink:'喝水',sleep:'躺着睡觉',stretch:'伸懒腰＋哈欠',walk:'走一走',run:'快快小跑',spin:'原地转圈',celebrate:'跳起来庆祝',wave:'挥挥手',hug:'抱泰迪熊',reach:'伸出手',turn:'转向侧面',nod:'点点头'};
  const viewNames = {auto:'动作演示',sheet:'三视图',front:'正面',side:'侧面',back:'背面',travel:'往返跑道'};
  const leafShapes = {auto:'跟随角色',natural:'自然圆叶',upright:'竖起倾听',spread:'向外舒展',droop:'软软垂落',cup:'害羞内扣'};
  const leafMotions = {auto:'跟随角色',still:'保持姿态',breathe:'轻轻呼吸',sway:'左右探看',alternate:'一上一下',flap:'开心扑扇',twitch:'抖两下',wind:'向后轻摆'};
  const descriptions = {
    idle:'点选动作，看芽芽用手、身体、表情和叶子一起表达。也可以切换视角，暂停查看每个姿势。',
    eat:'小勺跟着自己的手掌移动：拿起、送到嘴边、放回。暂停看看勺柄与手掌的接触。',
    drink:'短胳膊从固定肩点抬起，小杯跟随手掌倾斜，再一起放下。',
    sleep:'芽芽安静地躺下，闭着眼睛，身体随着呼吸轻轻起伏。',
    stretch:'两只手向上伸开，嘴巴张大打一个哈欠，叶子也舒展开，再一起放松。',
    walk:'侧身慢慢走，小脚交替着地；走到另一边，转过身再走回来。',
    run:'加快脚步，身体轻轻向前倾，一蹬一跃地跑起来，身后带着跑动线。',
    spin:'先看向要转的方向，再交替抬脚、落脚，身体跟着小步转一圈。',
    celebrate:'先蹲一蹲，再伸开双手高高跳起；跳到最高处时露出兴奋的表情。',
    wave:'把一只短胳膊向外伸开，小手来回挥三下，清楚地和你打招呼。',
    hug:'芽芽转向侧面，用两只手抱住泰迪熊，轻轻收紧，再放松一点。',
    reach:'从固定肩点向外伸出短胳膊，小圆手跟着向前探，再慢慢收回。',
    turn:'先看看旁边，换一只脚支撑，迈小步转向侧面；停一下，再转回来看你。',
    nod:'脸向前下方轻轻低下，再抬起来；叶子跟着点两下头。'
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {action:'idle',view:'auto',leafShape:'auto',leafMotion:'auto',time:0,playing:!reducedMotion,debug:false,ready:false};
  let pending = null, busy = false, lastClock = 0, lastPaint = 0, initialized = false, renderPromise=Promise.resolve();
  const $ = id => document.getElementById(id);
  const duration = () => YayaActions.duration(state.action);

  function backgroundScene(t) {
    push();
    noStroke(); fill('#F6FCFF'); rect(0,0,W,H);
    fill('#EAF7FF'); ellipse(960,170,2150,850);
    fill('#D5F2E3'); rect(0,900,W,180);
    stroke('#B0DECA'); strokeWeight(3); line(70,900,1850,900);
    if (state.view === 'sheet') {
      stroke('#D8E9EA'); strokeWeight(2); line(640,150,640,945); line(1280,150,1280,945);
    } else if (state.view === 'travel') {
      stroke('#B2DBC8'); strokeWeight(4);
      for(let x=100;x<1900;x+=140) line(x,970,x+66,970);
      noStroke(); fill('#8ECBB1'); ellipse(410,927,20,8); ellipse(1510,927,20,8);
    }
    pop();
  }

  function drawLab(t) {
    backgroundScene(t);
    if (!window.YayaViews) return;
    const age = ((t % duration()) + duration()) % duration();
    const character = {...getYayaEmotionState(state.action,age),leafShape:state.leafShape,leafMotion:state.leafMotion};
    if (state.view === 'auto') {
      YayaViews.perform(960,900,70,t,character,age,state.debug);
    } else if (state.view === 'sheet') {
      ['front','side','back'].forEach((view,i) => YayaViews.draw(330+i*630,870,50,t,character,age,view,state.debug));
    } else if (state.view === 'travel') {
      const travel = YayaViews.travel(t,state.action);
      YayaViews.draw(960+travel.x*550,900,60,t,character,age,{yaw:travel.yaw,gait:travel.gait,speed:travel.speed},state.debug);
    } else {
      YayaViews.draw(960,900,70,t,character,age,state.view,state.debug);
    }
  }
  drawLab.len = 8;
  window.LOOP = drawLab;

  function updateTime() {
    $('scrub').value=String(state.time);
    $('tt').textContent=`${state.time.toFixed(2)} / ${duration().toFixed(2)}s`;
  }
  function updateUi() {
    document.querySelectorAll('[data-lab-action]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.labAction===state.action)));
    document.querySelectorAll('[data-lab-view]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.labView===state.view)));
    document.querySelectorAll('[data-leaf-shape]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.leafShape===state.leafShape)));
    document.querySelectorAll('[data-leaf-motion]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.leafMotion===state.leafMotion)));
    $('leaf-selection').textContent=state.leafShape==='auto'&&state.leafMotion==='auto'?'叶子正在跟随角色，自动配合当前动作。':`当前组合：${leafShapes[state.leafShape]} · ${leafMotions[state.leafMotion]}`;
    $('play-toggle').setAttribute('aria-pressed',String(!state.playing));
    $('play-toggle').textContent=state.playing?'Ⅱ 暂停':'▶ 播放';
    $('scrub').max=String(duration());
    updateTime();
    $('phase-label').textContent=`${viewNames[state.view]} · ${names[state.action]}`;
    $('action-description').textContent=descriptions[state.action];
    $('view-labels').classList.toggle('single',state.view!=='sheet');
    $('view-labels').innerHTML=state.view==='sheet'?'<span>正面</span><span>侧面</span><span>背面</span>':`<span>${state.view==='travel'?(state.action==='walk'?'向右走 → 转身 → 向左走 → 转身':'向右跑 → 转身 → 向左跑 → 转身'):state.view==='auto'?names[state.action]:viewNames[state.view]}</span>`;
    $('out').setAttribute('aria-label',`芽芽${names[state.action]}，${viewNames[state.view]}动画预览`);
    $('show-rig').checked=state.debug;
    $('rig-legend').hidden=!state.debug;
  }

  // A single render queue prevents play, scrub and button presses from racing.
  function requestFrame(t=state.time) {
    pending=t;
    if (!window.ready || busy) return renderPromise;
    busy=true;
    renderPromise=(async()=>{try {
      while(pending!==null) {
        const at=pending; pending=null;
        T=at; await redraw(); composite(at);
      }
      $('loading').hidden=true;
      state.ready=true;
    } catch(error) {
      state.playing=false;
      $('loading').hidden=false;
      $('loading').textContent=`绘制暂时遇到问题：${error.message}`;
      console.error(error);
    } finally { busy=false; }})();
    return renderPromise;
  }

  function setAction(action) {
    if (!(action in names)) return;
    state.action=action; state.time=0;
    state.view='auto';
    updateUi(); requestFrame();
  }
  function setView(view) {
    if (!(view in viewNames))return;
    state.view=view;
    if(view==='travel'){if(!['walk','run'].includes(state.action))state.action='run';state.time=0;}
    updateUi(); requestFrame();
  }
  function setLeafShape(shape) {
    if (!(shape in leafShapes)) return;
    state.leafShape=shape;
    updateUi(); return requestFrame();
  }
  function setLeafMotion(motion) {
    if (!(motion in leafMotions)) return;
    state.leafMotion=motion;
    updateUi(); return requestFrame();
  }
  function resetLeaves() {
    state.leafShape='auto'; state.leafMotion='auto';
    updateUi(); return requestFrame();
  }
  function tick(now) {
    if (!lastClock)lastClock=now;
    const dt=Math.min(.1,(now-lastClock)/1000); lastClock=now;
    if(state.playing && !document.hidden && now-lastPaint>=1000/30) {
      state.time=(state.time+dt)%duration();
      // Advance on each animation frame below; render at up to 30fps.
      lastPaint=now; updateTime(); requestFrame();
    } else if(state.playing&&!document.hidden)state.time=(state.time+dt)%duration();
    requestAnimationFrame(tick);
  }

  // core.setup calls devUI once the local p5 drawing runtime is ready.
  window.devUI = function initializeLab() {
    if(initialized)return; initialized=true;
    document.querySelectorAll('[data-lab-action]').forEach(button=>button.addEventListener('click',()=>setAction(button.dataset.labAction)));
    document.querySelectorAll('[data-lab-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.labView)));
    document.querySelectorAll('[data-leaf-shape]').forEach(button=>button.addEventListener('click',()=>setLeafShape(button.dataset.leafShape)));
    document.querySelectorAll('[data-leaf-motion]').forEach(button=>button.addEventListener('click',()=>setLeafMotion(button.dataset.leafMotion)));
    $('reset-leaves').addEventListener('click',resetLeaves);
    $('play-toggle').addEventListener('click',()=>{state.playing=!state.playing;updateUi();requestFrame();});
    $('restart').addEventListener('click',()=>{state.time=0;updateUi();requestFrame();});
    $('scrub').addEventListener('input',()=>{state.playing=false;state.time=Number($('scrub').value);updateUi();requestFrame();});
    $('show-rig').addEventListener('change',()=>{state.debug=$('show-rig').checked;updateUi();requestFrame();});
    updateUi(); requestFrame(); requestAnimationFrame(tick);
  };

  window.yayaLab = {
    getState:()=>({...state,duration:duration()}),
    setAction,setView,setLeafShape,setLeafMotion,resetLeaves,
    setTime:async time=>{state.playing=false;state.time=Math.max(0,Math.min(duration(),Number(time)||0));updateUi();await requestFrame();},
    setDebug:value=>{state.debug=Boolean(value);updateUi();return requestFrame();},
    pause:()=>{state.playing=false;updateUi();},
    play:()=>{state.playing=true;updateUi();}
  };
  if(window.parent!==window) {
    const reportHeight=()=>window.parent.postMessage({type:'yaya-rig-lab-size',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height+4)},'*');
    new ResizeObserver(reportHeight).observe(document.querySelector('main'));
    requestAnimationFrame(reportHeight);
  }
  window.addEventListener('error',event=>{
    if(!state.ready&&$('loading')){$('loading').hidden=false;$('loading').textContent=`本地绘制资源未能加载：${event.message||'请保留完整 source 文件夹'}`;}
  });
})();
