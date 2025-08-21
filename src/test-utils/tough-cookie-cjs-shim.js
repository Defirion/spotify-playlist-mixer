// CommonJS shim to force loading the CJS build of @bundled-es-modules/tough-cookie
// and ensure the Store class is always available for MSW
try {
  const toughCookie = require('../../node_modules/@bundled-es-modules/tough-cookie/index-cjs.cjs');

  // Ensure Store class is available
  if (!toughCookie.Store) {
    // Fallback minimal Store class for MSW compatibility
    toughCookie.Store = class Store {
      constructor() {
        this.synchronous = false;
      }
      findCookie() {
        return null;
      }
      findCookies() {
        return [];
      }
      putCookie() {}
      updateCookie() {}
      removeCookie() {}
      removeCookies() {}
      removeAllCookies() {}
      getAllCookies() {
        return [];
      }
    };
  }

  // Ensure MemoryCookieStore is available
  if (!toughCookie.MemoryCookieStore) {
    // MemoryCookieStore extends Store
    toughCookie.MemoryCookieStore = class MemoryCookieStore extends (
      toughCookie.Store
    ) {
      constructor() {
        super();
        this.idx = {};
      }
    };
  }

  // Ensure CookieJar is available
  if (!toughCookie.CookieJar) {
    // CookieJar for cookie management
    toughCookie.CookieJar = class CookieJar {
      constructor(store) {
        this.store = store || new toughCookie.MemoryCookieStore();
      }
      setCookie() {}
      getCookies() {
        return [];
      }
      getCookieString() {
        return '';
      }
      getSetCookieStrings() {
        return [];
      }
      serialize() {
        return {};
      }
      toJSON() {
        return {};
      }
    };
  }

  module.exports = toughCookie;
} catch (e) {
  // Fallback if CJS version can't be loaded
  const Store = class Store {
    constructor() {
      this.synchronous = false;
    }
    findCookie() {
      return null;
    }
    findCookies() {
      return [];
    }
    putCookie() {}
    updateCookie() {}
    removeCookie() {}
    removeCookies() {}
    removeAllCookies() {}
    getAllCookies() {
      return [];
    }
  };

  const MemoryCookieStore = class MemoryCookieStore extends Store {
    constructor() {
      super();
      this.idx = {};
    }
  };

  module.exports = {
    Store,
    Cookie: class Cookie {},
    CookieJar: class CookieJar {
      constructor(store) {
        this.store = store || new MemoryCookieStore();
      }
      setCookie() {}
      getCookies() {
        return [];
      }
      getCookieString() {
        return '';
      }
      getSetCookieStrings() {
        return [];
      }
      serialize() {
        return {};
      }
      toJSON() {
        return {};
      }
    },
    MemoryCookieStore,
    domainMatch: () => false,
    pathMatch: () => false,
    parseDate: () => null,
    formatDate: () => '',
    parse: () => null,
    fromJSON: () => null,
    defaultPath: () => '/',
    getPublicSuffix: () => null,
    cookieCompare: () => 0,
    permuteDomain: () => [],
    permutePath: () => [],
    canonicalDomain: () => '',
    version: '0.0.0',
  };
}
