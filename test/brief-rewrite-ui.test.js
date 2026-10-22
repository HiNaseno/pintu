import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../china-workflow.js', import.meta.url), 'utf8');
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
function element() { return { hidden: false, disabled: false, textContent: '', value: '', querySelector: () => element(), setAttribute() {} }; }

test('question preparation hides both answer and summary controls; completed questions restore them', () => {
  const nodes = new Map(['.brief-compose', '.brief-summary-field', '.brief-questions', '.brief-loading', '.brief-retry', '.brief-back-task'].map(key => [key, element()]));
  const skip = element();
  const context = vm.createContext({
    briefState: { busy: false, data: { phase: 'analyzing', pending: true } }, state: {},
    briefPanel: { querySelector: key => nodes.get(key), querySelectorAll: () => [skip], setAttribute() {} },
    directButton: {}, actionButton: {}, taskIsBusy: () => false,
  });
  vm.runInContext(extract('const briefPhaseBusy =', 'const clearBriefPoll ='), context);
  vm.runInContext(extract('function renderBrief()', 'const renderProductProfile ='), context);
  vm.runInContext('renderBrief()', context);
  assert.equal(nodes.get('.brief-compose').hidden, true);
  assert.equal(nodes.get('.brief-summary-field').hidden, true);
  assert.equal(skip.disabled, false, 'the saved materials can still be used to skip questions');
  assert.equal(nodes.get('.brief-loading').hidden, false);
  context.briefState.data = { phase: 'awaiting_answer', pending: false };
  vm.runInContext('renderBrief()', context);
  assert.equal(nodes.get('.brief-compose').hidden, false);
  assert.equal(nodes.get('.brief-summary-field').hidden, false);
  context.briefState.data = { phase: 'created', pending: false, productProfile: null, messages: [] };
  vm.runInContext('renderBrief()', context);
  assert.equal(nodes.get('.brief-compose').hidden, true);
  assert.equal(nodes.get('.brief-summary-field').hidden, true);
  context.briefState.data.messages = [{ role: 'user', text: '旧会话回答' }];
  vm.runInContext('renderBrief()', context);
  assert.equal(nodes.get('.brief-compose').hidden, false, 'legacy conversation without a profile must remain usable');
});

test('restoring a newly created brief resumes recognition exactly once, while active tasks and history take priority', async () => {
  async function scenario({ history = [], taskBusy = false, pauseGet = false } = {}) {
    const requests = [];
    let resolveGet;
    const context = vm.createContext({
      briefState: {}, state: taskBusy ? { job: { id: 'running-job' } } : {}, BRIEF_KEY: 'brief',
      briefInput: {}, briefSummary: {}, briefStatus: {},
      sessionStorage: { getItem: () => JSON.stringify({ id: 'created-brief', active: true }) },
      taskIsBusy: () => taskBusy, renderBrief() {}, renderTaskSummary() {}, saveBriefReference() {},
      setResultView: view => { context.view = view; }, setDraftNotice() {},
      window: { setTimeout() {} }, pollBrief() {},
      apiRequest: async url => {
        requests.push({ method: 'GET', url });
        if (pauseGet) await new Promise(resolve => { resolveGet = resolve; });
        return { id: 'created-brief', phase: 'created', pending: false, productProfile: null, messages: history };
      },
      showBrief: data => { context.briefState.data = data; },
      analyzeBrief: async () => { requests.push({ method: 'POST', url: '/api/briefs/created-brief/analyze' }); },
    });
    vm.runInContext(extract('const briefPhaseBusy =', 'const clearBriefPoll ='), context);
    vm.runInContext(extract('const restoreBrief =', "briefPanel.querySelector('.brief-send')"), context);
    const first = vm.runInContext('restoreBrief()', context);
    if (pauseGet) { await vm.runInContext('restoreBrief()', context); resolveGet(); }
    await first;
    return { requests, context };
  }
  const fresh = await scenario({ pauseGet: true });
  assert.deepEqual(fresh.requests.map(request => request.method), ['GET', 'POST']);
  assert.equal(fresh.context.view, 'brief');
  assert.equal(fresh.context.briefState.restoreInFlight, false);
  const old = await scenario({ history: [{ role: 'user', text: '历史回答' }] });
  assert.deepEqual(old.requests.map(request => request.method), ['GET']);
  const busy = await scenario({ taskBusy: true });
  assert.deepEqual(busy.requests.map(request => request.method), ['GET']);
  assert.equal(busy.context.view, undefined);
});

test('a running image or rewrite task blocks opening another brief without changing its view', async () => {
  let viewChanges = 0;
  const context = vm.createContext({ taskIsBusy: () => true, briefState: { busy: false }, setResultView: () => viewChanges++ });
  vm.runInContext(extract('const startBrief =', 'const restoreBrief ='), context);
  await vm.runInContext('startBrief()', context);
  assert.equal(viewChanges, 0);
});

test('profile citations show material names and page numbers without exposing internal UUIDs', () => {
  const context = vm.createContext({});
  vm.runInContext(extract('const readableProfileText =', 'const renderProductProfile ='), context);
  context.profile = { sources: [{ referenceId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', sourceName: '产品说明.pdf', sourceKind: 'pdf_page', ordinal: 2 }] };
  const readable = vm.runInContext('readableProfileText("银色杯身。来源：参考图编号 aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", profile)', context);
  assert.match(readable, /产品说明\.pdf 第 2 页/);
  assert.doesNotMatch(readable, /aaaaaaaa|参考图编号/);
});

test('brief creation invokes analysis without inserting an artificial user message', async () => {
  const requests = [];
  const context = vm.createContext({
    taskIsBusy: () => false, briefPhaseBusy: () => false,
    briefState: { data: null, busy: false }, draft: { files: [{}] },
    briefInput: {}, briefSummary: {}, briefStatus: {}, briefPanel: { querySelector: () => ({ replaceChildren() {} }) },
    clearBriefPoll() {}, setResultView() {}, renderTaskSummary() {}, renderBrief() {}, renderProductProfile() {}, setDraftNotice() {}, buildAnalyzeForm: () => ({}),
    apiRequest: async (url, options) => { requests.push({ url, options }); return { id: 'brief' }; },
    showBrief: data => { context.briefState.data = data; },
    analyzeBrief: async () => { requests.push({ url: '/api/briefs/brief/analyze' }); },
  });
  vm.runInContext(extract('const startBrief =', 'const restoreBrief ='), context);
  await vm.runInContext('startBrief()', context);
  assert.deepEqual(requests.map(request => request.url), ['/api/briefs', '/api/briefs/brief/analyze']);
});

test('uploaded materials replace the large dropzone with a capped add action and last removal restores it', () => {
  const context = vm.createContext({
    draft: { files: [] }, clearObjectUrls() {}, uploadPreviews: { textContent: '', append() {} },
    document: { createElement: () => ({ dataset: {}, append() {}, setAttribute() {} }), querySelector: () => context.support },
    uploadCount: {}, dropzone: {}, uploadSubtitle: {}, support: {}, uploadAddButton: {}, uploadCard: { classList: { toggle() {} } },
  });
  vm.runInContext(extract('const renderUploads =', 'const addFiles ='), context);
  context.draft.files = Array.from({ length: 6 }, (_, i) => ({ name: `${i}.txt`, size: 200 }));
  vm.runInContext('renderUploads()', context);
  assert.equal(context.dropzone.hidden, true);
  assert.equal(context.uploadSubtitle.hidden, true);
  assert.equal(context.support.hidden, true);
  assert.equal(context.uploadAddButton.hidden, false);
  assert.equal(context.uploadAddButton.disabled, true);
  context.draft.files = [];
  vm.runInContext('renderUploads()', context);
  assert.equal(context.dropzone.hidden, false);
  assert.equal(context.support.hidden, false);
  assert.equal(context.uploadAddButton.hidden, true);
});

function revisionHarness() {
  let snapshot = { outputs: [{ pageId: 'page-a', prompt: '原始补充要求', body: '原文', visual: { presence: 'none', background: '原背景', composition: '原构图', shot: '平面' } }] };
  const context = vm.createContext({
    state: { job: { analysis: { outputs: snapshot.outputs } }, detailDraft: {} },
    rewriteState: { sourceFingerprint: JSON.stringify(snapshot) },
    collectConfirmationSnapshot: () => structuredClone(snapshot), confirmationFingerprint: JSON.stringify,
    isDetailV2: () => true, renderDetailPages() {}, renderOutputList() {}, saveRewriteDraft() {}, renderRewriteControls() {},
  });
  vm.runInContext(extract('const applyPromptRevision =', 'const rewritePrompts ='), context);
  return { context, run: revision => { context.job = { promptRevision: revision }; vm.runInContext('applyPromptRevision(job)', context); }, edit: body => { snapshot.outputs[0].body = body; } };
}
test('successful rewrite synchronizes visual choices but never expands supplemental prompts recursively', () => {
  const h = revisionHarness();
  h.run({ requestId: 'revision-1', appliedRequestId: 'revision-1', status: 'completed', pages: [{ pageId: 'page-a', prompt: '完整生图指令', visual: { presence: 'full', background: '新背景', composition: '新构图', shot: '平面' } }] });
  const output = h.context.state.job.analysis.outputs[0];
  assert.equal(output.visual.background, '新背景');
  assert.equal(output.visual.presence, 'none');
  assert.equal(output.prompt, '原始补充要求');
  assert.equal(h.context.rewriteState.result.pages[0].prompt, '完整生图指令');
});

test('a late rewrite response preserves edits made after submission', () => {
  const h = revisionHarness(); h.edit('刚修改的精确正文');
  h.run({ requestId: 'revision-1', status: 'completed', pages: [{ pageId: 'page-a', prompt: '基于旧稿的完整指令', visual: { background: '服务器背景' } }] });
  assert.equal(h.context.state.job.analysis.outputs[0].body, '刚修改的精确正文');
  assert.equal(h.context.state.job.analysis.outputs[0].visual.background, '原背景');
  assert.equal(h.context.rewriteState.conflict, true);
});

test('failed revision retains the previous successful prompt preview and generation ID', () => {
  const h = revisionHarness();
  h.run({ requestId: 'revision-2', appliedRequestId: 'revision-1', status: 'failed', error: { message: '重试失败' }, pages: [{ pageId: 'page-a', prompt: '上一成功稿' }] });
  assert.equal(h.context.rewriteState.appliedRequestId, 'revision-1');
  assert.equal(h.context.rewriteState.result.pages[0].prompt, '上一成功稿');
  assert.equal(h.context.rewriteState.error, '重试失败');
});

test('legacy plan rebuild preserves stable IDs and the exact multiline prompt', () => {
  const context = vm.createContext({ newRequestId: () => 'new-page', planDefinitions: { main: { typeLabel: '商品主图' } }, state: { jobConfig: { language: '中文（简体）' } } });
  vm.runInContext(extract('const outputFromPlanItem =', 'const outputsFromPlan ='), context);
  context.item = { pageId: 'stable-page', title: '原题', promptHint: '旧摘要' };
  context.previous = { pageId: 'stable-page', title: '指定标题', prompt: `  第一行\n${'正文'.repeat(3000)}\n  ` };
  const output = vm.runInContext('outputFromPlanItem({type:"main"},item,0,previous)', context);
  assert.equal(output.pageId, 'stable-page');
  assert.equal(output.prompt, context.previous.prompt);
});
