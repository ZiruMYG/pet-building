// Interactive, deterministic inspection of the shared Yaya rig and multi-view renderer.
// No artwork is duplicated here: every panel calls YayaViews.draw with the same time.
(() => {
  'use strict';
  const names = {idle:'站好',eat:'吃饭',drink:'喝水',stretch:'伸懒腰',run:'往返小跑'};
  const viewNames = {sheet:'三视图',front:'正面',side:'侧面',back:'背面',travel:'往返跑道'};
  const descriptions = {
    idle:'先看同一个芽芽的三个角度。点选动作，可以同时对照手臂与身体的关系。',
    eat:'小勺跟着自己的手掌移动：拿起、送到嘴边、放回。暂停看看勺柄与手掌的接触。',
    drink:'短胳膊从固定肩点抬起，小杯跟随手掌倾斜，再一起放下。',
    stretch:'两只手从身体两侧向上伸，再慢慢收回。肩点不移动，手掌始终接着胳膊。',
    run:'芽芽侧身跑向另一边，减速转身，再跑回来。切换视角也能查看原地跑姿。'
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {action:'idle',view:'sheet',time:0,playing:!reducedMotion,debug:false,ready:false};
  let pending = null, busy = false, lastClock = 0, lastPaint = 0, initialized = false, renderPromise=Promise.resolve();
  const $ = id => document.getElementById(id);
  const duration = () => state.action === 'run' ? 8 : 4;

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
    if (state.view === 'sheet') {
      ['front','side','back'].forEach((view,i) => YayaViews.draw(330+i*630,870,50,t,state.action,age,view,state.debug));
    } else if (state.view === 'travel') {
      const travel = YayaViews.travel(t);
      YayaViews.draw(960+travel.x*550,900,60,t,'run',age,{yaw:travel.yaw,gait:travel.gait,speed:travel.speed},state.debug);
    } else {
      YayaViews.draw(960,900,70,t,state.action,age,state.view,state.debug);
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
    $('play-toggle').setAttribute('aria-pressed',String(!state.playing));
    $('play-toggle').textContent=state.playing?'Ⅱ 暂停':'▶ 播放';
    $('scrub').max=String(duration());
    updateTime();
    $('phase-label').textContent=`${viewNames[state.view]} · ${names[state.action]}`;
    $('action-description').textContent=descriptions[state.action];
    $('view-labels').classList.toggle('single',state.view!=='sheet');
    $('view-labels').innerHTML=state.view==='sheet'?'<span>正面</span><span>侧面</span><span>背面</span>':`<span>${state.view==='travel'?'向右跑 → 转身 → 向左跑 → 转身':viewNames[state.view]}</span>`;
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
    if(action==='run')state.view='travel';
    else if(state.view==='travel')state.view='front';
    updateUi(); requestFrame();
  }
  function setView(view) {
    if (!(view in viewNames))return;
    state.view=view;
    if(view==='travel'){state.action='run';state.time=0;}
    updateUi(); requestFrame();
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
    $('play-toggle').addEventListener('click',()=>{state.playing=!state.playing;updateUi();requestFrame();});
    $('restart').addEventListener('click',()=>{state.time=0;updateUi();requestFrame();});
    $('scrub').addEventListener('input',()=>{state.playing=false;state.time=Number($('scrub').value);updateUi();requestFrame();});
    $('show-rig').addEventListener('change',()=>{state.debug=$('show-rig').checked;updateUi();requestFrame();});
    updateUi(); requestFrame(); requestAnimationFrame(tick);
  };

  window.yayaLab = {
    getState:()=>({...state,duration:duration()}),
    setAction,setView,
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
