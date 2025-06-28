// IndexedDB service for storing CAT and token data
// Following best practices with versioning, proper indexing, and error handling

// export type SupportedChainId = 137 | 534351 | 5115 | 61 | 8453;
export type SupportedChainId = 5115;

export interface CatDetails {
  chainId: SupportedChainId;
  address: string;
  tokenName: string;
  tokenSymbol: string;
  userRole: 'admin' | 'minter' | 'both';
  createdAt: number;
  updatedAt: number;
  userAddress: string; // Index by user address
}

export interface TokenDetails {
  id: string; // combination of chainId and address
  chainId: SupportedChainId;
  address: string;
  tokenName: string;
  tokenSymbol: string;
  maxSupply: number;
  thresholdSupply: number;
  maxExpansionRate: number;
  currentSupply: number;
  lastMintTimestamp: number;
  maxMintableAmount: number;
  transferRestricted: boolean;
  createdAt: number;
  updatedAt: number;
  userAddress: string; // Index by user address
}

export interface UserRoleInfo {
  id: string; // combination of chainId, address, and userAddress
  chainId: SupportedChainId;
  tokenAddress: string;
  userAddress: string;
  isAdmin: boolean;
  isMinter: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CacheMetadata {
  key: string;
  userAddress: string;
  expiresAt: number;
  data: unknown;
  createdAt: number;
  updatedAt: number;
}

class IndexedDBService {
  private dbName = 'ClowderDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // Store names
  private readonly stores = {
    catDetails: 'catDetails',
    tokenDetails: 'tokenDetails',  
    userRoles: 'userRoles',
    cacheMetadata: 'cacheMetadata'
  } as const;

  // Initialize the database
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        
        // Add error handler for the database
        this.db.onerror = (event) => {
          console.error('Database error:', event);
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create catDetails store
        if (!db.objectStoreNames.contains(this.stores.catDetails)) {
          const catStore = db.createObjectStore(this.stores.catDetails, {
            keyPath: ['chainId', 'address', 'userAddress']
          });
          
          // Create indexes for efficient querying
          catStore.createIndex('userAddress', 'userAddress', { unique: false });
          catStore.createIndex('chainId', 'chainId', { unique: false });
          catStore.createIndex('address', 'address', { unique: false });
          catStore.createIndex('userRole', 'userRole', { unique: false });
          catStore.createIndex('tokenName', 'tokenName', { unique: false });
          catStore.createIndex('tokenSymbol', 'tokenSymbol', { unique: false });
          catStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          catStore.createIndex('userAddress_chainId', ['userAddress', 'chainId'], { unique: false });
          catStore.createIndex('userAddress_userRole', ['userAddress', 'userRole'], { unique: false });
        }

        // Create tokenDetails store
        if (!db.objectStoreNames.contains(this.stores.tokenDetails)) {
          const tokenStore = db.createObjectStore(this.stores.tokenDetails, {
            keyPath: 'id'
          });
          
          // Create indexes
          tokenStore.createIndex('userAddress', 'userAddress', { unique: false });
          tokenStore.createIndex('chainId', 'chainId', { unique: false });
          tokenStore.createIndex('address', 'address', { unique: false });
          tokenStore.createIndex('tokenName', 'tokenName', { unique: false });
          tokenStore.createIndex('tokenSymbol', 'tokenSymbol', { unique: false });
          tokenStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          tokenStore.createIndex('chainId_address', ['chainId', 'address'], { unique: true });
          tokenStore.createIndex('userAddress_chainId', ['userAddress', 'chainId'], { unique: false });
        }

        // Create userRoles store
        if (!db.objectStoreNames.contains(this.stores.userRoles)) {
          const roleStore = db.createObjectStore(this.stores.userRoles, {
            keyPath: 'id'
          });
          
          // Create indexes
          roleStore.createIndex('userAddress', 'userAddress', { unique: false });
          roleStore.createIndex('chainId', 'chainId', { unique: false });
          roleStore.createIndex('tokenAddress', 'tokenAddress', { unique: false });
          roleStore.createIndex('isAdmin', 'isAdmin', { unique: false });
          roleStore.createIndex('isMinter', 'isMinter', { unique: false });
          roleStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          roleStore.createIndex('userAddress_tokenAddress', ['userAddress', 'tokenAddress'], { unique: false });
          roleStore.createIndex('chainId_tokenAddress', ['chainId', 'tokenAddress'], { unique: false });
        }

        // Create cache metadata store
        if (!db.objectStoreNames.contains(this.stores.cacheMetadata)) {
          const cacheStore = db.createObjectStore(this.stores.cacheMetadata, {
            keyPath: ['key', 'userAddress']
          });
          
          // Create indexes
          cacheStore.createIndex('userAddress', 'userAddress', { unique: false });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          cacheStore.createIndex('key', 'key', { unique: false });
          cacheStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  // Ensure database is initialized
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database');
    }
    return this.db;
  }

  // Helper method to create transactions with error handling
  private async createTransaction(storeNames: string | string[], mode: IDBTransactionMode = 'readonly'): Promise<IDBTransaction> {
    const db = await this.ensureDB();
    const transaction = db.transaction(storeNames, mode);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(transaction);
      transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error?.message}`));
      transaction.onabort = () => reject(new Error('Transaction was aborted'));
      
      // Return transaction immediately - the promise will resolve/reject based on the transaction result
      resolve(transaction);
    });
  }

  // CAT Details operations
  async saveCatDetails(catDetails: Omit<CatDetails, 'createdAt' | 'updatedAt'>): Promise<void> {
    const db = await this.ensureDB();
    
    const now = Date.now();
    
    // Get existing data first (in separate transaction)
    const existingData = await this.getCatDetails(catDetails.chainId, catDetails.address, catDetails.userAddress);
    
    // Now create the write transaction
    const transaction = db.transaction([this.stores.catDetails], 'readwrite');
    const store = transaction.objectStore(this.stores.catDetails);
    
    const dataToSave: CatDetails = {
      ...catDetails,
      createdAt: existingData?.createdAt || now,
      updatedAt: now
    };

    return new Promise((resolve, reject) => {
      const request = store.put(dataToSave);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save CAT details: ${request.error?.message}`));
    });
  }

  async getCatDetails(chainId: SupportedChainId, address: string, userAddress: string): Promise<CatDetails | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.catDetails], 'readonly');
    const store = transaction.objectStore(this.stores.catDetails);
    
    return new Promise((resolve, reject) => {
      const request = store.get([chainId, address, userAddress]);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get CAT details: ${request.error?.message}`));
    });
  }

  async getAllCatDetailsForUser(userAddress: string, chainId?: SupportedChainId): Promise<CatDetails[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.catDetails], 'readonly');
    const store = transaction.objectStore(this.stores.catDetails);
    
    return new Promise((resolve, reject) => {
      const results: CatDetails[] = [];
      
      const indexName = chainId ? 'userAddress_chainId' : 'userAddress';
      const keyRange = chainId ? 
        IDBKeyRange.only([userAddress, chainId]) : 
        IDBKeyRange.only(userAddress);
      
      const request = store.index(indexName).openCursor(keyRange);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          // Sort by updatedAt descending
          results.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(results);
        }
      };
      
      request.onerror = () => reject(new Error(`Failed to get CAT details: ${request.error?.message}`));
    });
  }

  async getCatDetailsByRole(userAddress: string, role: 'admin' | 'minter' | 'both'): Promise<CatDetails[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.catDetails], 'readonly');
    const store = transaction.objectStore(this.stores.catDetails);
    
    return new Promise((resolve, reject) => {
      const results: CatDetails[] = [];
      const request = store.index('userAddress_userRole').openCursor(IDBKeyRange.only([userAddress, role]));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          results.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(results);
        }
      };
      
      request.onerror = () => reject(new Error(`Failed to get CAT details by role: ${request.error?.message}`));
    });
  }

  // Token Details operations
  async saveTokenDetails(tokenDetails: Omit<TokenDetails, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const db = await this.ensureDB();
    
    const id = `${tokenDetails.chainId}-${tokenDetails.address}`;
    const now = Date.now();
    
    // Get existing data first (in separate transaction)
    const existingData = await this.getTokenDetails(tokenDetails.chainId, tokenDetails.address);
    
    // Now create the write transaction 
    const transaction = db.transaction([this.stores.tokenDetails], 'readwrite');
    const store = transaction.objectStore(this.stores.tokenDetails);
    
    const dataToSave: TokenDetails = {
      ...tokenDetails,
      id,
      createdAt: existingData?.createdAt || now,
      updatedAt: now
    };

    return new Promise((resolve, reject) => {
      const request = store.put(dataToSave);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save token details: ${request.error?.message}`));
    });
  }

  async getTokenDetails(chainId: SupportedChainId, address: string): Promise<TokenDetails | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.tokenDetails], 'readonly');
    const store = transaction.objectStore(this.stores.tokenDetails);
    
    return new Promise((resolve, reject) => {
      const request = store.index('chainId_address').get([chainId, address]);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get token details: ${request.error?.message}`));
    });
  }

  async getAllTokenDetailsForUser(userAddress: string, chainId?: SupportedChainId): Promise<TokenDetails[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.tokenDetails], 'readonly');
    const store = transaction.objectStore(this.stores.tokenDetails);
    
    return new Promise((resolve, reject) => {
      const results: TokenDetails[] = [];
      
      const indexName = chainId ? 'userAddress_chainId' : 'userAddress';
      const keyRange = chainId ? 
        IDBKeyRange.only([userAddress, chainId]) : 
        IDBKeyRange.only(userAddress);
      
      const request = store.index(indexName).openCursor(keyRange);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          results.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(results);
        }
      };
      
      request.onerror = () => reject(new Error(`Failed to get token details: ${request.error?.message}`));
    });
  }

  // User Role operations
  async saveUserRole(roleInfo: Omit<UserRoleInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const db = await this.ensureDB();
    
    const id = `${roleInfo.chainId}-${roleInfo.tokenAddress}-${roleInfo.userAddress}`;
    const now = Date.now();
    
    // Get existing data first (in separate transaction)
    const existingData = await this.getUserRole(roleInfo.chainId, roleInfo.tokenAddress, roleInfo.userAddress);
    
    // Now create the write transaction
    const transaction = db.transaction([this.stores.userRoles], 'readwrite');
    const store = transaction.objectStore(this.stores.userRoles);
    
    const dataToSave: UserRoleInfo = {
      ...roleInfo,
      id,
      createdAt: existingData?.createdAt || now,
      updatedAt: now
    };

    return new Promise((resolve, reject) => {
      const request = store.put(dataToSave);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save user role: ${request.error?.message}`));
    });
  }

  async getUserRole(chainId: SupportedChainId, tokenAddress: string, userAddress: string): Promise<UserRoleInfo | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.userRoles], 'readonly');
    const store = transaction.objectStore(this.stores.userRoles);
    
    const id = `${chainId}-${tokenAddress}-${userAddress}`;
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get user role: ${request.error?.message}`));
    });
  }

  async getAllUserRoles(userAddress: string): Promise<UserRoleInfo[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.userRoles], 'readonly');
    const store = transaction.objectStore(this.stores.userRoles);
    
    return new Promise((resolve, reject) => {
      const results: UserRoleInfo[] = [];
      const request = store.index('userAddress').openCursor(IDBKeyRange.only(userAddress));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          results.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(results);
        }
      };
      
      request.onerror = () => reject(new Error(`Failed to get user roles: ${request.error?.message}`));
    });
  }

  // Cache operations for performance optimization
  async saveCache(key: string, userAddress: string, data: unknown, ttlMinutes: number = 30): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.cacheMetadata], 'readwrite');
    const store = transaction.objectStore(this.stores.cacheMetadata);
    
    const now = Date.now();
    const cacheData: CacheMetadata = {
      key,
      userAddress,
      data,
      expiresAt: now + (ttlMinutes * 60 * 1000),
      createdAt: now,
      updatedAt: now
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cacheData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save cache: ${request.error?.message}`));
    });
  }

  async getCache(key: string, userAddress: string): Promise<unknown | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.cacheMetadata], 'readonly');
    const store = transaction.objectStore(this.stores.cacheMetadata);
    
    return new Promise((resolve, reject) => {
      const request = store.get([key, userAddress]);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        
        // Check if cache has expired
        if (Date.now() > result.expiresAt) {
          // Clean up expired cache
          this.deleteCache(key, userAddress).catch(console.error);
          resolve(null);
          return;
        }
        
        resolve(result.data);
      };
      request.onerror = () => reject(new Error(`Failed to get cache: ${request.error?.message}`));
    });
  }

  async deleteCache(key: string, userAddress: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.cacheMetadata], 'readwrite');
    const store = transaction.objectStore(this.stores.cacheMetadata);
    
    return new Promise((resolve, reject) => {
      const request = store.delete([key, userAddress]);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete cache: ${request.error?.message}`));
    });
  }

  // Cleanup operations
  async cleanupExpiredCache(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.cacheMetadata], 'readwrite');
    const store = transaction.objectStore(this.stores.cacheMetadata);
    
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const request = store.index('expiresAt').openCursor(IDBKeyRange.upperBound(now));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(new Error(`Failed to cleanup cache: ${request.error?.message}`));
    });
  }

  async clearAllDataForUser(userAddress: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([
      this.stores.catDetails, 
      this.stores.tokenDetails, 
      this.stores.userRoles, 
      this.stores.cacheMetadata
    ], 'readwrite');
    
    const deletePromises = [
      this.clearStoreForUser(transaction.objectStore(this.stores.catDetails), 'userAddress', userAddress),
      this.clearStoreForUser(transaction.objectStore(this.stores.tokenDetails), 'userAddress', userAddress),
      this.clearStoreForUser(transaction.objectStore(this.stores.userRoles), 'userAddress', userAddress),
      this.clearStoreForUser(transaction.objectStore(this.stores.cacheMetadata), 'userAddress', userAddress),
    ];

    await Promise.all(deletePromises);
  }

  private clearStoreForUser(store: IDBObjectStore, indexName: string, userAddress: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.index(indexName).openCursor(IDBKeyRange.only(userAddress));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(new Error(`Failed to clear store: ${request.error?.message}`));
    });
  }

  // Batch operations for better performance
  async batchSaveCatDetails(catDetailsArray: Omit<CatDetails, 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.catDetails], 'readwrite');
    const store = transaction.objectStore(this.stores.catDetails);
    
    const now = Date.now();
    const promises = catDetailsArray.map(catDetails => {
      return new Promise<void>((resolve, reject) => {
        // Check if exists first
        const getRequest = store.get([catDetails.chainId, catDetails.address, catDetails.userAddress]);
        getRequest.onsuccess = () => {
          const existing = getRequest.result;
          const dataToSave: CatDetails = {
            ...catDetails,
            createdAt: existing?.createdAt || now,
            updatedAt: now
          };
          
          const putRequest = store.put(dataToSave);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(new Error(`Failed to save CAT details: ${putRequest.error?.message}`));
        };
        getRequest.onerror = () => reject(new Error(`Failed to check existing CAT details: ${getRequest.error?.message}`));
      });
    });

    await Promise.all(promises);
  }

  async batchSaveTokenDetails(tokenDetailsArray: Omit<TokenDetails, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.stores.tokenDetails], 'readwrite');
    const store = transaction.objectStore(this.stores.tokenDetails);
    
    const now = Date.now();
    const promises = tokenDetailsArray.map(tokenDetails => {
      return new Promise<void>((resolve, reject) => {
        const id = `${tokenDetails.chainId}-${tokenDetails.address}`;
        
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
          const existing = getRequest.result;
          const dataToSave: TokenDetails = {
            ...tokenDetails,
            id,
            createdAt: existing?.createdAt || now,
            updatedAt: now
          };
          
          const putRequest = store.put(dataToSave);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(new Error(`Failed to save token details: ${putRequest.error?.message}`));
        };
        getRequest.onerror = () => reject(new Error(`Failed to check existing token details: ${getRequest.error?.message}`));
      });
    });

    await Promise.all(promises);
  }

  // Database status and info
  async getDatabaseInfo(): Promise<{
    name: string;
    version: number;
    stores: string[];
    isConnected: boolean;
  }> {
    const isConnected = this.db !== null;
    
    return {
      name: this.dbName,
      version: this.dbVersion,
      stores: Object.values(this.stores),
      isConnected
    };
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService(); 