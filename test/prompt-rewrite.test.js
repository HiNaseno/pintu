import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewritePrompts, PROMPT_REWRITE_SCHEMA } from '../prompt-rewrite.js';

const materials = { images: [
  { referenceId: 'front', role: 'primary', description: '正面图', variant: '红色', sourceName: '商品.jpg', sourceKind: 'upload', ordinal: 1, path: '/private/product.jpg', buffer: Buffer.from('private-image-data') },
  { referenceId: 'fabric', role: 'detail', description: '真实面料细节', variant: '红色', sourceName: '说明.pdf', sourceKind: 'pdf_page', ordinal: 2 },
] };
const fields = mode => ({ mode, platform: '淘宝 / 天猫', language: '中文（简体）', ratio: '3:4 竖版' });
const legacy = (pageId = 'one', patch = {}) => ({
  pageId, title: '主图任务名称', creativeRole: '场景展示', description: '白底商品图',
  prompt: '白色棚拍背景，标题：“日常更从容”，副标题：“容量 500ml”。禁止改商品颜色。',
  visual: { presence: 'full', background: '旧白色背景', composition: '旧居中构图', shot: '平视' }, ...patch,
});
const detailPage = (pageId = 'detail-one', patch = {}) => ({
  ...legacy(pageId), buyerQuestion: '面料如何？', title: '真实面料  细看质感', subtitle: '每一处细节', body: '原文第一行\n第二行“原标点”', facts: ['用户确认：面料为棉'],
  referenceIds: ['fabric', 'front'], prompt: '原要求使用中性背景。', ...patch,
});
const responseFor = outputs => ({ allowed: true, reason: '', pages: outputs.map(output => ({
  pageId: output.pageId, prompt: '采用森林绿视觉风格和侧向柔光，为现有标题保留上方区域，正文使用两列布局。',
  visual: { background: '森林绿渐变背景', composition: '不对称两列布局', shot: '斜上方视角' },
})) });
function mockClient(result) {
  const calls = [];
  let imageCalls = 0;
  const client = {
    responses: { create: async request => { calls.push(request); return { output_text: typeof result === 'function' ? result(request) : JSON.stringify(result) }; } },
    images: { generate: async () => { imageCalls++; throw new Error('must not generate'); }, edit: async () => { imageCalls++; throw new Error('must not edit'); } },
  };
  return { client, calls, imageCalls: () => imageCalls };
}
const analysis = { product: '棉质围裙', sellingPoints: ['棉质面料'], suiteStyle: '原红色视觉', visualDirection: '原复古方向', protectionRules: ['商品实际颜色不变'] };

test('rewrite structured schema permits only creative instructions and mutable visual fields', () => {
  function inspect(schema) {
    if (schema.type === 'object') {
      assert.equal(schema.additionalProperties, false);
      assert.deepEqual(schema.required.slice().sort(), Object.keys(schema.properties).sort());
      Object.values(schema.properties).forEach(inspect);
    }
    if (schema.items) inspect(schema.items);
  }
  inspect(PROMPT_REWRITE_SCHEMA);
  assert.deepEqual(Object.keys(PROMPT_REWRITE_SCHEMA.properties.pages.items.properties.visual.properties), ['background', 'composition', 'shot']);
});

test('all six modes use one text-only call and preserve fixed identity without generating images', async () => {
  for (const mode of ['main', 'detail', 'sku', 'logo', 'style', 'retouch']) {
    const outputs = mode === 'detail' ? [detailPage()] : [legacy()];
    const mock = mockClient(responseFor(outputs));
    const result = await rewritePrompts({ client: mock.client, model: 'gpt-6.1-sol', fields: fields(mode), analysis: { ...analysis, ...(mode === 'detail' ? { workflowVersion: 2 } : {}) }, outputs, materials, instruction: '把视觉风格改为森林绿和柔光' });
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.imageCalls(), 0);
    assert.equal(mock.calls[0].model, 'gpt-6.1-sol');
    assert.equal(mock.calls[0].text.format.name, 'prompt_rewrite');
    assert.ok(mock.calls[0].input[0].content.every(part => part.type === 'input_text'));
    assert.equal(result[0].pageId, outputs[0].pageId);
    assert.deepEqual(result[0].visual, { presence: 'full', background: '森林绿渐变背景', composition: '不对称两列布局', shot: '斜上方视角' });
    assert.match(result[0].prompt, /3:4 竖版/);
    assert.doesNotMatch(JSON.stringify(mock.calls), /\/private\/product|private-image-data/);
    if (mode === 'logo') {
      assert.match(result[0].prompt, /允许调整图形和风格，不要求保留实物照片层/);
      assert.match(result[0].prompt, /本图无商品参考附件/);
      assert.doesNotMatch(result[0].prompt, /本屏保持完整商品呈现/);
    }
  }
});

test('detail rewrite keeps exact copy, per-page facts, presence and ordered references', async () => {
  const outputs = [detailPage('a', { visual: { presence: 'detail', background: '原底', composition: '原排版', shot: '微距' } }), detailPage('b', {
    title: '另页独有标题', body: '不能串页的正文', buyerQuestion: '另一购买问题', facts: ['另一页专属事实'], referenceIds: [],
    visual: { presence: 'none', background: '原信息底', composition: '原卡片', shot: '平面' },
  })];
  const before = JSON.stringify(outputs);
  const mock = mockClient(responseFor(outputs));
  const result = await rewritePrompts({ client: mock.client, model: 'gpt-6.1-sol', fields: fields('detail'), analysis: { ...analysis, workflowVersion: 2 }, outputs, materials, instruction: '背景改森林绿，调整排版' });
  assert.equal(JSON.stringify(outputs), before);
  assert.equal(result[0].visual.presence, 'detail');
  assert.equal(result[1].visual.presence, 'none');
  assert.ok(result[0].prompt.includes(JSON.stringify({ title: outputs[0].title, subtitle: outputs[0].subtitle, body: outputs[0].body })));
  assert.ok(result[0].prompt.includes(JSON.stringify(outputs[0].facts)));
  assert.ok(result[0].prompt.indexOf('1. 编号 fabric') < result[0].prompt.indexOf('2. 编号 front'));
  assert.match(result[0].prompt,/1\. 编号 fabric；主要参考/);
  assert.match(result[0].prompt,/2\. 编号 front；辅助参考/);
  assert.match(result[0].prompt, /用途 detail/);
  assert.match(result[0].prompt, /款式 红色/);
  assert.doesNotMatch(result[0].prompt, /另页独有标题|不能串页的正文|另一页专属事实/);
  assert.doesNotMatch(result[0].prompt, /原红色视觉|原复古方向|原要求使用中性背景/);
  assert.match(result[1].prompt, /本屏不展示商品、完整商品轮廓/);
  assert.doesNotMatch(result[1].prompt, /编号 front|编号 fabric/);
});

test('legacy rewrites retain original explicit text as immutable context while old visual instructions lose priority', async () => {
  const outputs = [legacy()];
  const mock = mockClient(responseFor(outputs));
  const [result] = await rewritePrompts({ client: mock.client, fields: fields('main'), analysis, outputs, materials, instruction: '改为森林绿背景' });
  assert.ok(result.prompt.includes(JSON.stringify(outputs[0].prompt)));
  assert.ok(result.prompt.includes(JSON.stringify(outputs[0].title)));
  assert.match(result.prompt, /旧背景、镜头和风格不再生效/);
  assert.match(result.prompt, /不自动当作上屏文案/);
  assert.match(result.prompt, /容量 500ml/);
  assert.match(result.prompt, /1\. 编号 front/);
  assert.match(result.prompt, /2\. 编号 fabric/);
  assert.doesNotMatch(result.prompt, /主要参考|辅助参考/);
  assert.match(result.prompt, /附件先后顺序不代表使用优先级/);
});

test('iteration provides matching previous pages as context but does not append prior conflicting prompts', async () => {
  const outputs = [detailPage()];
  const previousPages = [{ pageId: outputs[0].pageId, prompt: '上一版：天空蓝背景，标题原文不变', visual: { presence: 'full', background: '天空蓝', composition: '居中', shot: '平视' } },
    { pageId: 'foreign', prompt: '其他任务的文案', visual: {} }];
  const mock = mockClient(responseFor(outputs));
  const [result] = await rewritePrompts({ client: mock.client, fields: fields('detail'), analysis: { ...analysis, workflowVersion: 2 }, outputs, materials, instruction: '在上一版基础上改森林绿', previousPages });
  assert.match(mock.calls[0].input[0].content[0].text, /上一版：天空蓝背景/);
  assert.doesNotMatch(mock.calls[0].input[0].content[0].text, /其他任务的文案/);
  assert.doesNotMatch(result.prompt, /天空蓝背景/);
  assert.match(result.prompt, /森林绿渐变背景/);
});

test('requests changing fixed content return actionable rejection and never generate', async () => {
  const mock = mockClient({ allowed: false, reason: '标题属于已确认文案，请先在原方案修改主标题后重新确认，再调整画面。', pages: [] });
  await assert.rejects(() => rewritePrompts({ client: mock.client, fields: fields('detail'), analysis: { workflowVersion: 2 }, outputs: [detailPage()], materials, instruction: '把标题改成全新品牌名' }), error => error.status === 422 && error.code === 'PROMPT_REWRITE_REJECTED' && /原方案修改主标题/.test(error.message));
  assert.equal(mock.calls.length, 1);
  assert.equal(mock.imageCalls(), 0);
});

test('page changes, reference injection and presence changes are rejected instead of applied', async () => {
  const outputs = [detailPage('a'), detailPage('b')];
  const base = responseFor(outputs);
  const changes = [
    { ...base, pages: base.pages.slice(0, 1) },
    { ...base, pages: [...base.pages].reverse() },
    { ...base, pages: [{ ...base.pages[0], referenceIds: ['front'] }, base.pages[1]] },
    { ...base, pages: [{ ...base.pages[0], title: '改后的标题' }, base.pages[1]] },
    { ...base, pages: [{ ...base.pages[0], visual: { ...base.pages[0].visual, presence: 'none' } }, base.pages[1]] },
    { ...base, pages: [{ ...base.pages[0], prompt: '' }, base.pages[1]] },
  ];
  for (const response of changes) {
    const mock = mockClient(response);
    await assert.rejects(() => rewritePrompts({ client: mock.client, fields: fields('detail'), analysis: { workflowVersion: 2 }, outputs, materials, instruction: '调整背景' }), error => error.status === 502 && error.code === 'PROMPT_REWRITE_INVALID');
    assert.equal(mock.imageCalls(), 0);
  }
});

test('invalid input fails before requesting any rewrite', async () => {
  const mock = mockClient(responseFor([detailPage()]));
  const base = { client: mock.client, fields: fields('detail'), analysis: { workflowVersion: 2 }, outputs: [detailPage()], materials, instruction: '调整背景' };
  for (const patch of [
    { instruction: '' }, { fields: fields('unknown') }, { outputs: [] },
    { outputs: [detailPage('a'), detailPage('a')] },
    { outputs: [detailPage('a', { referenceIds: ['foreign-image'] })] },
    { outputs: [detailPage('a', { visual: { presence: 'none', background: '底', composition: '排版', shot: '平面' } })] },
  ]) await assert.rejects(() => rewritePrompts({ ...base, ...patch }), error => error.status === 400);
  assert.equal(mock.calls.length, 0);
});

test('pure visual rewriting preserves the no-text rule without reintroducing original captions', async () => {
  const outputs = [legacy()];
  const mock = mockClient(responseFor(outputs));
  const [result] = await rewritePrompts({ client: mock.client, fields: { ...fields('main'), language: '无文字（纯视觉）' }, analysis, outputs, materials, instruction: '换森林绿背景' });
  assert.match(result.prompt, /禁止新增任何文字、数字、标题/);
  assert.doesNotMatch(result.prompt, /日常更从容/);
});
