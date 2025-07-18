import { StorageService } from '../StorageService';

describe('StorageService', () => {
  let storageService: StorageService;
  let mockStorage: Storage;

  beforeEach(() => {
    // Create a mock storage implementation
    const storage = new Map<string, string>();
    
    mockStorage = {
      getItem: jest.fn((key: string) => storage.get(key) || null),
      setItem: jest.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: jest.fn((key: string) => storage.delete(key)),
      clear: jest.fn(() => storage.clear()),
      length: 0,
      key: jest.fn()
    };

    storageService = new StorageService(mockStorage);
  });

  describe('setItem', () => {
    it('should serialize and store simple values', () => {
      storageService.setItem('test-key', 'test-value');
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test-key', '"test-value"');
    });

    it('should serialize and store objects', () => {
      const testObject = { id: 1, name: 'test', nested: { value: true } };
      
      storageService.setItem('test-object', testObject);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'test-object',
        JSON.stringify(testObject)
      );
    });

    it('should serialize and store arrays', () => {
      const testArray = [1, 2, 3, { id: 4 }];
      
      storageService.setItem('test-array', testArray);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'test-array',
        JSON.stringify(testArray)
      );
    });

    it('should handle null values', () => {
      storageService.setItem('test-null', null);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test-null', 'null');
    });

    it('should handle undefined values', () => {
      storageService.setItem('test-undefined', undefined);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test-undefined', undefined);
    });

    it('should throw error when storage fails', () => {
      (mockStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => storageService.setItem('test-key', 'test-value')).toThrow(
        'Failed to store item: test-key'
      );
    });

    it('should handle circular reference errors', () => {
      const circularRef: any = { name: 'test' };
      circularRef.self = circularRef;

      expect(() => storageService.setItem('circular', circularRef)).toThrow(
        'Failed to store item: circular'
      );
    });
  });

  describe('getItem', () => {
    it('should deserialize and return stored values', () => {
      (mockStorage.getItem as jest.Mock).mockReturnValue('"test-value"');
      
      const result = storageService.getItem('test-key');
      
      expect(result).toBe('test-value');
      expect(mockStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should deserialize and return objects', () => {
      const testObject = { id: 1, name: 'test', nested: { value: true } };
      (mockStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(testObject));
      
      const result = storageService.getItem('test-object');
      
      expect(result).toEqual(testObject);
    });

    it('should deserialize and return arrays', () => {
      const testArray = [1, 2, 3, { id: 4 }];
      (mockStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(testArray));
      
      const result = storageService.getItem('test-array');
      
      expect(result).toEqual(testArray);
    });

    it('should return null for non-existent keys', () => {
      (mockStorage.getItem as jest.Mock).mockReturnValue(null);
      
      const result = storageService.getItem('non-existent');
      
      expect(result).toBeNull();
    });

    it('should return null for malformed JSON', () => {
      (mockStorage.getItem as jest.Mock).mockReturnValue('invalid-json{');
      
      const result = storageService.getItem('malformed');
      
      expect(result).toBeNull();
    });

    it('should handle storage access errors gracefully', () => {
      (mockStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const result = storageService.getItem('test-key');
      
      expect(result).toBeNull();
    });

    it('should handle null values correctly', () => {
      (mockStorage.getItem as jest.Mock).mockReturnValue('null');
      
      const result = storageService.getItem('test-null');
      
      expect(result).toBeNull();
    });

    it('should use generic type parameter', () => {
      interface TestInterface {
        id: number;
        name: string;
      }

      const testObject: TestInterface = { id: 1, name: 'test' };
      (mockStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(testObject));
      
      const result = storageService.getItem<TestInterface>('test-typed');
      
      expect(result).toEqual(testObject);
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('test');
    });
  });

  describe('removeItem', () => {
    it('should remove items from storage', () => {
      storageService.removeItem('test-key');
      
      expect(mockStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle removal errors gracefully', () => {
      (mockStorage.removeItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      expect(() => storageService.removeItem('test-key')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all storage', () => {
      storageService.clear();
      
      expect(mockStorage.clear).toHaveBeenCalled();
    });

    it('should handle clear errors gracefully', () => {
      (mockStorage.clear as jest.Mock).mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      expect(() => storageService.clear()).not.toThrow();
    });
  });

  describe('hasItem', () => {
    it('should return true for existing items', () => {
      (mockStorage.getItem as jest.Mock).mockReturnValue('"test-value"');
      
      const result = storageService.hasItem('test-key');
      
      expect(result).toBe(true);
      expect(mockStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should return false for non-existent items', () => {
      (mockStorage.getItem as jest.Mock).mockReturnValue(null);
      
      const result = storageService.hasItem('non-existent');
      
      expect(result).toBe(false);
    });

    it('should return true for items with null values', () => {
      (mockStorage.getItem as jest.Mock).mockReturnValue('null');
      
      const result = storageService.hasItem('null-value');
      
      expect(result).toBe(true);
    });
  });

  describe('integration with different storage types', () => {
    it('should work with localStorage', () => {
      const localStorageService = new StorageService(localStorage);
      
      // This test assumes localStorage is available in the test environment
      expect(localStorageService).toBeInstanceOf(StorageService);
    });

    it('should work with sessionStorage', () => {
      const sessionStorageService = new StorageService(sessionStorage);
      
      // This test assumes sessionStorage is available in the test environment
      expect(sessionStorageService).toBeInstanceOf(StorageService);
    });

    it('should use localStorage by default', () => {
      const defaultStorageService = new StorageService();
      
      expect(defaultStorageService).toBeInstanceOf(StorageService);
    });
  });

  describe('real storage integration', () => {
    let realStorageService: StorageService;

    beforeEach(() => {
      // Use real localStorage for integration tests
      localStorage.clear();
      realStorageService = new StorageService(localStorage);
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should persist data across service instances', () => {
      const testData = { id: 1, name: 'persistent test' };
      
      realStorageService.setItem('persist-test', testData);
      
      // Create new service instance
      const newService = new StorageService(localStorage);
      const result = newService.getItem('persist-test');
      
      expect(result).toEqual(testData);
    });

    it('should handle complex nested objects', () => {
      const complexObject = {
        user: {
          id: 1,
          profile: {
            name: 'John Doe',
            preferences: {
              theme: 'dark',
              notifications: true,
              playlists: [
                { id: 'p1', name: 'Favorites' },
                { id: 'p2', name: 'Workout' }
              ]
            }
          }
        },
        metadata: {
          created: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      realStorageService.setItem('complex-object', complexObject);
      const result = realStorageService.getItem('complex-object');
      
      expect(result).toEqual(complexObject);
    });

    it('should handle large data sets', () => {
      const largeArray = Array(1000).fill(null).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: 'x'.repeat(100)
      }));

      realStorageService.setItem('large-data', largeArray);
      const result = realStorageService.getItem('large-data');
      
      expect(result).toEqual(largeArray);
      expect(result).toHaveLength(1000);
    });
  });

  describe('error scenarios', () => {
    it('should handle storage quota exceeded gracefully', () => {
      (mockStorage.setItem as jest.Mock).mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      expect(() => storageService.setItem('test', 'value')).toThrow(
        'Failed to store item: test'
      );
    });

    it('should handle storage disabled/unavailable', () => {
      (mockStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage is disabled');
      });

      const result = storageService.getItem('test');
      expect(result).toBeNull();
    });

    it('should handle concurrent access gracefully', async () => {
      // Simulate concurrent operations
      const promises = Array(10).fill(null).map((_, i) => 
        Promise.resolve().then(() => {
          storageService.setItem(`concurrent-${i}`, `value-${i}`);
          return storageService.getItem(`concurrent-${i}`);
        })
      );

      const results = await Promise.all(promises);
      
      results.forEach((result, i) => {
        expect(result).toBe(`value-${i}`);
      });
    });
  });
});