// Minimal fetch-based client that provides the small Axios-like surface used
// by the codebase: create(), get/post/delete, and a defaults object with
// baseURL and headers. This keeps tests and runtime code simple while
// removing axios as a dependency.

type Method = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';

export type FetchClientOptions = {
  baseURL?: string;
  headers?: Record<string, string>;
};

export class FetchInstance {
  baseURL?: string;
  defaults: any;

  constructor(opts: FetchClientOptions = {}) {
    this.baseURL = opts.baseURL;
    this.defaults = {
      baseURL: this.baseURL,
      headers: opts.headers || {},
    };
  }

  private buildUrl(url: string) {
    if (!url) return url;
    if (this.baseURL && !/^https?:\/\//i.test(url)) {
      return `${this.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    }
    return url;
  }

  private async request(method: Method, url: string, data?: any, config?: any) {
    const headers = Object.assign(
      {},
      this.defaults.headers || {},
      config?.headers || {}
    );
    const finalUrl = this.buildUrl(url);
    const init: RequestInit = { method, headers };
    if (data != null) {
      if (typeof data === 'object' && !(data instanceof FormData)) {
        init.body = JSON.stringify(data);
        init.headers = Object.assign(
          { 'Content-Type': 'application/json' },
          init.headers
        );
      } else {
        init.body = data as any;
      }
    }

    const resp = await fetch(finalUrl, init);
    const contentType = resp.headers.get('content-type') || '';
    let parsed: any = null;
    if (contentType.includes('application/json')) {
      parsed = await resp.json();
    } else {
      parsed = await resp.text();
    }

    const result = {
      status: resp.status,
      statusText: resp.statusText,
      data: parsed,
      headers: resp.headers,
      ok: resp.ok,
      config,
    };

    if (!resp.ok) {
      const err: any = new Error(
        `Request failed with status code ${resp.status}`
      );
      err.response = result;
      throw err;
    }

    return result;
  }

  get<T = any>(url: string, config?: any) {
    return this.request('GET', url, undefined, config).then(
      r => r as any as { data: T }
    );
  }

  post<T = any>(url: string, data?: any, config?: any) {
    return this.request('POST', url, data, config).then(
      r => r as any as { data: T }
    );
  }

  delete<T = any>(url: string, config?: any) {
    return this.request('DELETE', url, config?.data, config).then(
      r => r as any as { data: T }
    );
  }
}

export const createFetchClient = (opts?: FetchClientOptions) =>
  new FetchInstance(opts);

export default createFetchClient;
