import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {FeedbackStore} from '../feedback-store.js';

const payload=()=>({requestId:crypto.randomUUID(),type:'material',message:'希望增加真实面料的微距介绍',rating:'3'});
test('feedback screenshots strip EXIF, persist across restarts and duplicate requests save once',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'pintu-feedback-'));let store=new FeedbackStore(root);
  try {
    const image=await sharp({create:{width:100,height:80,channels:3,background:'#ffffff'}}).jpeg().withMetadata({orientation:6}).toBuffer();
    const body=payload(),files=[{buffer:image}],owner=crypto.randomUUID();
    const [a,b]=await Promise.all([store.submit(owner,body,files),store.submit(owner,body,files)]);
    assert.equal(a.id,b.id);assert.equal(store.list().length,1);
    const item=store.get(a.id),meta=await sharp(path.join(store.images,item.screenshots[0])).metadata();
    assert.equal(meta.orientation,undefined);assert.equal(meta.exif,undefined);assert.equal(meta.width,80);assert.equal(meta.height,100);
    assert.equal(fs.statSync(store.database).mode&0o777,0o600);
    await assert.rejects(store.submit(owner,{...body,message:'changed'},files),error=>error.status===409);
    store.close();store=new FeedbackStore(root);assert.equal(store.get(a.id).message,body.message);
    store.status(a.id,'resolved');assert.equal(store.list({status:'resolved'}).length,1);
    store.delete(a.id);assert.equal(store.get(a.id),null);assert.equal(fs.readdirSync(store.images).length,0);
  }finally{store.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('feedback limits and malformed images do not create records or leave screenshots',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'pintu-feedback-'));const store=new FeedbackStore(root),owner=crypto.randomUUID();
  try{
    await assert.rejects(store.submit(owner,payload(),[{buffer:Buffer.from('not an image')}]),/截图/);
    await assert.rejects(store.submit(owner,{...payload(),rating:'6'}),/评分/);
    await assert.rejects(store.submit(owner,payload(),Array.from({length:4},()=>({buffer:Buffer.from('x')}))),/三张/);
    for(let index=0;index<20;index++)await store.submit(owner,payload());
    await assert.rejects(store.submit(owner,payload()),error=>error.status===429);
    assert.equal(store.list().length,20);assert.equal(fs.readdirSync(store.images).length,0);
  }finally{store.close();fs.rmSync(root,{recursive:true,force:true});}
});
