import {DESIGN_SCHEMA} from './detail-design.js';
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
    pageId: { type: "string", description: "v2 对应的稳定页面编号" },
    referenceIds: { type: "array", items: { type: "string" } },
    compilationRevision: { type: "string", description: "v2 使用的冻结方案版本" },
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
    pageId: { type: "string", description: "v2 页面编号" },
    type: { type: "string" },
    title: { type: "string" },
    creativeRole: { type: "string" },
    status: {
      type: "string",
      enum: ["queued", "generating", "completed", "failed", "retrying", "interrupted", "reconciling"],
    },
    attempts: { type: "integer" },
    maxAttempts: { type: "integer" },
    progressLabel: { type: "string" },
    resultId: { type: ["string", "null"] },
    error: { type: ["object", "null"], additionalProperties: true },
  },
};

const visualSchema = {
  type: "object", required: ["presence", "background", "composition", "shot"],
  properties: {
    presence: { type: "string", enum: ["full", "detail", "none"] },
    background: { type: "string", maxLength: 600 }, composition: { type: "string", maxLength: 600 }, shot: { type: "string", maxLength: 300 },
  },
};
const strategySchema = {
  type: "object", required: ["audience", "purchaseReason", "readingFlow"],
  properties: Object.fromEntries(["audience", "purchaseReason", "readingFlow"].map(key => [key, { type: "string", minLength: 1, maxLength: 3000 }])),
};
const materialSchema = {
  type: "object", additionalProperties: true,
  properties: {
    referenceId: { type: "string", description: "任务内稳定的参考图编号；同名文件仍有独立编号" },
    sourceId: { type: "string" }, sourceName: { type: "string" },
    sourceKind: { type: "string", enum: ["upload", "pdf_page", "docx_image"] },
    ordinal: { type: "integer", description: "直接图片序号、PDF 页码或 Word 内嵌图片序号" },
    role: { type: "string", enum: ["primary", "back", "detail", "specification", "material", "style", "variant", "other"] },
    description: { type: "string", maxLength: 1000 }, variant: { type: "string", maxLength: 1000 },
    thumbnailUrl: { type: "string", readOnly: true },
  },
};
const detailPageSchema = {
  type: "object", additionalProperties: true,
  required: ["buyerQuestion", "title", "subtitle", "body", "facts", "creativeRole", "description", "visual", "referenceIds"],
  anyOf: [{ required: ["pageId"] }, { required: ["id"] }],
  properties: {
    pageId: { type: "string", maxLength: 100, description: "analysis.outputs 中的稳定页面编号，排序后保持不变" },
    id: { type: "string", maxLength: 100, description: "analysis.pages 使用 id；提交时亦兼容 id" },
    buyerQuestion: { type: "string", minLength: 1, maxLength: 500 },
    title: { type: "string", maxLength: 240 }, subtitle: { type: "string", maxLength: 500 }, body: { type: "string", maxLength: 3000 },
    facts: { type: "array", maxItems: 20, items: { type: "string", minLength: 1, maxLength: 1000 }, description: "用户确认的事实和依据，不代表系统已经完成外部事实核验" },
    creativeRole: { type: "string", minLength: 1, maxLength: 240 }, description: { type: "string", minLength: 1, maxLength: 1000 },
    prompt: { type: "string", maxLength: 3000, description: "可选补充画面要求；最终生图指令在确认后另行编写" },
    visual: visualSchema,
    referenceCrops: {type:"object",description:"按已选参考编号绑定 EXIF 转正后的归一化矩形；实际裁切后送入引擎。",additionalProperties:{type:"object",required:["x","y","width","height"],properties:Object.fromEntries(["x","y","width","height"].map(key=>[key,{type:"number",minimum:0,maximum:1}]))}},
    referenceIds: { type: "array", uniqueItems: true, maxItems: 6, items: { type: "string", maxLength: 100 }, description: "通常 1–3 张，最多 6 张；顺序即附件顺序，第一张主要参考。none 仅允许材质样片 material 或风格参考 style；full/detail 有可用素材时至少一张" },
  },
};
const compilationSchema = {
  type: ["object", "null"],
  properties: {
    status: { type: "string", enum: ["pending", "running", "completed", "failed"] },
    revision: { type: "string", description: "冻结的确认方案版本标识，编译和图片重试沿用该版本" },
    pages: { type: "array", items: { type: "object", properties: { pageId: { type: "string" }, prompt: { type: "string" } } } },
    completedAt: { type: "string", format: "date-time" }, error: { type: ["object", "null"], additionalProperties: true },
  },
};
const productProfileSchema = {
  type: ["object", "null"],
  properties: {
    product: { type: "string" }, category: { type: "string" },
    features: { type: "array", maxItems: 12, items: { type: "string" } },
    confirmedFacts: { type: "array", maxItems: 20, items: { type: "string" }, description: "识别整理的资料事实，仍需用户核对，不等于外部认证或事实验证" },
    unknowns: { type: "array", maxItems: 12, items: { type: "string" } },
    sources: { type: "array", items: { type: "object", properties: {
      sourceId: { type: "string" }, sourceName: { type: "string" }, sourceKind: { type: "string" },
      referenceId: { type: "string" }, ordinal: { type: "integer" },
    } } },
  },
};
const promptRevisionSchema = {
  type: ["object", "null"],
  properties: {
    requestId: { type: "string" }, instruction: { type: "string" },
    status: { type: "string", enum: ["running", "completed", "failed"] },
    revision: { type: ["string", "null"], description: "成功改写结果对应的方案版本标识" },
    sourceRevision: { type: "string", description: "改写前确认草稿的版本标识" },
    pages: { type: "array", items: { type: "object", properties: { pageId: { type: "string" }, prompt: { type: "string" }, visual: visualSchema } } },
    appliedRequestId: { type: ["string", "null"], description: "当前可用的成功版本；本次失败时可能仍指向上一成功版本" },
    error: { type: ["object", "null"], additionalProperties: true },
  },
};

const briefSchema = {
  type: "object", additionalProperties: true,
  properties: {
    id: { type: "string", format: "uuid" }, fields: { type: "object", additionalProperties: true },
    messages: { type: "array", items: { type: "object", additionalProperties: true } }, summary: { type: "string" },
    questions: { type: "array", maxItems: 3, items: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" } } } } },
    phase: { type: "string", enum: ["created", "analyzing", "questioning", "awaiting_answer", "ready", "failed"] },
    productProfile: productProfileSchema, error: { type: ["object", "null"], additionalProperties: true },
    pendingMessage: { type: ["object", "null"], properties: { requestId: { type: "string" }, text: { type: "string" } }, description: "已持久化但尚未处理成功的回答；恢复时沿用，不静默丢失" },
    ready: { type: "boolean" }, pending: { type: "boolean" }, warnings: { type: "array", items: { type: "string" } },
  },
};
const uploadMaterialSchema = {
  type: "object", required: ["images"],
  properties: {
    images: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", format: "binary" }, description: "PNG/JPEG/WebP/PDF/DOC/DOCX/TXT/MD/CSV/JSON；每个最多 10MB；合计最多提取 12 张参考图" },
    mode: { type: "string", enum: ["main", "detail", "sku", "logo", "style", "retouch"] },
    platform: { type: "string" }, language: { type: "string" }, ratio: { type: "string" }, requirements: { type: "string" },
    submissionId: { type: "string", format: "uuid", description: "仅分析接口使用：分析请求去重编号" },
  },
};

const publicJobSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    id: { type: "string", format: "uuid" },
    workflowVersion: { type: "integer", enum: [1, 2], description: "新详情页任务为 2；旧任务及其他生成模式为 1" },
    config: { type: "object", additionalProperties: true },
    materials: { type: "array", maxItems: 12, items: materialSchema },
    compilation: compilationSchema,
    promptRevision: promptRevisionSchema,
    status: {
      type: "string",
      enum: ["awaiting_confirmation", "queued", "generating", "completed", "failed", "reconciling"],
    },
    progress: { type: "integer", minimum: 0, maximum: 100 },
    stage: { type: "string" },
    execution: {type: "object", properties: {pending: {type:"boolean"}, code: {type:["string","null"]}, state: {type:"string",enum:["CREATED","DISPATCHING","DONE","FAILED","UNCERTAIN"]}, operationId: {type:"string"}, admissionBlocked: {type:"boolean"}, pendingReconciliationCount: {type:"integer",minimum:0}}},
    generationProfile: { type: ["object", "null"], additionalProperties: true },
    generationItems: { type: "array", items: generationItemSchema },
    results: { type: "array", items: resultSchema },
    failedResults: { type: "array", items: generationItemSchema },
    analysis: { type: "object", additionalProperties: true, properties: {
      strategy: strategySchema, suiteStyle: { type: "string" },
      pages: { type: "array", minItems: 1, maxItems: 12, items: detailPageSchema },
      outputs: { type: "array", items: { anyOf: [detailPageSchema, { type: "object", additionalProperties: true }] } },
    } },
    error: { type: ["object", "null"], additionalProperties: true },
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
  version: "0.3.0",
  description: "本地服务提供素材问答、详情页整套策划、逐屏脚本确认、独立指令编写、图片队列和对话精修接口。",
  baseUrl: `http://localhost:${port}`,
  provider,
  models,
  docs: "/api/docs",
  openapi: "/api/openapi.json",
  endpoints: [
    "GET /api/health",
    "GET /api/generation-service",
    "GET /api/session",
    "POST /api/session/unlock",
    "POST /api/briefs",
    "GET /api/briefs/{id}",
    "POST /api/briefs/{id}/analyze",
    "POST /api/briefs/{id}/messages",
    "POST /api/jobs/analyze",
    "POST /api/jobs/{jobId}/compile/retry",
    "GET /api/jobs/{jobId}/materials/{referenceId}/thumbnail",
    "POST /api/jobs/{jobId}/generate",
    "POST /api/jobs/{jobId}/prompts/rewrite",
    "GET /api/jobs/{jobId}",
    "POST /api/jobs/{jobId}/items/{index}/retry",
    "POST /api/jobs/{jobId}/refine",
    "GET /api/download/{jobId}/{filename}",
    "POST /api/assist-writing",
    "POST /api/feedback",
    "GET /api/feedback/{id}/screenshots/{index}",
    "GET /api/jobs/{jobId}/materials/{referenceId}/crop-preview",
  ],
});

export const createOpenApiSpec = ({ port, models, provider }) => {
const spec = {
  openapi: "3.1.0",
  info: {
    title: "品图 AI API",
    version: "0.3.0",
    description:
      "面向国内电商生图工作台的本地 API。密钥只保存在服务端环境变量或 runtime 配置中，浏览器和客户端不应直接持有模型密钥。",
  },
  servers: [{ url: `http://localhost:${port}`, description: "Local development server" }],
  tags: [
    { name: "System", description: "健康检查、诊断与 API 发现" },
    { name: "Config", description: "本地 API 网关与模型选择配置" },
    { name: "Generation", description: "商品策划、独立指令编写、生成队列和单张重试" },
    { name: "Brief", description: "可跳过的需求问答与素材快照" },
    { name: "Refine", description: "对话式图片精修与下载" },
    { name: "Writing", description: "AI 帮写生成要求" },
    { name: "Feedback", description: "本机意见反馈与当前会话自己的截图" },
  ],
  "x-pintu-ai": {
    provider,
    models,
    productRule: "提示词约束实际出现的商品外观，并支持不展示商品的页面；成图仍需用户检查商品与文字准确性。",
  },
  components: { schemas: { PublicJob: publicJobSchema, DetailPage: detailPageSchema, DetailStrategy: strategySchema, Material: materialSchema, Compilation: compilationSchema, Brief: briefSchema, ProductProfile: productProfileSchema, PromptRevision: promptRevisionSchema } },
  paths: {
    "/api": {
      get: {
        tags: ["System"],
        summary: "API 发现入口",
        responses: { 200: jsonResponse("API 概览", { type: "object", additionalProperties: true }) },
      },
    },
    "/api/generation-service": {
      get: {
        tags: ["System"],
        summary: "检查生成服务登录状态与等待任务数",
        description: "返回本地执行层管理的生成服务状态；ready 不保证每次生成成功，实际能力以任务结果为准。网页配置接口已关闭，返回 403。",
        responses: { 200: jsonResponse("生成服务状态", { type: "object", properties: {
          provider: { type: "string" }, ready: { type: "boolean" },
          error: { type: ["string", "null"] }, pending: { type: "integer" },
        } }) },
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
                    description: "可选，1-6 个商品图片或资料文件；支持 PNG/JPEG/WebP/PDF/DOC/DOCX/TXT/MD/CSV/JSON，每个不超过 10MB",
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
    "/api/briefs": {
      post: {
        tags: ["Brief"], summary: "上传素材并创建需求会话",
        description: "保存原始文件和解析后的参考素材清单，问答与后续分析复用稳定编号及 PDF 页码/Word 图序。仅创建会话，不立即生成方案。",
        requestBody: { required: true, content: { "multipart/form-data": { schema: uploadMaterialSchema } } },
        responses: { 201: jsonResponse("需求会话", briefSchema), ...errorResponses },
      },
    },
    "/api/briefs/{id}": {
      get: {
        tags: ["Brief"], summary: "恢复需求问答",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: jsonResponse("需求会话", briefSchema), ...errorResponses },
      },
    },
    "/api/briefs/{id}/analyze": {
      post: {
        tags: ["Brief"], summary: "先识别商品，再整理缺失的需求问题",
        description: "无请求体，返回 202 后轮询 GET /api/briefs/{id} 的 phase/productProfile/pendingMessage。先持久化商品概况、特点、资料事实与未知信息，再提问；已成功的识别结果会复用。失败可重试，保留未处理回答。不会创建生图任务。",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 202: jsonResponse("商品识别或问题整理已开始", briefSchema), ...errorResponses },
      },
    },
    "/api/briefs/{id}/messages": {
      post: {
        tags: ["Brief"], summary: "发送回答，整理确认摘要",
        description: "成功请求按 requestId 去重；同一会话并发返回 409，失败保留 pendingMessage，可沿用原 requestId 重试。没有商品识别时先识别，再基于识别结果整理问题。此接口等待本轮回答完成后返回。",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: jsonBody({ type: "object", required: ["requestId", "message"], properties: {
          requestId: { type: "string", pattern: "^[a-zA-Z0-9-]{1,80}$" }, message: { type: "string", minLength: 1, maxLength: 4000 },
        } }),
        responses: { 200: jsonResponse("问答与摘要", briefSchema), ...errorResponses },
      },
    },
    "/api/jobs/analyze": {
      post: {
        tags: ["Generation"],
        summary: "分析素材并生成可确认的整套方案",
        description: "mode=detail 的新任务返回 workflowVersion=2、strategy、pages/outputs 和素材清单。默认建议 8–10 屏，资料不足精简，可确认 1–12 屏。其他模式及旧任务维持原方案格式。",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": { schema: uploadMaterialSchema },
            "application/json": { schema: { type: "object", required: ["briefId"], properties: {
              briefId: { type: "string", format: "uuid" }, summary: { type: "string", maxLength: 6000 },
              submissionId: { type: "string", format: "uuid" },
            } } },
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
        summary: "确认方案并开始整套生成",
        description: "v2 客户端发送完整 outputs、strategy、designSystem、materialCoverage 与材料用途修正。无商品页面只允许 material/style 参考；referenceCrops 会实际裁切并进入冻结快照。服务端冻结确认版本，独立编写全部页面指令；编写校验成功后才逐张生图。重复提交已冻结方案返回 409；失败使用对应重试接口。旧任务继续直接创建图片队列。",
        parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: jsonBody({
          type: "object",
          example: {
            outputs: [{ pageId: "0e2b4470-5e23-4c26-b1b2-316d3f5b0f68", buyerQuestion: "这款商品如何使用？",
              title: "日常使用说明", subtitle: "", body: "请按已确认说明操作。", facts: ["用户确认：使用说明来自随附资料"],
              creativeRole: "使用说明", description: "以分步骤信息卡片展示使用要点", prompt: "标题区保持留白",
              visual: { presence: "none", background: "浅色信息底", composition: "分步信息卡片", shot: "平面" }, referenceIds: [] }],
            strategy: { audience: "准备购买的消费者", purchaseReason: "理解适用方式", readingFlow: "通过已确认说明辅助选购" },
            materials: [], analysisPatch: { language: "中文（简体）" }, quality: "标准",
          },
          properties: {
            outputPlan: outputPlanSchema,
            outputs: { type: "array", minItems: 1, maxItems: 36, description: "v2 为 1–12 屏，使用 DetailPage 所有确认字段；旧任务兼容原格式", items: { anyOf: [detailPageSchema, { type: "object", additionalProperties: true }] } },
            strategy: strategySchema,
            designSystem: DESIGN_SCHEMA,
            materialCoverage: {type:"array",maxItems:12,items:{type:"object",required:["name","part","evidence","enabled","pageIds"],properties:{name:{type:"string"},part:{type:"string"},evidence:{type:"string"},enabled:{type:"boolean"},pageIds:{type:"array",items:{type:"string"}}}}},
            materials: { type: "array", maxItems: 12, items: { ...materialSchema, required: ["referenceId", "role"] }, description: "可修正用途、说明和款式；不接受新增或其他任务的素材编号" },
            analysisPatch: {
              type: "object",
              properties: {
                sellingPoints: { type: "array", items: { type: "string" } },
                selectedStyle: { type: "object", additionalProperties: true },
                language: { type: "string" },
              },
            },
            promptRevisionId: { type: "string", description: "可选，指定确认使用的成功改写 requestId；过期版本返回 400。未修改方案时复用成功改写指令，有修改时按当前草稿重编写" },
            quality: { type: "string", enum: ["标准", "高清"] },
          },
        }),
        responses: {
          202: jsonResponse("确认方案已冻结，已进入编写或图片生成队列", publicJobSchema),
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
    "/api/jobs/{jobId}/prompts/rewrite": {
      post: {
        tags: ["Generation"], summary: "只改写已确认方案的画面提示词，不生图",
        description: "支持六种模式，仅等待确认且未冻结生成的任务可用。请求带同 /generate 的当前确认字段，加 requestId 与 instruction。返回 202，轮询任务的 promptRevision；不会调用图片生成。固定文案、事实、页数顺序、商品呈现与参考图不在改写范围。冲突要求异步失败，error.code=PROMPT_REWRITE_REJECTED。",
        parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: jsonBody({ type: "object", required: ["requestId", "instruction"], properties: {
          requestId: { type: "string", pattern: "^[a-zA-Z0-9-]{1,100}$", description: "相同运行中或成功请求编号返回原状态，不重复改写" },
          instruction: { type: "string", minLength: 1, maxLength: 3000, example: "保留文案和商品，将背景改为森林绿，排版更加简洁" },
          outputs: { type: "array", items: { anyOf: [detailPageSchema, { type: "object", additionalProperties: true }] } },
          outputPlan: outputPlanSchema, strategy: strategySchema,
          materials: { type: "array", items: materialSchema }, analysisPatch: { type: "object", additionalProperties: true },
          quality: { type: "string", enum: ["标准", "高清"] },
        } }),
        responses: { 202: jsonResponse("改写已开始，图片尚未生成", publicJobSchema), ...errorResponses },
      },
    },
    "/api/jobs/{jobId}/compile/retry": {
      post: {
        tags: ["Generation"], summary: "重试失败或中断的整套生图指令编写",
        description: "详情页 v2 或已使用提示词改写的任务，且 compilation.status=failed 可调用。无请求体，沿用冻结方案和 revision，不读取左侧新草稿。编写成功后自动继续生图。",
        parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 202: jsonResponse("重新编写已排队", publicJobSchema), ...errorResponses },
      },
    },
    "/api/feedback": {
      post: {
        tags: ["Feedback"], summary: "保存本机意见反馈，不消耗生图额度",
        description: "现有本地会话 + Origin/CSRF 校验，不依赖云端账号。重复 requestId 去重；截图最多三张，每张 5 MB，实际 PNG/JPEG/WebP 最多 2000 万像素。关联任务须属于当前会话，无公开反馈列表或管理接口。",
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: {
            type: "object", required: ["requestId", "type", "message"],
            properties: {
              requestId: {type:"string",format:"uuid"},
              type: {type:"string",enum:["continuity","material","image","interface","suggestion","other"]},
              message: {type:"string",minLength:1,maxLength:3000}, rating: {type:"integer",minimum:1,maximum:5},
              jobId: {type:"string",format:"uuid"}, pageId: {type:"string"},
              screenshots: {type:"array",maxItems:3,items:{type:"string",format:"binary"}},
            },
          } } },
        },
        responses: {
          201: jsonResponse("反馈已保存",{type:"object",properties:{id:{type:"string"},replayed:{type:"boolean"},message:{type:"string"}}}),
          200: jsonResponse("重复提交复用结果",{type:"object"}), ...errorResponses,
        },
      },
    },
    "/api/feedback/{id}/screenshots/{index}": {get:{tags:["Feedback"],summary:"读取当前会话自己的反馈截图",parameters:[{name:"id",in:"path",required:true,schema:{type:"string",format:"uuid"}},{name:"index",in:"path",required:true,schema:{type:"integer",minimum:0,maximum:2}}],responses:{200:{description:"去除元数据的截图",content:{"image/jpeg":{schema:{type:"string",format:"binary"}}}},...errorResponses}}},
    "/api/jobs/{jobId}/materials/{referenceId}/crop-preview": {get:{tags:["Generation"],summary:"读取本任务框选预览",description:"按任务归属校验，转正原图方向后生成最长边 1600 的 JPEG；X-Source-Width/Height 表示转正后的原图尺寸。",parameters:[{name:"jobId",in:"path",required:true,schema:{type:"string",format:"uuid"}},{name:"referenceId",in:"path",required:true,schema:{type:"string"}}],responses:{200:{description:"框选预览",content:{"image/jpeg":{schema:{type:"string",format:"binary"}}}},...errorResponses}}},
    "/api/jobs/{jobId}/materials/{referenceId}/thumbnail": {
      get: {
        tags: ["Generation"], summary: "读取本任务参考图缩略图",
        description: "仅按任务内素材编号读取，返回最长边不超过 480 像素的 JPEG；不接受本地路径。不存在或过期返回 404。",
        parameters: [
          { name: "jobId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "referenceId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "参考缩略图", content: { "image/jpeg": { schema: { type: "string", format: "binary" } } } }, ...errorResponses },
      },
    },
    "/api/jobs/{jobId}/items/{index}/retry": {
      post: {
        tags: ["Generation"],
        summary: "只重试某一张失败图片",
        description: "仅 failed/interrupted 图片可重试。v2 复用冻结版本中已编写的指令和参考图顺序，不重新策划或编写；编写未完成时返回 409。",
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
                required: ["imageId", "prompt", "requestId"],
                properties: {
                  requestId: {type:"string",format:"uuid",description:"网络重试保持相同编号及内容"},
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
};
for(const route of ['/api/config','/api/config/models','/api/config/test','/api/diagnostics']) delete spec.paths[route];
spec.info.description += ' 使用独立浏览器的 HttpOnly 本地会话；写接口要求精确 Origin 和 X-Pintu-CSRF，内网部署需先解锁访问口令。模型密钥仅在后端配置。';
spec.security = [{LocalSession: []}];
spec.components.securitySchemes = {LocalSession: {type:'apiKey', in:'cookie', name:'pintu_local_session'}};
spec.paths['/api/health'].get.security = [];
spec.paths['/api/session'] = {get: {tags:['System'], summary:'创建或续期本地浏览器会话', security:[], responses:{200:jsonResponse('本地会话状态',{type:'object',properties:{authenticated:{type:'boolean'},accessRequired:{type:'boolean'},ownerId:{type:'string'},csrfToken:{type:'string'},expiresAt:{type:'string'}}}),...errorResponses}}};
spec.paths['/api/session/unlock'] = {post: {tags:['System'], summary:'使用部署者的访问口令解锁当前浏览器', requestBody:jsonBody({type:'object',additionalProperties:false,required:['accessCode'],properties:{accessCode:{type:'string'}}}), responses:{200:jsonResponse('已解锁会话',{type:'object',additionalProperties:true}),...errorResponses}}};
for (const operations of Object.values(spec.paths)) for (const [method,operation] of Object.entries(operations)) if (method === 'post') operation.parameters = [...(operation.parameters || []), {name:'X-Pintu-CSRF',in:'header',required:true,schema:{type:'string'},description:'来自 /api/session，仅保存在客户端内存。'}];
const retry = spec.paths['/api/jobs/{jobId}/items/{index}/retry'].post;
retry.requestBody = jsonBody({type:'object',required:['requestId'],additionalProperties:false,properties:{requestId:{type:'string',description:'同一次明确重试及网络重发始终复用该编号。'}}});
retry.parameters.push({name:'Idempotency-Key',in:'header',schema:{type:'string'},description:'提供时须与 body.requestId 相同。'});

return spec;
};

const endpointRows = [
  ["POST", "/api/briefs", "创建需求问答与素材快照"],
  ["GET", "/api/briefs/{id}", "恢复需求会话与识别状态"],
  ["POST", "/api/briefs/{id}/analyze", "先识别商品，再整理需求问题"],
  ["POST", "/api/briefs/{id}/messages", "回答问题，整理确认摘要"],
  ["POST", "/api/jobs/analyze", "上传素材或使用问答，返回整套提案和逐屏脚本"],
  ["POST", "/api/jobs/{jobId}/compile/retry", "重试失败的指令编写，沿用冻结方案"],
  ["GET", "/api/jobs/{jobId}/materials/{referenceId}/thumbnail", "查看本任务参考素材缩略图"],
  ["POST", "/api/jobs/{jobId}/generate", "确认方案，创建逐张生成队列"],
  ["POST", "/api/jobs/{jobId}/prompts/rewrite", "只改写画面提示词，不生图"],
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
      <p>本地服务提供素材问答、详情页整套策划、逐屏脚本确认、独立生图指令编写、图片队列和精修。默认使用服务器已登录的生成服务，浏览器不保存模型凭证。</p>
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
        <p>先识别上传商品，再询问真正缺失的特点。详情页先策划整套，再确认每屏文案、画面和参考图；可在确认前只改写画面指令，满意后再开始图片生成。</p>
        <pre>1. POST /api/jobs/analyze
2. POST /api/jobs/{jobId}/generate
3. GET  /api/jobs/{jobId}
4. POST /api/jobs/{jobId}/refine
5. GET  /api/download/{jobId}/{filename}</pre>
      </section>
      <section class="card">
        <h2>详情页 v2</h2>
        <p><code>workflowVersion=2</code> 使用整套策略与稳定页面编号。推荐 8–10 屏，可确认 1–12 屏。每屏通常选 1–3 张参考图，最多 6 张；不展示商品的页面使用零张参考图。</p>
        <p>提交完整 <code>outputs</code>、<code>strategy</code> 和素材用途后冻结版本。<code>compilation</code> 显示编写进度，失败用专用接口重试；单张图片重试复用已有指令。成图文字、参数与商品细节仍需用户检查。</p>
      </section>
      <section class="card">
        <h2>只改写，不生图</h2>
        <p>六种生成模式均支持 <code>POST /api/jobs/{jobId}/prompts/rewrite</code>。轮询 <code>promptRevision</code> 查看画面指令的新版本，标题、事实、商品呈现方式和参考图保持固定。改写成功后仍需点击确认生成。</p>
        <p>确认时可携带 <code>promptRevisionId</code>。方案未变化则复用改写结果，不再重复编写；文案或素材变化时按当前确认方案重编写，避免使用过期内容。</p>
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
