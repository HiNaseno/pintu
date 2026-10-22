import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../china-workflow.js', import.meta.url), 'utf8');
function harness(apiRequest) {
  const storage = () => { const data = new Map(); return { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) }; };
  const button = () => ({ disabled: false });
  const brand = { generating: false, classList: { toggle: (name, enabled) => { brand.generating = enabled; } } };
  const context = vm.createContext({
    brand,
    draft: { mode: 'main' }, renderTaskSummary() {}, renderBrief() {},
    state: { job: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', status: 'generating' }, mode: 'main', view: 'gallery', requestBusy: false, restoring: false, refineSubmitting: false },
    modeButtons: [button(),button()], actionButton: button(), reanalyzeButton: button(), resetButton: button(),
    document: { createElement: () => ({ setAttribute() {} }), querySelector: selector => selector === '.brand' ? brand : ({ after() {} }) },
    sessionStorage: storage(), localStorage: storage(), URL, AbortSignal,
    location: { href: 'http://localhost/china-workflow.html' }, history: { replaceState() {} },
    apiRequest, clearPoll() {}, renderAnalysis() {}, renderResultGallery() {}, showProcessing() {},
    generationStatusCopy: () => '', updateProgress() {}, showError() {}, resetJob() {},
    window: { setTimeout: (fn,ms) => { context.scheduled = { fn, ms }; return 1; } },
    setResultView: view => { context.state.view = view; },
  });
  vm.runInContext(source.slice(source.indexOf('const TASK_STORAGE_KEY'), source.indexOf('const apiRequest =')), context);
  vm.runInContext(source.slice(source.indexOf('const pollJob ='), source.indexOf('const confirmGeneration =')), context);
  return { context, run: expr => vm.runInContext(expr, context) };
}
test('running task is persisted while draft mode controls stay enabled', async () => {
  const h = harness(async () => ({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', status: 'generating', generationItems: [{}] }));
  await h.run('pollJob()');
  assert.equal(h.context.modeButtons.every(b => !b.disabled), true);
  assert.equal(h.context.resetButton.disabled, true);
  assert.equal(h.context.brand.generating, true);
  assert.match(h.context.localStorage.getItem('pintu.active-task.v1'), /aaaaaaaa/);
  assert.equal(h.context.scheduled.ms,1500);
});
test('temporary GET failure retains task and schedules GET retry without submission', async () => {
  const requests=[];
  const h = harness(async (url, options) => { requests.push({url,options}); throw new Error('offline'); });
  await h.run('pollJob()');
  assert.equal(h.context.state.job.status,'generating');
  assert.equal(h.context.state.view,'gallery');
  assert.equal(h.context.scheduled.ms,3000);
  await h.context.scheduled.fn();
  assert.equal(requests.length,2);
  assert.ok(requests.every(r => !r.options.method));
});
test('background polling keeps editor open', async () => {
  const h = harness(async () => ({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', status:'generating', generationItems:[{}] }));
  h.context.state.view='editor';
  await h.run('pollJob()');
  assert.equal(h.context.state.view,'editor');
});
test('completion unlocks controls and stops scheduled polling', async () => {
  const h = harness(async () => ({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', status:'completed', results:[{}] }));
  await h.run('pollJob()');
  assert.equal(h.context.actionButton.disabled,false);
  assert.equal(h.context.brand.generating,false);
  assert.equal(h.context.scheduled,undefined);
});
test('expired task clears persisted reference', async () => {
  const h = harness(async () => { throw Object.assign(new Error('missing'), {status:404}); });
  h.run('rememberJob(state.job)');
  await h.run('pollJob()');
  assert.equal(h.context.state.job,null);
  assert.equal(h.context.localStorage.getItem('pintu.active-task.v1'),undefined);
});
test('concurrent polls are coalesced', async () => {
  let resolve, calls=0;
  const h = harness(() => {calls++;return new Promise(r => {resolve=r;});});
  const first=h.run('pollJob()');
  await h.run('pollJob()');
  assert.equal(calls,1);
  resolve({id:h.context.state.job.id,status:'completed',results:[]});
  await first;
});

test('polling retains submitted configuration independently of draft mode', async () => {
  const h = harness(async () => ({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', status: 'generating' }));
  h.context.state.jobConfig = { mode: 'main', language: 'English' };
  h.context.draft.mode = 'detail';
  await h.run('pollJob()');
  const saved = JSON.parse(h.context.sessionStorage.getItem('pintu.active-task.v1'));
  assert.equal(saved.mode, 'main');
  assert.equal(saved.config.language, 'English');
  assert.equal(h.context.draft.mode, 'detail');
});
test('confirmation uses submitted language instead of the next draft', () => {
  const h = harness(async () => ({}));
  Object.assign(h.context, {
    collectSellingPoints: () => [], currentSelectedStyle: () => ({}),
    languageSelect: { value: 'English' }
  });
  h.context.state.jobConfig = {language:'无文字（纯视觉）'};
  vm.runInContext(source.slice(source.indexOf('const analysisPatch ='), source.indexOf('const planDefinitions =')), h.context);
  assert.equal(h.run('analysisPatch().language'), '无文字（纯视觉）');
});

test('submission IDs work on LAN HTTP without randomUUID',async()=>{
 const {webcrypto}=await import('node:crypto');
 const ctx=vm.createContext({crypto:{getRandomValues:array=>webcrypto.getRandomValues(array)},Uint8Array});
 vm.runInContext(source.slice(source.indexOf('const newRequestId ='),source.indexOf('const briefState =')),ctx);
 assert.match(vm.runInContext('newRequestId()',ctx),/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});

test('full confirmed output prompt takes priority over abbreviated plan hint', () => {
 const context=vm.createContext({newRequestId:()=> 'page-id',planDefinitions:{detail:{typeLabel:'详情页'}},state:{jobConfig:{language:'中文（简体）'}}});
 vm.runInContext(source.slice(source.indexOf('const outputFromPlanItem ='), source.indexOf('const outputsFromPlan =')),context);
 context.plan={type:'detail'};context.item={title:'说明',promptHint:'仅放用户指定文案'};context.previous={prompt:'正文必须逐字写：产品信息及使用方式，请以实物标识与随附说明为准。'};
 assert.equal(vm.runInContext('outputFromPlanItem(plan,item,0,previous).prompt',context),context.previous.prompt);
});

const pendingCases = [
  ['ENGINE_RESULT_UNKNOWN','需要核对原任务','请联系管理员核对原任务',/请联系管理员核对引擎记录和实际图片结果/],
];

test('unknown execution copy tells users to inspect the original result without rerunning',()=>{
  const h=harness(async()=>({}));
  for(const [code,title,short,expected] of pendingCases) {
    h.context.code=code;
    assert.equal(h.run('executionStatusCopy(code).title'),title);
    assert.equal(h.run('executionStatusCopy(code).short'),short);
    assert.match(h.run('executionStatusCopy(code).message'),expected);
    if(code==='ENGINE_BUSY')assert.doesNotMatch(h.run('executionStatusCopy(code).message'),/正在查询本张|查询原任务结果/);
  }
  assert.equal(h.run('executionStatusCopy(null)'),null);
  assert.equal(h.run('executionStatusCopy("ENGINE_NOT_STARTED")'),null);
});

test('completed state ignores historic pending errors and local pending refinements retain their own category',()=>{
  const h=harness(async()=>({}));
  h.context.finished={status:'completed',execution:{pending:false,code:'ENGINE_RESULT_UNKNOWN'},error:{code:'ENGINE_BUSY'},generationItems:[{status:'completed',error:{code:'ENGINE_RESULT_UNKNOWN'}}],refinementRequests:[{status:'completed',error:{code:'ENGINE_RESULT_UNKNOWN'}}]};
  assert.equal(h.run('executionPendingCode(finished)'),null);
  h.context.state.job=h.context.finished;
  h.context.state.refinePending=true;
  h.context.state.refinePendingCode='ENGINE_RESULT_UNKNOWN';
  assert.equal(h.run('executionTaskCopy().title'),'需要核对原任务');
  assert.match(h.run('executionTaskCopy().message'),/不重复生成/);
});

for(const [code,title,,expected] of pendingCases)test(`polling ${code} keeps read-only recovery and shows the appropriate action`,async()=>{
  const requests=[];
  const h=harness(async(url,options)=>{
    requests.push({url,options});
    return {id:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',status:'reconciling',execution:{pending:true,code},generationItems:[{status:'reconciling',error:{code}}]};
  });
  await h.run('pollJob()');
  assert.equal(h.context.scheduled.ms,5000);
  assert.match(h.run('taskNotice.textContent'),expected);
  assert.equal(h.run('executionTaskCopy().title'),title);
  assert.equal(h.run('taskIsBusy()'),true);
  assert.ok(requests.every(request=>!request.options.method),'waiting must not submit another generation request');
});

function fakeElement(tag) {
  return {tag,dataset:{},children:[],textContent:'',classList:{toggle(){}},setAttribute(){},
    append(...items){this.children.push(...items);},
    set innerHTML(value){this.html=value;this.textNodes={strong:{textContent:''},small:{textContent:''}};},
    get innerHTML(){return this.html || '';},
    querySelector(selector){return this.textNodes[selector];},
  };
}

test('queue cards use the same pending copy and display backend progress labels as text',()=>{
  const h=harness(async()=>({}));
  h.context.document.createElement=fakeElement;
  h.context.resultGrid=fakeElement('section');
  const start=source.indexOf('  const renderQueueCard =');
  vm.runInContext(source.slice(start,source.indexOf('\n  if (hasQueue)',start)),h.context);
  for(const [code,title,short,expected] of pendingCases) {
    h.context.queueItem={index:0,status:'reconciling',error:{code},title:'测试图片'};
    h.run('renderQueueCard(queueItem)');
    const card=h.context.resultGrid.children.at(-1),[visual,copy]=card.children;
    assert.equal(visual.querySelector('strong').textContent,title);
    assert.equal(visual.querySelector('small').textContent,short);
    assert.match(copy.children[2].textContent,expected);
    assert.equal(copy.children[3].children.length,0,'pending cards must not expose another generation action');
  }
  const label='<img src=x onerror=alert(1)>';
  h.context.queueItem={index:1,status:'queued',progressLabel:label,title:'另一张图片'};
  h.run('renderQueueCard(queueItem)');
  const visual=h.context.resultGrid.children.at(-1).children[0];
  assert.equal(visual.querySelector('small').textContent,label);
  assert.ok(!visual.innerHTML.includes(label),'backend text must never enter the card HTML template');
  h.context.state.job={status:'failed',execution:{pending:false},generationItems:[]};
  h.context.queueItem={index:2,status:'failed',error:{code:'ENGINE_RESULT_UNAVAILABLE',message:'原图片暂不可用',retryable:false},title:'原任务图片'};
  h.run('renderQueueCard(queueItem)');
  const unavailableCard=h.context.resultGrid.children.at(-1);
  assert.equal(unavailableCard.children[0].querySelector('strong').textContent,'原图片暂不可用');
  assert.equal(unavailableCard.children[1].children[3].children.length,0,'missing original output must not offer another generation action');
});

test('editor uses the shared pending instructions and keeps generation disabled until recovery finishes',()=>{
  const h=harness(async()=>({}));
  Object.assign(h.context,{chatInput:{value:'保留的修改要求'},activeResultIndexes:()=>[0],sendEditButton:fakeElement('button'),selectionStatus:fakeElement('p'),composerNote:fakeElement('p'),studioBatchNote:null});
  vm.runInContext(source.slice(source.indexOf('const updateEditControls ='),source.indexOf('const setProtectionVisible =')),h.context);
  for(const [code,title,,expected] of pendingCases) {
    h.context.state.job={status:'reconciling',execution:{pending:true,code},generationItems:[{status:'reconciling',error:{code}}]};
    h.run('updateEditControls()');
    assert.equal(h.context.sendEditButton.disabled,true);
    assert.equal(h.context.sendEditButton.textContent,title);
    assert.match(h.context.composerNote.textContent,expected);
  }
  h.context.state.job={status:'completed',results:[{}]};
  h.run('updateEditControls()');
  assert.equal(h.context.sendEditButton.disabled,false);
  assert.equal(h.context.sendEditButton.textContent,'发送修改');
  assert.equal(h.context.chatInput.value,'保留的修改要求');
});

function confirmationHarness({detail=true,outputs,materials,failure}={}) {
  const edited=outputs || [{pageId:'edited-page',title:'用户已修改的标题',body:'用户已修改的正文',prompt:'用户已修改的画面要求',buyerQuestion:'材质和使用方式是什么？',visual:{presence:'full'},referenceIds:['primary'],referenceCrops:{}}];
  const requests=[];
  const context=vm.createContext({
    structuredClone,rewriteState:{},
    state:{job:{id:'editable-job',status:'awaiting_confirmation',analysis:{outputs:[{title:'服务器原始标题'}]}},view:'confirm',requestBusy:false,
      detailDraft:{outputs:edited,materials:materials || [{referenceId:'primary',role:'primary',description:'完整商品',variant:''}],materialCoverage:[],strategy:{audience:'已确认人群'}}},
    isDetailV2:()=>detail,taskIsBusy:()=>false,executionTaskPending:()=>false,
    editedOutputs:()=>edited,editedOutputPlan:()=>[{recommendedCount:edited.length}],analysisPatch:()=>({}),planTotalCount:()=>edited.length,
    document:{querySelector:()=>({focus(){},scrollIntoView(){}})},focusDetailPage:id=>{context.focusedPage=id;},
    setDetailNotice:message=>{context.detailNotice=message;},setTaskNotice:message=>{context.taskNotice=message;},
    rememberJob:job=>{context.state.job=job;},syncTaskControls(){},confirmGenerateButton:{disabled:false},
    showProcessing:()=>{context.state.view='processing';},setResultView:view=>{context.state.view=view;},
    renderAnalysis:()=>{context.renderCalls=(context.renderCalls || 0)+1;edited[0].title='重建后的标题';},renderResultGallery(){},
    pollJob:async()=>{context.pollCalls=(context.pollCalls || 0)+1;},
    apiRequest:async(url,options)=>{
      requests.push({url,options});if(failure)throw failure;
      return {...context.state.job,status:'queued'};
    },
  });
  vm.runInContext(source.slice(source.indexOf('const executionStatusCopy ='),source.indexOf('const executionPendingCode =')),context);
  vm.runInContext(source.slice(source.indexOf('const confirmGeneration ='),source.indexOf('const retryDetailCompilation =')),context);
  return {context,requests,edited,run:()=>vm.runInContext('confirmGeneration()',context)};
}

test('missing close-up crop is caught before POST and preserves edited copy and confirmation state',async()=>{
  const outputs=[{pageId:'material-page',title:'用户确认的材质标题',body:'保留原有正文与标点！',prompt:'只展示真实局部',buyerQuestion:'材质如何？',visual:{presence:'detail'},referenceIds:['primary'],referenceCrops:{}}];
  const h=confirmationHarness({outputs,materials:[{referenceId:'primary',role:'primary'},{referenceId:'unused-closeup',role:'detail'}]});
  const before=JSON.stringify(h.context.state.detailDraft);
  await h.run();
  assert.equal(h.requests.length,0);
  assert.equal(h.context.pollCalls,undefined);
  assert.equal(h.context.renderCalls,undefined);
  assert.equal(h.context.state.view,'confirm');
  assert.equal(h.context.state.job.status,'awaiting_confirmation');
  assert.equal(JSON.stringify(h.context.state.detailDraft),before);
  assert.equal(h.context.focusedPage,'material-page');
  assert.match(h.context.detailNotice,/第 1 屏.*框选局部/);
  assert.equal(h.context.state.requestBusy,false);
});

test('close-up validation accepts selected detail photos, material samples and valid crops, while full and no-product pages need no crop',async()=>{
  for(const [presence,role,crops] of [
    ['detail','detail',{}],['detail','material',{}],['detail','primary',{primary:{x:.1,y:.1,width:.5,height:.5}}],['full','primary',{}],['none','material',{}],
  ]) {
    const output={pageId:'valid-page',title:'已确认标题',body:'已确认正文',buyerQuestion:'如何使用？',visual:{presence},referenceIds:['primary'],referenceCrops:crops};
    const h=confirmationHarness({outputs:[output],materials:[{referenceId:'primary',role}]});
    await h.run();
    assert.equal(h.requests.length,1,`${presence}/${role} should submit once`);
    assert.equal(h.requests[0].options.method,'POST');
  }
});

for(const detail of [true,false])test(`local busy admission returns to the existing ${detail?'detail':'legacy'} confirmation without polling or losing edits`,async()=>{
  const h=confirmationHarness({detail,failure:Object.assign(new Error('backend admission denied'),{status:409,code:'ENGINE_BUSY'})});
  const draft=h.context.state.detailDraft,before=JSON.stringify(draft),originalJob=h.context.state.job;
  await h.run();
  assert.equal(h.requests.length,1);
  assert.equal(h.requests[0].options.method,'POST');
  assert.equal(h.context.pollCalls,undefined,'a definitive admission rejection must not poll away its explanation');
  assert.equal(h.context.renderCalls,undefined,'existing confirmation controls must not be rebuilt');
  assert.equal(h.context.state.view,'confirm');
  assert.equal(h.context.state.job,originalJob);
  assert.equal(h.context.state.job.status,'awaiting_confirmation');
  assert.equal(h.context.state.detailDraft,draft);
  assert.equal(JSON.stringify(draft),before);
  assert.match(detail?h.context.detailNotice:h.context.taskNotice,/本机有其它任务处理中.*本张尚未开始生成/);
  assert.equal(h.context.state.requestBusy,false);
  assert.equal(h.context.confirmGenerateButton.disabled,false);
});

for(const detail of [true,false])test(`physical engine activity preserves the ${detail?'detail':'legacy'} proposal and requests explicit retry without suggesting ledger repair`,async()=>{
  const h=confirmationHarness({detail,failure:Object.assign(new Error('backend physical queue busy'),{status:409,code:'ENGINE_BUSY'})});
  const draft=h.context.state.detailDraft,before=JSON.stringify(draft),originalJob=h.context.state.job;
  await h.run();
  assert.equal(h.requests.length,1);assert.equal(h.requests[0].options.method,'POST');
  assert.equal(h.context.pollCalls,undefined,'physical activity is not an unresolved execution of this proposal');
  assert.equal(h.context.renderCalls,undefined);assert.equal(h.context.state.view,'confirm');
  assert.equal(h.context.state.job,originalJob);assert.equal(originalJob.status,'awaiting_confirmation');
  assert.equal(h.context.state.detailDraft,draft);assert.equal(JSON.stringify(draft),before);
  const message=detail?h.context.detailNotice:h.context.taskNotice;
  assert.match(message,/本机有其它任务处理中.*本张尚未开始生成.*稍后确认重试/);
  assert.doesNotMatch(message,/账号|上一项任务|核对|管理员/);
  assert.equal(h.context.state.requestBusy,false);assert.equal(h.context.confirmGenerateButton.disabled,false);
});

test('HTTP validation errors including DETAIL_CROP_REQUIRED reveal the original confirmation DOM and keep edited drafts',async()=>{
  for(const [detail,code] of [[true,'DETAIL_CROP_REQUIRED'],[true,'VALIDATION'],[false,'VALIDATION']]) {
    const h=confirmationHarness({detail,failure:Object.assign(new Error('请补充本屏真实局部或调整方案'),{status:400,code})});
    const before=JSON.stringify(h.context.state.detailDraft);
    await h.run();
    assert.equal(h.requests.length,1);
    assert.equal(h.context.pollCalls,undefined);
    assert.equal(h.context.renderCalls,undefined);
    assert.equal(h.context.state.view,'confirm');
    assert.equal(h.context.state.job.status,'awaiting_confirmation');
    assert.equal(JSON.stringify(h.context.state.detailDraft),before);
    assert.equal(detail?h.context.detailNotice:h.context.taskNotice,'请补充本屏真实局部或调整方案');
    assert.equal(h.edited[0].title,'用户已修改的标题');
    assert.equal(h.context.confirmGenerateButton.disabled,false);
  }
});

const nonblockingJob=()=>({id:'old-job',status:'reconciling',execution:{pending:true,code:'ENGINE_RESULT_UNKNOWN',admissionBlocked:false,pendingReconciliationCount:1},generationItems:[{status:'reconciling',error:{code:'ENGINE_RESULT_UNKNOWN'}}]});

test('explicit execution admission permits independent new drafts while old task mutation stays protected',async()=>{
  const requests=[],h=harness(async(url,options)=>{requests.push({url,options});return {};});
  h.context.state.job=nonblockingJob();
  assert.equal(h.run('taskIsBusy()'),false);
  assert.equal(h.run('executionTaskPending()'),true);
  h.run('syncTaskControls()');
  assert.equal(h.context.resetButton.disabled,false);
  assert.equal(h.context.reanalyzeButton.disabled,false);
  assert.match(h.run('executionTaskCopy().message'),/可继续新建独立任务.*原任务仍待核对/);
  vm.runInContext(source.slice(source.indexOf('const confirmGeneration ='),source.indexOf('const retryDetailCompilation =')),h.context);
  vm.runInContext(source.slice(source.indexOf('const retryDetailCompilation ='),source.indexOf('const RETRY_STORAGE_KEY =')),h.context);
  vm.runInContext(source.slice(source.indexOf('const RETRY_STORAGE_KEY ='),source.indexOf('const downloadHrefFor =')),h.context);
  await h.run('confirmGeneration()');await h.run('retryDetailCompilation()');await h.run('retryGenerationItem(0)');
  assert.equal(requests.length,0,'enabling new creation must not resubmit or mutate the unknown old task');
});

test('new task UI requires affirmative backend admission and an authenticated unexpired session',()=>{
  const h=harness(async()=>({}));h.context.oldJob=nonblockingJob();
  h.context.account={authenticated:true,expiresAt:new Date(Date.now()+3600000).toISOString()};
  assert.equal(h.run('newTaskAdmission(oldJob,account)'),true);
  for(const account of [{authenticated:false},{authenticated:true,expiresAt:'2000-01-01T00:00:00Z'}]) {
    h.context.account=account;assert.equal(h.run('newTaskAdmission(oldJob,account)'),false);
  }
  for(const blocked of [undefined,true,'false']) {
    h.context.state.job={...nonblockingJob(),execution:{pending:true,code:'ENGINE_RESULT_UNKNOWN',admissionBlocked:blocked}};
    assert.equal(h.run('taskIsBusy()'),true);
  }
});

test('single-image retry persists its intent before dispatch and reuses it after a lost response',async()=>{
  const requests=[],h=harness(async(url,options)=>{requests.push({url,options});throw new Error('connection lost');});
  h.context.state.job={id:'retry-job',status:'failed',generationItems:[{index:0,status:'failed'}]};
  h.context.newRequestId=()=> '00000000-0000-4000-8000-000000000123';
  h.context.pollJob=async()=>{};
  vm.runInContext(source.slice(source.indexOf('const RETRY_STORAGE_KEY ='),source.indexOf('const downloadHrefFor =')),h.context);
  await h.run('retryGenerationItem(0)');await h.run('retryGenerationItem(0)');
  const posts=requests.filter(request=>request.options.method==='POST');
  assert.equal(posts.length,2);
  assert.equal(posts[0].options.body,posts[1].options.body);
  const persisted=JSON.parse(h.context.sessionStorage.getItem('pintu.item-retries.v1'));
  assert.equal(persisted['retry-job:0'].requestId,JSON.parse(posts[0].options.body).requestId);
  assert.equal(posts[0].options.headers['Idempotency-Key'],persisted['retry-job:0'].requestId);
});
