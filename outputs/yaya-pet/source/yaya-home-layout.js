/* The home is data, not scenery pasted behind a collection of action clips.
 * Furniture uses floor-space bounds: x,z are its near-left footprint corner;
 * w,d are floor widths; h is physical height. Mounted items use elevation.
 * Each room has an open camera-facing edge and two visible walls x0 / z0.
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
    f('wardrobe','wardrobe',.12,.25,1.23,2.14,2.94,{wall:'x0',facing:'+x',label:'衣柜',approach:{x:2.05,z:1.31}}),
    f('bookshelf','bookshelf',.13,2.64,1.09,.80,.98,{wall:'x0',facing:'+x',label:'低书柜',approach:{x:2.01,z:3.05},contents:guest?['books']:['books','teddy']}),
    f('desk','desk',3.55,.15,2.96,1.24,1.04,{wall:'z0',facing:'+z',label:'小书桌',approach:{x:5.05,z:3.36}}),
    f('desk-chair','chair',4.24,1.69,1.62,1.23,.67,{facing:'-z',seatYaw:2.053765202651458,label:'书桌椅',approach:{x:5.05,z:3.51},seat:{x:5.05,z:2.31,h:.67}}),
    f('rug','rug',5.12,4.05,3.55,2.85,.02,{collision:false,label:'活动地毯'}),
    mounted('window','window','x0',0,4.75,.05,2.54,1.52,1.70,{label:'窗户',approach:{x:2.09,z:4.35}}),
    mounted('ac','ac','z0',4.30,0,2.24,.18,.52,2.75,{label:'空调'}),
    mounted('picture','picture','x0',0,2.71,.05,.70,.73,1.61,{label:guest?'伙伴的照片位置':'芽芽的叶子画'}),
    f('ceiling-light','ceilingLamp',5.20,4.25,.96,.96,.38,{mounted:true,collision:false,elevation:3.65,label:'顶灯'}),
    f('plant','plant',8.85,.23,.72,.72,.92,{label:'窗边绿植',approach:{x:8.82,z:1.75}})
  ];
  const bathroomFurniture = (accent) => [
    f('shower','shower',.16,.18,2.86,2.74,2.66,{wall:'x0',facing:'+x',label:'淋浴区',approach:{x:3.62,z:1.55},color:accent}),
    f('toilet','toilet',.24,5.33,1.46,1.76,1.23,{wall:'x0',facing:'+x',label:'坐便器',approach:{x:2.35,z:6.17}}),
    f('sink','sink',3.57,.15,2.30,1.05,.60,{wall:'z0',facing:'+z',label:'低洗手台',approach:{x:4.816,z:1.675},washYaw:2.13,grip:{x:4.72,z:.675,h:.64},spout:{x:4.72,z:.675,h:.852},washHand:-1}),
    mounted('mirror','mirror','z0',3.75,0,1.88,.06,1.33,1.38,{label:'镜子'}),
    mounted('towel','towel','x0',0,3.57,.08,1.04,.78,1.18,{label:'小毛巾',approach:{x:1.85,z:4.13}}),
    f('bathmat','rug',3.69,1.43,2.10,1.55,.02,{collision:false,label:'防滑垫',color:accent}),
    f('ceiling-light','ceilingLamp',5.10,4.26,.88,.88,.26,{mounted:true,collision:false,elevation:3.60,label:'防潮顶灯'}),
    mounted('vent','ac','x0',0,6.05,.18,1.21,.38,2.80,{label:'换气扇'})
  ];
  const rooms = {
    bedroom:{id:'bedroom',label:'芽芽的卧室',shortLabel:'芽芽卧室',subtitle:'睡觉、阅读、抱抱小熊',w:10,d:8,palette:palette('#72BFA9'),
      plan:{x:0,z:0,w:6,d:8},spawn:{x:6.55,z:5.92},
      doors:[door('bedroom-living','z0',7.8,'living','living-bedroom','去客厅'),door('bedroom-ensuite','z0',2.30,'ensuite','ensuite-bedroom','自己的卫生间')],
      furniture:bedroomFurniture(false),activities:['sleep','read','teddy','desk','window','wardrobe','wander'],
      anchors:{rest:{x:6.55,z:5.92},read:{x:6.70,z:5.45},play:{x:6.60,z:6.25},book:{x:1.18,z:2.87,h:1.01},teddy:{x:1.18,z:3.22,h:1.01}},
      notes:['床头紧贴左墙，床尾面向可通行的空地。','主门和独卫门都属于右侧墙的真实开口。','书桌、低书柜和衣柜靠墙；中央地毯与门前通道留空。']},
    ensuite:{id:'ensuite',label:'芽芽的独立卫浴',shortLabel:'芽芽独卫',subtitle:'只从芽芽的卧室进入',w:10,d:8,palette:palette('#81CBCD','#D9EEE7','#EEFAF2','#C9E7DD'),
      plan:{x:0,z:8,w:3,d:6},spawn:{x:6.75,z:5.82},privateTo:'bedroom',
      doors:[door('ensuite-bedroom','z0',7.8,'bedroom','bedroom-ensuite','回芽芽卧室')],furniture:bathroomFurniture('#B5DED2'),
      activities:['wash','mirror','wander'],anchors:{rest:{x:6.75,z:5.82}},notes:['洗手台靠墙并配镜子、毛巾。','淋浴与坐便区域分开，中央留通行空间。','不从客厅开门，不作为公卫。']},
    guestroom:{id:'guestroom',label:'伙伴的卧室',shortLabel:'伙伴卧室',subtitle:'为下一位宠物准备的房间',w:10,d:8,palette:palette('#8AADD8','#E4EBF6','#F4F7FD','#E8D6BD'),
      plan:{x:12,z:0,w:6,d:8},spawn:{x:6.55,z:5.92},reserved:true,
      doors:[door('guestroom-living','z0',7.8,'living','living-guestroom','去客厅'),door('guestroom-bathroom','z0',2.30,'bathroom','bathroom-guestroom','伙伴的卫生间')],
      furniture:bedroomFurniture(true),activities:['window','desk','wander'],anchors:{rest:{x:6.55,z:5.92},read:{x:6.70,z:5.45}},
      notes:['家具尺度与芽芽卧室一致，蓝色软装方便识别。','拥有自己的卫生间，保留未来宠物的归属。','当前不会生成第二只宠物，也不会随机占用伙伴的床。']},
    bathroom:{id:'bathroom',label:'伙伴的独立卫浴',shortLabel:'伙伴独卫',subtitle:'只从伙伴的卧室进入',w:10,d:8,palette:palette('#9CB9E0','#E2EAF5','#F3F7FC','#D8E4EF'),
      plan:{x:15,z:8,w:3,d:6},spawn:{x:6.75,z:5.82},privateTo:'guestroom',
      doors:[door('bathroom-guestroom','z0',7.8,'guestroom','guestroom-bathroom','回伙伴卧室')],furniture:bathroomFurniture('#BFD4EA'),
      activities:['wash','mirror','wander'],anchors:{rest:{x:6.75,z:5.82}},notes:['配置淋浴、洗手台、镜子、毛巾和坐便器。','第二卫生间也是独卫，不设面向公共区的门。']},
    living:{id:'living',label:'大家的客厅',shortLabel:'客厅',subtitle:'连接卧室与餐厨的公共空间',w:10,d:8,palette:palette('#DAA377','#F2E6D3','#FFF5E5','#E8CCA3'),
      plan:{x:3,z:8,w:12,d:6},spawn:{x:5.90,z:5.56},
      doors:[door('living-bedroom','z0',1.80,'bedroom','bedroom-living','芽芽卧室'),door('living-kitchen','z0',5,'kitchen','kitchen-living','去餐厨'),door('living-guestroom','z0',8.20,'guestroom','guestroom-living','伙伴卧室')],
      furniture:[
        f('sofa','sofa',.18,2.23,1.58,3.72,1.39,{wall:'x0',facing:'+x',label:'软沙发',approach:{x:2.50,z:4.15},seat:{x:1.06,z:4.13,h:.64},seatYaw:1.087}),
        f('coffee-table','coffeeTable',3.30,3.14,2.13,2.02,.67,{label:'小茶几',approach:{x:5.92,z:4.16}}),
        f('rug','rug',2.41,2.50,4.66,4.15,.025,{collision:false,label:'客厅地毯'}),
        f('bookcase','bookshelf',.17,.21,1.12,1.35,1.00,{wall:'x0',facing:'+x',label:'公共书柜',approach:{x:2.04,z:1.01},contents:['books']}),
        f('toy-basket','basket',.30,6.35,1.18,1.18,.72,{wall:'x0',label:'玩具篮',approach:{x:2.03,z:6.89}}),
        mounted('picture','picture','x0',0,3.17,.06,1.86,1.05,1.95,{label:'家里的合影'}),
        f('plant','plant',8.88,.29,.78,.78,1.12,{label:'客厅绿植',approach:{x:8.49,z:1.83}}),
        mounted('ac','ac','z0',6.06,0,1.19,.18,.48,2.83,{label:'客厅空调'}),
        f('ceiling-light','ceilingLamp',5.15,4.38,1.15,1.15,.39,{mounted:true,collision:false,elevation:3.67,label:'客厅顶灯'})
      ],activities:['sofa','stretch','wave','wander'],anchors:{rest:{x:6.52,z:6.45},play:{x:6.50,z:4.66}},
      notes:['客厅是三扇房门的连接枢纽，门前形成连续通道。','沙发靠左墙，茶几位于沙发前；茶几周围留出绕行空间。','先经过客厅，再进入另一间卧室；独卫不会直通客厅。']},
    kitchen:{id:'kitchen',label:'餐厅与厨房',shortLabel:'餐厨一体',subtitle:'靠墙操作台，中央是小餐桌',w:10,d:8,palette:palette('#DFA176','#F6E5D6','#FFF6E7','#E5D1AC'),
      plan:{x:6,z:0,w:6,d:8},spawn:{x:7.77,z:6.60},
      doors:[door('kitchen-living','z0',7.95,'living','living-kitchen','回客厅')],
      furniture:[
        f('fridge','fridge',.17,.22,1.51,1.55,2.81,{wall:'x0',facing:'+x',label:'冰箱',approach:{x:2.35,z:1.02}}),
        f('sink-counter','sink',.18,2.04,1.34,1.78,1.17,{wall:'x0',facing:'+x',label:'水槽与水杯',approach:{x:2.35,z:2.92},grip:{x:1.36,z:2.92,h:1.18}}),
        f('prep-counter','counter',.18,3.84,1.34,1.42,1.17,{wall:'x0',facing:'+x',label:'备餐台',approach:{x:2.35,z:4.56}}),
        f('stove','stove',.18,5.29,1.34,1.68,1.17,{wall:'x0',facing:'+x',label:'灶台',approach:{x:2.35,z:6.09},interactive:false}),
        f('wall-cabinet','cabinet',.10,2.07,.72,3.12,1.12,{wall:'x0',facing:'+x',mounted:true,collision:false,elevation:1.84,label:'吊柜'}),
        f('dining-table','diningTable',4.63,4.04,2.55,2.02,1.35,{label:'小餐桌',approach:{x:5.91,z:6.93}}),
        f('dining-chair','chair',5.06,6.25,1.66,1.23,.67,{facing:'-z',seatYaw:2.053765202651458,label:'备用餐椅',approach:{x:7.39,z:6.86},seat:{x:5.89,z:6.87,h:.67}}),
        f('spare-chair','chair',5.06,2.80,1.66,1.23,.40,{facing:'+z',seatYaw:-1.0878274509383352,label:'芽芽的餐椅',approach:{x:7.55,z:3.20},seat:{x:5.89,z:3.60,h:.40}}),
        mounted('window','window','z0',2.78,0,2.82,.06,1.61,1.47,{label:'餐厨窗户',approach:{x:4.31,z:1.70}}),
        f('ceiling-light','ceilingLamp',5.92,4.93,1.01,1.01,.40,{mounted:true,collision:false,elevation:3.58,label:'餐桌吊灯'}),
        f('plant','plant',8.95,.24,.69,.69,.78,{label:'小香草盆',approach:{x:8.65,z:1.64}})
      ],activities:['eat','drink','wander'],anchors:{rest:{x:7.77,z:6.60},meal:{x:5.89,z:3.60,h:.40},bowl:{x:5.60,z:4.15,h:1.36},cup:{x:6.24,z:4.30,h:1.36}},
      notes:['冰箱、水槽、备餐台、灶台沿墙布置，不占中间过道。','餐桌和餐椅成组，吃饭需要先到自己的椅子旁坐下。','灶台用于交代厨房功能，当前不给芽芽安排直接接触炉火的动作。']}
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
      if(item.approach)room.points[item.id]={...item.approach};
    }
    for(const key of ['book','teddy'])if(room.anchors[key])room.items[key]={...room.anchors[key],kind:key,parent:'bookshelf'};
    if(room.id==='bedroom'){
      room.points.lamp={x:1.93,z:4.10};
      room.points.window={x:2.09,z:4.35};
    }
    for(const d of room.doors)d.offsetIsCenter=true;
  }
  function getRoom(id){return rooms[id] || rooms.bedroom;}
  function getFurniture(room,id){return getRoom(typeof room==='string'?room:room.id).furniture.find(item=>item.id===id)||null;}
  function doorPoint(room,entry,inset=.68){
    const r=getRoom(typeof room==='string'?room:room.id),d=typeof entry==='string'?r.doors.find(item=>item.id===entry):entry;
    return d?(d.wall==='x0'?{x:inset,z:d.offset}:{x:d.offset,z:inset}):{...r.spawn};
  }
  function roomPath(from,to){
    if(!rooms[from]||!rooms[to])return [];
    const queue=[[from]],seen=new Set([from]);
    while(queue.length){const path=queue.shift(),last=path[path.length-1];if(last===to)return path;
      for(const d of rooms[last].doors)if(!seen.has(d.to)){seen.add(d.to);queue.push([...path,d.to]);}}
    return [];
  }
  function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  globalThis.YayaHomeLayout=freeze({version:'1.0.0',rooms,roomList:Object.values(rooms),roomOrder:['bedroom','ensuite','living','kitchen','guestroom','bathroom'],connections,plan:{w:18,d:14},getRoom,getFurniture,doorPoint,roomPath});
})();
