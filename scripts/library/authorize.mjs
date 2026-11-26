/**
 * One-time sign-in that prints an X refresh token.
 * Run: X_CLIENT_ID=... X_CLIENT_SECRET=... node scripts/library/authorize.mjs
 * The callback URL in the X app must be exactly http://127.0.0.1:8787/callback
 */
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

const clientId = process.env.X_CLIENT_ID?.trim();
const clientSecret = process.env.X_CLIENT_SECRET?.trim();
const redirectUri = 'http://127.0.0.1:8787/callback';
const scopes = ['bookmark.read', 'tweet.read', 'users.read', 'offline.access'];

if (!clientId || !clientSecret) {
  console.error('Set X_CLIENT_ID and X_CLIENT_SECRET, then run this command again.');
  process.exit(1);
}

const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = randomBytes(16).toString('base64url');

const authorize = new URL('https://x.com/i/oauth2/authorize');
authorize.searchParams.set('response_type', 'code');
authorize.searchParams.set('client_id', clientId);
authorize.searchParams.set('redirect_uri', redirectUri);
authorize.searchParams.set('scope', scopes.join(' '));
authorize.searchParams.set('state', state);
authorize.searchParams.set('code_challenge', challenge);
authorize.searchParams.set('code_challenge_method', 'S256');

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', redirectUri);
  if (url.pathname !== '/callback') {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  if (error || !code || returnedState !== state) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Sign-in did not finish. You can close this tab and read the terminal.');
    console.error(error ? `X returned ${error}.` : 'The sign-in response was missing a code.');
    server.close();
    process.exit(1);
    return;
  }

  try {
    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
        client_id: clientId,
      }),
    });
    const payload = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || !payload?.refresh_token) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Token exchange failed. Read the terminal.');
      console.error(`Token exchange failed (${tokenResponse.status}).`);
      console.error('Check the callback URL, the client secret, and that offline.access is included.');
      server.close();
      process.exit(1);
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Signed in. You can close this tab and go back to the terminal.');
    console.log('');
    console.log('Refresh token (store this as the GitHub secret X_REFRESH_TOKEN):');
    console.log('');
    console.log(payload.refresh_token);
    console.log('');
    console.log('This is a secret. Do not commit it, and do not paste it into an issue or a chat.');
    console.log('X replaces this token every time it is used. The nightly job saves the replacement.');
    server.close();
    process.exit(0);
  } catch (exchangeError) {
    console.error(exchangeError.message);
    server.close();
    process.exit(1);
  }
});

server.listen(8787, '127.0.0.1', () => {
  console.log('Open this link in the browser where you are logged in to X:');
  console.log('');
  console.log(authorize.toString());
  console.log('');
  console.log('Waiting for the callback on http://127.0.0.1:8787/callback');
});
