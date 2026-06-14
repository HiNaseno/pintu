# 接任 AI 工作说明

更新时间：2026-06-14
项目名：品图 AI
项目定位：面向国内电商商家的 AI 商品视觉生成与对话精修工具。

## 先读这几条

1. 这个项目现在不是纯静态页，必须通过 Node 服务启动。不要直接用 `file://` 打开工作台调试真实 AI。
2. 当前核心页面是 `china-full.html` 首页和 `china-workflow.html` 工作台。
3. 默认安全交接包不包含真实 API 密钥；如果使用 `private-with-env` 私用包，`.env` 已随包迁移，只能在用户自己的电脑之间传递。
4. 如果改了 `.env`、模型名、服务端提示词或接口逻辑，必须重启 `node server.js`，否则浏览器仍然连着旧进程。
5. 当前产品最重要的红线：严格保留用户上传商品的真实模样，不能把 AI 风格、纹样、文字、贴纸、Logo 或材质效果画到商品本体上。

## 启动方式

```bash
npm install
npm start
```

访问：

```text
http://localhost:5176/china-full.html
http://localhost:5176/china-workflow.html
```

如果 `npm run dev` 出现 `EMFILE`，优先用：

```bash
node server.js
```

macOS 常驻服务脚本：

```bash
npm run service:install
npm run service:status
npm run service:uninstall
```

## 环境变量

从模板创建：

```bash
cp .env.example .env
```

当前推荐配置：

```text
OPENAI_BASE_URL=https://api.worldai.loan/v1
OPENAI_TEXT_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_PREVIEW_IMAGE_MODEL=gpt-image-1-mini
PORT=5176
```

注意：

- 不要使用带日期的模型快照，当前已切换为不带日期别名。
- `.env` 和 `AI API.rtf` 含真实密钥，不要提交、不要在聊天里打印。只有用户明确要求在自己电脑间迁移时，才可以使用包含 `.env` 的私用压缩包。
- 如果页面报 `AI 网关额度不足` 或原始 `429 You exceeded your current quota`，这是 API Key 对应账号额度/套餐问题，不是前端坏了，也不是普通超时。

## 主要文件

```text
server.js                Node/Express 服务、AI 调用、队列、下载、精修接口
china-workflow.html      AI 生成工作台结构
china-workflow.css       工作台与修图工作室样式
china-workflow.js        工作台交互、上传、分析、生成轮询、精修
china-full.html/css/js   首页
china-examples.*         案例页
assets/                  首页与案例素材
service/                 macOS launchctl 服务脚本
test/api-flow.test.js    本地模拟网关测试，不消耗真实 API
.env.example             环境变量模板
```

运行时目录：

```text
runtime/jobs/            本地任务 JSON
runtime/generated/       本地生成图片
runtime/logs/jobs.log    任务与错误日志
```

`runtime/` 是运行缓存，不随交接包移动。新电脑启动后会自动重新创建。

## 当前后端状态

- 后端已改成本地可靠队列。
- `/api/jobs/:jobId/generate` 只创建队列并立即返回 `202`，不再等待整批图片生成完成。
- 每张图片都是独立 `generationItem`，状态包括 `queued / generating / completed / failed / retrying / interrupted`。
- 单张失败不会拖垮整单，后续图片会继续生成。
- 失败图片可以通过 `POST /api/jobs/:jobId/items/:index/retry` 单独重试。
- 诊断接口：`GET /api/diagnostics`。
- 下载、对话精修、版本保留仍复用原有接口。

## 当前前端状态

- 初始页走轻量输入：上传图、选择主图/详情页/SKU、平台、语言、比例、需求。
- 点击后先进入 AI 推荐生成方案确认页，用户确认或调整后再开始真实生图。
- 生成中会先展示队列卡片，完成一张显示一张。
- 结果页可以进入统一修图工作室。
- 修图工作室现在是三栏：左侧作品队列，中间图片画布，右侧 AI 对话。
- 用户可以不圈选直接描述修改；圈选只是局部修改辅助。

## 商品真实性红线

后端已经增加 `productLockDirective`，但仍然要持续检查效果。接任 AI 如果继续调提示词，请坚持：

- 商品轮廓、比例、结构、材质、真实颜色、包装形状必须保留。
- 封口、拉链、孔位、挂绳、配件位置必须保留。
- 商品已有品牌识别和原有印刷内容必须保留。
- 不得在商品表面新增或替换图案、纹样、贴纸、Logo、文字、商标、插画、装饰边框或材质效果。
- 国风、山水、云纹、科技感、生活方式等风格只能作用于商品外部：背景、台面、道具、标题区、信息卡片、光影、留白和版式。
- 商品本体应该像从原图中真实保留下来的实拍产品，不是重新设计的新包装。

## 已知问题

1. 第三方图片通道可能超时或 429 额度不足。429 要检查 API Key 额度，不要盲目改前端。
2. 图片模型对商品主体保护不是百分百可靠，提示词只能降低风险；后续最好接入真实商品分割/蒙版保护。
3. 详情页多屏可以逐屏生成，但商业质量仍需要持续优化提示词和参考样式。
4. 当前没有登录、支付、额度、数据库、对象存储和正式任务队列。
5. 本地 `runtime/` 不适合作为生产存储。
6. `node --watch` 可能因文件过多触发 `EMFILE`。

## 测试方式

修改后至少运行：

```bash
node --check server.js
node --check china-workflow.js
git diff --check
npm test
```

`npm test` 使用模拟 AI 网关，不会消耗真实额度。

如果需要验证真实模型，请用公开、非敏感商品图，先小批量测试：

1. 主图 1-2 张。
2. SKU 1-2 张。
3. 对话精修 1 次。

不要一上来生成 8-12 张详情页，否则很容易遇到通道等待时间或额度问题。

## 交接包说明

交接压缩包应包含源码、素材、配置模板、测试和服务脚本。

默认安全交接压缩包不应包含：

- `.env`
- `AI API.rtf`
- `node_modules/`
- `runtime/`
- `.git/`
- `.DS_Store`
- 历史 zip 包

如果用户明确说明是在自己的电脑之间迁移，可以另做一个私用包包含 `.env`。这个包不要上传网盘公开链接、不要发给陌生人，也不要提交到 Git。

新电脑拿到压缩包后：

```bash
unzip pintu-ai-handoff-*.zip
cd "Three-dimensional square"
npm install
# 安全包需要 cp .env.example .env 并填写 OPENAI_API_KEY
# private-with-env 私用包通常已包含 .env，可直接检查后启动
npm start
```

## 建议下一步

1. 先稳定真实生图质量，不要继续堆 UI。
2. 用 3-5 个真实常用品类建立“电商创意角色库”：引流主图、场景种草、材质特写、卖点说明、SKU 展示。
3. 接入商品主体分割或保真编辑能力，减少商品细节被改动。
4. 增加任务取消、费用预估、额度预扣和生成失败退款逻辑。
5. 把本地任务 JSON 和图片迁移到数据库与对象存储。
6. 做正式用户系统、套餐系统和内容审核。

## 给下一位 AI 的一句话

请先阅读 `NEXT_AI_HANDOFF.md`、`.env.example`、`server.js`、`china-workflow.js` 和 `china-workflow.css`。这个项目最核心的目标不是“做漂亮图”，而是“严格保留真实商品，同时生成能上架、能转化的电商视觉素材”。不要把商品本体重新设计掉。
