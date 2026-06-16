const errorResponse = {
  type: "object",
  additionalProperties: false,
  properties: {
    error: {
      type: "object",
      additionalProperties: true,
      properties: {
        message: { type: "string" },
        code: { type: "string" },
        requestId: { type: "string" },
        retryable: { type: "boolean" },
      },
    },
  },
};

const resultSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    id: { type: "string" },
    type: { type: "string", example: "商品主图" },
    title: { type: "string" },
    creativeRole: { type: "string", example: "引流主图" },
    description: { type: "string" },
    url: { type: "string", example: "/generated/{jobId}/result-1.png" },
    width: { type: "integer" },
    height: { type: "integer" },
    model: { type: "string" },
    qualityTier: { type: "string" },
    version: { type: "integer" },
    versions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          label: { type: "string" },
          url: { type: "string" },
          prompt: { type: "string" },
        },
      },
    },
  },
};

const generationItemSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    index: { type: "integer" },
    type: { type: "string" },
    title: { type: "string" },
    creativeRole: { type: "string" },
    status: {
      type: "string",
      enum: ["queued", "generating", "completed", "failed", "retrying", "interrupted"],
    },
    attempts: { type: "integer" },
    maxAttempts: { type: "integer" },
    progressLabel: { type: "string" },
    resultId: { type: "string", nullable: true },
    error: { type: "object", additionalProperties: true, nullable: true },
  },
};

const publicJobSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    id: { type: "string", format: "uuid" },
    status: {
      type: "string",
      enum: ["awaiting_confirmation", "queued", "generating", "completed", "failed"],
    },
    progress: { type: "integer", minimum: 0, maximum: 100 },
    stage: { type: "string" },
    generationProfile: { type: "object", nullable: true, additionalProperties: true },
    generationItems: { type: "array", items: generationItemSchema },
    results: { type: "array", items: resultSchema },
    failedResults: { type: "array", items: generationItemSchema },
    analysis: { type: "object", additionalProperties: true },
    error: { type: "object", nullable: true, additionalProperties: true },
  },
};

const outputPlanSchema = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: true,
    properties: {
      type: { type: "string", example: "main" },
      label: { type: "string", example: "主图" },
      recommendedCount: { type: "integer" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            creativeRole: { type: "string" },
            description: { type: "string" },
            promptHint: { type: "string" },
          },
        },
      },
    },
  },
};

const jsonBody = (schema) => ({
  required: true,
  content: {
    "application/json": { schema },
  },
});

const jsonResponse = (description, schema) => ({
  description,
  content: {
    "application/json": { schema },
  },
});

const errorResponses = {
  400: jsonResponse("请求参数错误", errorResponse),
  404: jsonResponse("资源不存在或已过期", errorResponse),
  409: jsonResponse("当前任务状态不允许该操作", errorResponse),
  422: jsonResponse("商品主体保护规则拦截", errorResponse),
  502: jsonResponse("AI 网关或模型调用失败", errorResponse),
};

export const createApiOverview = ({ port, models, provider }) => ({
  name: "品图 AI API",
  version: "0.1.0",
  description: "本地 Node 服务提供商品分析、图片生成任务队列、单张重试、下载和对话精修接口。",
  baseUrl: `http://localhost:${port}`,
  provider,
  models,
  docs: "/api/docs",
  openapi: "/api/openapi.json",
  endpoints: [
    "GET /api/health",
    "GET /api/config",
    "POST /api/config/models",
    "POST /api/config",
    "POST /api/config/test",
    "POST /api/jobs/analyze",
    "POST /api/jobs/{jobId}/generate",
    "GET /api/jobs/{jobId}",
    "POST /api/jobs/{jobId}/items/{index}/retry",
    "POST /api/jobs/{jobId}/refine",
    "GET /api/download/{jobId}/{filename}",
    "POST /api/assist-writing",
    "GET /api/diagnostics",
  ],
});

export const createOpenApiSpec = ({ port, models, provider }) => ({
  openapi: "3.1.0",
  info: {
    title: "品图 AI API",
    version: "0.1.0",
    description:
      "面向国内电商生图工作台的本地 API。密钥只保存在服务端环境变量或 runtime 配置中，浏览器和客户端不应直接持有模型密钥。",
  },
  servers: [{ url: `http://localhost:${port}`, description: "Local development server" }],
  tags: [
    { name: "System", description: "健康检查、诊断与 API 发现" },
    { name: "Config", description: "本地 API 网关与模型选择配置" },
    { name: "Generation", description: "商品分析、生成队列、轮询和单张重试" },
    { name: "Refine", description: "对话式图片精修与下载" },
    { name: "Writing", description: "AI 帮写生成要求" },
  ],
  "x-pintu-ai": {
    provider,
    models,
    productRule: "严格保留商品真实主体，只增强背景、光影、构图、文字和电商表达。",
  },
  paths: {
    "/api": {
      get: {
        tags: ["System"],
        summary: "API 发现入口",
        responses: { 200: jsonResponse("API 概览", { type: "object", additionalProperties: true }) },
      },
    },
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "检查服务和模型配置",
        responses: { 200: jsonResponse("健康状态", { type: "object", additionalProperties: true }) },
      },
    },
    "/api/config": {
      get: {
        tags: ["Config"],
        summary: "读取当前运行时 API 配置",
        description: "不会返回真实 API Key，只返回 URL、所选模型和 Key 是否已配置。",
        responses: { 200: jsonResponse("当前配置", { type: "object", additionalProperties: true }) },
      },
      post: {
        tags: ["Config"],
        summary: "保存运行时 API 配置",
        description: "保存到本机 runtime/api-config.json。apiKey 为空时会保留已保存 Key。",
        requestBody: jsonBody({
          type: "object",
          required: ["baseUrl", "textModel", "imageModel"],
          properties: {
            baseUrl: { type: "string", example: "https://api.openai.com/v1" },
            apiKey: { type: "string", description: "首次配置必填；后续可留空保留旧 Key" },
            textModel: { type: "string", example: "your-text-model" },
            imageModel: { type: "string", example: "your-image-model" },
            previewImageModel: { type: "string", example: "your-preview-image-model" },
          },
        }),
        responses: { 200: jsonResponse("保存后的配置状态", { type: "object", additionalProperties: true }), ...errorResponses },
      },
    },
    "/api/config/models": {
      post: {
        tags: ["Config"],
        summary: "验证 URL/Key 并读取模型列表",
        requestBody: jsonBody({
          type: "object",
          required: ["baseUrl", "apiKey"],
          properties: {
            baseUrl: { type: "string", example: "https://api.openai.com/v1" },
            apiKey: { type: "string" },
          },
        }),
        responses: { 200: jsonResponse("模型列表和推荐模型", { type: "object", additionalProperties: true }), ...errorResponses },
      },
    },
    "/api/config/test": {
      post: {
        tags: ["Config"],
        summary: "重新测试当前保存配置",
        responses: { 200: jsonResponse("测试后的配置状态", { type: "object", additionalProperties: true }), ...errorResponses },
      },
    },
    "/api/diagnostics": {
      get: {
        tags: ["System"],
        summary: "查看本地任务队列和最近错误",
        responses: { 200: jsonResponse("诊断信息", { type: "object", additionalProperties: true }) },
      },
    },
    "/api/assist-writing": {
      post: {
        tags: ["Writing"],
        summary: "AI 帮写商品图生成要求",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  images: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                    description: "可选，1-6 张商品参考图",
                  },
                  mode: { type: "string", example: "main" },
                  platform: { type: "string", example: "淘宝 / 天猫" },
                  language: { type: "string", example: "中文（简体）" },
                  ratio: { type: "string", example: "1:1 正方形" },
                  currentText: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse("帮写结果", {
            type: "object",
            properties: {
              suggestion: { type: "string" },
              model: { type: "string" },
              usedImages: { type: "integer" },
              visionFallback: { type: "boolean" },
            },
          }),
          ...errorResponses,
        },
      },
    },
    "/api/jobs/analyze": {
      post: {
        tags: ["Generation"],
        summary: "上传商品图并生成 AI 推荐方案",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["images"],
                properties: {
                  images: {
                    type: "array",
                    minItems: 1,
                    maxItems: 6,
                    items: { type: "string", format: "binary" },
                  },
                  mode: { type: "string", enum: ["main", "detail", "sku", "logo", "style", "retouch"] },
                  platform: { type: "string", example: "淘宝 / 天猫" },
                  requirements: { type: "string", example: "国风包装袋，突出材质和手提结构" },
                  language: { type: "string", example: "中文（简体）" },
                  ratio: { type: "string", example: "1:1 正方形" },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse("等待用户确认的生成任务", publicJobSchema),
          ...errorResponses,
        },
      },
    },
    "/api/jobs/{jobId}/generate": {
      post: {
        tags: ["Generation"],
        summary: "确认方案并创建逐张生成队列",
        parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: jsonBody({
          type: "object",
          properties: {
            outputPlan: outputPlanSchema,
            outputs: { type: "array", items: { type: "object", additionalProperties: true } },
            analysisPatch: {
              type: "object",
              properties: {
                sellingPoints: { type: "array", items: { type: "string" } },
                selectedStyle: { type: "object", additionalProperties: true },
                language: { type: "string" },
              },
            },
            quality: { type: "string", enum: ["标准", "高清"] },
          },
        }),
        responses: {
          202: jsonResponse("生成队列已创建", publicJobSchema),
          ...errorResponses,
        },
      },
    },
    "/api/jobs/{jobId}": {
      get: {
        tags: ["Generation"],
        summary: "轮询任务状态和逐张结果",
        parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: jsonResponse("任务状态", publicJobSchema),
          ...errorResponses,
        },
      },
    },
    "/api/jobs/{jobId}/items/{index}/retry": {
      post: {
        tags: ["Generation"],
        summary: "只重试某一张失败图片",
        parameters: [
          { name: "jobId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "index", in: "path", required: true, schema: { type: "integer", minimum: 0 } },
        ],
        responses: {
          202: jsonResponse("单张已重新排队", publicJobSchema),
          ...errorResponses,
        },
      },
    },
    "/api/jobs/{jobId}/refine": {
      post: {
        tags: ["Refine"],
        summary: "对话式图片精修",
        parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["imageId", "prompt"],
                properties: {
                  imageId: { type: "string" },
                  versionId: { type: "integer", default: 0 },
                  prompt: { type: "string", example: "背景换成浅米色，标题更高级一点" },
                  mask: {
                    type: "string",
                    format: "binary",
                    description: "可选。提供 PNG 蒙版时按局部修改；不提供时按整张图语义修改。",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse("新版本已创建", {
            type: "object",
            properties: {
              result: resultSchema,
              version: { type: "object", additionalProperties: true },
              message: { type: "string" },
            },
          }),
          ...errorResponses,
        },
      },
    },
    "/api/download/{jobId}/{filename}": {
      get: {
        tags: ["Refine"],
        summary: "下载生成图片",
        parameters: [
          { name: "jobId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "filename", in: "path", required: true, schema: { type: "string", example: "result-1.png" } },
          { name: "name", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "PNG 图片附件",
            content: { "image/png": { schema: { type: "string", format: "binary" } } },
          },
          ...errorResponses,
        },
      },
    },
  },
});

const endpointRows = [
  ["POST", "/api/jobs/analyze", "上传商品图，返回 AI 推荐生成方案"],
  ["POST", "/api/jobs/{jobId}/generate", "确认方案，创建逐张生成队列"],
  ["GET", "/api/jobs/{jobId}", "轮询任务状态，生成一张显示一张"],
  ["POST", "/api/jobs/{jobId}/items/{index}/retry", "单独重试失败图片"],
  ["POST", "/api/jobs/{jobId}/refine", "对话精修，可选局部蒙版"],
  ["GET", "/api/download/{jobId}/{filename}", "下载生成图片"],
  ["POST", "/api/assist-writing", "AI 帮写生成要求"],
  ["GET", "/api/diagnostics", "任务队列与错误诊断"],
];

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const renderApiDocsHtml = ({ port, models, provider }) => {
  const rows = endpointRows
    .map(
      ([method, path, description]) =>
        `<tr><td><span class="method">${method}</span></td><td><code>${escapeHtml(path)}</code></td><td>${escapeHtml(description)}</td></tr>`
    )
    .join("");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>品图 AI API</title>
  <style>
    :root { color-scheme: light; --ink:#0f172a; --muted:#64748b; --line:#d8f3f7; --cyan:#06b6d4; --green:#d9fb8f; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; color: var(--ink); background: radial-gradient(circle at 20% 0%, #e9fbff 0, transparent 30%), #f8fdff; }
    main { width: min(1080px, calc(100% - 40px)); margin: 56px auto; }
    .hero, .card { border: 1px solid var(--line); background: rgba(255,255,255,.88); border-radius: 28px; box-shadow: 0 24px 80px rgba(15,23,42,.08); }
    .hero { padding: 42px; }
    .badge { display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 999px; background: #ecfeff; color: #0e7490; font-weight: 700; border: 1px solid #a5f3fc; }
    h1 { margin: 20px 0 12px; font-size: clamp(36px, 5vw, 58px); line-height: 1.1; letter-spacing: -.02em; }
    p { color: var(--muted); font-size: 16px; line-height: 1.8; }
    a { color: #0e7490; font-weight: 700; text-decoration: none; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 18px; }
    .card { padding: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; overflow: hidden; border-radius: 18px; }
    th, td { padding: 14px 12px; border-bottom: 1px solid #e2f4f7; text-align: left; vertical-align: top; }
    th { color: #0e7490; font-size: 13px; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    code { color: #0f172a; }
    pre { margin: 12px 0 0; padding: 16px; overflow: auto; border-radius: 18px; background: #0f172a; color: #dff7ff; font-size: 13px; line-height: 1.65; }
    .method { display: inline-flex; align-items: center; justify-content: center; min-width: 58px; height: 28px; border-radius: 999px; background: var(--green); font-weight: 800; color: #365314; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
    .pill { padding: 9px 12px; border: 1px solid var(--line); border-radius: 999px; background: #fff; color: var(--muted); font-weight: 650; }
    @media (max-width: 780px) { main { width: min(100% - 28px, 1080px); margin: 28px auto; } .hero { padding: 28px; } .grid { grid-template-columns: 1fr; } th:nth-child(3), td:nth-child(3) { display:none; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <span class="badge">品图 AI API</span>
      <h1>电商生图工作台接口</h1>
      <p>这个本地 Node 服务提供商品分析、AI 推荐方案、逐张生图队列、单张重试、下载和对话精修。模型密钥只读取服务端 <code>.env</code>，不要把真实密钥写进前端或开源仓库。</p>
      <div class="meta">
        <span class="pill">Base URL: http://localhost:${escapeHtml(port)}</span>
        <span class="pill">Text: ${escapeHtml(models.text)}</span>
        <span class="pill">Image: ${escapeHtml(models.image)}</span>
        <span class="pill">Provider: ${escapeHtml(provider)}</span>
      </div>
    </section>

    <div class="grid">
      <section class="card">
        <h2>调用顺序</h2>
        <p>先上传商品图分析，再确认方案创建队列，随后轮询任务。生成结果是一张一张完成的，失败图片可以单独重试。</p>
        <pre>1. POST /api/jobs/analyze
2. POST /api/jobs/{jobId}/generate
3. GET  /api/jobs/{jobId}
4. POST /api/jobs/{jobId}/refine
5. GET  /api/download/{jobId}/{filename}</pre>
      </section>
      <section class="card">
        <h2>开放规范</h2>
        <p>机器可读接口规范在 <a href="/api/openapi.json">/api/openapi.json</a>。如果接任 AI 或前端工具需要理解接口，优先读取这个 JSON。</p>
        <pre>curl http://localhost:${escapeHtml(port)}/api
curl http://localhost:${escapeHtml(port)}/api/openapi.json</pre>
      </section>
    </div>

    <section class="card" style="margin-top:18px">
      <h2>接口列表</h2>
      <table>
        <thead><tr><th>方法</th><th>路径</th><th>用途</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
};
