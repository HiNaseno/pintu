# Pi、CLI 与兼容 API 后台

默认 `AI_PROVIDER=pi` 使用 Pi Agent Core 1.1.0 管理商品分析、问答、整套策划和提示词重写，通过服务器已登录的 Codex CLI 完成模型调用。图片由原有 Codex 图片适配器执行，本地持久账本在所有模式下统一控制派发。

Pi 不向模型开放 shell、文件或网络工具，文字入口禁用图片生成。子进程隔离工作目录、参数及超时；客户端仅接收整理后的状态和错误，不接收完整模型日志或登录资料。此桥接不伪造原生 token 计费统计。

```text
AI_PROVIDER=pi
CODEX_BIN=codex
CODEX_MODEL=gpt-6.1-sol
CODEX_REASONING_EFFORT=medium
CODEX_TIMEOUT_MS=600000
```

`AI_PROVIDER=codex` 使用直接 CLI 后台。切换提供方前等待活动任务完成，并保留待核对任务的原执行目录与账本；改配置不能作为重跑旧任务的方法。

`AI_PROVIDER=openai` 使用后端 OpenAI 兼容连接：文字使用 Responses，图片使用 Images 生成与编辑接口。配置 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_TEXT_MODEL` 与 `OPENAI_IMAGE_MODEL`；模型能力由所选提供方决定。不要将密钥放入浏览器、URL 或前端存储。

所有图片动作按稳定请求编号登记参数与素材摘要，并原子取得派发权。结果未知时保留记录，不能通过自动重试假定第一次失败。模拟测试只用于验证生命周期、错误、隔离与幂等，不证明真实账号拥有任何模型或图片能力。

服务启动后 `/api/generation-service` 提供当前浏览器可见的配置和队列状态。接口清单见 [API](API.md)，检查命令为 `npm test`。
