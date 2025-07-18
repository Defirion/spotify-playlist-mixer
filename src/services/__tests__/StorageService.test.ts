import { StorageService } from '../StorageService';

// Mock localStorage
const mockStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    // Add method to reset store for testing
    _resetStore: () => {
      store = {};
    },
    _getStore: () => store
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockStorage
});

describe('StorageService', () => {
  let storageService: StorageService;

  beforeEach(() => {
    storageService = new StorageService();
    mockStorage.clear();
    jest.clearAllMocks();
  });

  describe('setItem', () => {
    it('should store string values', () => {
      storageService.setItem('test-key', 'test-value');
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test-key', '"test-value"');
    });

    it('should store object values as JSON', () => {
      const testObject = { name: 'test', value: 123 };
      storageService.setItem('test-object', testObject);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test-object', JSON.stringify(testObject));
    });

    it('should store array values as JSON', () => {
      const testArray = [1, 2, 3, 'test'];
      storageService.setItem('test-array', testArray);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test-array', JSON.stringify(testArray));
    });

    it('should handle null values', () => {
      storageService.setItem('test-null', null);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('test-null', 'null');
    });

    it('should throw error when storage fails', () => {
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      expect(() => storageService.setItem('test', 'value')).toThrow('Failed to store item: test');
    });
  });

  describe('getItem', () => {
    it('should return null when item does not exist', () => {
      mockStorage.getItem.mockReturnValue(null);
      
      expect(storageService.getItem('non-existent')).toBeNull();
    });

    it('should retrieve and parse string values', () => {
      mockStorage.getItem.mockReturnValue('"test-value"');
      
      expect(storageService.getItem('test-key')).toBe('test-value');
    });

    it('should retrieve and parse object values', () => {
      const testObject = { name: 'test', value: 123 };
      mockStorage.getItem.mockReturnValue(JSON.stringify(testObject));
      
      expect(storageService.getItem('test-object')).toEqual(testObject);
    });

    it('should retrieve and parse array values', () => {
      const testArray = [1, 2, 3, 'test'];
      mockStorage.getItem.mockReturnValue(JSON.stringify(testArray));
      
      expect(storageService.getItem('test-array')).toEqual(testArray);
    });

    it('should return null when JSON parsing fails', () => {
      mockStorage.getItem.mockReturnValue('invalid-json{');
      
      expect(storageService.getItem('invalid')).toBeNull();
    });

    it('should return null when storage throws error', () => {
      mockStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(storageService.getItem('test')).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove item from storage', () => {
      storageService.removeItem('test-key');
      
      expect(mockStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle storage errors gracefully', () => {
      mockStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => storageService.removeItem('test')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all items from storage', () => {
      storageService.clear();
      
      expect(mockStorage.clear).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', () => {
      mockStorage.clear.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => storageService.clear()).not.toThrow();
    });
  });

  describe('hasItem', () => {
    it('should return true when item exists', () => {
      mockStorage.getItem.mockReturnValue('some-value');
      
      expect(storageService.hasItem('existing-key')).toBe(true);
    });

    it('should return false when item does not exist', () => {
      mockStorage.getItem.mockReturnValue(null);
      
      expect(storageService.hasItem('non-existent-key')).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should store and retrieve complex objects correctly', () => {
      const complexObject = {
        user: {
          id: 'user123',
          name: 'Test User',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        },
        playlists: [
          { id: 'playlist1', name: 'My Playlist' },
          { id: 'playlist2', name: 'Another Playlist' }
        ],
        timestamp: new Date().toISOString()
      };

      storageService.setItem('complex-data', complexObject);
      const retrieved = storageService.getItem('complex-data');

      expect(retrieved).toEqual(complexObject);
    });

    it('should handle storage lifecycle correctly', () => {
      // Store multiple items
      storageService.setItem('item1', 'value1');
      storageService.setItem('item2', { key: 'value2' });
      storageService.setItem('item3', [1, 2, 3]);

      // Verify they exist
      expect(storageService.hasItem('item1')).toBe(true);
      expect(storageService.hasItem('item2')).toBe(true);
      expect(storageService.hasItem('item3')).toBe(true);

      // Remove one item
      storageService.removeItem('item2');
      expect(storageService.hasItem('item2')).toBe(false);
      expect(storageService.hasItem('item1')).toBe(true);
      expect(storageService.hasItem('item3')).toBe(true);

      // Clear all
      storageService.clear();
      expect(storageService.hasItem('item1')).toBe(false);
      expect(storageService.hasItem('item3')).toBe(false);
    });
  });
});