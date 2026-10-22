import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

export const FEEDBACK_TYPES=['continuity','material','image','interface','suggestion','other'];
export const FEEDBACK_STATUSES=['pending','processing','resolved'];
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export class FeedbackStore {
  constructor(directory,{now=Date.now}={}) {
    this.directory=path.resolve(directory);this.now=now;
    fs.mkdirSync(this.directory,{recursive:true,mode:0o700});fs.chmodSync(this.directory,0o700);
    this.images=path.join(this.directory,'screenshots');fs.mkdirSync(this.images,{recursive:true,mode:0o700});
    this.database=path.join(this.directory,'feedback.sqlite');
    this.db=new DatabaseSync(this.database);fs.chmodSync(this.database,0o600);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,request_id TEXT NOT NULL,hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(owner_id,request_id));
      CREATE INDEX IF NOT EXISTS feedback_owner_time ON feedback(owner_id,created_at);`);
  }
  permissions() {for(const suffix of ['','-wal','-shm'])if(fs.existsSync(this.database+suffix))fs.chmodSync(this.database+suffix,0o600);}
  get(id) {if(!uuid(id))return null;const row=this.db.prepare('SELECT * FROM feedback WHERE id=?').get(id);return row?{id:row.id,ownerId:row.owner_id,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString(),status:row.status,...JSON.parse(row.payload)}:null;}
  async submit(ownerId,body,files=[]) {
    if(!uuid(body.requestId)||!FEEDBACK_TYPES.includes(body.type)||typeof body.message!=='string'||!body.message.trim()||body.message.length>3000)throw fail('请选择反馈类型并填写 1–3000 字意见');
    const rating=body.rating==null||body.rating===''?null:Number(body.rating);
    if(rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))throw fail('评分须为 1–5 分');
    if(files.length>3||files.some(file=>file.buffer.length>5*1024*1024))throw fail('最多三张截图，每张不超过 5 MB');
    const context={};
    for(const key of ['jobId','pageId'])if(body[key]) {
      if(key==='jobId'?!uuid(body[key]):typeof body[key]!=='string'||! /^[A-Za-z0-9_-]{1,100}$/.test(body[key]))throw fail('关联任务或页面无效');context[key]=body[key];
    }
    if(context.pageId&&!context.jobId)throw fail('页面反馈必须关联任务');
    const payload={type:body.type,message:body.message,rating,...context};
    const hash=crypto.createHash('sha256').update(JSON.stringify({...payload,files:files.map(file=>crypto.createHash('sha256').update(file.buffer).digest('hex'))})).digest('hex');
    const existing=this.db.prepare('SELECT id,hash FROM feedback WHERE owner_id=? AND request_id=?').get(ownerId,body.requestId);
    if(existing){if(existing.hash!==hash)throw fail('重复请求的反馈内容不同，请重新提交',409);return {id:existing.id,replayed:true};}
    const converted=[];
    for(const file of files) {
      try {
        const image=sharp(file.buffer,{limitInputPixels:20_000_000});
        const meta=await image.metadata();if(!['png','jpeg','webp'].includes(meta.format))throw new Error();
        converted.push(await image.rotate().resize(2400,2400,{fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:85}).toBuffer());
      } catch {throw fail('截图仅支持可读取的 PNG、JPEG、WebP，最多 2000 万像素');}
    }
    const id=crypto.randomUUID(),written=[];let committed=false;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      // Recheck after asynchronous decoding; concurrent duplicate requests may already have committed.
      const duplicate=this.db.prepare('SELECT id,hash FROM feedback WHERE owner_id=? AND request_id=?').get(ownerId,body.requestId);
      if(duplicate){if(duplicate.hash!==hash)throw fail('重复请求的反馈内容不同',409);this.db.exec('COMMIT');committed=true;return {id:duplicate.id,replayed:true};}
      const now=this.now(),date=new Date(now);date.setUTCHours(0,0,0,0);
      if(this.db.prepare('SELECT count(*) AS total FROM feedback WHERE owner_id=? AND created_at>=?').get(ownerId,date.getTime()).total>=20)throw fail('今日反馈已达 20 条，请明日再提交',429);
      payload.screenshots=converted.map((buffer,index)=>{
        const name=`${id}-${index}.jpg`,filename=path.join(this.images,name);
        const descriptor=fs.openSync(filename,'wx',0o600);written.push(filename);
        try {fs.writeFileSync(descriptor,buffer);fs.fsyncSync(descriptor);}finally {fs.closeSync(descriptor);}
        return name;
      });
      this.db.prepare('INSERT INTO feedback VALUES(?,?,?,?,?,?,?,?)').run(id,ownerId,body.requestId,hash,now,now,'pending',JSON.stringify(payload));
      this.db.exec('COMMIT');committed=true;this.permissions();return {id,replayed:false};
    } finally {if(!committed){this.db.exec('ROLLBACK');for(const filename of written)fs.rmSync(filename,{force:true});}}
  }
  list({status,type,from,limit=1000}={}) {
    if(status&&!FEEDBACK_STATUSES.includes(status)||type&&!FEEDBACK_TYPES.includes(type))throw fail('筛选条件无效');
    const since=from?Date.parse(from):0;if(!Number.isFinite(since))throw fail('日期无效');
    const rows=this.db.prepare('SELECT id FROM feedback WHERE (? IS NULL OR status=?) AND created_at>=? ORDER BY created_at DESC LIMIT ?').all(status||null,status||null,since,Math.min(1000,Math.max(1,Number(limit)||1000)));
    return rows.map(row=>this.get(row.id)).filter(row=>!type||row.type===type);
  }
  status(id,status) {if(!uuid(id)||!FEEDBACK_STATUSES.includes(status))throw fail('反馈编号或状态无效');if(!this.get(id))throw fail('反馈不存在',404);this.db.prepare('UPDATE feedback SET status=?,updated_at=? WHERE id=?').run(status,this.now(),id);this.permissions();}
  delete(id) {const item=this.get(id);if(!item)throw fail('反馈不存在',404);this.db.prepare('DELETE FROM feedback WHERE id=?').run(id);for(const name of item.screenshots||[])fs.rmSync(path.join(this.images,name),{force:true});this.permissions();}
  close(){this.db.close();}
}
