import { readFile, rename, writeFile } from 'node:fs/promises';

function withoutFetchedAt(value) {
  if (!value || typeof value !== 'object') return value;
  const copy = { ...value };
  delete copy.fetchedAt;
  return copy;
}

/** Write JSON only when the payload changed. `fetchedAt` is ignored in the comparison. */
export async function writeIfChanged(file, data) {
  let previous = null;
  try {
    previous = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (previous && JSON.stringify(withoutFetchedAt(previous)) === JSON.stringify(data)) {
    return false;
  }

  const next = { ...data, fetchedAt: new Date().toISOString() };
  const tmp = `${file}.tmp`;
  await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`);
  await rename(tmp, file);
  return true;
}
