# 芽芽电子宠物原型

双击 `index.html` 即可离线打开。页面采用明亮卡通版学习机界面：白底、鲜亮色块、清晰描边和适合手指点击的大按钮。主要互动入口包括：

- 摸摸：抱抱和害羞
- 喂一口：自己的圆掌握勺，把食物送到嘴边
- 喝水：手掌带着小杯倾斜，再一起放下
- 运动：举小哑铃热身
- 一起玩：小跳和挥手
- 睡觉：横躺在小床上，脸朝外，枕着枕头、盖着被子；点击按钮可叫醒

同目录的 `yaya-demo.mp4` 是 16 秒展示片，`assets/yaya-reference.png` 是早期角色设定图，`assets/yaya-winter-melon-reference.png` 是本次确认的冬瓜轮廓与横纹参考。`source/` 保存了基于 ClaudeAnimationBase 的角色和场景源码。

当前角色使用短胖、圆底的冬瓜轮廓，侧面保留正面约 86% 的宽度。下腹两道橙色横纹贯通正面、侧面和背面，胸口爱心位于条纹上方；背影也能保留稳定的识别特征。

页面会把 31 种情绪全部列成按钮，点击后播放对应的 4 秒循环动画，静态表情图作为加载失败时的后备。叶子已改成圆滑边缘和圆润叶尖，叶脉跟随叶片弯曲：难过时软垂，害羞时内扣，好奇时一上一下，开心时舒展扑扇，跑步时向后轻摆。

这版还针对容易混淆的情绪做了可读性修正：好奇使用外眉抬起和目标注视，咯咯笑使用弯月笑眼、低幅度轻抖和单手捂嘴，安心使用放松闭眼和吐气下沉，自豪使用抬头、半睁眼和金色高光，难过使用内眉抬起、下压嘴角、泪滴、下沉身体和折下的叶子。前置手势还支持惊讶捂嘴、喜欢握拳、害羞遮眼、思考托下巴、充满期待搓手、闹别扭转身、气鼓鼓鼓腮和青筋、困惑大问号、不喜欢推开并轻摇内扣的叶子、小淘气眨眼点脸。角色始终只有左右两只手，动作改变同一只手的位置和遮挡层级。圆掌保持完整和固定大小，腕部沿实际抬手方向伸入圆掌，根端不封口；勺杯绑定在手掌握点上。表达同时使用脸、身体、叶子和动态符号，避免只靠颜色或一个装饰区分情绪。

源码还提供了可组合的 31 种情绪循环（包含开心、好奇、害羞、安心、思考、惊讶、困倦、调皮等柔和版本），以及 `hello`、`cuddle`、`eat`、`play`、`sleep` 五个互动动作、11 个方向动作和 6 个日常动作：`drink` 喝水、`run` 小跑、`exercise` 热身操、`stretch` 伸懒腰、`ball` 玩球、`dance` 跳舞。页面共有 19 个动作按钮，并按日常照料、运动玩耍、回应互动分组。`run` 使用 6 秒往返循环，`walk` 和 `sleep` 为 8 秒，其他状态为 4 秒。原左右方向按钮仍可镜像预览；实验室的转身则使用连续角度和遮挡关系。可以在工作室里用 `yaya_love`、`yaya_drink` 或 `yaya_run` 这样的循环名渲染单独状态，具体命令见 `source/YAYA.md`。

这次重做的动作可以直接对照：伸懒腰会张大嘴打哈欠；小跑比走路更快，有腾空和身后跑动线；转圈经过侧面和背面；庆祝先蹲下再高高跳起，在高点欢笑；挥手和伸手会把短胳膊向外展开；抱抱改为斜侧身抱泰迪熊；转身从正面到侧面再回来；点头让脸和叶子向下俯再抬起，不再左右晃。

## 三视图与动作实验室

打开同目录的 `rig-lab.html`，14 个动作全部列成按钮：站好、吃饭、喝水、睡觉、伸懒腰、走路、小跑、转圈、庆祝、挥手、抱熊、伸手、转身和点头。默认“动作演示”会显示完整场景和转向，每次点选动作都会恢复该模式。另有三视图并排、正面、侧面、背面及往返跑道，共 6 个视角选项；固定视角用来检查身体和手臂连接。支持暂停、重播、拖动进度和显示肩点骨架。它直接绘制当前角色源码，不依赖 MP4，离线分发时需要保留完整 `source/` 和 `source/vendor/`。

新增叶子面板可自由混搭 5 种形态和 7 种运动选项：自然圆叶、竖起倾听、向外舒展、软软垂落、害羞内扣；保持姿态、轻轻呼吸、左右探看、一上一下、开心扑扇、抖两下、向后轻摆。点“跟随角色”可恢复自动配合当前动作。`still` 保持姿态计入 7 项；自动选择不额外计数。

走路每段行进 3 秒、转身 1 秒，总计 8 秒；小跑每段行进 2.3 秒、转身 0.7 秒，总计 6 秒。停止行进时步态也停止。每条腿先着地向后蹬，再抬脚向前收，向左和向右共用同一套局部步序。小跑增加步频、步幅、抬脚和腾空，速度线画在身后。正面、侧面和背面共用角色形状、横纹和手臂。此处是 2.5D 转向，侧面保留体积、背面隐藏五官；尚不是带网格、透视和物理碰撞的完整 3D 角色，侧背面的表情有所简化，勺杯只在接近正面时显示，也尚未实现世界坐标的脚掌锁地。

## 给其他 agent 的接入说明

加载配置、绘制核心和时间线后，依次加载 `source/yaya-actions.js` → `source/yaya-rig.js` → `source/yaya-body.js` → `source/yaya-gait.js` → `source/yaya-leaves.js` → `source/yaya-pet.js` → `source/yaya-views.js` → `source/yaya-scenes.js`，最后加载工作室场景或 `source/yaya-rig-lab.js`。动作时钟、身体、叶子、手臂和步态可以脱离浏览器测试。

`source/yaya-actions.js` 提供 `YayaActions.duration(key)` 和 `sample(key,age)`，统一动作周期及 `jump/crouch/energy/yaw/nod/yawn/reach/wave/lift` 等阶段值。手臂、脸和身体读取同一个时钟，让哈欠配合抬手、庆祝表情出现在跳跃高点。点头使用脸部下移和纵向压缩、叶子下弯来表现俯仰；转身和转圈则使用 `yaw`，不能用屏幕内左右倾斜代替。

`source/yaya-body.js` 提供 `YayaBody.outline(u)`、`stripes(u)`、`breadth(yaw)` 和 `constants`。轮廓和已裁切的两条横纹共用身体单位与投影；侧宽比例为 `0.86`、爱心基准高度为 `-2.65`、条纹色为 `#F6A533`。两纹中心高度为 `-1.75/-0.95`，厚度为 `0.40/0.34`。转向时爱心跟随相同表面弧线，保持与条纹的间距；`fitEllipseX()` 约束完整侧眼和腮红，不让椭圆外缘突出身体。新增视角应复用这些数据，不能另外复制一套背面条纹。

`source/yaya-leaves.js` 提供 `YayaLeaves.pose(time,key,side,context)`、`geometry(side,pose,yaw)`、`defaults()`，以及 `shapes/motions/root/period`。叶根固定为身体坐标 `[0,-6.94]`，轮廓和叶脉共用中心线；`geometry()` 返回 `{outline,vein,root,tip}`。内弯宽度有曲率约束，完整轮廓生成后再一起投影，防止侧面的软垂叶自交。它是 2.5D 卡通叶片，不模拟真实厚度、碰撞或风力。

自动组合区分不同状态：难过软垂、害羞内扣、好奇交替、开心扑扇、思考竖起探看；吃喝时轻呼吸和点叶尖，伸懒腰随身体延长，小跑按 `gait/speed` 向后摆且停步收住。动作默认值优先于情绪，状态对象里的 `leafShape` 和 `leafMotion` 可独立覆盖：

```js
const custom = {...getYayaEmotionState('curious', age), leafShape:'cup', leafMotion:'alternate'};
YayaViews.draw(960, 900, 70, age, custom, age, 'front');
```

`source/yaya-rig.js` 提供 `YayaRig.solveArm()`、`poseArms()`、`propPose()` 和 `pointAt()`。它固定肩点 `±2.28,-3.93`、掌半径 `0.64`、最大肩掌距离 `2.05`，通过腕角与掌圆重叠保证连接，再从解算后的握点生成道具。新增动作应修改手掌目标，不能增加第二套侧手或独立道具轨迹。

`source/yaya-views.js` 提供完整动作入口 `YayaViews.perform(x,y,u,t,state,age,debug)`、指定视角的 `draw()`、`project()` 和 `travel(t,key='run')`。角度为弧度：0 正面、π/2 右侧、π 背面、3π/2 左侧；`travel()` 返回走路 8 秒或跑步 6 秒路径的 `x/yaw/gait/speed/phase/period`。`perform()` 自动选择床铺、往返跑道、抱熊斜侧面或动作转向；强制固定视角的 `draw()` 用于结构检查。详细调用示例见 `source/YAYA.md`，完整经验见仓库根目录 `PET_BUILDING.md`。

`source/yaya-scenes.js` 提供 `YayaScenes.drawSleep()` 和 `drawHeld()`。睡觉仍调用同一份角色绘制，只把它横躺到枕头与被子之间；熊在胳膊之后、掌心之前绘制，中心绑定到解算后双掌的中点。新增道具仍需保留固定肩点、完整圆掌和手腕重叠，不能再添加一套前置手或独立漂浮轨迹。

`source/yaya-gait.js` 提供 `YayaGait.foot(gait, side, speed)`，返回 `{forward,lift,angle}`。局部正前方朝向鼻子；绘制时前后位移和脚尖角度一起乘 `sin(yaw)`。着地阶段向后运动，离地阶段向前运动，不能将两阶段颠倒，否则会看起来倒着跑。

在完整仓库根目录运行 `node test-yaya-actions.mjs`、`node test-yaya-rig.mjs`、`node test-yaya-body.mjs`、`node test-yaya-leaves.mjs`、`node test-yaya-gait.mjs`、`node test-yaya-views.mjs`、`node test-yaya-lab.mjs`、`node test-yaya-output.mjs`，验证共享动作阶段、肩腕连接、身体条纹、叶根与叶脉及自交/连续性、脚步方向、路径、实验室交互和原页面。视觉验收还需要检查哈欠、庆祝高点与落地、抱熊握点、送勺到嘴边和转身的中间帧，确认动作可辨认、连接不脱开、侧脸与条纹不越出轮廓。

页面提供可供后续接入的 API：

```js
window.yayaPet.interact('touch'|'feed'|'drink'|'exercise'|'play'|'sleep'|'hello')
window.yayaPet.selectAction('walk', -1)
window.yayaPet.pause()
window.yayaPet.resume()
window.yayaPet.getState()
```

页面保留了 `data-testid` 选择器，便于学习机壳体或自动化测试接入。
