import { test } from 'node:test';
import * as assert from 'node:assert';
import { messages, resolveLang } from '../messages';

test('resolveLang: setting eksplisit menang, auto mengikuti bahasa VS Code', () => {
  assert.strictEqual(resolveLang('id', 'en'), 'id');
  assert.strictEqual(resolveLang('en', 'id'), 'en');
  assert.strictEqual(resolveLang('auto', 'id'), 'id');
  assert.strictEqual(resolveLang('auto', 'en-US'), 'en');
  assert.strictEqual(resolveLang(undefined, 'ja'), 'en');
});

test('pesan tersedia dalam dua bahasa', () => {
  assert.strictEqual(messages('en').envNotFound('.env'), '.env not found.');
  assert.strictEqual(messages('id').envNotFound('.env'), '.env tidak ditemukan.');
});
