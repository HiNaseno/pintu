import multer from 'multer';
import path from 'node:path';

export function installFeedbackHttp(app,{store,ownsJob,findJob}) {
  const upload=multer({storage:multer.memoryStorage(),limits:{files:3,fileSize:5*1024*1024,fields:6,fieldSize:12000}});
  const parseUpload=(req,res,next)=>upload.array('screenshots',3)(req,res,error=>{
    if(error)return res.status(400).json({error:{message:error.code==='LIMIT_FILE_SIZE'?'单张反馈截图不能超过 5 MB':error.code==='LIMIT_FILE_COUNT'||error.code==='LIMIT_UNEXPECTED_FILE'?'最多上传三张反馈截图':'反馈字段或附件格式无效'}});
    next();
  });
  app.post('/api/feedback',parseUpload,async(req,res)=>{
    try {
      if(Object.keys(req.body||{}).some(key=>!['requestId','type','message','rating','jobId','pageId'].includes(key)))return res.status(400).json({error:{message:'反馈包含不支持的字段'}});
      if(req.body.jobId&&!ownsJob(req,req.body.jobId))return res.status(404).json({error:{message:'关联任务不存在或不属于当前会话'}});
      if(req.body.pageId&&!findJob(req.body.jobId)?.analysis?.outputs?.some(page=>(page.pageId||page.id)===req.body.pageId))return res.status(400).json({error:{message:'关联页面不属于当前任务'}});
      const result=await store.submit(req.localSession.ownerId,req.body,req.files||[]);
      res.status(result.replayed?200:201).json({id:result.id,replayed:result.replayed,message:'反馈已保存，感谢你的建议。'});
    }catch(error){res.status(error.status||503).json({error:{message:error.status?error.message:'反馈暂时未能保存，请稍后重试'}});}
  });
  app.get('/api/feedback/:id/screenshots/:index',(req,res)=>{
    const item=store.get(req.params.id),index=Number(req.params.index);
    if(!item||item.ownerId!==req.localSession.ownerId||!/^\d$/.test(req.params.index)||!item.screenshots?.[index])return res.status(404).json({error:{message:'截图不存在'}});
    res.set('Cache-Control','private, no-store').type('image/jpeg').sendFile(path.join(store.images,item.screenshots[index]));
  });
}
