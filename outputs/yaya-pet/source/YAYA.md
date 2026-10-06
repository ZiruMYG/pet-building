# 芽芽（Yaya）电子宠物原型

芽芽是一只适合学龄前孩子的原创电子宠物：奶油黄的短胖冬瓜身体、薄荷绿嫩叶、珊瑚色腮红、胸口爱心，以及贯通前侧背的两道橙色下腹横纹。角色代码独立于原项目的 Clawd 角色，但继续使用 ClaudeAnimationBase 的 p5.js、p5.brush、时间线和渲染器。

如果要让其他 agent 学习完整的方法论，请先阅读仓库根目录的 [PET_BUILDING.md](PET_BUILDING.md)；本文件聚焦芽芽的具体状态和 API。

当前学习机预览使用 `src/config-yaya-pet.js` 中的 `yayaStyle: 'bright'` 和 `paintMode: 'flat'`：背景明亮、颜色扁平、轮廓清晰，适合 16:9 横屏触控界面。将 `yayaStyle` 改为 `'paper'`、`paintMode` 改为 `'paper'` 可以恢复原项目的手绘纸张质感。

## 情绪和动作

角色状态由 `src/yaya-pet.js` 的数据驱动：

- 情绪：`idle`、`curious`、`happy`、`excited`、`laugh`、`love`、`shy`、`proud`、`relieved`、`sad`、`cry`、`angry`、`furious`、`scared`、`surprised`、`confused`、`thinking`、`idea`、`determined`、`sleepy`、`bored`、`nervous`、`suspicious`、`disgusted`、`dizzy`、`cool`、`starstruck`、`ko`、`playful`、`mischief`、`hopeful`
- 基础动作：`hello`、`cuddle`、`eat`、`play`、`sleep`
- 方向动作：`wave`、`hug`、`jump`、`sway`、`spin`、`walk`、`reach`、`stomp`、`turn`、`nod`、`celebrate`
- 日常动作：`drink`、`run`、`exercise`、`stretch`、`ball`、`dance`
- 交互别名：`feed` → `eat`、`touch` → `cuddle`、`nap` → `sleep`、`think` → `thinking`、`water`/`hydrate` → `drink`、`jog` → `run`、`football` → `ball`

日常动作使用具体道具和身体证据：`eat` 用自己手里的勺子把食物送到嘴边并做咀嚼，`drink` 持杯倾斜，`stretch` 双手向上拉伸，`run` 侧身跑到另一边、停下转身并跑回来，`exercise` 举小哑铃热身，`ball` 配合弹跳球，`dance` 左右摆动并让叶子跟拍。`yaya_run` 循环为 8 秒，其他状态循环为 4 秒。

叶子使用圆润边缘、弯曲叶脉和固定根点，不再使用旧的九点多边形。`sad`/`cry`/`sleepy`/`ko` 软垂，`shy` 向内收，好奇时一上一下，开心时向外舒展并扑扇；跑步时顺着速度向后轻摆。形态与动作分别选择，具体 API 和映射见下方“圆叶与动作 API”。

核心情绪优先使用多通道组合：好奇 = 外眉抬起 + 目标注视 + 小笑嘴；咯咯笑 = 弯月笑眼 + 张口笑 + 两次身体弹动；安心 = 放松闭眼 + 吐气下沉；自豪 = 抬头挺胸 + 半睁目光 + 金色高光；难过 = 内眉抬起 + 嘴角下压 + 泪滴 + 身体和叶子下沉。31 个标签仍然保留，但相近状态应先通过脸、姿态和叶子三类线索拉开距离，再添加小符号。

亮色平面版还提供前置手势层：咯咯笑/惊讶会捂嘴，喜欢/认真/气鼓鼓会把小拳头收在胸前，害羞会遮住一只眼，思考会托下巴，困惑会摊手，悄悄观察会挡额头，不喜欢会双手推开并让内扣的叶子轻摇，小淘气会眨眼吐舌并用手指点脸颊，充满期待会在胸前搓手。所有状态共享左右两只手：平时短臂藏在身体后面，露出完整圆掌；做手势时改变同一只手的目标和层级。手掌半径保持不变，腕部沿肩到手的实际方向伸入圆掌，根端保持开放。道具先于握持手掌绘制，避免额外小手或穿过掌面的勺柄。

可以在场景代码中直接调用：

```js
drawYaya(960, 900, 72, t, 'curious');
const emotion = getYayaEmotionState('happy', t);
const acted = yayaEmotions(t, [[0, 'sleepy'], [0.8, 'surprised'], [1.2, 'happy']]);
drawYaya(960, 900, 72, t, acted);
const leftWalk = yayaAction('walk', -1, t);
drawYaya(960, 900, 72, t, leftWalk);
```

## 共享身体与脚本依赖

在配置、绘制核心和时间线之后，先加载 `src/yaya-body.js`、`src/yaya-leaves.js`、`src/yaya-rig.js`、`src/yaya-gait.js`，再加载 `src/yaya-pet.js` 和 `src/yaya-views.js`，最后加载场景或实验室。身体、叶子、手臂和步态四个模块不依赖 p5，可以单独进行纯几何测试。

`YayaBody` 固定圆腹、圆底的冬瓜轮廓。身体顶点为 `y=-7`、底点为 `y=0`，最大半宽约 `3.2`；侧面厚度为正面宽度的 `0.86`，不能再为每个视图独立画一个身体。

```js
const outline = YayaBody.outline(u);
const bands = YayaBody.stripes(u);
const widthScale = YayaBody.breadth(yaw);
const { sideRatio, heartY, stripeColor } = YayaBody.constants;
```

`outline(u)` 和 `stripes(u)` 返回乘以绘制单位 `u` 的轮廓及两条带状多边形；条纹已经按身体轮廓裁切。`breadth(yaw)` 等于 `hypot(cos(yaw), 0.86*sin(yaw))`，身体和条纹共同应用它。两纹中心高度为 `-1.75/-0.95`、厚度为 `0.40/0.34`，两端略微上扬，填色为 `#F6A533`；爱心基准高度 `heartY=-2.65`。转向时爱心再叠加 `surfaceArc(badgeX/breadth(yaw))`，与横纹沿同一弧线移动，保持间距。`fitEllipseX()` 则把侧眼和腮红的完整椭圆约束在身体内。正背面等宽，背面保留横纹而隐藏爱心。

## 圆叶与动作 API

`YayaLeaves` 把形态与运动拆开，两个叶根固定在身体坐标 `[0,-6.94]`。每片叶子沿弯曲中心线生成两侧轮廓，宽度在尖端圆滑收拢；叶脉采样同一条中心线。叶子整体继承身体变换，运动改变 `rot/bend/fold/length/width/sweep`，不直接平移根部。

- 5 种形态：`natural` 自然圆叶、`upright` 竖起倾听、`spread` 向外舒展、`droop` 软软垂落、`cup` 害羞内扣。
- 7 种运动选项：`still` 保持姿态、`breathe` 轻轻呼吸、`sway` 左右探看、`alternate` 一上一下、`flap` 开心扑扇、`twitch` 抖两下、`wind` 向后轻摆。其中 `still` 是静止选项；`auto` 是跟随角色的选择规则，不额外计作一种形态或运动。

```js
const state = getYayaEmotionState('curious', age);
const leftPose = YayaLeaves.pose(age, state.state, -1, state);
const leftBlade = YayaLeaves.geometry(-1, leftPose, Math.PI / 2);
// leftBlade: {outline, vein, root, tip}，均为身体单位；绘制时乘 u。
const custom = {...state, leafShape:'cup', leafMotion:'alternate'};
YayaViews.draw(960, 900, 70, age, custom, age, 'front');
```

`pose(time,key,side,context)` 中 `side` 为 `-1/1`，`context` 可含 `action/mood/leafShape/leafMotion/yaw/gait/speed`。`defaults(key,context)` 返回自动的 `{shape,motion,strength}`；`shapes/motions/root/period` 提供目录与常量。普通叶子运动周期为 4 秒，支持任意时间定位；跑步的风摆使用传入的 `gait/speed`，停止时收住。自动动作优先于情绪的默认值，显式 `leafShape` 和 `leafMotion` 可各自覆盖。

| 状态或动作 | 自动叶子组合 |
|---|---|
| 难过、困倦、疲惫、无聊 | 软垂 + 低幅呼吸；想哭时改为轻抖 |
| 害羞、喜欢、抱抱 | 内扣 + 呼吸；紧张、害怕改为轻抖；不喜欢为内扣 + 轻摇 |
| 开心、调皮 | 舒展 + 扑扇；咯咯笑为舒展 + 轻抖；期待为舒展 + 一上一下 |
| 好奇、困惑 | 自然圆叶 + 一上一下；思考为竖起 + 小幅探看 |
| 惊讶、自豪、认真 | 竖起 + 呼吸；有主意、气恼为竖起 + 轻抖；兴奋、崇拜为竖起 + 扑扇 |
| 吃饭、喝水 | 自然圆叶 + 低幅呼吸，并轻点叶尖 |
| 伸懒腰 | 竖起，随拉伸略延长，再收回 |
| 走路、摇摆、热身、玩球 | 自然圆叶 + 一上一下；跳舞改为扑扇 |
| 跑步 | 自然圆叶 + 随速度、步相变化的向后轻摆 |
| 挥手、打招呼；转身、旋转、够一够 | 自然圆叶 + 抖两下；后一组改为左右探看 |

几何先生成完整轮廓，再把轮廓与叶脉一起做 2.5D 压缩和风向倾斜；侧面保留约 38% 的叶宽，避免变成线。内弯处的宽度不超过曲率半径的 82%，防止软垂和风摆混搭时内缘交叉。不要把投影后的回头中心线重新扩宽，否则会出现自交。这里是可控的卡通投影，并非带厚度、碰撞或真实风力的 3D 叶片。

## 共享手臂与道具 API

先加载 `src/yaya-rig.js`，再加载 `src/yaya-pet.js`。`YayaRig` 是纯几何模块，不需要 p5 就能测试：

```js
const state = getYayaEmotionState('eat', age);
const arms = YayaRig.poseArms('eat', age, state, {});
const spoon = YayaRig.propPose('eat', age, arms);
const arm = YayaRig.solveArm({side: -1, target: [-2.7, -5.7]});
const socketPoint = YayaRig.pointAt(arm, 0.2, 0);
```

- `constants`：肩点 `±2.28,-3.93`，手掌半径 `0.64`，臂半宽 `0.36`，最大肩掌距离 `2.05`；均为身体单位，绘制时乘 `u`。
- `poseArms(key, age, state, pose)`：返回固定左右两个手臂对象；每个包含 `shoulder`、`palm`、`wrist`、`band`、`edges`、`radius`、`angle`、`layer` 和 `sockets.grip`。
- `solveArm(options)`：按目标方向解算粗短胳膊。越界目标被限制到最大距离，腕部两角伸入掌心圆内；`clamped` 表示是否发生距离限制。
- `actionCycle(key, age)`：提供吃饭/喝水的抬手、张口等阶段值。`propPose()` 用同一个阶段和解算后的握点生成勺子或杯子位置。
- `pointAt(arm, x, y)`：把手掌局部坐标变换到身体坐标；增加道具时从这里绑定，避免另写脱离手掌的动画。

## 三视图与侧身往返跑

在角色代码之后加载 `src/yaya-views.js`。`YayaViews.draw(x,y,u,t,state,age,view,debug)` 使用同一套轮廓与手臂，`view` 可为 `front`、`side`、`back`、`left`，或含 `yaw` 的对象。

```js
YayaViews.draw(960, 900, 70, t, 'stretch', t, 'side', true);
const travel = YayaViews.travel(t);
YayaViews.draw(960 + travel.x * 550, 900, 60, t, 'run', t, travel);
```

`yaw` 单位是弧度：0 正面、π/2 向右、π 背面、3π/2 向左。`project(x,y,z,yaw)` 返回投影坐标和深度。侧面宽度由 `YayaBody` 保持为正面的约 86%，五官随朝向收起；背面没有五官和胸口爱心，但两道下腹横纹贯通保留。手臂根据深度和身体的遮挡分层。

`travel(t)` 返回 `{x,yaw,gait,speed,phase,period}`。8 秒内依次执行向右跑 3 秒、停住转身 1 秒、向左跑 3 秒、停住转回来 1 秒。步态跟随行进距离，转身时脚步不会继续循环。路径 `x` 在 `[-1,1]`，场景负责把它映射到舞台位置。

`YayaGait.foot(gait, side, speed)` 返回局部的 `{forward,lift,angle}`，其中 `side` 为 `-1/1`，正前方朝向鼻子，`speed` 被限制到 `[0,1]`。一个周期中，脚先着地由前向后后蹬，再抬起由后向前收回；左右腿错开半个周期。绘制器将 `forward` 和 `angle` 乘 `sin(yaw)`，因此朝左与朝右共用同一套正确步序。停步时三项都归零。此处还没有世界坐标的脚掌锁地，不能据此声称完全无滑步。

```js
const foot = YayaGait.foot(travel.gait, -1, travel.speed);
const screenStride = foot.forward * Math.sin(travel.yaw);
const screenToeAngle = foot.angle * Math.sin(travel.yaw);
```

这是明亮平面风格的 2.5D 视图，不是带网格、透视、光照和物理碰撞的完整 3D 模型。侧背面表情经过简化，勺杯只在接近正面时绘制；不能把正面全部情绪的支持范围等同于任意角度。

渲染单个情绪循环：

```powershell
$env:STUDIO_FILE = 'studio-yaya-pet.html'
node render.mjs --loop=yaya_surprised --sheet=0,1,2,3.5 --cols=4 --w=300 --out=out/surprised.jpg
```

工作室里可用的循环名称是 `yaya_` 加上上面的情绪或动作名，例如 `yaya_shy`、`yaya_love`、`yaya_cuddle`、`yaya_drink`、`yaya_run`、`yaya_celebrate`。`yayaEmotions()` 会在状态切换时加入眨眼预备、挤压回弹、腮红过渡和反应符号弹出。

## 预览和渲染

```bash
npm install
start studio-yaya-pet.html
node render.mjs --clip --out=out/yaya.mp4
```

`studio-yaya-pet.html` 是 16 秒的 hello → cuddle → eat → play 展示场景；`outputs/yaya-pet/` 中的离线页面则提供摸摸、喂食、喝水、运动、一起玩、睡觉等按钮。日常动作的 JPG/MP4 可用 `node render-yaya-daily-action-videos.mjs eat drink run exercise stretch ball dance` 重新生成。导出时读取 `LOOPS[name].len`，不要把往返跑截成 4 秒。

`outputs/yaya-pet/rig-lab.html` 是离线实时实验室，提供站好、吃饭、喝水、伸懒腰、往返跑，以及三视图、单独正/侧/背面和跑道。叶子面板可把 5 种形态与 7 种运动自由混搭，或点“跟随角色”恢复自动配合。可以暂停、重播、拖动进度条、显示肩点与连接骨架；预览直接调用当前源码，不依赖预渲染 MP4。分发时保留整个 `source/` 目录及其本地 `vendor/`。

在仓库根目录运行：

```bash
node test-yaya-body.mjs
node test-yaya-leaves.mjs
node test-yaya-gait.mjs
node test-yaya-views.mjs
node test-yaya-lab.mjs
node test-yaya-output.mjs
```

`test-yaya-body.mjs` 检查共享身体和横纹几何；`test-yaya-leaves.mjs` 检查形态、运动与视角组合的根点、轮廓自交、叶脉包含关系、循环与逐帧连续性；`test-yaya-gait.mjs` 检查着地后蹬、抬脚前收、左右方向、停步与循环连续性；`test-yaya-views.mjs` 检查肩点、手腕重叠、握点绑定、跑道边界和循环连续性；`test-yaya-lab.mjs` 检查实验室画布、叶子混搭、交互与移动布局；`test-yaya-output.mjs` 检查原宠物页面。增加动作后还应查看中间帧：特别是转向时横纹有无越界、侧脸是否仍在身体内、叶尖有无翻折交叉，以及两条腿落地后是否向后蹬。其他 agent 的复用步骤及设计经验见 `PET_BUILDING.md`。
