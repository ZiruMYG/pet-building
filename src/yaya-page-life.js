(() => {
  'use strict';
  const pet=window.yayaPet, catalog=window.YayaCatalog;
  if(!pet||!catalog||!window.YayaLife)return;
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  const button=(label,fn)=>{const el=node('button',label);el.type='button';el.addEventListener('click',fn);return el;};
  const bedroomPresent=Boolean(document.querySelector('[data-testid="bedroom-frame"]'));
  const life=YayaLife.create({enabled:!bedroomPresent&&!pet.getState().reducedMotion});
  let manualSleep=false,lastTime=0,lastPaint=0,generation=0;

  const panel=node('section',undefined,'life-panel');panel.id='garden-life-panel';panel.setAttribute('aria-label','小花园里的生活片段');
  panel.innerHTML=`<div class="life-heading"><div><span class="life-kicker">小花园里的生活片段</span><h2 id="life-title">安静陪你一会儿</h2></div><button type="button" id="life-toggle" aria-pressed="false">自主活动：关</button></div>
    <p id="life-reason">不用一直点按钮，芽芽会自己看看、玩玩，饿了吃饭，困了休息。</p>
    <div class="life-needs" id="life-needs"></div><div class="life-bottom"><span id="life-step" role="status" aria-live="polite">正在准备小花园</span><div class="life-choice"><label for="life-routine">生活小片段</label><select id="life-routine"><option value="">让芽芽自己挑</option></select><button type="button" id="life-next">看看下一件事 →</button></div></div>
    <details class="life-log"><summary>刚才做了什么</summary><ol id="life-history"></ol></details>`;
  document.querySelector('.pause-row').after(panel);
  const $=id=>document.getElementById(id);
  for(const [key,plan] of Object.entries(YayaLife.plans)){const option=node('option',plan.label);option.value=key;$('life-routine').append(option);}
  const needLabels={hunger:'饱足',thirst:'水分',fatigue:'精力',boredom:'兴致'};
  for(const [key,label] of Object.entries(needLabels)) {
    const item=node('div',undefined,'need-item');item.append(node('span',label));
    const meter=document.createElement('meter');meter.min=0;meter.max=100;meter.value=70;meter.dataset.need=key;meter.setAttribute('aria-label',label);item.append(meter);$('life-needs').append(item);
  }
  const histories=new Map();
  function paint() {
    const s=life.getState(),p=pet.getState(),plan=YayaLife.plans[s.plan];
    $('life-toggle').setAttribute('aria-pressed',String(s.enabled));$('life-toggle').textContent=`自主活动：${s.enabled?'开':'关'}`;
    $('life-title').textContent=manualSleep?'安心睡觉':plan?plan.label:s.enabled?'安静陪你一会儿':'安静陪伴';
    $('life-reason').textContent=manualSleep?'你安排了睡觉，芽芽会安心睡着，等你叫醒。':plan?plan.reason:s.enabled?'不用一直点按钮，芽芽会自己看看、玩玩，饿了吃饭，困了休息。':'你仍可以点选表情、动作，或摸摸芽芽。';
    $('life-step').textContent=p.paused?'已经暂停':manualSleep?'头枕枕头，盖好被子':s.current?`${s.index+1} / ${plan.steps.length} · ${s.current.label}`:s.enabled?'歇一会儿，再找点小事做':'自主活动已关闭';
    $('life-next').disabled=!s.enabled||p.paused||p.switching||!p.ready;
    for(const meter of panel.querySelectorAll('[data-need]'))meter.value=100-s.needs[meter.dataset.need];
    const stamp=JSON.stringify(s.history);
    if(histories.get('last')!==stamp){histories.set('last',stamp);$('life-history').replaceChildren(...(s.history.length?s.history.map(item=>node('li',item.label)):[node('li','刚刚来到小花园') ]));}
  }
  async function show(command) {
    if(!command)return;
    const id=++generation;
    const ok=await pet.playClip(command.clip,{silent:true,managed:true,loop:true,label:command.label});
    if(id!==generation)return;
    if(!ok){life.setEnabled(false);$('life-reason').textContent='这段动画没有加载成功。可以继续点选其他动作。';}
    paint();
  }
  function next(key) {
    const p=pet.getState();if(p.paused||p.switching||!p.ready||!life.getState().enabled)return false;
    manualSleep=false;show(life.begin(key));paint();return true;
  }
  function setEnabled(value) {
    const active=life.getState().current;life.setEnabled(value);
    if(value)pet.resume();
    if(!value&&active&&!manualSleep)show({clip:'idle',label:'安静陪着你'});
    paint();
  }
  $('life-toggle').addEventListener('click',()=>setEnabled(!life.getState().enabled));
  $('life-next').addEventListener('click',()=>next($('life-routine').value||undefined));
  window.addEventListener('yaya:interaction',event=>{
    generation++;manualSleep=event.detail.action==='sleep'&&!pet.getState().sleeping;
    life.interrupt(manualSleep?'你让芽芽安心睡觉':'停下小事，先回应你');paint();
  });
  window.addEventListener('yaya:clip-end',event=>{if(!event.detail.managed)life.satisfy(event.detail.clip);});
  function tick(now) {
    const dt=lastTime?Math.min(.2,(now-lastTime)/1000):0;lastTime=now;
    const p=pet.getState(),blocked=document.hidden||p.paused||!p.ready||p.switching||!p.playing;
    if(manualSleep&&!blocked)life.satisfy('sleep',dt);
    const command=life.tick(dt,{blocked:blocked||manualSleep});if(command)show(command);
    if(now-lastPaint>250){paint();lastPaint=now;}
    requestAnimationFrame(tick);
  }

  // Keep all 31 choices available. A group is a filter, never a renamed or
  // silently dropped face. Physical needs are shown separately from emotions.
  const emotionPanel=$('emotion-panel'),grid=emotionPanel.querySelector('[data-testid="emotion-grid"]');
  emotionPanel.querySelector('h2').textContent='31 种表情与状态';
  const intro=node('p','开心是情绪，思考是认知，困倦是身体状态。按用途分组，更容易找到合适的表达。','catalog-note');
  const filters=node('div',undefined,'emotion-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','表情与状态分类');
  const groupNote=node('p','全部 31 种，均可点选查看。','catalog-note');groupNote.id='emotion-group-note';
  function filterEmotions(key='all') {
    const group=catalog.emotionGroups.find(item=>item.key===key);
    for(const el of grid.querySelectorAll('[data-emotion]'))el.hidden=Boolean(group&&!group.keys.includes(el.dataset.emotion));
    for(const el of filters.querySelectorAll('button'))el.setAttribute('aria-pressed',String(el.dataset.emotionCategory===key));
    groupNote.textContent=group?`${group.label} · ${group.description}`:'全部 31 种，均可点选查看。';
    if(group)pet.selectEmotion(group.keys[0]);
  }
  for(const group of [{key:'all',label:'全部',keys:catalog.emotions.map(e=>e.key)},...catalog.emotionGroups]) {
    const el=button(`${group.label} ${group.keys.length}`,()=>filterEmotions(group.key));el.dataset.emotionCategory=group.key;filters.append(el);
  }
  for(const el of grid.querySelectorAll('[data-emotion]')) {
    const entry=catalog.getEmotion(el.dataset.emotion);if(entry){el.firstChild.textContent=entry.label;el.title=entry.cues.join(' · ');}
  }
  grid.before(intro,filters,groupNote);filterEmotions();
  const gap=node('details',undefined,'catalog-gaps');gap.append(node('summary','查缺补漏：身体需求与活动反馈'));
  gap.append(node('p','饿了、口渴、疲惫、无聊和满足复用已有表情。卧室已可读书、抱熊、操作灯和上下床；画画、浇水、捡拾散落玩具和洗手仍待补充。'));
  for(const item of catalog.gaps){const row=node('p');row.append(node('strong',`${item.label} · ${item.status==='planned'?'待补':'组合表达'}：`),document.createTextNode(item.design));gap.append(row);}
  emotionPanel.append(gap);

  const tablePanel=node('section',undefined,'action-panel catalog-panel');tablePanel.id='action-catalog';
  tablePanel.append(node('h2','动作与场景表'),node('p','基础动作可以单独演示；卧室活动会让芽芽走到物品旁边，连续完成取放和离场。两种入口分别列出。','catalog-note'));
  const scroller=node('div',undefined,'catalog-scroll'),table=node('table');table.innerHTML='<thead><tr><th scope="col">动作</th><th scope="col">道具 / 场景</th><th scope="col">动作过程</th><th scope="col">触发情境</th><th scope="col">状态</th></tr></thead>';
  const body=node('tbody');
  const addRow=entry=>{
    const tr=node('tr');tr.dataset.catalogAction=entry.key;
    const heading=node('th',entry.label);heading.scope='row';tr.append(heading,node('td',entry.props.join('、')||'无需道具'),node('td',entry.beats.join(' → ')),node('td',entry.trigger));
    const status=node('td');
    if(entry.implemented&&entry.inMenu) {const play=button('演示',()=>{pet.selectAction(entry.key);$('action-panel').scrollIntoView({behavior:'smooth',block:'start'});});play.setAttribute('aria-label',`演示${entry.label}`);status.append(play);}
    else status.append(node('span','待开发','planned-label'));
    tr.append(status);body.append(tr);
  };
  catalog.actions.filter(item=>item.inMenu&&item.implemented).forEach(addRow);
  table.append(body);scroller.append(table);tablePanel.append(scroller);

  const roomTitle=node('h3','卧室里的完整活动');
  const roomFeedback=node('p','点“去卧室做”，芽芽会先完成手上的取放，再去做这件事。','catalog-note');
  roomFeedback.id='catalog-room-feedback';roomFeedback.setAttribute('role','status');roomFeedback.setAttribute('aria-live','polite');
  const roomScroller=node('div',undefined,'catalog-scroll'),roomTable=node('table');
  roomTable.innerHTML='<thead><tr><th scope="col">卧室活动</th><th scope="col">道具 / 场景</th><th scope="col">完整过程</th><th scope="col">触发情境</th><th scope="col">体验</th></tr></thead>';
  const roomBody=node('tbody');
  function playRoom(entry) {
    $('life-panel')?.scrollIntoView({behavior:pet.getState().reducedMotion?'auto':'smooth',block:'start'});
    try {
      const frame=document.querySelector('[data-testid="bedroom-frame"]'),room=frame?.contentWindow?.yayaBedroom;
      if(!room?.getState?.().ready) {
        roomFeedback.textContent='卧室还在准备，这次还没有安排活动。等画面出现后，再点一次“去卧室做”。';
        return;
      }
      if(room.request(entry.roomCommand)===false) {
        roomFeedback.textContent='这项卧室活动暂时没有准备好，请在卧室里选择其他活动。';
        return;
      }
      room.play();
      roomFeedback.textContent=`已安排：${entry.label}。芽芽会完成手上的取放，再走过去。`;
    } catch(_) {
      roomFeedback.textContent='暂时无法连接卧室，这次还没有安排活动。请使用卧室画面下方的活动按钮。';
    }
  }
  for(const entry of catalog.roomBehaviors||[]) {
    const tr=node('tr');tr.dataset.catalogRoom=entry.key;
    const heading=node('th',entry.label);heading.scope='row';
    tr.append(heading,node('td',entry.props.join('、')),node('td',entry.beats.join(' → ')),node('td',entry.trigger));
    const cell=node('td'),play=button('去卧室做',()=>playRoom(entry));
    play.dataset.roomCatalogCommand=entry.key;play.setAttribute('aria-label',`在卧室${entry.label}`);cell.append(play);tr.append(cell);roomBody.append(tr);
  }
  roomTable.append(roomBody);roomScroller.append(roomTable);tablePanel.append(roomTitle,roomFeedback,roomScroller);
  const missingActions=catalog.actions.filter(item=>!item.implemented&&!item.availableIn?.includes('bedroom'));
  const planned=node('details',undefined,'catalog-gaps');planned.append(node('summary',`下一批生活动作：${missingActions.length} 项待开发`));
  for(const entry of missingActions) {
    const row=node('p');row.append(node('strong',`${entry.label}（待开发）`),document.createTextNode(` · ${entry.props.join('、')}。${entry.beats.join(' → ')}。`));planned.append(row);
  }
  tablePanel.append(planned,node('p','卧室已包含走近家具、取书还书、抱熊归位、上床和起床。接下来仍需补充餐厅里的走到桌边并坐下、取杯饮水与餐后收拾，以及捡拾地面散落玩具等过程；“检查小柜子”只检查已归位的物品。','catalog-note'));
  emotionPanel.after(tablePanel);
  const nav=document.querySelector('.section-nav');nav.append(button('🌿 小花园生活片段',()=>$('garden-life-panel').scrollIntoView({behavior:'smooth'})));nav.append(button('📋 动作与场景表',()=>tablePanel.scrollIntoView({behavior:'smooth'})));
  // Stable integration hooks for deterministic policy and browser regression checks.
  window.yayaLife={getState:life.getState,setEnabled,next,filterEmotions};
  paint();requestAnimationFrame(tick);
})();
