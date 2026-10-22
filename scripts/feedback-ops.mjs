import fs from 'node:fs';
import path from 'node:path';
import {FeedbackStore} from '../feedback-store.js';

const [command='list',...args]=process.argv.slice(2);
const root=path.resolve(process.env.PINTU_RUNTIME_ROOT||'runtime');
const store=new FeedbackStore(path.join(root,'feedback'));
const option=name=>args.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3);
try {
  if(command==='list'||command==='export') {
    const rows=store.list({status:option('status'),type:option('type'),from:option('from')});
    if(command==='list')console.log(JSON.stringify(rows,null,2));
    else {
      if(!option('output'))throw new Error('请指定 --output=/受限导出目录');
      const output=path.resolve(option('output'));fs.mkdirSync(output,{recursive:true,mode:0o700});fs.chmodSync(output,0o700);
      fs.writeFileSync(path.join(output,'feedback.json'),JSON.stringify(rows,null,2)+'\n',{mode:0o600});
      const screenshots=path.join(output,'screenshots');fs.mkdirSync(screenshots,{recursive:true,mode:0o700});
      for(const row of rows)for(const name of row.screenshots||[]) {const dest=path.join(screenshots,name);fs.copyFileSync(path.join(store.images,name),dest);fs.chmodSync(dest,0o600);}
      console.log(`已导出 ${rows.length} 条反馈到 ${output}`);
    }
  } else if(command==='status') {store.status(args[0],args[1]);console.log('状态已更新');}
  else if(command==='delete') {if(!args.includes('--confirm-delete'))throw new Error('删除需要 --confirm-delete');store.delete(args[0]);console.log('反馈已删除');}
  else throw new Error('用法：list | export --output=目录 [--status=pending|processing|resolved] [--type=material] [--from=YYYY-MM-DD] | status ID 状态 | delete ID --confirm-delete');
}catch(error){console.error(error.message);process.exitCode=1;}finally{store.close();}
