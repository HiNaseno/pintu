# 品图 AI

品图是面向电商商品的视觉工作台。上传商品图片或资料，先识别商品、确认特点，再生成主图、详情页、SKU 图和店铺视觉；支持逐屏改稿、局部精修、版本管理和下载。

v0.3.0 为可独立部署的通用开源版，使用服务器的模型连接和本地任务账本，无需接入账号或云端额度系统。MIT 许可证。

## 快速开始

需要 **Node.js 22.19+**、npm 和支持所需模型及图片能力的 Codex CLI；本轮 Linux 检查环境使用 Node.js 22.23.3。

```bash
npm ci
cp .env.example .env
codex login
npm start
```

使用完成 `codex login` 的同一系统用户启动服务，打开 http://localhost:5176/china-full.html ，工作台为 http://localhost:5176/china-workflow.html 。默认仅监听本机；模型连接未配置或不可用时，页面显示配置指引，不会生成占位图。

默认 `AI_PROVIDER=pi`：Pi Agent Core 负责分析、问答和策划，通过后台已登录的 Codex CLI 调用模型。`AI_PROVIDER=codex` 使用直接 CLI 适配器。也可设置 `AI_PROVIDER=openai`，在后端填写 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、文字和图片模型；服务需兼容模型列表（GET /models）、Responses 和 Images 的生成、编辑接口。浏览器不提供模型密钥编辑入口。

这是联网模型工具，商品图片、提示词和资料中的相关内容会发送至你配置的模型服务；不需要安装本地模型权重。模型可用性、价格和能力以所用服务为准。

## 工作流

- 上传 PNG、JPEG、WebP，或 PDF、DOC、DOCX、TXT、Markdown、CSV、JSON；最多六个文件、每个 10 MB。文档支持提取文字，PDF 和 DOCX 可提取部分图片作为参考。
- 先分析商品，再问必要的产品问题，可跳过问答并编辑商品摘要。确认方案前支持“只改写提示词”，满意后再生图。
- 详情页按购买问题组织整套故事，逐屏确认文案、材质、场景和参考图。共享排版与配色，按每屏主题变化主视觉；材质页可展示局部或样片，无需重复完整商品。
- 每张图片独立排队并保留执行记录。重复请求复用原任务；刷新和重启不会自动重新派发。结果不明时保留待核对状态，管理员检查原执行记录。
- 生成结果支持整图或蒙版精修、版本查看、下载；提供本机意见反馈与截图附件。

成图文字、尺寸、材质与商品细节仍需人工检查。示例图片是视觉设计演示，不代表品牌合作或商品真实性证明。

## 内网共享

默认本机使用不要求访问口令。开放给其他设备时，先生成口令哈希：

```bash
npm run access-code
```

按照提示输入口令，将输出的哈希填入后端 `.env` 的 `PINTU_ACCESS_CODE_HASH`，设置 `HOST=0.0.0.0`，并将实际访问地址加入 `PINTU_ALLOWED_ORIGINS`，然后重启。不要把原始口令填入配置或 URL。

配置访问口令后，包括本机在内的所有浏览器都需解锁；反向代理也必须配置口令。浏览器使用 HttpOnly 会话 Cookie；写请求需要同源 Origin 和 `X-Pintu-CSRF`。每个浏览器的任务、素材和反馈独立，重启可保留会话。删除 Cookie 或更换站点地址后，不能通过任务编号认领原浏览器的作品。会话有效期滚动延长至 30 天。

反向代理及 HTTPS 示例见 [Nginx 部署](docs/NGINX.md)。所有素材、成图和下载都必须经过 Node 的归属检查，不要直接公开 `runtime/`。

## 数据、运行与升级

运行数据保存在被 Git 忽略的 `runtime/`，包含商品资料、生成图片、会话、执行账本和反馈。备份应覆盖整个目录及 SQLite 的 WAL/SHM 文件，并保留本地加密密钥。不要从源码包覆盖运行目录。

```bash
npm start                      # 启动服务
npm run dev                    # 开发模式
npm test                       # Node 测试
npm run test:release            # 隔离发布工具测试
npm run execution:manage -- list
npm run execution:manage -- reconcile
npm run feedback:manage -- list
```

`reconcile` 只检查已有执行证明，不重跑模型、不将未知结果填零。配置、下载依赖和升级步骤见 [安装说明](docs/INSTALL.md)，反馈管理见 [反馈说明](docs/FEEDBACK.md)，后台说明见 [Pi 与模型连接](docs/PI-BACKEND.md)。

## API 与发布

启动后可查看 `/api/docs` 和 `/api/openapi.json`。接口及会话说明见 [API 文档](docs/API.md)。本项目不提供独立的通用文字模型中转 API。

更新内容见 [CHANGELOG](CHANGELOG.md)，发布草稿见 [v0.3.0](docs/RELEASE-v0.3.0.md)，验证状态见 [发布报告](docs/RELEASE-REPORT.md)。源码归档仅从已审查的固定 Git 提交构建：

```bash
python3 scripts/prepare-release.py --commit HEAD --dry-run
python3 scripts/prepare-release.py --commit HEAD
```

源码包不包含依赖、模型、登录资料、运行数据和密钥。开源前检查见 [检查清单](docs/OPEN_SOURCE_CHECKLIST.md)，参与开发见 [CONTRIBUTING](CONTRIBUTING.md)，安全说明见 [SECURITY](SECURITY.md)。
