import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {BriefStore} from '../brief-store.js';
import {readMaterials} from '../document-reader.js';
test('brief survives store reload, exposes pending state, and deduplicates retries',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'brief-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new BriefStore(root,60000);
 const b=await store.create([{originalname:'material.txt',mimetype:'text/plain',buffer:Buffer.from('confirmed material')}],{mode:'detail'},{warnings:[]});
 let resolve;const pending=store.turn(b.id,'one','question',()=>new Promise(r=>resolve=r));
 while(!resolve)await new Promise(r=>setTimeout(r,1));
 assert.equal(store.public(b).pending,true);
 await assert.rejects(store.turn(b.id,'two','question',()=>{}),{status:409});
 resolve({reply:'answer',summary:'confirmed summary',questions:[],ready:true});await pending;
 const restored=new BriefStore(root,60000);assert.equal((await restored.get(b.id)).summary,'confirmed summary');
 assert.equal((await restored.files(await restored.get(b.id)))[0].buffer.toString(),'confirmed material');
 const duplicate=await restored.turn(b.id,'one','question',()=>{throw Error('must not execute');});assert.equal(duplicate.messages.length,2);
 await assert.rejects(restored.turn(b.id,'two','question',()=>{throw Error('network');}),/network/);
 assert.equal(restored.public(b).pending,false);assert.equal((await restored.get(b.id)).messages.length,2);
 const expired=await restored.get(b.id);expired.updatedAt='2000-01-01T00:00:00Z';await restored.save(expired);await assert.rejects(restored.get(b.id),{status:404});
});

test('brief caches parsed materials with stable references across turns and reloads', async t => {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'brief-materials-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const files=await Promise.all(['product.pdf','product-image.docx'].map(async originalname=>({originalname,buffer:await fs.readFile(new URL(`./fixtures/${originalname}`,import.meta.url))})));
 const parsed=await readMaterials(files);
 const store=new BriefStore(root,60000);
 const brief=await store.create(files,{mode:'detail'},parsed);
 const ids=parsed.images.map(image=>image.referenceId);
 const cached=await store.materials(brief);
 assert.deepEqual(cached.images.map(image=>image.referenceId),ids);
 assert.deepEqual(cached.images.map(image=>image.buffer),parsed.images.map(image=>image.buffer));
 assert.equal(cached.text,parsed.text);
 assert.deepEqual(cached.sources,parsed.sources);
 // Removing source documents demonstrates restoration uses the parsed cache.
 await Promise.all(brief.files.map(file=>fs.unlink(path.join(store.directory(brief.id),file.filename))));
 const restored=new BriefStore(root,60000);
 const reloaded=await restored.get(brief.id);
 const result=await restored.materials(reloaded);
 assert.deepEqual(result.images.map(image=>image.referenceId),ids);
 assert.deepEqual(result.images.map(image=>[image.sourceKind,image.ordinal]),[['pdf_page',1],['docx_image',1]]);
 assert.ok(!JSON.stringify(store.public(brief)).includes('reference-'));
 assert.ok(!JSON.stringify(store.public(brief)).includes(root));
 assert.ok(result.images.every(image=>!('filename' in image)&&!('path' in image)));
});

test('legacy brief cache is migrated once, including concurrent stale snapshots', async t => {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'brief-legacy-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new BriefStore(root,60000);
 const file={originalname:'same.jpg',buffer:await fs.readFile(new URL('../assets/photos/bottle-main.jpg',import.meta.url))};
 const brief=await store.create([file,{...file}],{mode:'detail'},await readMaterials([file,{...file}]));
 delete brief.materials;
 for(const file of brief.files)delete file.sourceId;
 await store.save(brief);
 const a=await store.get(brief.id),b=await store.get(brief.id);
 const [left,right]=await Promise.all([store.materials(a),store.materials(b)]);
 assert.deepEqual(left.images.map(image=>image.referenceId),right.images.map(image=>image.referenceId));
 assert.deepEqual(a.materials,b.materials);
 assert.equal(new Set(left.sources.map(source=>source.sourceId)).size,2);
 await store.save(b);
 const saved=await store.get(brief.id);
 assert.equal(saved.materials.version,1);
 assert.deepEqual((await store.materials(saved)).images.map(image=>image.referenceId),left.images.map(image=>image.referenceId));
});

const profile={product:'保温杯',category:'饮水器具',features:['银色杯身（来源：上传图片）'],confirmedFacts:['容量 500ml（来源：商品文档）'],unknowns:['品牌未确认']};
const questionAnswer={reply:'已识别为保温杯，请确认主要使用人群。',summary:'已确认容量 500ml，主要使用人群待确认',questions:[{question:'主要给谁使用？',options:['通勤人群','学生']}],ready:false};
const readyAnswer={reply:'已确认需求，可以生成方案。',summary:'面向通勤人群的 500ml 保温杯',questions:[],ready:true};
async function newBrief(t) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'brief-profile-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const store=new BriefStore(root,60000);
 const file={originalname:'product.txt',mimetype:'text/plain',buffer:Buffer.from('Capacity: 500ml')};
 return {root,store,brief:await store.create([file],{mode:'detail'},await readMaterials([file]))};
}
async function until(check) {
 for(let attempt=0;attempt<200;attempt++) { const value=await check();if(value)return value;await new Promise(resolve=>setTimeout(resolve,5)); }
 assert.fail('Timed out waiting for brief state');
}
const finished=(store,id)=>until(async()=>{
 const brief=await store.get(id);
 return store.public(brief).pending?null:brief;
});

test('initial analysis persists a visible profile before asking, and adds no fabricated user message',async t=>{
 const {root,store,brief}=await newBrief(t);
 assert.equal(store.public(brief).phase,'created');
 let finishAnalysis,finishQuestion;const calls=[];
 const analyze=()=>{calls.push('analyze');return new Promise(resolve=>finishAnalysis=resolve);};
 const ask=async(current,text)=>{
  calls.push('ask');assert.equal(text,'');assert.deepEqual(current.productProfile,{...profile,sources:[]});
  const disk=JSON.parse(await fs.readFile(path.join(root,brief.id,'brief.json'),'utf8'));
  assert.equal(disk.phase,'questioning');assert.equal(disk.productProfile.product,'保温杯');
  return new Promise(resolve=>finishQuestion=resolve);
 };
 const started=await store.startAnalysis(brief.id,analyze,ask);
 assert.equal(started.phase,'analyzing');assert.equal(store.public(started).pending,true);
 await until(()=>finishAnalysis);
 await assert.rejects(store.startAnalysis(brief.id,analyze,ask),{status:409});
 await assert.rejects(store.turn(brief.id,'early','通勤',()=>readyAnswer),{status:409});
 finishAnalysis(profile);await until(()=>finishQuestion);
 const questioning=await store.get(brief.id);
 assert.equal(questioning.phase,'questioning');assert.equal(questioning.productProfile.product,'保温杯');
 assert.equal(questioning.messages.length,0);
 finishQuestion(questionAnswer);
 const completed=await finished(store,brief.id);
 assert.equal(completed.phase,'awaiting_answer');assert.equal(completed.messages.length,1);
 assert.equal(completed.messages[0].role,'assistant');assert.equal(completed.error,null);
 await store.startAnalysis(brief.id,()=>{throw Error('must not reanalyze');},()=>{throw Error('must not ask again');});
 assert.deepEqual(calls,['analyze','ask']);
});

test('question failure retains recognition and retries only the unfinished call',async t=>{
 const {store,brief}=await newBrief(t);
 let analysisCalls=0,questionCalls=0;
 const analyze=()=>{analysisCalls++;return profile;};
 await store.startAnalysis(brief.id,analyze,()=>{questionCalls++;throw Error('network failure sk-private');});
 const failed=await finished(store,brief.id);
 assert.equal(failed.phase,'failed');assert.equal(failed.productProfile.product,'保温杯');
 assert.equal(failed.error.code,'BRIEF_QUESTION_FAILED');
 assert.ok(!JSON.stringify(store.public(failed)).includes('sk-private'));
 assert.equal(failed.messages.length,0);
 await store.startAnalysis(brief.id,analyze,()=>{questionCalls++;return questionAnswer;});
 const completed=await finished(store,brief.id);
 assert.equal(completed.phase,'awaiting_answer');assert.equal(completed.messages.length,1);
 assert.equal(analysisCalls,1);assert.equal(questionCalls,2);
});

test('recognition failure never asks questions and a retry recognizes again',async t=>{
 const {store,brief}=await newBrief(t);
 let questions=0;
 await store.startAnalysis(brief.id,()=>{throw Error('broken analysis');},()=>{questions++;return questionAnswer;});
 const failed=await finished(store,brief.id);
 assert.equal(failed.phase,'failed');assert.equal(failed.productProfile,null);
 assert.equal(failed.error.code,'PRODUCT_ANALYSIS_FAILED');assert.equal(questions,0);
 await store.startAnalysis(brief.id,()=>profile,()=>{questions++;return readyAnswer;});
 const completed=await finished(store,brief.id);
 assert.equal(completed.phase,'ready');assert.equal(completed.ready,true);assert.equal(questions,1);
});

function pauseNextBriefRead(t,filename) {
 const readFile=fs.readFile.bind(fs);
 let intercepted=false,enter,release;
 const entered=new Promise(resolve=>{enter=resolve;});
 const resume=new Promise(resolve=>{release=resolve;});
 t.mock.method(fs,'readFile',async(...args)=>{
  const snapshot=await readFile(...args);
  if(!intercepted && String(args[0])===filename) {
   intercepted=true;enter(JSON.parse(snapshot));await resume;
  }
  return snapshot;
 });
 t.after(release);
 return {entered,release,readFile};
}

test('a read spanning active question completion cannot overwrite ready with a restart failure',async t=>{
 const {root,store,brief}=await newBrief(t);
 let finishQuestion;
 await store.startAnalysis(brief.id,()=>profile,()=>new Promise(resolve=>{finishQuestion=resolve;}));
 await until(()=>finishQuestion);
 const filename=path.join(root,brief.id,'brief.json');
 const held=pauseNextBriefRead(t,filename);
 const reading=store.get(brief.id);
 const stale=await held.entered;
 const work=store.work.get(brief.id);
 finishQuestion(readyAnswer);await work;
 const before=JSON.parse(await held.readFile(filename,'utf8'));
 held.release();
 const returned=await reading;
 const after=JSON.parse(await held.readFile(filename,'utf8'));
 assert.equal(stale.phase,'questioning');assert.equal(before.phase,'ready');
 assert.equal(returned.phase,'ready');assert.equal(returned.ready,true);
 assert.equal(returned.error,null);assert.equal(store.public(returned).pending,false);
 assert.equal(after.phase,'ready');assert.equal(after.error,null);
 assert.deepEqual(after.messages,before.messages);
});

test('a read started before a successful retry must discard the previous failed snapshot',async t=>{
 const {root,store,brief}=await newBrief(t);
 brief.phase='failed';brief.error={code:'PRODUCT_ANALYSIS_FAILED'};await store.save(brief);
 const filename=path.join(root,brief.id,'brief.json');
 const held=pauseNextBriefRead(t,filename);
 const reading=store.get(brief.id);
 const stale=await held.entered;
 await store.startAnalysis(brief.id,()=>profile,()=>readyAnswer);
 await store.work.get(brief.id);
 const before=JSON.parse(await held.readFile(filename,'utf8'));
 held.release();
 const returned=await reading;
 assert.equal(stale.phase,'failed');assert.equal(before.phase,'ready');
 assert.equal(returned.phase,'ready');assert.equal(returned.ready,true);
 assert.equal(returned.error,null);assert.equal(store.public(returned).pending,false);
 assert.deepEqual(returned.messages,before.messages);
 assert.equal(JSON.parse(await held.readFile(filename,'utf8')).phase,'ready');
});

test('failed user input persists for retry and a successful answer is added exactly once',async t=>{
 const {store,brief}=await newBrief(t);
 await store.startAnalysis(brief.id,()=>profile,()=>questionAnswer);await finished(store,brief.id);
 let recognitions=0;
 await assert.rejects(store.turn(brief.id,'answer-1','通勤人群',async(current)=>{
  await store.ensureProfile(current,()=>{recognitions++;return profile;});
  throw Error('question network failure');
 }),/network/);
 const failed=await store.get(brief.id);
 assert.equal(failed.phase,'failed');assert.deepEqual(failed.pendingMessage,{requestId:'answer-1',text:'通勤人群'});
 assert.equal(failed.messages.length,1);assert.equal(recognitions,0);
 await store.startAnalysis(brief.id,()=>{throw Error('cached profile must be used');},(current,text)=>{
  assert.equal(text,'通勤人群');assert.equal(current.messages.length,1);return readyAnswer;
 });
 const ready=await finished(store,brief.id);
 assert.equal(ready.phase,'ready');assert.equal(ready.pendingMessage,null);
 assert.deepEqual(ready.messages.map(message=>message.role),['assistant','user','assistant']);
 const duplicate=await store.turn(brief.id,'answer-1','通勤人群',()=>{throw Error('must not answer twice');});
 assert.equal(duplicate.messages.length,3);
});

test('restarted analysis phases become retryable failures without discarding cached profiles or input',async t=>{
 const {root,store,brief}=await newBrief(t);
 brief.phase='questioning';brief.productProfile={...profile,sources:[]};
 brief.pendingMessage={requestId:'interrupted-answer',text:'学生'};await store.save(brief);
 const restored=new BriefStore(root,60000);
 const interrupted=await restored.get(brief.id);
 assert.equal(interrupted.phase,'failed');assert.equal(interrupted.error.code,'SERVER_RESTARTED');
 assert.equal(restored.public(interrupted).pending,false);assert.equal(interrupted.productProfile.product,'保温杯');
 await restored.startAnalysis(brief.id,()=>{throw Error('must keep cached recognition');},(current,text)=>{
  assert.equal(text,'学生');return readyAnswer;
 });
 const ready=await finished(restored,brief.id);
 assert.equal(ready.phase,'ready');assert.equal(ready.messages[0].text,'学生');
 // The other interruption boundary has no recognized profile to reuse.
 ready.phase='analyzing';ready.productProfile=null;await restored.save(ready);
 const interruptedAgain=await new BriefStore(root,60000).get(brief.id);
 assert.equal(interruptedAgain.phase,'failed');assert.equal(interruptedAgain.productProfile,null);
 assert.equal(interruptedAgain.messages.length,2);
});

test('legacy conversations recognize before their next response while preserving prior history',async t=>{
 const {store,brief}=await newBrief(t);
 brief.messages=[{role:'user',text:'材质是不锈钢',requestId:'old-turn'},{role:'assistant',text:'已确认材质',requestId:'old-turn'}];
 brief.summary='已确认不锈钢';delete brief.phase;delete brief.productProfile;delete brief.initialQuestionsComplete;
 await store.save(brief);const old=await store.get(brief.id);assert.equal(old.phase,'awaiting_answer');
 const order=[];
 const updated=await store.turn(brief.id,'new-turn','面向通勤人群',async current=>{
  await store.ensureProfile(current,()=>{order.push('analyze');assert.equal(current.messages.length,2);return profile;});
  order.push('question');return readyAnswer;
 });
 assert.deepEqual(order,['analyze','question']);assert.equal(updated.messages.length,4);
 assert.equal(updated.messages[0].text,'材质是不锈钢');assert.equal(updated.productProfile.product,'保温杯');
 assert.equal(updated.phase,'ready');
});
