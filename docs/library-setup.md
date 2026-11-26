# Library setup

The library page has four shelves.

- **From X** is a list of links from your X bookmarks, grouped by folder.
- **Reading** is your Goodreads shelf.
- **Watching** is your recent Letterboxd diary.
- **YouTube** is a public playlist.

Reading and watching update on their own. From X stays empty until you connect X and choose at least one bookmark folder. YouTube uses playlist `PLD8-d1TMwYyA`. That feed is public and, as of 26 Nov 2026, has no videos, so the tab stays empty until you add some. Nothing on the page is made up.

A GitHub Action named **Update library** runs every night at 7:15 UTC. You can also run it by hand from the Actions tab.

## From X needs four secrets

GitHub secrets are passwords the Action can read. They are not stored in the code.

Add them in the repo at **Settings → Secrets and variables → Actions → New repository secret**. The names have to match exactly.

| Secret | What it is |
| --- | --- |
| `X_CLIENT_ID` | The public id of your X app |
| `X_CLIENT_SECRET` | The private secret of your X app |
| `X_REFRESH_TOKEN` | The login that lets the Action read your bookmarks. X replaces this every run. |
| `LIBRARY_SECRETS_PAT` | A GitHub token whose only job is to save the new refresh token |

The Action skips bookmarks, and the job still succeeds, when any of these are missing. The From X tab then keeps showing its empty state.

## 1. Create an X app

1. Sign in to [the X developer console](https://console.x.com/) with the account whose bookmarks you want on the site (`@brady__michael`).
2. Create a project, then create an app inside it. The names can be anything, such as "Library".
3. Open the app's user authentication settings (sometimes called "User authentication" or "OAuth 2.0").
4. Choose **OAuth 2.0** and a confidential app type. In the console that is usually **Web App** or **Automated app**. You need a client secret, so do not pick a public type such as Native App or Single page App.
5. Set the callback URL to exactly this, with no trailing slash:

   `http://127.0.0.1:8787/callback`

6. Set the website URL to `https://michaelbrady4.github.io`.
7. Turn on these permissions, often called scopes:

   - `bookmark.read` (read your bookmarks)
   - `tweet.read` (read posts)
   - `users.read` (read your account id)
   - `offline.access` (this is what gives you a refresh token)

8. Save. Then open **Keys and tokens** and copy the **Client ID** and **Client Secret**.

The console moves its labels around. You are looking for a client id, a client secret, and a box for the callback URL.

X charges for API use. There is no standing free plan. Reading your own bookmarks is an "owned read" and is billed per post that comes back. Listing folders can cost a little more. Check the price in the developer console before you add a folder, because the rate can change. While the folder list below is empty, the nightly job only refreshes the login. It does not download bookmarks, so it should not run up a reading bill.

## 2. Get a refresh token on your computer

In a terminal, from this repo, with Node 22:

```bash
X_CLIENT_ID="paste-the-client-id" X_CLIENT_SECRET="paste-the-client-secret" node scripts/library/authorize.mjs
```

The script prints a link. Open it in the browser where you are logged in to X, then approve the app. The page on your computer will say you can close the tab. The terminal prints a long refresh token.

That token is a password. Do not commit it, do not put it in this file, and do not paste it into a GitHub issue or a chat.

Copy it into the `X_REFRESH_TOKEN` secret. Put the client id and client secret in `X_CLIENT_ID` and `X_CLIENT_SECRET`.

X refresh tokens rotate. Each time the Action asks for a new access token, X returns a new refresh token and the old one stops working. The Action saves that new value back into `X_REFRESH_TOKEN` before it downloads anything. If it cannot save the new token, it stops and opens a GitHub issue, because the old token is already dead.

## 3. Create the GitHub token that saves the new refresh token

The Action's built-in `GITHUB_TOKEN` can commit files and open issues. It cannot create or update Actions secrets. That is why there is a separate token.

1. On GitHub, open **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name it something like `library-refresh-token`.
3. Set an expiration you will remember. When it expires, the next run can refresh X and then fail to store the new token. Renew it before that date.
4. Resource owner: your user account.
5. Repository access: **Only select repositories**, and choose `michaelbrady4.github.io`.
6. Under **Repository permissions**, set **Secrets** to **Read and write**. Leave the other permissions at their default of no access.
7. Generate the token and copy it. GitHub shows it once.
8. Store it as the secret `LIBRARY_SECRETS_PAT`.

## 4. Choose which folders are published

Bookmark folders start unpublished. The allowlist is `src/data/library/bookmark-folders.json`:

```json
{
  "folders": []
}
```

When you want a folder on the site, add its name as it appears on X. Capitalization does not matter. A numeric folder id works too.

```json
{
  "folders": ["Design", "Investing"]
}
```

Commit that change. The next nightly run (or a manual run) publishes only those folders. Links are cleaned before they are saved: `utm_*`, `ref`, `s`, `r`, and `token` are removed. `t` is removed as well, except when it is a YouTube-style timestamp such as `90` or `1m30s`.

## 5. Let the Action commit to main

The Action pushes `reading.json`, `watching.json`, `bookmarks.json`, and `youtube.json` when they change. It does not open a pull request. It leaves `youtube.json` alone when the playlist id is blank.

If main is protected, allow GitHub Actions to update it, or the shelves will not refresh. In the repo, that setting is under **Settings → Rules → Rulesets** (or branch protection): permit the `github-actions` bot, or the Actions token, to bypass the rule.

You can test the wiring from the Actions tab with **Update library → Run workflow**.

## If the refresh fails

The job turns red and opens an issue titled **Library: X refresh token needs attention**. If that issue is already open, it adds a comment instead of a second issue.

Do not paste a token into the issue. Run the authorize command again, update `X_REFRESH_TOKEN`, and re-run the workflow.

Two different failures look similar:

- X rejected the refresh. The secret was not changed. A wrong client id, a wrong secret, or a refresh token that was already used will do this. Authorize again.
- X accepted the refresh, then saving the new token failed. The old token will not work again. Authorize again, and check that `LIBRARY_SECRETS_PAT` still has Secrets: Read and write on this repo.

## Does the bookmarks API cap history?

I checked the current docs on 26 Nov 2026.

- [Get Bookmarks](https://docs.x.com/x-api/users/get-bookmarks) (page updated 29 Oct 2026) says the endpoint returns posts bookmarked by the authenticated user. It pages with `max_results` from 1 to 100 and `meta.next_token`. That page does **not** mention an 800 item cap.
- Older reference text, still quoted by libraries such as Tweepy, said `GET /2/users/:id/bookmarks` returns the **800 most recent** bookmarked posts. People have reported the feed stopping around there even when older bookmarks exist.
- [Get Bookmarks by Folder ID](https://docs.x.com/x-api/users/get-bookmarks-by-folder-id) is a separate endpoint. Its current description does not mention an 800 cap either.

This job reads the folders you allow, and follows `next_token` until X stops sending one (up to 20 pages). If X still enforces the old cap, bookmarks beyond it will not appear. The docs no longer state that limit, so treat "about 800" as a reported ceiling, not as something the current page promises.

## Reading and watching

These do not use secrets.

**Goodreads.** The job requests the public shelf feeds:

- `https://www.goodreads.com/review/list_rss/143360526?shelf=currently-reading`
- `https://www.goodreads.com/review/list_rss/143360526?shelf=read`

On 26 Nov 2026 both URLs returned Goodreads' "Page not found" page. Goodreads [retired RSS feeds in October 2026](https://www.goodreads.com/blog/show/20-more-rss-feeds). The job then reads the public bookshelf widget for the same two shelves, which still works without a login. Your profile shows 1 book currently reading and 12 books read, and the widget returns those. If Goodreads turns the RSS feeds back on, the job will use them again.

Review pages themselves now ask for a sign-in, so a written review on the site is the public snippet Goodreads still includes in the widget, linked to the full review.

**Letterboxd.** `https://boxd.it/5EEPT` redirects to `https://letterboxd.com/michaelb4/`. The job reads `https://letterboxd.com/michaelb4/rss/`. That feed is the recent diary, not every film you have ever logged. A line that only says "Watched on [date]" is Letterboxd's placeholder, so it is not shown as a review.

## YouTube

This shelf does not use a secret. It reads the free public playlist feed:

`https://www.youtube.com/feeds/videos.xml?playlist_id=PLAYLIST_ID`

The id is stored in `src/data/library/youtube.json`. It is `PLD8-d1TMwYyA`, taken from `https://www.youtube.com/playlist?list=PLD8-d1TMwYyA`. The `si` share token is not stored.

On 26 Nov 2026 the feed returned HTTP 200 with a public Atom document. The playlist title is Website, the author is Michael Brady, and there are no `<entry>` elements. The playlist page says "No videos in this playlist yet." The tab stays empty until a video is added. The nightly job will pick videos up after that.

To point the shelf at a different playlist:

1. On YouTube, create a playlist and set its visibility to Public.
2. Open the playlist. The address looks like `https://www.youtube.com/playlist?list=PLxxxxxxxxxxxx`.
3. Copy the part after `list=`. You can also copy the whole playlist URL.
4. Put that value in `playlistId` inside `src/data/library/youtube.json`:

```json
{
  "playlistId": "PLxxxxxxxxxxxx",
  "playlistUrl": "",
  "videos": []
}
```

5. Commit that file to main, or run **Update library** from the Actions tab.

The next run fills in the videos. Each row shows the thumbnail, title, channel, and the date the video was added to the feed, and the title links to the video.

YouTube's playlist feed returns the latest 15 videos. A longer playlist will not show older entries through this feed.

If `playlistId` is blank or missing, the job logs a skip and does not call YouTube. A bad id fails the job, so the previous file is left as it was.
