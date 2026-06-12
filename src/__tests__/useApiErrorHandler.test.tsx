import React from 'react';
import { render } from '@testing-library/react';
import useApiErrorHandler from '../hooks/useApiErrorHandler';

// Small helper component to exercise the hook in a component tree
function Harness({ onReady }: { onReady?: (api: any) => void }) {
  const api = useApiErrorHandler({ onError: () => {} });
  React.useEffect(() => {
    if (onReady) onReady(api);
  }, [api, onReady]);
  return <div>harness</div>;
}

describe('useApiErrorHandler (skeleton)', () => {
  it('handleError classifies axios-like response errors (skeleton)', () => {
    let api: any = null;
    render(<Harness onReady={a => (api = a)} />);

    const fakeResponseError: any = new Error('response error');
    fakeResponseError.response = { status: 401, data: { error: 'unauth' } };

    const apiErr = api.handleError(fakeResponseError as Error);

    expect(apiErr).toBeDefined();
    expect(apiErr.type).toBeDefined();
  });

  it('withRetry retries and clears error on success (skeleton)', async () => {
    let api: any = null;
    render(<Harness onReady={a => (api = a)} />);

    let attempts = 0;
    const flaky = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 2) throw new Error('transient');
      return 'ok';
    });

    const value = await api.withRetry(() => flaky());
    expect(value).toBe('ok');
  });
});
