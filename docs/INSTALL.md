# 安装、依赖与升级

## 需要下载什么

- 源码：`pintu-v0.3.0-source.zip` 或 `pintu-v0.3.0-source.tar.gz`，二选一；同时下载 manifest 和 `SHA256SUMS` 并校验。
- Node.js 22.19+（本轮检查使用 22.23.3）及自带 npm。
- 默认模型入口需要 Codex CLI，以及可使用所需文字和图片能力的登录账号。也可使用兼容 Responses / Images 的 API 服务。

依赖由 `npm ci` 按 `package-lock.json` 下载。不分发跨平台 `node_modules` 附件；`sharp`、PDF 等依赖有平台差异，不要复制其他操作系统或架构的依赖目录。无需 MySQL、Redis、ComfyUI 或本地模型权重。Windows 推荐 WSL2；未单独验收的平台不能视为已完成端到端验证。

## 本机启动

```bash
npm ci
cp .env.example .env
codex login
npm start
```

打开 http://localhost:5176/china-full.html 。以完成 CLI 登录的同一系统账号运行服务，确保 `CODEX_BIN` 位于服务的 PATH，或填写绝对路径。默认 `AI_PROVIDER=pi`；可改为 `codex` 使用直接适配器。模型缺失时按页面指引检查，不需要任何云端设备配对。

API 模式设置 `AI_PROVIDER=openai`，在后端填写 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_TEXT_MODEL`、`OPENAI_IMAGE_MODEL`。可选 `OPENAI_PREVIEW_IMAGE_MODEL`。提供方须支持 GET /models、文字 Responses、图片生成与图片编辑；兼容程度应以自己的服务验收为准。图片调用不自动网络重试，避免未知结果重复生成。

## 内网与常驻服务

1. 运行 `npm run access-code`，交互输入口令，复制输出哈希到 `.env` 的 `PINTU_ACCESS_CODE_HASH`。不要在命令参数或配置中保存原始口令。
2. 设置 `HOST=0.0.0.0`，将实际访问 Origin 加入 `PINTU_ALLOWED_ORIGINS`，重启服务。
3. 配置哈希后，本机和内网用户均在各自浏览器输入口令；反代即使连接到 loopback 也不能免口令。每个浏览器保存自己的会话和作品归属；更换域名、删除 Cookie 或更换浏览器不会自动转移旧作品。
4. HTTPS 反代设置 `PINTU_COOKIE_SECURE=true`；参考 [Nginx](NGINX.md)。不要静态暴露运行目录。

Linux 模板见 `service/pintu.service`，替换其中 `__SERVICE_USER__`、`__PROJECT_DIR__`、`__NODE_BIN__` 后安装。先用非特权账号确认 `node server.js` 可运行，再启用系统服务。macOS 可运行 `npm run service:install`；该脚本只在本机生成 LaunchAgent，不分发登录资料。

## 运行数据与升级

数据位于 `runtime/`：商品资料、图片、需求会话、执行账本、浏览器会话、反馈和本地加密密钥。不要将这些文件复制进源码目录中的公开 assets。运维命令必须使用运行服务的账号和同一运行目录。

升级前停止接收新执行，记录仍在运行或待核对任务，正常停止服务，备份完整 runtime（含 WAL/SHM 与密钥）和受限 `.env`。将新代码部署到独立目录，安装依赖，保留运行数据和配置后启动。不要将发布包中的空示例覆盖实际配置。

旧私有部署不应原地用本通用版覆盖；两者授权、归属和账本格式不同。请独立安装本通用版，保留旧系统的原始记录并完成其未结任务。

重启后的不明结果只核对，不自动重跑：

```bash
npm run execution:manage -- list
npm run execution:manage -- reconcile
```

回滚仅切换代码与相容依赖，不覆盖已产生新任务的账本。恢复备份前需先确认不会丢失较新的执行结果。反馈管理见 [FEEDBACK](FEEDBACK.md)。

## 验收与制作下载包

以独立空运行目录和模拟执行器完成安装、权限、重复请求、断网与重启测试；不要连接生产数据。真实 CLI/API 验收需另行记录，不可用模拟成功代替。

开发者审核并提交源码后运行 `python3 scripts/prepare-release.py --commit HEAD --dry-run`，再移除 `--dry-run` 生成下载文件。脚本不访问部署凭据、不安装依赖、不运行模型、不推送或发布。
