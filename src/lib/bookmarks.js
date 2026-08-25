// Pure helpers for Mona's Bookmark Manager.
//
// Nothing in this module touches the DOM, `localStorage`, or any other
// browser-only API — that keeps it safe to import from the static Astro
// build AND to unit test with a plain Node.js test runner (see
// bookmarks.test.js). All browser storage access lives in the client
// <script> boundary inside Bookmarks.astro, which calls into these helpers.

export const STORAGE_KEY = 'mona-bookmarks';
export const SLUG_PREFIX = 'mona-';

const BASE62_ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Normalise user-typed input into a fully-qualified URL string.
 * Accepts input with or without a scheme (adds "https://" when missing).
 * Returns `null` when the input can't be parsed as a valid URL.
 * @param {unknown} input
 * @returns {string | null}
 */
export function normalizeUrl(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    return new URL(candidate).href;
  } catch {
    return null;
  }
}

/**
 * Generate a random base62 slug. Length is the number of base62 characters
 * after the prefix, e.g. length 4 → "mona-7fk2".
 * @param {number} [length]
 * @param {() => number} [randomFn] injectable for deterministic tests
 * @returns {string}
 */
export function generateSlug(length = 4, randomFn = Math.random) {
  let suffix = '';
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(randomFn() * BASE62_ALPHABET.length);
    suffix += BASE62_ALPHABET[index];
  }
  return `${SLUG_PREFIX}${suffix}`;
}

/**
 * Generate a slug guaranteed not to collide with `existingSlugs`.
 * @param {Iterable<string>} [existingSlugs]
 * @param {() => number} [randomFn]
 * @param {number} [length]
 * @returns {string}
 */
export function createUniqueSlug(existingSlugs = [], randomFn = Math.random, length = 4) {
  const taken = new Set(existingSlugs);
  let slug = generateSlug(length, randomFn);
  let attempts = 0;
  while (taken.has(slug) && attempts < 50) {
    slug = generateSlug(length, randomFn);
    attempts += 1;
  }
  return slug;
}

/**
 * Type guard for a single bookmark record.
 * @param {unknown} value
 * @returns {value is { url: string; slug: string }}
 */
export function isValidBookmark(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (/** @type {any} */ (value).url) === 'string' &&
    /** @type {any} */ (value).url.length > 0 &&
    typeof (/** @type {any} */ (value).slug) === 'string' &&
    /** @type {any} */ (value).slug.length > 0
  );
}

/**
 * Defensively parse a raw `localStorage` string into a clean array of
 * bookmarks. Never throws: empty, corrupted, legacy, or non-array values
 * all resolve to a safe result (malformed entries are dropped, not the
 * whole list) rather than propagating raw `JSON.parse` output.
 * @param {unknown} raw
 * @returns {{ url: string; slug: string }[]}
 */
export function parseStoredBookmarks(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(isValidBookmark)
    .map((bookmark) => ({ url: bookmark.url, slug: bookmark.slug }));
}

/**
 * Serialise a bookmarks array for storage, dropping any malformed entries.
 * @param {unknown} bookmarks
 * @returns {string}
 */
export function serializeBookmarks(bookmarks) {
  const safe = Array.isArray(bookmarks) ? bookmarks.filter(isValidBookmark) : [];
  return JSON.stringify(safe);
}

/**
 * Format a bookmark for display with the exact " :: " separator, e.g.
 * "https://www.example.com :: mona-7fk2".
 * @param {{ url: string; slug: string }} bookmark
 * @returns {string}
 */
export function formatBookmark(bookmark) {
  if (!isValidBookmark(bookmark)) return '';
  return `${bookmark.url} :: ${bookmark.slug}`;
}
