import { parentPort, workerData } from 'node:worker_threads';
import sharp from 'sharp';

const buffer = Buffer.from(workerData.buffer);
const extension = workerData.extension;
const warnings = [], images = [];
let text = '';
async function addImage(data, sourceKind, ordinal) {
  if (images.length >= 4) return;
  const png = await sharp(Buffer.from(data), { limitInputPixels: 20000000 }).rotate()
    .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  images.push({ data: png, sourceKind, ordinal });
}
try {
  if (extension === '.pdf') {
    if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('不是有效的 PDF 文件');
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer, isEvalSupported: false });
    try {
      const info = await parser.getInfo();
      if (info.total > 20) throw new Error('PDF 最多支持 20 页，请拆分后上传');
      const result = await parser.getText();
      text = result.text;
      const pages = await parser.getScreenshot({ partial: Array.from({ length: Math.min(info.total, 4) }, (_, i) => i + 1), desiredWidth: 1200, imageDataUrl: false, imageBuffer: true });
      for (const page of pages.pages) await addImage(page.data, 'pdf_page', page.pageNumber);
      if (info.total > 4) warnings.push('已读取全部文字；页面图像仅识别前 4 页，后续扫描页请单独上传。');
    } finally { await parser.destroy(); }
  } else if (extension === '.docx') {
    if (buffer.readUInt16LE(0) !== 0x4b50) throw new Error('不是有效的 DOCX 文件，请用 Word 另存为 .docx');
    const { default: mammoth } = await import('mammoth');
    text = (await mammoth.extractRawText({ buffer }, { externalFileAccess: false })).value;
    let count = 0;
    await mammoth.convertToHtml({ buffer }, {
      externalFileAccess: false,
      convertImage: mammoth.images.imgElement(async image => {
        const ordinal = ++count;
        if (ordinal <= 4) {
          try { await addImage(await image.read(), 'docx_image', ordinal); }
          catch { warnings.push('有内嵌图片无法读取，请将其单独上传为 PNG 或 JPEG。'); }
        }
        return { src: '' };
      }),
    });
    if (count > 4) warnings.push('内嵌图片仅识别前 4 张，更多图片请单独上传。');
  } else if (extension === '.doc') {
    if (buffer.subarray(0, 8).toString('hex') !== 'd0cf11e0a1b11ae1') throw new Error('不是有效的 DOC 文件，请用 Word 另存为 .docx');
    const { default: WordExtractor } = await import('word-extractor');
    const document = await new WordExtractor().extract(buffer);
    text = document.getBody();
    warnings.push('旧版 DOC 仅读取文字；内嵌图片请单独上传，或另存为 DOCX。');
  } else {
    let encoding = buffer[0] === 0xff && buffer[1] === 0xfe ? 'utf-16le' : buffer[0] === 0xfe && buffer[1] === 0xff ? 'utf-16be' : 'utf-8';
    try { text = new TextDecoder(encoding, { fatal: true }).decode(buffer); }
    catch { text = new TextDecoder('gb18030', { fatal: true }).decode(buffer); }
    if (/[\x00-\x08\x0e-\x1f]/.test(text)) throw new Error('文件包含二进制内容，请上传文本文件');
  }
  text = text.trim();
  if (text.length > 30000) throw new Error('文档超过 30000 字符，请拆分后上传');
  if (!text && !images.length) throw new Error('未读取到文字或图片，请检查文件内容');
  parentPort.postMessage({ text, images: images.sort((a, b) => a.ordinal - b.ordinal), warnings });
} catch (error) {
  const message = /password|encrypted/i.test(error.message) ? '文件已加密，请解除密码后上传' :
    /[\u4e00-\u9fff]/.test(error.message) ? error.message : '无法读取文件，请检查是否损坏、加密或格式不正确';
  parentPort.postMessage({ error: message });
}
