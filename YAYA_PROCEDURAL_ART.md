# 芽芽程序化绘画与动画工作手册

这份工作手册把芽芽的角色、房间和交互放在同一套可复现的程序化约定里。它服务于 `p5.js + p5.brush` 的实时画面，也服务于离线预览和批量渲染。

## 运行边界

- `YayaHomeModel` 只拥有可保存的生活状态：房间、位置、动作队列、物品所属和接触过程。
- `YayaViews`、`YayaHomeArt` 和 `YayaHomeEffects` 只负责把状态画出来。
- `YayaRig` 是 2D 短臂求解器；握点必须来自物品或家具的真实接触点。
- `YayaProceduralStyle` 提供 palette、材质、线宽、固定 seed、连续噪声和环境装饰参数。
- DOM 工作台负责按钮、说明和预览；canvas 只承载房间和宠物画面。

## 生成规则

1. 静态几何使用固定 seed。房间、家具和纸张纹理不能因为刷新或重新渲染而漂移。
2. 动画函数只接受时间和状态，不能依赖上一帧留下的临时对象。
3. 一个动作共用同一个相位：身体、脚、叶子、手掌和道具必须从同一个时间段采样。
4. 2.5D 只使用统一的斜俯视投影、遮挡排序、缩放和色彩深度。角色不做真实 3D 旋转。
5. 画面分成静态层、低频环境层和动态角色层。水彩和纸张笔触尽量缓存，避免每帧重算。
6. 交互遵循“走近 → 转向 → 接触 → 使用 → 放回 → 收手”。物品状态只有在接触成立时才转移。

## 视觉验收

运行 `npm run qa:visual -- --chrome=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome` 生成三张检查图：

- `action-sheet.jpg`：检查轮廓、色板、动作关键姿势和环境分离度。
- `action-strip.jpg`：检查预备、主动作、回弹、脚底接触和叶子跟随。
- `face-detail.jpg`：检查眼睛、腮红、嘴、手掌和道具接触。

行为验收继续使用 `test-yaya-home*.mjs`、`test-yaya-rig.mjs`、`test-yaya-gait.mjs` 和 `test-yaya-leaves.mjs`。新增绘画或动作能力时，先补纯函数测试，再补一张视觉 QA 图。
