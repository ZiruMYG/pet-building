// One room, one persistent character rig. No video backgrounds or duplicate
// prop hands: held objects render between the shared arm bands and palms.
(() => {
  'use strict';
  function stepTurn(turn) {
    if(!turn)return undefined;
    const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    // Each sole plants while the other takes a small step around it. The
    // face stays rigidly attached to the turning body, with no gaze lag.
    const feet=[-1,1].map((side,index)=>{
      const q=Math.max(0,Math.min(1,(turn.phase-(index?.50:.04))/.44));
      const k=smooth(q),start=side*1.35;
      return {x:start*(Math.cos(turn.from)*(1-k)+Math.cos(turn.to)*k)+.1*Math.sin(turn.from+(turn.to-turn.from)*k),
        z:-start*(Math.sin(turn.from)*(1-k)+Math.sin(turn.to)*k)+.1*Math.cos(turn.from+(turn.to-turn.from)*k),
        lift:.24*Math.sin(Math.PI*q),yaw:turn.from+(turn.to-turn.from)*k};
    });
    return {feet,bodyX:0,bodyZ:0,bob:0,lean:0,squash:0,duration:YayaLeaves.period};
  }
  function draw(t,s) {
    const A=YayaBedroomArt,D=YayaDrawing,V=YayaViews,u=s.u||28;
    A.drawBackground(t,{lampOn:s.lampOn});
    A.drawFurniture({lampOn:s.lampOn,bedOccupancy:s.inBed,bookOnShelf:s.props.book.mode==='shelf',teddyOnShelf:s.props.teddy.mode==='shelf'});
    const sleeping=s.sleeping&&['sleep','cover','quilt-release','quilt-grip','uncover'].includes(s.phase);
    let mood=sleeping?'sleepy':s.mood||'idle';
    const state=getYayaEmotionState(mood,t);
    state.action=s.motion==='walk'?'walk':'idle';
    if(s.turnStep)state.action='turn';
    state.sleeping=sleeping;state.emote=null;
    state.pose={...state.pose,dy:0,dx:0,rot:0,sq:s.squash||0,left:0,right:0,footL:0,footR:0};
    if(sleeping)state.face={...state.face,eyes:'closed',mouth:'small',closed:1};
    if(['read','turn-page','open-book','close-book'].includes(s.phase)){
      state.state='idle';
      state.face={...state.face,eyes:'look',lookX:Math.sin(s.phaseTime*1.4)*.2,lookY:.85,mouth:'smile'};
    }
    if(!s.action)state.pose.sq=.018*Math.sin(t*Math.PI/2);
    if(s.phase==='watch'){state.leafShape='upright';state.leafMotion='alternate';}
    if(s.phase==='hug'){state.face={...state.face,eyes:'relieved',mouth:'smile'};state.leafShape='cup';state.leafMotion='breathe';}
    if(s.phase==='wake-stretch') {
      state.action='stretch';state.state='stretch';
    }
    const onBed=s.inBed;
    const quilting=['cover','uncover','quilt-grip','quilt-release'].includes(s.phase);
    const hands=s.handTargets||YayaBedroomModel.defaultHands(s.yaw);
    // The folded cover remains on the bed during climbing/sitting. During a
    // pull it is between torso and palms so the same real hand holds its edge.
    if(onBed&&!quilting)A.drawQuilt({...A.layout.bed,cover:0});
    push();translate(s.position.x,s.position.y);rotate(s.rotation||0);
    const view={yaw:s.yaw,gait:s.gait,speed:s.speed,turnPose:stepTurn(s.turnStep),seated:s.seated,hideShadow:onBed,
      hideFeet:sleeping&&s.cover>.7,hideProps:true,projectedArmTargets:s.phase==='wake-stretch'?undefined:hands,
      projectedHandsForeground:Math.cos(s.yaw)>-.12,
      drawProps({arms}) {
        if(!s.carrying||Math.cos(s.yaw)<-.15)return;
        const mid=YayaBedroomModel.propLocal(s,arms);
        push();translate(...mid);scale(.5+.5*Math.abs(Math.cos(s.yaw)),1);
        if(s.carrying==='book')A.drawBook(0,0,A.layout.book.size,s.bookOpen,s.bookPage);
        else A.drawTeddy(0,0,A.layout.teddy.u);
        pop();
      }
    };
    if(quilting)view.drawFurniture=()=>{
      // On this phase the actor is still on the mattress (no walking bob or
      // squash), so invert its root transform to draw world-space bedding.
      push();rotate(-s.rotation);translate(-s.position.x,-s.position.y);
      A.drawQuilt({...A.layout.bed,cover:s.cover,breath:0});pop();
    };
    const rendered=V.draw(0,0,u,t,state,s.phase==='wake-stretch'?s.phaseTime:t,view);
    pop();
    if(onBed&&!quilting&&s.cover>0)A.drawQuilt({...A.layout.bed,cover:s.cover,breath:sleeping?.5-.5*Math.cos(t*Math.PI/2):0});
    // Bedtime is a soft change of light, not an abrupt replacement of the room.
    if(!s.lampOn){push();noStroke();fill('rgba(78,100,150,.045)');rect(0,0,1920,1080);pop();}
    return {scene:'bedroom',character:rendered,state:s,held:s.carrying,props:s.props};
  }
  window.YayaBedroom={draw};
})();
