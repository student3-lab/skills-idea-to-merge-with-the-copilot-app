import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUrl,
  generateSlug,
  createUniqueSlug,
  isValidBookmark,
  parseStoredBookmarks,
  serializeBookmarks,
  formatBookmark,
  SLUG_PREFIX,
} from './bookmarks.js';

test('normalizeUrl: adds https:// when the scheme is missing', () => {
  assert.equal(normalizeUrl('www.example.com'), 'https://www.example.com/');
});

test('normalizeUrl: a URL with and without https:// normalises to the same saved value', () => {
  const withScheme = normalizeUrl('https://www.example.com');
  const withoutScheme = normalizeUrl('www.example.com');
  assert.equal(withScheme, withoutScheme);
  assert.equal(withScheme, 'https://www.example.com/');
});

test('normalizeUrl: preserves an explicit non-https scheme', () => {
  assert.equal(normalizeUrl('http://example.com'), 'http://example.com/');
});

test('normalizeUrl: trims surrounding whitespace', () => {
  assert.equal(normalizeUrl('  example.com  '), 'https://example.com/');
});

test('normalizeUrl: rejects empty and non-string input', () => {
  assert.equal(normalizeUrl(''), null);
  assert.equal(normalizeUrl('   '), null);
  assert.equal(normalizeUrl(null), null);
  assert.equal(normalizeUrl(undefined), null);
  assert.equal(normalizeUrl(42), null);
});

test('normalizeUrl: rejects unparseable garbage', () => {
  assert.equal(normalizeUrl('not a url at all ???'), null);
});

test('generateSlug: has the mona- prefix and requested base62 length', () => {
  const slug = generateSlug(4, () => 0);
  assert.match(slug, /^mona-[0-9a-zA-Z]{4}$/);
  assert.ok(slug.startsWith(SLUG_PREFIX));
});

test('generateSlug: is deterministic given an injected random function', () => {
  const always0 = () => 0;
  assert.equal(generateSlug(4, always0), generateSlug(4, always0));
});

test('createUniqueSlug: avoids collisions with existing slugs', () => {
  let call = 0;
  // First call returns 0 (collides with mona-0000), then 0.5 for a fresh slug.
  const randomFn = () => (call++ === 0 ? 0 : 0.5);
  const slug = createUniqueSlug(['mona-0000'], randomFn, 4);
  assert.notEqual(slug, 'mona-0000');
});

test('isValidBookmark: accepts well-formed records', () => {
  assert.equal(isValidBookmark({ url: 'https://example.com/', slug: 'mona-7fk2' }), true);
});

test('isValidBookmark: rejects malformed records', () => {
  assert.equal(isValidBookmark(null), false);
  assert.equal(isValidBookmark(undefined), false);
  assert.equal(isValidBookmark('string'), false);
  assert.equal(isValidBookmark(42), false);
  assert.equal(isValidBookmark([]), false);
  assert.equal(isValidBookmark({}), false);
  assert.equal(isValidBookmark({ url: 'https://example.com/' }), false);
  assert.equal(isValidBookmark({ slug: 'mona-7fk2' }), false);
  assert.equal(isValidBookmark({ url: 42, slug: 'mona-7fk2' }), false);
  assert.equal(isValidBookmark({ url: '', slug: 'mona-7fk2' }), false);
  assert.equal(isValidBookmark({ url: 'https://example.com/', slug: '' }), false);
});

test('parseStoredBookmarks: recovers from an empty value', () => {
  assert.deepEqual(parseStoredBookmarks(''), []);
  assert.deepEqual(parseStoredBookmarks(null), []);
  assert.deepEqual(parseStoredBookmarks(undefined), []);
});

test('parseStoredBookmarks: recovers from corrupted JSON instead of throwing', () => {
  assert.doesNotThrow(() => parseStoredBookmarks('{not valid json'));
  assert.deepEqual(parseStoredBookmarks('{not valid json'), []);
});

test('parseStoredBookmarks: recovers from a legacy / non-array shape', () => {
  assert.deepEqual(parseStoredBookmarks(JSON.stringify({ url: 'https://example.com/' })), []);
  assert.deepEqual(parseStoredBookmarks(JSON.stringify('just a string')), []);
  assert.deepEqual(parseStoredBookmarks(JSON.stringify(42)), []);
  assert.deepEqual(parseStoredBookmarks(JSON.stringify(null)), []);
});

test('parseStoredBookmarks: drops malformed entries but keeps valid ones', () => {
  const raw = JSON.stringify([
    { url: 'https://example.com/', slug: 'mona-7fk2' },
    { url: 'not-an-object-missing-slug' },
    null,
    42,
    { url: 'https://other.com/', slug: 'mona-99zz' },
  ]);
  assert.deepEqual(parseStoredBookmarks(raw), [
    { url: 'https://example.com/', slug: 'mona-7fk2' },
    { url: 'https://other.com/', slug: 'mona-99zz' },
  ]);
});

test('serializeBookmarks: drops malformed entries and handles non-array input', () => {
  assert.equal(serializeBookmarks('not an array'), '[]');
  assert.equal(serializeBookmarks(null), '[]');
  assert.equal(
    serializeBookmarks([{ url: 'https://example.com/', slug: 'mona-7fk2' }, { bogus: true }]),
    JSON.stringify([{ url: 'https://example.com/', slug: 'mona-7fk2' }])
  );
});

test('formatBookmark: uses the exact " :: " separator', () => {
  assert.equal(
    formatBookmark({ url: 'https://www.example.com', slug: 'mona-7fk2' }),
    'https://www.example.com :: mona-7fk2'
  );
});

test('formatBookmark: returns an empty string for a malformed bookmark rather than throwing', () => {
  assert.doesNotThrow(() => formatBookmark(null));
  assert.equal(formatBookmark(null), '');
  assert.equal(formatBookmark({}), '');
});
