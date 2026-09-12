/**
 * JSON Serializability Gate Test
 *
 * This test ensures all MSW fixture objects can be safely serialized to JSON
 * without circular references, DOM nodes, Date objects, or other problematic types.
 * This prevents Jest worker crashes from "Converting circular structure to JSON" errors.
 */

import {
  mockUserProfile,
  mockPlaylists,
  mockTracks,
  mockAuthToken,
} from '../../mocks/fixtures';

describe('Legacy JSON Serializability Gate (MSW removed)', () => {
  const testSerializability = (obj: any, name: string) => {
    it(`${name} should be JSON serializable`, () => {
      expect(() => {
        const serialized = JSON.stringify(obj);
        expect(serialized).toBeDefined();
        expect(typeof serialized).toBe('string');

        // Ensure we can parse it back
        const parsed = JSON.parse(serialized);
        expect(parsed).toBeDefined();
      }).not.toThrow();
    });

    it(`${name} should not contain circular references`, () => {
      const seen = new WeakSet();

      const checkCircular = (value: any): void => {
        if (value && typeof value === 'object') {
          if (seen.has(value)) {
            throw new Error('Circular reference detected');
          }
          seen.add(value);

          if (Array.isArray(value)) {
            value.forEach(checkCircular);
          } else {
            Object.values(value).forEach(checkCircular);
          }
        }
      };

      expect(() => checkCircular(obj)).not.toThrow();
    });

    it(`${name} should not contain DOM nodes`, () => {
      const checkForDOMNodes = (value: any): void => {
        if (value && typeof value === 'object') {
          // Check if it's a DOM node
          if (
            value.nodeType !== undefined ||
            value instanceof Element ||
            value instanceof Node
          ) {
            throw new Error('DOM node detected');
          }

          if (Array.isArray(value)) {
            value.forEach(checkForDOMNodes);
          } else {
            Object.values(value).forEach(checkForDOMNodes);
          }
        }
      };

      expect(() => checkForDOMNodes(obj)).not.toThrow();
    });

    it(`${name} should not contain Date objects`, () => {
      const checkForDates = (value: any): void => {
        if (value instanceof Date) {
          throw new Error('Date object detected - use ISO strings instead');
        }

        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            value.forEach(checkForDates);
          } else {
            Object.values(value).forEach(checkForDates);
          }
        }
      };

      expect(() => checkForDates(obj)).not.toThrow();
    });

    it(`${name} should not contain Map or Set instances`, () => {
      const checkForMapsAndSets = (value: any): void => {
        if (value instanceof Map || value instanceof Set) {
          throw new Error(
            'Map/Set instance detected - use plain objects/arrays instead'
          );
        }

        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            value.forEach(checkForMapsAndSets);
          } else {
            Object.values(value).forEach(checkForMapsAndSets);
          }
        }
      };

      expect(() => checkForMapsAndSets(obj)).not.toThrow();
    });
  };

  // Test all fixture objects
  testSerializability(mockUserProfile, 'mockUserProfile');
  testSerializability(mockPlaylists, 'mockPlaylists');
  testSerializability(mockTracks, 'mockTracks');
  testSerializability(mockAuthToken, 'mockAuthToken');

  // Placeholder assertion: confirm removed MSW handlers are absent
  it('no MSW handlers module present (expected)', async () => {
    let threw = false;
    try {
      // computed specifier so Vite does not try to resolve it at build time;
      // the module is intentionally absent
      // eslint-disable-next-line no-useless-concat
      const missing = '../../test-utils/mocks/' + 'mswHandlers';
      await import(/* @vite-ignore */ missing);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
