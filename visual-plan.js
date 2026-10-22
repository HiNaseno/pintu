export const visualSchema = {
  type: 'object', additionalProperties: false,
  required: ['presence', 'background', 'composition', 'shot'],
  properties: {
    presence: {type:'string', enum:['full','detail','none']},
    background: {type:'string'}, composition: {type:'string'}, shot: {type:'string'},
  },
};
export function normalizeVisual(value) {
  if (!value || typeof value !== 'object') return undefined;
  const clean = key => String(value[key] || '').trim().slice(0,key === 'shot' ? 300 : 600);
  return {presence:['full','detail','none'].includes(value.presence)?value.presence:'full', background:clean('background'),composition:clean('composition'),shot:clean('shot')};
}
export function diversifyDetails(outputs, requirements='') {
  if (/统一背景|相同背景|同一背景|背景一致|背景统一|same background|consistent background/i.test(requirements)) return;
  const items=outputs.filter(o=>o.planType==='detail' && o.visual);
  const recipes=[['品牌色渐变空间','非对称主视觉与留白'],['柔和自然光的中性空间','左右分区叙事'],['简洁浅色信息底','网格信息卡片'],['深浅对比的质感背景','纵向层次排版']];
  const seen=new Set(), backgrounds=new Set(); let previous='', previousBackground='';
  items.forEach((item,i)=>{
    const v=item.visual; const key=`${v.background}|${v.composition}`;
    if (!v.background || !v.composition || key===previous || v.background===previousBackground || (items.length>=4 && i<3 && (seen.has(key) || backgrounds.has(v.background)))) {
      [v.background,v.composition]=recipes[i%recipes.length];
    }
    previous=`${v.background}|${v.composition}`; previousBackground=v.background; seen.add(previous);backgrounds.add(v.background);
  });
}
export function visualDirective(output) {
  const v=output?.visual;
  if(!v) return '';
  const rule=v.presence==='none'
    ? '本屏不展示完整商品或商品轮廓，不要强行加入商品照片。以已确认的材质、工艺说明、信息图或文字排版作为主视觉；没有实拍证据的表现须明确为示意，不虚构微观结构、参数、认证或实验结果。'
    : v.presence==='detail'
    ? '本屏仅展示真实商品局部特写，允许裁切和放大，不要求出现完整商品；保留可见材质、纹理、颜色和结构，不虚构不可见的内部结构。'
    : '本屏展示完整商品，严格保持实物外观与品牌标识。';
  return `【本屏视觉安排，优先于旧的画面描述】\n${rule}\n背景：${v.background}。构图：${v.composition}。镜头：${v.shot}。`;
}
export function suiteDirective(job,output) {
  if(!output.visual) return '';
  const items=job.analysis.outputs || [];
  return `【用户已确认的需求，优先于通用卖点建议】
${String(job.fields?.requirements || '').slice(0,6000)}
只应用与本屏有关的要求；用户指定的标题、正文须逐字保留，不能被通用卖点替换，也不要加入其他屏的文案。没有指定文案时才从事实中提炼。
【整套视觉节奏】\n统一风格：${job.analysis.suiteStyle || job.analysis.visualDirection}。统一配色和文字层级，不等于重复背景。\n${items.map((o,i)=>`${i+1}. ${o.title}：${o.visual?`${o.visual.presence}；${o.visual.background}；${o.visual.composition}；${o.visual.shot}`:o.creativeRole}`).join('\n')}\n本屏只完成自己的主题，勿复制相邻屏构图。\n${visualDirective(output)}`;
}
