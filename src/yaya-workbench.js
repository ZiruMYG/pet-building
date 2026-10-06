// One home canvas and one contextual workbench. Preview clips never replace
// the live room state, and room requests always go through the home controller.
(() => {
  'use strict';
  const $=id=>document.getElementById(id),catalog=window.YayaCatalog,layout=window.YayaHomeLayout;
  const frame=$('home-frame'),video=$('preview-video'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state={tab:'life',room:'bedroom',ready:false,auto:!reduced,playing:!reduced,emotion:'idle',action:'eat',emotionFilter:'all',actionFilter:'all',label:'芽芽正在准备',pendingRoom:null,lastHome:null};
  const queued=[];
  const roomNames={bedroom:'芽芽的卧室',ensuite:'芽芽的独卫',guestroom:'伙伴的卧室',bathroom:'预留独卫',living:'大家的客厅',kitchen:'餐厅与厨房'};
  const roomShort={bedroom:'芽芽卧室',ensuite:'芽芽独卫',guestroom:'伙伴卧室',bathroom:'预留独卫',living:'客厅',kitchen:'餐厨一体'};
  const roomIcons={bedroom:'🛏',ensuite:'🫧',guestroom:'🧸',bathroom:'🚿',living:'🛋',kitchen:'🍳'};
  const roomSub={bedroom:'休息与阅读',ensuite:'卧室内进入',guestroom:'留给下一位伙伴',bathroom:'伙伴卧室内进入',living:'全家的连接处',kitchen:'吃饭与喝水'};
  const actions={sleep:['🌙','上床睡一会儿','走到床边，上床躺好，拉被子入睡。'],read:['📖','拿绘本来读','走到书柜拿书，读完合上并归位。'],teddy:['🧸','抱抱小熊','接住小熊，抱一会儿，再放回原处。'],desk:['✎','到书桌坐坐','走到椅子旁，坐好看看桌上的绘本。'],window:['☁','去窗前看看','走到窗边，看看外面的云和树。'],wardrobe:['♧','看看衣柜','走到衣柜前，看看自己的衣物。'],lamp:['☀','开关床头灯','走到床头柜旁，伸手开关灯。'],wander:['👣','慢慢散个步','沿家具之间的空地走一走。'],wash:['🫧','洗洗小手','到低洗手台，伸手接水、搓洗。'],mirror:['◉','照照镜子','走到镜子前，看看自己。'],sofa:['🛋','在沙发歇歇','走到沙发边，坐一小会儿。'],stretch:['🙆','伸个懒腰','在空地站稳，伸懒腰，打个哈欠。'],wave:['👋','挥手打招呼','看向你，伸出小手挥一挥。'],eat:['🥄','坐好吃饭','走到餐椅旁坐下，用自己的小手吃饭。'],drink:['💧','坐好喝水','到餐桌旁，拿杯子喝一口，再放回。']};
  const descriptions={bedroom:'床头贴墙，床尾朝向活动区；书桌、低书柜和衣柜各自靠墙。窗边有自然光，顶灯、床头灯与空调位置固定。两扇门分别通向客厅和自己的卫浴。',ensuite:'洗手台靠墙，镜子和毛巾就在手边。淋浴、坐便器分区，中间留出通道；入口只连接芽芽卧室。',guestroom:'给未来伙伴准备同尺度的小床、书桌与衣柜，用蓝色软装区分。拥有独立卫浴；芽芽可以来看看，伙伴的床保留给它的主人。',bathroom:'与伙伴卧室直接相连的独立卫浴，包含低洗手台、镜子、淋浴、毛巾和坐便器，不通客厅。',living:'沙发与书柜靠墙，茶几放在沙发前；周围可以绕行。三扇门连接两间卧室和餐厨，门前保持畅通。',kitchen:'冰箱、水槽、备餐台与灶台沿墙排列。餐桌与两张餐椅成组摆放，芽芽先走到自己的椅子旁坐好，再吃饭喝水。'};
  const context={bedroom:'床头靠墙 · 书桌采光 · 柜子贴墙 · 中央活动区',ensuite:'卧室独立入口 · 低洗手台 · 干湿分区',guestroom:'伙伴的专属卧室 · 小床与书桌 · 独立卫浴',bathroom:'伙伴卧室独立入口 · 洗漱与淋浴',living:'靠墙沙发 · 中央茶几 · 门前通路',kitchen:'沿墙操作台 · 餐桌椅成组 · 留出厨房通道'};
  const pendingLabel=key=>typeof key==='string'&&key.startsWith('room:')?`去${roomNames[key.slice(5)]||'下个房间'}`:actions[key]?.[1]||roomNames[key]||'继续下一件事';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const available=room=>layout.rooms[room]?.activities||['wander'];
  function post(command,value){frame.contentWindow?.postMessage({type:'yaya-home-command',command,value},'*');}
  function send(command,value){if(!state.ready&&command!=='getState')queued.push([command,value]);else post(command,value);}
  function setRoom(room){if(!layout.rooms[room])return false;state.pendingRoom=room;send('setRoom',room);updateRoomButtons();$('queue-note').hidden=false;$('queue-note').textContent=`接下来去${roomNames[room]}。芽芽会先完成手上的事，再沿门口走过去。`;return true;}
  function request(key){if(!available(state.room).includes(key))return false;send('request',key);$('queue-note').hidden=false;$('queue-note').textContent=`已安排：${actions[key]?.[1]||key}。先把手里的物品放稳，再继续。`;return true;}
  function roomButtons(){
    $('room-grid').innerHTML=layout.roomOrder.map(key=>`<button type="button" class="room-button" data-room="${key}" aria-pressed="${key===state.room}" aria-label="去${roomNames[key]}"><span class="room-icon" aria-hidden="true">${roomIcons[key]}</span><span><strong>${roomShort[key]}</strong><small>${roomSub[key]}</small></span></button>`).join('');
    $('room-grid').addEventListener('click',event=>{const button=event.target.closest('[data-room]');if(button)setRoom(button.dataset.room);});
  }
  function updateRoomButtons(){document.querySelectorAll('[data-room]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.room===state.room));button.classList.toggle('is-pending',button.dataset.room===state.pendingRoom&&state.pendingRoom!==state.room);});document.querySelectorAll('[data-plan-room] .plan-area').forEach(area=>area.classList.toggle('plan-selected',area.parentElement.dataset.planRoom===state.room));}
  function renderActivities(){
    const list=available(state.room);$('room-action-count').textContent=`${list.length} 项活动`;
    $('room-actions').innerHTML=list.map(key=>`<button type="button" class="activity-button" data-room-action="${key}" title="${esc(actions[key]?.[2]||'')}" aria-pressed="false"><span class="activity-icon" aria-hidden="true">${actions[key]?.[0]||'🌱'}</span><span>${actions[key]?.[1]||key}</span></button>`).join('');
    $('room-title').textContent=roomNames[state.room];$('room-context').textContent=context[state.room];$('room-design').textContent=descriptions[state.room];updateRoomButtons();
  }
  $('room-actions').addEventListener('click',event=>{const button=event.target.closest('[data-room-action]');if(button)request(button.dataset.roomAction);});
  function updateHome(snapshot){
    state.lastHome=snapshot;
    const room=typeof snapshot.room==='string'?snapshot.room:snapshot.room?.id;
    if(room&&layout.rooms[room]&&room!==state.room){state.room=room;renderActivities();}
    const travelTarget=[snapshot.pending,snapshot.action].find(key=>typeof key==='string'&&key.startsWith('room:'))?.slice(5);
    if(travelTarget&&layout.rooms[travelTarget]&&travelTarget!==state.room)state.pendingRoom=travelTarget;
    if(state.pendingRoom===state.room)state.pendingRoom=null;
    if(typeof snapshot.auto==='boolean')state.auto=snapshot.auto;
    if(typeof snapshot.playing==='boolean')state.playing=snapshot.playing;
    if(snapshot.ready&&!state.ready){state.ready=true;$('scene-loading').hidden=true;for(const [command,value]of queued.splice(0))post(command,value);}
    state.label=snapshot.label||snapshot.activityLabel||'芽芽正在看看自己的家';
    $('current-activity').textContent=state.playing?state.label:`已暂停 · ${state.label}`;
    $('activity-detail').textContent=state.pendingRoom?`正沿房门前往${roomNames[state.pendingRoom]}`:snapshot.pending?`接下来：${pendingLabel(snapshot.pending)}`:state.auto?'芽芽会自己找点事做，也会停下来歇歇。':'自由安排已关闭，可以点选家具或右侧活动。';
    $('auto-toggle').setAttribute('aria-checked',String(state.auto));$('play-pause').setAttribute('aria-pressed',String(!state.playing));$('play-pause').textContent=state.playing?'Ⅱ':'▶';$('play-pause').setAttribute('aria-label',state.playing?'暂停芽芽的活动':'继续芽芽的活动');
    $('live-indicator').innerHTML=`<i></i> ${!state.playing?'安静暂停':state.auto?'自在生活':'一起安排'}`;$('live-indicator').classList.toggle('is-paused',!state.playing);
    $('queue-note').hidden=!snapshot.pending&&!state.pendingRoom;
    if(snapshot.pending)$('queue-note').textContent=`接下来：${pendingLabel(snapshot.pending)}。先完成当前的取放或起身。`;
    if(state.pendingRoom)$('queue-note').textContent=`正在前往${roomNames[state.pendingRoom]}，沿途经过${(layout.roomPath(state.room,state.pendingRoom)||[]).map(r=>roomShort[r]).join(' → ')}。`;
    const action=snapshot.action||snapshot.activity;document.querySelectorAll('[data-room-action]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.roomAction===action)));updateRoomButtons();
  }
  window.addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.data?.type!=='yaya-home-state')return;updateHome(event.data.state||{});});
  frame.addEventListener('load',()=>post('getState'));
  $('auto-toggle').addEventListener('click',()=>{state.auto=!state.auto;$('auto-toggle').setAttribute('aria-checked',String(state.auto));send('setAuto',state.auto);});
  $('play-pause').addEventListener('click',()=>{state.playing=!state.playing;$('play-pause').textContent=state.playing?'Ⅱ':'▶';send(state.playing?'play':'pause');});

  function playPreview(){if(document.hidden||!['emotion','action'].includes(state.tab))return;video.play().then(()=>{$('preview-toggle').textContent='Ⅱ';$('preview-toggle').setAttribute('aria-label','暂停预览');}).catch(()=>{$('preview-toggle').textContent='▶';$('preview-toggle').setAttribute('aria-label','播放预览');});}
  function preview(kind,key,autoplay=true){
    const item=kind==='emotion'?catalog.getEmotion(key):catalog.getAction(key);if(!item)return;
    state[kind]=key;
    const base=kind==='emotion'?`assets/emotions/${key}`:(['eat','sleep'].includes(key)?`assets/${key}`:`assets/actions/${key}`);
    const poster=kind==='emotion'?`assets/emotions/${key}.jpg`:`assets/actions/${key}.jpg`;
    video.pause();video.poster=poster;video.src=`${base}.mp4?v=home-v10`;video.load();video.setAttribute('aria-label',`${item.label}动态预览`);
    $('preview-title').textContent=item.label;$('preview-description').textContent=item.description||item.beats.join(' → ');$('preview-tag').textContent=kind==='emotion'?'表情预览':'动作预览';
    $('preview-cues').innerHTML=(item.cues||item.props||[]).slice(0,4).map(c=>`<span>${esc(c)}</span>`).join('');
    document.querySelectorAll(`[data-${kind}]`).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset[kind]===key)));
    $('preview-toggle').textContent='▶';$('preview-toggle').setAttribute('aria-label','播放预览');if(autoplay&&!reduced)playPreview();
    return key;
  }
  function selectTab(tab){
    if(!['life','emotion','action','shape'].includes(tab))return false;state.tab=tab;
    document.querySelectorAll('[data-tab]').forEach(button=>{const selected=button.dataset.tab===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
    document.querySelectorAll('.tab-panel').forEach(panel=>panel.hidden=panel.id!==`panel-${tab}`);
    $('preview-dock').hidden=!['emotion','action'].includes(tab);document.querySelector('.panel-scroll').scrollTop=0;
    if(['emotion','action'].includes(tab))preview(tab,state[tab]);else video.pause();
    $('workbench-footer-copy').textContent=tab==='life'?'房间活动保持连贯，物品用完会归位':tab==='shape'?'大窗口检查细节，主工作台保持简洁':'基础预览保留完整动作，方便逐项比较';return true;
  }
  document.querySelectorAll('[data-tab]').forEach(button=>{button.addEventListener('click',()=>selectTab(button.dataset.tab));button.addEventListener('keydown',event=>{const tabs=['life','emotion','action','shape'];let i=tabs.indexOf(state.tab);if(event.key==='ArrowRight')i=(i+1)%4;else if(event.key==='ArrowLeft')i=(i+3)%4;else if(event.key==='Home')i=0;else if(event.key==='End')i=3;else return;event.preventDefault();selectTab(tabs[i]);$(`tab-${tabs[i]}`).focus();});});
  function filters(kind,groups){$(`${kind}-filters`).innerHTML=[{key:'all',label:'全部'},...groups].map(group=>`<button type="button" data-filter="${group.key}" aria-pressed="${group.key==='all'}">${esc(group.label)}</button>`).join('');$(`${kind}-filters`).addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;state[`${kind}Filter`]=button.dataset.filter;filterSelections(kind);});}
  function filterSelections(kind){const filter=state[`${kind}Filter`];$(`${kind}-filters`).querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));$(`${kind}-grid`).querySelectorAll('[data-category]').forEach(b=>b.hidden=filter!=='all'&&b.dataset.category!==filter);}
  function selections(kind,items){$(`${kind}-grid`).innerHTML=items.map(item=>`<button class="selection-button" type="button" data-${kind}="${item.key}" data-category="${item.category}" aria-pressed="${state[kind]===item.key}" title="${esc(item.description||item.beats?.join(' → ')||'')}">${esc(item.label)}</button>`).join('');$(`${kind}-grid`).addEventListener('click',event=>{const button=event.target.closest(`[data-${kind}]`);if(button)preview(kind,button.dataset[kind]);});}
  $('preview-toggle').addEventListener('click',()=>{if(video.paused)playPreview();else{video.pause();$('preview-toggle').textContent='▶';$('preview-toggle').setAttribute('aria-label','播放预览');}});
  video.addEventListener('pause',()=>{$('preview-toggle').textContent='▶';$('preview-toggle').setAttribute('aria-label','播放预览');});
  video.addEventListener('play',()=>{$('preview-toggle').textContent='Ⅱ';$('preview-toggle').setAttribute('aria-label','暂停预览');});
  video.addEventListener('error',()=>{$('preview-description').textContent='这个预览资源暂时未能加载，其他房间活动仍然可以继续。';$('preview-toggle').textContent='▶';});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});

  const dialogClose=dialog=>{dialog.close();if(dialog.id==='inspector-dialog')$('inspector-frame').src='about:blank';};
  document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>dialogClose(button.closest('dialog'))));
  document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialogClose(dialog);});dialog.addEventListener('close',()=>{if(dialog.id==='inspector-dialog')$('inspector-frame').src='about:blank';});});
  function drawFloorplan(){
    const scale=34,ox=39,oy=30;
    const fills={bedroom:'#edf4df',guestroom:'#e9eff7',ensuite:'#dfefec',bathroom:'#e5edf7',living:'#f6ecd8',kitchen:'#f6e4d1'};
    const blocks=layout.roomOrder.map(id=>{const r=layout.rooms[id],p=r.plan,x=ox+p.x*scale,y=oy+p.z*scale,w=p.w*scale,h=p.d*scale;const small=w<160;return `<g role="button" tabindex="0" aria-label="去${roomNames[id]}" data-plan-room="${id}"><rect class="plan-area ${id===state.room?'plan-selected':''}" x="${x+3}" y="${y+3}" width="${w-6}" height="${h-6}" rx="10" fill="${fills[id]}" stroke="#d2dcc6" stroke-width="2"/><text x="${x+w/2}" y="${y+h/2-20}" text-anchor="middle" font-size="25">${roomIcons[id]}</text><text x="${x+w/2}" y="${y+h/2+10}" text-anchor="middle" font-size="${small?12:15}" font-weight="700" fill="#506b4c">${roomShort[id]}</text><text x="${x+w/2}" y="${y+h/2+33}" text-anchor="middle" font-size="9" fill="#95a089">${small?'卧室内进入':id==='living'?'连接两卧与餐厨':id==='kitchen'?'厨房 + 餐桌':'床 · 衣柜 · 书桌'}</text></g>`;}).join('');
    const links=layout.connections.map(c=>{const x=ox+c.planPoint.x*scale,y=oy+c.planPoint.z*scale;return `<g pointer-events="none"><path d="M${x-13} ${y}h26" stroke="#fffefa" stroke-width="8"/><path d="M${x-11} ${y+1}v-22q22 0 22 22" fill="none" stroke="${c.private?'#8ead9b':'#b4a16d'}" stroke-width="1.5"/><circle cx="${x}" cy="${y+7}" r="2" fill="${c.private?'#8ead9b':'#b4a16d'}"/></g>`;}).join('');
    $('floorplan-content').innerHTML=`<svg class="floorplan-svg" viewBox="0 0 690 548" role="group" aria-label="两室、两个独卫、客厅与餐厨的关系平面图"><rect width="690" height="548" rx="18" fill="#f8faf3"/>${blocks}${links}<text x="345" y="530" text-anchor="middle" font-size="10" fill="#9fab93">独卫只经过各自卧室进入 · 客厅是公共通路</text></svg>`;
    $('floorplan-content').querySelectorAll('[data-plan-room]').forEach(button=>{const go=()=>{setRoom(button.dataset.planRoom);dialogClose($('floorplan-dialog'));selectTab('life');};button.addEventListener('click',go);button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();go();}});});
  }
  $('open-floorplan').addEventListener('click',()=>{drawFloorplan();$('floorplan-dialog').showModal();});
  document.querySelectorAll('[data-inspector]').forEach(button=>button.addEventListener('click',()=>{$('inspector-title').textContent=button.dataset.inspector==='leaves'?'叶子形态与动态':'三视图与骨架';$('inspector-frame').src=`rig-lab.html?embed&workbench&v=home-v10${button.dataset.inspector==='leaves'?'#leaf-lab-title':''}`;$('inspector-dialog').showModal();}));
  function inventory(kind='room'){
    const titles={room:'房间活动',emotion:'表情与状态',action:'基础动作与待补充'};
    let rows='';
    if(kind==='room')rows=layout.roomOrder.flatMap(room=>available(room).map(key=>`<tr><td>${roomShort[room]}</td><td>${actions[key]?.[1]||key}</td><td>${actions[key]?.[2]||''}</td></tr>`)).join('');
    if(kind==='emotion')rows=catalog.emotions.map(item=>`<tr><td><button data-inventory-preview="emotion:${item.key}">${esc(item.label)}</button></td><td>${esc(catalog.emotionGroups.find(g=>g.key===item.category)?.label||'')}</td><td>${esc(item.cues.join(' · '))}</td></tr>`).join('');
    if(kind==='action')rows=catalog.actions.filter(item=>item.inMenu||!item.implemented).map(item=>{
      const connected={read:{props:['低书柜','绘本','地毯'],beats:['走近书柜拿书','带到地毯坐下','打开、翻页、合书','放回书柜']},wash:{props:['低洗手台','水龙头'],beats:['走到洗手台','伸手接水','搓洗小手','收回双手']}}[item.key];
      const props=connected?.props||item.props,beats=connected?.beats||item.beats;
      return `<tr><td>${item.implemented?`<button data-inventory-preview="action:${item.key}">${esc(item.label)}</button>`:esc(item.label)}</td><td><span class="status ${item.implemented||connected?'':'planned'}">${item.implemented?'基础预览已完成':connected?'已接入房间':'后续补充'}</span></td><td>${esc(props.length?props.join('、'):'无需道具')}<br>${esc(beats.join(' → '))}</td></tr>`;
    }).join('');
    $('inventory-content').innerHTML=`<p class="inventory-intro">表情说明「什么感受」，基础动作说明「怎样动」，房间活动把走近、使用物品、收尾连成一段生活。</p><div class="inventory-tabs">${Object.entries(titles).map(([key,label])=>`<button type="button" data-inventory-tab="${key}" aria-pressed="${key===kind}">${label}</button>`).join('')}</div><table class="inventory-table"><thead><tr><th>${kind==='room'?'房间':'名称'}</th><th>${kind==='room'?'活动':'分类 / 状态'}</th><th>${kind==='emotion'?'辨认线索':'道具与动作过程'}</th></tr></thead><tbody>${rows}</tbody></table>`;
    $('inventory-content').querySelectorAll('[data-inventory-tab]').forEach(button=>button.addEventListener('click',()=>inventory(button.dataset.inventoryTab)));
    $('inventory-content').querySelectorAll('[data-inventory-preview]').forEach(button=>button.addEventListener('click',()=>{const[k,key]=button.dataset.inventoryPreview.split(':');dialogClose($('inventory-dialog'));selectTab(k);preview(k,key);state[`${k}Filter`]='all';filterSelections(k);}));
  }
  $('open-inventory').addEventListener('click',()=>{inventory();$('inventory-dialog').showModal();});

  roomButtons();renderActivities();filters('emotion',catalog.emotionGroups);filters('action',catalog.actionCategories.filter(c=>catalog.actions.some(a=>a.inMenu&&a.category===c.key)));selections('emotion',catalog.emotions);selections('action',catalog.actions.filter(a=>a.inMenu&&a.implemented));
  if(location.hash==='#emotion-panel')selectTab('emotion');else if(location.hash==='#action-panel')selectTab('action');else if(['#rig-lab','#leaf-lab-title'].includes(location.hash))selectTab('shape');
  setInterval(()=>{if(!document.hidden)post('getState');},800);
  setTimeout(()=>{if(!state.ready){$('scene-loading').querySelector('strong').textContent='还在准备房间';$('scene-loading').lastElementChild.textContent='请稍等；右侧表情与动作可以先看看。';}},18000);
  window.yayaWorkbench={getState:()=>({...state}),selectTab,selectEmotion:key=>{selectTab('emotion');return preview('emotion',key);},selectAction:key=>{selectTab('action');return preview('action',key);},setRoom,request};
})();
