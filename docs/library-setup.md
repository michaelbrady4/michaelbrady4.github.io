# Library setup

The library page has three shelves.

- **Reading** is your Goodreads shelf.
- **Watching** is your recent Letterboxd diary, newest watch first.
- **YouTube** is a public playlist.

None of these need a secret. Nothing on the page is made up.

A GitHub Action named **Update library** runs every night at 7:15 UTC. You can also run it by hand from the Actions tab. It commits `reading.json`, `watching.json`, and `youtube.json` when they change. It leaves `youtube.json` alone when the playlist id is blank.

If main is protected, allow GitHub Actions to update it, or the shelves will not refresh. In the repo, that setting is under **Settings → Rules → Rulesets** (or branch protection): permit the `github-actions` bot, or the Actions token, to bypass the rule.

## Reading and watching

**Goodreads.** The job requests the public shelf feeds:

- `https://www.goodreads.com/review/list_rss/143360526?shelf=currently-reading`
- `https://www.goodreads.com/review/list_rss/143360526?shelf=read`

On 26 Nov 2026 both URLs returned Goodreads' "Page not found" page. Goodreads [retired RSS feeds in October 2026](https://www.goodreads.com/blog/show/20-more-rss-feeds). The job then reads the public bookshelf widget for the same two shelves, which still works without a login. Your profile shows 1 book currently reading and 12 books read, and the widget returns those. If Goodreads turns the RSS feeds back on, the job will use them again.

Review pages themselves now ask for a sign-in, so a written review on the site is the public snippet Goodreads still includes in the widget, linked to the full review.

**Letterboxd.** `https://boxd.it/5EEPT` redirects to `https://letterboxd.com/michaelb4/`. The job reads `https://letterboxd.com/michaelb4/rss/`. Films are ordered by the date they were watched, newest first. If a film has no watched date, the job uses the feed's publish date for ordering. That feed is the recent diary, not every film you have ever logged. A line that only says "Watched on [date]" is Letterboxd's placeholder, so it is not shown as a review.

## YouTube

This shelf reads the free public playlist feed:

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
