import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DETAIL_PLAN_SCHEMA, DETAIL_COMPILE_SCHEMA,
  planDetail, compileDetail, validateDetailPages, validateDetailGenerationReadiness, detailOutputs, detailPlan,
} from '../detail-workflow.js';

const materials = {
  images: [
    { referenceId: 'front', sourceId: 'source-a', sourceName: '商品.png', sourceKind: 'upload', ordinal: 0, buffer: Buffer.from('front'), mimetype: 'image/png', role: 'primary', variant: '红色', description: '正面整体' },
    { referenceId: 'fabric', sourceId: 'source-b', sourceName: '说明.pdf', sourceKind: 'pdf_page', ordinal: 2, buffer: Buffer.from('fabric'), mimetype: 'image/png', role: 'detail', variant: '红色', description: '织物细节' },
  ],
  text: '用户资料：面料为棉，规格信息见第二页。', warnings: ['仅识别前四页图片'],
};
const page = (id = 'hero', patch = {}) => ({
  id, buyerQuestion: '为什么值得选择？', title: '让每一餐  更有仪式感', subtitle: '  日常的好搭档  ', body: '第一行\n第二行“原文”',
  facts: ['用户确认：面料为棉'], creativeRole: '首屏吸引', description: '左侧标题与右侧真实商品形成主视觉',
  visual: { presence: 'full', background: '暖灰品牌色背景', composition: '左文右图', shot: '平视全貌' },
  referenceIds: ['front', 'fabric'], ...patch,
});
const planResult = () => ({
  product: '棉质围裙', sellingPoints: ['棉质面料'], visualDirection: '温暖的生活质感', suiteStyle: '暖灰与深红，清晰中文文字层级',
  strategy: { audience: '日常烹饪人群', purchaseReason: '了解面料和真实做工', readingFlow: '商品整体、材质细节、选购说明' },
  styleSuggestions: [
    { name: '暖调', description: '自然光与暖灰', promptHint: '舒适的品牌色和文字层级' },
    { name: '简洁', description: '轻量信息排版', promptHint: '少量重点信息' },
    { name: '复古', description: '深红品牌色', promptHint: '沉稳文字风格' },
  ],
  materialRoles: materials.images.map(image => ({ referenceId: image.referenceId, role: image.role, variant: image.variant, description: image.description })),
  protectionRules: ['保持商品真实颜色'], warnings: [],
  pages: [page(), page('material', { title: '棉质触感', subtitle: '', body: '', creativeRole: '材质细节', buyerQuestion: '面料摸起来如何？', referenceIds: ['fabric'], visual: { presence: 'detail', background: '浅色留白', composition: '纤维特写', shot: '微距' } })],
});
function mockClient(result) {
  const calls = [];
  return {
    calls,
    client: { responses: { create: async args => {
      calls.push(args);
      return { output_text: typeof result === 'function' ? result(args) : JSON.stringify(result) };
    } } },
  };
}
const fields = { mode: 'detail', platform: '淘宝 / 天猫', language: '中文（简体）', ratio: '3:4 竖版', requirements: '重点说明棉质面料' };
const compileResult = pages => ({ pages: pages.map(page => ({ pageId: page.id, prompt: `为${page.creativeRole}设计画面，按本屏构图安排文字区。`, referenceIds: page.referenceIds })) });

test('detail schemas require every property and forbid arbitrary object keys', () => {
  function inspect(schema) {
    if (schema.type === 'object') {
      assert.equal(schema.additionalProperties, false);
      assert.deepEqual(schema.required.slice().sort(), Object.keys(schema.properties).sort());
      Object.values(schema.properties).forEach(inspect);
    }
    if (schema.items) inspect(schema.items);
  }
  inspect(DETAIL_PLAN_SCHEMA);
  inspect(DETAIL_COMPILE_SCHEMA);
});

test('planning sees all tagged references and document facts and returns stable page identities', async () => {
  const mock = mockClient(planResult());
  const result = await planDetail({ client: mock.client, model: 'gpt-6.1-sol', fields, materials });
  assert.equal(mock.calls.length, 1);
  assert.equal(mock.calls[0].model, 'gpt-6.1-sol');
  const content = mock.calls[0].input[0].content;
  assert.equal(content.filter(part => part.type === 'input_image').length, 2);
  assert.match(content[0].text, /默认完整详情页推荐 8–10 屏/);
  assert.match(content[0].text, /资料不足主动精简/);
  assert.match(content[0].text, /pdf_page/);
  assert.match(content.find(part => part.text?.startsWith('以下为用户资料')).text, /面料为棉/);
  assert.match(content.find(part => part.text?.includes('参考图编号：fabric')).text, /页码或图序：2/);
  assert.equal(result.workflowVersion, 2);
  assert.equal(result.pages.length, 2);
  assert.match(result.pages[0].id, /^[a-f0-9-]{36}$/);
  assert.notEqual(result.pages[0].id, result.pages[1].id);
  assert.equal(result.outputs[0].pageId, result.pages[0].id);
  assert.equal(result.recommendedOutputPlan.find(item => item.type === 'detail').items[0].id, result.pages[0].id);
  assert.equal(result.pages[0].subtitle, '  日常的好搭档  ');
  assert.deepEqual(result.warnings, materials.warnings);
  assert.equal(result.materialRoles[1].referenceId, 'fabric');
  assert.equal(result.materialRoles[1].variant, '红色');
});

test('text-only plans can omit product references and material pages can omit the product', async () => {
  const plan = planResult();
  plan.materialRoles = [];
  plan.pages = [page('facts', { title: '面料说明', referenceIds: [], visual: { presence: 'none', background: '中性色平面', composition: '信息卡片', shot: '平面' } })];
  const mock = mockClient(plan);
  const result = await planDetail({ client: mock.client, model: 'gpt-6.1-sol', fields, materials: { images: [], text: '用户确认棉质面料', warnings: [] } });
  assert.equal(result.pages[0].visual.presence, 'none');
  assert.deepEqual(result.pages[0].referenceIds, []);
  assert.equal(mock.calls[0].input[0].content.filter(part => part.type === 'input_image').length, 0);
});

test('submitted scripts preserve exact copy and references after reorder without mutating drafts', () => {
  const first = page();
  const second = page('other', { referenceIds: ['fabric', 'front'] });
  const input = [second, first];
  const normalized = validateDetailPages(input, materials);
  assert.deepEqual(normalized.map(page => page.id), ['other', 'hero']);
  assert.deepEqual(normalized[0].referenceIds, ['fabric', 'front']);
  assert.equal(normalized[1].body, '第一行\n第二行“原文”');
  assert.notEqual(normalized[1], input[1]);
  normalized[1].referenceIds.reverse();
  assert.deepEqual(input[1].referenceIds, ['front', 'fabric']);
  const outputs = detailOutputs(input);
  assert.equal(validateDetailPages(outputs, materials)[0].id, 'other');
  const plan = detailPlan(input, { readingFlow: '先细节后全貌' });
  assert.equal(plan.find(item => item.type === 'detail').reason, '先细节后全貌');
  assert.equal(plan.reduce((sum, item) => sum + item.recommendedCount, 0), 2);
});

test('invalid references, duplicate pages and contradictory no-product selections are rejected', () => {
  for (const pages of [
    [], Array.from({ length: 13 }, (_, index) => page(`page-${index}`)),
    [page(), page()],
    [page('bad', { referenceIds: ['foreign-task-image'] })],
    [page('repeat', { referenceIds: ['front', 'front'] })],
    [page('empty', { referenceIds: [] })],
    [page('none', { visual: { presence: 'none', background: '白底', composition: '信息图', shot: '平面' } })],
  ]) assert.throws(() => validateDetailPages(pages, materials), error => error.status === 400);
});

test('compiler is an independent structured call and attaches exact confirmed copy and selected reference order', async () => {
  const pages = [page(), page('information', {
    title: '独立信息页标题', buyerQuestion: '有哪些已确认信息？', creativeRole: '规格说明', referenceIds: [],
    visual: { presence: 'none', background: '浅绿信息底', composition: '两列说明', shot: '平面' },
  })];
  const mock = mockClient(compileResult(pages));
  const result = await compileDetail({ client: mock.client, model: 'gpt-6.1-sol', fields, pages, materials,
    strategy: planResult().strategy, suiteStyle: '深红品牌色', selectedStyle: { name: '温暖自然' }, product: '棉质围裙' });
  assert.equal(mock.calls.length, 1);
  assert.equal(mock.calls[0].text.format.name, 'detail_prompt_compilation');
  assert.equal(mock.calls[0].model, 'gpt-6.1-sol');
  assert.equal(mock.calls[0].input[0].content.filter(part => part.type === 'input_image').length, 0);
  assert.equal(result[0].pageId, 'hero');
  assert.ok(result[0].prompt.includes(JSON.stringify({ title: pages[0].title, subtitle: pages[0].subtitle, body: pages[0].body })));
  assert.ok(result[0].prompt.indexOf('1. 编号 front') < result[0].prompt.indexOf('2. 编号 fabric'));
  assert.match(result[0].prompt, /用途 primary/);
  assert.match(result[0].prompt, /款式 红色/);
  assert.doesNotMatch(result[0].prompt, /独立信息页标题/);
  assert.doesNotMatch(result[0].prompt, /浅绿信息底/);
  assert.match(result[1].prompt, /不展示完整商品或商品轮廓/);
  assert.match(result[1].prompt, /本屏没有商品参考图片/);
  assert.match(result[0].prompt, /深红品牌色/);
  assert.match(result[0].prompt, /3:4 竖版/);
});

test('compiler refuses missing or reordered pages and changed references instead of falling back', async () => {
  const pages = [page(), page('second')];
  const invalidResults = [
    { pages: [compileResult(pages).pages[0]] },
    { pages: compileResult(pages).pages.reverse() },
    { pages: [{ ...compileResult(pages).pages[0], referenceIds: ['fabric', 'front'] }, compileResult(pages).pages[1]] },
    { pages: [{ ...compileResult(pages).pages[0], prompt: '' }, compileResult(pages).pages[1]] },
  ];
  for (const result of invalidResults) {
    const mock = mockClient(result);
    await assert.rejects(() => compileDetail({ client: mock.client, model: 'gpt-6.1-sol', fields, pages, materials }), error => error.status === 502);
    assert.equal(mock.calls.length, 1);
  }
  const malformed = mockClient(() => '{not-json}');
  await assert.rejects(() => compileDetail({ client: malformed.client, fields, pages, materials }), /未返回完整内容/);
});

test('pure visual compilation never reintroduces confirmed text as render instructions', async () => {
  const pages = [page('visual', { visual: { presence: 'detail', background: '米白背景', composition: '局部特写', shot: '微距' }, referenceIds: ['fabric'] })];
  const mock = mockClient(compileResult(pages));
  const [result] = await compileDetail({ client: mock.client, model: 'gpt-6.1-sol', fields: { ...fields, language: '无文字（纯视觉）' }, pages, materials });
  assert.match(result.prompt, /禁止新增文字、数字、标题/);
  assert.doesNotMatch(result.prompt, /让每一餐/);
  assert.match(result.prompt, /仅展示真实商品局部特写/);
  assert.match(result.prompt, /允许裁切和放大/);
});

test('invalid plans fail visibly before generation rather than dropping sources or accepting invented references', async () => {
  const invalidPlans = [
    { ...planResult(), materialRoles: [] },
    { ...planResult(), pages: [page('bad', { referenceIds: ['wrong'] })] },
    { ...planResult(), strategy: { audience: '买家' } },
  ];
  for (const plan of invalidPlans) {
    const mock = mockClient(plan);
    await assert.rejects(() => planDetail({ client: mock.client, model: 'gpt-6.1-sol', fields, materials }), error => error.status === 502);
  }
});

test('no-product material pages keep only safe sample/style references and use classified roles during planning', async()=>{
  const plan=planResult();
  plan.materialRoles[1].role='material';
  plan.pages=[page('sample',{referenceIds:['fabric'],visual:{presence:'none',background:'浅色',composition:'材质样片说明',shot:'俯拍'}})];
  const result=await planDetail({client:mockClient(plan).client,model:'test',fields,materials});
  assert.deepEqual(result.pages[0].referenceIds,['fabric']);
  const classified={images:materials.images.map(image=>({...image,role:image.referenceId==='fabric'?'material':'primary'}))};
  assert.deepEqual(validateDetailPages(result.pages,classified)[0].referenceIds,['fabric']);
  assert.throws(()=>validateDetailPages([{...result.pages[0],referenceIds:['front']}],classified),/材质样片或风格参考/);
  const compiled=await compileDetail({client:mockClient(compileResult(result.pages)).client,fields,pages:result.pages,materials:classified});
  assert.match(compiled[0].prompt,/用途 material/);
});

test('design identity, material coverage and immutable crop are attached to the correct compiled page',async()=>{
  const designSystem={palette:'#123456 和暖白',typography:'三级中文层级',titlePlacement:'上部固定标题区',spacing:'边距 6%',components:'圆角说明卡',decorations:'细分隔线',lightMood:'柔和暖调'};
  const pages=[page('material',{referenceIds:['fabric'],referenceCrops:{fabric:{x:0,y:0,width:.5,height:.5}},visual:{presence:'detail',background:'暖白',composition:'真实面料特写',shot:'微距'}})];
  const materialCoverage=[{name:'棉',part:'面料',evidence:'用户确认面料为棉',enabled:true,pageIds:['material']}];
  const compiled=await compileDetail({client:mockClient(compileResult(pages)).client,fields,pages,materials,designSystem,materialCoverage});
  assert.match(compiled[0].prompt,/#123456/);assert.match(compiled[0].prompt,/上部固定标题区/);
  assert.match(compiled[0].prompt,/用户确认面料为棉/);assert.match(compiled[0].prompt,/"width":0.5/);
  assert.match(compiled[0].prompt,/不能又变成以完整商品为主视觉的海报/);
});


test('supplementary art direction survives submission, output mapping and compilation without rewriting copy', async () => {
  const original = page('direction', { prompt: '画面右上角保留留白。\n用柔和侧光；不要加装饰边框。' });
  const checked = validateDetailPages([original], materials);
  assert.equal(checked[0].prompt, original.prompt);
  assert.equal(detailOutputs(checked)[0].prompt, original.prompt);
  const mock = mockClient(compileResult(checked));
  const [compiled] = await compileDetail({ client: mock.client, model: 'gpt-6.1-sol', fields, pages: checked, materials });
  assert.ok(mock.calls[0].input[0].content[0].text.includes(JSON.stringify(original.prompt)));
  assert.ok(compiled.prompt.includes(original.prompt));
  assert.ok(compiled.prompt.includes(JSON.stringify({ title: original.title, subtitle: original.subtitle, body: original.body })));
  assert.throws(() => validateDetailPages([page('large', { prompt: 'x'.repeat(3001) })], materials), /补充画面要求/);
});

test('detail pages with only whole-product references need a crop before compilation, while drafts remain editable', async () => {
  for (const role of ['primary', 'back', 'specification', 'style', 'variant', 'other']) {
    const selected = { images: materials.images.map(image => image.referenceId === 'front' ? { ...image, role } : image) };
    const pages = [page('overview', { referenceIds: ['front'] }), page('close-up', {
      title: '原生木浆', referenceIds: ['front'], referenceCrops: {},
      visual: { presence: 'detail', background: '浅灰', composition: '纸面局部', shot: '近摄' },
    })];
    assert.doesNotThrow(() => validateDetailPages(pages, selected), 'planning does not require users to crop before seeing their draft');
    const original = structuredClone(pages), mock = mockClient(compileResult(pages));
    await assert.rejects(compileDetail({ client: mock.client, fields, pages, materials: selected }), candidate => {
      assert.equal(candidate.status, 400); assert.equal(candidate.code, 'DETAIL_CROP_REQUIRED');
      assert.equal(candidate.pageId, 'close-up'); assert.equal(candidate.pageIndex, 1);
      assert.match(candidate.message, /第 2 屏“原生木浆”/);
      assert.match(candidate.message, /框选/); assert.match(candidate.message, /补拍局部照片/);
      return true;
    });
    assert.equal(mock.calls.length, 0, 'a missing crop does not dispatch the text compiler');
    assert.deepEqual(pages, original, 'the draft and any existing prompts remain untouched');
  }
});

test('a selected valid crop or explicitly classified detail/material source permits generation', async () => {
  const visual = { presence: 'detail', background: '白底', composition: '真实局部', shot: '近摄' };
  const cropped = [page('cropped', { visual, referenceIds: ['front'], referenceCrops: { front: { x: .1, y: .2, width: .4, height: .3 } } })];
  assert.equal(validateDetailGenerationReadiness(cropped, materials), cropped);
  const cropMock = mockClient(compileResult(cropped));
  const [compiled] = await compileDetail({ client: cropMock.client, fields, pages: cropped, materials });
  assert.equal(cropMock.calls.length, 1);
  assert.match(compiled.prompt, /已确认局部框选，不可改写/);
  assert.match(compiled.prompt, /"x":0.1/); assert.match(compiled.prompt, /不更换裁切区域/);
  assert.doesNotMatch(compiled.prompt, /不要求用户再次框选/);

  for (const role of ['detail', 'material']) {
    const dedicated = { images: materials.images.map(image => image.referenceId === 'front' ? { ...image, role } : image) };
    const pages = [page(role, { visual, referenceIds: ['front'], referenceCrops: {} })];
    assert.equal(validateDetailGenerationReadiness(pages, dedicated), pages);
    const mock = mockClient(compileResult(pages));
    const [result] = await compileDetail({ client: mock.client, fields, pages, materials: dedicated });
    assert.equal(mock.calls.length, 1);
    assert.match(result.prompt, /使用已选的专门细节照片或材质样片，不要求用户再次框选/);
    assert.doesNotMatch(result.prompt, /已确认局部框选，不可改写/);
    assert.doesNotMatch(result.prompt, /框选[^\n]*\n\{\}/);
    assert.match(mock.calls[0].input[0].content[0].text, /为空时不是缺少必填坐标/);
  }
});

test('invalid or unselected crops cannot satisfy generation readiness', () => {
  const visual = { presence: 'detail', background: '白底', composition: '真实局部', shot: '近摄' };
  for (const referenceCrops of [
    { fabric: { x: 0, y: 0, width: .5, height: .5 } },
    { front: { x: 0, y: 0, width: 0, height: .5 } },
    { front: { x: .8, y: 0, width: .5, height: .5 } },
    { front: { x: '0', y: 0, width: .5, height: .5 } },
  ]) assert.throws(() => validateDetailGenerationReadiness([page('bad-crop', { visual, referenceIds: ['front'], referenceCrops })], materials), candidate => candidate.status === 400);
  assert.throws(() => validateDetailGenerationReadiness([page('foreign', { visual, referenceIds: ['unknown'] })], materials), /不属于本任务/);
});

test('full and no-product pages do not acquire an empty immutable crop requirement', async () => {
  const pages = [page('full', { referenceIds: ['front'], referenceCrops: {} }),
    page('information', { referenceIds: [], referenceCrops: {}, visual: { presence: 'none', background: '暖白', composition: '信息说明', shot: '平面' } })];
  assert.equal(validateDetailGenerationReadiness(pages, materials), pages);
  const mock = mockClient(compileResult(pages));
  const compiled = await compileDetail({ client: mock.client, fields, pages, materials });
  for (const item of compiled) {
    assert.match(item.prompt, /本屏未设置局部框选/);
    assert.doesNotMatch(item.prompt, /已确认局部框选，不可改写/);
    assert.doesNotMatch(item.prompt, /框选[^\n]*\n\{\}/);
  }
});

test('readiness uses confirmed metadata without rewriting historical frozen prompts or guessing image quality', () => {
  const historicalPrompt = '【已确认局部框选，不可改写】\n{}。历史冻结内容。'.repeat(100);
  const dedicated = { images: [{ referenceId: 'confirmed-close-up', role: 'detail', buffer: Buffer.from('not-decoded-by-readiness') }] };
  const pages = [page('historical', { referenceIds: ['confirmed-close-up'], prompt: historicalPrompt,
    visual: { presence: 'detail', background: '白底', composition: '真实局部', shot: '近摄' } })];
  assert.equal(validateDetailGenerationReadiness(pages, dedicated), pages);
  assert.equal(pages[0].prompt, historicalPrompt, 'checking dispatch prerequisites never regenerates or edits frozen prompts');
  const noImages = [page('text-only', { referenceIds: [], visual: { presence: 'detail', background: '白底', composition: '文字说明', shot: '平面' } })];
  assert.doesNotThrow(() => validateDetailGenerationReadiness(noImages, { images: [] }));
});
