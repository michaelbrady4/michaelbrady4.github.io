import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchGoodreads } from './goodreads.mjs';
import { fetchLetterboxd } from './letterboxd.mjs';
import { fetchYouTubePlaylist, normalizePlaylistId } from './youtube.mjs';
import { writeIfChanged } from './store.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = resolve(root, 'src/data/library');

async function syncYouTube() {
  const file = resolve(dataDir, 'youtube.json');
  let raw;
  try {
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Skipping YouTube. src/data/library/youtube.json is missing.');
      return;
    }
    throw error;
  }
  const playlistId = normalizePlaylistId(raw?.playlistId);
  if (!playlistId) {
    console.log('Skipping YouTube. playlistId in src/data/library/youtube.json is empty.');
    return;
  }
  const data = await fetchYouTubePlaylist(playlistId);
  const wrote = await writeIfChanged(file, data);
  console.log(wrote ? `Updated YouTube (${data.videos.length} videos).` : 'YouTube unchanged.');
}

async function syncFeeds() {
  const [reading, watching] = await Promise.all([fetchGoodreads(), fetchLetterboxd()]);
  const readingWrote = await writeIfChanged(resolve(dataDir, 'reading.json'), reading);
  const watchingWrote = await writeIfChanged(resolve(dataDir, 'watching.json'), watching);
  console.log(
    `${readingWrote ? 'Updated' : 'Unchanged'} reading (${reading.currentlyReading.length} current, ${reading.read.length} read, source ${reading.source}).`,
  );
  console.log(
    `${watchingWrote ? 'Updated' : 'Unchanged'} watching (${watching.films.length} films, @${watching.username}).`,
  );
  await syncYouTube();
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  try {
    await syncFeeds();
  } catch (error) {
    console.error(error?.stack || error?.message || error);
    process.exit(1);
  }
}
