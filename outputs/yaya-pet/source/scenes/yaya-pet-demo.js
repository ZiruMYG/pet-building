// 16-second Yaya showcase: four interaction moments, each with an acted emotion change.
(() => {
  const stateAt = (t, lt, dur, state, close=false) => {
    yayaStage(t, state, lt);
    const at = toScreen(960, 500);
    if (window.YAYA_STYLE !== 'bright' && t < .5) iris(...at, lerp(0, 1500, easeIn(t / .5)));
    if (window.YAYA_STYLE !== 'bright' && close && lt > dur - .5) iris(...at, lerp(1500, 0, ease(seg(lt, dur - .5, dur))));
  };
  function hello(t,lt,dur){ stateAt(t,lt,dur,yayaEmotions(lt,[[0,'sleepy'],[.55,'surprised'],[1.05,'happy'],[2.2,'hopeful']])); }
  function cuddle(t,lt,dur){ stateAt(t,lt,dur,yayaEmotions(lt,[[0,'shy'],[.65,'love'],[2.35,'relieved']])); }
  function eat(t,lt,dur){ stateAt(t,lt,dur,yayaEmotions(lt,[[0,'curious'],[.85,'happy'],[2.1,'laugh']])); }
  function play(t,lt,dur){ stateAt(t,lt,dur,yayaEmotions(lt,[[0,'playful'],[.75,'excited'],[2.2,'proud']]),true); }
  shots([[0,hello],[4,cuddle],[8,eat],[12,play]]);
})();
