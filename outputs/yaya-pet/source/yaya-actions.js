// Shared, deterministic action timing in body units. Renderers, hands, faces
// and leaves read one clock so that the gesture lands on the same story beat.
(() => {
  const TAU=Math.PI*2;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{const q=clamp(v);return q*q*(3-2*q);};
  const ramp=(t,a,b)=>smooth((t-a)/(b-a));
  const envelope=(t,a,b,c,d)=>ramp(t,a,b)*(1-ramp(t,c,d));
  const duration=key=>key==='run'?6:(key==='walk'||key==='sleep')?8:4;
  const wrap=(t,period)=>((t%period)+period)%period;

  function sample(key='idle',age=0) {
    const length=duration(key),t=wrap(Number.isFinite(age)?age:0,length),phase=t/length;
    const q={duration:length,t,phase,jump:0,crouch:0,energy:0,yaw:0,nod:0,yawn:0,reach:0,wave:0,lift:0};
    if(key==='stretch') {
      q.lift=envelope(t,.18,1.02,2.52,3.64);
      q.yawn=envelope(t,.58,1.22,2.16,2.85);
      q.energy=q.lift*.25;
    } else if(key==='celebrate') {
      // Gather weight, spring upward, cheer at the apex, then absorb landing.
      const takeoff=1.06,landing=2.5,air=clamp((t-takeoff)/(landing-takeoff));
      q.jump=t>=takeoff&&t<=landing?1.65*4*air*(1-air):0;
      q.crouch=.78*envelope(t,.3,.72,.81,1.06)+.62*envelope(t,2.5,2.64,2.76,3.18);
      q.energy=smooth(q.jump/1.65);
      q.lift=envelope(t,.76,1.28,2.4,3.12);
      q.reach=q.lift;
    } else if(key==='wave'||key==='hello') {
      q.lift=envelope(t,.18,.65,3.2,3.82);
      q.wave=q.lift*Math.sin(TAU*3*clamp((t-.65)/2.55));
      q.reach=q.lift;
      q.energy=q.lift*.45;
    } else if(key==='reach') {
      q.reach=envelope(t,.2,1.02,2.82,3.75);
      q.lift=q.reach;
    } else if(key==='hug'||key==='cuddle') {
      q.reach=envelope(t,.3,1.08,2.8,3.75);
      q.lift=q.reach;
      q.energy=q.reach*.35;
    } else if(key==='nod') {
      // Each beat lowers the face and then raises it. No sideways component.
      q.nod=envelope(t,.45,.78,.9,1.3)+envelope(t,1.85,2.18,2.3,2.7);
      q.energy=q.nod*.15;
    } else if(key==='spin') {
      q.yaw=TAU*phase;
      q.energy=.4;
    } else if(key==='turn') {
      q.yaw=(Math.PI/2)*envelope(t,.3,1.2,2.5,3.65);
    }
    return q;
  }

  globalThis.YayaActions=Object.freeze({sample,duration});
})();
