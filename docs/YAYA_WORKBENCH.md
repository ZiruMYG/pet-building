# 芽芽的综合工作台

主入口是 `outputs/yaya-pet/index.html`。桌面上，左侧始终是芽芽正在生活的房间，右侧是一块固定高度的工作台。原先连续堆叠的生活面板、31 种表情、基础动作、三视图、叶子实验和能力表已合并到四个页签，以及布局图、角色检查、能力总表三个按需弹层。旧版完整页面保留为 `gallery.html`，供历史效果对照，主入口不再加载旧花园播放器或旧自主生活调度器。

## 四个页签

| 页签 | 用途 | 交互位置 |
| --- | --- | --- |
| 生活 | 选择目的房间，安排当前房间的活动，开关自主活动 | 控制左侧持续运行的房间 |
| 表情 | 31 种表情按 7 个分类筛选，逐项比较眼睛、手与叶子 | 右侧唯一的动态预览区 |
| 动作 | 19 个基础动作按吃喝休息、运动和交流筛选 | 与表情共用同一个播放器 |
| 造型 | 观察正侧背三视图、身体连接和叶子形态 | 按需打开大尺寸实验室弹层 |

页签支持左右方向键、Home 和 End 切换。桌面页面不靠整页向下滚动来寻找功能；只有右侧内容区滚动。窄屏改为上方房间、下方同一工作台。预览退出表情/动作页签时暂停；实验室关掉后卸载 iframe，避免隐藏绘制器继续运行。

房间源码画布为 1920 × 1080。当前家居内容集中在画布中央，因此父页面让房间尽量利用可用高度，移动端采用 4:3 视口，子页面通过 `object-fit: cover` 裁去两侧空白。点击物品时要反算这次等比缩放与居中裁切，不能再直接按画布宽度比例换算坐标。截图验收需同时看屋顶、两面墙与地板边缘，保证没有把家具裁掉。

## 布局与房间活动的唯一来源

`YayaHomeLayout` 是房间列表、房间能力、平面图和连接关系的来源。工作台读取 `roomOrder`、`rooms[id].activities`、`rooms[id].plan` 和 `connections`，不另行定义一套门路。

- 两间卧室各有自己的卫生间；第二间卧室与第二独卫为下一位宠物预留。
- 客厅连接两间卧室和一体餐厨。
- 选择“去某个房间”调用房间导航，不直接替换画面中的房间编号。具体走门与完成手上活动的逻辑属于 home model。
- 基础动作视频的选择只影响右侧预览，不会把房间场景替换为独立视频。
- 能力总表区分房间活动、基础动作预览与未实现动作。不能将视频可播放当作房间物体交互已实现。

## iframe 通信

主页面与 `home.html?embed` 使用 `postMessage`，因此本地 `file:` 打开也不依赖跨文档直接读取。

```js
// Parent -> home iframe
{ type: 'yaya-home-command', command: 'request', value: 'read' }
{ type: 'yaya-home-command', command: 'setRoom', value: 'kitchen' }
{ type: 'yaya-home-command', command: 'setAuto', value: true }
{ type: 'yaya-home-command', command: 'pause' }
{ type: 'yaya-home-command', command: 'play' }
{ type: 'yaya-home-command', command: 'getState' }

// Home iframe -> parent
{
  type: 'yaya-home-state',
  state: {
    room: 'bedroom', ready: true, auto: true, playing: true,
    label: '芽芽正在看书', action: 'read', phase: 'reading', pending: null
  }
}
```

父页面只接受来自当前 home iframe 的状态消息。iframe 初始化完成前，生活指令先排队；收到 `ready: true` 后依次发出。状态消息驱动房间名称、当前活动、播放状态、自主开关和选中状态；目的房间在实际抵达之前显示为等待状态。每 800 毫秒发一次轻量的 `getState`，后台页面不轮询。

`window.yayaWorkbench` 提供自动检查入口：`getState()`、`selectTab(key)`、`selectEmotion(key)`、`selectAction(key)`、`setRoom(room)`、`request(action)`。

## 文件与验证

- HTML：`outputs/yaya-pet/index.html`
- 样式：`src/yaya-workbench.css`
- 控制器：`src/yaya-workbench.js`
- 发布副本：对应的 `outputs/yaya-pet/source/` 文件
- 验证：`node test-yaya-workbench.mjs`。检查桌面单屏、31/19 项数量、分类、预览资源、弹层与移动端宽度；完整运行还检查 home iframe 的状态协议。

新增房间活动时先实现 home model 与真实物品接触，再把 key 加入对应房间的 `activities`；同时补工作台中的中文动词、图标和一句动作描述。不要重新堆叠一个独立面板。
