import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { mapBookmark, matchFolders, missingSecrets, postsNeedHydration, readAllowlist, scrub } from './x-bookmarks.mjs';

test('missing secrets are named and empty strings count', () => {
  assert.deepEqual(
    missingSecrets({ X_CLIENT_ID: 'id', X_CLIENT_SECRET: '', X_REFRESH_TOKEN: 'r', LIBRARY_SECRETS_PAT: 'p' }),
    ['X_CLIENT_SECRET'],
  );
});

test('allowlist preserves order and matches names or ids', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'library-'));
  const file = join(dir, 'bookmark-folders.json');
  await writeFile(file, JSON.stringify({ folders: ['Design', '99', '  investing '] }));
  const allowlist = await readAllowlist(file);
  const matched = matchFolders(
    [
      { id: '99', name: 'Later' },
      { id: '2', name: 'Investing' },
      { id: '3', name: 'Design' },
    ],
    allowlist,
  );
  assert.deepEqual(
    matched.map((folder) => folder.name),
    ['Design', 'Later', 'Investing'],
  );
});

test('maps a bookmark link and drops tracking params', () => {
  const item = mapBookmark({
    id: '10',
    text: 'Worth a reread https://t.co/abc',
    created_at: '2026-11-01T00:00:00.000Z',
    entities: {
      urls: [
        {
          url: 'https://t.co/abc',
          expanded_url: 'https://example.com/story?utm_source=twitter&id=4&token=share',
          title: 'A real headline',
        },
      ],
    },
  });
  assert.equal(item.title, 'A real headline');
  assert.equal(item.url, 'https://example.com/story?id=4');
  assert.equal(item.domain, 'example.com');
  assert.equal(item.note, 'Worth a reread');
  assert.equal(item.savedAt, '2026-11-01T00:00:00.000Z');
});

test('a text-only bookmark points at the post and does not repeat the title as a note', () => {
  const item = mapBookmark({ id: '11', text: 'Just a thought' });
  assert.equal(item.title, 'Just a thought');
  assert.equal(item.url, 'https://x.com/i/web/status/11');
  assert.equal(item.domain, 'x.com');
  assert.equal(item.note, undefined);
});

test('hydration is only needed when posts are ids', () => {
  assert.equal(postsNeedHydration([{ id: '1' }]), true);
  assert.equal(postsNeedHydration([{ id: '1', text: 'hi' }]), false);
});

test('scrub removes secret values from errors', () => {
  assert.equal(scrub('failed refresh_token=super-secret-value now', ['super-secret-value']), 'failed refresh_token=[redacted] now');
});
