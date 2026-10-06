// Semantic inventory for the pet UI, life scheduler and agent consumers.
// Pure data: a need is not an emotion. Standalone clip actions and continuous
// room behaviors are separate inventories, with distinct playback contracts.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.YayaCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const emotionGroups = [
    {key:'pleasant',label:'平静与愉快',domain:'emotion',description:'舒适、开心和积极期待。',keys:['idle','happy','excited','laugh','proud','relieved','hopeful']},
    {key:'uncomfortable',label:'低落与不安',domain:'emotion',description:'短暂表达不舒服，并给出安抚和恢复的机会。',keys:['sad','cry','angry','furious','scared','nervous']},
    {key:'cognitive',label:'认知与注意',domain:'cognition',description:'发现、理解和解决事情时的外显状态。',keys:['curious','surprised','confused','thinking','idea','determined']},
    {key:'social',label:'社交与偏好',domain:'social',description:'面对伙伴和物品时的态度。',keys:['love','shy','suspicious','disgusted','cool','starstruck']},
    {key:'playful',label:'玩耍态度',domain:'social',description:'邀请玩耍和轻微淘气，不等于兴奋程度。',keys:['playful','mischief']},
    {key:'physical',label:'身体状态',domain:'body',description:'困倦、入睡和暂时眩晕；不作为情绪值。',keys:['sleepy','dizzy','ko']},
    {key:'engagement',label:'参与需求',domain:'engagement',description:'缺少新鲜事时的无聊，与困倦分开处理。',keys:['bored']}
  ];
  const stateRows = [
    ['idle','平静','安静陪伴，保持轻微呼吸和眨眼。',['自然睁眼','小微笑','侧面圆手','叶子轻摆']],
    ['happy','开心','轻快地表达高兴。',['弯眼','微笑','轻弹一下']],
    ['excited','兴奋','高唤醒的快乐，短时出现后回落。',['睁大眼','张嘴笑','身体上提','叶子立起']],
    ['laugh','咯咯笑','一只手靠近嘴边，月牙眼，轻轻抖两下。',['月牙眼','单手掩嘴','小幅双抖']],
    ['proud','自豪','完成一件事情后抬头挺胸。',['抬头','自信小笑','胸口挺起']],
    ['relieved','安心','紧张或活动结束后放松下来。',['舒展闭眼','呼气','肩手放松','叶子回落']],
    ['hopeful','充满期待','看着即将得到的食物、玩具或回应。',['亮眼','小幅搓手','身体微前倾']],
    ['sad','难过','低头、嘴角向下，叶子垂下来。',['悲伤眉眼','嘴角下垂','叶子下折']],
    ['cry','想哭','难过程度更高，泪水成为主要区别。',['泪眼','张嘴呜咽','短时出现']],
    ['angry','闹别扭','转开视线，哼一声，稍后愿意回来。',['侧过身','抿嘴','避开视线']],
    ['furious','气鼓鼓','鼓脸和短促的生气符号，不表现攻击。',['鼓起腮帮','眉毛下压','小青筋符号']],
    ['scared','有点害怕','对突发陌生刺激的短暂退缩。',['圆眼小瞳孔','缩身','叶子收拢']],
    ['nervous','紧张','等待或准备尝试时的小幅不安。',['视线轻移','小手轻动','汗滴']],
    ['curious','好奇','主动朝新东西看，保持开放而愉快。',['睁眼看向目标','微笑','一片叶子探起']],
    ['surprised','惊讶','事件发生瞬间的反应，随后进入其他状态。',['大眼','O形嘴','靠近嘴边的圆手']],
    ['confused','困惑','暂时没弄明白，有明显的问题线索。',['一高一低眉眼','歪头','粗大的问号']],
    ['thinking','思考','看向上方，托着下巴等想法出现。',['短手托下巴','视线上移','三个点依次出现']],
    ['idea','有主意','找到办法时短暂点亮，再去执行。',['亮眼','微笑','灯泡弹出']],
    ['determined','认真','集中看向目标，准备试一试。',['稳定目光','收住笑容','小拳靠近身体']],
    ['love','喜欢','向喜欢的对象表达亲近。',['爱心眼','胸前小拳','腮红']],
    ['shy','害羞','遮住一点眼睛，仍想偷偷看对方。',['局部遮眼','看向一旁','明显腮红']],
    ['suspicious','悄悄观察','谨慎探看，适合发现未知玩具。',['侧向目光','手靠额侧','动作小']],
    ['disgusted','不喜欢','明确但温和地表达拒绝。',['摇头','手掌推开一点','叶子交叉']],
    ['cool','酷酷的','玩耍时短暂摆一个自信姿势。',['半眯眼','轻挑嘴角','短暂定格']],
    ['starstruck','闪闪着迷','被喜欢的东西吸引，目光停在目标上。',['发光眼','小张嘴','身体朝向目标']],
    ['playful','调皮','友好地邀请一起玩。',['眨眼','吐舌','轻轻摇摆']],
    ['mischief','小淘气','在安全的小玩笑前后露出得意表情。',['眨眼吐舌','手点脸颊','短时出现']],
    ['sleepy','困倦','活力低、眼皮变沉，需要休息。',['半闭眼','下垂叶子','慢节奏']],
    ['dizzy','晕乎乎','过度转动后的短暂身体反应。',['旋涡眼','头顶星星','站稳后恢复']],
    ['ko','睡着啦','入睡的面部状态；完整睡觉请调用 sleep 动作。',['闭眼','小呼吸','安静叶子']],
    ['bored','有点无聊','精力尚可但缺少新鲜事，准备自己找事做。',['平嘴','慢慢环顾','短暂停顿']]
  ];
  const emotions = stateRows.map(([key,label,description,cues]) => {
    const group = emotionGroups.find(item => item.keys.includes(key));
    return {key,label,description,cues,category:group.key,domain:group.domain,implemented:true};
  });

  const actionCategories = [
    {key:'care',label:'吃喝与休息',description:'回应身体需求，有相应的生活场景。'},
    {key:'exercise',label:'移动与运动',description:'有落脚、有重心，运动后允许恢复。'},
    {key:'interaction',label:'交流与回应',description:'由伙伴、物品或具体事件引起。'},
    {key:'play',label:'玩耍与探索',description:'自己寻找新鲜事，也能邀请伙伴。'},
    {key:'learning',label:'安静学习',description:'需要书本、画纸等明确对象。'},
    {key:'housekeeping',label:'照料与整理',description:'对物品产生可见的照顾和整理结果。'}
  ];
  const action = (key,label,category,props,beats,trigger,options={}) => ({
    key,label,category,props,beats,trigger,implemented:true,inMenu:true,
    autonomous:false,duration:key==='sleep'||key==='walk'?8:key==='run'||key==='spin'?6:4,...options
  });
  const actions = [
    action('eat','坐在桌旁吃饭','care',['餐桌','椅子','碗','勺子'],['坐在桌旁看向饭碗','真实圆手握勺送到嘴边','张嘴吃下、咀嚼','放低勺子、稍作停顿'],'饥饿上升，或用户喂食',{autonomous:true,notes:'餐桌椅属于进食场景；勺子绑定真实手掌。走到椅旁和自行坐下的过渡尚待实现。'}),
    action('drink','喝水','care',['水杯'],['看向杯子','举杯贴近嘴边','杯子倾斜、吞咽','放低杯子、放松'],'口渴上升、运动后，或用户给水',{autonomous:true}),
    action('sleep','仰卧睡觉','care',['床','枕头','被子'],['仰卧、后脑枕在枕头上','脸朝上、侧脸露出被子','闭眼、被子轻轻起伏','保持安静呼吸'],'精力低，或用户选择睡觉',{autonomous:true,availableIn:['clip','bedroom'],roomCommand:'sleep',notes:'此 key 保留循环睡眠片段；卧室 sleep 已包含走近床、上床、躺倒、拉被子、起身和下床的连续过程。'}),
    action('stretch','伸懒腰与哈欠','care',[],['身体收拢一点','短手向上舒展','张大嘴打哈欠','双手回到身体两侧'],'睡醒、安静待久，或运动后',{autonomous:true}),
    action('run','小跑','exercise',['跑动线'],['身体前倾','脚步加快并腾空','沿地面往返跑','脚落地、收住速度'],'精力充足时玩耍，或用户选择',{autonomous:true}),
    action('exercise','热身操','exercise',['小哑铃'],['握住哑铃','双手小幅交替举起','配合脚步和身体节奏','回到自然站姿'],'精力充足，或准备开始活动',{autonomous:true}),
    action('ball','玩球','exercise',['球'],['看向球','伸出短手推球','视线追球','等球回来再接着玩'],'想找点乐子，或用户选择',{autonomous:true}),
    action('dance','跳舞','exercise',['音符'],['轻轻摆动','脚步和身体交替','叶子配合节拍','落回站姿'],'心情愉快、精力充足',{autonomous:true}),
    action('jump','跳高','exercise',[],['屈身准备','向上起跳','短暂腾空','落地缓冲'],'玩耍或用户要求',{autonomous:true}),
    action('walk','走一走','exercise',[],['看向要去的方向','交替落脚向前走','到边缘换脚转身','慢慢走回来'],'探索环境、待久后活动一下',{autonomous:true}),
    action('sway','摇摆','exercise',[],['站稳','轻轻向一侧摆','摆回另一侧','停回中间'],'等待、听到节奏，或自娱自乐',{autonomous:true}),
    action('spin','踏步转圈','exercise',[],['换重心','交替迈小步转动','脸和身体使用同一转角','转回正面、站稳'],'短暂自娱，精力尚可时',{autonomous:true,notes:'手臂保持日常短小比例；叶子可有跟随，五官没有独立转向惯性。'}),
    action('stomp','跺跺脚','exercise',[],['站稳','小脚抬起','有节奏地落地','恢复站姿'],'模仿节奏、认真准备或用户选择'),
    action('celebrate','跳起来庆祝','exercise',[],['蹲一蹲蓄力','双手伸开、高高跳起','最高点露出兴奋表情','落地缓冲、开心地站稳'],'完成事情、收到表扬或游戏成功'),
    action('wave','挥挥手','interaction',[],['看向伙伴','一只短手向外抬起','清楚地挥几下','回到平时侧面圆手'],'伙伴出现、打招呼或道别'),
    action('hug','抱泰迪熊','interaction',['泰迪熊'],['身体转向侧面','两只真手围住泰迪熊','轻轻收紧抱一下','放松但保持抱持'],'寻求安慰、喜欢玩偶或用户选择',{autonomous:true}),
    action('reach','伸出手','interaction',[],['看向目标','手臂适度伸展','圆手靠近目标','慢慢收回'],'目标物品或伙伴在近处'),
    action('turn','转向侧面','interaction',[],['换重心','迈一步转向侧面','停下观察','踏步转回'],'注意到旁边的事物',{autonomous:true}),
    action('nod','点点头','interaction',[],['看着伙伴','脸向前下方低一点','叶子一起点下去','抬起脸回应'],'听懂了、表示同意或回应表扬'),
    action('hello','回应招呼','interaction',[],['注意到呼唤','看过来并挥手','露出开心表情','回到陪伴'],'用户呼唤',{inMenu:false,notes:'保留原主舞台交互 key。'}),
    action('cuddle','被摸摸','interaction',[],['注意到触摸','轻轻靠近','露出喜欢和腮红','放松回位'],'用户轻触或抚摸',{inMenu:false,notes:'与 hug 抱泰迪熊不同：这是接收伙伴触摸的回应。'}),
    action('play','互动玩球','play',['球'],['看向小球','跟着球轻轻动','开心地回应','回到陪伴'],'用户选择一起玩',{inMenu:false,notes:'保留原主舞台交互 key；新的自主玩球优先调用 ball。'}),
    action('read','看绘本','learning',['矮桌','椅子','绘本'],['坐到桌边','看一页图画','手靠书角翻页','看完把书合上'],'安静时探索',{implemented:false,inMenu:false,autonomous:false,duration:null,availableIn:['bedroom'],roomCommand:'read',notes:'独立的桌边阅读视频片段尚未制作，不能作为 clip 调用；卧室已可走到矮柜拿书、带到地毯坐下、打开翻页，再合书归位。请调用 roomBehaviors.read。'}),
    action('draw','画画','learning',['矮桌','椅子','纸','蜡笔'],['看着白纸','握笔画几笔','停下看看画','开心地展示'],'获得新画纸或想安静玩',{implemented:false,inMenu:false,autonomous:false,duration:null}),
    action('waterPlant','给植物浇水','housekeeping',['花盆','小水壶','水滴'],['走近花盆','双手拿稳水壶','小幅倾斜浇水','看看植物、收回水壶'],'照料环境',{implemented:false,inMenu:false,autonomous:false,duration:null}),
    action('tidy','收玩具','housekeeping',['玩具','收纳篮'],['发现地上的玩具','弯身捡起','放进篮子','拍拍手、满意地看看'],'玩耍结束',{implemented:false,inMenu:false,autonomous:false,duration:null}),
    action('wash','洗洗手','care',['低洗手台','水龙头','毛巾'],['走到洗手台','短手伸向水流','小幅搓手','擦干手'],'吃饭前、玩耍后',{implemented:false,inMenu:false,autonomous:false,duration:null})
  ];
  // Persistent scenes own furniture, walking routes, grasp points and object
  // transfers. These are model commands, never filenames for the clip player.
  const roomBehavior=(key,label,category,props,beats,trigger,options={})=>({
    key,label,category,scene:'bedroom',roomCommand:key,implemented:true,props,beats,trigger,
    autonomous:true,duration:null,...options
  });
  const roomBehaviors=[
    roomBehavior('window','走到窗前看看','play',['窗户','窗外的云和树'],['沿空过道走到窗前','停稳、转身看向窗外','看一会儿云朵和树','转回来，回到地毯边'],'自主探索，或点选窗户'),
    roomBehavior('read','拿绘本来读','learning',['矮柜','绘本','地毯'],['走到矮柜，双手接触书边后拿起','抱着绘本走到地毯、坐下','打开绘本，看图、翻一页、再看一会儿','合书、起身，走回矮柜放稳后松手','空手回到地毯边'],'自主安静活动，或点选绘本',{notes:'绘本从矮柜转移到真实双手，归位后才松手；书始终属于房间或双手中的一方。'}),
    roomBehavior('teddy','抱抱自己的小熊','interaction',['矮柜','泰迪熊','地毯'],['走到矮柜，双手扶住小熊后抱起','抱着小熊走到地毯、坐下','抱紧一点，轻轻靠一靠','站起、走回矮柜，放稳小熊再松手','空手走回地毯边'],'自主陪伴，或点选小熊'),
    roomBehavior('tidy','检查小柜子','housekeeping',['矮柜','已归位的小熊与绘本'],['走到矮柜前','转过去，看看绘本和小熊的位置','确认都放好了','转回来，走回地毯边'],'用户邀请检查物品',{autonomous:false,notes:'仅检查固定柜面物品。阅读和抱熊流程本身会完成归还；这不等于已实现捡起散落玩具、整理房间或清洁。'}),
    roomBehavior('lamp','开关床头灯','care',['床头灯','灯的拉绳'],['沿空过道走到床头柜旁','站稳后伸短手，接触灯绳','接触时切换灯光','收回手，走回房间空地'],'点选床头灯',{autonomous:false}),
    roomBehavior('sleep','上床睡一会儿','care',['床头灯','低床','枕头','被子'],['灯亮时先走过去关灯','走到床边，手碰床沿，蹬脚上床坐稳','慢慢仰卧，把后脑放到枕头上','手抓被沿拉到胸前，闭眼睡一会儿','醒来推回被子，撑起身体坐稳','下床落地，走回地毯边伸个懒腰'],'自主休息，或点选床',{notes:'睡眠过程中收到新安排时，会先推被、坐起、下床，再转去下一个活动；不会从床上瞬移。'}),
    roomBehavior('wander','在房间散散步','exercise',['地毯','家具之间的空地'],['看向要走的方向、换脚转身','沿家具间的空地走一小段','停下来看看房间','继续走回地毯边，站稳休息'],'自主探索，或用户选择散步')
  ];
  const gaps = [
    {key:'hunger',label:'饿了',domain:'need',status:'composite',availableStates:['hopeful','eat','relieved'],design:'先看向饭碗、手轻靠肚子；坐到桌旁吃饭，之后安静满足。不要把饥饿直接等同难过。'},
    {key:'thirst',label:'口渴',domain:'need',status:'composite',availableStates:['drink','relieved'],design:'注意到杯子并去喝水。内部 thirst 是需求，不新增一个同形的表情。'},
    {key:'energy',label:'疲惫与恢复',domain:'need',status:'composite',availableStates:['sleepy','sleep','stretch','relieved'],design:'动作节奏先放慢，再困倦、睡觉、伸懒腰；避免把 ko 用成受伤昏迷。'},
    {key:'interest',label:'想找点事做',domain:'need',status:'composite',availableStates:['bored','curious','walk','ball','happy'],design:'无聊只短暂露一下，随后主动探索；不要无限循环等用户救场。'},
    {key:'satisfied',label:'满足',domain:'feedback',status:'composite',availableStates:['happy','relieved','idle'],design:'活动完成后轻眯眼、放松、停顿。先复用已有脸型和更慢的节奏，无需新增近似开心的独立表情。'},
    {key:'connection',label:'想陪伴',domain:'social-need',status:'planned',availableStates:['love','wave','hug'],design:'未来以朝向伙伴、挥手、抱玩偶表达，允许自行回到安静活动；当前不新增孤独惩罚值。'}
  ];
  const implementedActions = actions.filter(item => item.implemented).map(item => item.key);
  const getEmotion = key => emotions.find(item => item.key === key) || null;
  const getAction = key => actions.find(item => item.key === key) || null;
  const getRoomBehavior = key => roomBehaviors.find(item => item.key === key) || null;
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  return freeze({version:'1.1.0',emotionGroups,emotions,actionCategories,actions,roomBehaviors,gaps,implementedActions,getEmotion,getAction,getRoomBehavior});
});
