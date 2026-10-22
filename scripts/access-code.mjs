import readline from 'node:readline';
import { Writable } from 'node:stream';
import { hashAccessCode } from '../execution/access.js';

// Do not accept command-line arguments: they can be exposed by process listings
// and shell history. Interactive input is hidden; pipelines are also supported.
if (process.argv.length > 2) {
  process.stderr.write('请运行 node scripts/access-code.mjs 后输入口令，不要把口令放在命令行参数中。\n');
  process.exitCode = 1;
} else {
  let value = process.env.PINTU_ACCESS_CODE_INPUT;
  delete process.env.PINTU_ACCESS_CODE_INPUT;
  if (value === undefined) {
    const output = new Writable({ write(_chunk, _encoding, done) { done(); } });
    const reader = readline.createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
    if (process.stdin.isTTY) process.stderr.write('输入访问口令（至少 12 个字符，不回显）：');
    try { value = await new Promise(resolve => { reader.once('line', resolve); reader.once('close', () => resolve('')); }); }
    finally { reader.close(); if (process.stdin.isTTY) process.stderr.write('\n'); }
  }
  try { process.stdout.write(`${hashAccessCode(value)}\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
  value = undefined;
}
