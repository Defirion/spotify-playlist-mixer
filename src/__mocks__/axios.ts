// Mock axios for testing (TypeScript)
type AxiosMethod = jest.Mock<any, any>;
interface AxiosInstance {
  get: AxiosMethod;
  post: AxiosMethod;
  put: AxiosMethod;
  delete: AxiosMethod;
  patch: AxiosMethod;
}

const axios = {
  create: jest.fn(
    (): AxiosInstance => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
    })
  ),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
};

export default axios;
