const API = 'https://api.github.com';

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'michaelbrady4-library',
  };
}

export async function updateActionsSecret({ token, repo, name, value }) {
  const keyResponse = await fetch(`${API}/repos/${repo}/actions/secrets/public-key`, {
    headers: headers(token),
  });
  if (!keyResponse.ok) {
    throw new Error(
      `Could not read the repository public key (${keyResponse.status}). LIBRARY_SECRETS_PAT needs Secrets: Read and write on ${repo}.`,
    );
  }
  const key = await keyResponse.json();
  const imported = await import('libsodium-wrappers');
  const sodium = imported.default ?? imported;
  await sodium.ready;
  const encrypted = sodium.crypto_box_seal(
    sodium.from_string(value),
    sodium.from_base64(key.key, sodium.base64_variants.ORIGINAL),
  );
  const put = await fetch(`${API}/repos/${repo}/actions/secrets/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      encrypted_value: sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL),
      key_id: key.key_id,
    }),
  });
  if (!put.ok && put.status !== 201 && put.status !== 204) {
    const detail = (await put.text()).slice(0, 280);
    throw new Error(`Could not update the ${name} secret (${put.status}). ${detail}`);
  }
}

const ISSUE_TITLE = 'Library: X refresh token needs attention';

export async function reportRefreshFailure({ token, repo, message, rotated }) {
  if (!token || !repo) {
    console.error('Could not open a GitHub issue because GITHUB_TOKEN or the repository name is missing.');
    return;
  }
  const issueHeaders = headers(token);
  const query = new URLSearchParams({
    q: `repo:${repo} is:issue is:open in:title "${ISSUE_TITLE}"`,
  });
  const search = await fetch(`${API}/search/issues?${query}`, { headers: issueHeaders });
  const found = search.ok ? await search.json() : { items: [] };
  const existing = (found.items ?? []).find((issue) => issue.title === ISSUE_TITLE);

  const steps = rotated
    ? [
        'X accepted the refresh and returned a new refresh token, but the job could not save it back to GitHub.',
        'The previous refresh token will not work again.',
        '',
        'What to do:',
        '1. Follow the authorize step in docs/library-setup.md.',
        '2. Store the new refresh token as the X_REFRESH_TOKEN secret.',
        '3. Re-run the Update library action.',
        '',
        'The new token is not in this issue and it is not in the logs.',
      ]
    : [
        'The nightly library job could not refresh the X login, so saved bookmarks were not updated.',
        '',
        'What to do:',
        '1. Follow the authorize step in docs/library-setup.md.',
        '2. Update the X_REFRESH_TOKEN secret with the new refresh token.',
        '3. Re-run the Update library action.',
      ];

  const body = `${steps.join('\n')}

Details:
${message}

Books and films do not use this login. Do not paste tokens into this issue.
`;

  if (existing) {
    const comment = await fetch(`${API}/repos/${repo}/issues/${existing.number}/comments`, {
      method: 'POST',
      headers: { ...issueHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if (!comment.ok) {
      throw new Error(`Could not comment on issue #${existing.number} (${comment.status}).`);
    }
    console.error(`Commented on existing issue #${existing.number}.`);
    return;
  }

  const created = await fetch(`${API}/repos/${repo}/issues`, {
    method: 'POST',
    headers: { ...issueHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: ISSUE_TITLE, body }),
  });
  if (!created.ok) {
    throw new Error(`Could not open a GitHub issue (${created.status}).`);
  }
  const issue = await created.json();
  console.error(`Opened issue #${issue.number}.`);
}
