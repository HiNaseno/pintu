import test from 'node:test';
import assert from 'node:assert/strict';
import { PiProvider } from '../pi-provider.js';

const schema = { type: 'object', properties: { title: { type: 'string' } }, required: ['title'], additionalProperties: false };
const request = input => ({ model: 'gpt-6.1-sol', input, text: { format: { type: 'json_schema', name: 'test', strict: true, schema } } });
function fixture(create = async () => ({ output_text: '{"title":"材质细节"}' })) {
  const calls = [], events = [];
  const engine = { generate: () => {}, edit: () => {} };
  const transport = { model: 'gpt-6.1-sol', reasoningEffort: 'medium', pending: 0, images: engine,
    responses: { create: async value => { calls.push(value); return create(value); } },
    status: async () => ({ ready: true }), queryImageTask: async directory => ({ outcome: 'UNKNOWN', directory }) };
  return { calls, events, transport, provider: new PiProvider({ transport, onEvent: value => events.push(value) }) };
}

test('Pi really executes the agent lifecycle and forwards schema, text and local image without tools', async () => {
  const { provider, calls, events } = fixture();
  const input = [{ role: 'user', content: [{ type: 'input_text', text: '分析商品' }, { type: 'input_image', image_url: 'data:image/png;base64,YQ==' }] }];
  const response = await provider.responses.create(request(input));
  assert.deepEqual(JSON.parse(response.output_text), { title: '材质细节' });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].text.format.schema, schema);
  assert.equal(calls[0].model, 'gpt-6.1-sol');
  assert.match(calls[0].input[0].content[0].text, /不得.*生成图片/);
  assert.deepEqual(calls[0].input[1].content, input[0].content);
  for (const type of ['agent_start', 'turn_start', 'message_end', 'agent_end']) assert.ok(events.some(event => event.type === type));
  assert.ok(events.every(event => Object.keys(event).sort().join(',') === 'taskId,type'));
  assert.doesNotMatch(JSON.stringify(events), /分析商品|YQ==|材质细节/);
});

test('Pi preserves the original durable image engine and its query path', async () => {
  const { provider, transport, calls } = fixture();
  assert.equal(provider.images, transport.images);
  assert.deepEqual(await provider.queryImageTask('/private/task'), { outcome: 'UNKNOWN', directory: '/private/task' });
  assert.equal(calls.length, 0);
  assert.deepEqual(await provider.status(), { ready: true });
});

test('Pi rejects remote images and invalid requests before model dispatch', async () => {
  const { provider, calls } = fixture();
  for (const bad of [request(''), { ...request('商品'), model: 'another-model' }, { input: '商品' }, request([{ role: 'system', content: [] }]), request([{ role: 'user', content: [{ type: 'input_image', image_url: 'https://example.com/private.png' }] }])]) {
    await assert.rejects(provider.responses.create(bad));
  }
  assert.equal(calls.length, 0);
});

test('Pi handles transport failures and malformed JSON without retry or log disclosure', async () => {
  for (const create of [async () => { throw new Error('img_secret credential and private prompt'); }, async () => ({ output_text: 'invalid JSON' })]) {
    const { provider, calls, events } = fixture(create);
    await assert.rejects(provider.responses.create(request('商品')), error => {
      assert.doesNotMatch(error.message, /img_secret|private prompt|JSON/);
      return true;
    });
    assert.equal(calls.length, 1);
    assert.ok(events.some(event => event.type === 'agent_end'));
  }
});

test('parallel Pi tasks keep separate conversations and lifecycle identifiers', async () => {
  const { provider, calls, events } = fixture(async value => ({ output_text: JSON.stringify({ title: value.input.at(-1).content[0].text }) }));
  const [a, b] = await Promise.all(['商品 A', '商品 B'].map(input => provider.responses.create(request(input))));
  assert.equal(JSON.parse(a.output_text).title, '商品 A');
  assert.equal(JSON.parse(b.output_text).title, '商品 B');
  assert.equal(calls.length, 2);
  assert.equal(new Set(events.map(event => event.taskId)).size, 2);
});

test('general text API uses its dedicated Pi and CLI route without weakening ecommerce restrictions', async () => {
  const {provider,transport,calls}=fixture();
  let generalRequest;
  transport.textChat={create:async request=>{generalRequest=request;return {output_text:'{"answer":"一般文字回答"}'};}};
  const response=await provider.textChat.create(request('解释递归'));
  assert.equal(JSON.parse(response.output_text).answer,'一般文字回答');
  assert.match(generalRequest.input[0].content[0].text,/内网文字助手/);
  assert.equal(calls.length,0);
  await provider.responses.create(request('分析商品'));
  assert.equal(calls.length,1);
  assert.match(calls[0].input[0].content[0].text,/电商视觉策划/);
});
