export type Page<T> = { items?: T[]; next_cursor?: string | null };

export function getNextPlaylistOffset(
  page: any,
  offset: number,
  limit: number
): number | null {
  if (!Array.isArray(page.items))
    throw new Error(
      'Playlist response is missing its items; loading is incomplete'
    );
  const pageOffset = page.offset ?? offset;
  const pageLimit = page.limit ?? limit;
  const hasNext =
    page.next !== undefined
      ? Boolean(page.next)
      : typeof page.total === 'number'
        ? pageOffset + pageLimit < page.total
        : page.items.length >= pageLimit;
  if (!hasNext) return null;
  const nextOffset = page.next
    ? Number(
        new URL(page.next, 'https://api.spotify.com').searchParams.get(
          'offset'
        ) ?? pageOffset + pageLimit
      )
    : pageOffset + pageLimit;
  if (!Number.isFinite(nextOffset) || nextOffset <= offset)
    throw new Error(
      'Playlist pagination did not advance; loading is incomplete'
    );
  return nextOffset;
}

export async function* paginate<T>(
  fetchPage: (cursor?: string | null) => Promise<Page<T>>,
  options?: { initialCursor?: string | null }
) {
  let cursor = options?.initialCursor ?? null;
  while (true) {
    const page = await fetchPage(cursor);
    if (!page || !Array.isArray(page.items)) {
      throw new Error('Malformed page: missing items array');
    }
    for (const it of page.items) yield it;
    if (!page.next_cursor) break;
    cursor = page.next_cursor;
  }
}

export default paginate;
