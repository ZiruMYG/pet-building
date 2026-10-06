// The controller owns playback and input only. All spatial movement, object
// ownership and safe interruption live in YayaBedroomModel.
(() => {
  'use strict';
  const names={window:'看看窗外',read:'看绘本',teddy:'抱抱小熊',tidy:'检查小柜子',lamp:'开关床头灯',sleep:'上床睡一会',wander:'在房间散步'};
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=id=>document.getElementById(id);
  let model=YayaBedroomModel.create({random:Math.random,auto:!reducedMotion});
  let playing=!reducedMotion,initialized=false,ready=false,pendingFrame=false,busy=false;
  let lastClock=0,lastPaint=0,renderPromise=Promise.resolve();
  const drawRoom=t=>YayaBedroom.draw(t,model.getState());
  drawRoom.len=120;
  window.LOOP=drawRoom;

  function updateUi() {
    const state=model.getState();
    const phrase=state.label||'芽芽在房间里歇一会儿';
    if($('phase-label').textContent!==phrase)$('phase-label').textContent=phrase;
    const queued=state.pending&&names[state.pending];
    const queueText=queued?`接下来：${queued}。先完成手上的取放，再慢慢走过去。`:'';
    $('queue-label').hidden=!queued;
    if($('queue-label').textContent!==queueText)$('queue-label').textContent=queueText;
    $('auto-life').checked=Boolean(state.auto);
    $('play-toggle').textContent=playing?'Ⅱ 暂停':'▶ 继续';
    $('play-toggle').setAttribute('aria-pressed',String(!playing));
    $('room-badge').textContent=!playing?'暂停休息':state.auto?'自己玩一会':'陪你一起玩';
    $('room-badge').classList.toggle('paused',!playing);
    $('out').setAttribute('aria-label',`芽芽的卧室：${phrase}`);
    document.querySelectorAll('[data-room-command]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.roomCommand===state.action)));
  }

  // Coalesce all input/RAF redraws into one queue. The model advances only in
  // tick/advance, never here, so a busy renderer cannot count elapsed time twice.
  function requestFrame() {
    pendingFrame=true;
    if(!window.ready||busy)return renderPromise;
    busy=true;
    renderPromise=(async()=>{
      try {
        while(pendingFrame) {
          pendingFrame=false;
          T=model.getState().time;
          await redraw();
          composite(T);
        }
        $('loading').hidden=true;
        ready=true;
      } catch(error) {
        playing=false;
        $('loading').hidden=false;
        $('loading').textContent=`小房间暂时没画出来：${error.message}`;
        updateUi();
        console.error(error);
      } finally {busy=false;}
    })();
    return renderPromise;
  }

  function request(key) {
    if(!Object.prototype.hasOwnProperty.call(names,key))return false;
    model.request(key);
    updateUi();
    requestFrame();
    return true;
  }
  function setAuto(value) {model.setAuto(Boolean(value));updateUi();return requestFrame();}
  function pause() {playing=false;updateUi();return requestFrame();}
  function play() {playing=true;lastClock=0;updateUi();return requestFrame();}
  function restart() {
    model=YayaBedroomModel.create({random:Math.random,auto:model.getState().auto});
    lastClock=0;
    updateUi();
    return requestFrame();
  }
  function choose(key) {if(request(key))play();}

  function installHotspots() {
    const items=[['window','window','看看窗外'],['book','read','拿一本绘本'],['teddy','teddy','抱抱小熊'],['lamp','lamp','开关床头灯'],['bed','sleep','躺进小被子']];
    const layout=YayaBedroomArt.layout;
    const layer=$('room-hotspots');
    for(const [anchor,key,label] of items) {
      const item=layout[anchor];
      if(!item)continue;
      // Artwork defines the physical hit region in the same 1920×1080 world.
      const area=item.hit||item.bounds||item;
      const w=area.w||area.width||120,h=area.h||area.height||120;
      const x=area.x===undefined?item.x-w/2:area.x;
      const y=area.y===undefined?item.y-h/2:area.y;
      const button=document.createElement('button');
      button.type='button';button.className='hotspot';button.dataset.roomObject=anchor;
      button.setAttribute('aria-label',label);
      button.style.left=`${x/1920*100}%`;button.style.top=`${y/1080*100}%`;
      button.style.width=`${w/1920*100}%`;button.style.height=`${h/1080*100}%`;
      const hint=document.createElement('span');hint.className='hotspot-label';hint.textContent=label;
      button.appendChild(hint);button.addEventListener('click',()=>choose(key));layer.appendChild(button);
    }
  }

  function tick(now) {
    if(!lastClock)lastClock=now;
    const dt=Math.max(0,Math.min(.1,(now-lastClock)/1000));
    lastClock=now;
    if(playing&&!document.hidden&&ready) {
      model.step(dt);
      if(now-lastPaint>=1000/30) {lastPaint=now;updateUi();requestFrame();}
    }
    requestAnimationFrame(tick);
  }

  window.devUI=function initializeBedroom() {
    if(initialized)return;
    initialized=true;
    document.querySelectorAll('[data-room-command]').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.roomCommand)));
    $('auto-life').addEventListener('change',()=>{setAuto($('auto-life').checked);if($('auto-life').checked)play();});
    $('play-toggle').addEventListener('click',()=>playing?pause():play());
    $('restart').addEventListener('click',restart);
    document.addEventListener('visibilitychange',()=>{lastClock=0;});
    installHotspots();updateUi();requestFrame();requestAnimationFrame(tick);
    if(reducedMotion)$('room-note').textContent='已按你的减少动态偏好暂停。点选活动或「继续」，就可以陪芽芽玩；换活动时它会先完成手上的取放。';
  };

  window.yayaBedroom={
    getState:()=>({...model.getState(),playing,ready}),request,setAuto,pause,play,restart,
    // Deterministic stepping for tests and contact-sheet rendering; this is not
    // an alternate teleport/scrub path and uses the same model.step as playback.
    advance:async seconds=>{
      playing=false;
      let remaining=Math.min(600,Math.max(0,Number(seconds)||0));
      while(remaining>1e-8) {const dt=Math.min(1/60,remaining);model.step(dt);remaining-=dt;}
      updateUi();await requestFrame();return window.yayaBedroom.getState();
    }
  };
  if(window.parent!==window) {
    const reportHeight=()=>window.parent.postMessage({type:'yaya-bedroom-size',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height+4)},'*');
    new ResizeObserver(reportHeight).observe(document.querySelector('main'));
    requestAnimationFrame(reportHeight);
  }
  window.addEventListener('error',event=>{
    if(!ready&&$('loading')) {$('loading').hidden=false;$('loading').textContent=`小房间的绘制资源未能加载：${event.message||'请保留完整 source 文件夹'}`;}
  });
})();
