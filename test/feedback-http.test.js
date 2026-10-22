import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import sharp from 'sharp';
import {FeedbackStore} from '../feedback-store.js';
import {ExecutionStore} from '../execution/store.js';
import {installLocalHttp} from '../execution/http.js';
import {installFeedbackHttp} from '../feedback-http.js';

test('local feedback enforces independent browser ownership, CSRF, deduplication and attachment limits',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'pintu-feedback-http-'));
  const localStore=new ExecutionStore({dbPath:path.join(root,'execution/tasks.sqlite'),encryptionKey:crypto.randomBytes(32)}),feedback=new FeedbackStore(path.join(root,'feedback'));
  const app=express();app.use(express.json());let origin;
  // Origin can be determined before exposing the HTTP test server.
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  const http=installLocalHttp(app,{store:localStore,engineMode:'mock',configured:true,origins:[origin],secureCookie:false,accessCodeHash:''});
  app.use('/api/feedback',http.localProtect);
  const jobId=crypto.randomUUID(),pageId=crypto.randomUUID();
  installFeedbackHttp(app,{store:feedback,ownsJob:(req,id)=>http.owns(req,'job',id),findJob:id=>id===jobId?{analysis:{outputs:[{pageId}]}}:null});
  const session=async()=>{const response=await fetch(origin+'/api/session');return {cookie:response.headers.get('set-cookie').split(';')[0],...await response.json()};};
  const submit=async(actor,options={})=>{
    const form=new FormData();form.set('requestId',options.requestId||crypto.randomUUID());form.set('type','material');form.set('message','材质图片不清晰');
    if(options.jobId)form.set('jobId',options.jobId);if(options.pageId)form.set('pageId',options.pageId);
    if(options.image)form.append('screenshots',new Blob([options.image]),'screen.jpg');
    return fetch(origin+'/api/feedback',{method:'POST',headers:{Cookie:actor.cookie,Origin:options.origin||origin,'X-Pintu-CSRF':options.csrf||actor.csrfToken},body:form});
  };
  try {
    const a=await session(),b=await session();assert.equal(a.authenticated,true);assert.notEqual(a.ownerId,b.ownerId);assert.match(a.cookie,/^pintu_local_session=/);localStore.bindResource('job',jobId,a.ownerId);
    const image=await sharp({create:{width:32,height:32,channels:3,background:'white'}}).png().toBuffer();
    const requestId=crypto.randomUUID();const response=await submit(a,{requestId,jobId,pageId,image});assert.equal(response.status,201);
    const result=await response.json();assert.equal((await submit(a,{requestId,jobId,pageId,image})).status,200);
    const oversized=await submit(a,{image:Buffer.alloc(5*1024*1024+1)});
    assert.equal(oversized.status,400);assert.match((await oversized.json()).error.message,/5 MB/);
    const excessive=new FormData();excessive.set('requestId',crypto.randomUUID());excessive.set('type','other');excessive.set('message','too many');
    for(let index=0;index<4;index++)excessive.append('screenshots',new Blob([image]),`${index}.png`);
    const excessiveResponse=await fetch(origin+'/api/feedback',{method:'POST',headers:{Cookie:a.cookie,Origin:origin,'X-Pintu-CSRF':a.csrfToken},body:excessive});
    assert.equal(excessiveResponse.status,400);assert.match((await excessiveResponse.json()).error.message,/三张/);
    assert.equal((await submit(a,{origin:'http://untrusted.invalid'})).status,403);
    assert.equal((await submit(a,{csrf:'invalid'})).status,403);
    assert.equal((await submit(b,{jobId})).status,404);
    assert.equal((await submit(a,{jobId,pageId:crypto.randomUUID()})).status,400);
    const url=origin+`/api/feedback/${result.id}/screenshots/0`;
    assert.equal((await fetch(url,{headers:{Cookie:a.cookie}})).status,200);
    assert.equal((await fetch(url,{headers:{Cookie:b.cookie}})).status,404);
    assert.equal((await fetch(url)).status,401);
    assert.equal((await fetch(origin+'/api/feedback')).status,401);
  }finally{await new Promise(resolve=>server.close(resolve));feedback.close();localStore.close();fs.rmSync(root,{recursive:true,force:true});}
});
