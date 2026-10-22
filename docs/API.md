# 品图 AI API

品图通用版通过后端 Pi/Codex CLI 或 OpenAI 兼容 Responses、Images 接口执行分析、策划、生成和精修。模型凭据只在服务器配置，不提供通用文字代理 API。

启动后访问 `/api`、`/api/docs` 或 `/api/openapi.json`。默认地址 `http://localhost:5176`。

## 本地会话与执行

先 `GET /api/session` 建立 HttpOnly、SameSite=Strict 的浏览器会话并取得 `csrfToken`。响应包含 `authenticated`、`accessRequired`、`ownerId`、`expiresAt`、`engine`。默认本机免口令；内网部署需在后端设置口令哈希和精确 Origin，然后 `POST /api/session/unlock`，JSON 为 `{ "accessCode": "部署者设置的口令" }`。口令不写入 URL 或浏览器存储。

私有接口带会话 Cookie；写接口同时携带匹配的 `Origin` 和 `X-Pintu-CSRF`。无会话返回 401，未解锁或 CSRF 错误返回 403，其他浏览器资源返回 404。`/api/config*` 和 `/api/diagnostics` 不提供网页访问。会话有效期滚动延长至 30 天，服务重启保持归属；清除 Cookie 不会自动认领旧作品。

每张图片在本地 SQLite 持久保存请求、参数摘要及引擎编号，事务取得派发权后才调用模型。状态为 `CREATED → DISPATCHING → DONE | FAILED | UNCERTAIN`。`execution.pending` 和 `ENGINE_RESULT_UNKNOWN` 表示结果待核对，只查询原任务，不重跑。确认执行器退出后独立新任务可以执行；原未知动作依然禁止重试。API 未提供原任务查询能力时，不能把超时解释为失败。

单张重试 `POST /api/jobs/{jobId}/items/{index}/retry` 必须带 JSON `{ "requestId": "本次动作的唯一编号" }`；可同时携带相同 `Idempotency-Key`。迟到重发、网络重试及重启后重放复用原编号，返回原状态；明确的新重试才使用新编号。精修 multipart 使用 UUID `requestId`，相同编号内容变更返回 409。只有已明确失败且无输出的动作允许用户重试。

## 详情页 v2 调用流程

1. 可选：`POST /api/briefs` 上传素材，再调用 `POST /api/briefs/{id}/analyze`。先识别商品特点与缺失信息，再用 `POST /api/briefs/{id}/messages` 澄清需求，确认摘要。
2. `POST /api/jobs/analyze` 直接上传素材，或传入 `briefId` 与摘要，获取整套策略和逐屏脚本。
3. 用户确认页面顺序、文案、画面安排与各屏参考图；可先调用 `POST /api/jobs/{jobId}/prompts/rewrite` 仅调整画面指令，满意后调用 `POST /api/jobs/{jobId}/generate`。
4. 服务端冻结确认版本，独立编写整套生图指令。全部页面校验成功后才开始逐张生成；轮询 `GET /api/jobs/{jobId}` 查看进度。
5. 编写失败：`POST /api/jobs/{jobId}/compile/retry`。图片已明确失败且无输出：`POST /api/jobs/{jobId}/items/{index}/retry`；未知结果不允许重跑。两者均使用已确认版本，不读取左侧新草稿。
6. 图片完成后可调用精修或下载接口。

新建 `mode=detail` 任务返回 `workflowVersion: 2`。完整详情页默认推荐 8–10 屏，资料不足时精简，用户可确认 1–12 屏。旧任务和其他生成模式维持 v1 行为，不强制迁移。

## 素材与需求问答

`POST /api/briefs` 和直接上传的分析请求使用 multipart 字段 `images`，支持 PNG/JPEG/WebP/PDF/DOC/DOCX/TXT/MD/CSV/JSON。最多 6 个文件，每个 10MB，合计最多提取 12 张参考图；直接图片优先。解析范围及文字示意提示通过 `warnings` 或 `analysis.warnings` 返回。

问答创建时保存原始文件、解析后的参考图、文字和来源清单。后续问答与分析复用稳定的 `referenceId`、`sourceId`、PDF 页码和 Word 图片序号，同名文件不会合并。来源编号是定位依据，不代表内容已经完成外部事实核验。

| 接口 | 请求与行为 |
| --- | --- |
| `POST /api/briefs` | multipart：`images`、`mode`、`platform`、`language`、`ratio`、`requirements`；保存独立快照，返回会话，不立即策划 |
| `GET /api/briefs/{id}` | 返回会话、`phase / productProfile / pendingMessage / error` 和原有字段；过期返回 404 |
| `POST /api/briefs/{id}/analyze` | 无请求体，先识别再提问；返回 202，通过 GET 轮询，失败可再次调用恢复 |
| `POST /api/briefs/{id}/messages` | JSON：`requestId`、`message`；每轮最多三个问题，回答最多 4000 字；请求编号为 1–80 位字母、数字或连字符 |
| `POST /api/jobs/analyze` | multipart 直接上传，或 JSON：`briefId`、可选 `summary`、可选 UUID `submissionId` |

成功问答按 `requestId` 去重；同一会话并发返回 409，失败可沿用原编号重试。分析的 `submissionId` 用于去重：已完成返回原任务，仍在分析返回 409。分析接口等待方案完成后返回 201，并非创建后台分析轮询任务。

商品识别与提问分两步执行。`phase` 为 `created / analyzing / questioning / awaiting_answer / ready / failed`。`productProfile` 包含 `product / category / features / confirmedFacts / unknowns / sources`，图片不能证明的材质等级、性能或承诺应列为待确认。该结果是模型对资料的整理，仍需用户核对。

识别成功先持久化再提问，提问失败不需要重新识别。`pendingMessage` 保存尚未成功处理的 `{ requestId, text }`，刷新、失败或重启后可恢复；成功后清空。已有完整识别与首轮问题的会话重复调用 `/analyze` 会复用结果，进行中再次调用返回 409。回答接口等待本轮整理完成后返回，期间 GET 仍可显示当前阶段。

从问答生成方案时使用会话保存的模式、平台、语言和比例；`summary` 是用户确认后的需求。跳过问答也可以直接上传分析。会话与右侧图片任务分别保存，沿用现有过期清理策略。

## 任务与逐屏字段

公开任务新增以下 v2 字段，同时保留 `id / status / config / analysis / generationItems / results`：

| 字段 | 内容 |
| --- | --- |
| `workflowVersion` | v2 为 `2`，旧任务及其他模式为 `1` |
| `config` | 任务配置；生成提交后按确认版本使用 |
| `analysis.strategy` | `audience`（人群）、`purchaseReason`（购买理由）、`readingFlow`（阅读顺序）；均为字符串 |
| `analysis.suiteStyle` | 整套品牌配色、文字风格与信息层级 |
| `analysis.pages` | 策划页面，稳定编号字段为 `id` |
| `analysis.outputs` | 确认和生图清单，同时提供稳定 `pageId`；调整顺序时保留原编号 |
| `materials` | 可用素材的公开清单，不包含本地文件路径 |
| `compilation` | 未提交时为 `null`；提交后含 `status / revision / pages / error` |
| `promptRevision` | 仅改写画面指令的状态及成功版本；未改写时为 `null` |

`analysis.outputs[]` 的 v2 确认字段：

- `pageId`：稳定页面编号，不可重复；新增页面使用新编号，不能以数组下标代替。服务端也兼容 `id`。
- `buyerQuestion`：本屏回答的购买问题，最多 500 字。
- `title / subtitle / body`：画面文案，分别最多 240 / 500 / 3000 字；允许为空，纯视觉方案默认全部为空。
- `facts`：用户确认的事实及依据，最多 20 条，每条最多 1000 字。
- `creativeRole / description`：页面作用、画面说明，分别最多 240 / 1000 字。
- `prompt`：可选补充画面要求，最多 3000 字；它不是已经编写好的最终生图指令。
- `visual`：`presence` 为 `full`（完整商品）、`detail`（局部特写）、`none`（不展示商品）；另有 `background / composition / shot`。
- `referenceIds`：有序参考图编号，通常 1–3 张，最多 6 张。第一张为主要参考。`none` 仅允许 `material` 独立材质样片或 `style` 风格参考；其他形式在任务有可用图片时至少选择一张。仅文字任务可为空。

素材 `materials[]` 包含 `referenceId / sourceId / sourceName / sourceKind / ordinal / role / description / variant / thumbnailUrl`。`sourceKind` 为 `upload`、`pdf_page` 或 `docx_image`；`ordinal` 对应来源页码或图片序号。`role` 可选 `primary / back / detail / specification / style / variant / other`，用户可纠正用途、说明和款式。

`GET /api/jobs/{jobId}/materials/{referenceId}/thumbnail` 返回最长边不超过 480 像素的 JPEG。接口只接受本任务编号，不接受本地路径；错误编号、过期或无法读取返回 404。跨任务编号、重复引用、超过上限或不符合商品呈现方式的引用，在提交时返回 400，不自动替换为第一张图片。

## 示例：上传并策划详情页

```js
const form = new FormData();
for (const file of fileInput.files) form.append("images", file);
form.append("mode", "detail");
form.append("platform", "淘宝 / 天猫");
form.append("language", "中文（简体）");
form.append("ratio", "3:4 竖版");
form.append("requirements", "先展示使用场景，再说明真实材质与做工；资料不足的内容省略");
form.append("submissionId", crypto.randomUUID());
const response = await fetch("/api/jobs/analyze", { method: "POST", body: form });
const job = await response.json();
if (!response.ok) throw new Error(job.error?.message);
```

从已有问答创建时，改用 JSON `{ briefId: brief.id, summary: confirmedSummary, submissionId: crypto.randomUUID() }`。

## 示例：确认整套并生成

v2 客户端确认时应发送完整的 `outputs`；仅提交数量或旧 `outputPlan` 不会更新新版逐屏脚本，省略 `outputs` 会使用原方案。`strategy` 和素材用途可使用返回值，或用户确认的修改值：

```js
const response = await fetch(`/api/jobs/${job.id}/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    outputs: job.analysis.outputs.map(page => ({
      pageId: page.pageId,
      buyerQuestion: page.buyerQuestion,
      title: page.title, subtitle: page.subtitle, body: page.body,
      facts: page.facts,
      creativeRole: page.creativeRole, description: page.description,
      prompt: page.prompt || "",
      visual: page.visual,
      referenceIds: page.referenceIds,
    })),
    strategy: job.analysis.strategy,
    materials: job.materials.map(({ referenceId, role, description, variant }) => ({
      referenceId, role, description, variant,
    })),
    analysisPatch: { language: job.config.language },
    quality: "标准",
  }),
});
const queuedJob = await response.json();
if (!response.ok) throw new Error(queuedJob.error?.message);
```

接口快速返回 202。服务端保存确认内容和 `revision`，随后进行独立指令编写，不增加首屏审批。相同任务已有冻结方案后再调用 `/generate` 返回 409，请使用失败项对应的重试接口；新需求需新建分析任务。

v1 任务仍兼容 `outputPlan`、旧 `outputs` 和 `analysisPatch`。不要把新详情页脚本发送给 v1 任务，也不要丢弃 v2 的页面编号、文案与参考字段。

## 只改写画面提示词，不生成图片

`POST /api/jobs/{jobId}/prompts/rewrite` 支持 `main / detail / sku / logo / style / retouch` 六种模式。仅 `awaiting_confirmation` 且尚未提交生成的任务可用。请求沿用 `/generate` 的当前 `outputs / outputPlan / analysisPatch`，v2 同时传 `strategy / materials`，再加：

- `requestId`：1–100 位字母、数字或连字符，标识本次改写。相同运行中或成功请求编号返回现有状态，不重复调用。
- `instruction`：最多 3000 字，例如“保留文案和商品，将背景改为森林绿，排版更加简洁”。

接口返回 202，随后轮询 `GET /api/jobs/{jobId}` 的 `promptRevision`。本操作只进行一次文字指令改写，不调用图片生成，也不会自动开始整套任务。

```js
// confirmedSubmission 为上一节的完整确认对象，可先编辑文案、参考图和策略。
const rewriteRequestId = crypto.randomUUID();
const rewriting = await fetch(`/api/jobs/${job.id}/prompts/rewrite`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ...confirmedSubmission,
    requestId: rewriteRequestId,
    instruction: "保留所有文案与商品细节，背景改为森林绿，构图更有留白",
  }),
}).then(response => response.json());
// 轮询任务，直到 promptRevision.status 为 completed 或 failed。
```

`promptRevision` 包含 `requestId / instruction / status / revision / sourceRevision / pages / appliedRequestId / error`。`status` 为 `running / completed / failed`；`pages` 保存 `{ pageId, prompt, visual }`，其中 `prompt` 是已附固定文案和引用约束的完整生图指令。`sourceRevision` 对应改写前的确认草稿，`revision` 对应成功后的版本；这些是服务端版本标识，客户端不自行计算。

可以修改背景、光线、构图、镜头、视觉风格和文字位置；不允许在这一入口修改已确认文案、事实、页数顺序、商品呈现方式、参考图及顺序。冲突要求会异步得到 `status=failed`、`error.code=PROMPT_REWRITE_REJECTED` 和具体修改建议，请到原方案相应字段修改后再确认。

连续改写会参考上一成功版本的画面安排。失败保留原方案及上一成功指令，`appliedRequestId` 指向仍可使用的成功版本（没有则为 `null`）。失败可再次提交请求；同一任务改写并发、改写中开始生图、已提交生成后改写均返回 409。服务重启中断的改写标为失败，不自动生成图片。

用户决定生图时，在完整确认对象中加入可选的 `promptRevisionId: current.promptRevision.appliedRequestId`。提交内容与成功改写版本相符时直接复用指令，不再重复编写。若文案、参考图、参数或其他确认内容改变，则先按新快照重新编写，避免套用旧指令。指定已经过期的版本编号返回 400；不传编号时使用当前有效的成功版本（如有）。

## 编写状态、轮询与重试

`compilation.status`：

| 状态 | 含义 |
| --- | --- |
| `pending` | 确认方案已冻结，等待编写 |
| `running` | 正在独立编写整套指令 |
| `completed` | 所有页面通过数量、编号、引用校验；`pages` 保存 `{ pageId, prompt }` |
| `failed` | 编写失败或服务重启中断；保留冻结方案，尚未开始本轮生图 |

编写调用失败或内容校验失败不会回退简略提示词直接生图。`POST /api/jobs/{jobId}/compile/retry` 无请求体，允许编写失败或中断的 v2 任务，以及已使用提示词改写的其他模式任务调用；使用原冻结方案、素材顺序和 `revision`，成功后自动继续整套生成。

```js
const current = await fetch(`/api/jobs/${job.id}`).then(response => response.json());
if (current.compilation?.status === "failed") {
  console.log("显示重新编写按钮", current.compilation.error?.message);
} else {
  console.log(current.stage, current.progress);
  for (const item of current.generationItems) {
    console.log(item.index, item.pageId, item.title, item.status, item.progressLabel);
  }
}
```

图片 `generationItems[].status` 为 `queued / generating / retrying / completed / failed / interrupted`。自动图片重试和 `POST /api/jobs/{jobId}/items/{index}/retry` 复用该冻结版本的编译指令及参考图顺序，不重新策划或编写。索引从 0 开始，仅 `failed / interrupted` 可手动重试；当前仍有图片生成或编写未完成时返回 409。

服务重启后，未完成的图片标为 `interrupted`，已完成图片保留。编写阶段中断则标为编写失败，使用专用接口恢复。两种情况均需明确重试，不会在服务启动时自动重复生成。

## 精修与下载

```js
const form = new FormData();
form.append("imageId", result.id);
form.append("versionId", String(result.version || 0));
form.append("prompt", "背景换成浅米色，保持现有文字和商品细节");
// 可选：form.append("mask", maskPngBlob, "mask.png");
const refined = await fetch(`/api/jobs/${job.id}/refine`, {
  method: "POST", body: form,
}).then(response => response.json());
```

精修沿用当前结果图和可选蒙版，不重新附加原始整套素材。原图与历史版本保留。下载使用 `GET /api/download/{jobId}/{filename}`。

## 运行状态与内容检查

`GET /api/generation-service` 返回 `{ provider, ready, error, pending }`。`ready` 表示服务登录状态，`pending` 是当前生成调用数量，不能保证每次出图成功；更新服务前还应检查 `/api/diagnostics` 的活动任务和 `activeWorkers`，调用之间 `pending` 可能暂时为零。

提示词要求商品出现时保持可见外观，局部页允许真实细节裁切，无商品页不强制添加完整商品。确认文案由服务端原样加入指令；模型仍可能误画商品、文字或参数，发布前需要人工检查。事实数组和用户确认并不等于外部认证、检测或自动事实核验。

`/api/config` 及子路径在所有模式均返回 403；模型配置仅从服务器环境变量读取。`.env`、`runtime/`、真实凭证及 `node_modules/` 不应提交到仓库。

## 详情页设计规范、材质与裁切

确认或提示词改写请求可增加 `designSystem`（palette、typography、titlePlacement、spacing、components、decorations、lightMood，均为 1–600 字字符串），`materialCoverage`（name、part、evidence、enabled、pageIds）及每屏 `referenceCrops`。启用的材质项必须关联本方案页面。设计规范、材质任务和裁切进入版本摘要及冻结快照；旧任务不带这些字段时保持原行为。

`referenceCrops` 为参考编号到 `{x,y,width,height}` 的映射，基于 EXIF 转正后的原图，数值归一化为 0–1；必须正面积、不越界并属于该屏参考图。读取 `/api/jobs/{jobId}/materials/{referenceId}/crop-preview` 获取最长边 1600 的框选预览及转正原图尺寸响应头。服务器按原图实际裁切，缓存按裁切摘要隔离。

无商品页有合法材质/风格参考时使用图像编辑入口；无参考时仍用文字生成。材质样片不是实物检测或等级证明；真实商品局部使用 `detail` 呈现。所有实际出图仍经过本地执行账本。

## 本机意见反馈

`POST /api/feedback` 使用 multipart/form-data：必填 `requestId`（UUID）、`type`、`message`（1–3000 字）；选填 `rating`（1–5）、`jobId`、`pageId` 和 `screenshots`。类型为 continuity / material / image / interface / suggestion / other。最多三张 PNG/JPEG/WebP，每张 5 MB、2000 万像素以内，保存时移除元数据。

仅要求现有有效本地会话和 Origin / X-Pintu-CSRF 校验，不依赖云端账号。同一会话相同请求 ID 与相同内容返回原记录；不同内容返回 409。每天最多提交 20 条（UTC）。关联任务及页面须属于当前会话。`GET /api/feedback/{id}/screenshots/{index}` 只读取当前会话自己的附件，其他用户或不存在返回 404。没有公开反馈列表、管理员接口或额外账号系统。管理方式见 FEEDBACK.md。
