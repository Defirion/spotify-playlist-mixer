import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export type SpotifyClientOptions = {
  axiosInstance?: AxiosInstance;
  tokenProvider?: () => Promise<string> | string;
};

export class SpotifyClient {
  private axios: AxiosInstance;
  private tokenProvider?: () => Promise<string> | string;

  constructor(opts?: SpotifyClientOptions) {
    this.axios = opts?.axiosInstance ?? axios.create();
    this.tokenProvider = opts?.tokenProvider;
  }

  private async injectHeaders(config?: AxiosRequestConfig) {
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

  async get<T = any>(url: string, config?: AxiosRequestConfig) {
    const c = await this.injectHeaders(config);
    return this.axios.get<T>(url, c).then(r => r.data);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    const c = await this.injectHeaders(config);
    return this.axios.post<T>(url, data, c).then(r => r.data);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig) {
    const c = await this.injectHeaders(config);
    return this.axios.delete<T>(url, c).then(r => r.data);
  }
}

export default SpotifyClient;
