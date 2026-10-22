import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectGenerationReferences, legacyReferenceDirective, legacyReferencesNeedReconfirmation, LEGACY_REFERENCE_POLICY_VERSION} from '../image-references.js';

const first = {referenceId:'first',mimetype:'image/png',originalname:'车内单款.png',path:'/private/one.png'};
const second = {referenceId:'second',mimetype:'image/jpeg',originalname:'四款陈列.jpg',path:'/private/two.jpg'};
const extracted = {referenceId:'pdf-photo',mimetype:'image/png',sourceName:'说明.pdf',sourceKind:'pdf_page',ordinal:2,path:'/private/page.png'};
const job = {workflowVersion:1,fields:{mode:'main'},inputs:[first,second,extracted,{referenceId:'document',mimetype:'application/pdf',path:'/private/source.pdf'},{referenceId:'text',mimetype:'text/plain',path:'/private/source.txt'}],sourceDocuments:[{mimetype:'image/png',path:'/private/source.png'}]};

test('legacy defaults include every decoded image in input order and exclude raw documents',()=>{
  assert.deepEqual(selectGenerationReferences(job,{}),[first,second,extracted]);
  const directive = legacyReferenceDirective(selectGenerationReferences(job,{}));
  assert.ok(directive.indexOf('1. 来源名称 "车内单款.png"') < directive.indexOf('2. 来源名称 "四款陈列.jpg"'));
  assert.match(directive,/3. 来源名称 "说明.pdf"/);
  assert.match(directive,/先检查全部附件/);
  assert.doesNotMatch(directive,/\/private\//);
});

test('legacy explicit references preserve their own subset and order without fallback',()=>{
  assert.deepEqual(selectGenerationReferences(job,{referenceIds:['second','first']}),[second,first]);
  assert.deepEqual(selectGenerationReferences(job,{referenceIds:['second']}),[second]);
  assert.deepEqual(selectGenerationReferences(job,{referenceIds:[]}),[]);
  for (const referenceIds of [['foreign'],['document'],['first','first'],'first',[null]]) {
    assert.throws(()=>selectGenerationReferences(job,{referenceIds}),error=>error.status===400);
  }
});

test('legacy logo and no-product pages do not attach product images',()=>{
  assert.deepEqual(selectGenerationReferences({...job,fields:{mode:'logo'}},{}),[]);
  assert.deepEqual(selectGenerationReferences(job,{visual:{presence:'none'}}),[]);
});

test('modern detail reference selection remains exact including material references on no-product pages',()=>{
  const detail = {...job,workflowVersion:2};
  assert.deepEqual(selectGenerationReferences(detail,{referenceIds:['second','first']}),[second,first]);
  assert.deepEqual(selectGenerationReferences(detail,{referenceIds:[],visual:{presence:'none'}}),[]);
  assert.deepEqual(selectGenerationReferences(detail,{referenceIds:['pdf-photo'],visual:{presence:'none'}}),[extracted]);
  assert.throws(()=>selectGenerationReferences(detail,{referenceIds:['foreign']}),/已确认参考图无法读取/);
});

test('old frozen implicit single-image candidates require explicit rewriting before expanding attachments',()=>{
  const legacy = {...job,analysis:{outputs:[{}]}};
  assert.equal(legacyReferencesNeedReconfirmation(legacy,undefined),false);
  assert.equal(legacyReferencesNeedReconfirmation(legacy,{requestId:'old'}),true);
  assert.equal(legacyReferencesNeedReconfirmation(legacy,{referencePolicyVersion:LEGACY_REFERENCE_POLICY_VERSION}),false);
  assert.equal(legacyReferencesNeedReconfirmation({...legacy,analysis:{outputs:[{referenceIds:['second']}] }},{requestId:'old'}),false);
  assert.equal(legacyReferencesNeedReconfirmation({...legacy,workflowVersion:2},{requestId:'old'}),false);
  assert.equal(legacyReferencesNeedReconfirmation({...legacy,inputs:[first]},{requestId:'old'}),false);
});
