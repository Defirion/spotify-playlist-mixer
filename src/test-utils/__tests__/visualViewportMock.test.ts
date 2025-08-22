import { createVisualViewportMock } from '../../test-utils/mocks/visualViewportMock';

describe('createVisualViewportMock', () => {
  test('setHeight updates height and triggers resize listener', () => {
    const api = createVisualViewportMock(800, 0);
    const resizeCb = jest.fn();

    api.vv.addEventListener('resize', resizeCb);
    api.setHeight(600);

    expect(api.vv.height).toBe(600);
    expect(resizeCb).toHaveBeenCalled();
  });

  test('setOffsetTop updates offsetTop and triggers scroll listener', () => {
    const api = createVisualViewportMock(800, 10);
    const scrollCb = jest.fn();

    api.vv.addEventListener('scroll', scrollCb);
    api.setOffsetTop(42);

    expect(api.vv.offsetTop).toBe(42);
    expect(scrollCb).toHaveBeenCalled();
  });
});
