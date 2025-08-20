import createFetchClient, { FetchInstance } from '../services/fetchClient';

export type SpotifyClientOptions = {
  axiosInstance?: FetchInstance; // kept name for compatibility
  tokenProvider?: () => Promise<string> | string;
};

export class SpotifyClient {
  private client: FetchInstance;
  private tokenProvider?: () => Promise<string> | string;

  constructor(opts?: SpotifyClientOptions) {
    this.client = opts?.axiosInstance ?? createFetchClient();
    this.tokenProvider = opts?.tokenProvider;
  }

  private async injectHeaders(config?: any) {
    const conf = { ...(config || {}) };
    if (this.tokenProvider) {
      const token = await this.tokenProvider();
      conf.headers = {
        ...(conf.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    }
    return conf;
  }

  async get<T = any>(url: string, config?: any) {
    const c = await this.injectHeaders(config);
    return this.client.get<T>(url, c).then((r: any) => r.data);
  }

  async post<T = any>(url: string, data?: any, config?: any) {
    const c = await this.injectHeaders(config);
    return this.client.post<T>(url, data, c).then((r: any) => r.data);
  }

  async delete<T = any>(url: string, config?: any) {
    const c = await this.injectHeaders(config);
    return this.client.delete<T>(url, c).then((r: any) => r.data);
  }
}

export default SpotifyClient;
