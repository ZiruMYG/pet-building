# 芽芽（Yaya）电子宠物原型

芽芽是一只适合学龄前孩子的原创电子宠物：奶油黄的圆身体、薄荷绿嫩叶、珊瑚色腮红，以及会发光的心形状态徽章。角色代码独立于原项目的 Clawd 角色，但继续使用 ClaudeAnimationBase 的 p5.js、p5.brush、时间线和渲染器。

当前学习机预览使用 `src/config-yaya-pet.js` 中的 `yayaStyle: 'bright'` 和 `paintMode: 'flat'`：背景明亮、颜色扁平、轮廓清晰，适合 16:9 横屏触控界面。将 `yayaStyle` 改为 `'paper'`、`paintMode` 改为 `'paper'` 可以恢复原项目的手绘纸张质感。

## 情绪和动作

角色状态由 `src/yaya-pet.js` 的数据驱动：

- 情绪：`idle`、`curious`、`happy`、`excited`、`laugh`、`love`、`shy`、`proud`、`relieved`、`sad`、`cry`、`angry`、`furious`、`scared`、`surprised`、`confused`、`thinking`、`idea`、`determined`、`sleepy`、`bored`、`nervous`、`suspicious`、`disgusted`、`dizzy`、`cool`、`starstruck`、`ko`、`playful`、`mischief`、`hopeful`
- 基础动作：`hello`、`cuddle`、`eat`、`play`、`sleep`
- 方向动作：`wave`、`hug`、`jump`、`sway`、`spin`、`walk`、`reach`、`stomp`、`turn`、`nod`、`celebrate`
- 交互别名：`feed` → `eat`、`touch` → `cuddle`、`nap` → `sleep`、`think` → `thinking`

叶子会随状态参与表演：`sad`/`cry`/`sleepy`/`ko` 向下折，`shy` 向内收，`happy`/`excited`/`surprised` 向上弹起；`wave`、`walk`、`jump` 等动作还会叠加叶子的摆动惯性。方向动作可以用状态对象表达朝向：

核心情绪优先使用多通道组合：好奇 = 外眉抬起 + 目标注视 + 小笑嘴；咯咯笑 = 弯月笑眼 + 张口笑 + 两次身体弹动；安心 = 放松闭眼 + 吐气下沉；自豪 = 抬头挺胸 + 半睁目光 + 金色高光；难过 = 内眉抬起 + 嘴角下压 + 泪滴 + 身体和叶子下沉。31 个标签仍然保留，但相近状态应先通过脸、姿态和叶子三类线索拉开距离，再添加小符号。

亮色平面版还提供前置手势层：咯咯笑/惊讶会捂嘴，喜欢/认真/气鼓鼓会把小拳头收在胸前，害羞会遮住一只眼，思考会托下巴，困惑会摊手，悄悄观察会挡额头，不喜欢会双手推开并让叶子交叉，小淘气会眨眼吐舌并用手指点脸颊，充满期待会在胸前搓手。这里的手部采用两种状态：平时手臂藏在身体后面，只露两枚小圆掌；做表情时隐藏对应的侧面小掌，再由短粗的小臂把完整圆掌带到前方。手臂和掌面使用连续的圆角轮廓，不使用细长连接线或漂浮小球；前置手势在脸部之后绘制，因此会产生真正的遮挡关系。

可以在场景代码中直接调用：

```js
drawYaya(960, 900, 72, t, 'curious');
const emotion = getYayaEmotionState('happy', t);
const acted = yayaEmotions(t, [[0, 'sleepy'], [0.8, 'surprised'], [1.2, 'happy']]);
drawYaya(960, 900, 72, t, acted);
const leftWalk = yayaAction('walk', -1, t);
drawYaya(960, 900, 72, t, leftWalk);
```

渲染单个情绪循环：

```powershell
$env:STUDIO_FILE = 'studio-yaya-pet.html'
node render.mjs --loop=yaya_surprised --sheet=0,1,2,3.5 --cols=4 --w=300 --out=out/surprised.jpg
```

工作室里可用的循环名称是 `yaya_` 加上上面的情绪或动作名，例如 `yaya_shy`、`yaya_love`、`yaya_cuddle`、`yaya_walk`、`yaya_celebrate`。`yayaEmotions()` 会在状态切换时加入眨眼预备、挤压回弹、腮红过渡和反应符号弹出。

## 预览和渲染

```bash
npm install
start studio-yaya-pet.html
node render.mjs --clip --out=out/yaya.mp4
```

`studio-yaya-pet.html` 是 16 秒的 hello → cuddle → eat → play 展示场景；`outputs/yaya-pet/` 中的离线页面则提供摸摸、喂食、一起玩、睡觉等按钮。
