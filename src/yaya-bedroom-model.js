// Spatial bedroom choreography. A persistent actor and persistent objects move
// through contact, ownership transfer, and release. No room-to-clip cuts.
(() => {
  'use strict';
  const PI=Math.PI,TAU=PI*2,U=28;
  const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
  const mix=(a,b,k)=>a+(b-a)*k;
  const point=(a,b,k)=>({x:mix(a.x,b.x,k),y:mix(a.y,b.y,k)});
  const anchor={book:{x:1415,y:625},teddy:{x:1600,y:625},lamp:{x:206,y:659}};
  const commands=['window','read','teddy','tidy','lamp','sleep','wander'];
  const labels={window:'看看窗外',read:'看一会儿绘本',teddy:'抱抱小熊',tidy:'检查小柜子',lamp:'开关床头灯',sleep:'上床睡一会儿',wander:'在房间散步'};
  function yawNear(from,to){while(to-from>PI)to-=TAU;while(to-from< -PI)to+=TAU;return to;}
  function defaultHands(yaw) {
    const c=Math.cos(yaw),s=Math.sin(yaw);
    return Object.fromEntries([-1,1].map(side=>[side,[side*3.48*c+.45*s,-3.54]]));
  }
  function holdHands(yaw) {
    const center=Math.sin(yaw)*1.25,span=1.4*Math.cos(yaw);
    return {'-1':[center-span,-3.05],'1':[center+span,-3.05]};
  }
  function bodyTransform(s) {
    const gait=s.gait,speed=s.speed||0,walking=s.motion==='walk';
    const bob=walking?-.075*Math.abs(Math.sin(gait))*speed:0;
    const lean=walking?Math.sin(s.yaw)*.025*speed:0;
    return {rotation:s.rotation+lean,x:s.position.x,y:s.position.y+bob*U,
      sx:1+(walking?.015*Math.sin(gait*2)*speed:s.squash||0)*.25,
      sy:1-(walking?.015*Math.sin(gait*2)*speed:s.squash||0)*.45};
  }
  function grips(s) {
    const targets=s.handTargets||(s.carrying?holdHands(s.yaw):null),tf=bodyTransform(s),c=Math.cos(s.yaw),n=Math.sin(s.yaw);
    if(!targets)return [];
    return Object.entries(targets).map(([key,target])=>{
      const side=Number(key),shoulder=[side*2.28*c+.45*n,-3.93];
      const arm=YayaRig.solveArm({side,target,shoulder,layer:'front'});
      const dx=arm.palm[0]*U*tf.sx,dy=arm.palm[1]*U*tf.sy;
      return {...arm,world:[tf.x+dx*Math.cos(tf.rotation)-dy*Math.sin(tf.rotation),tf.y+dx*Math.sin(tf.rotation)+dy*Math.cos(tf.rotation)]};
    });
  }
  function objectFromHands(s) {
    const arms=grips(s);if(arms.length!==2)return null;
    const tf=bodyTransform(s),local=propLocal(s,arms),dx=local[0]*tf.sx,dy=local[1]*tf.sy;
    return {x:tf.x+dx*Math.cos(tf.rotation)-dy*Math.sin(tf.rotation),y:tf.y+dx*Math.sin(tf.rotation)+dy*Math.cos(tf.rotation)};
  }
  function propLocal(s,arms) {
    // During a page turn the left palm supports the book while the right
    // follows the corner. Moving that free hand must not drag the whole book.
    if(s.carrying==='book'&&s.phase==='turn-page'){
      const left=arms.find(arm=>arm.side===-1);
      return [(left.palm[0]+1.4)*U,left.palm[1]*U+16];
    }
    return [(arms[0].palm[0]+arms[1].palm[0])/2*U,(arms[0].palm[1]+arms[1].palm[1])/2*U+16];
  }
  function create({random=Math.random,auto=true}={}) {
    const s={time:0,position:{x:1030,y:930},yaw:0,rotation:0,u:U,gait:0,speed:0,motion:'idle',mood:'idle',
      action:null,phase:'idle',label:'这是芽芽的小卧室，先看看四周',auto,pending:null,carrying:null,handTargets:null,
      seated:0,squash:0,inBed:false,cover:0,sleeping:false,lampOn:true,bookOpen:0,bookPage:0,
      props:{book:{...anchor.book,mode:'shelf'},teddy:{...anchor.teddy,mode:'shelf'}},completed:0,wait:4,recent:{},history:[],phaseTime:0};
    let queue=[],current=null;
    const add=(duration,phase,label,enter,update,finish)=>queue.push({duration,phase,label,enter,update,finish});
    function pose(duration,phase,label,target={},finish) {
      let start,ends;
      add(duration,phase,label,()=>{start={};ends={...target};for(const k of Object.keys(target))start[k]=s[k];if('yaw'in ends)ends.yaw=yawNear(s.yaw,ends.yaw);},k=>{
        const q=ease(k);for(const [name,value] of Object.entries(ends))s[name]=typeof value==='number'?mix(start[name],value,q):k===1?value:s[name];
      },finish);
    }
    function hold(seconds,phase,label,mood='idle') {add(seconds,phase,label,()=>{s.mood=mood;s.motion='idle';s.speed=0;},()=>{});}
    function turn(yaw) {
      let start,end;
      add(.85,'turn','迈小步，转向要去的方向',()=>{start=s.yaw;end=yawNear(start,yaw);},k=>{
        s.yaw=mix(start,end,ease(k));s.turnStep={from:start,to:end,phase:k};
      },()=>{s.turnStep=null;});
    }
    function walkTo(x,y,label='慢慢走过去') {
      let from,heading,startYaw,distance,baseGait,to,turnTime,walkTime;
      add(null,'walk',label,()=>{
        from={...s.position};to={x:x===null?from.x:x,y};distance=Math.hypot(to.x-from.x,to.y-from.y);baseGait=s.gait;
        // Front/back depth travel uses the same feet. Horizontal travel faces
        // left/right; the angle eases in before the first strong step.
        const dx=to.x-from.x,dy=to.y-from.y;
        heading=distance<2?s.yaw:Math.abs(dx)>20?(dx>0?PI/2:-PI/2):dy<0?PI:0;
        startYaw=s.yaw;heading=yawNear(startYaw,heading);
        turnTime=Math.abs(heading-startYaw)>.08?.75:0;walkTime=.55+distance/115;
        current.duration=turnTime+walkTime;s.motion='walk';
      },k=>{
        const elapsed=k*current.duration,progress=clamp((elapsed-turnTime)/walkTime),q=ease(progress);
        const faceProgress=turnTime?clamp(elapsed/turnTime):1;
        s.position=point(from,to,q);s.yaw=mix(startYaw,heading,ease(faceProgress));
        s.turnStep=faceProgress<1?{from:startYaw,to:heading,phase:faceProgress}:null;
        s.gait=baseGait+distance*q/(U*1.7)*PI;s.speed=Math.sin(PI*progress);
      },()=>{s.position={...to};s.motion='idle';s.speed=0;s.turnStep=null;});
    }
    function route(x,y) {
      // The front corridor keeps feet clear of bed/cabinet footprints. All
      // destinations approach furniture from the room side, never through it.
      walkTo(null,905,'先走到空出来的过道');
      walkTo(x,905,'沿着地毯旁的空地走');
      walkTo(x,y,'走近一点，再停稳');
    }
    function handsTo(targets,seconds,phase,label,finish) {
      let start,end;
      add(seconds,phase,label,()=>{start=JSON.parse(JSON.stringify(s.handTargets||(s.carrying?holdHands(s.yaw):defaultHands(s.yaw))));end=typeof targets==='function'?targets():targets;},k=>{
        const q=ease(k);s.handTargets={};for(const side of [-1,1]){const a=start[side]||defaultHands(s.yaw)[side],b=end[side]||defaultHands(s.yaw)[side];s.handTargets[side]=[mix(a[0],b[0],q),mix(a[1],b[1],q)];}
      },finish);
    }
    const contactTargets=key=>Object.fromEntries([-1,1].map(side=>[side,[(anchor[key].x+side*39.2-s.position.x)/U,(anchor[key].y-16-s.position.y)/U]]));
    function pickup(key) {
      route(anchor[key].x,760);turn(0);
      handsTo(()=>contactTargets(key),1.25,'reach',key==='book'?'看准绘本，两只短手靠近书边':'两只手轻轻扶住小熊',()=>{s.carrying=key;s.props[key].mode='hand';});
      handsTo(()=>holdHands(s.yaw),.95,'pick',key==='book'?'拿稳绘本，收进怀里':'把小熊抱到怀里',()=>{s.handTargets=null;});
    }
    function replace(key) {
      route(anchor[key].x,760);turn(0);
      handsTo(()=>contactTargets(key),1.25,'place',key==='book'?'把绘本放回矮柜，手先扶稳':'把小熊放稳在原来的位置',()=>{s.props[key]={...anchor[key],mode:'shelf'};s.carrying=null;});
      handsTo(()=>defaultHands(s.yaw),.75,'release','物品放稳了，再把手收回来',()=>{s.handTargets=null;});
    }
    function lamp(desired) {
      route(300,808);turn(0);
      handsTo(()=>({...defaultHands(0),'-1':[(anchor.lamp.x-s.position.x)/U,(anchor.lamp.y-s.position.y)/U]}),.9,'lamp-reach','伸出短手，碰到床头灯的拉绳',()=>{s.lampOn=desired===undefined?!s.lampOn:desired;});
      hold(.3,'lamp-touch','轻轻碰一下灯绳');
      handsTo(()=>defaultHands(0),.7,'lamp-release','收回小手',()=>{s.handTargets=null;});
    }
    function hop(to,intoBed) {
      let from,startYaw;
      add(1.35,intoBed?'climb':'climb-down',intoBed?'蹬一下小脚，坐到低床上':'把小脚落回地面，站稳',()=>{from={...s.position};startYaw=s.yaw;if(intoBed)s.inBed=true;},k=>{
        const q=ease(k);s.position=point(from,to,q);s.position.y-=Math.sin(PI*k)*(intoBed?34:23);
        s.yaw=mix(startYaw,yawNear(startYaw,intoBed?0:PI/2),q);s.squash=-.07*Math.sin(PI*k);s.seated=intoBed?q:1-q;
      },()=>{s.position={...to};s.squash=0;s.seated=intoBed?1:0;if(!intoBed)s.inBed=false;});
    }
    function roll(down) {
      let baseYaw;
      add(2,down?'lie-down':'sit-up',down?'慢慢躺倒，把后脑放到枕头上':'撑起身体，先坐稳再下床',()=>{s.sleeping=false;baseYaw=Math.round((s.yaw-(down?0:1.28))/TAU)*TAU;},k=>{
        const q=down?ease(k):1-ease(k);s.rotation=-PI/2*q;s.yaw=baseYaw+1.28*q;s.position.x=mix(535,513.2,q);
        const contact=Math.max(...YayaBody.outline().map(([x,y])=>Math.sin(s.rotation)*x*YayaBody.breadth(s.yaw)+Math.cos(s.rotation)*y));
        s.position.y=752.2-contact*U;s.seated=1-q;
      },()=>{s.sleeping=down;});
    }
    function quiltTarget(cover) {
      const world=globalThis.YayaBedroomArt?.quiltGrip?.(cover)||{x:418.84,y:mix(687.8,604.36,cover)};
      const dx=world.x-s.position.x,dy=world.y-s.position.y,c=Math.cos(s.rotation),n=Math.sin(s.rotation);
      return {...defaultHands(s.yaw),'1':[(dx*c+dy*n)/U,(-dx*n+dy*c)/U]};
    }
    function quilt(up) {
      handsTo(()=>quiltTarget(s.cover),.65,'quilt-grip','小手先抓住被子边');
      add(1.25,up?'cover':'uncover',up?'用自己的小手，慢慢把被子拉到胸前':'醒来后，轻轻把被子推回去',()=>{},k=>{
        s.cover=up?ease(k):1-ease(k);s.handTargets=quiltTarget(s.cover);
      });
      handsTo(()=>defaultHands(s.yaw),.65,'quilt-release','放开被子，收好小手',()=>{s.handTargets=null;});
    }
    function build(key) {
      queue=[];s.action=key;s.recent[key]=s.time;s.mood='idle';
      s.history.unshift(labels[key]);s.history=s.history.slice(0,5);
      if(key==='read'||key==='teddy') {
        const item=key==='read'?'book':'teddy';pickup(item);
        // Departure is vertical first, then across the clear corridor.
        walkTo(anchor[item].x,900,'拿好了，离开矮柜');walkTo(key==='read'?1150:1000,920,'带到柔软的地毯上');turn(0);
        pose(.9,'sit','小脚向前放，坐到地毯上',{seated:1,squash:.12});
        if(item==='book') {
          pose(.8,'open-book','小手扶好书边，打开绘本',{bookOpen:1});
          hold(3,'read','低头看看这一页','curious');
          add(1.4,'turn-page','一只手托着书，另一只手拨过书角',()=>{},k=>{
            const curl=Math.sin(PI*k)**2;s.bookPage=ease(k);s.handTargets=holdHands(s.yaw);
            s.handTargets[1][0]-=.56*curl;s.handTargets[1][1]-=.24*curl;
          },()=>{s.handTargets=null;});
          hold(3,'read','看看新一页的图画','happy');
          pose(.8,'close-book','看完了，把绘本合好',{bookOpen:0});
        } else {
          add(4,'hug','抱住小熊，轻轻靠一靠',()=>{s.mood='love';},k=>{
            const squeeze=Math.sin(PI*k*2)**2;s.handTargets=holdHands(s.yaw);
            s.handTargets[-1][0]+=.17*squeeze;s.handTargets[1][0]-=.17*squeeze;
            s.rotation=.026*Math.sin(PI*k*2);s.squash=.12+.018*squeeze;
          },()=>{s.handTargets=null;s.rotation=0;s.squash=.12;});
          hold(2,'hug','小熊也陪芽芽安静待一会儿','relieved');
        }
        pose(.9,'stand','扶好手里的东西，慢慢站起来',{seated:0,squash:0});replace(item);
        walkTo(anchor[item].x,900,'放好了，退回空地');walkTo(1050,930,'回到地毯边');turn(0);
      } else if(key==='sleep') {
        if(s.lampOn)lamp(false);
        route(627,835);turn(-PI/2);
        handsTo(()=>({...defaultHands(s.yaw),'1':[(585-s.position.x)/U,(752-s.position.y)/U]}),.75,'bed-touch','短手先碰到床沿，准备上床');
        handsTo(()=>defaultHands(s.yaw),.45,'bed-push','小脚站稳，准备蹬上低床',()=>{s.handTargets=null;});
        hop({x:535,y:752.2},true);hold(.7,'bed-sit','先在床上坐稳');roll(true);
        quilt(true);
        hold(10,'sleep','仰卧睡着，脸朝上，被子随着呼吸起伏','sleepy');
        quilt(false);roll(false);hold(.8,'bed-sit','坐一小会儿，再下床','sleepy');
        hop({x:627,y:835},false);hold(.5,'land','小脚落地，站稳了','relieved');walkTo(680,910);walkTo(1030,930);turn(0);
        hold(2,'wake-stretch','睡醒了，伸个小懒腰','relieved');
      } else if(key==='lamp') {lamp();walkTo(300,905);walkTo(950,930);turn(0);}
      else if(key==='window') {
        route(1030,790);turn(2.5);hold(5,'watch','站在窗前，看看云朵和外面的树','curious');
        turn(0);walkTo(1030,920);hold(1.5,'settle','看完了，回到小地毯边','happy');
      } else if(key==='tidy') {
        // The normal reading/hugging routines already return their objects.
        route(1510,820);turn(2.6);hold(2,'check-shelf','看看矮柜，小熊和绘本都放好了','proud');turn(0);walkTo(1510,910);walkTo(1050,930);turn(0);
      } else {
        walkTo(1140,940);turn(.45);hold(1.5,'look','停一下，看看自己的小房间','curious');walkTo(1110,825);walkTo(910,930);turn(0);hold(2,'settle','走完一小圈，站好歇歇','relieved');
      }
    }
    function choose() {
      const options=['window','read','teddy','wander','sleep'].filter(key=>s.recent[key]===undefined||s.time-s.recent[key]>75);
      return options.length?options[Math.min(options.length-1,Math.floor(random()*options.length))]:null;
    }
    function enterNext() {
      if(s.pending&&!s.carrying&&!s.inBed&&!s.handTargets&&s.seated<.1) {const key=s.pending;s.pending=null;build(key);}
      current=queue.shift()||null;
      if(!current){s.action=null;s.phase='idle';s.label='在自己的卧室里，安静歇一会儿';s.wait=6+random()*6;s.completed++;s.mood='idle';s.motion='idle';s.handTargets=null;s.speed=0;return;}
      s.phase=current.phase;s.label=current.label;s.phaseTime=0;current.enter?.();
    }
    function request(key) {
      if(!commands.includes(key))return false;
      if(current){s.pending=key;if(s.phase==='sleep')current.duration=Math.min(current.duration,s.phaseTime+.4);}
      else{build(key);enterNext();}
      return true;
    }
    function step(dt) {
      if(!Number.isFinite(dt)||dt<=0)return;
      dt=Math.min(.1,dt);s.time+=dt;
      if(!current){s.wait-=dt;if(s.auto&&s.wait<=0){const key=choose();if(key)request(key);else s.wait=5;}return;}
      s.phaseTime=Math.min(current.duration,s.phaseTime+dt);
      current.update?.(clamp(s.phaseTime/current.duration));
      if(s.phaseTime>=current.duration-1e-8){current.finish?.();enterNext();}
    }
    function getState() {
      const out=JSON.parse(JSON.stringify(s));
      out.handTargets=s.handTargets||(s.carrying?holdHands(s.yaw):null);out.grips=grips(out);
      if(s.carrying){const p=objectFromHands(out);out.props[s.carrying]={...out.props[s.carrying],...p,mode:'hand'};}
      out.remaining=current?current.duration-s.phaseTime:0;out.queueLength=queue.length;
      return out;
    }
    return Object.freeze({step,request,setAuto:value=>{s.auto=Boolean(value);if(value)s.wait=Math.min(s.wait,2);},getState});
  }
  globalThis.YayaBedroomModel=Object.freeze({create,commands,labels,anchor,grips,holdHands,defaultHands,bodyTransform,propLocal});
})();
