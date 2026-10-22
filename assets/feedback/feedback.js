(() => {
  const make=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
  const dialog=make('dialog',null,'pt-feedback');dialog.setAttribute('aria-labelledby','pt-feedback-title');
  const form=make('form');form.method='dialog';
  const heading=make('div',null,'pt-dialog-heading'),title=make('h2','意见反馈');title.id='pt-feedback-title';heading.append(title);
  const close=make('button','关闭');close.type='button';close.onclick=()=>dialog.close();heading.append(close);form.append(heading);
  const field=(text,control)=>{const label=make('label',null,'pt-feedback-field');label.append(make('span',text),control);form.append(label);return control;};
  const types={continuity:'详情页不连贯',material:'材质展示问题',image:'图片效果',interface:'界面或操作问题',suggestion:'功能建议',other:'其他'};
  const type=make('select');for(const [value,label] of Object.entries(types)){const opt=make('option',label);opt.value=value;type.append(opt);}field('反馈类型',type);
  const rating=make('select');for(const [value,label] of [['','暂不评分'],['1','1 分 · 很不满意'],['2','2 分'],['3','3 分 · 一般'],['4','4 分'],['5','5 分 · 满意']]){const opt=make('option',label);opt.value=value;rating.append(opt);}field('效果评分（选填）',rating);
  const message=make('textarea');message.required=true;message.maxLength=3000;message.rows=5;message.placeholder='哪里不满意？希望怎样改进？';field('你的意见',message);
  const attachments=make('input');attachments.type='file';attachments.accept='image/png,image/jpeg,image/webp';attachments.multiple=true;field('截图（选填，最多 3 张，每张 5 MB）',attachments);
  const previews=make('div',null,'pt-feedback-previews');form.append(previews);
  const contextLabel=make('label',null,'pt-feedback-context'),associate=make('input');associate.type='checkbox';const contextText=make('span');contextLabel.append(associate,contextText);form.append(contextLabel);
  form.append(make('p','反馈只保存在本机；不会自动收集提示词、商品素材或日志。截图请自行检查后上传。','pt-feedback-note'));
  const status=make('p',null,'pt-feedback-status');status.setAttribute('role','status');form.append(status);
  const submit=make('button','提交反馈','pt-feedback-submit');submit.type='submit';form.append(submit);dialog.append(form);document.body.append(dialog);
  let context=null,requestId=null,busy=false,urls=[];
  const uuid=()=>{if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
  const open=value=>{
    if(busy)return;
    context=value||window.pintuFeedbackContext?.()||null;associate.checked=false;contextLabel.hidden=!context?.jobId;
    contextText.textContent=context?.jobId?`关联${context.label||'当前任务'}（仅记录任务和页面编号）`:'';
    status.textContent='';if(!dialog.open)dialog.showModal();
  };
  const resetPreviews=()=>{urls.forEach(URL.revokeObjectURL);urls=[];previews.replaceChildren();};
  attachments.addEventListener('change',()=>{resetPreviews();for(const file of [...attachments.files].slice(0,3)){const image=make('img');image.alt='待提交截图';image.src=URL.createObjectURL(file);urls.push(image.src);previews.append(image);}});
  form.addEventListener('input',()=>{requestId=null;});form.addEventListener('change',()=>{requestId=null;});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!form.reportValidity())return;
    const files=[...attachments.files];if(files.length>3||files.some(file=>file.size>5*1024*1024)){status.textContent='最多三张截图，每张不超过 5 MB。';return;}
    busy=true;submit.disabled=true;close.disabled=true;for(const input of form.querySelectorAll('input,textarea,select'))input.disabled=true;status.textContent='正在保存反馈…';
    try {
      const session=await window.pintuSession.ready();
      if(!session.authenticated){window.pintuSession.open();throw new Error('请先解锁本机访问，再提交反馈。');}if(!session.csrfToken)throw new Error('无法建立本机会话，请刷新后重试。');
      requestId ||= uuid();const body=new FormData();body.set('requestId',requestId);body.set('type',type.value);body.set('message',message.value);body.set('rating',rating.value);
      if(associate.checked&&context?.jobId){body.set('jobId',context.jobId);if(context.pageId)body.set('pageId',context.pageId);}
      files.forEach(file=>body.append('screenshots',file));
      const response=await fetch('/api/feedback',{method:'POST',credentials:'same-origin',headers:{'X-Pintu-CSRF':session.csrfToken},body});const payload=await response.json();
      if(!response.ok)throw new Error(payload.error?.message||'反馈未能保存，请稍后重试。');
      status.textContent=`反馈已保存，编号 ${payload.id.slice(0,8)}。谢谢你的建议。`;form.reset();resetPreviews();requestId=null;
    }catch(error){status.textContent=error.message||'网络中断，请重试；相同反馈不会重复保存。';}
    finally{busy=false;submit.disabled=false;close.disabled=false;for(const input of form.querySelectorAll('input,textarea,select'))input.disabled=false;}
  });
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  const nav=document.querySelector('.site-actions')||document.querySelector('.site-nav,.topbar nav');const button=make('button','意见反馈','pt-feedback-entry');button.type='button';button.onclick=()=>open();(nav||document.body).append(button);
  window.pintuFeedback=Object.freeze({open});
  window.addEventListener('pintu-session-changed',()=>{context=null;associate.checked=false;contextLabel.hidden=true;requestId=null;});
})();
