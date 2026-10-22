import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import sharp from "sharp";
import { ExecutionStore } from "../execution/store.js";

const APP_PORT = 5191;
const MOCK_PORT = 5192;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}/v1`;
const TEST_RUNTIME_ROOT = path.join(os.tmpdir(), `pintu-ai-test-runtime-${process.pid}`);
const LEGACY_JOB_ID = '11111111-1111-4111-8111-111111111111';
const LEGACY_CANDIDATE_JOB_ID = '44444444-4444-4444-8444-444444444444';
const LEGACY_FROZEN_RETRY_JOB_ID = '55555555-5555-4555-8555-555555555555';
const MISSING_LEDGER_RETRY_JOB_ID = '66666666-6666-4666-8666-666666666666';
const MISSING_RESULT_RETRY_JOB_ID = '77777777-7777-4777-8777-777777777777';
const LEGACY_FROZEN_COMPILE_JOB_ID = '88888888-8888-4888-8888-888888888888';
const INTERRUPTED_JOB_ID = '22222222-2222-4222-8222-222222222222';
const INTERRUPTED_REWRITE_ID = '33333333-3333-4333-8333-333333333333';
const PNG_BUFFER = await sharp({
  create: {
    width: 32,
    height: 32,
    channels: 4,
    background: { r: 90, g: 210, b: 190, alpha: 1 },
  },
})
  .png()
  .toBuffer();
const PNG_BASE64 = PNG_BUFFER.toString("base64");
const CAMERA_JPEG_BUFFER = await sharp({
  create: {
    width: 2400,
    height: 1600,
    channels: 3,
    background: { r: 232, g: 224, b: 208 },
  },
})
  .jpeg({ quality: 96 })
  .toBuffer();

let mockServer;
let appProcess;
let localStore;
let browserSession;
let mainBrowserSession;
let appOutput = "";
const encryptionKey = crypto.randomBytes(32);
const rawFetch = globalThis.fetch;
// Only the local app receives browser credentials; engine and cloud simulator calls stay separate.
const fetch = (input, options = {}) => {
  if (new URL(input instanceof Request ? input.url : input).origin !== APP_URL || !browserSession) return rawFetch(input, options);
  const headers = new Headers(options.headers || {});
  if (!headers.has('Cookie')) headers.set('Cookie', browserSession.cookie);
  if (!headers.has('Origin')) headers.set('Origin', APP_URL);
  if (!headers.has('X-Pintu-CSRF')) headers.set('X-Pintu-CSRF', browserSession.csrf);
  return rawFetch(input, { ...options, headers });
};
const createBrowserSession = () => {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(32).toString('base64url');
  const session = localStore.createSession({ ownerId: crypto.randomUUID(), cookieDigest: crypto.createHash('sha256').update(token).digest('hex'), csrf,
    expiresAt: Date.now() + 86400000 });
  return { ...session, cookie: `pintu_local_session=${token}`, csrf };
};
const stopApp = async () => {
  if (!appProcess || appProcess.exitCode !== null) return;
  const child = appProcess;
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 2000))]);
  if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited; }
};
const startApp = async () => {
  appProcess = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(), env: { ...process.env,
      NODE_ENV: 'test', PORT: String(APP_PORT), HOST: '127.0.0.1', AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'test-key', OPENAI_BASE_URL: MOCK_URL,
      OPENAI_TEXT_MODEL: 'gpt-5.5', OPENAI_IMAGE_MODEL: 'gpt-image-2', OPENAI_PREVIEW_IMAGE_MODEL: 'gpt-image-1-mini',
      GENERATED_FILE_TTL_HOURS: '1', PINTU_RUNTIME_ROOT: TEST_RUNTIME_ROOT,
      IMAGE_GENERATION_MAX_ATTEMPTS: '2', IMAGE_GENERATION_RETRY_DELAY_MS: '10',
      PINTU_ALLOWED_ORIGINS: APP_URL, PINTU_ENCRYPTION_KEY: encryptionKey.toString('base64'),
      PINTU_ENGINE_MODE: 'real', HOME: TEST_RUNTIME_ROOT, CODEX_HOME: path.join(TEST_RUNTIME_ROOT,'codex-profile'),
    }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const capture = chunk => { appOutput = (appOutput + chunk.toString()).slice(-12000); };
  appProcess.stdout.on('data', capture); appProcess.stderr.on('data', capture);
  await waitFor(async () => {
    if (appProcess.exitCode !== null) throw new Error(`Test server stopped: ${appOutput}`);
    const response = await fetch(`${APP_URL}/api/health`); return (await response.json()).ok;
  }).catch(error => { throw new Error(`${error.message}\n${appOutput}`); });
};
const restartApp = async () => { await stopApp(); await startApp(); };
let lastEditRequestBody = "";
let lastEditRequestText = "";
let lastResponsesPayload = null;
const responseRequests = [];
const imageRequests = [];
let compilationFailures = 0;
let imageFailures = 0;
let imageFailureMessage = 'invalid image file or mode';
let imageFailureStatus=400;
const responseFailures = new Map();
const responseGates = new Map();
const productProfilePayload = {product:'不锈钢保温杯',category:'饮水器具',features:['银色杯身（来源：上传商品图）'],confirmedFacts:['容量 500ml（来源：商品文档）'],unknowns:['主要使用人群待确认']};

const requestText = body => body.input.flatMap(message => message.content || []).filter(part => part.type === 'input_text').map(part => part.text).join('\n');
const markedJson = (text, marker) => JSON.parse(text.split(marker)[1].split('\n')[0]);
const makeDetailPlan = body => {
  const input = requestText(body);
  const materials = markedJson(input, '下列清单与随后图片一一对应：');
  const refs = materials.map(material => material.referenceId);
  const pageCount = input.includes('TEST_DETAIL_SUITE_3') ? 3 : 1;
  const pages = Array.from({length: pageCount}, (_, index) => ({
    buyerQuestion: ['这款商品适合谁？', '材质和做工如何？', '选购前需要知道什么？'][index],
    title: ['商品主视觉', '真实材质细节', '商品信息说明'][index],
    subtitle: '已确认的商品资料', body: `第 ${index + 1} 屏正文`,
    facts: ['仅使用用户已提供的商品资料'],
    creativeRole: ['首屏吸引', '材质特写', '信息说明'][index],
    description: ['简洁主视觉海报', '真实材料局部特写', '无商品信息排版'][index],
    visual: {
      presence: index === 2 ? 'none' : index === 1 ? 'detail' : 'full',
      background: ['浅绿摄影背景', '暖白材质底', '深绿信息底'][index],
      composition: ['大幅主视觉', '微距错位布局', '规格信息卡片'][index],
      shot: ['中景', '微距', '平面'][index],
    },
    referenceIds: index === 2 ? [] : index === 1 ? refs.slice(0, 2).reverse() : refs.slice(0, 2),
  }));
  return {
    product: '测试商品', sellingPoints: ['真实商品资料'], visualDirection: '清爽可信', suiteStyle: '绿色和暖白配色，清晰文字层级',
    strategy: {audience: '重视品质的买家', purchaseReason: '理解材质与用途后选购', readingFlow: '先认识商品，再看细节，最后阅读选购信息'},
    styleSuggestions: ['清爽', '简约', '质感'].map(name => ({name, description: `${name}电商风格`, promptHint: `${name}配色与字体`})),
    materialRoles: materials.map((material,index) => ({referenceId: material.referenceId, role: index ? 'detail' : 'primary', variant: '', description: index ? '商品细节参考' : '商品全貌参考'})),
    protectionRules: ['保留可见商品的真实外观'], warnings: [], pages,
  };
};

const multipartParts = (body, contentType) => {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType || '');
  assert.ok(boundary, 'image edit request must use multipart/form-data');
  return body.toString('latin1').split(`--${boundary[1] || boundary[2]}`).slice(1, -1).map(part => {
    const offset = part.indexOf('\r\n\r\n');
    const headers = part.slice(0, offset);
    return {name: /name="([^"]+)"/.exec(headers)?.[1], filename: /filename="([^"]+)"/.exec(headers)?.[1], buffer: Buffer.from(part.slice(offset + 4, -2), 'latin1')};
  });
};

const analysisPayload = {
  product: "测试商品",
  sellingPoints: ["结构清晰", "适合电商展示"],
  visualDirection: "清爽、可信、突出真实商品主体",
  protectionRules: ["保持商品轮廓", "保持真实材质", "保持真实颜色", "保留品牌标识"],
  outputs: [
    {
      type: "商品主图",
      title: "测试生成结果",
      description: "真实 API 结果占位",
      prompt: "保留真实商品主体，生成清爽的中国电商商品图。",
    },
  ],
  warnings: [],
};
const assistWritingPayload = {
  suggestion:
    "保持商品轮廓、结构、材质、真实颜色、包装和品牌标识不变，使用干净留白与柔和自然光突出主体，画面不得新增文字、数字、Logo、标签、角标或水印，商品原有印刷内容保持不变。",
};

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
};

const readBody = (request) =>
  new Promise((resolve) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
  });

const waitFor = async (check, timeoutMs = 10_000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await check();
      if (value) return value;
    } catch {
      // The child server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for condition");
};

const preparePersistedFixtures = async () => {
  for (const id of [LEGACY_JOB_ID, LEGACY_CANDIDATE_JOB_ID, LEGACY_FROZEN_RETRY_JOB_ID, LEGACY_FROZEN_COMPILE_JOB_ID, MISSING_LEDGER_RETRY_JOB_ID, MISSING_RESULT_RETRY_JOB_ID, INTERRUPTED_JOB_ID, INTERRUPTED_REWRITE_ID]) localStore.bindResource('job', id, mainBrowserSession.ownerId);
  const now=new Date().toISOString();
  const fields={mode:'detail',platform:'淘宝 / 天猫',language:'中文（简体）',ratio:'1:1 正方形',quality:'自动',generationCount:'单张预览',requirements:'保留旧方案'};
  const legacyDir=path.join(TEST_RUNTIME_ROOT,'jobs',LEGACY_JOB_ID);
  await fs.mkdir(legacyDir,{recursive:true});
  const inputPath=path.join(legacyDir,'input-1.png');
  await fs.writeFile(inputPath,PNG_BUFFER);
  await fs.writeFile(path.join(legacyDir,'job.json'),JSON.stringify({id:LEGACY_JOB_ID,status:'awaiting_confirmation',fields,inputs:[{path:inputPath,originalname:'legacy.png',mimetype:'image/png'}],analysis:analysisPayload,results:[],error:null,createdAt:now,updatedAt:now}));
  const candidateDir=path.join(TEST_RUNTIME_ROOT,'jobs',LEGACY_CANDIDATE_JOB_ID);
  await fs.mkdir(candidateDir,{recursive:true});
  const candidateInputs=await Promise.all(['front','variants'].map(async(referenceId,index)=>{
    const filename=path.join(candidateDir,`input-${index+1}.png`);await fs.writeFile(filename,PNG_BUFFER);
    return {path:filename,referenceId,originalname:`${referenceId}.png`,sourceName:`${referenceId}.png`,mimetype:'image/png'};
  }));
  const oldCandidate={requestId:'legacy-single-reference',instruction:'背景改为浅蓝色',pages:[{pageId:'legacy-main',prompt:'已冻结：仅参考第1张正面图。',visual:{presence:'full',background:'浅蓝色',composition:'居中',shot:'平视'}}],sourceRevision:'old-source',revision:'old-revision'};
  await fs.writeFile(path.join(candidateDir,'job.json'),JSON.stringify({id:LEGACY_CANDIDATE_JOB_ID,workflowVersion:1,status:'awaiting_confirmation',fields:{...fields,mode:'main'},inputs:candidateInputs,analysis:{...analysisPayload,outputs:[{...analysisPayload.outputs[0],pageId:'legacy-main'}]},promptCandidate:oldCandidate,promptRevision:{status:'completed',...oldCandidate,appliedRequestId:oldCandidate.requestId},results:[],error:null,createdAt:now,updatedAt:now}));
  for(const id of [LEGACY_FROZEN_RETRY_JOB_ID,LEGACY_FROZEN_COMPILE_JOB_ID,MISSING_LEDGER_RETRY_JOB_ID,MISSING_RESULT_RETRY_JOB_ID]) {
    const dir=path.join(TEST_RUNTIME_ROOT,'jobs',id);await fs.mkdir(dir,{recursive:true});
    const actionKey=`generate:${id}:0:0`;
    const item={index:0,status:'failed',attempts:1,retrySerial:0,actionKey:actionKey};
    if(id===MISSING_LEDGER_RETRY_JOB_ID)item.operationId=crypto.randomUUID();
    if(id===MISSING_RESULT_RETRY_JOB_ID) {
      const {operation}=localStore.createOperation({sessionId:mainBrowserSession.id,ownerId:mainBrowserSession.ownerId,actionKey,params:{jobId:id},workHash:'a'.repeat(64),imageCount:1});
      localStore.compareAndSetOperation(operation.id,'CREATED',{state:'DISPATCHING',engineTaskId:crypto.randomUUID()});
      localStore.updateOperation(operation.id,{state:'DONE',result:{terminal:true,completedCount:1,files:['missing-test-result.png']}});
      item.operationId=operation.id;
    }
    await fs.writeFile(path.join(dir,'job.json'),JSON.stringify({id,workflowVersion:1,status:'failed',fields:{...fields,mode:'main'},inputs:candidateInputs,analysis:{...analysisPayload,outputs:[{...analysisPayload.outputs[0],pageId:'legacy-main'}]},generationItems:[item],results:[],error:null,createdAt:now,updatedAt:now,
      ...([LEGACY_FROZEN_RETRY_JOB_ID,LEGACY_FROZEN_COMPILE_JOB_ID].includes(id)?{useCompiledPrompts:true,promptCandidate:oldCandidate,submittedSnapshot:{revision:'old-revision',pages:[]},compilation:{status:id===LEGACY_FROZEN_COMPILE_JOB_ID?'failed':'completed',revision:'old-revision',pages:oldCandidate.pages}}:{})}));
  }
  const interruptedDir=path.join(TEST_RUNTIME_ROOT,'jobs',INTERRUPTED_JOB_ID);
  await fs.mkdir(interruptedDir,{recursive:true});
  const page={id:'restored-page',buyerQuestion:'如何阅读已提供资料？',title:'重启后保留的标题',subtitle:'资料信息',body:'已确认正文',facts:['来自用户资料'],creativeRole:'信息说明',description:'不展示商品的图文信息页',visual:{presence:'none',background:'暖白',composition:'信息卡片',shot:'平面'},referenceIds:[]};
  const strategy={audience:'买家',purchaseReason:'了解信息',readingFlow:'一页读懂资料'};
  const snapshot={revision:'persisted-test-revision',fields,strategy,pages:[page],materials:[],suiteStyle:'绿色和暖白',selectedStyle:null,product:'测试商品'};
  await fs.writeFile(path.join(interruptedDir,'job.json'),JSON.stringify({
    id:INTERRUPTED_JOB_ID,workflowVersion:2,status:'generating',fields,inputs:[],materialText:'已确认资料',results:[],error:null,
    analysis:{...analysisPayload,suiteStyle:snapshot.suiteStyle,strategy,pages:[page],outputs:[{...page,pageId:page.id,type:'详情页',planType:'detail',prompt:page.description}]},
    submittedSnapshot:snapshot,compilation:{status:'running',revision:snapshot.revision,pages:[],error:null},createdAt:now,updatedAt:now,
  }));
  const rewriteDir=path.join(TEST_RUNTIME_ROOT,'jobs',INTERRUPTED_REWRITE_ID);
  await fs.mkdir(rewriteDir,{recursive:true});
  const candidate={requestId:'prior-rewrite',instruction:'使用浅蓝色',pages:[{pageId:`${INTERRUPTED_REWRITE_ID}-page-1`,prompt:'保留已完成的浅蓝色画面指令',visual:{presence:'full',background:'浅蓝色',composition:'居中',shot:'中景'}}]};
  await fs.writeFile(path.join(rewriteDir,'job.json'),JSON.stringify({id:INTERRUPTED_REWRITE_ID,status:'awaiting_confirmation',fields:{...fields,mode:'main'},inputs:[],analysis:analysisPayload,results:[],error:null,
    promptCandidate:candidate,promptRevision:{status:'running',requestId:'interrupted-rewrite',instruction:'调整光线',pages:candidate.pages,appliedRequestId:candidate.requestId,error:null},createdAt:now,updatedAt:now}));
};

before(async () => {
  localStore = new ExecutionStore({ dbPath: path.join(TEST_RUNTIME_ROOT, 'execution', 'tasks.sqlite'), encryptionKey });
  mainBrowserSession = browserSession = createBrowserSession('api-flow-main');
  mockServer = http.createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/v1/models") {
      json(response, 200, {
        object: "list",
        data: [
          { id: "gpt-5.5", object: "model" },
          { id: "gpt-image-2", object: "model" },
          { id: "gpt-image-1-mini", object: "model" },
        ],
      });
      return;
    }

    if (request.method === "POST" && request.url === "/v1/responses") {
      const body = JSON.parse((await readBody(request)).toString("utf8"));
      lastResponsesPayload = body;
      const schema = body.text?.format?.name;
      responseRequests.push({schema, body});
      const serialized = JSON.stringify(body);
      let output = schema === 'product_profile' ? productProfilePayload
        : schema === 'prompt_rewrite' ? {
          allowed:!requestText(body).includes('TEST_REJECT_FIXED_CONTENT'),
          reason:requestText(body).includes('TEST_REJECT_FIXED_CONTENT')?'请在原方案修改商品颜色后重新确认。':'',
          pages:requestText(body).includes('TEST_REJECT_FIXED_CONTENT')?[]:markedJson(requestText(body),'已确认页面：').map(page=>({pageId:page.pageId,prompt:`改写后的画面：${requestText(body).split('本轮改写要求：')[1].split('\n')[0]}；重新安排光线与文字布局。`,visual:{background:'改写后的浅蓝背景',composition:'左图右文',shot:'侧面中景'}})),
        }
        : schema === 'detail_suite_plan' ? makeDetailPlan(body)
        : schema === 'detail_prompt_compilation' ? {pages: markedJson(requestText(body), '已确认逐屏脚本：').map(page => ({pageId: page.id, prompt: `独立编写的画面指令：${page.description}；标题在上部，正文在下部，保留本屏的布局和参考用途。`, referenceIds: page.referenceIds}))}
        : schema === "edit_safety"
        ? { allowed: true, reason: "允许修改外部视觉", safePrompt: "只修改圈选背景，保持商品主体不变。" }
        : serialized.includes("电商视觉需求访谈助手")
          ? {reply:"请确认材质",summary:"已确认商品用途，材质待确认",questions:[{question:"材质是什么？",options:["不确定","不锈钢"]}],ready:false}
        : serialized.includes("电商生图要求撰写助手")
          ? assistWritingPayload
          : analysisPayload;
      if (schema === 'detail_prompt_compilation' && compilationFailures > 0) {
        compilationFailures--;
        output = {pages: []};
      }
      if ((responseFailures.get(schema)||0)>0) {responseFailures.set(schema,responseFailures.get(schema)-1);output={};}
      if (responseGates.has(schema)) await responseGates.get(schema).promise;
      json(response, 200, {
        id: "resp_test",
        object: "response",
        status: "completed",
        output: [
          {
            id: "msg_test",
            type: "message",
            status: "completed",
            role: "assistant",
            content: [{ type: "output_text", text: JSON.stringify(output), annotations: [] }],
          },
        ],
      });
      return;
    }

    if (
      request.method === "POST" &&
      (request.url === "/v1/images/edits" || request.url === "/v1/images/generations")
    ) {
      const body = await readBody(request);
      if (request.url === "/v1/images/edits") {
        lastEditRequestBody = body.toString("latin1");
        lastEditRequestText = body.toString("utf8");
      }
      const parts = request.url === '/v1/images/edits' ? multipartParts(body, request.headers['content-type']) : [];
      const payload = parts.length ? null : JSON.parse(body.toString('utf8'));
      imageRequests.push({
        kind: parts.length ? 'edit' : 'generate',
        prompt: parts.find(part => part.name === 'prompt')?.buffer.toString('utf8') || payload?.prompt,
        attachments: parts.filter(part => part.filename && /^image(?:\[\])?$/.test(part.name)),
      });
      if (imageFailures > 0) {
        imageFailures--;
        json(response, imageFailureStatus, {error: {message: imageFailureMessage}});
        return;
      }
      json(response, 200, { created: Math.floor(Date.now() / 1000), data: [{ b64_json: PNG_BASE64 }] });
      return;
    }

    json(response, 404, { error: { message: "not found" } });
  });

  await new Promise((resolve) => mockServer.listen(MOCK_PORT, "127.0.0.1", resolve));
  await preparePersistedFixtures();
  await startApp();
});

after(async () => {
  await stopApp();
  mockServer?.closeAllConnections?.();
  await new Promise((resolve) => mockServer?.close(resolve));
  localStore?.close();
  await fs.rm(TEST_RUNTIME_ROOT, { recursive: true, force: true });
});

const analyze = async (
  mode,
  image = PNG_BUFFER,
  type = "image/png",
  name = "product.png",
  quality = "自动",
  language = "中文（简体）"
) => {
  const form = new FormData();
  form.set("images", new Blob([image], { type }), name);
  form.set("mode", mode);
  form.set("platform", "淘宝 / 天猫");
  form.set("requirements", "保持商品真实，使用清爽背景");
  form.set("language", language);
  form.set("ratio", "1:1 正方形");
  form.set("quality", quality);
  form.set("generationCount", "单张预览");
  const response = await fetch(`${APP_URL}/api/jobs/analyze`, { method: "POST", body: form });
  const payload = await response.json();
  assert.equal(response.status, 201, JSON.stringify(payload));
  return payload;
};

const generate = async (job, overrides = {}) => {
  const response = await fetch(`${APP_URL}/api/jobs/${job.id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outputs: job.analysis.outputs, ...overrides }),
  });
  assert.equal(response.status, 202);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await fetch(`${APP_URL}/api/jobs/${job.id}`).then((item) => item.json());
    if (result.status === "failed") {
      assert.fail(result.error?.message || "generation failed");
    }
    if (result.status === "completed") return result;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for generation");
};

const postJson = (route, body = {}) => fetch(`${APP_URL}${route}`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
const fetchJob = id => fetch(`${APP_URL}/api/jobs/${id}`).then(response => response.json());
const waitForJob = (id, status) => waitFor(async () => {
  const job = await fetchJob(id);
  return job.status === status ? job : false;
}, 15000);
const compilationCount = () => responseRequests.filter(request => request.schema === 'detail_prompt_compilation').length;
const responseCount = schema => responseRequests.filter(request => request.schema === schema).length;
const holdResponse = (schema,t) => {
  let release;
  const promise=new Promise(resolve=>{release=resolve;});
  responseGates.set(schema,{promise});
  const done=()=>{responseGates.delete(schema);release();};
  t.after(done);return done;
};
const fetchBrief = id => fetch(`${APP_URL}/api/briefs/${id}`).then(response=>response.json());
const waitBrief = (id,phase) => waitFor(async()=>{const brief=await fetchBrief(id);return brief.phase===phase&&!brief.pending?brief:false;});
const createBrief = async () => {
  const form=new FormData();
  form.append('images',new Blob([PNG_BUFFER],{type:'image/png'}),'product.png');
  form.append('images',new Blob(['Capacity: 500ml. Material: stainless steel.'],{type:'text/plain'}),'product.txt');
  form.set('mode','detail');
  const response=await fetch(`${APP_URL}/api/briefs`,{method:'POST',body:form});
  const brief=await response.json();assert.equal(response.status,201,JSON.stringify(brief));return brief;
};
const waitRewrite = (id,status='completed') => waitFor(async()=>{const job=await fetchJob(id);return job.promptRevision?.status===status?job:false;});
const rewrite = async (job,requestId,instruction='背景改为浅蓝色，光线更柔和',overrides={}) => {
  const response=await postJson(`/api/jobs/${job.id}/prompts/rewrite`,{outputs:job.analysis.outputs,requestId,instruction,...overrides});
  const body=await response.json();assert.equal(response.status,202,JSON.stringify(body));return waitRewrite(job.id);
};

const analyzeDetailSuite = async ({count = 3, briefId} = {}) => {
  let response;
  if (briefId) response = await postJson('/api/jobs/analyze', {briefId, summary: 'TEST_DETAIL_SUITE_3，保持真实商品，逐屏区分内容'});
  else {
    const form = new FormData();
    const red = await sharp({create:{width:32,height:32,channels:3,background:{r:210,g:40,b:30}}}).png().toBuffer();
    form.append('images', new Blob([PNG_BUFFER],{type:'image/png'}), 'same.png');
    form.append('images', new Blob([red],{type:'image/png'}), 'same.png');
    form.set('mode','detail'); form.set('language','中文（简体）'); form.set('ratio','1:1 正方形');
    form.set('requirements', count === 3 ? 'TEST_DETAIL_SUITE_3，保持真实商品' : '只要一屏，保持真实商品');
    response = await fetch(`${APP_URL}/api/jobs/analyze`,{method:'POST',body:form});
  }
  const job = await response.json();
  assert.equal(response.status,201,JSON.stringify(job));
  return job;
};

test("health reports configured text and image models", async () => {
  const health = await fetch(`${APP_URL}/api/health`).then((response) => response.json());
  assert.equal(health.ok, true);
  assert.equal(health.models.text.id, "gpt-5.5");
  assert.equal(health.models.image.id, "gpt-image-2");
  assert.equal(health.models.previewImage.id, "gpt-image-1-mini");
});

test("secret files are not served", async () => {
  assert.equal((await fetch(`${APP_URL}/AI%20API.rtf`)).status, 404);
  assert.equal((await fetch(`${APP_URL}/.env`)).status, 404);
  assert.equal((await fetch(`${APP_URL}/server.js`)).status, 404);
});

test("AI writing helper uses the text model and returns an editable suggestion", async () => {
  lastResponsesPayload = null;
  const form = new FormData();
  form.set("images", new Blob([CAMERA_JPEG_BUFFER], { type: "image/jpeg" }), "camera-product.jpg");
  form.set("mode", "main");
  form.set("platform", "淘宝 / 天猫");
  form.set("language", "无文字（纯视觉）");
  form.set("ratio", "1:1 正方形");
  form.set("currentText", "清爽白底");
  const response = await fetch(`${APP_URL}/api/assist-writing`, { method: "POST", body: form });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(payload.model, "gpt-5.5");
  assert.equal(payload.usedImages, 1);
  assert.equal(payload.visionFallback, false);
  assert.match(payload.suggestion, /商品轮廓/);
  const inputImage = lastResponsesPayload.input[0].content.find((item) => item.type === "input_image");
  assert.match(inputImage.image_url, /^data:image\/jpeg;base64,/);
  assert.ok(
    inputImage.image_url.length < CAMERA_JPEG_BUFFER.toString("base64").length / 4,
    "writing helper should send a compressed recognition image instead of the camera original"
  );
});

test("all six modes analyze and generate without local fallback results", async () => {
  for (const mode of ["main", "detail", "sku", "logo", "style", "retouch"]) {
    const job = await analyze(mode);
    assert.equal(job.status, "awaiting_confirmation");
    const completed = await generate(job);
    assert.equal(completed.results.length, job.analysis.outputs.length);
    assert.equal(completed.generationItems.length, job.analysis.outputs.length);
    assert.ok(completed.generationItems.every((item) => item.status === "completed"), JSON.stringify({mode,status:completed.status,items:completed.generationItems.map(({index,status})=>({index,status}))}));
    assert.match(completed.results[0].url, new RegExp(`^/generated/${job.id}/`));
    const image = await fetch(`${APP_URL}${completed.results[0].url}`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/png");
  }
});

test("camera JPEG files are normalized to a square RGB PNG before image editing", async () => {
  lastEditRequestBody = "";
  await generate(await analyze("main", CAMERA_JPEG_BUFFER, "image/jpeg", "camera-original.jpg"));
  assert.match(lastEditRequestBody, /filename="input-1-model-640\.png"/);
  assert.match(lastEditRequestBody, /Content-Type: image\/png/i);
  assert.match(lastEditRequestBody, /name="model"\r\n\r\ngpt-image-2/i);
  assert.match(lastEditRequestBody, /name="quality"\r\n\r\nmedium/i);
});

const analyzeLegacyReferences = async () => {
  const form = new FormData();
  const red = await sharp({create:{width:32,height:32,channels:3,background:{r:210,g:40,b:30}}}).png().toBuffer();
  form.append('images',new Blob([PNG_BUFFER],{type:'image/png'}),'car-product.png');
  form.append('images',new Blob([red],{type:'image/png'}),'four-products.png');
  form.append('images',new Blob(['The second image contains the four actual product variants.'],{type:'text/plain'}),'facts.txt');
  form.set('mode','main');form.set('generationCount','单张预览');
  const response = await fetch(`${APP_URL}/api/jobs/analyze`,{method:'POST',body:form});
  const payload = await response.json();
  assert.equal(response.status,201,JSON.stringify(payload));
  return payload;
};
const attachmentColors = request => Promise.all(request.attachments.map(async attachment => {
  const {data,info}=await sharp(attachment.buffer).raw().toBuffer({resolveWithObject:true});
  const offset=(Math.floor(info.height/2)*info.width+Math.floor(info.width/2))*info.channels;
  return [...data.subarray(offset,offset+3)];
}));

test('legacy main second screen receives both uploaded references in upload order and no raw document',async()=>{
  const job = await analyzeLegacyReferences();
  assert.equal(job.workflowVersion,1);
  assert.equal(job.materials.length,2);
  const before = imageRequests.length;
  const outputs = [
    {...job.analysis.outputs[0],title:'车内随手抽',prompt:'使用第一张车内商品照片。'},
    {...job.analysis.outputs[0],pageId:crypto.randomUUID(),title:'四款陈列',prompt:'使用第二张参考图 four-products.png 中的四款真实商品陈列。'},
  ];
  const completed = await generate(job,{outputs,outputPlan:[{type:'main',recommendedCount:2,items:outputs}]});
  assert.equal(completed.results.length,2);
  const requests = imageRequests.slice(before);
  assert.deepEqual(requests.map(request=>[request.kind,request.attachments.length]),[['edit',2],['edit',2]]);
  assert.deepEqual(await attachmentColors(requests[1]),[[90,210,190],[210,40,30]]);
  assert.match(requests[1].prompt,/1\. 来源名称 "car-product.png"/);
  assert.match(requests[1].prompt,/2\. 来源名称 "four-products.png"/);
  assert.match(requests[1].prompt,/先检查全部附件/);
  assert.doesNotMatch(requests[1].prompt,/来源名称 "facts.txt"/);
});

test('legacy main explicit references reach image edits in selected order and invalid selections never dispatch',async()=>{
  const job = await analyzeLegacyReferences();
  const [first,second] = job.materials.map(material=>material.referenceId);
  const before = imageRequests.length;
  const invalid = {...job.analysis.outputs[0],referenceIds:['foreign-reference']};
  const rejected = await postJson(`/api/jobs/${job.id}/generate`,{outputs:[invalid]});
  assert.equal(rejected.status,400);
  assert.equal(imageRequests.length,before);
  const outputs = [
    {...job.analysis.outputs[0],referenceIds:[second],title:'只用第二张'},
    {...job.analysis.outputs[0],pageId:crypto.randomUUID(),referenceIds:[second,first],title:'按选择顺序'},
  ];
  await generate(job,{outputs,outputPlan:[{type:'main',recommendedCount:2,items:outputs}]});
  const requests = imageRequests.slice(before);
  assert.deepEqual(requests.map(request=>request.attachments.length),[1,2]);
  assert.deepEqual(await attachmentColors(requests[0]),[[210,40,30]]);
  assert.deepEqual(await attachmentColors(requests[1]),[[210,40,30],[90,210,190]]);
  assert.match(requests[0].prompt,/1\. 来源名称 "four-products.png"/);
  assert.doesNotMatch(requests[0].prompt,/来源名称 "car-product.png"/);
  const persisted = JSON.parse(await fs.readFile(path.join(TEST_RUNTIME_ROOT,'jobs',job.id,'job.json'),'utf8'));
  assert.deepEqual(persisted.analysis.outputs.map(output=>output.referenceIds),[[second],[second,first]]);
});

test('old frozen main candidates must be explicitly rewritten before multiple references dispatch',async()=>{
  const job = await fetchJob(LEGACY_CANDIDATE_JOB_ID);
  const beforeImages=imageRequests.length,beforeRewrites=responseCount('prompt_rewrite');
  const rejected=await postJson(`/api/jobs/${job.id}/generate`,{outputs:job.analysis.outputs,promptRevisionId:job.promptRevision.requestId});
  assert.equal(rejected.status,400);
  assert.match((await rejected.json()).error.message,/重新编写提示词并确认多张参考图/);
  assert.equal(imageRequests.length,beforeImages);
  assert.equal(responseCount('prompt_rewrite'),beforeRewrites);
  assert.equal((await fetchJob(job.id)).status,'awaiting_confirmation');
  const rewritten=await rewrite(job,'confirm-multiple-references');
  assert.equal(rewritten.promptRevision.referencePolicyVersion,2);
  assert.match(rewritten.promptRevision.pages[0].prompt,/1\. 编号 front/);
  assert.match(rewritten.promptRevision.pages[0].prompt,/2\. 编号 variants/);
  await generate(rewritten,{promptRevisionId:'confirm-multiple-references'});
  assert.equal(imageRequests.length,beforeImages+1);
  assert.equal(imageRequests.at(-1).attachments.length,2);
  assert.equal(imageRequests.at(-1).prompt.replace(/\r\n/g,'\n'),rewritten.promptRevision.pages[0].prompt);
});

test('single-image retry rejects old frozen references, missing ledgers and completed results before dispatch',async()=>{
  const beforeImages=imageRequests.length,beforeRewrite=responseCount('prompt_rewrite');
  for(const [id,code] of [[LEGACY_FROZEN_RETRY_JOB_ID,null],[MISSING_LEDGER_RETRY_JOB_ID,'ENGINE_RESULT_UNKNOWN'],[MISSING_RESULT_RETRY_JOB_ID,'CONFLICT']]) {
    const before=await fetchJob(id),itemBefore=before.generationItems[0];
    const response=await postJson(`/api/jobs/${id}/items/0/retry`,{requestId:crypto.randomUUID()});
    const payload=await response.json();
    assert.equal(response.status,409,JSON.stringify(payload));
    if(code)assert.equal(payload.error.code,code);else assert.match(payload.error.message,/重新编写提示词并确认多张参考图/);
    const after=await fetchJob(id),itemAfter=after.generationItems[0];
    assert.equal(after.status,before.status);
    for(const key of ['status','retrySerial','actionKey','operationId'])assert.equal(itemAfter[key],itemBefore[key],`retry must preserve ${key}`);
  }
  const compile=await postJson(`/api/jobs/${LEGACY_FROZEN_COMPILE_JOB_ID}/compile/retry`);
  const compiledPayload=await compile.json();
  assert.equal(compile.status,409,JSON.stringify(compiledPayload));
  assert.match(compiledPayload.error.message,/重新编写提示词并确认多张参考图/);
  const frozen=await fetchJob(LEGACY_FROZEN_COMPILE_JOB_ID);
  assert.equal(frozen.status,'failed');
  assert.equal(frozen.compilation.status,'failed');
  assert.equal(frozen.compilation.revision,'old-revision');
  assert.equal(imageRequests.length,beforeImages);
  assert.equal(responseCount('prompt_rewrite'),beforeRewrite,'rejected compilation retry must not rewrite or expand frozen references');
});

test("standard output uses GPT Image 2 and enforces the no-text rule", async () => {
  lastEditRequestBody = "";
  lastEditRequestText = "";
  const completed = await generate(
    await analyze(
      "main",
      PNG_BUFFER,
      "image/png",
      "product.png",
      "标准",
      "无文字（纯视觉）"
    )
  );
  assert.match(lastEditRequestBody, /name="model"\r\n\r\ngpt-image-2/i);
  assert.match(lastEditRequestBody, /name="quality"\r\n\r\nmedium/i);
  assert.match(lastEditRequestText, /不新增任何文字、数字、Logo、标签、标题、角标或水印/);
  assert.equal(completed.results[0].model, "gpt-image-2");
  assert.equal(completed.results[0].qualityTier, "标准成品");
  assert.equal(completed.results[0].preview, false);
});

test("generated images download as named attachments", async () => {
  const completed = await generate(await analyze("sku"));
  const result = completed.results[0];
  const imagePath = new URL(result.url, APP_URL).pathname.split("/").filter(Boolean);
  const response = await fetch(
    `${APP_URL}/api/download/${imagePath[1]}/${imagePath[2]}?name=${encodeURIComponent("白色款 SKU 图")}`
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.match(response.headers.get("content-disposition") || "", /attachment/i);
  assert.match(response.headers.get("content-disposition") || "", /UTF-8''/i);
  assert.ok((await response.arrayBuffer()).byteLength > 0);
});

test("refine creates a real new version and preserves the original", async () => {
  const job = await generate(await analyze("main"));
  const result = job.results[0];
  const form = new FormData();
  const requestId = crypto.randomUUID();
  form.set("requestId", requestId);
  form.set("imageId", result.id);
  form.set("versionId", "0");
  form.set("prompt", "只把圈选区域的背景调整得更干净");
  form.set("mask", new Blob([PNG_BUFFER], { type: "image/png" }), "mask.png");
  const imageStart = imageRequests.length;
  const response = await fetch(`${APP_URL}/api/jobs/${job.id}/refine`, { method: "POST", body: form });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.requestId, requestId);
  assert.equal(payload.version.requestId, requestId);
  assert.equal(payload.result.versions.length, 2);
  assert.equal(payload.result.versions[0].label, "原图");
  assert.equal(payload.version.label, "版本 1");
  const replay = await fetch(`${APP_URL}/api/jobs/${job.id}/refine`, { method: "POST", body: form });
  assert.equal(replay.status, 201);
  assert.equal((await replay.json()).version.id, payload.version.id);
  assert.equal(imageRequests.length, imageStart + 1, 'repeating the same refine request must not dispatch a second image');
  form.set('prompt', '同一请求编号不得替换修改内容');
  assert.equal((await fetch(`${APP_URL}/api/jobs/${job.id}/refine`, { method: 'POST', body: form })).status, 409);
  assert.equal(imageRequests.length, imageStart + 1);
});

test('private jobs, briefs, originals, thumbnails and downloads reject another account and uppercase aliases', async () => {
  const job = await generate(await analyzeDetailSuite({ count: 1 }));
  const brief = await createBrief();
  const other = createBrowserSession('api-flow-other-owner');
  const filename = new URL(job.results[0].url, APP_URL).pathname.split('/').at(-1);
  const routes = [
    [`/api/jobs/${job.id}`, `/API/JOBS/${job.id}`],
    [`/api/briefs/${brief.id}`, `/API/BRIEFS/${brief.id}`],
    [job.results[0].url, job.results[0].url.replace('/generated/', '/GENERATED/')],
    [`/api/download/${job.id}/${filename}`, `/API/DOWNLOAD/${job.id}/${filename}`],
    [job.materials[0].thumbnailUrl, job.materials[0].thumbnailUrl.replace('/api/jobs/', '/API/JOBS/')],
  ];
  for (const [route, upper] of routes) {
    assert.equal((await fetch(`${APP_URL}${route}`)).status, 200, `owner may read ${route}`);
    assert.equal((await rawFetch(`${APP_URL}${route}`, { headers: { Cookie: other.cookie } })).status, 404, `different owner may not read ${route}`);
    assert.equal((await rawFetch(`${APP_URL}${route}`)).status, 401, `anonymous read must fail for ${route}`);
    assert.equal((await fetch(`${APP_URL}${upper}`)).status, 404, `uppercase alias must not bypass routing for ${route}`);
    assert.equal((await rawFetch(`${APP_URL}${upper}`, { headers: { Cookie: other.cookie } })).status, 404);
  }
});

test('anonymous generation, refinement, retry and configuration writes cannot reach the engine', async () => {
  const job = await analyze('main');
  const images = imageRequests.length, texts = responseRequests.length;
  const routes = ['/api/jobs/analyze', '/api/briefs', '/api/assist-writing', `/api/jobs/${job.id}/generate`, `/api/jobs/${job.id}/refine`, `/api/jobs/${job.id}/items/0/retry`, `/api/jobs/${job.id}/compile/retry`];
  for (const route of routes) {
    const response = await rawFetch(`${APP_URL}${route}`, { method: 'POST', headers: { Origin: APP_URL, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 401, `anonymous write must fail for ${route}`);
  }
  for (const route of ['/api/config', '/api/config/models', '/api/config/test']) {
    assert.equal((await rawFetch(`${APP_URL}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    assert.equal((await postJson(route)).status, 403, 'regular connected accounts are not server administrators');
  }
  for (const headers of [{ Cookie: browserSession.cookie, Origin: APP_URL }, { Cookie: browserSession.cookie, Origin: 'https://untrusted.invalid', 'X-Pintu-CSRF': browserSession.csrf }]) {
    const response = await rawFetch(`${APP_URL}/api/jobs/${job.id}/generate`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ outputs: job.analysis.outputs }) });
    assert.equal(response.status, 403);
  }
  assert.equal(imageRequests.length, images);
  assert.equal(responseRequests.length, texts);
  assert.ok(imageRequests.every(request => !request.cookie), 'browser credentials must not become model request fields');
});

test("document-only uploads reach analysis and generate without image editing", async () => {
  const form = new FormData();
  form.set("images", new Blob(["Product: steel bottle. Capacity: 500ml."], { type: "text/plain" }), "product.txt");
  form.set("mode", "main");
  form.set("generationCount", "单张预览");
  const response = await fetch(`${APP_URL}/api/jobs/analyze`, { method: "POST", body: form });
  const job = await response.json();
  assert.equal(response.status, 201, JSON.stringify(job));
  assert.match(JSON.stringify(lastResponsesPayload), /Capacity: 500ml/);
  assert.ok(job.analysis.warnings.some(w => w.includes("示意")));
  lastEditRequestBody = "";
  const completed = await generate(job);
  assert.equal(completed.results.length, job.analysis.outputs.length);
  assert.equal(lastEditRequestBody, "");
});

test("DOCX uploads work in writing assistance and corrupt PDFs return 400", async () => {
  const form = new FormData();
  form.set("images", new Blob([await fs.readFile(new URL('./fixtures/product.docx', import.meta.url))], { type: "application/octet-stream" }), "product.docx");
  const response = await fetch(`${APP_URL}/api/assist-writing`, { method: "POST", body: form });
  assert.equal(response.status, 200, await response.text());
  assert.match(JSON.stringify(lastResponsesPayload), /不锈钢/);
  const invalid = new FormData();
  invalid.set("images", new Blob(["fake pdf"], { type: "application/pdf" }), "bad.pdf");
  assert.equal((await fetch(`${APP_URL}/api/jobs/analyze`, { method: "POST", body: invalid })).status, 400);
});

test('brief conversation persists, deduplicates messages and analyzes its own material snapshot', async()=>{
  const form=new FormData();form.set('images',new Blob(['Material: stainless steel. Capacity: 500ml.']),'brief.txt');form.set('mode','detail');form.set('language','English');
  const created=await fetch(`${APP_URL}/api/briefs`,{method:'POST',body:form});assert.equal(created.status,201);
  const brief=await created.json();
  const message={requestId:'turn-1',message:'材质是不锈钢，材质页不放完整商品'};
  const turn=()=>fetch(`${APP_URL}/api/briefs/${brief.id}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(message)}).then(r=>r.json());
  assert.equal((await turn()).messages.length,2);assert.equal((await turn()).messages.length,2);
  const restored=await fetch(`${APP_URL}/api/briefs/${brief.id}`).then(r=>r.json());assert.equal(restored.fields.mode,'detail');assert.equal(restored.questions.length,1);
  const body={briefId:brief.id,summary:'不锈钢保温杯，材质屏无完整商品。',mode:'main',language:'中文（简体）',submissionId:'12345678-1234-1234-1234-123456789abc'};
  const analyzeBrief=()=>fetch(`${APP_URL}/api/jobs/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
  const job=await analyzeBrief();assert.equal(job.config.mode,'detail');assert.equal(job.config.language,'English');assert.equal(job.config.requirements,body.summary);
  assert.match(JSON.stringify(lastResponsesPayload),/stainless steel/);
  assert.equal((await analyzeBrief()).id,job.id);
});
test('no-product output uses image generation and persists presentation for later editing',async()=>{
 const job=await analyze('detail');
 job.analysis.outputs=job.analysis.outputs.map(o=>({...o,referenceIds:[],visual:{presence:'none',background:'浅绿信息底',composition:'材质卡片',shot:'平面'}}));
 const before=lastEditRequestText;
 const completed=await generate(job);
 assert.equal(lastEditRequestText,before);
 assert.equal(completed.results[0].visual.presence,'none');
 const edit=new FormData();edit.set('requestId',crypto.randomUUID());edit.set('imageId',completed.results[0].id);edit.set('prompt','把信息卡片改为浅绿色');
 const response=await fetch(`${APP_URL}/api/jobs/${job.id}/refine`,{method:'POST',body:edit});assert.equal(response.status,201);
 assert.match(JSON.stringify(lastResponsesPayload),/此页没有商品主体/);
 assert.match(lastEditRequestText,/不展示完整商品/);
});

test('detail suite compiles confirmed scripts once, uses ordered references, and preserves exact copy', async () => {
  const job = await analyzeDetailSuite();
  assert.equal(job.workflowVersion,2);
  assert.equal(job.analysis.outputs.length,3);
  assert.equal(job.materials.length,2);
  assert.notEqual(job.materials[0].sourceId,job.materials[1].sourceId,'same file names must not merge sources');
  assert.notEqual(job.materials[0].referenceId,job.materials[1].referenceId);
  assert.ok(job.materials.every(material=>!('path' in material)&&!('buffer' in material)));
  assert.ok(!JSON.stringify(job.materials).includes(TEST_RUNTIME_ROOT));
  for (const material of job.materials) {
    const thumbnail = await fetch(`${APP_URL}${material.thumbnailUrl}`);
    assert.equal(thumbnail.status,200);
    assert.match(thumbnail.headers.get('content-type'),/^image\//);
  }
  const copy = {title:'精确主标题「绿意」',subtitle:'500ml · 原样保留',body:'第一行：材质说明\n第二行：只按已确认资料，不替换！'};
  Object.assign(job.analysis.outputs[0],copy);
  const startImages=imageRequests.length,startCompilations=compilationCount();
  const completed=await generate(job);
  assert.equal(compilationCount(),startCompilations+1);
  assert.equal(completed.compilation.status,'completed');
  const requests=imageRequests.slice(startImages);
  assert.deepEqual(requests.map(request=>request.kind),['edit','edit','generate']);
  assert.deepEqual(requests.map(request=>request.attachments.length),[2,2,0]);
  const imageColors = async request => Promise.all(request.attachments.map(async attachment => {
    const {data,info}=await sharp(attachment.buffer).raw().toBuffer({resolveWithObject:true});
    const start=(Math.floor(info.height/2)*info.width+Math.floor(info.width/2))*info.channels;
    return [...data.subarray(start,start+3)];
  }));
  assert.deepEqual(await imageColors(requests[0]),[[90,210,190],[210,40,30]]);
  assert.deepEqual(await imageColors(requests[1]),[[210,40,30],[90,210,190]]);
  assert.ok(requests[0].prompt.includes(JSON.stringify(copy)),'confirmed copy must remain in its own unmodified JSON block');
  assert.ok(!requests[1].prompt.includes(copy.title),'copy must not leak into neighboring pages');
  assert.match(requests[2].prompt,/不展示商品|不展示完整商品/);
  assert.ok(requests.every(request=>request.prompt.includes('独立编写的画面指令')));
  const persisted=await waitFor(async()=>{
    const saved=JSON.parse(await fs.readFile(path.join(TEST_RUNTIME_ROOT,'jobs',job.id,'job.json'),'utf8'));
    return saved.status==='completed' ? saved : false;
  });
  assert.equal(persisted.workflowVersion,2);
  assert.equal(persisted.submittedSnapshot.pages[0].title,copy.title);
  assert.equal(persisted.submittedSnapshot.pages[0].body,copy.body);
  assert.deepEqual(persisted.submittedSnapshot.pages[1].referenceIds,job.analysis.outputs[1].referenceIds);
  assert.ok(persisted.compilation.pages[0].prompt.includes(JSON.stringify(copy)));
  const restored=await fetchJob(job.id);
  assert.deepEqual(restored.materials.map(material=>material.referenceId),job.materials.map(material=>material.referenceId));
  assert.equal(restored.compilation.revision,completed.compilation.revision);
});

test('detail submissions reject foreign references and duplicate page or reference IDs before compilation', async () => {
  const job=await analyzeDetailSuite();
  const initialCompilations=compilationCount(), initialImages=imageRequests.length;
  const foreign=structuredClone(job.analysis.outputs);
  foreign[0].referenceIds=['ffffffff-ffff-ffff-ffff-ffffffffffff'];
  const duplicatePage=structuredClone(job.analysis.outputs);
  duplicatePage[1].id=duplicatePage[0].id;
  duplicatePage[1].pageId=duplicatePage[0].pageId;
  const duplicateReference=structuredClone(job.analysis.outputs);
  duplicateReference[0].referenceIds=[job.materials[0].referenceId,job.materials[0].referenceId];
  for(const outputs of [foreign,duplicatePage,duplicateReference]) {
    const response=await postJson(`/api/jobs/${job.id}/generate`,{outputs});
    assert.equal(response.status,400,await response.text());
    assert.equal((await fetchJob(job.id)).status,'awaiting_confirmation');
  }
  assert.equal(compilationCount(),initialCompilations);
  assert.equal(imageRequests.length,initialImages);
});

test('uncropped close-up requests using only whole-product photos fail before compilation or dispatch and accept a confirmed crop',async()=>{
  const job=await analyzeDetailSuite({count:1});
  const primary=job.materials.find(material=>material.role==='primary');
  assert.ok(primary);
  const outputs=structuredClone(job.analysis.outputs);
  outputs[0].visual={...outputs[0].visual,presence:'detail',shot:'真实局部特写'};
  outputs[0].referenceIds=[primary.referenceId];
  outputs[0].referenceCrops={};
  const before={compilations:compilationCount(),images:imageRequests.length};
  const response=await postJson(`/api/jobs/${job.id}/generate`,{outputs});
  const error=await response.json();
  assert.equal(response.status,400,JSON.stringify(error));
  assert.equal(error.error.code,'DETAIL_CROP_REQUIRED');
  assert.match(error.error.message,/框选.*局部|局部.*框选/);
  const rejected=await fetchJob(job.id);
  assert.equal(rejected.status,'awaiting_confirmation');
  assert.equal(rejected.compilation,null);
  assert.equal(rejected.analysis.outputs[0].visual.presence,'full','rejected details must not replace the editable draft');
  assert.equal(compilationCount(),before.compilations);
  assert.equal(imageRequests.length,before.images);

  outputs[0].referenceCrops={[primary.referenceId]:{x:.1,y:.1,width:.5,height:.5}};
  const completed=await generate(job,{outputs});
  assert.equal(completed.status,'completed');
  assert.equal(completed.results.length,1);
  assert.equal(compilationCount(),before.compilations+1);
  assert.equal(imageRequests.length,before.images+1);
  const image=imageRequests.at(-1);
  assert.equal(image.kind,'edit');
  assert.equal(image.attachments.length,1);
  assert.match(image.attachments[0].filename,/-crop-[a-f0-9]{16}\.png$/);
  assert.deepEqual(completed.analysis.outputs[0].referenceCrops,outputs[0].referenceCrops);
});

test('selected dedicated detail photos are ready without cropping whole-product photos',async()=>{
  const job=await analyzeDetailSuite({count:1});
  const detail=job.materials.find(material=>material.role==='detail');
  assert.ok(detail);
  const outputs=structuredClone(job.analysis.outputs);
  outputs[0].visual={...outputs[0].visual,presence:'detail',shot:'已提供的真实细节照片'};
  outputs[0].referenceIds=[detail.referenceId];outputs[0].referenceCrops={};
  const before=imageRequests.length;
  const completed=await generate(job,{outputs});
  assert.equal(completed.status,'completed');
  assert.equal(imageRequests.length,before+1);
  const image=imageRequests.at(-1);
  assert.equal(image.kind,'edit');
  assert.equal(image.attachments.length,1);
  assert.doesNotMatch(image.attachments[0].filename,/-crop-/);
  assert.deepEqual(await attachmentColors(image),[[210,40,30]]);
});

test('ten detail screens run as independent durable sequential operations and preserve ten confirmed images', async () => {
  const job = await analyzeDetailSuite();
  const outputs = Array.from({ length: 10 }, (_, index) => {
    const output = structuredClone(job.analysis.outputs[index % 3]);
    const pageId = crypto.randomUUID();
    return { ...output, id: pageId, pageId, title: `${output.title} · 第 ${index + 1} 屏` };
  });
  const images = imageRequests.length;
  const completed = await generate(job, { outputs });
  assert.equal(completed.results.length, 10);
  assert.deepEqual(completed.results.map(result => result.pageId), outputs.map(output => output.pageId));
  assert.equal(imageRequests.length, images + 10);
  const operations=localStore.listOperations({ownerId:browserSession.ownerId}).filter(operation=>operation.params.jobId===job.id);
  assert.equal(operations.length,10);
  assert.ok(operations.every(operation=>operation.state==='DONE'&&operation.result.completedCount===1&&operation.dispatchClaimedAt));

});

test('detail confirmation accepts page additions, removals, reordering and edited strategy or reference roles', async () => {
  const job=await analyzeDetailSuite();
  const added={...structuredClone(job.analysis.outputs[0]),id:'added-page',pageId:'added-page',title:'补充选购说明',buyerQuestion:'还有什么信息值得了解？'};
  const outputs=[job.analysis.outputs[2],job.analysis.outputs[0],added];
  const strategy={audience:'已确认人群',purchaseReason:'已确认购买理由',readingFlow:'先信息后商品，再补充说明'};
  const materials=job.materials.map(material=>({...material,role:'detail',description:'用户校正的参考用途',variant:'已确认款式'}));
  const start=imageRequests.length;
  const response=await postJson(`/api/jobs/${job.id}/generate`,{outputs,strategy,materials});
  assert.equal(response.status,202,await response.text());
  const completed=await waitForJob(job.id,'completed');
  assert.deepEqual(completed.analysis.outputs.map(output=>output.pageId),outputs.map(output=>output.pageId));
  assert.deepEqual(completed.analysis.strategy,strategy);
  assert.ok(completed.materials.every(material=>material.role==='detail'&&material.description==='用户校正的参考用途'&&material.variant==='已确认款式'));
  const images=imageRequests.slice(start);
  assert.deepEqual(images.map(image=>image.kind),['generate','edit','edit']);
  assert.match(images[1].prompt,/用户校正的参考用途/);
  assert.match(images[2].prompt,/补充选购说明/);
});

test('compilation failure creates no images and its dedicated retry reuses the frozen scripts', async t => {
  const job=await analyzeDetailSuite({count:1});
  const initialImages=imageRequests.length,initialCompilations=compilationCount();
  const title='编写失败仍应保留的标题';
  job.analysis.outputs[0].title=title;
  compilationFailures=1;t.after(()=>{compilationFailures=0;});
  const submitted=await postJson(`/api/jobs/${job.id}/generate`,{outputs:job.analysis.outputs});
  assert.equal(submitted.status,202,await submitted.text());
  const failed=await waitForJob(job.id,'failed');
  assert.equal(failed.compilation.status,'failed');
  assert.equal(imageRequests.length,initialImages,'failed compilation must never fall back to direct image generation');
  assert.equal(compilationCount(),initialCompilations+1);
  const retried=await postJson(`/api/jobs/${job.id}/compile/retry`);
  assert.equal(retried.status,202,await retried.text());
  const completed=await waitForJob(job.id,'completed');
  assert.equal(completed.compilation.status,'completed');
  assert.equal(compilationCount(),initialCompilations+2);
  assert.equal(imageRequests.length,initialImages+1);
  assert.ok(imageRequests.at(-1).prompt.includes(title));
  const snapshots=responseRequests.filter(request=>request.schema==='detail_prompt_compilation').slice(-2).map(request=>markedJson(requestText(request.body),'已确认逐屏脚本：'));
  assert.deepEqual(snapshots[0],snapshots[1]);
});

test('brief document references survive conversation and reuse the same IDs for detail planning', async () => {
  const form=new FormData();
  form.append('images',new Blob([PNG_BUFFER],{type:'image/png'}),'same.png');
  form.append('images',new Blob([await fs.readFile(new URL('./fixtures/product.pdf',import.meta.url))],{type:'application/pdf'}),'product.pdf');
  form.set('mode','detail');
  const response=await fetch(`${APP_URL}/api/briefs`,{method:'POST',body:form});
  const brief=await response.json();
  assert.equal(response.status,201,JSON.stringify(brief));
  const file=path.join(TEST_RUNTIME_ROOT,'briefs',brief.id,'brief.json');
  const before=JSON.parse(await fs.readFile(file,'utf8'));
  const cachedIds=before.materials.images.map(image=>image.referenceId);
  const message=await postJson(`/api/briefs/${brief.id}/messages`,{requestId:'stable-materials',message:'材质页用细节，资料中已提供容量'});
  assert.equal(message.status,200,await message.text());
  const job=await analyzeDetailSuite({briefId:brief.id});
  assert.deepEqual(job.materials.map(material=>material.referenceId),cachedIds);
  assert.deepEqual(job.materials.map(material=>material.sourceKind),['upload','pdf_page']);
  assert.equal(job.materials[1].ordinal,1);
  const after=JSON.parse(await fs.readFile(file,'utf8'));
  assert.deepEqual(after.materials.images.map(image=>image.referenceId),cachedIds);
  const publicBrief=await fetch(`${APP_URL}/api/briefs/${brief.id}`).then(response=>response.json());
  assert.ok(!JSON.stringify(publicBrief).includes(TEST_RUNTIME_ROOT));
  assert.ok(!JSON.stringify(publicBrief).includes('reference-'));
});

test('persisted legacy detail jobs keep their original single-reference generation flow', async () => {
  const job=await fetchJob(LEGACY_JOB_ID);
  assert.equal(job.workflowVersion,1);
  assert.equal(job.status,'awaiting_confirmation');
  const beforeCompiles=compilationCount(),beforeImages=imageRequests.length;
  const completed=await generate(job);
  assert.equal(completed.results.length,1);
  assert.equal(compilationCount(),beforeCompiles);
  assert.equal(imageRequests.length,beforeImages+1);
  assert.equal(imageRequests.at(-1).attachments.length,1);
  assert.equal(completed.compilation,null);
});

test('a persisted interrupted compilation restores its frozen scripts and retries explicitly', async () => {
  const job=await fetchJob(INTERRUPTED_JOB_ID);
  assert.equal(job.status,'failed');
  assert.equal(job.compilation.status,'failed');
  assert.equal(job.error.code,'SERVER_RESTARTED');
  assert.equal(job.analysis.outputs[0].title,'重启后保留的标题');
  const beforeCompiles=compilationCount(),beforeImages=imageRequests.length;
  const response=await postJson(`/api/jobs/${job.id}/compile/retry`);
  assert.equal(response.status,202,await response.text());
  const completed=await waitForJob(job.id,'completed');
  assert.equal(completed.compilation.revision,'persisted-test-revision');
  assert.equal(compilationCount(),beforeCompiles+1);
  assert.equal(imageRequests.length,beforeImages+1);
  assert.equal(imageRequests.at(-1).kind,'generate');
  assert.match(imageRequests.at(-1).prompt,/重启后保留的标题/);
});

test('brief analysis returns 202, exposes recognized facts before questioning, and preserves them across polling',async t=>{
  const brief=await createBrief();assert.equal(brief.phase,'created');assert.equal(brief.productProfile,null);
  const releaseProfile=holdResponse('product_profile',t),releaseQuestions=holdResponse('requirement_brief',t);
  const start=responseRequests.length;
  const response=await postJson(`/api/briefs/${brief.id}/analyze`);
  assert.equal(response.status,202);const pending=await response.json();assert.equal(pending.pending,true);assert.equal(pending.phase,'analyzing');
  await waitFor(()=>responseRequests.slice(start).some(request=>request.schema==='product_profile'));
  assert.equal(responseRequests.slice(start).some(request=>request.schema==='requirement_brief'),false);
  const conflicting=await postJson(`/api/briefs/${brief.id}/analyze`);assert.equal(conflicting.status,409);
  releaseProfile();
  await waitFor(()=>responseRequests.slice(start).some(request=>request.schema==='requirement_brief'));
  const questioning=await fetchBrief(brief.id);
  assert.equal(questioning.phase,'questioning');assert.equal(questioning.pending,true);assert.equal(questioning.productProfile.product,'不锈钢保温杯');
  assert.equal(questioning.messages.length,0);
  const asked=responseRequests.findLast(request=>request.schema==='requirement_brief');
  assert.match(requestText(asked.body),/商品识别：.*不锈钢保温杯/);
  const disk=JSON.parse(await fs.readFile(path.join(TEST_RUNTIME_ROOT,'briefs',brief.id,'brief.json'),'utf8'));
  assert.equal(disk.productProfile.product,'不锈钢保温杯');assert.equal(disk.phase,'questioning');
  releaseQuestions();const completed=await waitBrief(brief.id,'awaiting_answer');
  assert.deepEqual(completed.messages.map(message=>message.role),['assistant']);
  assert.deepEqual(responseRequests.slice(start).map(request=>request.schema),['product_profile','requirement_brief']);
  const count=responseCount('product_profile');
  const answered=await postJson(`/api/briefs/${brief.id}/messages`,{requestId:'profile-followup',message:'主要用于日常通勤'});
  assert.equal(answered.status,200,await answered.text());assert.equal(responseCount('product_profile'),count);
  assert.equal((await fetchBrief(brief.id)).messages.length,3);
});

test('failed initial questions reuse the cached product profile and failed answers remain retryable',async t=>{
  t.after(()=>responseFailures.clear());
  const brief=await createBrief(),profiles=responseCount('product_profile');
  responseFailures.set('requirement_brief',1);
  assert.equal((await postJson(`/api/briefs/${brief.id}/analyze`)).status,202);
  const failed=await waitBrief(brief.id,'failed');
  assert.equal(failed.error.code,'BRIEF_QUESTION_FAILED');assert.equal(failed.productProfile.product,'不锈钢保温杯');assert.equal(failed.messages.length,0);
  assert.equal((await postJson(`/api/briefs/${brief.id}/analyze`)).status,202);
  await waitBrief(brief.id,'awaiting_answer');assert.equal(responseCount('product_profile'),profiles+1);
  responseFailures.set('requirement_brief',1);
  const answer=await postJson(`/api/briefs/${brief.id}/messages`,{requestId:'failed-input',message:'面向学生，重点展示材质'});
  assert.equal(answer.status,502);
  const input=await fetchBrief(brief.id);assert.equal(input.phase,'failed');assert.equal(input.pendingMessage.text,'面向学生，重点展示材质');
  assert.equal((await postJson(`/api/briefs/${brief.id}/analyze`)).status,202);
  const recovered=await waitBrief(brief.id,'awaiting_answer');
  assert.equal(recovered.pendingMessage,null);assert.equal(recovered.messages.length,3);assert.equal(recovered.messages[1].text,'面向学生，重点展示材质');
  assert.equal(responseCount('product_profile'),profiles+1);
});

test('an interrupted persisted brief reports a retryable phase and resumes questions from cached recognition',async()=>{
  const brief=await createBrief();
  const file=path.join(TEST_RUNTIME_ROOT,'briefs',brief.id,'brief.json');
  const saved=JSON.parse(await fs.readFile(file,'utf8'));
  saved.phase='questioning';saved.productProfile={...productProfilePayload,sources:[]};saved.pendingMessage={requestId:'after-restart',text:'继续使用原资料'};
  await fs.writeFile(file,JSON.stringify(saved));
  const interrupted=await fetchBrief(brief.id);
  assert.equal(interrupted.phase,'failed');assert.equal(interrupted.error.code,'SERVER_RESTARTED');assert.equal(interrupted.pending,false);
  const profiles=responseCount('product_profile');
  assert.equal((await postJson(`/api/briefs/${brief.id}/analyze`)).status,202);
  const recovered=await waitBrief(brief.id,'awaiting_answer');
  assert.equal(recovered.messages[0].text,'继续使用原资料');assert.equal(responseCount('product_profile'),profiles);
});

test('all six modes rewrite only visuals and generate from the selected prompt revision without another rewrite',async()=>{
  for(const mode of ['main','detail','sku','logo','style','retouch']) {
    const job=await analyze(mode),requestId=`rewrite-${mode}`;
    const rawLegacyPrompt='  指定文案：“自然好物”与 "精确引号"\n第二行保留原始换行、空格和标点！  ';
    if(mode!=='detail') {
      job.analysis.outputs[0].prompt=rawLegacyPrompt;
      job.analysis.outputs[0].title='  任务标题\n"原始引号"  ';
    }
    job.analysis.outputs.forEach((output,index)=>{output.pageId||=`${job.id}-page-${index+1}`;});
    const fixed=output=>({pageId:output.pageId,title:output.title,subtitle:output.subtitle,body:output.body,facts:output.facts,referenceIds:output.referenceIds,presence:output.visual?.presence || 'full'});
    const before=job.analysis.outputs.map(fixed),images=imageRequests.length,calls=responseCount('prompt_rewrite');
    const rewritten=await rewrite(job,requestId);
    assert.equal(imageRequests.length,images,`${mode} rewrite must not generate images`);
    assert.equal(rewritten.status,'awaiting_confirmation');assert.equal(rewritten.promptRevision.appliedRequestId,requestId);
    assert.deepEqual(rewritten.analysis.outputs.map(fixed),before);
    assert.ok(rewritten.analysis.outputs.every(output=>output.visual.background==='改写后的浅蓝背景'));
    if(mode!=='detail') {
      assert.equal(rewritten.analysis.outputs[0].prompt,rawLegacyPrompt);
      assert.ok(rewritten.promptRevision.pages[0].prompt.includes(JSON.stringify(rawLegacyPrompt)),'legacy copy must retain quotes, whitespace and line breaks');
    }
    assert.equal(responseCount('prompt_rewrite'),calls+1);
    const duplicate=await postJson(`/api/jobs/${job.id}/prompts/rewrite`,{outputs:rewritten.analysis.outputs,requestId,instruction:'背景改为浅蓝色，光线更柔和'});
    assert.equal(duplicate.status,202,await duplicate.text());assert.equal(responseCount('prompt_rewrite'),calls+1);
    const completed=await generate(rewritten,{promptRevisionId:requestId});
    assert.equal(responseCount('prompt_rewrite'),calls+1,`${mode}: unchanged confirmed scripts must reuse the completed candidate`);
    const generated=imageRequests.slice(images);
    assert.equal(generated.length,completed.results.length);
    assert.deepEqual(generated.map(request=>request.prompt.replace(/\r\n/g,'\n')),rewritten.promptRevision.pages.map(page=>page.prompt));
    const blocked=await postJson(`/api/jobs/${job.id}/prompts/rewrite`,{outputs:rewritten.analysis.outputs,requestId:'after-generation',instruction:'新背景'});
    assert.equal(blocked.status,409);
  }
});

test('changed confirmation scripts rerun the previous rewrite instruction against the new frozen snapshot',async()=>{
  for(const mode of ['main','detail']) {
    const job=await rewrite(await analyze(mode),`revision-${mode}`);
    job.analysis.outputs[0].title='用户刚刚修改的确认标题';
    if(mode==='detail')job.analysis.outputs[0].body='新的正文，必须使用这版！';
    const calls=responseCount('prompt_rewrite'),images=imageRequests.length;
    const completed=await generate(job,{promptRevisionId:`revision-${mode}`});
    assert.equal(responseCount('prompt_rewrite'),calls+1);
    assert.equal(completed.compilation.status,'completed');
    assert.ok(imageRequests[images].prompt.includes('用户刚刚修改的确认标题'));
    if(mode==='detail')assert.ok(imageRequests[images].prompt.includes('新的正文，必须使用这版！'));
    const lastRewrite=responseRequests.findLast(request=>request.schema==='prompt_rewrite');
    assert.match(requestText(lastRewrite.body),/本轮改写要求：背景改为浅蓝色，光线更柔和/);
    assert.match(requestText(lastRewrite.body),/用户刚刚修改的确认标题/);
  }
});

test('rewrite conflicts, stale versions and failed rewrites preserve the last completed candidate',async t=>{
  t.after(()=>responseFailures.clear());
  const job=await analyze('detail'),images=imageRequests.length;
  const release=holdResponse('prompt_rewrite',t);
  const first=await postJson(`/api/jobs/${job.id}/prompts/rewrite`,{outputs:job.analysis.outputs,requestId:'held-rewrite',instruction:'先改为浅蓝色'});
  assert.equal(first.status,202);assert.equal((await first.json()).promptRevision.status,'running');
  await waitFor(()=>responseRequests.some(request=>request.schema==='prompt_rewrite'&&requestText(request.body).includes('先改为浅蓝色')));
  assert.equal((await postJson(`/api/jobs/${job.id}/prompts/rewrite`,{outputs:job.analysis.outputs,requestId:'other-rewrite',instruction:'另一种背景'})).status,409);
  assert.equal((await postJson(`/api/jobs/${job.id}/generate`,{outputs:job.analysis.outputs})).status,409);
  release();const prior=await waitRewrite(job.id);
  const revision=prior.promptRevision;
  assert.equal((await postJson(`/api/jobs/${job.id}/prompts/rewrite`,{outputs:prior.analysis.outputs,requestId:'held-rewrite',instruction:'相同请求编号不允许另一条指令'})).status,409);
  assert.equal((await postJson(`/api/jobs/${job.id}/generate`,{outputs:prior.analysis.outputs,promptRevisionId:'stale-version'})).status,400);
  responseFailures.set('prompt_rewrite',1);
  const failResponse=await postJson(`/api/jobs/${job.id}/prompts/rewrite`,{outputs:prior.analysis.outputs,requestId:'bad-rewrite',instruction:'稍微调整光线'});
  assert.equal(failResponse.status,202);
  const failed=await waitRewrite(job.id,'failed');
  assert.deepEqual(failed.promptRevision.pages,revision.pages);assert.equal(failed.promptRevision.appliedRequestId,revision.requestId);
  assert.equal(imageRequests.length,images);
  const reject=await postJson(`/api/jobs/${job.id}/prompts/rewrite`,{outputs:failed.analysis.outputs,requestId:'fixed-content-change',instruction:'TEST_REJECT_FIXED_CONTENT 改商品颜色'});
  assert.equal(reject.status,202);const rejected=await waitRewrite(job.id,'failed');
  assert.equal(rejected.promptRevision.error.code,'PROMPT_REWRITE_REJECTED');assert.deepEqual(rejected.promptRevision.pages,revision.pages);
  const completed=await generate(rejected,{promptRevisionId:revision.requestId});
  assert.equal(completed.results.length,1);assert.equal(imageRequests.at(-1).prompt.replace(/\r\n/g,'\n'),revision.pages[0].prompt);
  assert.equal((await postJson('/api/jobs/ffffffff-ffff-ffff-ffff-ffffffffffff/prompts/rewrite',{requestId:'missing',instruction:'change'})).status,404);
});

test('persisted running rewrite becomes retryable failure while retaining its previous completed pages',async()=>{
  const job=await fetchJob(INTERRUPTED_REWRITE_ID);
  assert.equal(job.status,'awaiting_confirmation');assert.equal(job.promptRevision.status,'failed');
  assert.equal(job.promptRevision.error.code,'SERVER_RESTARTED');assert.equal(job.promptRevision.appliedRequestId,'prior-rewrite');
  assert.equal(job.promptRevision.pages[0].prompt,'保留已完成的浅蓝色画面指令');
});

test('material samples dispatch as attachments without a whole product and crops and design are frozen',async()=>{
  const job=await analyzeDetailSuite(),outputs=structuredClone(job.analysis.outputs);
  const [front,sample]=job.materials;
  outputs[1].referenceIds=[front.referenceId];outputs[1].referenceCrops={[front.referenceId]:{x:0,y:0,width:.5,height:.5}};
  outputs[2].referenceIds=[sample.referenceId];
  const designSystem={palette:'#163c38 与暖白',typography:'标题清晰，正文较小',titlePlacement:'左上固定标题区',spacing:'统一 6% 边距',components:'圆角卡片',decorations:'细线',lightMood:'柔和暖调'};
  const materialCoverage=[{name:'测试材质',part:'已确认部位',evidence:'仅使用用户已提供的商品资料',enabled:true,pageIds:[outputs[1].pageId]}];
  const materials=job.materials.map(item=>({...item,role:item.referenceId===sample.referenceId?'material':item.role}));
  const preview=await fetch(`${APP_URL}/api/jobs/${job.id}/materials/${front.referenceId}/crop-preview`);assert.equal(preview.status,200);assert.equal(preview.headers.get('x-source-width'),'32');
  const start=imageRequests.length;
  const complete=await generate(job,{outputs,materials,designSystem,materialCoverage});
  const requests=imageRequests.slice(start);assert.deepEqual(requests.map(request=>request.kind),['edit','edit','edit']);
  assert.equal(requests[2].attachments.length,1);assert.match(requests[2].prompt,/用途 material/);
  assert.match(requests[1].attachments[0].filename,/-crop-[a-f0-9]{16}\.png$/);
  assert.match(requests[0].prompt,/左上固定标题区/);
  assert.deepEqual(complete.analysis.designSystem,designSystem);
  const persisted=JSON.parse(await fs.readFile(path.join(TEST_RUNTIME_ROOT,'jobs',job.id,'job.json'),'utf8'));
  assert.deepEqual(persisted.submittedSnapshot.pages[1].referenceCrops,outputs[1].referenceCrops);
  assert.deepEqual(persisted.submittedSnapshot.materialCoverage,materialCoverage);
  await restartApp();const restored=await fetchJob(job.id);assert.deepEqual(restored.analysis.designSystem,designSystem);
  assert.equal(imageRequests.length,start+3,'restart must not redispatch material pages');
});

test('unknown API results survive restart without replay and permit an independent new job', async t => {
  const previousBrowser=browserSession;
  browserSession=createBrowserSession();
  t.after(()=>{browserSession=previousBrowser;imageFailures=0;imageFailureStatus=400;});
  const job=await analyzeDetailSuite({count:1});
  imageFailures=1;imageFailureStatus=503;
  const before=imageRequests.length;
  assert.equal((await postJson(`/api/jobs/${job.id}/generate`,{outputs:job.analysis.outputs})).status,202);
  const unknown=await waitForJob(job.id,'reconciling');
  assert.equal(unknown.execution.pending,true);
  assert.equal(unknown.error.code,'ENGINE_RESULT_UNKNOWN');
  const original=localStore.listOperations({ownerId:browserSession.ownerId}).find(op=>op.params.jobId===job.id);
  const identity=op=>Object.fromEntries(['id','requestId','actionKey','workHash','engineTaskId','dispatchClaimedAt'].map(key=>[key,op[key]]));
  assert.equal(original.state,'UNCERTAIN');
  assert.equal(imageRequests.length,before+1);
  assert.equal((await postJson(`/api/jobs/${job.id}/items/0/retry`,{requestId:crypto.randomUUID()})).status,409);
  await restartApp();
  assert.equal((await waitForJob(job.id,'reconciling')).execution.pending,true);
  assert.equal(imageRequests.length,before+1);
  assert.deepEqual(identity(localStore.getOperation(original.id)),identity(original));
  assert.equal((await fetchJob(job.id)).execution.admissionBlocked,false);
  const next=await generate(await analyzeDetailSuite({count:1}));
  assert.equal(next.results.length,1);
  assert.equal(imageRequests.length,before+2);
  assert.equal(localStore.getOperation(original.id).state,'UNCERTAIN');
  assert.equal((await postJson(`/api/jobs/${job.id}/generate`,{outputs:job.analysis.outputs})).status,409);
  assert.deepEqual(identity(localStore.getOperation(original.id)),identity(original));
});

test('single-image retry persists its identity across failure, late duplicate submission and restart', async t => {
  const job=await analyzeDetailSuite({count:1});
  const before=imageRequests.length, compiles=compilationCount();
  imageFailures=2;imageFailureStatus=400;
  t.after(()=>{imageFailures=0;imageFailureStatus=400;});
  assert.equal((await postJson(`/api/jobs/${job.id}/generate`,{outputs:job.analysis.outputs})).status,202);
  await waitForJob(job.id,'failed');
  assert.equal(imageRequests.length,before+1);
  const requestId=crypto.randomUUID();
  const route=`/api/jobs/${job.id}/items/0/retry`;
  assert.equal((await postJson(route,{requestId})).status,202);
  const failed=await waitForJob(job.id,'failed');
  assert.equal(failed.generationItems[0].retrySerial,1);
  assert.equal(imageRequests.length,before+2);
  assert.equal((await postJson(route,{requestId})).status,202);
  await restartApp();
  assert.equal((await postJson(route,{requestId})).status,202);
  assert.equal((await fetchJob(job.id)).generationItems[0].retrySerial,1);
  assert.equal(imageRequests.length,before+2,'late replay must not create another engine call');
  const fresh=await postJson(route,{requestId:crypto.randomUUID()});
  assert.equal(fresh.status,202,await fresh.text());
  const completed=await waitForJob(job.id,'completed');
  assert.equal(completed.results.length,1);
  assert.equal(completed.generationItems[0].retrySerial,2);
  assert.equal(imageRequests.length,before+3);
  assert.equal(compilationCount(),compiles+1,'all retries reuse frozen prompts');
  assert.equal(localStore.listOperations({ownerId:browserSession.ownerId}).filter(op=>op.params.jobId===job.id).length,3);
});

test('partial success preserves finished pages and an explicit retry only dispatches the failed page', async t => {
  const job=await analyzeDetailSuite();
  imageFailures=1;imageFailureStatus=400;
  t.after(()=>{imageFailures=0;imageFailureStatus=400;});
  const before=imageRequests.length;
  const partial=await generate(job);
  assert.equal(partial.results.length,2);
  assert.equal(partial.generationItems.filter(item=>item.status==='failed').length,1);
  const completedIds=partial.results.map(result=>result.id);
  assert.equal((await postJson(`/api/jobs/${job.id}/items/0/retry`,{requestId:crypto.randomUUID()})).status,202);
  const completed=await waitFor(async()=>{
    const item=await fetchJob(job.id);return item.results.length===3&&item.status==='completed'?item:false;
  });
  assert.equal(imageRequests.length,before+4);
  assert.ok(completedIds.every(id=>completed.results.some(result=>result.id===id)));
});

test('lost published originals and refinements rebuild from saved results without losing version history', async () => {
  const job=await generate(await analyzeDetailSuite({count:1}));
  const requestId=crypto.randomUUID(),form=new FormData();
  form.set('requestId',requestId);form.set('imageId',job.results[0].id);form.set('versionId','0');form.set('prompt','仅调整背景为暖白');
  const edit=await fetch(`${APP_URL}/api/jobs/${job.id}/refine`,{method:'POST',body:form});
  assert.equal(edit.status,201,await edit.clone().text());
  const result=(await edit.json()).result;
  const before=imageRequests.length;
  for(const version of result.versions) await fs.unlink(path.join(TEST_RUNTIME_ROOT,'generated',job.id,path.basename(version.url)));
  await restartApp();
  await waitFor(async()=>{
    for(const version of result.versions) if(!(await fetch(APP_URL+version.url)).ok)return false;
    return true;
  });
  const restored=await fetchJob(job.id);
  assert.deepEqual(restored.results[0].versions,result.versions);
  assert.equal(restored.results[0].version,result.version);
  assert.equal(imageRequests.length,before);
  assert.equal((await fetch(`${APP_URL}/api/jobs/${job.id}/refine`,{method:'POST',body:form})).status,201);
  assert.equal(imageRequests.length,before);
});

test('missing both published and saved result blocks regeneration of an already completed operation', async () => {
  const job=await generate(await analyzeDetailSuite({count:1}));
  const operation=localStore.listOperations({ownerId:browserSession.ownerId}).find(op=>op.params.jobId===job.id);
  const before=imageRequests.length;
  for(const filename of operation.result.files) await fs.unlink(filename);
  await fs.unlink(path.join(TEST_RUNTIME_ROOT,'generated',job.id,'result-1.png'));
  await restartApp();
  const damaged=await waitFor(async()=>{
    const item=await fetchJob(job.id);return item.error?.code==='ENGINE_RESULT_UNAVAILABLE'?item:false;
  });
  assert.equal(damaged.generationItems[0].error.code,'ENGINE_RESULT_UNAVAILABLE');
  assert.equal((await postJson(`/api/jobs/${job.id}/items/0/retry`,{requestId:crypto.randomUUID()})).status,409);
  assert.equal(imageRequests.length,before);
  assert.equal(localStore.getOperation(operation.id).state,'DONE');
});

test('retry snapshot saved before a crash resumes only the original proven-undispatched action on explicit replay', async t => {
  const job=await analyzeDetailSuite({count:1});
  imageFailures=1;imageFailureStatus=400;
  t.after(()=>{imageFailures=0;imageFailureStatus=400;});
  assert.equal((await postJson(`/api/jobs/${job.id}/generate`,{outputs:job.analysis.outputs})).status,202);
  await waitForJob(job.id,'failed');
  const before=imageRequests.length;
  await stopApp();
  const requestId=crypto.randomUUID(),resourceId=`${job.id}:0`,actionKey=`generate:${job.id}:0:1`;
  localStore.claimActionRequest({ownerId:browserSession.ownerId,requestId,kind:'image-retry',resourceId,
    workHash:crypto.createHash('sha256').update(JSON.stringify({kind:'image-retry',resourceId})).digest('hex'),
    payload:{baseSerial:0,retrySerial:1,actionKey}});
  const filename=path.join(TEST_RUNTIME_ROOT,'jobs',job.id,'job.json');
  const snapshot=JSON.parse(await fs.readFile(filename,'utf8'));
  Object.assign(snapshot.generationItems[0],{retrySerial:1,actionKey,operationId:null,status:'queued'});
  snapshot.status='queued';await fs.writeFile(filename,JSON.stringify(snapshot));
  await startApp();
  const restored=await waitForJob(job.id,'failed');
  assert.equal(restored.generationItems[0].error.code,'ENGINE_NOT_STARTED');
  assert.equal(imageRequests.length,before,'restart alone must not execute it');
  assert.equal((await postJson(`/api/jobs/${job.id}/items/0/retry`,{requestId})).status,202);
  const completed=await waitForJob(job.id,'completed');
  assert.equal(completed.generationItems[0].retrySerial,1);
  assert.equal(completed.generationItems[0].actionKey,actionKey);
  assert.equal(imageRequests.length,before+1);
  assert.equal((await postJson(`/api/jobs/${job.id}/items/0/retry`,{requestId})).status,202);
  assert.equal(imageRequests.length,before+1);
});
