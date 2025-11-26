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
- [ ] 修复解析 pdf 文件的问题

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

## 项目来源

（1）https://github.com/korbinzhao/excalidraw-cn  
（2）https://github.com/excalidraw/excalidraw
