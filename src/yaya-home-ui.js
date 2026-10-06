(() => {
 'use strict';
 let model=YayaHomeModel.create({auto:!matchMedia('(prefers-reduced-motion: reduce)').matches}),playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,ready=false,busy=false,pending=false,last=0,paintTime=0,reportTime=0,renderPromise=Promise.resolve();
 const canvas=document.getElementById('out'),loading=document.getElementById('loading'),state=()=>({...model.getState(),playing,ready});
 const loop=t=>YayaHome.draw(t,model.getState());loop.len=3600;window.LOOP=loop;
 function report(){if(parent!==window)parent.postMessage({type:'yaya-home-state',state:state()},'*');document.getElementById('status').textContent=model.getState().label;}
 function draw(){pending=true;if(busy||!window.ready)return renderPromise;busy=true;renderPromise=(async()=>{try{while(pending){pending=false;T=model.getState().time;await redraw();composite(T);}ready=true;loading.hidden=true;report();}catch(e){playing=false;loading.hidden=false;loading.textContent='画面没有准备好：'+e.message;console.error(e);}finally{busy=false;}})();return renderPromise;}
 function request(key){const ok=model.request(key);if(ok){playing=true;last=0;}report();draw();return ok;}
 function setRoom(key){const ok=model.setRoom(key);if(ok){playing=true;last=0;}report();draw();return ok;}
 function pause(){playing=false;report();return draw();}
 function play(){playing=true;last=0;report();return draw();}
 function setAuto(value){model.setAuto(value);if(value)play();report();return draw();}
 function tick(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(playing&&!document.hidden&&ready){model.step(dt);if(now-paintTime>1000/30){paintTime=now;draw();}}if(now-reportTime>300){reportTime=now;report();}requestAnimationFrame(tick);}
 window.devUI=()=>{draw();requestAnimationFrame(tick);};
 window.yayaHome={getState:state,request,setRoom,setAuto,pause,play,restart:async()=>{model=YayaHomeModel.create({auto:model.getState().auto});last=0;await draw();return state();},advance:async seconds=>{playing=false;for(let left=Math.min(1200,seconds);left>1e-8;){const dt=Math.min(1/60,left);model.step(dt);left-=dt;}await draw();return state();}};
 window.addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='yaya-home-command')return;const {command,value}=event.data;if(command==='getState')report();else if(['request','setRoom','setAuto','pause','play'].includes(command))window.yayaHome[command](value);});
 document.addEventListener('visibilitychange',()=>{last=0;});
 // The right-hand workbench mirrors these interactions. Objects in the room
 // remain clickable and use exactly the same requests as the visible buttons.
 canvas.addEventListener('click',event=>{
  const box=canvas.getBoundingClientRect(),scale=Math.max(box.width/1920,box.height/1080),x=(event.clientX-box.left-(box.width-1920*scale)/2)/scale,y=(event.clientY-box.top-(box.height-1080*scale)/2)/scale,s=model.getState(),r=YayaHomeLayout.rooms[s.room];
  const points=[];for(const d of r.doors){const p=YayaHomeArt.project(d.wall==='z0'?d.offset:0,d.wall==='x0'?d.offset:0,1.3,r);points.push({p,key:'room:'+d.to,radius:65});}
  const map={bed:'sleep',bookshelf:'read',desk:'desk',wardrobe:'wardrobe',sink:'wash',sofa:'sofa','dining-table':'eat',window:'window',bedside:'lamp'};
  for(const o of r.furniture){const key=map[o.id]||map[o.kind];if(!key||(!r.activities.includes(key)&&key!=='lamp'))continue;points.push({p:YayaHomeArt.project(o.x+o.w/2,o.z+o.d/2,(o.elevation||0)+o.h*.65,r),key,radius:o.kind==='bed'?110:65});}
  for(const [key,item]of Object.entries(s.items))if(item.room===s.room&&item.owner==='shelf')points.unshift({p:YayaHomeModel.project(item.anchor,r),key:key==='book'?'read':'teddy',radius:35});
  const hit=points.find(v=>Math.hypot(x-v.p.x,y-v.p.y)<v.radius);if(hit)request(hit.key);
 });
 window.addEventListener('error',event=>{loading.hidden=false;loading.textContent='资源未能加载：'+event.message;});
})();
