(() => {
  window.pintuCrop={open:({url,initial})=>new Promise(resolve=>{
    const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
    const dialog=el('dialog');dialog.className='pt-crop-dialog';dialog.setAttribute('aria-label','框选真实材质局部');
    const heading=el('h2','框选真实材质局部');dialog.append(heading,el('p','拖动框选，或输入百分比调整。只使用照片中真实可见的区域；不会额外生图扣额。'));
    const stage=el('div');stage.className='pt-crop-stage';const image=el('img');image.alt='原图局部框选';const box=el('div');box.className='pt-crop-box';stage.append(image,box);dialog.append(stage);
    const fields=el('div');fields.className='pt-crop-fields';const inputs={};
    for(const [key,name] of [['x','左侧 %'],['y','顶部 %'],['width','宽度 %'],['height','高度 %']]){const label=el('label',name),input=el('input');input.type='number';input.min=key==='x'||key==='y'?'0':'0.1';input.max='100';input.step='0.1';label.append(input);fields.append(label);inputs[key]=input;}
    dialog.append(fields);const note=el('p','正在读取原图…');note.setAttribute('role','status');dialog.append(note);
    const controls=el('div');controls.className='pt-crop-controls';const preview=el('canvas');preview.className='pt-crop-preview';preview.setAttribute('aria-label','框选预览');const save=el('button','使用该局部'),clear=el('button','清除框选'),cancel=el('button','取消');[save,clear,cancel].forEach(button=>button.type='button');controls.append(preview,save,clear,cancel);dialog.append(controls);document.body.append(dialog);
    let rect=initial?{...initial}:{x:0,y:0,width:1,height:1},anchor=null,blobUrl=null,sourceWidth=0,sourceHeight=0,done=false;
    const finish=value=>{if(done)return;done=true;if(dialog.open)dialog.close();dialog.remove();if(blobUrl)URL.revokeObjectURL(blobUrl);resolve(value);};
    const valid=()=>Object.values(rect).every(Number.isFinite)&&rect.x>=0&&rect.y>=0&&rect.width>0&&rect.height>0&&rect.x+rect.width<=1&&rect.y+rect.height<=1;
    const update=(writeFields=true)=>{
      const okay=valid()&&image.naturalWidth>0;save.disabled=!okay;box.hidden=!okay;
      if(!okay){note.textContent='请在图片范围内选择有面积的局部。';return;}
      box.style.left=`${rect.x*100}%`;box.style.top=`${rect.y*100}%`;box.style.width=`${rect.width*100}%`;box.style.height=`${rect.height*100}%`;
      if(writeFields)for(const key of Object.keys(inputs))inputs[key].value=String(Number((rect[key]*100).toFixed(2)));
      preview.width=150;preview.height=Math.max(1,Math.min(90,Math.round(150*rect.height*image.naturalHeight/(rect.width*image.naturalWidth))));
      preview.getContext('2d').drawImage(image,rect.x*image.naturalWidth,rect.y*image.naturalHeight,rect.width*image.naturalWidth,rect.height*image.naturalHeight,0,0,preview.width,preview.height);
      const width=Math.round(sourceWidth*rect.width),height=Math.round(sourceHeight*rect.height);
      note.textContent=`原图选区约 ${width} × ${height} 像素。${Math.min(width,height)<300?'选区较小，放大可能不清晰；建议补充真实细节照片。':'可用于展示真实局部；不会凭空补造纹理。'}`;
    };
    const position=event=>{const area=stage.getBoundingClientRect();return {x:Math.min(1,Math.max(0,(event.clientX-area.left)/area.width)),y:Math.min(1,Math.max(0,(event.clientY-area.top)/area.height))};};
    stage.onpointerdown=event=>{if(!image.naturalWidth)return;event.preventDefault();anchor=position(event);stage.setPointerCapture(event.pointerId);};
    stage.onpointermove=event=>{if(!anchor)return;const end=position(event);rect={x:Math.min(anchor.x,end.x),y:Math.min(anchor.y,end.y),width:Math.abs(end.x-anchor.x),height:Math.abs(end.y-anchor.y)};update();};
    stage.onpointerup=()=>{anchor=null;};stage.onpointercancel=()=>{anchor=null;};
    fields.oninput=()=>{rect=Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,Number(input.value)/100]));update(false);};
    save.onclick=()=>{if(valid())finish({action:'save',rect});};clear.onclick=()=>finish({action:'clear'});cancel.onclick=()=>finish(null);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
    dialog.showModal();save.disabled=true;
    fetch(url,{credentials:'same-origin',cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error('素材无法读取，请刷新后重试。');sourceWidth=Number(response.headers.get('X-Source-Width'));sourceHeight=Number(response.headers.get('X-Source-Height'));return response.blob();}).then(blob=>{if(done)return;blobUrl=URL.createObjectURL(blob);image.onload=()=>{sourceWidth ||= image.naturalWidth;sourceHeight ||= image.naturalHeight;update();};image.src=blobUrl;}).catch(error=>{if(!done)note.textContent=error.message;});
  })};
})();
