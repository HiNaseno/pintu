import path from 'node:path';
import crypto from 'node:crypto';
import { Worker } from 'node:worker_threads';
import sharp from 'sharp';

export const MATERIAL_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.doc', '.docx', '.txt', '.md', '.csv', '.json']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
export function acceptsMaterial(file) {
  return MATERIAL_EXTENSIONS.has(path.extname(file.originalname || '').toLowerCase());
}
function fail(message) { return Object.assign(new Error(message), { status: 400 }); }
function extractDocument(file) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./document-worker.js', import.meta.url), {
      workerData: { buffer: file.buffer, extension: path.extname(file.originalname).toLowerCase() },
      resourceLimits: { maxOldGenerationSizeMb: 256 },
    });
    let done = false;
    const finish = (error, result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      void worker.terminate();
      error ? reject(fail(`${file.originalname}：${error}`)) : resolve(result);
    };
    const timer = setTimeout(() => finish('读取超时，请缩减文件内容后重试'), 30000);
    worker.once('message', result => finish(result.error, result));
    worker.once('error', () => finish('无法读取文件，请检查文件是否损坏或转换为 PDF 后重试'));
    worker.once('exit', () => { if (!done) finish('文件读取失败，请检查格式'); });
  });
}

export async function readMaterials(files) {
  const images = [], documentImages = [], texts = [], warnings = [], sources = [];
  for (const [index, file] of files.entries()) {
    if (!acceptsMaterial(file)) throw fail('支持图片、PDF、Word、TXT、Markdown、CSV 和 JSON 文件');
    if (!file.buffer.length) throw fail(`${file.originalname} 是空文件`);
    if (file.buffer.length > 10 * 1024 * 1024) throw fail('单个文件不能超过 10MB');
    const extension = path.extname(file.originalname).toLowerCase();
    const sourceId = file.sourceId || crypto.randomUUID();
    const sourceName = file.originalname;
    sources.push({ sourceId, sourceName, index });
    if (IMAGE_EXTENSIONS.has(extension)) {
      try {
        const meta = await sharp(file.buffer, { limitInputPixels: 40000000 }).metadata();
        if (!['png', 'jpeg', 'webp'].includes(meta.format)) throw new Error();
        images.push({ ...file, mimetype: `image/${meta.format}`, referenceId: file.referenceId || crypto.randomUUID(), sourceId, sourceName, sourceKind: 'upload', ordinal: 1 });
      } catch { throw fail(`${file.originalname} 不是有效的 PNG、JPEG 或 WebP 图片`); }
      continue;
    }
    const result = await extractDocument(file);
    if (result.text?.trim()) texts.push(`资料文件：${JSON.stringify(file.originalname)}\n${result.text}`);
    warnings.push(...(result.warnings || []).map(warning => `${file.originalname}：${warning}`));
    for (const image of result.images || []) {
      documentImages.push({ originalname: `${file.originalname}-参考图${image.ordinal}.png`, mimetype: 'image/png', buffer: Buffer.from(image.data), referenceId: crypto.randomUUID(), sourceId, sourceName, sourceKind: image.sourceKind, ordinal: image.ordinal });
    }
  }
  const visualFiles = [...images, ...documentImages];
  if (visualFiles.length > 12) warnings.push('图片较多，本次使用前 12 张参考图（优先使用直接上传的图片）。');
  const text = texts.join('\n\n');
  if (text.length > 60000) throw fail('资料合计超过 60000 字符，请拆分上传');
  if (files.length && !visualFiles.length && !text.trim()) throw fail('未读取到可识别的内容，请检查文件或上传商品图片');
  if (files.length && !visualFiles.length) warnings.push('本次仅提供文字资料，生成图片为示意；请补充实拍商品图以确认真实外观。');
  return { images: visualFiles.slice(0, 12), text, warnings, sources };
}
