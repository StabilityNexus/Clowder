"use client";

import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import { useAccount, useChainId } from "wagmi";
import { ClowderVaultFactories } from "@/utils/address";
import { config } from "@/utils/config";
import { getPublicClient } from "@wagmi/core";
import { CAT_FACTORY_ABI } from "@/contractsABI/CatFactoryABI";
import detectEthereumProvider from "@metamask/detect-provider";
import { CONTRIBUTION_ACCOUNTING_TOKEN_ABI } from "@/contractsABI/ContributionAccountingTokenABI";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, ChevronLeft, ChevronRight, Database, Wifi, WifiOff } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { ChainDropdown } from "../../components/ChainDropdown";
import { CatRoleDropdown } from "../../components/CatRoleDropdown";
import { useCATStorage } from "@/hooks/useCATStorage";
import { SupportedChainId, CatDetails as StoredCatDetails } from "@/utils/indexedDB";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";

// Define supported chain IDs - use the imported type from IndexedDB
// type SupportedChainId = 137 | 534351 | 5115 | 61 | 8453;

// Chain ID to name mapping
const CHAIN_NAMES: Record<SupportedChainId, string> = {
  137: "Polygon",
  534351: "Scroll Sepolia",
  5115: "Citrea Testnet",
  61: "Ethereum Classic",
  8453: "Base Mainnet",
};

// Chain colors for visual distinction
const CHAIN_COLORS: Record<SupportedChainId, string> = {
  137: "bg-purple-500",
  534351: "bg-orange-500", 
  5115: "bg-yellow-500",
  61: "bg-green-500",
  8453: "bg-blue-500",
};

interface CatDetails {
  chainId: SupportedChainId;
  address: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  userRole: 'admin' | 'minter' | 'both';
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCreatorCATs: number;
  totalMinterCATs: number;
  catsPerPage: number;
}

// Type guard for chain ID validation
const isValidChainId = (
  chainId: number | string
): chainId is SupportedChainId => {
  const validChainIds: SupportedChainId[] = [137, 534351, 5115, 61, 8453];
  return validChainIds.includes(Number(chainId) as SupportedChainId);
};

export default function MyCATsPage() {
  const [currentPageCATs, setCurrentPageCATs] = useState<CatDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<SupportedChainId | "all">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "creator" | "minter">("all");
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 0,
    totalCreatorCATs: 0,
    totalMinterCATs: 0,
    catsPerPage: 6,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { address } = useAccount();
  const currentChainId = useChainId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    getAllCatDetailsForUser,
    getCatDetailsByRole,
    batchSaveCatDetails,
    saveCache,
    getCache,
    isInitialized,
    error: storageError
  } = useCATStorage();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Function to get sorted chain options with connected chain first
  const getSortedChainOptions = useCallback(() => {
    const chainEntries = Object.entries(CHAIN_NAMES) as [string, string][];
    
    // Sort chains: connected chain first, then others
    const sortedChains = chainEntries.sort(([chainIdA], [chainIdB]) => {
      const chainA = Number(chainIdA) as SupportedChainId;
      const chainB = Number(chainIdB) as SupportedChainId;
      
      // If current chain matches one of them, prioritize it
      if (currentChainId === chainA && currentChainId !== chainB) return -1;
      if (currentChainId === chainB && currentChainId !== chainA) return 1;
      
      // Otherwise maintain original order
      return 0;
    });
    
    return sortedChains;
  }, [currentChainId]);

  // Load CATs from IndexedDB with offline-first approach
  const loadCATsFromStorage = useCallback(async (): Promise<CatDetails[]> => {
    if (!isInitialized || !address) return [];

    try {
      let storedCATs: StoredCatDetails[] = [];

      if (roleFilter === "all") {
        storedCATs = await getAllCatDetailsForUser(
          selectedChainId === "all" ? undefined : selectedChainId
        );
      } else {
        const adminCATs = roleFilter === "creator" 
          ? await getCatDetailsByRole('admin')
          : [];
        const minterCATs = roleFilter === "minter"
          ? await getCatDetailsByRole('minter')
          : [];
        
        storedCATs = [...adminCATs, ...minterCATs];
        
        // Filter by chain if needed
        if (selectedChainId !== "all") {
          storedCATs = storedCATs.filter(cat => cat.chainId === selectedChainId);
        }
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        storedCATs = storedCATs.filter(cat => 
          cat.tokenName.toLowerCase().includes(query) ||
          cat.tokenSymbol.toLowerCase().includes(query) ||
          cat.address.toLowerCase().includes(query)
        );
      }

      // Convert StoredCatDetails to CatDetails (address type conversion)
      return storedCATs.map(cat => ({
        chainId: cat.chainId,
        address: cat.address as `0x${string}`,
        tokenName: cat.tokenName,
        tokenSymbol: cat.tokenSymbol,
        userRole: cat.userRole
      }));
    } catch (error) {
      console.error('Error loading CATs from storage:', error);
      return [];
    }
  }, [isInitialized, address, getAllCatDetailsForUser, getCatDetailsByRole, selectedChainId, roleFilter, searchQuery]);

  // Fetch all CATs from blockchain (existing logic extracted)
  const fetchAllCATsFromBlockchain = useCallback(async (): Promise<CatDetails[]> => {
    if (!address) return [];

    const allCATs: CatDetails[] = [];
    
    try {
      for (const [chainId, factoryAddress] of Object.entries(ClowderVaultFactories)) {
        if (!isValidChainId(chainId)) continue;

        const publicClient = getPublicClient(config, { chainId: Number(chainId) as SupportedChainId });
        if (!publicClient) continue;

        try {
          // Get creator CATs
          const creatorCount = await publicClient.readContract({
            address: factoryAddress as `0x${string}`,
            abi: CAT_FACTORY_ABI,
            functionName: "getCreatorCATCount",
            args: [address as `0x${string}`],
          }) as bigint;

          if (Number(creatorCount) > 0) {
            const creatorAddresses = await publicClient.readContract({
              address: factoryAddress as `0x${string}`,
              abi: CAT_FACTORY_ABI,
              functionName: "getCreatorCATAddresses",
              args: [address as `0x${string}`, BigInt(0), creatorCount],
            }) as `0x${string}`[];

            const creatorCATs = await fetchCATDetails(creatorAddresses, Number(chainId) as SupportedChainId, 'admin');
            allCATs.push(...creatorCATs);
          }

          // Get minter CATs
          const minterCount = await publicClient.readContract({
            address: factoryAddress as `0x${string}`,
            abi: CAT_FACTORY_ABI,
            functionName: "getMinterCATCount",
            args: [address as `0x${string}`],
          }) as bigint;

          if (Number(minterCount) > 0) {
            const minterAddresses = await publicClient.readContract({
              address: factoryAddress as `0x${string}`,
              abi: CAT_FACTORY_ABI,
              functionName: "getMinterCATAddresses",
              args: [address as `0x${string}`, BigInt(0), minterCount],
            }) as `0x${string}`[];

            const minterCATs = await fetchCATDetails(minterAddresses, Number(chainId) as SupportedChainId, 'minter');
            allCATs.push(...minterCATs);
          }
        } catch (error) {
          console.error(`Error fetching CATs for chain ${chainId}:`, error);
          // Continue with other chains
        }
      }
    } catch (error) {
      console.error('Error fetching all CATs from blockchain:', error);
    }

    return allCATs;
  }, [address]);

  // Sync data with blockchain
  const syncWithBlockchain = useCallback(async (forceSync: boolean = false): Promise<void> => {
    if (!address) return;

    // Check if offline
    if (!isOnline) {
      toast.error('Cannot sync while offline. Please check your internet connection.');
      return;
    }

    try {
      setIsSyncing(true);
      console.log('Starting blockchain sync...', { forceSync });
      
      // Check cache first unless forcing sync
      if (!forceSync) {
        const lastSync = await getCache('lastSyncTime');
        if (lastSync && Date.now() - (lastSync as number) < 5 * 60 * 1000) { // 5 minutes
          console.log('Recent sync found, skipping blockchain fetch');
          setIsSyncing(false);
          return;
        }
      }

      // Fetch from blockchain using existing logic
      const blockchainCATs = await fetchAllCATsFromBlockchain();
      
      if (blockchainCATs.length > 0) {
        // Save to IndexedDB
        await batchSaveCatDetails(blockchainCATs.map(cat => ({
          chainId: cat.chainId,
          address: cat.address,
          tokenName: cat.tokenName,
          tokenSymbol: cat.tokenSymbol,
          userRole: cat.userRole,
          userAddress: address
        })));

        // Update cache timestamp
        await saveCache('lastSyncTime', Date.now(), 60); // 1 hour TTL
        setLastSyncTime(new Date());
        
        toast.success(`Synced ${blockchainCATs.length} CATs from blockchain`);
      } else {
        toast.success('Sync completed - no new CATs found');
      }
    } catch (error) {
      console.error('Error syncing with blockchain:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to sync with blockchain: ${errorMessage}`);
    } finally {
      setIsSyncing(false);
    }
  }, [address, isOnline, getCache, batchSaveCatDetails, saveCache, fetchAllCATsFromBlockchain]);

  // Manual sync function for consistency with InteractionClient
  const handleManualSync = useCallback(async () => {
    if (!address || !isOnline) {
      if (!isOnline) {
        toast.error('Cannot sync while offline. Please check your internet connection.');
      }
      return;
    }
    
    try {
      await syncWithBlockchain(true);
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast.error('Failed to sync CATs. Please try again.');
    }
  }, [address, isOnline, syncWithBlockchain]);

  // Listen for CAT creation events and auto-sync
  useEffect(() => {
    const handleCatCreated = async (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('CAT created event received:', customEvent.detail);
      
      if (isOnline && address) {
        toast.success('New CAT detected! Syncing...');
        await syncWithBlockchain(true);
      }
    };

    const handleWindowFocus = async () => {
      // Check if a CAT was created while away
      const catCreatedData = localStorage.getItem('catCreated');
      if (catCreatedData && isOnline && address) {
        try {
          const data = JSON.parse(catCreatedData);
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          
          // Only sync if the CAT was created recently (within 5 minutes)
          if (data.timestamp > fiveMinutesAgo) {
            console.log('Recent CAT creation detected on focus, syncing...');
            toast.success('Syncing new CAT data...');
            await syncWithBlockchain(true);
            localStorage.removeItem('catCreated'); // Clear the flag
          }
        } catch (error) {
          console.error('Error parsing CAT creation data:', error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // Page became visible, check for new CATs
        await handleWindowFocus();
      }
    };

    // Listen for custom CAT creation events
    window.addEventListener('catCreated', handleCatCreated);
    
    // Listen for window focus to sync when returning to the page
    window.addEventListener('focus', handleWindowFocus);
    
    // Listen for page visibility changes (tab switches)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('catCreated', handleCatCreated);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOnline, address, syncWithBlockchain]);

  // Fetch CATs for a specific page using storage-first approach
  const fetchCATsForPage = useCallback(async (page: number): Promise<CatDetails[]> => {
    if (!address || !isInitialized) return [];

    try {
      // Load all filtered CATs from storage
      const allStoredCATs = await loadCATsFromStorage();
      
      // Calculate pagination indices
      const catsPerPage = pagination.catsPerPage;
      const startIndex = (page - 1) * catsPerPage;
      const endIndex = startIndex + catsPerPage;
      
      // Return the page slice
      return allStoredCATs.slice(startIndex, endIndex);
    } catch (error) {
      console.error("Error fetching CATs for page from storage:", error);
      return [];
    }
  }, [address, isInitialized, loadCATsFromStorage, pagination.catsPerPage]);

  // Handle page navigation with storage-first approach
  const goToPage = useCallback(async (page: number) => {
    if (page < 1 || page > pagination.totalPages || page === pagination.currentPage) return;

    try {
      setIsLoading(true);
      
      // Load page data from storage
      const pageCATs = await fetchCATsForPage(page);
      setCurrentPageCATs(pageCATs);
      setPagination(prev => ({ ...prev, currentPage: page }));
    } catch (error) {
      console.error("Error navigating to page:", error);
      setError("Failed to load page. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.totalPages, pagination.currentPage, fetchCATsForPage]);

  const goToPreviousPage = () => goToPage(pagination.currentPage - 1);
  const goToNextPage = () => goToPage(pagination.currentPage + 1);

  // Filter and search function
  const filteredCATs = currentPageCATs?.filter((cat) => {
    const matchesSearch = searchQuery === "" || 
      cat.tokenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesChain = selectedChainId === "all" || cat.chainId === Number(selectedChainId);
    
    const matchesRole = roleFilter === "all" || 
      (roleFilter === "creator" && cat.userRole === "admin") ||
      (roleFilter === "minter" && cat.userRole === "minter");
    
    return matchesSearch && matchesChain && matchesRole;
  });

  // Initialize pagination with IndexedDB integration (offline-first approach)
  const initializePagination = useCallback(async () => {
    if (!address || !isInitialized) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(storageError);

      // First, try to load from IndexedDB (offline-first)
      const storedCATs = await loadCATsFromStorage();
      
      if (storedCATs.length > 0) {
        // Calculate pagination from stored data
        const totalCATs = storedCATs.length;
        const creatorCount = storedCATs.filter(cat => cat.userRole === 'admin').length;
        const minterCount = storedCATs.filter(cat => cat.userRole === 'minter').length;
        const totalPages = Math.ceil(totalCATs / pagination.catsPerPage);
        
        setPagination(prev => ({
          ...prev,
          totalPages,
          totalCreatorCATs: creatorCount,
          totalMinterCATs: minterCount,
          currentPage: 1,
        }));

        // Show first page from stored data
        const startIndex = 0;
        const endIndex = pagination.catsPerPage;
        setCurrentPageCATs(storedCATs.slice(startIndex, endIndex));
        
        // Show data immediately from storage
        setIsLoading(false);
        
        // Then sync with blockchain in background if online
        if (isOnline) {
          syncWithBlockchain(false).then(async () => {
            // Refresh data after successful sync
            const refreshedCATs = await loadCATsFromStorage();
            if (refreshedCATs.length !== storedCATs.length) {
              // Data changed, refresh the display
              const newTotalCATs = refreshedCATs.length;
              const newCreatorCount = refreshedCATs.filter(cat => cat.userRole === 'admin').length;
              const newMinterCount = refreshedCATs.filter(cat => cat.userRole === 'minter').length;
              const newTotalPages = Math.ceil(newTotalCATs / pagination.catsPerPage);
              
              setPagination(prev => ({
                ...prev,
                totalPages: newTotalPages,
                totalCreatorCATs: newCreatorCount,
                totalMinterCATs: newMinterCount,
              }));

              const newStartIndex = 0;
              const newEndIndex = pagination.catsPerPage;
              setCurrentPageCATs(refreshedCATs.slice(newStartIndex, newEndIndex));
            }
          }).catch(console.error);
        }
      } else {
        // No stored data, must fetch from blockchain
        if (isOnline) {
          await syncWithBlockchain(true); // Force sync
          // Reload from storage after sync
          const newStoredCATs = await loadCATsFromStorage();
          
          const totalCATs = newStoredCATs.length;
          const creatorCount = newStoredCATs.filter(cat => cat.userRole === 'admin').length;
          const minterCount = newStoredCATs.filter(cat => cat.userRole === 'minter').length;
          const totalPages = Math.ceil(totalCATs / pagination.catsPerPage);
          
          setPagination(prev => ({
            ...prev,
            totalPages,
            totalCreatorCATs: creatorCount,
            totalMinterCATs: minterCount,
            currentPage: 1,
          }));

          const startIndex = 0;
          const endIndex = pagination.catsPerPage;
          setCurrentPageCATs(newStoredCATs.slice(startIndex, endIndex));
        } else {
          setError("No data available offline. Please connect to the internet to sync your CATs.");
          setCurrentPageCATs([]);
          setPagination(prev => ({
            ...prev,
            totalPages: 0,
            totalCreatorCATs: 0,
            totalMinterCATs: 0,
            currentPage: 1,
          }));
        }
      }
    } catch (error) {
      console.error("Error initializing pagination:", error);
      setError(error instanceof Error ? error.message : "Failed to load CATs");
      toast.error("Failed to load CATs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [address, isInitialized, storageError, loadCATsFromStorage, syncWithBlockchain, isOnline, pagination.catsPerPage]);

  useEffect(() => {
    initializePagination();
  }, [initializePagination]);

  // Handle sync URL parameter from create page redirect
  useEffect(() => {
    const shouldSync = searchParams.get('sync');
    if (shouldSync === 'true' && isOnline && address && isInitialized) {
      console.log('Sync parameter detected, triggering immediate sync...');
      toast.success('Welcome back! Syncing your new CAT...');
      syncWithBlockchain(true).then(() => {
        // Clear the sync parameter from URL
        router.replace('/my-cats', { scroll: false });
      }).catch(console.error);
    }
  }, [searchParams, isOnline, address, isInitialized, syncWithBlockchain, router]);

  // Helper function to add delays between requests
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper function to fetch token details with retry logic
  const fetchTokenDetails = async (
    catAddress: `0x${string}`,
    publicClient: ReturnType<typeof getPublicClient>,
    chainId: SupportedChainId,
    defaultRole: 'admin' | 'minter' | 'both'
  ): Promise<CatDetails | null> => {
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const [tokenName, tokenSymbol] = await Promise.all([
          publicClient.readContract({
            address: catAddress,
            abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
            functionName: "name",
          }) as Promise<string>,
          publicClient.readContract({
            address: catAddress,
            abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
            functionName: "symbol",
          }) as Promise<string>,
        ]);

        return {
          chainId,
          address: catAddress,
          tokenName: tokenName || "",
          tokenSymbol: tokenSymbol || "",
          userRole: defaultRole,
        };
      } catch (error: unknown) {
        const errorObj = error as { message?: string; status?: number; code?: number };
        const isRateLimit = errorObj?.message?.includes('rate limit') || 
                           errorObj?.status === 429 ||
                           errorObj?.code === -32016;
        
        if (attempt === maxRetries - 1) {
          // Final attempt failed - return fallback
          console.error(`Failed to fetch CAT ${catAddress} after ${maxRetries} attempts:`, error);
          return {
            chainId,
            address: catAddress,
            tokenName: `CAT ${catAddress.slice(0, 6)}...${catAddress.slice(-4)}`,
            tokenSymbol: "CAT",
            userRole: defaultRole,
          };
        }
        
        if (isRateLimit) {
          // Rate limit hit - wait before retry
          const delayMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          console.log(`Rate limit hit for ${catAddress}, retrying in ${delayMs}ms... (attempt ${attempt + 1})`);
          await delay(delayMs);
        } else {
          // Non-rate-limit error - don't retry
          throw error;
        }
      }
    }
    
    return null; // Should never reach here
  };

  const fetchCATDetails = useCallback(async (
    addresses: `0x${string}`[], 
    chainId: SupportedChainId, 
    defaultRole: 'admin' | 'minter' | 'both'
  ): Promise<CatDetails[]> => {
    const publicClient = getPublicClient(config, { chainId });
    if (!publicClient || !addresses.length) return [];

    try {
      const provider = await detectEthereumProvider();
      if (!provider) throw new Error("Provider not found");

      // Process in small batches to avoid overwhelming the RPC
      const batchSize = 2; // Reduced batch size for rate limiting
      const results: CatDetails[] = [];

      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        
        // Add staggered delays within each batch
        const batchPromises = batch.map(async (catAddress, index) => {
          // Stagger requests within batch
          await delay(index * 300); 
          return fetchTokenDetails(catAddress, publicClient, chainId, defaultRole);
        });

        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter((cat): cat is CatDetails => cat !== null);
        results.push(...validResults);

        // Add delay between batches
        if (i + batchSize < addresses.length) {
          await delay(800); // Wait between batches
        }
      }

      return results;
    } catch (error) {
      console.error("Error fetching CAT details:", error);
      return [];
    }
  }, []);

  return (
    <Layout>
      <div className="min-h-screen mx-auto mb-24">
        <div className="container mx-auto px-4 py-12">
          <motion.div
            className="max-w-7xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row justify-between items-center mb-12">
              <motion.h1
                className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-300 dark:from-[#FFD600] dark:to-yellow-100 mb-4 md:mb-0 drop-shadow-lg"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                My CATs
              </motion.h1>

              <div className="flex flex-col md:flex-row items-center gap-4">
                {/* Status and Sync Controls */}
                <div className="flex items-center gap-3">
                  {/* Online/Offline Status */}
                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm text-gray-600 dark:text-yellow-200">
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {/* Database Status */}
                  {/* <div className="flex items-center gap-2">
                    <Database className={`w-4 h-4 ${isInitialized ? 'text-green-500' : 'text-red-500'}`} />
                    <span className="text-sm text-gray-600 dark:text-yellow-200">
                      {isInitialized ? 'DB Ready' : 'DB Loading'}
                    </span>
                  </div> */}

                  {/* Sync Button */}
                  {isInitialized && (
                    <motion.button
                      onClick={handleManualSync}
                      disabled={!isOnline || isSyncing}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-300 disabled:opacity-50 ${
                        isOnline 
                          ? 'bg-blue-500/20 dark:bg-yellow-400/20 text-blue-600 dark:text-yellow-400 hover:bg-blue-500/30 dark:hover:bg-yellow-400/30' 
                          : 'bg-gray-500/20 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                      whileHover={{ scale: (!isOnline || isSyncing) ? 1 : 1.05 }}
                      whileTap={{ scale: (!isOnline || isSyncing) ? 1 : 0.95 }}
                      title={!isOnline ? 'Cannot sync while offline' : 'Sync with blockchain'}
                    >
                      <motion.div
                        animate={isSyncing ? { rotate: 360 } : {}}
                        transition={isSyncing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                      >
                        <Database className="w-4 h-4" />
                      </motion.div>
                      <span>{isSyncing ? 'Syncing...' : !isOnline ? 'Offline' : 'Sync'}</span>
                    </motion.button>
                  )}

                  {/* Last Sync Time */}
                  {lastSyncTime && (
                    <span className="text-xs text-gray-500 dark:text-yellow-200/70">
                      Last sync: {lastSyncTime.toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <Link href="/create">
                  <motion.button
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-300 dark:from-[#FFD600] dark:to-yellow-100 text-black rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create New CAT</span>
                  </motion.button>
                </Link>
              </div>
            </div>

            {/* Search and Filter Section */}
            <motion.div 
              className="mb-8 flex flex-col md:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-blue-500 dark:text-yellow-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by token name or symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/80 dark:bg-[#1a1400]/70 border border-[#bfdbfe] dark:border-yellow-400/20 text-gray-800 dark:text-yellow-100 placeholder-gray-500 dark:placeholder-yellow-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-yellow-400 focus:border-transparent transition-all duration-300"
                />
              </div>
              
              {/* Role Filter Dropdown */}
              <div className="relative">
                <CatRoleDropdown 
                  selectedRole={roleFilter}
                  onRoleSelect={setRoleFilter}
                />
              </div>
              
              {/* Custom Network Dropdown */}
              <div className="relative">
                <ChainDropdown 
                  selectedChainId={selectedChainId}
                  onChainSelect={setSelectedChainId}
                  currentChainId={currentChainId}
                  getSortedChainOptions={getSortedChainOptions}
                />
              </div>
            </motion.div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <motion.div 
                className="mb-8 flex items-center justify-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <motion.button
                  onClick={goToPreviousPage}
                  disabled={pagination.currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-[#1a1400]/70 border border-[#bfdbfe] dark:border-yellow-400/20 text-gray-800 dark:text-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 dark:hover:bg-yellow-400/10 transition-all duration-300"
                  whileHover={{ scale: pagination.currentPage === 1 ? 1 : 1.05 }}
                  whileTap={{ scale: pagination.currentPage === 1 ? 1 : 0.95 }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </motion.button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-yellow-200">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-yellow-200/70">
                    ({pagination.totalCreatorCATs + pagination.totalMinterCATs} total CATs)
                  </span>
                </div>

                <motion.button
                  onClick={goToNextPage}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-[#1a1400]/70 border border-[#bfdbfe] dark:border-yellow-400/20 text-gray-800 dark:text-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 dark:hover:bg-yellow-400/10 transition-all duration-300"
                  whileHover={{ scale: pagination.currentPage === pagination.totalPages ? 1 : 1.05 }}
                  whileTap={{ scale: pagination.currentPage === pagination.totalPages ? 1 : 0.95 }}
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}

            {/* Offline Banner */}
            <AnimatePresence>
              {!isOnline && currentPageCATs.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="mb-6"
                >
                  <div className="bg-gradient-to-r from-orange-50/90 to-red-50/90 dark:from-yellow-900/80 dark:to-amber-900/80 backdrop-blur-sm rounded-2xl border-2 border-orange-200/60 dark:border-yellow-400/40 p-6 shadow-lg">
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-500 dark:from-red-500 dark:to-red-600 flex items-center justify-center shadow-lg">
                        <WifiOff className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-orange-800 dark:text-yellow-200">
                          You&apos;re Offline
                        </h3>
                        <p className="text-sm text-orange-600 dark:text-yellow-300">
                          No cached CATs available. Please connect to the internet to sync your data.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="max-w-6xl mx-auto px-4 text-center mt-18">
            {isLoading ? (
              <LoadingState
                title="Loading Your CATs"
                message="Please wait while we fetch your Contribution Accounting Tokens..."
              />
            ) : error ? (
              <LoadingState
                type="error"
                errorMessage={error}
              />
            ) : filteredCATs?.length ? (
              <motion.div
                className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, staggerChildren: 0.1 }}
              >
                {filteredCATs.map((cat, index) => (
                  <motion.div
                    key={`${cat.chainId}-${cat.address}`}
                    className="group relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#93c5fd]/30 to-[#60a5fa]/30 dark:from-yellow-400/20 dark:to-blue-400/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                    <motion.div
                      className="relative rounded-2xl p-8 bg-white/80 dark:bg-[#1a1400]/70 border border-[#bfdbfe] dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(37,99,235,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-300 dark:hover:border-yellow-400"
                      whileHover={{ y: -8 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="relative z-10 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-300 dark:from-[#FFD600] dark:to-blue-400 flex items-center justify-center text-white font-bold text-xl">
                            {cat.tokenSymbol.slice(0, 2)}
                          </div>
                          <div className="flex-1 text-center px-4">
                            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-300 dark:from-[#FFD600] dark:to-blue-400">
                              {cat.tokenName || cat.address}
                            </h2>
                            <p className="text-sm text-[#1e40af] dark:text-yellow-100">
                              {cat.tokenSymbol}
                            </p>
                          </div>
                          <motion.div
                            className="w-8 h-8 rounded-full bg-[#dbeafe] dark:bg-yellow-400/20 flex items-center justify-center"
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.3 }}
                          >
                            <span className="text-blue-500 dark:text-yellow-400 text-lg">→</span>
                          </motion.div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-[#eff6ff] dark:bg-[#1a1400]/50 border border-[#bfdbfe] dark:border-yellow-400/20">
                            <span className="text-sm text-[#1e40af] dark:text-yellow-100">Network</span>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${CHAIN_COLORS[cat.chainId]}`}></div>
                              <span className="text-sm font-medium text-blue-500 dark:text-yellow-400">
                                {CHAIN_NAMES[cat.chainId]}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-xl bg-[#eff6ff] dark:bg-[#1a1400]/50 border border-[#bfdbfe] dark:border-yellow-400/20">
                            <span className="text-sm text-[#1e40af] dark:text-yellow-100">Your Role</span>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                cat.userRole === 'admin' 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  : cat.userRole === 'both'
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              }`}>
                                {cat.userRole === 'admin' ? 'Administrator' : 
                                 cat.userRole === 'both' ? 'Admin & Minter' : 'Minter'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="p-3 rounded-xl bg-[#eff6ff] dark:bg-[#1a1400]/50 border border-[#bfdbfe] dark:border-yellow-400/20">
                            <p className="text-xs text-[#1e40af]/70 dark:text-yellow-200/70 mb-1">Contract Address</p>
                            <p className="text-sm font-mono text-[#1e40af] dark:text-yellow-100 break-all">
                              {cat.address}
                            </p>
                          </div>
                        </div>

                        <Link 
                          href={`/c?vault=${cat.address}&chainId=${cat.chainId}`}
                          className="mt-6 w-full"
                        >
                          <motion.button
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-300 dark:from-[#FFD600] dark:to-[#BA9901] text-white dark:text-black font-medium hover:from-[#1d4ed8] hover:to-blue-500 dark:hover:from-yellow-400 dark:hover:to-yellow-200 transition-all duration-300"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Manage CAT
                          </motion.button>
                        </Link>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                className="text-center p-12 rounded-2xl shadow-lg bg-white/80 dark:bg-[#1a1400]/70 backdrop-blur-lg border border-[#bfdbfe] dark:border-yellow-400/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-8">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#93c5fd] to-[#60a5fa] dark:from-yellow-400/20 dark:to-blue-400/20 flex items-center justify-center mb-4">
                    <Search className="w-10 h-10 text-blue-500 dark:text-yellow-400" />
                  </div>
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-300 dark:from-[#FFD600] dark:to-blue-400 mb-4">
                    No CATs Found
                  </h3>
                  <p className="text-lg text-[#1e40af] dark:text-yellow-100">
                    {searchQuery || selectedChainId !== "all" 
                      ? "No CATs match your search criteria"
                      : roleFilter === "minter"
                      ? "You don't have any CATs with minter role"
                      : roleFilter === "creator"
                      ? "You haven't created any CATs yet"
                      : "Start by creating your first Contribution Accounting Token"}
                  </p>
                </div>
                {!searchQuery && selectedChainId === "all" && roleFilter !== "minter" && (
                  <Link href="/create">
                    <motion.button
                      className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-300 dark:from-[#FFD600] dark:to-[#BA9901] text-white dark:text-black rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Plus className="w-5 h-5" />
                      <span>{roleFilter === "creator" ? "Create Your First CAT" : "Create Your First CAT"}</span>
                    </motion.button>
                  </Link>
                )}
              </motion.div>
            )}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
