export type Page<T> = { items?: T[]; next_cursor?: string | null };

export async function* paginate<T>(fetchPage: (cursor?: string | null) => Promise<Page<T>>, options?: { initialCursor?: string | null }) {
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
