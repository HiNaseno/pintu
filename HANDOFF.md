# 品图 AI 项目交接说明

> 注意：本文件是早期交接说明。最新、最完整的接任 AI 操作说明请优先阅读 `NEXT_AI_HANDOFF.md`。

## 项目概览

品图 AI 是面向国内电商商家的 AI 商品视觉生成原型。用户上传商品素材后，可以先使用文本模型分析商品与生成方案，确认后再生成主图、详情页、SKU 图、Logo、风格复刻图或批量精修图，并支持圈选区域进行对话式图片修改。

当前唯一开发目录：

```text
/Users/xiaoyan/Documents/Three-dimensional square
```

## 技术结构

- 前端：原生 HTML、CSS、JavaScript。
- 服务端：Node.js、Express。
- 文件上传：Multer，支持 PNG、JPEG、WebP，最多 6 张、每张 10MB。
- 图片处理：Sharp。
- AI SDK：OpenAI Node SDK，使用可配置的 OpenAI 兼容网关。
- 任务状态：服务端内存。
- 生成文件：`runtime/generated/<jobId>/`，默认保留 24 小时。
- 数据库：当前没有数据库。

主要入口：

```text
china-full.html          首页
china-workflow.html      AI 生成工作台
china-examples.html      案例页
server.js                静态资源与 AI API 服务
test/api-flow.test.js    无费用模拟网关测试
```

## 环境变量

从模板创建本机配置：

```bash
cp .env.example .env
```

必填配置：

```text
OPENAI_API_KEY
OPENAI_BASE_URL
OPENAI_TEXT_MODEL
OPENAI_IMAGE_MODEL
PORT
GENERATED_FILE_TTL_HOURS
```

当前开发模型：

```text
文本：gpt-5.5-2026-04-23
图片：gpt-image-2-2026-04-21
```

真实密钥只能放在 `.env` 或部署平台密钥管理中。`.env`、`AI API.rtf`、`runtime/` 已加入 `.gitignore`，服务端也会拒绝通过 HTTP 下载这些文件。

## 启动与测试

安装依赖：

```bash
npm install
```

启动：

```bash
npm start
```

macOS 开发机建议安装常驻服务，避免关闭终端或 Codex 会话后后端退出：

```bash
npm run service:install
```

查看状态或卸载：

```bash
npm run service:status
npm run service:uninstall
```

服务登录后自动启动，异常退出会自动拉起。日志位于 `runtime/logs/`。

访问：

```text
http://localhost:5176/china-full.html
http://localhost:5176/china-workflow.html
```

运行不产生真实模型费用的测试：

```bash
npm test
```

测试会启动本地模拟 AI 网关，覆盖模型健康检查、密钥文件隔离、六种生成模式、任务轮询和对话精修。

## 已完成内容

- 首页、工作台和案例页视觉及响应式原型。
- 六种模式：商品主图、详情页、SKU、Logo、风格复刻、批量精修。
- 服务启动时读取模型列表并检查指定文本、图片模型。
- 真实图片上传、格式与大小校验。
- GPT 文本分析、方案确认、图片异步生成、进度轮询和真实下载。
- 对话精修：Canvas 圈选、服务端主体保护审核、蒙版图片编辑和版本保留。
- 图片结果保存在本机运行目录，定时清理过期任务与文件。
- API 错误、请求 ID、失败重试和模型不可用状态。
- 已移除工作台本地 SVG 成功结果、定时假生成和 CSS 假精修效果。

## 未完成内容

- 登录、店铺、套餐、额度、支付与订单系统。
- 数据库、正式任务队列、对象存储和多实例任务同步。
- 生产环境的限流、鉴权、病毒扫描、内容审核和操作审计。
- 平台尺寸规则后台配置与完整导出 ZIP。
- 真实 AI 调用成本统计、取消任务和生成额度预扣。
- 长详情页目前按照单张竖版结果处理，尚未实现多屏生成与自动拼接策略。
- 当前使用第三方 OpenAI 兼容网关；生产上线前需完成供应商安全、隐私和稳定性评估。

## 已知问题与注意事项

- 服务端任务保存在内存中，服务重启后任务记录会丢失，但已生成文件会等待清理。
- 当前生成按顺序执行以降低限流风险，批量任务耗时会随张数增加。
- 图片模型费用由实际生成数量和质量决定；前端默认使用单张预览。
- 当前网关上的 `gpt-image-2-2026-04-21` 不接受 `input_fidelity` 参数，主体保护依赖原图编辑、保护提示词和蒙版。
- 未执行自动付费实测。正式联调时建议先用非敏感、可公开的商品图分别测试一次分析、生成和精修。
- 不要用 Python 静态服务器启动项目；真实 API 必须通过 `npm start` 的 Node 服务访问。

## 下一步建议

1. 用一张公开测试商品图完成一次受控真实分析、生成和精修。
2. 增加用户鉴权、额度预扣和请求限流，避免 API 被公开滥用。
3. 将任务、版本和对话记录迁移到数据库，将图片迁移到对象存储。
4. 增加正式内容审核、商标风险提示和供应商数据处理协议。
5. 根据真实模型输出调整提示词、平台尺寸与详情页拼接策略。
