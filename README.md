![中文文档](./README.md)  
![English Document](./README.en.md)

## 功能

- [x] 中文手写体
- [x] 多画布功能
- [x] 多模板增加字段适配脚本
- [x] 增加选择颜色种类
- [ ] 增加边框样式
- [ ] 增加字体选择
- [x] 优化手机端体验
- [x] 增加 AI 生成功能
- [x] 修复解析 pdf 文件的问题
- [ ] 增加动画展示效果

## 截图

![](./dev-docs/images/ScreenShot1.png) ![](./dev-docs/images/ScreenShot2.png)

## 环境变量

```
REACT_AI_API= // 你的 AI 接口地址，样例：https://api.openai.com/v1/chat/completions
REACT_AI_SECRET= // 你的 AI 接口密钥，样例：sk-1234567890abcdef1234567890abcdef
REACT_AI_MODEL= // 你的 AI 模型名称，样例：gpt-3.5-turbo
```

## 使用地址

https://excalidraw-phi-woad.vercel.app/

## 本地安装

以下步骤将帮助你在本地环境中运行该项目以进行开发和测试。

### 环境要求

- [Node.js](https://nodejs.org/en/)
- [Yarn](https://yarnpkg.com/getting-started/install)（v1 或 v2.4.2+）
- [Git](https://git-scm.com/downloads)

### 克隆仓库

```bash
git clone https://github.com/linkxzhou/SimpleExcalidraw.git
```

### 安装依赖

```bash
yarn
```

### 启动服务

```bash
yarn dev
```

现在可以打开 [http://localhost:3000](http://localhost:3000) 并开始在你喜欢的编辑器中编码。

### 协作

如果需要协作，请在本地配置协作服务器（collab server）：https://github.com/excalidraw/excalidraw-room

### 常用命令

#### 安装依赖

```
yarn
```

#### 运行项目

```
yarn start
```

#### 使用 Prettier 统一格式

```
yarn fix
```

#### 运行测试

```
yarn test
```

#### 更新测试快照

```
yarn test:update
```

#### 检查代码格式（Prettier）

```
yarn test:code
```

### Docker Compose

如果不想在本地搭建 Node.js 环境，可以使用 docker-compose 在本地开发 Excalidraw。

```sh
docker-compose up --build -d
```

## 动画实现

本项目实现了一个基于 SVG 和 Web Animations API (WAAPI) 的画板动画功能，允许用户回放绘图过程。

### 核心架构

动画模块主要位于 `src/animate` 目录下，由以下几个核心部分组成：

1.  **`AnimateApp.tsx`**: 动画功能的入口组件，以模态框 (Modal) 形式展示。它负责管理全局状态（如时长、循环开关、暂停状态），并协调 `Viewer` 和 `AnimateConfig` 组件。
2.  **`Viewer.tsx`**: 负责渲染 SVG 内容和执行动画。
    - 它首先调用 `exportToSvg` 将当前画板内容转换为 SVG DOM。
    - 然后调用 `animateSvg` 对 SVG 元素应用动画效果。
3.  **`AnimateConfig.tsx`**: 提供用户控制界面，包括时长选择、循环开关、重播按钮。
4.  **`animate.ts`**: 包含核心动画逻辑。

### 动画原理 (`animate.ts`)

动画生成过程完全自动化，无需用户手动设定关键帧。主要步骤如下：

1.  **预处理与度量**：
    - 遍历 SVG 子元素，隐藏所有元素。
    - 计算每个元素的“度量值” (Metric)：对于 `<path>` 元素，计算其路径总长度 (`getTotalLength()`)；对于文本或图片等其他元素，赋予固定度量值。
2.  **时间分配**：
    - 根据每个元素的度量值占总度量值的比例，将总动画时长分配给每个元素，确保长路径的绘制时间更长，视觉效果更自然。
3.  **动画生成 (WAAPI)**：
    - **路径动画 (Paths)**：利用 `stroke-dasharray` 和 `stroke-dashoffset` 技术模拟笔迹书写效果。同时处理填充 (Fill)，在轮廓绘制完成后淡入填充颜色。
    - **非路径动画 (Text/Images)**：使用简单的透明度渐变 (`opacity`) 淡入效果。
    - **时序控制**：通过 `delay` 属性控制元素按顺序播放，并设置微小的重叠时间，使动画更加流畅。
4.  **控制与循环**：
    - 返回一个控制器对象 (`controller`)，支持 `play` (播放), `pause` (暂停), `cancel` (取消), `seek` (跳转) 操作。
    - 循环播放通过 `setTimeout` 在动画结束后重新触发 `animateSvg` 实现。

这种方案的优点是能够精确捕捉 WAAPI 驱动的复杂 SVG 动画，不仅限于简单的 CSS 变换。

## 项目来源

（1）https://github.com/korbinzhao/excalidraw-cn  
（2）https://github.com/excalidraw/excalidraw  
（3）https://github.com/dai-shi/excalidraw-animate/tree/main?tab=readme-ov-file
