import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { locales, localeInfo, matchAcceptLanguage, matchLocale } from '../shared/locales.mjs';
import { messagesFor } from '../shared/messages.mjs';

const tags = Object.keys(locales);
assert.equal(tags.length, 24);
assert.equal(new Set(tags.map(tag => tag.split('-')[0])).size, 21);
assert.equal(matchLocale('sr-Latn-RS'), 'sr-Latn');
assert.equal(matchLocale('sr-RS'), 'sr-Cyrl');
assert.equal(matchLocale('zh-TW'), 'zh-Hant');
assert.equal(matchLocale('zh-Hans-HK'), 'zh-Hans');
assert.equal(matchLocale('ar-EG'), 'arz');
assert.equal(matchLocale('pt-PT'), 'pt-BR');
assert.equal(matchLocale('en-GB'), 'en-GB');
assert.equal(matchAcceptLanguage('fr;q=0.2, sr-Latn;q=0.9, en-US;q=0.7'), 'sr-Latn');
assert.equal(matchAcceptLanguage('fr;q=0, xx;q=1, pt;q=0.7'), 'pt-BR');
assert.equal(matchAcceptLanguage('zh-Hant;q=0,*;q=1'), undefined);
assert.equal(matchAcceptLanguage('en;q=0, en-GB;q=1'), 'en-GB');
assert.equal(matchLocale('invalid tag'), undefined);
for (const tag of ['ar', 'arz', 'ur']) assert.equal(localeInfo(tag).dir, 'rtl');

const widget = tags.map(tag => messagesFor(tag));
assert.equal(new Set(widget).size, tags.length, 'Each signed locale needs a separate widget and mail catalog');
const webSource = JSON.parse(await readFile(new URL('../web/src/lib/locales/en-US.json', import.meta.url), 'utf8'));
const tokens = value => (value.match(/\{[\w]+\}/g) || []).sort();
for (const [index, tag] of tags.entries()) {
  const messages = widget[index];
  assert.deepEqual(Object.keys(messages).sort(), Object.keys(widget[0]).sort(), tag);
  assert.ok(Object.values(messages).every(value => value.trim().length > 0), tag);
  for (const [key, source] of Object.entries(widget[0])) {
    assert.deepEqual(tokens(messages[key]), tokens(source), `${tag}/${key}`);
  }
  const web = JSON.parse(await readFile(new URL(`../web/src/lib/locales/${tag}.json`, import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(web).sort(), Object.keys(webSource).sort(), tag);
  assert.ok(web['Get started free'] && web['Email me a sign-in link'] && web['Product ideas'], tag);
  for (const [key, value] of Object.entries(web)) {
    assert.ok(value.trim(), `${tag}/${key}`);
    assert.deepEqual(tokens(value), tokens(webSource[key]), `${tag}/${key}`);
  }
}
assert.match(messagesFor('sr-Cyrl').support, /\p{Script=Cyrillic}/u);
assert.doesNotMatch(messagesFor('sr-Latn').support, /\p{Script=Cyrillic}/u);
console.log('Verified 21 languages, 24 web/widget/mail catalogs, scripts, RTL and language negotiation');
