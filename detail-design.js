import crypto from 'node:crypto';
import sharp from 'sharp';

export const DESIGN_FIELDS = {
  palette: '主辅色', typography: '字体与层级', titlePlacement: '标题区域', spacing: '边距与留白',
  components: '信息卡片', decorations: '装饰元素', lightMood: '光影色调',
};
export const DESIGN_SCHEMA = {type:'object',additionalProperties:false,required:Object.keys(DESIGN_FIELDS),
  properties:Object.fromEntries(Object.keys(DESIGN_FIELDS).map(key=>[key,{type:'string'}]))};
const fail = message => Object.assign(new Error(message),{status:400});
export function validateDesignSystem(value) {
  if (value == null) return undefined; // Existing saved tasks retain their original suiteStyle.
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key=>!Object.hasOwn(DESIGN_FIELDS,key))) throw fail('整套设计规范格式无效');
  return Object.fromEntries(Object.keys(DESIGN_FIELDS).map(key=>{
    if(typeof value[key]!=='string'||!value[key].trim()||value[key].length>600)throw fail(`${DESIGN_FIELDS[key]}不能为空或超过 600 字`);
    return [key,value[key]];
  }));
}
export function designDirective(value) {
  const design=validateDesignSystem(value);
  return design ? `【整套固定设计规范，优先于单屏风格建议】\n${Object.entries(design).map(([key,text])=>`${DESIGN_FIELDS[key]}：${text}`).join('\n')}\n所有页面保持这些识别元素；具体背景、道具与镜头按本屏主题变化。统一色温和质感不等于复制场景。` : '';
}
export function validateCrops(value, referenceIds) {
  if (value == null) return {};
  if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>6)throw fail('局部框选格式无效');
  const result={};
  for(const [id,rect] of Object.entries(value)) {
    if(!referenceIds.includes(id)||!rect||typeof rect!=='object'||Array.isArray(rect)||Object.keys(rect).some(key=>!['x','y','width','height'].includes(key)))throw fail('局部框选必须属于本屏已选参考图');
    const {x,y,width,height}=rect;
    if(![x,y,width,height].every(Number.isFinite)||x<0||y<0||width<=0||height<=0||x+width>1||y+height>1)throw fail('局部框选越界或面积无效');
    result[id]={x,y,width,height};
  }
  return result;
}
export function validateCoverage(value,pages) {
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>12)throw fail('材质介绍清单无效');
  return value.map(item=>{
    if(!item||typeof item!=='object'||typeof item.enabled!=='boolean')throw fail('材质介绍清单无效');
    const result={enabled:item.enabled};
    for(const key of ['name','part','evidence']) {
      if(typeof item[key]!=='string'||!item[key].trim()||item[key].length>1000)throw fail('材质名称、部位和事实依据不能为空或过长');
      result[key]=item[key];
    }
    if(!Array.isArray(item.pageIds)||item.pageIds.length>12||new Set(item.pageIds).size!==item.pageIds.length||item.pageIds.some(id=>!pages.some(page=>(page.id||page.pageId)===id)))throw fail('材质介绍关联了无效页面，请重新选择');
    if(item.enabled&&!item.pageIds.length)throw fail(`请为“${item.name}”选择介绍页面，或取消该项`);
    result.pageIds=[...item.pageIds];return result;
  });
}
export function cropKey(rect) {return rect?crypto.createHash('sha256').update(JSON.stringify(rect)).digest('hex').slice(0,16):'full';}
export async function orientedCrop(input,rect) {
  if(rect)validateCrops({reference:rect},['reference']);
  const {data,info}=await sharp(input,{limitInputPixels:40_000_000}).rotate().toBuffer({resolveWithObject:true});
  if(!rect)return sharp(data);
  const left=Math.min(info.width-1,Math.floor(rect.x*info.width)),top=Math.min(info.height-1,Math.floor(rect.y*info.height));
  const width=Math.max(1,Math.min(info.width-left,Math.round(rect.width*info.width))),height=Math.max(1,Math.min(info.height-top,Math.round(rect.height*info.height)));
  return sharp(data).extract({left,top,width,height});
}
