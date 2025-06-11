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
import { motion } from "framer-motion";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { showTransactionToast } from "@/components/ui/transaction-toast";
import { LoadingState } from "@/components/ui/loading-state";
import { ChainDropdown } from "../../components/ChainDropdown";
import { CatRoleDropdown } from "../../components/CatRoleDropdown";

// Define supported chain IDs
type SupportedChainId = 137 | 534351 | 5115 | 61 | 8453;

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
  
  const { address } = useAccount();
  const currentChainId = useChainId();

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

  // Calculate total counts for pagination
  const fetchTotalCounts = useCallback(async (): Promise<{totalCreatorCATs: number, totalMinterCATs: number}> => {
    if (!address) return { totalCreatorCATs: 0, totalMinterCATs: 0 };

    try {
      let totalCreatorCATs = 0;
      let totalMinterCATs = 0;

      const chainPromises = Object.entries(ClowderVaultFactories)
        .filter(([chainId]) => isValidChainId(chainId))
        .map(async ([chainId, factoryAddress]) => {
          const publicClient = getPublicClient(config, { chainId: Number(chainId) as SupportedChainId });
          
          if (!publicClient) return { creatorCount: 0, minterCount: 0 };

          try {
            const [creatorCount, minterCount] = await Promise.all([
              publicClient.readContract({
                address: factoryAddress as `0x${string}`,
                abi: CAT_FACTORY_ABI,
                functionName: "getCreatorCATCount",
                args: [address as `0x${string}`],
              }) as Promise<bigint>,
              publicClient.readContract({
                address: factoryAddress as `0x${string}`,
                abi: CAT_FACTORY_ABI,
                functionName: "getMinterCATCount",
                args: [address as `0x${string}`],
              }) as Promise<bigint>
            ]);

            return { creatorCount: Number(creatorCount), minterCount: Number(minterCount) };
          } catch (error) {
            console.error(`Error fetching counts for chain ${chainId}:`, error);
            return { creatorCount: 0, minterCount: 0 };
          }
        });

      const results = await Promise.all(chainPromises);
      
      results.forEach(({ creatorCount, minterCount }) => {
        totalCreatorCATs += creatorCount;
        totalMinterCATs += minterCount;
      });

      return { totalCreatorCATs, totalMinterCATs };
    } catch (error) {
      console.error("Error fetching total counts:", error);
      return { totalCreatorCATs: 0, totalMinterCATs: 0 };
    }
  }, [address]);

  // Fetch CATs for a specific page
  const fetchCATsForPage = useCallback(async (page: number): Promise<CatDetails[]> => {
    if (!address) return [];

    const catsPerPage = pagination.catsPerPage;
    const startIndex = (page - 1) * catsPerPage;

    try {
      // Get counts first
      const { totalCreatorCATs, } = await fetchTotalCounts();

      let catsToFetch: CatDetails[] = [];
      let remainingToFetch = catsPerPage;
      let currentGlobalIndex = startIndex;

             // Apply role filter when fetching CATs
       if (roleFilter === "creator" || roleFilter === "all") {
         // First, try to get creator CATs
         if (currentGlobalIndex < totalCreatorCATs && remainingToFetch > 0) {
           const creatorStartIndex = currentGlobalIndex;
           const creatorEndIndex = Math.min(creatorStartIndex + remainingToFetch, totalCreatorCATs);
           const creatorCatsNeeded = creatorEndIndex - creatorStartIndex;

           if (creatorCatsNeeded > 0) {
             const creatorCATs = await fetchCreatorCATs(creatorStartIndex, creatorEndIndex);
             catsToFetch.push(...creatorCATs);
             remainingToFetch -= creatorCATs.length;
             currentGlobalIndex += creatorCATs.length;
           }
         }
       }

       if (roleFilter === "minter" || roleFilter === "all") {
         // Then, get minter CATs if we need more and haven't finished with creator CATs
         if (remainingToFetch > 0 && (currentGlobalIndex >= totalCreatorCATs || roleFilter === "minter")) {
           const minterStartIndex = roleFilter === "minter" ? currentGlobalIndex : currentGlobalIndex - totalCreatorCATs;
           const minterEndIndex = minterStartIndex + remainingToFetch;

           const minterCATs = await fetchMinterCATs(minterStartIndex, minterEndIndex);
           catsToFetch.push(...minterCATs);
         }
       }

      return catsToFetch;
    } catch (error) {
      console.error("Error fetching CATs for page:", error);
      return [];
    }
     }, [address, pagination.catsPerPage, roleFilter]);

  const fetchCreatorCATs = useCallback(async (startIndex: number, endIndex: number): Promise<CatDetails[]> => {
    if (!address) return [];

    try {
      let allCreatorCATs: CatDetails[] = [];
      let currentStart = startIndex;
      let currentEnd = endIndex;

      for (const [chainId, factoryAddress] of Object.entries(ClowderVaultFactories)) {
        if (!isValidChainId(chainId)) continue;

        const publicClient = getPublicClient(config, { chainId: Number(chainId) as SupportedChainId });
        if (!publicClient) continue;

        try {
          // Get count for this chain
          const chainCreatorCount = await publicClient.readContract({
            address: factoryAddress as `0x${string}`,
            abi: CAT_FACTORY_ABI,
            functionName: "getCreatorCATCount",
            args: [address as `0x${string}`],
          }) as bigint;

          const chainCount = Number(chainCreatorCount);

          if (currentStart < chainCount && currentEnd > 0) {
            const chainStart = Math.max(0, currentStart);
            const chainEnd = Math.min(chainCount, currentEnd);

            if (chainEnd > chainStart) {
              const addresses = await publicClient.readContract({
                address: factoryAddress as `0x${string}`,
                abi: CAT_FACTORY_ABI,
                functionName: "getCreatorCATAddresses",
                args: [address as `0x${string}`, BigInt(chainStart), BigInt(chainEnd)],
              }) as `0x${string}`[];

              const chainCATs = await fetchCATDetails(addresses, Number(chainId) as SupportedChainId, 'admin');
              allCreatorCATs.push(...chainCATs);
            }
          }

          currentStart = Math.max(0, currentStart - chainCount);
          currentEnd = Math.max(0, currentEnd - chainCount);

          if (currentEnd <= 0) break;
        } catch (error) {
          console.error(`Error fetching creator CATs for chain ${chainId}:`, error);
        }
      }

      return allCreatorCATs;
    } catch (error) {
      console.error("Error fetching creator CATs:", error);
      return [];
    }
  }, [address]);

  const fetchMinterCATs = useCallback(async (startIndex: number, endIndex: number): Promise<CatDetails[]> => {
    if (!address) return [];

    try {
      let allMinterCATs: CatDetails[] = [];
      let currentStart = startIndex;
      let currentEnd = endIndex;

      for (const [chainId, factoryAddress] of Object.entries(ClowderVaultFactories)) {
        if (!isValidChainId(chainId)) continue;

        const publicClient = getPublicClient(config, { chainId: Number(chainId) as SupportedChainId });
        if (!publicClient) continue;

        try {
          // Get count for this chain
          const chainMinterCount = await publicClient.readContract({
            address: factoryAddress as `0x${string}`,
            abi: CAT_FACTORY_ABI,
            functionName: "getMinterCATCount",
            args: [address as `0x${string}`],
          }) as bigint;

          const chainCount = Number(chainMinterCount);

          if (currentStart < chainCount && currentEnd > 0) {
            const chainStart = Math.max(0, currentStart);
            const chainEnd = Math.min(chainCount, currentEnd);

            if (chainEnd > chainStart) {
              const addresses = await publicClient.readContract({
                address: factoryAddress as `0x${string}`,
                abi: CAT_FACTORY_ABI,
                functionName: "getMinterCATAddresses",
                args: [address as `0x${string}`, BigInt(chainStart), BigInt(chainEnd)],
              }) as `0x${string}`[];

              const chainCATs = await fetchCATDetails(addresses, Number(chainId) as SupportedChainId, 'minter');
              allMinterCATs.push(...chainCATs);
            }
          }

          currentStart = Math.max(0, currentStart - chainCount);
          currentEnd = Math.max(0, currentEnd - chainCount);

          if (currentEnd <= 0) break;
        } catch (error) {
          console.error(`Error fetching minter CATs for chain ${chainId}:`, error);
        }
      }

      return allMinterCATs;
    } catch (error) {
      console.error("Error fetching minter CATs:", error);
      return [];
    }
  }, [address]);

  // Helper function to add delays between requests
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper function to fetch token details with retry logic
  const fetchTokenDetails = async (
    catAddress: `0x${string}`,
    publicClient: any,
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
      } catch (error: any) {
        const isRateLimit = error?.message?.includes('rate limit') || 
                           error?.status === 429 ||
                           error?.code === -32016;
        
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

  // Initialize pagination and load first page
  const initializePagination = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

             const { totalCreatorCATs, totalMinterCATs } = await fetchTotalCounts();
       
       // Calculate total based on role filter
       let totalCATs = totalCreatorCATs + totalMinterCATs;
       if (roleFilter === "creator") {
         totalCATs = totalCreatorCATs;
       } else if (roleFilter === "minter") {
         totalCATs = totalMinterCATs;
       }
       
       const totalPages = Math.ceil(totalCATs / pagination.catsPerPage);

      setPagination(prev => ({
        ...prev,
        totalPages,
        totalCreatorCATs,
        totalMinterCATs,
        currentPage: 1
      }));

      if (totalCATs > 0) {
        const firstPageCATs = await fetchCATsForPage(1);
        setCurrentPageCATs(firstPageCATs);
      } else {
        setCurrentPageCATs([]);
      }
    } catch (error) {
      console.error("Error initializing pagination:", error);
      setError("Failed to fetch CATs. Please try again later.");
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: config.state.chainId,
        success: false,
        message: "Failed to fetch CATs. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
     }, [address, pagination.catsPerPage, roleFilter, fetchTotalCounts, fetchCATsForPage]);

  // Handle page navigation
  const goToPage = useCallback(async (page: number) => {
    if (page < 1 || page > pagination.totalPages || page === pagination.currentPage) return;

    try {
      setIsLoading(true);
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

  useEffect(() => {
    initializePagination();
  }, [initializePagination]);

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
                      : "Start by creating your first Contribution Accounting Token"}
                  </p>
                </div>
                {!searchQuery && selectedChainId === "all" && (
                  <Link href="/create">
                    <motion.button
                      className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-300 dark:from-[#FFD600] dark:to-[#BA9901] text-white dark:text-black rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create Your First CAT</span>
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
