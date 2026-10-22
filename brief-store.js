import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { readMaterials } from './document-reader.js';
import { validateProductProfile } from './product-profile.js';
const bad = (message,status=400) => Object.assign(new Error(message),{status});
const phaseOf = brief => brief.phase || (brief.ready ? 'ready' : brief.messages?.length ? 'awaiting_answer' : 'created');
const pendingPhases = new Set(['analyzing', 'questioning']);
export class BriefStore {
  constructor(root,ttl) { this.root=root; this.ttl=ttl; this.busy=new Set(); this.materialLoads=new Map(); this.writes=new Map(); this.writeVersions=new Map(); this.work=new Map(); }
  directory(id) { if(!/^[a-f0-9-]{36}$/i.test(id || '')) throw bad('需求会话不存在',404); return path.join(this.root,id); }
  public(brief) { return {id:brief.id,pending:this.busy.has(brief.id),phase:phaseOf(brief),productProfile:brief.productProfile || null,error:brief.error || null,pendingMessage:brief.pendingMessage || null,fields:brief.fields,messages:brief.messages,summary:brief.summary,questions:brief.questions,ready:brief.ready,warnings:brief.warnings}; }
  async save(brief) {
    const dir=this.directory(brief.id), snapshot=JSON.stringify(brief);
    this.writeVersions.set(brief.id,(this.writeVersions.get(brief.id)||0)+1);
    const previous=this.writes.get(brief.id) || Promise.resolve();
    const writing=previous.catch(()=>{}).then(async()=>{
      await fs.mkdir(dir,{recursive:true});
      await fs.writeFile(path.join(dir,'brief.tmp'),snapshot);
      await fs.rename(path.join(dir,'brief.tmp'),path.join(dir,'brief.json'));
    });
    this.writes.set(brief.id,writing);
    writing.finally(()=>{if(this.writes.get(brief.id)===writing)this.writes.delete(brief.id);}).catch(()=>{});
    return writing;
  }
  async get(id) {
    let brief;
    for(;;) {
      const version=this.writeVersions.get(id)||0;
      const wasBusy=this.busy.has(id), work=this.work.get(id);
      const writing=this.writes.get(id);
      if(writing) await writing.catch(()=>{});
      try { brief=JSON.parse(await fs.readFile(path.join(this.directory(id),'brief.json'),'utf8')); }
      catch {throw bad('需求会话已过期或不存在，请使用当前草稿重新问答',404);}
      // A read may finish after the worker has saved a newer snapshot and cleared
      // busy. Re-read that snapshot instead of returning old data or marking it
      // interrupted. Keep active workers non-blocking so profile polling works.
      if(version!==(this.writeVersions.get(id)||0) || wasBusy!==this.busy.has(id) || work!==this.work.get(id)) {
        if(work && work!==this.work.get(id)) await work.catch(()=>{});
        continue;
      }
      break;
    }
    if(Date.now()-Date.parse(brief.updatedAt)>this.ttl) throw bad('需求会话已过期，请重新开始',404);
    brief.phase=phaseOf(brief);
    brief.productProfile ||= null; brief.error ||= null;
    brief.pendingMessage ||= null;
    if(pendingPhases.has(brief.phase) && !this.busy.has(id)) {
      brief.phase='failed'; brief.ready=false;
      brief.error={message:'服务重启中断了资料整理，已保留识别结果和回答，请重试。',code:'SERVER_RESTARTED',retryable:true};
      brief.updatedAt=new Date().toISOString();
      await this.save(brief);
    }
    return brief;
  }
  async create(files,fields,materials) {
    if (!Array.isArray(materials?.images)) materials = await readMaterials(files);
    const brief={id:crypto.randomUUID(),fields,messages:[],summary:fields.requirements||'',questions:[],ready:false,phase:'created',productProfile:null,error:null,pendingMessage:null,initialQuestionsComplete:false,warnings:materials.warnings,files:[],updatedAt:new Date().toISOString()};
    const dir=this.directory(brief.id); await fs.mkdir(dir,{recursive:true});
    for(const [i,file] of files.entries()) { const filename=`source-${i}${path.extname(file.originalname).toLowerCase()}`; await fs.writeFile(path.join(dir,filename),file.buffer); brief.files.push({filename,originalname:file.originalname,mimetype:file.mimetype,sourceId:materials.sources?.find(source=>source.index===i)?.sourceId || file.sourceId || crypto.randomUUID()}); }
    await this.cacheMaterials(brief, materials);
    await this.save(brief); return brief;
  }
  async files(brief) { return Promise.all(brief.files.map(async f=>({...f,buffer:await fs.readFile(path.join(this.directory(brief.id),f.filename))}))); }
  async cacheMaterials(brief, materials) {
    const images = [];
    for (const image of materials.images) {
      const { referenceId, sourceId, sourceName, sourceKind, ordinal, originalname, mimetype } = image;
      const filename = `reference-${referenceId}.png`;
      await fs.writeFile(path.join(this.directory(brief.id), filename), image.buffer);
      images.push({ referenceId, sourceId, sourceName, sourceKind, ordinal, originalname, mimetype, filename });
    }
    brief.materials = { version: 1, images, text: materials.text || '', warnings: [...(materials.warnings || [])], sources: materials.sources || [] };
    brief.warnings = [...brief.materials.warnings];
  }
  async materials(brief) {
    // Multiple callers may hold different snapshots of a legacy brief. Migrate it
    // only once so every caller receives the same reference identities.
    if (!this.materialLoads.has(brief.id)) {
      const load = (async () => {
        let cached = brief.materials;
        let sourceFiles = brief.files;
        if (cached?.version !== 1) {
          const current = await this.get(brief.id);
          if (current.materials?.version !== 1) {
            const materials = await readMaterials(await this.files(current));
            current.files.forEach((file, index) => { file.sourceId = materials.sources[index].sourceId; });
            await this.cacheMaterials(current, materials);
            await this.save(current);
          }
          cached = current.materials;
          sourceFiles = current.files;
        }
        const result = {
          images: await Promise.all(cached.images.map(async ({ filename, ...metadata }) => ({ ...metadata, buffer: await fs.readFile(path.join(this.directory(brief.id), filename)) }))),
          text: cached.text,
          warnings: [...cached.warnings],
          sources: cached.sources.map(source => ({ ...source })),
        };
        return { cached, sourceFiles, result };
      })();
      this.materialLoads.set(brief.id, load);
      load.finally(() => this.materialLoads.delete(brief.id)).catch(() => {});
    }
    const { cached, sourceFiles, result } = await this.materialLoads.get(brief.id);
    brief.materials = cached;
    brief.files = sourceFiles;
    return result;
  }
  async setPhase(brief, phase) {
    brief.phase=phase; brief.error=null; brief.updatedAt=new Date().toISOString();
    await this.save(brief);
  }
  async fail(brief) {
    const analysis=brief.phase==='analyzing';
    brief.phase='failed'; brief.ready=false;
    brief.error={message:analysis?'商品识别未完成，请重试。':'需求问题整理未完成，已保留识别结果和回答，请重试。',code:analysis?'PRODUCT_ANALYSIS_FAILED':'BRIEF_QUESTION_FAILED',retryable:true};
    brief.updatedAt=new Date().toISOString();
    await this.save(brief);
  }
  /** Call from a serialized startAnalysis/turn callback; completed recognition is reused. */
  async ensureProfile(brief, analyze) {
    if(brief.productProfile) return brief.productProfile;
    if(typeof analyze!=='function') throw bad('请先识别商品资料，再整理需求问题',409);
    await this.setPhase(brief,'analyzing');
    const profile=await analyze(brief);
    brief.productProfile=validateProductProfile(profile,profile?.sources);
    // Persist recognition before starting the independently retryable question call.
    await this.setPhase(brief,'questioning');
    return brief.productProfile;
  }
  applyAnswer(brief, answer, pendingMessage = null) {
    if(!answer || typeof answer.reply!=='string' || !answer.reply.trim() || typeof answer.summary!=='string' || typeof answer.ready!=='boolean' || !Array.isArray(answer.questions) || answer.questions.length>3 || answer.questions.some(question=>typeof question.question!=='string' || !question.question.trim() || !Array.isArray(question.options) || question.options.length>4 || question.options.some(option=>typeof option!=='string'))) {
      throw bad('需求问题未返回完整内容，请重试',502);
    }
    const requestId=pendingMessage?.requestId || `analysis-${crypto.randomUUID()}`;
    if(pendingMessage) brief.messages.push({role:'user',text:pendingMessage.text,requestId});
    brief.messages.push({role:'assistant',text:answer.reply.slice(0,4000),requestId});
    brief.summary=String(answer.summary||brief.summary).slice(0,6000);
    brief.questions=answer.questions.map(question=>({question:question.question.slice(0,300),options:question.options.map(option=>option.slice(0,200))}));
    brief.ready=answer.ready;
    brief.phase=answer.ready?'ready':'awaiting_answer';
    brief.error=null; brief.pendingMessage=null; brief.initialQuestionsComplete=true;
    brief.updatedAt=new Date().toISOString();
  }
  async startAnalysis(id, analyze, ask) {
    if(this.busy.has(id)) throw bad('商品资料仍在整理中，请稍候',409);
    this.busy.add(id);
    let brief;
    try {
      brief=await this.get(id);
      if(brief.productProfile && brief.initialQuestionsComplete && !brief.pendingMessage && ['ready','awaiting_answer'].includes(brief.phase)) {
        this.busy.delete(id);
        return brief;
      }
      if(typeof analyze!=='function' || typeof ask!=='function') throw bad('资料整理服务尚未就绪',500);
      brief.ready=false;
      await this.setPhase(brief,brief.productProfile?'questioning':'analyzing');
      const work=(async()=>{
        try {
          await this.ensureProfile(brief,analyze);
          await this.setPhase(brief,'questioning');
          const pending=brief.pendingMessage;
          const answer=await ask(brief,pending?.text || '');
          this.applyAnswer(brief,answer,pending);
          await this.save(brief);
        } catch {
          await this.fail(brief);
        } finally {
          this.busy.delete(id);
          this.work.delete(id);
        }
      })();
      this.work.set(id,work);
      // A persistence error is recoverable by get() after the busy marker clears.
      work.catch(()=>{});
      return brief;
    } catch(error) {
      this.busy.delete(id);
      throw error;
    }
  }
  async turn(id,requestId,message,respond) {
    if(this.busy.has(id)) throw bad('上一条回答仍在处理中，请稍候',409);
    this.busy.add(id);
    let brief,started=false;
    try {
      brief=await this.get(id);
      if(brief.messages.some(m=>m.requestId===requestId)) return brief;
      if(brief.messages.length>=40) throw bad('已完成多轮需求沟通，请确认摘要生成方案或重新开始');
      brief.pendingMessage={requestId,text:message}; brief.ready=false;
      await this.setPhase(brief,brief.productProfile?'questioning':'analyzing');
      started=true;
      const answer=await respond(brief,message);
      this.applyAnswer(brief,answer,{requestId,text:message});
      await this.save(brief); return brief;
    } catch(error) {
      if(brief && started) await this.fail(brief);
      throw error;
    } finally {this.busy.delete(id);}
  }
}
export const briefSchema = {
  type:'object', additionalProperties:false, required:['reply','summary','questions','ready'],
  properties: {
    reply:{type:'string'}, summary:{type:'string'}, ready:{type:'boolean'},
    questions:{type:'array',maxItems:3,items:{
      type:'object',additionalProperties:false,required:['question','options'],
      properties:{question:{type:'string'},options:{type:'array',maxItems:4,items:{type:'string'}}}
    }}
  }
};
