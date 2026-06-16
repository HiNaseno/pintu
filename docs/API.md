# 品图 AI API

品图 AI 通过同源 Node 服务提供本地 API。前端页面和 API 共用同一个服务端，真实模型密钥只放在服务端 `.env` 或本机 `runtime/api-config.json` 中，不能写进浏览器代码或公开仓库。

启动后访问：

```text
http://localhost:5176/api
http://localhost:5176/api/docs
http://localhost:5176/api/openapi.json
```

## 调用流程

0. `GET /api/config` / `POST /api/config/models` / `POST /api/config`
   本地配置 API URL、Key、文字模型和图片模型。接口不会返回真实 Key。

1. `POST /api/jobs/analyze`
   上传商品图并生成 AI 推荐方案。

2. `POST /api/jobs/{jobId}/generate`
   用户确认方案后创建逐张生成队列。

3. `GET /api/jobs/{jobId}`
   前端轮询任务状态。每张图独立排队、生成、完成或失败。

4. `POST /api/jobs/{jobId}/items/{index}/retry`
   只重试指定失败图片，不重跑整单。

5. `POST /api/jobs/{jobId}/refine`
   对话式精修图片。`mask` 可选；有蒙版时局部修改，没有蒙版时按整图语义修改。

6. `GET /api/download/{jobId}/{filename}`
   下载生成图片。

## 商品真实性红线

无论生成还是精修，系统都应严格保留商品真实主体：

- 不改变商品轮廓、结构、材质、真实颜色。
- 不改写商品原有印刷内容、品牌标识和关键细节。
- 可以增强背景、光影、构图、排版、卖点表达和电商氛围。

## 示例：分析商品

```js
const form = new FormData();
form.append("images", fileInput.files[0]);
form.append("mode", "main");
form.append("platform", "淘宝 / 天猫");
form.append("language", "中文（简体）");
form.append("ratio", "1:1 正方形");
form.append("requirements", "突出材质和便携卖点");

const job = await fetch("/api/jobs/analyze", {
  method: "POST",
  body: form,
}).then((response) => response.json());
```

## 示例：配置 API 与模型

```js
const models = await fetch("/api/config/models", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-...",
  }),
}).then((response) => response.json());

await fetch("/api/config", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-...",
    textModel: models.suggestedTextModels[0],
    imageModel: models.suggestedImageModels[0],
  }),
});
```

## 示例：确认并生成

```js
const queuedJob = await fetch(`/api/jobs/${job.id}/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    outputPlan: job.analysis.recommendedOutputPlan,
    analysisPatch: {
      sellingPoints: job.analysis.sellingPoints,
      language: "中文（简体）",
    },
  }),
}).then((response) => response.json());
```

## 示例：轮询任务

```js
const current = await fetch(`/api/jobs/${job.id}`).then((response) => response.json());

for (const item of current.generationItems) {
  console.log(item.index, item.title, item.status, item.progressLabel);
}
```

## 示例：对话精修

```js
const form = new FormData();
form.append("imageId", result.id);
form.append("versionId", String(result.version || 0));
form.append("prompt", "背景换成浅米色，标题更高级一点");
// 可选：form.append("mask", maskPngBlob, "mask.png");

const refined = await fetch(`/api/jobs/${job.id}/refine`, {
  method: "POST",
  body: form,
}).then((response) => response.json());
```

## 常见状态

`generationItems[]` 中每张图有独立状态：

- `queued`：排队中
- `generating`：生成中
- `retrying`：重试中
- `completed`：已完成
- `failed`：失败，可单张重试
- `interrupted`：服务重启或任务中断，可单张重试

## 开源注意事项

- `.env`、`AI API.rtf`、`runtime/`、`node_modules/` 不要提交。
- 提交 `.env.example`，不要提交真实 API Key。
- 右上角“API 配置”会把本机配置保存到 `runtime/api-config.json`，该目录必须保持在 `.gitignore` 中。
- 如需给外部开发者看接口，优先让他们读 `/api/openapi.json` 或本文件。
