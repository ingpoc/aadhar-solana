/**
 * Cache Service Mock for Testing
 */

// In-memory cache storage for tests
const cacheStore = new Map<string, { value: string; expiry: number | null }>();

/**
 * Create Cache Service Mock
 */
export const createCacheServiceMock = () => ({
  get: jest.fn().mockImplementation(async (key: string) => {
    const item = cacheStore.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      cacheStore.delete(key);
      return null;
    }
    return JSON.parse(item.value);
  }),

  set: jest.fn().mockImplementation(async (key: string, value: any, ttl?: number) => {
    const expiry = ttl ? Date.now() + ttl * 1000 : null;
    cacheStore.set(key, { value: JSON.stringify(value), expiry });
  }),

  del: jest.fn().mockImplementation(async (key: string) => {
    cacheStore.delete(key);
  }),

  exists: jest.fn().mockImplementation(async (key: string) => {
    return cacheStore.has(key);
  }),

  ttl: jest.fn().mockImplementation(async (key: string) => {
    const item = cacheStore.get(key);
    if (!item || !item.expiry) return -1;
    const remaining = Math.ceil((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1;
  }),

  keys: jest.fn().mockImplementation(async (pattern: string) => {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(cacheStore.keys()).filter((key) => regex.test(key));
  }),

  flushAll: jest.fn().mockImplementation(async () => {
    cacheStore.clear();
  }),

  // Helper to clear cache between tests
  _clear: () => cacheStore.clear(),
});

/**
 * Create a simple mock for Redis client
 */
export const createRedisMock = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  ttl: jest.fn().mockResolvedValue(-1),
  keys: jest.fn().mockResolvedValue([]),
  flushdb: jest.fn().mockResolvedValue('OK'),
  quit: jest.fn().mockResolvedValue('OK'),
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
});

// Clear cache before each test
beforeEach(() => {
  cacheStore.clear();
});
