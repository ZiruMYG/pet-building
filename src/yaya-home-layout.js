/* The home is data, not scenery pasted behind a collection of action clips.
 * Furniture uses floor-space bounds: x,z are its near-left footprint corner;
 * w,d are floor widths; h is physical height. Mounted items use elevation.
 * Each room has two open edges (x1 / z1) and two visible walls x0 / z0.
 */
(() => {
  'use strict';
  const f = (id,kind,x,z,w,d,h,extra={}) => ({id,kind,x,z,w,d,h,...extra});
  const mounted = (id,kind,wall,x,z,w,d,h,elevation,extra={}) =>
    f(id,kind,x,z,w,d,h,{wall,mounted:true,collision:false,elevation,...extra});
  const door = (id,wall,offset,to,toDoor,label) => ({id,wall,offset,width:1.8,to,toDoor,label});
  const palette = (accent,wallLeft='#F7EED7',wallRight='#FFF7E6',floor='#EAD0A6') => ({accent,wallLeft,wallRight,floor});
  const bedroomFurniture = (guest=false) => [
    f('bed','bed',.16,4.82,4.10,2.76,.67,{wall:'x0',facing:'+x',label:guest?'伙伴的小床':'芽芽的小床',approach:{x:4.95,z:6.16},pillow:{x:.88,z:6.20,h:.89},sit:{x:3.62,z:6.16,h:.78},sleep:{x:2.25,z:6.16,h:.80},headWall:'x0',color:guest?'#A7C9EE':'#8CD7C9'}),
    f('bedside','bedside',.17,3.68,1.06,.88,.82,{wall:'x0',facing:'+x',label:'床头柜',approach:{x:1.92,z:4.12}}),
    f('bedside-lamp','lamp',.43,3.90,.45,.42,.69,{elevation:.82,collision:false,parent:'bedside',label:'床头灯'}),
    f('wardrobe','wardrobe',.12,.25,1.23,2.14,2.94,{wall:'x0',facing:'+x',label:'衣柜',approach:{x:2.05,z:2.72}}),
    // Keep the low bookshelf on the front solid wall, away from the bed
    // head.  It reads as one intentional storage piece instead of a second
    // bedside cabinet beside the actual bedside table.
    f('bookshelf','bookshelf',2.05,.16,1.12,.50,.98,{wall:'z0',facing:'+z',label:'低书柜',approach:{x:2.62,z:1.20},contents:guest?['books']:['books','teddy']}),
    f('desk','desk',3.55,.15,2.96,1.24,1.04,{wall:'z0',facing:'+z',label:'小书桌',approach:{x:5.05,z:3.36}}),
    // The chair sits square to the desk.  The old diagonal yaw made the pet
    // turn toward the room corner and its feet drift sideways while drawing.
    f('desk-chair','chair',4.24,1.69,1.62,1.23,.67,{facing:'-z',seatYaw:Math.PI,label:'书桌椅',approach:{x:5.05,z:3.51},seat:{x:5.05,z:2.31,h:.67}}),
    // The rug sits in the open centre of the room.  Keeping both exposed
    // edges clear makes the threshold and the bed approach read naturally.
    f('rug','rug',4.20,2.18,3.35,2.42,.02,{collision:false,label:'活动地毯'}),
    mounted('window','window','x0',0,4.75,.05,2.54,1.52,1.70,{label:'窗户',approach:{x:2.09,z:4.35}}),
    mounted('ac','ac','z0',4.30,0,2.24,.18,.52,2.75,{label:'空调'}),
    mounted('picture','picture','x0',0,2.71,.05,.70,.73,1.61,{label:guest?'伙伴的照片位置':'芽芽的叶子画'}),
    f('plant','plant',8.85,.23,.72,.72,.92,{placement:'wall-corner',near:'z0+x1',label:'窗边绿植',approach:{x:8.82,z:1.75}}),
    // The watering can belongs on a small rack beside the plant, never on
    // the floor.  It is decorative and non-blocking so the open edge stays
    // available for room travel.
    f('watering-shelf','plantStand',7.95,.25,.72,.65,.62,{collision:false,blocks:false,decorative:true,label:'水壶架'})
  ];
  const bathroomFurniture = (accent,compact=false) => compact ? [
    f('shower','shower',.12,.12,2.22,2.04,2.42,{wall:'x0',facing:'+x',label:'淋浴区',approach:{x:3.10,z:2.60},color:accent}),
    f('toilet','toilet',.20,4.02,1.22,1.42,1.15,{wall:'x0',facing:'+x',label:'坐便器',approach:{x:1.92,z:4.76}}),
    f('sink','sink',2.88,.14,1.82,.88,.60,{wall:'z0',facing:'+z',label:'低洗手台',approach:{x:3.82,z:1.48},washYaw:2.13,grip:{x:3.79,z:.58,h:.64},spout:{x:3.79,z:.58,h:.852},washHand:-1}),
    mounted('mirror','mirror','z0',3.06,0,1.46,.06,1.12,1.38,{label:'镜子'}),
    mounted('towel','towel','x0',0,3.17,.08,.88,.70,.78,{label:'小毛巾',approach:{x:2.65,z:3.25}}),
    f('bathmat','rug',2.76,2.03,1.56,1.14,.02,{collision:false,label:'防滑垫',color:accent}),
    mounted('vent','ac','x0',0,4.98,.18,1.04,.34,2.60,{label:'换气扇'})
  ] : [
    f('shower','shower',.16,.18,2.86,2.74,2.66,{wall:'x0',facing:'+x',label:'淋浴区',approach:{x:3.62,z:1.80},color:accent}),
    f('toilet','toilet',.24,5.33,1.46,1.76,1.23,{wall:'x0',facing:'+x',label:'坐便器',approach:{x:2.35,z:6.17}}),
    f('sink','sink',3.57,.15,2.30,1.05,.60,{wall:'z0',facing:'+z',label:'低洗手台',approach:{x:4.816,z:1.675},washYaw:2.13,grip:{x:4.72,z:.675,h:.64},spout:{x:4.72,z:.675,h:.852},washHand:-1}),
    mounted('mirror','mirror','z0',3.75,0,1.88,.06,1.33,1.38,{label:'镜子'}),
    mounted('towel','towel','x0',0,3.57,.08,1.04,.78,.78,{label:'小毛巾',approach:{x:1.85,z:4.13}}),
    f('bathmat','rug',3.69,1.43,2.10,1.55,.02,{collision:false,label:'防滑垫',color:accent}),
    mounted('vent','ac','x0',0,6.05,.18,1.21,.38,2.80,{label:'换气扇'})
  ];
  const rooms = {
    bedroom:{id:'bedroom',label:'芽芽的卧室',shortLabel:'芽芽卧室',subtitle:'睡觉、阅读、抱抱小熊',w:10,d:8,palette:palette('#F18B62','#FFE2B5','#FFF4D1','#EFC878'),
      plan:{x:0,z:0,w:6,d:8},spawn:{x:6.55,z:5.92},
      // Doors live on the two exposed edges of the dollhouse.  x1 is the
      // right/open edge and z1 is the front/open edge; x0/z0 remain solid
      // display walls for furniture and pictures.
      doors:[door('bedroom-living','x1',5.92,'living','living-bedroom','去客厅'),door('bedroom-ensuite','z1',6.25,'ensuite','ensuite-bedroom','自己的卫生间')],
      furniture:bedroomFurniture(false),activities:['sleep','read','teddy','desk','window','wardrobe','wander'],
      anchors:{rest:{x:6.55,z:5.92},read:{x:6.70,z:5.45},play:{x:6.60,z:6.25},book:{x:2.37,z:.42,h:.80},teddy:{x:2.60,z:.42,h:.80}},
      notes:['床头紧贴左墙，床尾面向可通行的空地。','主门和独卫门位于两条无墙边，门前保持连续动线。','书桌、低书柜和衣柜靠墙；中央地毯与门前通道留空。']},
    ensuite:{id:'ensuite',label:'芽芽的独立卫浴',shortLabel:'芽芽独卫',subtitle:'只从芽芽的卧室进入',w:7,d:6,palette:palette('#37C4C7','#D8F5EE','#EFFCF8','#BFE9DE'),
      plan:{x:0,z:8,w:3,d:6},spawn:{x:5.65,z:4.62},privateTo:'bedroom',
      doors:[door('ensuite-bedroom','z1',4.78,'bedroom','bedroom-ensuite','回芽芽卧室')],furniture:bathroomFurniture('#B5DED2',true),
      activities:['wash','mirror','wander'],anchors:{rest:{x:5.65,z:4.62}},notes:['洗手台靠墙并配镜子、毛巾。','淋浴与坐便区域分开，中央留通行空间。','不从客厅开门，不作为公卫。']},
    guestroom:{id:'guestroom',label:'伙伴的卧室',shortLabel:'伙伴卧室',subtitle:'为下一位宠物准备的房间',w:10,d:8,palette:palette('#8B82E8','#E7E2FF','#F8F1FF','#D5C5F0'),
      plan:{x:12,z:0,w:6,d:8},spawn:{x:6.55,z:5.92},reserved:true,
      doors:[door('guestroom-living','x1',5.92,'living','living-guestroom','去客厅'),door('guestroom-bathroom','z1',6.25,'bathroom','bathroom-guestroom','伙伴的卫生间')],
      furniture:bedroomFurniture(true),activities:['window','desk','wander'],anchors:{rest:{x:6.55,z:5.92},read:{x:6.70,z:5.45},book:{x:2.37,z:.42,h:.80},teddy:{x:2.60,z:.42,h:.80}},
      notes:['家具尺度与芽芽卧室一致，蓝色软装方便识别。','拥有自己的卫生间，门从无墙边进入，保留未来宠物的归属。','当前不会生成第二只宠物，也不会随机占用伙伴的床。']},
    bathroom:{id:'bathroom',label:'伙伴的独立卫浴',shortLabel:'伙伴独卫',subtitle:'只从伙伴的卧室进入',w:7,d:6,palette:palette('#62B4EE','#DFEEFF','#F2F8FF','#C2DCF5'),
      plan:{x:15,z:8,w:3,d:6},spawn:{x:5.65,z:4.62},privateTo:'guestroom',
      doors:[door('bathroom-guestroom','z1',4.78,'guestroom','guestroom-bathroom','回伙伴卧室')],furniture:bathroomFurniture('#BFD4EA',true),
      activities:['wash','mirror','wander'],anchors:{rest:{x:5.65,z:4.62}},notes:['配置淋浴、洗手台、镜子、毛巾和坐便器。','第二卫生间也是独卫，门设在无墙边，不设面向公共区的墙门。']},
    // All playable rooms share the paper-cut material system:
    // warm paper walls, a slightly darker floor sheet, and room accents
    // that keep the furniture fold edges coherent across the house.
    living:{id:'living',label:'大家的客厅',shortLabel:'客厅',subtitle:'连接卧室与餐厨的公共空间',w:10,d:8,palette:palette('#FF9D67','#FFE8C5','#FFF4DC','#F4D287'),
      plan:{x:3,z:8,w:12,d:6},spawn:{x:8.50,z:6.20},
      doors:[door('living-bedroom','x1',1.15,'bedroom','bedroom-living','芽芽卧室'),door('living-kitchen','z1',9.00,'kitchen','kitchen-living','去餐厨'),door('living-guestroom','x1',6.65,'guestroom','guestroom-living','伙伴卧室')],
      furniture:[
        // Face the solid back wall so the sofa and the wall-mounted TV form
        // one clear viewing axis.  The open edges remain free for circulation.
        // The sofa faces the TV on the z0 wall.  Keep the sit yaw on the same
        // screen-heading branch as the dining chairs (2.0538 rad); -1.087
        // points back toward the viewer and made a seated pet face the room
        // instead of watching the TV.
        f('sofa','sofa',3.10,5.65,4.35,1.82,1.39,{wall:'z0',facing:'-z',label:'软沙发',approach:{x:6.10,z:4.90},seat:{x:5.28,z:6.35,h:.64},seatYaw:2.053765202651458}),
        // Keep the table as a small, jewel-like accent in front of the sofa;
        // the reduced footprint leaves a clear walking pocket around it.
        f('coffee-table','coffeeTable',3.35,3.30,1.68,1.48,.54,{label:'小茶几',approach:{x:5.92,z:4.16}}),
        f('rug','rug',2.20,1.62,5.30,3.68,.025,{collision:false,label:'客厅地毯'}),
        f('bookcase','bookshelf',.17,.21,1.12,1.35,1.00,{wall:'x0',facing:'+x',label:'公共书柜',approach:{x:2.04,z:1.01},contents:['books']}),
        f('toy-basket','basket',.30,6.35,1.18,1.18,.72,{wall:'x0',label:'玩具篮',approach:{x:2.03,z:6.89}}),
        mounted('picture','picture','x0',0,3.17,.06,1.86,1.05,1.95,{label:'家里的合影'}),
        mounted('window','window','z0',6.25,0,2.55,.06,1.58,1.58,{label:'客厅窗户',approach:{x:7.47,z:1.02}}),
        mounted('tv','tv','z0',2.05,0,3.60,.06,1.52,.76,{label:'客厅电视'}),
        // Keep the right/open-edge bedroom doorway clear; the plant now sits
        // farther back so its expanded collision box cannot swallow the door
        // stance or the short approach route.
        f('plant','plant',9.05,.06,.66,.52,1.04,{placement:'wall-corner',near:'z0+x1',label:'客厅绿植',approach:{x:8.55,z:1.15}}),
        f('watering-shelf','plantStand',8.10,.10,.72,.64,.62,{collision:false,blocks:false,decorative:true,label:'水壶架'}),
        mounted('ac','ac','z0',8.95,0,.72,.18,.48,2.83,{label:'客厅空调'}),
      ],activities:['sofa','stretch','wave','wander'],anchors:{rest:{x:8.50,z:6.20},play:{x:6.50,z:4.66}},
      notes:['客厅是三扇无墙边房门的连接枢纽，门前形成连续通道。','沙发靠左墙，茶几位于沙发前；茶几周围留出绕行空间。','先经过客厅，再进入另一间卧室；独卫不会直通客厅。']},
    kitchen:{id:'kitchen',label:'餐厅与厨房',shortLabel:'餐厨一体',subtitle:'靠墙操作台，中央是小餐桌',w:10,d:8,palette:palette('#F2A33E','#FFE1B8','#FFF4D1','#EFCB8E'),
      plan:{x:6,z:0,w:6,d:8},spawn:{x:7.77,z:6.60},
      doors:[door('kitchen-living','z1',9.00,'living','living-kitchen','回客厅')],
      furniture:[
        f('fridge','fridge',.17,.22,1.51,1.55,2.81,{wall:'x0',facing:'+x',label:'冰箱',approach:{x:2.35,z:1.02}}),
        f('sink-counter','sink',.18,2.04,1.34,1.78,1.17,{wall:'x0',facing:'+x',label:'水槽与水杯',approach:{x:2.35,z:2.92},grip:{x:1.24,z:2.92,h:1.18},spout:{x:1.24,z:2.92,h:1.58}}),
        f('prep-counter','counter',.18,3.84,1.34,1.42,1.17,{wall:'x0',facing:'+x',label:'备餐台',approach:{x:2.35,z:4.56}}),
        f('stove','stove',.18,5.29,1.34,1.68,1.17,{wall:'x0',facing:'+x',label:'小汤锅与灶台',approach:{x:2.35,z:6.09}}),
        // The hanging cabinet is shallow and flush to the x0 wall.  Its
        // doors follow the same x0 plane instead of projecting as a warped
        // floor cabinet.
        f('wall-cabinet','cabinet',.08,2.22,.50,2.86,1.02,{wall:'x0',facing:'+x',mounted:true,collision:false,elevation:1.84,label:'吊柜',alignment:'sink-prep-center'}),
        f('dining-table','diningTable',4.63,4.04,2.55,2.02,1.35,{label:'小餐桌',approach:{x:7.80,z:5.1}}),
        f('dining-chair','chair',5.06,6.25,1.66,1.23,.67,{facing:'-z',seatYaw:2.053765202651458,label:'备用餐椅',approach:{x:7.39,z:6.86},seat:{x:5.89,z:6.87,h:.67}}),
        f('spare-chair','chair',5.06,2.80,1.66,1.23,.40,{facing:'+z',seatYaw:-1.0878274509383352,label:'芽芽的餐椅',approach:{x:7.55,z:3.20},seat:{x:5.89,z:3.60,h:.40}}),
        mounted('window','window','z0',2.78,0,2.82,.06,1.61,1.47,{label:'餐厨窗户',approach:{x:4.31,z:1.70}}),
        f('plant','plant',8.95,.24,.69,.69,.78,{placement:'wall-corner',near:'z0+x1',label:'小香草盆',approach:{x:8.65,z:1.64}}),
        f('watering-shelf','plantStand',8.02,.28,.72,.64,.62,{collision:false,blocks:false,decorative:true,label:'水壶架'})
      ],activities:['eat','drink','wander'],anchors:{rest:{x:7.77,z:6.60},meal:{x:5.89,z:3.60,h:.40},bowl:{x:5.60,z:4.15,h:1.36},cup:{x:6.24,z:4.30,h:1.36}},
      notes:['冰箱、水槽、备餐台、灶台沿墙布置，不占中间过道。','餐桌和餐椅成组，吃饭需要先到自己的椅子旁坐下。','汤锅旁留勺子，芽芽站稳后搅拌；没有明火接触动作。']}
  };
  const connections = [
    {id:'bedroom-living',from:'bedroom',to:'living',fromDoor:'bedroom-living',toDoor:'living-bedroom',planPoint:{x:4.72,z:8}},
    {id:'bedroom-ensuite',from:'bedroom',to:'ensuite',fromDoor:'bedroom-ensuite',toDoor:'ensuite-bedroom',planPoint:{x:1.55,z:8},private:true},
    {id:'guestroom-living',from:'guestroom',to:'living',fromDoor:'guestroom-living',toDoor:'living-guestroom',planPoint:{x:13.30,z:8}},
    {id:'guestroom-bathroom',from:'guestroom',to:'bathroom',fromDoor:'guestroom-bathroom',toDoor:'bathroom-guestroom',planPoint:{x:16.48,z:8},private:true},
    {id:'living-kitchen',from:'living',to:'kitchen',fromDoor:'living-kitchen',toDoor:'kitchen-living',planPoint:{x:9,z:8}}
  ];
  // Renderer and navigation share the same metadata. A rug or wall fixture
  // must not become an invisible obstacle; an item belongs to a real surface.
  for(const room of Object.values(rooms)){
    room.items={};room.points={...room.anchors};
    for(const item of room.furniture){
      item.blocks=item.collision!==false&&!item.mounted;
      if(item.kind==='plant'){
        item.placement=item.placement||'wall-corner';
        item.near=item.near||'storage-or-corner';
      }
      if(item.approach)room.points[item.id]={...item.approach};
    }
    for(const key of ['book','teddy'])if(room.anchors[key])room.items[key]={...room.anchors[key],kind:key,parent:'bookshelf'};
    if(room.id==='bedroom'){
      room.points.lamp={x:1.93,z:4.10};
      room.points.window={x:2.09,z:4.35};
    }
    for(const d of room.doors){
      d.offsetIsCenter=true;
      // Store the physical edge so input, animation and rendering all agree
      // on the same threshold even when the edge has no wall behind it.
      d.edge= d.wall==='x1' ? room.w : d.wall==='z1' ? room.d : 0;
    }
  }
  function getRoom(id){return rooms[id] || rooms.bedroom;}
  function getFurniture(room,id){return getRoom(typeof room==='string'?room:room.id).furniture.find(item=>item.id===id)||null;}
  function doorPoint(room,entry,inset=.68){
    const r=getRoom(typeof room==='string'?room:room.id),d=typeof entry==='string'?r.doors.find(item=>item.id===entry):entry;
    if(!d)return {...r.spawn};
    const axis=d.wall[0],max=d.wall.endsWith('1');
    const edge=axis==='x'?r.w:r.d,along=d.offset;
    return axis==='x'?{x:max?edge-inset:inset,z:along}:{x:along,z:max?edge-inset:inset};
  }
  function doorHandle(d,open=0){
    const theta=Math.max(0,Math.min(1,open))*Math.PI*.46;
    const along=d.offset-d.width/2+.02+(d.width-.04)*.82*Math.cos(theta),span=(d.width-.04)*.82*Math.sin(theta);
    const axis=d.wall[0],max=d.wall.endsWith('1'),edge=Number.isFinite(d.edge)?d.edge:0,outside=max?1:-1,coord=edge+outside*(.035+span);
    return axis==='x'?{x:coord,z:along,h:1.25}:{x:along,z:coord,h:1.25};
  }
  function roomPath(from,to){
    if(!rooms[from]||!rooms[to])return [];
    const queue=[[from]],seen=new Set([from]);
    while(queue.length){const path=queue.shift(),last=path[path.length-1];if(last===to)return path;
      for(const d of rooms[last].doors)if(!seen.has(d.to)){seen.add(d.to);queue.push([...path,d.to]);}}
    return [];
  }
  // One scene graph is the hand-off point between layout, navigation, hit
  // testing and painting. The object itself remains the source of truth, but
  // every consumer can now use the same space, footprint, wall plane and
  // render depth instead of re-deriving them independently.
  function sceneGraph(room,options={}){
    const candidate=typeof room==='string'?getRoom(room):room;
    const r=candidate&&rooms[candidate.id]?rooms[candidate.id]:candidate||rooms.bedroom;
    const furniture=r.furniture||[],nodes=furniture.map((o,index)=>{
      const mounted=o.mounted===true;
      const space=mounted?'wall':o.kind==='rug'?'floor-decoration':o.kind==='lamp'?'surface':'floor';
      const depth=o.depth??(o.x+o.z+(o.w||0)/2+(o.d||0)/2);
      return {id:o.id,index,kind:o.kind,space,object:o,
        footprint:mounted?null:{x:o.x,z:o.z,w:o.w,d:o.d},
        bounds:{x:o.x,z:o.z,w:o.w,d:o.d,h:o.h||0},
        wall:mounted?{id:o.wall,offset:o.wall==='x0'?o.z:o.x,span:o.wall==='x0'?o.d:o.w,elevation:o.elevation||0}:null,
        collision:o.collision!==false&&o.blocks!==false&&!mounted,
        depth,layer:mounted?'wall':space==='surface'?'surface':'floor'};
    });
    const doors=(r.doors||[]).map(d=>({id:d.id,wall:d.wall,offset:d.offset,width:d.width,edge:d.edge,to:d.to,toDoor:d.toDoor,threshold:doorPoint(r,d,.68)}));
    return {id:r.id,dimensions:{w:r.w,d:r.d},plan:r.plan,axes:{x:'east',z:'south',openEdges:['x1','z1'],solidWalls:['x0','z0']},nodes,doors,
      constraints:{actorClearance:.43,wallClearance:.40,doorClearance:.43,plantPlacement:'wall-corner-or-storage'},options};
  }
  // A deterministic geometry lint pass kept beside the source-of-truth
  // layout. Renderer, navigation, and future room editors can run this before
  // showing a scene, so bad furniture placement is caught in data space.
  function rectsOverlap(a,b,pad=0){
    return a.x < b.x+b.w+pad && a.x+a.w+pad > b.x && a.z < b.z+b.d+pad && a.z+a.d+pad > b.z;
  }
  function nearCorner(o,r,margin=.72){
    return o.x<=margin || o.z<=margin || r.w-(o.x+o.w)<=margin || r.d-(o.z+o.d)<=margin;
  }
  function nearStorage(o,r,margin=.82){
    return r.furniture.some(other=>{
      if(other===o||other.mounted||!['wardrobe','bookshelf','bookcase','cabinet','counter','sink','fridge'].includes(other.kind))return false;
      return rectsOverlap(o,other,margin);
    });
  }
  function validateLayout(options={}){
    const errors=[],warnings=[];
    for(const r of Object.values(rooms)){
      for(const o of r.furniture){
        if(![o.x,o.z,o.w,o.d,o.h].every(Number.isFinite))errors.push(`${r.id}/${o.id}: 尺寸或位置不是有限数字`);
        if(o.mounted){
          if(!['x0','z0'].includes(o.wall))errors.push(`${r.id}/${o.id}: 墙面家具必须挂在 x0 或 z0`);
          if(o.collision!==false||o.blocks)errors.push(`${r.id}/${o.id}: 墙面家具不能进入地面碰撞层`);
          continue;
        }
        if(o.x<0||o.z<0||o.x+o.w>r.w||o.z+o.d>r.d)errors.push(`${r.id}/${o.id}: 家具越过房间边界`);
        if(o.kind==='plant'&&!nearCorner(o,r)&&!nearStorage(o,r))errors.push(`${r.id}/${o.id}: 绿植必须靠角落或收纳家具`);
        if(o.kind==='sofa'&&!['-x','+x','-z','+z'].includes(o.facing))errors.push(`${r.id}/${o.id}: 沙发缺少有效朝向`);
        if(o.kind==='sofa'&&o.approach&&rectsOverlap({x:o.approach.x-.43,z:o.approach.z-.43,w:.86,d:.86},o,.01))errors.push(`${r.id}/${o.id}: 沙发坐前净空落在自身占地内`);
      }
      for(const d of r.doors){
        const p=doorPoint(r,d,.68),clear={x:p.x-.43,z:p.z-.43,w:.86,d:.86};
        if(p.x<0||p.z<0||p.x>r.w||p.z>r.d)errors.push(`${r.id}/${d.id}: 门槛点越过房间边界`);
        for(const o of r.furniture)if(!o.mounted&&o.blocks!==false&&rectsOverlap(clear,o,.01))errors.push(`${r.id}/${d.id}: 门前净空与 ${o.id} 重叠`);
      }
      const solids=r.furniture.filter(o=>!o.mounted&&o.blocks!==false);
      // A few chairs intentionally tuck close to a table; use a tiny lint
      // epsilon so a one-centimetre visual gap is not reported as a fault.
      for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++)if(rectsOverlap(solids[i],solids[j],.005))warnings.push(`${r.id}: ${solids[i].id} 与 ${solids[j].id} 有轻微占地重叠`);
    }
    const result={ok:errors.length===0,errors,warnings};
    if(options.throwOnError&&errors.length)throw Error(`YayaHomeLayout: ${errors.join('; ')}`);
    return result;
  }
  function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  globalThis.YayaHomeLayout=freeze({version:'1.2.0',rooms,roomList:Object.values(rooms),roomOrder:['bedroom','ensuite','living','kitchen','guestroom','bathroom'],connections,plan:{w:18,d:14},getRoom,getFurniture,doorPoint,doorHandle,roomPath,sceneGraph,validateLayout});
})();
