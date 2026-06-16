# 品图 AI

品图 AI 是一个面向国内电商商家的 AI 视觉生成工作台。它支持上传商品图，生成电商主图、详情页、SKU 图、店铺视觉，并提供对话式精修、版本管理、下载导出和本地 API 配置。

当前项目是本地可运行的原型与开发版，适合继续迭代产品流程、前后端接口和生成策略。

## 功能

- AI 推荐生成方案：先分析商品，再让用户确认数量、风格和生成方向。
- 电商图片生成：支持主图、详情页、SKU 图等单类任务逐张生成。
- 本地任务队列：每张图独立排队、生成、失败和重试，避免整单超时。
- 对话式精修：用户可直接描述修改，也可圈选局部后修改。
- 版本管理：生成图和精修图保留版本，可下载或设为最终稿。
- API 配置面板：在页面右上角配置兼容 OpenAI 的 API URL、Key、文字模型和图片模型。

## 快速开始

```bash
npm install
cp .env.example .env
npm start
```

打开：

```text
http://localhost:5176/china-full.html
http://localhost:5176/china-workflow.html
```

也可以不直接编辑 `.env`，启动服务后在网页右上角点击「API 配置」，填写 API URL 和 Key，验证模型列表后选择文字模型和图片模型。

## 环境变量

复制 `.env.example` 为 `.env` 后按需填写：

```text
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TEXT_MODEL=
OPENAI_IMAGE_MODEL=
OPENAI_PREVIEW_IMAGE_MODEL=
PORT=5176
```

说明：

- `OPENAI_BASE_URL` 支持任意 OpenAI 兼容 API 网关。
- 真实 Key 只应放在 `.env` 或本机 `runtime/api-config.json` 中。
- `.env`、`runtime/`、`node_modules/` 已加入 `.gitignore`，不要提交到公开仓库。

## 常用命令

```bash
npm start          # 启动本地服务
npm run dev        # watch 模式启动
npm test           # 运行 Node 测试
```

## 项目结构

```text
.
├── server.js              # Express 服务、AI 调用、任务队列和下载接口
├── api-docs.js            # OpenAPI 与 API 文档页面
├── china-full.*           # 首页
├── china-workflow.*       # 生成工作台
├── api-config.*           # API 配置弹窗
├── docs/API.md            # 接口说明
├── test/                  # Node 测试
├── service/               # macOS 本地服务脚本
└── runtime/               # 本机运行数据，已忽略
```

## API 文档

服务启动后访问：

```text
http://localhost:5176/api
http://localhost:5176/api/docs
http://localhost:5176/api/openapi.json
```

更多说明见 [docs/API.md](docs/API.md)。

## 开源前注意

- 不要提交 `.env`、`AI API.rtf`、`runtime/`、`node_modules/`。
- 如果真实 Key 曾经出现在提交历史或聊天截图中，开源前请更换 Key。
- 图片和提示词会发送到你配置的第三方模型服务，请在 README 或部署说明中提醒使用者自行选择可信 API 提供方。
- 当前项目没有登录、计费、云存储和生产级权限系统，公开部署前需要补齐。

## License

MIT
