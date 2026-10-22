import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readMaterials } from '../document-reader.js';
const fixture = async name => ({ originalname: name, mimetype: 'application/octet-stream', buffer: await fs.readFile(new URL(`./fixtures/${name}`, import.meta.url)) });

test('reads PDF text and page image, including browser octet-stream MIME', async () => {
  const result = await readMaterials([await fixture('product.pdf')]);
  assert.match(result.text, /500ml/);
  assert.equal(result.images.length, 1);
  assert.equal(result.images[0].mimetype, 'image/png');
  assert.equal(result.images[0].sourceName, 'product.pdf');
  assert.equal(result.images[0].sourceKind, 'pdf_page');
  assert.equal(result.images[0].ordinal, 1);
});
test('reads DOCX text without sending ZIP bytes as an image', async () => {
  const result = await readMaterials([await fixture('product.docx')]);
  assert.match(result.text, /不锈钢/);
  assert.equal(result.images.length, 0);
  assert.ok(result.warnings.some(w => w.includes('示意')));
});
test('mixed uploads prioritize product photos over document pages', async () => {
  const image = { originalname: 'bottle.jpg', buffer: await fs.readFile(new URL('../assets/photos/bottle-main.jpg', import.meta.url)) };
  const result = await readMaterials([await fixture('product.pdf'), image, await fixture('product.txt')]);
  assert.equal(result.images[0].originalname, 'bottle.jpg');
  assert.match(result.text, /不锈钢/);
});
test('rejects unsupported, corrupt, empty and binary disguised files', async () => {
  for (const [originalname, buffer] of [['file.exe', Buffer.from('a')], ['file.pdf', Buffer.from('fake')], ['file.docx', Buffer.from('fake')], ['file.doc', Buffer.from('fake')], ['file.txt', Buffer.from([0, 1, 2])], ['file.txt', Buffer.alloc(0)]]) {
    await assert.rejects(readMaterials([{ originalname, buffer }]), error => error.status === 400);
  }
});
test('UTF-16 Word-exported text is readable and oversized text is rejected', async () => {
  const result = await readMaterials([{ originalname: '资料.txt', buffer: Buffer.concat([Buffer.from([255,254]), Buffer.from('商品规格：500ml', 'utf16le')]) }]);
  assert.match(result.text, /商品规格/);
  await assert.rejects(readMaterials([{ originalname: 'long.md', buffer: Buffer.from('x'.repeat(30001)) }]), /30000/);
});

test('DOCX embedded image becomes a usable generation reference', async () => {
  const result = await readMaterials([await fixture('product-image.docx')]);
  assert.match(result.text, /500ml/);
  assert.equal(result.images.length, 1);
  assert.equal(result.images[0].mimetype, 'image/png');
  assert.equal(result.images[0].sourceKind, 'docx_image');
  assert.equal(result.images[0].ordinal, 1);
});

test('same-name uploads and document extracts retain distinct source identities', async () => {
  const photo = { originalname: 'same.jpg', buffer: await fs.readFile(new URL('../assets/photos/bottle-main.jpg', import.meta.url)) };
  const result = await readMaterials([photo, { ...photo }, await fixture('product.pdf'), await fixture('product-image.docx')]);
  const ids = result.images.map(image => image.referenceId);
  assert.equal(new Set(ids).size, 4);
  assert.equal(new Set(result.sources.map(source => source.sourceId)).size, 4);
  for (const image of result.images) {
    assert.match(image.referenceId, /^[a-f0-9-]{36}$/);
    assert.match(image.sourceId, /^[a-f0-9-]{36}$/);
    const source = result.sources.find(source => source.sourceId === image.sourceId);
    assert.equal(source.sourceName, image.sourceName);
  }
  assert.deepEqual(result.images.map(image => image.sourceKind), ['upload', 'upload', 'pdf_page', 'docx_image']);
  assert.equal(result.images[0].ordinal, 1);
});

test('PDF references keep physical page numbers and one source identity when limited to four pages', async () => {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [4 0 R 6 0 R 8 0 R 10 0 R 12 0 R] /Count 5 >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  for (let page = 1; page <= 5; page++) {
    const stream = `BT /F1 18 Tf 30 150 Td (Product page ${page}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 200] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5+(page-1)*2} 0 R >>`, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index+1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const result = await readMaterials([{originalname:'five-pages.pdf',buffer:Buffer.from(pdf)}]);
  assert.deepEqual(result.images.map(image=>image.ordinal),[1,2,3,4]);
  assert.equal(new Set(result.images.map(image=>image.sourceId)).size,1);
  assert.equal(new Set(result.images.map(image=>image.referenceId)).size,4);
  assert.match(result.text,/Product page 5/);
  assert.ok(result.warnings.some(warning=>warning.includes('前 4 页')));
});
