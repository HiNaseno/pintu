import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../china-workflow.js', import.meta.url), 'utf8');
const material = (id, overrides = {}) => ({ referenceId: id, sourceName: '同名图片.jpg', sourceKind: 'upload', role: 'primary', ...overrides });
function harness() {
  const values = new Map();
  let serial = 0;
  const context = vm.createContext({
    structuredClone,
    state: { job: { id: 'job-1', workflowVersion: 2, materials: [material('photo-a'), material('photo-b')] }, jobConfig: { mode: 'detail' } },
    newRequestId: () => `stable-page-${++serial}`,
    sessionStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) },
  });
  vm.runInContext(source.slice(source.indexOf('const detailMaterialRoles ='), source.indexOf('const detailElement =')), context);
  return { context, run: code => vm.runInContext(code, context), values };
}

test('new detail schema survives plan conversion with stable page IDs and ordered references', () => {
  const h = harness();
  h.context.page = { pageId: 'existing-page', title: '材质', subtitle: '看得见的细节', body: '用户确认的原文', buyerQuestion: '面料怎么样？', facts: ['棉布'], referenceIds: ['photo-b', 'photo-a'], visual: { presence: 'detail', background: '灰白色' }, prompt: '补充灯光要求' };
  const copy = h.run('copyDetailOutput(page)');
  h.context.pages = [copy];
  const plan = h.run('detailPlanFromOutputs(pages)')[0];
  assert.equal(plan.recommendedCount, 1);
  assert.equal(plan.items[0].pageId, 'existing-page');
  assert.equal(plan.items[0].body, h.context.page.body);
  assert.equal(plan.items[0].buyerQuestion, h.context.page.buyerQuestion);
  assert.deepEqual([...plan.items[0].referenceIds], ['photo-b', 'photo-a']);
  assert.equal(plan.items[0].promptHint, '补充灯光要求');
  plan.items[0].referenceIds.pop();
  assert.equal(copy.referenceIds.length, 2, 'plan editing must not mutate the page reference array');
});

test('reference selection is limited to six and no-product references survive until role validation', () => {
  const h = harness();
  h.context.page = { referenceIds: ['a', 'a', 'b', 'c', 'd', 'e', 'f', 'g'], visual: { presence: 'full' } };
  assert.deepEqual([...h.run('copyDetailOutput(page).referenceIds')], ['a', 'b', 'c', 'd', 'e', 'f']);
  h.context.page.visual.presence = 'none';
  assert.equal(h.run('copyDetailOutput(page).referenceIds.length'), 6, 'material/style references must not be blindly discarded');
});

test('loading a confirmed script preserves exact copy without shortening long fields', () => {
  const h = harness();
  h.context.page = { title: '标'.repeat(240), subtitle: '副'.repeat(500), body: '文'.repeat(3000), facts: ['实'.repeat(1000)] };
  const copied = h.run('copyDetailOutput(page)');
  for (const field of ['title', 'subtitle', 'body']) assert.equal(copied[field], h.context.page[field]);
  assert.equal(copied.facts[0], h.context.page.facts[0]);
});

test('pending proposal edits restore by job identity and never bind same-name materials together', () => {
  const h = harness();
  h.context.analysis = { strategy: { audience: '家庭用户', purchaseReason: '实用', readingFlow: ['场景', '细节'] }, outputs: [{ pageId: 'first', title: '原标题', referenceIds: ['photo-b'] }] };
  h.run('initDetailDraft(analysis)');
  assert.equal(h.context.state.detailDraft.strategy.readingFlow, '场景 → 细节');
  h.context.state.detailDraft.outputs[0].title = '用户已编辑标题';
  h.context.state.detailDraft.materials[1].role = 'detail';
  h.run('saveDetailDraft()');
  delete h.context.state.detailDraft;
  h.run('initDetailDraft(analysis)');
  assert.equal(h.context.state.detailDraft.outputs[0].title, '用户已编辑标题');
  assert.equal(h.context.state.detailDraft.materials[0].role, 'primary');
  assert.equal(h.context.state.detailDraft.materials[1].role, 'detail');
  h.context.state.job.id = 'job-2';
  h.run('initDetailDraft(analysis)');
  assert.equal(h.context.state.detailDraft.outputs[0].title, '原标题');
});

test('restored references are scoped to material IDs exposed by the active job', () => {
  const h = harness();
  h.context.analysis = { outputs: [{ title: '细节', referenceIds: ['photo-b', 'other-job-file'] }] };
  h.run('initDetailDraft(analysis)');
  assert.deepEqual([...h.context.state.detailDraft.outputs[0].referenceIds], ['photo-b']);
  const id = h.context.state.detailDraft.outputs[0].pageId;
  h.run('saveDetailDraft()'); delete h.context.state.detailDraft; h.run('initDetailDraft(analysis)');
  assert.equal(h.context.state.detailDraft.outputs[0].pageId, id);
});

test('legacy tasks and non-detail modes retain their original interface', () => {
  const h = harness();
  assert.equal(h.run('isDetailV2()'), true);
  h.context.state.job.workflowVersion = undefined;
  assert.equal(h.run('isDetailV2()'), false);
  h.context.state.job.workflowVersion = 2; h.context.state.jobConfig.mode = 'main';
  assert.equal(h.run('isDetailV2()'), false);
});

test('reordering and deleting pages keep scripts and reference order attached to page IDs', () => {
  const h = harness();
  h.context.state.detailDraft = { outputs: [{ pageId: 'a', title: '甲', referenceIds: ['photo-a', 'photo-b'] }, { pageId: 'b', title: '乙', referenceIds: ['photo-b'] }] };
  Object.assign(h.context, { captureDetailOutputs: () => structuredClone(h.context.state.detailDraft.outputs), renderDetailPages() {}, focusDetailPage() {} });
  const start = source.indexOf('const mutateDetailPages =');
  vm.runInContext(source.slice(start, source.indexOf('document.querySelector(".detail-add-page")', start)), h.context);
  h.run('mutateDetailPages("page-up", "b")');
  assert.equal(h.context.state.detailDraft.outputs[0].title, '乙');
  h.run('mutateDetailPages("reference-up", "a", "photo-b")');
  assert.deepEqual(h.context.state.detailDraft.outputs[1].referenceIds, ['photo-b', 'photo-a']);
  h.run('mutateDetailPages("page-delete", "b")');
  h.run('mutateDetailPages("page-delete", "a")');
  assert.equal(h.context.state.detailDraft.outputs.length, 1);
  assert.equal(h.context.state.detailDraft.outputs[0].pageId, 'a');
});

test('compilation status is distinguished from the image queue', () => {
  const context = vm.createContext({ state: { refinePending: false } });
  vm.runInContext(source.slice(source.indexOf('const executionWaiting ='), source.indexOf('const taskNotice =')), context);
  vm.runInContext(source.slice(source.indexOf('const generationStatusCopy ='), source.indexOf('const pollJob =')), context);
  context.job = { workflowVersion: 2, compilation: { status: 'running' }, generationItems: [{ status: 'queued' }] };
  assert.match(vm.runInContext('generationStatusCopy(job)', context), /正在编写生图指令/);
  context.job.compilation.status = 'completed';
  assert.match(vm.runInContext('generationStatusCopy(job)', context), /已完成 0\/1/);
  context.job.status = 'reconciling';
  assert.match(vm.runInContext('generationStatusCopy(job)', context), /请联系管理员核对.*不重复生成/);
  context.job.status = 'failed';
  context.job.generationItems[0] = { status: 'failed', error: { code: 'ENGINE_RESULT_UNKNOWN' } };
  assert.match(vm.runInContext('generationStatusCopy(job)', context), /请联系管理员核对/);
  assert.doesNotMatch(vm.runInContext('generationStatusCopy(job)', context), /待重试/);
  context.job.generationItems[0] = { status: 'completed' };
  context.job.error = { code: 'ENGINE_RESULT_UNKNOWN' };
  assert.match(vm.runInContext('generationStatusCopy(job)', context), /请联系管理员核对/);
});

function confirmationHarness(outputs) {
  const requests = [];
  const context = vm.createContext({
    structuredClone,
    rewriteState: {},
    state: { job: { id: 'frozen-task', analysis: {} }, detailDraft: { strategy: { audience: '已确认人群' }, materials: [] } },
    isDetailV2: () => true, taskIsBusy: () => false, executionTaskPending:()=>false,
    editedOutputs: () => outputs, editedOutputPlan: () => [{ recommendedCount: outputs.length }],
    analysisPatch: () => ({}), planTotalCount: () => outputs.length,
    document: { querySelector: () => ({ focus() {} }) },
    setDetailNotice: message => { context.notice = message; },
    rememberJob() {}, syncTaskControls() {}, showProcessing() {},
    confirmGenerateButton: {}, pollJob: async () => {},
    apiRequest: async (url, options) => { requests.push({ url, options }); return {}; },
  });
  vm.runInContext(source.slice(source.indexOf('const confirmGeneration ='), source.indexOf('const retryDetailCompilation =')), context);
  return { context, requests, run: () => vm.runInContext('confirmGeneration()', context) };
}
test('pure-visual scripts can submit empty title and body while retaining the strategy', async () => {
  const h = confirmationHarness([{ pageId: 'page', title: '', subtitle: '', body: '', buyerQuestion: '展示什么材质？', visual: { presence: 'none' }, referenceIds: [] }]);
  await h.run();
  assert.equal(h.requests.length, 1);
  const payload = JSON.parse(h.requests[0].options.body);
  assert.equal(payload.outputs[0].title, '');
  assert.equal(payload.strategy.audience, '已确认人群');
});
test('a new page without a buyer question gives an actionable message before submitting', async () => {
  const h = confirmationHarness([{ pageId: 'page', title: '已填写标题', buyerQuestion: ' ', visual: { presence: 'full' }, referenceIds: [] }]);
  await h.run();
  assert.equal(h.requests.length, 0);
  assert.match(h.context.notice, /第 1 屏.*买家问题/);
});
test('compilation retry addresses the submitted task without posting draft fields', async () => {
  const requests = [];
  const context = vm.createContext({
    state: { job: { id: 'frozen-task' } }, draft: { mode: 'sku', requirements: '下一任务' },
    taskIsBusy: () => false, executionTaskPending:()=>false, syncTaskControls() {}, retryButton: {}, showProcessing() {},
    rememberJob() {}, pollJob: async () => {},
    apiRequest: async (url, options) => { requests.push({ url, options }); return {}; },
  });
  vm.runInContext(source.slice(source.indexOf('const retryDetailCompilation ='), source.indexOf('const retryGenerationItem =')), context);
  await vm.runInContext('retryDetailCompilation()', context);
  assert.equal(requests[0].url, '/api/jobs/frozen-task/compile/retry');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.body, undefined);
});
