import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {DESIGN_FIELDS,validateDesignSystem,validateCrops,validateCoverage,orientedCrop,cropKey} from '../detail-design.js';

test('design specification is optional for old tasks but rejects missing or excessive fields',()=>{
  assert.equal(validateDesignSystem(undefined),undefined);
  const design=Object.fromEntries(Object.keys(DESIGN_FIELDS).map(key=>[key,'一致的品牌规范']));
  assert.deepEqual(validateDesignSystem(design),design);
  assert.throws(()=>validateDesignSystem({...design,palette:''}));
  assert.throws(()=>validateDesignSystem({...design,lightMood:'x'.repeat(601)}));
});
test('crop rejects foreign references, malformed numbers, overflow and zero area',()=>{
  const crop={x:.5,y:0,width:.5,height:1};
  assert.deepEqual(validateCrops({image:crop},['image']),{image:crop});
  for(const value of [{foreign:crop},{image:{...crop,width:.6}},{image:{...crop,width:0}},{image:{...crop,x:'0'}},{image:{...crop,y:NaN}}])assert.throws(()=>validateCrops(value,['image']));
  assert.notEqual(cropKey(crop),cropKey({...crop,x:0}));
});
test('actual crop uses selected pixels without changing the original and handles EXIF rotation first',async()=>{
  const source=await sharp({create:{width:100,height:60,channels:3,background:'#ff0000'}}).composite([{input:await sharp({create:{width:50,height:60,channels:3,background:'#0000ff'}}).png().toBuffer(),left:50,top:0}]).png().toBuffer();
  const cropped=await orientedCrop(source,{x:.5,y:0,width:.5,height:1});
  const {data,info}=await cropped.raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,50);assert.equal(info.height,60);assert.deepEqual([...data.subarray(0,3)],[0,0,255]);
  assert.equal((await sharp(source).metadata()).width,100);
  const camera=await sharp(source).jpeg().withMetadata({orientation:6}).toBuffer();
  const rotated=await orientedCrop(camera,{x:0,y:0,width:1,height:.5});
  const result=await rotated.raw().toBuffer({resolveWithObject:true});
  assert.equal(result.info.width,60);assert.equal(result.info.height,50);
});
test('coverage requires an existing page unless explicitly disabled and follows stable IDs',()=>{
  const item={name:'棉',part:'面料',evidence:'用户确认',enabled:true,pageIds:['material']};
  assert.deepEqual(validateCoverage([item],[{id:'material'}]),[item]);
  assert.throws(()=>validateCoverage([{...item,pageIds:[]}],[{id:'material'}]),/请选择|选择介绍页面/);
  assert.throws(()=>validateCoverage([item],[{id:'hero'}]),/无效页面/);
  assert.equal(validateCoverage([{...item,enabled:false,pageIds:[]}],[{id:'hero'}])[0].enabled,false);
});
