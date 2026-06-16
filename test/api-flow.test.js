import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import sharp from "sharp";

const APP_PORT = 5191;
const MOCK_PORT = 5192;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}/v1`;
const TEST_RUNTIME_ROOT = path.join(os.tmpdir(), `pintu-ai-test-runtime-${process.pid}`);
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
let lastEditRequestBody = "";
let lastEditRequestText = "";
let lastResponsesPayload = null;

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

before(async () => {
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
      const serialized = JSON.stringify(body);
      const output = serialized.includes("判断下面的图片修改要求")
        ? { allowed: true, reason: "允许修改外部视觉", safePrompt: "只修改圈选背景，保持商品主体不变。" }
        : serialized.includes("电商生图要求撰写助手")
          ? assistWritingPayload
          : analysisPayload;
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
      json(response, 200, { created: Math.floor(Date.now() / 1000), data: [{ b64_json: PNG_BASE64 }] });
      return;
    }

    json(response, 404, { error: { message: "not found" } });
  });

  await new Promise((resolve) => mockServer.listen(MOCK_PORT, "127.0.0.1", resolve));
  appProcess = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: MOCK_URL,
      OPENAI_TEXT_MODEL: "gpt-5.5",
      OPENAI_IMAGE_MODEL: "gpt-image-2",
      OPENAI_PREVIEW_IMAGE_MODEL: "gpt-image-1-mini",
      GENERATED_FILE_TTL_HOURS: "1",
      PINTU_RUNTIME_ROOT: TEST_RUNTIME_ROOT,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await waitFor(async () => {
    const response = await fetch(`${APP_URL}/api/health`);
    const health = await response.json();
    return health.ok;
  });
});

after(async () => {
  if (appProcess && appProcess.exitCode === null) {
    const exited = new Promise((resolve) => appProcess.once("exit", resolve));
    appProcess.kill("SIGTERM");
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2_000))]);
    if (appProcess.exitCode === null) {
      appProcess.kill("SIGKILL");
      await exited;
    }
  }
  mockServer?.closeAllConnections?.();
  await new Promise((resolve) => mockServer?.close(resolve));
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

const generate = async (job) => {
  const response = await fetch(`${APP_URL}/api/jobs/${job.id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outputs: job.analysis.outputs }),
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
    assert.ok(completed.generationItems.every((item) => item.status === "completed"));
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
  form.set("imageId", result.id);
  form.set("versionId", "0");
  form.set("prompt", "只把圈选区域的背景调整得更干净");
  form.set("mask", new Blob([PNG_BUFFER], { type: "image/png" }), "mask.png");
  const response = await fetch(`${APP_URL}/api/jobs/${job.id}/refine`, { method: "POST", body: form });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.result.versions.length, 2);
  assert.equal(payload.result.versions[0].label, "原图");
  assert.equal(payload.version.label, "版本 1");
});
