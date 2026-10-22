import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {analyzeProduct, PRODUCT_PROFILE_SCHEMA, validateProductProfile} from '../product-profile.js';
import {readMaterials} from '../document-reader.js';

const profile={product:'不锈钢保温杯',category:'饮水器具',features:['杯身银色（来源：参考图片）'],confirmedFacts:['容量 500ml（来源：商品文档）'],unknowns:['品牌信息未确认']};
const fixture=async name=>({originalname:name,buffer:await fs.readFile(new URL(`./fixtures/${name}`,import.meta.url))});

test('recognition uses all image references, document text and supplied facts in a dedicated structured call',async()=>{
 const materials=await readMaterials([await fixture('product.pdf'),await fixture('product-image.docx'),await fixture('product.txt')]);
 let request;
 const client={responses:{create:async value=>{request=value;return {output_text:JSON.stringify(profile)};}}};
 const result=await analyzeProduct({client,model:'test-text-model',fields:{mode:'detail',requirements:'面向通勤人群'},materials});
 assert.equal(request.model,'test-text-model');
 assert.equal(request.text.format.name,'product_profile');assert.equal(request.text.format.strict,true);
 assert.deepEqual(request.text.format.schema,PRODUCT_PROFILE_SCHEMA);
 const content=request.input[0].content;
 assert.equal(content.filter(part=>part.type==='input_image').length,materials.images.length);
 const text=content.filter(part=>part.type==='input_text').map(part=>part.text).join('\n');
 for(const image of materials.images) assert.ok(text.includes(image.referenceId));
 assert.ok(text.includes(materials.text));assert.match(text,/面向通勤人群/);
 assert.match(text,/不要提问/);assert.match(text,/不得凭外观推断/);assert.match(text,/已在资料中清楚给出的事实不能重复列为缺失信息/);
 assert.equal(result.product,profile.product);
 assert.equal(result.sources.length,3);assert.ok(result.sources.some(source=>source.sourceName==='product.txt'));
 assert.ok(result.sources.every(source=>!('path' in source)&&!('buffer' in source)&&!('filename' in source)));
});

test('text-only recognition does not invent visual inputs and retains document provenance',async()=>{
 const materials=await readMaterials([await fixture('product.txt')]);
 let request;
 const expected={...profile,features:[],unknowns:['尚未提供实拍图，外观待确认']};
 const result=await analyzeProduct({client:{responses:{create:async value=>{request=value;return {output_text:JSON.stringify(expected)};}}},model:'test',materials});
 assert.equal(request.input[0].content.filter(part=>part.type==='input_image').length,0);
 assert.equal(result.sources.length,1);assert.equal(result.sources[0].sourceName,'product.txt');
 assert.deepEqual(result.features,[]);assert.deepEqual(result.unknowns,expected.unknowns);
});

test('incomplete, oversized and unstructured recognition outputs fail rather than becoming guessed facts',async()=>{
 for(const result of [null,[],{...profile,product:''},{...profile,features:'silver'},{...profile,confirmedFacts:[{fact:'500ml'}]},{...profile,unknowns:Array(13).fill('unknown')},{...profile,category:'x'.repeat(1201)},{...profile,extra:'unexpected'}]) {
  assert.throws(()=>validateProductProfile(result),{status:502});
 }
 for(const output_text of ['not json','null',JSON.stringify({...profile,sources:[{sourceName:'invented'}]})]) {
  await assert.rejects(analyzeProduct({client:{responses:{create:async()=>({output_text})}},model:'test',materials:{images:[],text:'500ml',sources:[]}}),{status:502});
 }
 const clean=validateProductProfile(profile,[{sourceId:'one',sourceName:'product.txt',path:'/private/source',buffer:'private'}]);
 assert.ok(!JSON.stringify(clean).includes('/private'));assert.equal(clean.sources[0].sourceName,'product.txt');
});
