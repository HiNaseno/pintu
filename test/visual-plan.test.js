import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVisual,diversifyDetails,visualDirective,suiteDirective} from '../visual-plan.js';
test('six-screen details use multiple combinations without forcing product presence',()=>{
 const outputs=Array.from({length:6},(_,i)=>({planType:'detail',title:`屏${i}`,visual:{presence:i===2?'none':'detail',background:'白底',composition:'居中',shot:'特写'}}));
 diversifyDetails(outputs);
 assert.ok(new Set(outputs.map(o=>`${o.visual.background}/${o.visual.composition}`)).size>=3);
 outputs.slice(1).forEach((o,i)=>assert.notEqual(`${o.visual.background}/${o.visual.composition}`,`${outputs[i].visual.background}/${outputs[i].visual.composition}`));
 assert.equal(outputs[2].visual.presence,'none');
 assert.match(suiteDirective({analysis:{outputs,suiteStyle:'浅绿统一色系'}},outputs[2]),/浅绿统一色系/);
 assert.match(visualDirective(outputs[2]),/不展示完整商品/);
});
test('explicit consistent background and legacy outputs remain unchanged',()=>{
 const outputs=[{planType:'detail',visual:{presence:'full',background:'白底',composition:'居中'}}];
 const original=JSON.stringify(outputs);diversifyDetails(outputs,'整套统一背景');assert.equal(JSON.stringify(outputs),original);
 assert.equal(normalizeVisual(null),undefined);assert.equal(visualDirective({}),'');
});

test('initial and retry prompts retain suite context and do not lock a product into no-product screens',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
 const source=readFileSync(new URL('../server.js',import.meta.url),'utf8');
 const ctx=vm.createContext({normalizeSellingPoints:v=>v||[],normalizeSelectedStyle:()=>null,cleanShortText:(v,n)=>String(v||'').slice(0,n),getPlatformVisualRule:()=>'',getVisualRecipeRule:()=>'',repeatedLayoutGuard:()=>'',productLockDirective:()=> 'PRODUCT_PHOTO_LOCK',suiteDirective});
 vm.runInContext(source.slice(source.indexOf('const buildImagePrompt ='),source.indexOf('const wait =')),ctx);
 ctx.output={title:'材质说明',type:'详情页',planType:'detail',visual:{presence:'none',background:'信息底',composition:'平面图解',shot:'平面'}};
 ctx.job={fields:{language:'中文（简体）'},inputs:[{}],analysis:{suiteStyle:'品牌配色',visualDirection:'干净',outputs:[ctx.output]}};
 for(const fn of ['buildImagePrompt','buildRetryImagePrompt']){
   const prompt=vm.runInContext(`${fn}(job,output,0)`,ctx);
   assert.match(prompt,/品牌配色/);assert.match(prompt,/不展示完整商品/);assert.doesNotMatch(prompt,/PRODUCT_PHOTO_LOCK/);
 }
});
