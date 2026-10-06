# 芽芽（Yaya）电子宠物原型

芽芽是一只适合学龄前孩子的原创电子宠物：奶油黄的圆身体、薄荷绿嫩叶、珊瑚色腮红，以及会发光的心形状态徽章。角色代码独立于原项目的 Clawd 角色，但继续使用 ClaudeAnimationBase 的 p5.js、p5.brush、时间线和渲染器。

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

叶子会随状态参与表演：`sad`/`cry`/`sleepy`/`ko` 向下折，`shy` 向内收，`happy`/`excited`/`surprised` 向上弹起；`wave`、`walk`、`jump` 等动作还会叠加叶子的摆动惯性。方向动作可以用状态对象表达朝向：

核心情绪优先使用多通道组合：好奇 = 外眉抬起 + 目标注视 + 小笑嘴；咯咯笑 = 弯月笑眼 + 张口笑 + 两次身体弹动；安心 = 放松闭眼 + 吐气下沉；自豪 = 抬头挺胸 + 半睁目光 + 金色高光；难过 = 内眉抬起 + 嘴角下压 + 泪滴 + 身体和叶子下沉。31 个标签仍然保留，但相近状态应先通过脸、姿态和叶子三类线索拉开距离，再添加小符号。

亮色平面版还提供前置手势层：咯咯笑/惊讶会捂嘴，喜欢/认真/气鼓鼓会把小拳头收在胸前，害羞会遮住一只眼，思考会托下巴，困惑会摊手，悄悄观察会挡额头，不喜欢会双手推开并让叶子交叉，小淘气会眨眼吐舌并用手指点脸颊，充满期待会在胸前搓手。所有状态共享左右两只手：平时短臂藏在身体后面，露出完整圆掌；做手势时改变同一只手的目标和层级。手掌半径保持不变，腕部沿肩到手的实际方向伸入圆掌，根端保持开放。道具先于握持手掌绘制，避免额外小手或穿过掌面的勺柄。

可以在场景代码中直接调用：

```js
drawYaya(960, 900, 72, t, 'curious');
const emotion = getYayaEmotionState('happy', t);
const acted = yayaEmotions(t, [[0, 'sleepy'], [0.8, 'surprised'], [1.2, 'happy']]);
drawYaya(960, 900, 72, t, acted);
const leftWalk = yayaAction('walk', -1, t);
drawYaya(960, 900, 72, t, leftWalk);
```

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

`yaw` 单位是弧度：0 正面、π/2 向右、π 背面、3π/2 向左。`project(x,y,z,yaw)` 返回投影坐标和深度。侧面宽度约为正面的 72%，五官随朝向收起，背面没有五官和胸口爱心；手臂根据深度和身体的遮挡分层。

`travel(t)` 返回 `{x,yaw,gait,speed,phase,period}`。8 秒内依次执行向右跑 3 秒、停住转身 1 秒、向左跑 3 秒、停住转回来 1 秒。步态跟随行进距离，转身时脚步不会继续循环。路径 `x` 在 `[-1,1]`，场景负责把它映射到舞台位置。

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

`outputs/yaya-pet/rig-lab.html` 是离线实时实验室，提供站好、吃饭、喝水、伸懒腰、往返跑，以及三视图、单独正/侧/背面和跑道。可以暂停、重播、拖动进度条、显示肩点与连接骨架；预览直接调用当前源码，不依赖预渲染 MP4。分发时保留整个 `source/` 目录及其本地 `vendor/`。

在仓库根目录运行：

```bash
node test-yaya-views.mjs
node test-yaya-lab.mjs
node test-yaya-output.mjs
```

第一个测试检查肩点、手腕重叠、握点绑定、跑道边界和循环连续性；第二个检查实验室画布、交互与移动布局；第三个检查原宠物页面。增加动作后还应检查中间帧，而不只看首帧或海报图。其他 agent 的复用步骤及设计经验见 `PET_BUILDING.md`。
