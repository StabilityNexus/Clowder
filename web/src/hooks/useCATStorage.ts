import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { indexedDBService, CatDetails, TokenDetails, UserRoleInfo, SupportedChainId } from '@/utils/indexedDB';

interface UseCATStorageReturn {
  // CAT Details
  saveCatDetails: (catDetails: Omit<CatDetails, 'createdAt' | 'updatedAt'>) => Promise<void>;
  getCatDetails: (chainId: SupportedChainId, address: string) => Promise<CatDetails | null>;
  getAllCatDetailsForUser: (chainId?: SupportedChainId) => Promise<CatDetails[]>;
  getCatDetailsByRole: (role: 'admin' | 'minter' | 'both') => Promise<CatDetails[]>;
  batchSaveCatDetails: (catDetailsArray: Omit<CatDetails, 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  
  // Token Details
  saveTokenDetails: (tokenDetails: Omit<TokenDetails, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  getTokenDetails: (chainId: SupportedChainId, address: string) => Promise<TokenDetails | null>;
  getAllTokenDetailsForUser: (chainId?: SupportedChainId) => Promise<TokenDetails[]>;
  batchSaveTokenDetails: (tokenDetailsArray: Omit<TokenDetails, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  
  // User Roles
  saveUserRole: (roleInfo: Omit<UserRoleInfo, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  getUserRole: (chainId: SupportedChainId, tokenAddress: string) => Promise<UserRoleInfo | null>;
  getAllUserRoles: () => Promise<UserRoleInfo[]>;
  
  // Cache Management
  saveCache: (key: string, data: unknown, ttlMinutes?: number) => Promise<void>;
  getCache: (key: string) => Promise<unknown | null>;
  deleteCache: (key: string) => Promise<void>;
  
  // Utility functions
  clearAllData: () => Promise<void>;
  cleanupExpiredCache: () => Promise<void>;
  getDatabaseInfo: () => Promise<{
    name: string;
    version: number;
    stores: string[];
    isConnected: boolean;
  }>;
  
  // State
  isInitialized: boolean;
  error: string | null;
}

export const useCATStorage = (): UseCATStorageReturn => {
  const { address } = useAccount();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize IndexedDB on mount
  useEffect(() => {
    const initDB = async () => {
      try {
        await indexedDBService.init();
        setIsInitialized(true);
        setError(null);
        
        // Clean up expired cache on initialization
        await indexedDBService.cleanupExpiredCache();
      } catch (err) {
        console.error('Failed to initialize IndexedDB:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
        setIsInitialized(false);
      }
    };

    initDB();
  }, []);

  // CAT Details functions
  const saveCatDetails = useCallback(async (catDetails: Omit<CatDetails, 'createdAt' | 'updatedAt'>) => {
    if (!address) throw new Error('User address not available');
    
    try {
      await indexedDBService.saveCatDetails({
        ...catDetails,
        userAddress: address
      });
    } catch (err) {
      console.error('Failed to save CAT details:', err);
      throw err;
    }
  }, [address]);

  const getCatDetails = useCallback(async (chainId: SupportedChainId, tokenAddress: string): Promise<CatDetails | null> => {
    if (!address) return null;
    
    try {
      return await indexedDBService.getCatDetails(chainId, tokenAddress, address);
    } catch (err) {
      console.error('Failed to get CAT details:', err);
      return null;
    }
  }, [address]);

  const getAllCatDetailsForUser = useCallback(async (chainId?: SupportedChainId): Promise<CatDetails[]> => {
    if (!address) return [];
    
    try {
      return await indexedDBService.getAllCatDetailsForUser(address, chainId);
    } catch (err) {
      console.error('Failed to get all CAT details:', err);
      return [];
    }
  }, [address]);

  const getCatDetailsByRole = useCallback(async (role: 'admin' | 'minter' | 'both'): Promise<CatDetails[]> => {
    if (!address) return [];
    
    try {
      return await indexedDBService.getCatDetailsByRole(address, role);
    } catch (err) {
      console.error('Failed to get CAT details by role:', err);
      return [];
    }
  }, [address]);

  const batchSaveCatDetails = useCallback(async (catDetailsArray: Omit<CatDetails, 'createdAt' | 'updatedAt'>[]): Promise<void> => {
    if (!address) throw new Error('User address not available');
    
    try {
      const catDetailsWithUser = catDetailsArray.map(cat => ({
        ...cat,
        userAddress: address
      }));
      
      await indexedDBService.batchSaveCatDetails(catDetailsWithUser);
    } catch (err) {
      console.error('Failed to batch save CAT details:', err);
      throw err;
    }
  }, [address]);

  // Token Details functions
  const saveTokenDetails = useCallback(async (tokenDetails: Omit<TokenDetails, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    if (!address) throw new Error('User address not available');
    
    try {
      await indexedDBService.saveTokenDetails({
        ...tokenDetails,
        userAddress: address
      });
    } catch (err) {
      console.error('Failed to save token details:', err);
      throw err;
    }
  }, [address]);

  const getTokenDetails = useCallback(async (chainId: SupportedChainId, tokenAddress: string): Promise<TokenDetails | null> => {
    try {
      return await indexedDBService.getTokenDetails(chainId, tokenAddress);
    } catch (err) {
      console.error('Failed to get token details:', err);
      return null;
    }
  }, []);

  const getAllTokenDetailsForUser = useCallback(async (chainId?: SupportedChainId): Promise<TokenDetails[]> => {
    if (!address) return [];
    
    try {
      return await indexedDBService.getAllTokenDetailsForUser(address, chainId);
    } catch (err) {
      console.error('Failed to get all token details:', err);
      return [];
    }
  }, [address]);

  const batchSaveTokenDetails = useCallback(async (tokenDetailsArray: Omit<TokenDetails, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> => {
    if (!address) throw new Error('User address not available');
    
    try {
      const tokenDetailsWithUser = tokenDetailsArray.map(token => ({
        ...token,
        userAddress: address
      }));
      
      await indexedDBService.batchSaveTokenDetails(tokenDetailsWithUser);
    } catch (err) {
      console.error('Failed to batch save token details:', err);
      throw err;
    }
  }, [address]);

  // User Roles functions
  const saveUserRole = useCallback(async (roleInfo: Omit<UserRoleInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    if (!address) throw new Error('User address not available');
    
    try {
      await indexedDBService.saveUserRole({
        ...roleInfo,
        userAddress: address
      });
    } catch (err) {
      console.error('Failed to save user role:', err);
      throw err;
    }
  }, [address]);

  const getUserRole = useCallback(async (chainId: SupportedChainId, tokenAddress: string): Promise<UserRoleInfo | null> => {
    if (!address) return null;
    
    try {
      return await indexedDBService.getUserRole(chainId, tokenAddress, address);
    } catch (err) {
      console.error('Failed to get user role:', err);
      return null;
    }
  }, [address]);

  const getAllUserRoles = useCallback(async (): Promise<UserRoleInfo[]> => {
    if (!address) return [];
    
    try {
      return await indexedDBService.getAllUserRoles(address);
    } catch (err) {
      console.error('Failed to get all user roles:', err);
      return [];
    }
  }, [address]);

  // Cache functions
  const saveCache = useCallback(async (key: string, data: unknown, ttlMinutes: number = 30): Promise<void> => {
    if (!address) throw new Error('User address not available');
    
    try {
      await indexedDBService.saveCache(key, address, data, ttlMinutes);
    } catch (err) {
      console.error('Failed to save cache:', err);
      throw err;
    }
  }, [address]);

  const getCache = useCallback(async (key: string): Promise<unknown | null> => {
    if (!address) return null;
    
    try {
      return await indexedDBService.getCache(key, address);
    } catch (err) {
      console.error('Failed to get cache:', err);
      return null;
    }
  }, [address]);

  const deleteCache = useCallback(async (key: string): Promise<void> => {
    if (!address) throw new Error('User address not available');
    
    try {
      await indexedDBService.deleteCache(key, address);
    } catch (err) {
      console.error('Failed to delete cache:', err);
      throw err;
    }
  }, [address]);

  // Utility functions
  const clearAllData = useCallback(async (): Promise<void> => {
    if (!address) throw new Error('User address not available');
    
    try {
      await indexedDBService.clearAllDataForUser(address);
    } catch (err) {
      console.error('Failed to clear all data:', err);
      throw err;
    }
  }, [address]);

  const cleanupExpiredCache = useCallback(async (): Promise<void> => {
    try {
      await indexedDBService.cleanupExpiredCache();
    } catch (err) {
      console.error('Failed to cleanup expired cache:', err);
      throw err;
    }
  }, []);

  const getDatabaseInfo = useCallback(async () => {
    try {
      return await indexedDBService.getDatabaseInfo();
    } catch (err) {
      console.error('Failed to get database info:', err);
      throw err;
    }
  }, []);

  return {
    // CAT Details
    saveCatDetails,
    getCatDetails,
    getAllCatDetailsForUser,
    getCatDetailsByRole,
    batchSaveCatDetails,
    
    // Token Details
    saveTokenDetails,
    getTokenDetails,
    getAllTokenDetailsForUser,
    batchSaveTokenDetails,
    
    // User Roles
    saveUserRole,
    getUserRole,
    getAllUserRoles,
    
    // Cache Management
    saveCache,
    getCache,
    deleteCache,
    
    // Utility functions
    clearAllData,
    cleanupExpiredCache,
    getDatabaseInfo,
    
    // State
    isInitialized,
    error
  };
}; 