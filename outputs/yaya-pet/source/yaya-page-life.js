(() => {
  'use strict';
  const pet=window.yayaPet, catalog=window.YayaCatalog;
  if(!pet||!catalog||!window.YayaLife)return;
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  const button=(label,fn)=>{const el=node('button',label);el.type='button';el.addEventListener('click',fn);return el;};
  const life=YayaLife.create({enabled:!pet.getState().reducedMotion});
  let manualSleep=false,lastTime=0,lastPaint=0,generation=0;

  const panel=node('section',undefined,'life-panel');panel.id='life-panel';panel.setAttribute('aria-label','芽芽自己的小日子');
  panel.innerHTML=`<div class="life-heading"><div><span class="life-kicker">芽芽自己的小日子</span><h2 id="life-title">安静陪你一会儿</h2></div><button type="button" id="life-toggle" aria-pressed="true">自主活动：开</button></div>
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
  gap.append(node('p','本轮把饿了、口渴、疲惫、无聊和满足接到生活过程中，复用已有表情。新的道具动作仍单独列为待开发。'));
  for(const item of catalog.gaps){const row=node('p');row.append(node('strong',`${item.label} · ${item.status==='planned'?'待补':'组合表达'}：`),document.createTextNode(item.design));gap.append(row);}
  emotionPanel.append(gap);

  const tablePanel=node('section',undefined,'action-panel catalog-panel');tablePanel.id='action-catalog';
  tablePanel.append(node('h2','动作与场景表'),node('p','点“演示”查看已有动作；待开发项明确列出所需道具和动作过程。自主活动只调用已完成的动画。','catalog-note'));
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
  const planned=node('details',undefined,'catalog-gaps');planned.append(node('summary','下一批生活动作：5 项待开发'));
  for(const entry of catalog.actions.filter(item=>!item.implemented)) {
    const row=node('p');row.append(node('strong',`${entry.label}（待开发）`),document.createTextNode(` · ${entry.props.join('、')}。${entry.beats.join(' → ')}。`));planned.append(row);
  }
  tablePanel.append(planned,node('p','场景衔接还需补充：走到桌边并坐下、从床上起身、取放道具。目前生活流程以短过渡连接完整场景。','catalog-note'));
  emotionPanel.after(tablePanel);
  const nav=document.querySelector('.section-nav');nav.prepend(button('🌿 自主生活',()=>$('life-panel').scrollIntoView({behavior:'smooth'})));nav.append(button('📋 动作与场景表',()=>tablePanel.scrollIntoView({behavior:'smooth'})));
  // Stable integration hooks for deterministic policy and browser regression checks.
  window.yayaLife={getState:life.getState,setEnabled,next,filterEmotions};
  paint();requestAnimationFrame(tick);
})();
