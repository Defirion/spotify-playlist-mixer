export type AddRequestBody = {
  uris: string[];
  position?: number;
  snapshot_id?: string;
};

function isValidUri(u: unknown): u is string {
  return typeof u === 'string' && u.length > 0;
}

/**
 * Build a request body for adding tracks. Filters invalid URIs.
 */
export function buildAddRequestBody(uris: unknown[], opts?: { position?: number; snapshot_id?: string }): AddRequestBody {
  const filtered = (uris || []).filter(isValidUri) as string[];
  return {
    uris: filtered,
    ...(opts && opts.position !== undefined ? { position: opts.position } : {}),
    ...(opts && opts.snapshot_id ? { snapshot_id: opts.snapshot_id } : {}),
  };
}

export default buildAddRequestBody;
