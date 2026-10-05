/**
 * JSON Serializability Gate Test
 *
 * This test ensures shared fixture objects can be safely serialized to JSON
 * without circular references, DOM nodes, Date objects, or other problematic types.
 * This catches fixture shapes that cannot safely be serialized.
 */

import {
  mockUserProfile,
  mockPlaylists,
  mockTracks,
  mockAuthToken,
} from '../../mocks/fixtures';

describe('Fixture JSON serializability', () => {
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
});
