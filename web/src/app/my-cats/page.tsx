"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import { useAccount, useWriteContract } from "wagmi";
import { ClowderVaultFactories } from "@/utils/address";
import { config } from "@/utils/config";
import { getPublicClient } from "@wagmi/core";
import { CAT_FACTORY_ABI } from "@/contractsABI/CatFactoryABI";
import detectEthereumProvider from "@metamask/detect-provider";
import { CONTRIBUTION_ACCOUNTING_TOKEN_ABI } from "@/contractsABI/ContributionAccountingTokenABI";
import { motion } from "framer-motion";
import { Plus, Search, Filter } from "lucide-react";
import { showTransactionToast } from "@/components/ui/transaction-toast";
import { LoadingState } from "@/components/ui/loading-state";

// Define supported chain IDs
type SupportedChainId = 1 | 137 | 534351 | 5115 | 61 | 2001;

// Chain ID to name mapping
const CHAIN_NAMES: Record<SupportedChainId, string> = {
  1: "Ethereum",
  137: "Polygon",
  534351: "Scroll Sepolia",
  5115: "Citrea",
  61: "Ethereum Classic",
  2001: "Milkomeda"
};

interface CatDetails {
  chainId: SupportedChainId;
  address: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
}

// Type guard for chain ID validation
const isValidChainId = (
  chainId: number | string
): chainId is SupportedChainId => {
  const validChainIds: SupportedChainId[] = [1, 137, 534351, 5115, 61, 2001];
  return validChainIds.includes(Number(chainId) as SupportedChainId);
};

export default function MyCATsPage() {
  const [ownedCATs, setOwnedCATs] = useState<CatDetails[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<SupportedChainId | "all">("all");
  const { address } = useAccount();

  const fetchCATsFromAllChains = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let allCATs: CatDetails[] = [];

      const chainPromises = Object.entries(ClowderVaultFactories)
        .filter(([chainId]) => isValidChainId(chainId))
        .map(([chainId, factoryAddress]) =>
          fetchCATsForChain(Number(chainId) as SupportedChainId, factoryAddress)
        );

      const results = await Promise.all(chainPromises);
      allCATs = results.flat().filter((cat): cat is CatDetails => cat !== null);

      setOwnedCATs(allCATs);
    } catch (error) {
      console.error("Error fetching CATs:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: config.state.chainId,
        success: false,
        message: "Failed to fetch CATs. Please try again later.",
      });
      setError("Failed to fetch CATs. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCATsForChain = async (
    chainId: SupportedChainId,
    factoryAddress: string
  ): Promise<CatDetails[]> => {
    try {
      const publicClient = getPublicClient(config, { chainId });

      if (!publicClient || !address) {
        console.error(`No public client available for chain ${chainId}`);
        return [];
      }

      console.log(chainId);
      console.log(factoryAddress);

      const catAddresses = (await publicClient.readContract({
        address: factoryAddress as `0x${string}`,
        abi: CAT_FACTORY_ABI,
        functionName: "getCATAddresses",
        args: [address as `0x${string}`],
      })) as `0x${string}`[];

      console.log(catAddresses);

      const provider = await detectEthereumProvider();
      if (!provider) {
        throw new Error("Provider not found");
      }

      const catPromises = catAddresses.map(async (catAddress) => {
        try {
          const [tokenName, tokenSymbol] = await Promise.all([
            publicClient.readContract({
              address: catAddress,
              abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
              functionName: "tokenName",
            }) as Promise<string>,
            publicClient.readContract({
              address: catAddress,
              abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
              functionName: "tokenSymbol",
            }) as Promise<string>,
          ]);

          console.log(tokenName, tokenSymbol);

          return {
            chainId,
            address: catAddress,
            tokenName: tokenName || "",
            tokenSymbol: tokenSymbol || "",
          };
        } catch (error) {
          console.error(
            `Error fetching CAT ${catAddress} on chain ${chainId}:`,
            error
          );
          return null;
        }
      });

      const results = await Promise.all(catPromises);
      return results.filter((cat): cat is CatDetails => cat !== null);
    } catch (error) {
      console.error(`Error fetching CATs for chain ${chainId}:`, error);
      return [];
    }
  };

  useEffect(() => {
    if (address) {
      fetchCATsFromAllChains();
    }
  }, [address, fetchCATsFromAllChains]);

  // Filter and search function
  const filteredCATs = ownedCATs?.filter((cat) => {
    const matchesSearch = searchQuery === "" || 
      cat.tokenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesChain = selectedChainId === "all" || cat.chainId === Number(selectedChainId);
    
    return matchesSearch && matchesChain;
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
                className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-300 dark:from-[#FFD600] dark:to-blue-400 mb-4 md:mb-0 drop-shadow-lg"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                My CATs
              </motion.h1>
              <Link href="/create">
                <motion.button
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-300 dark:bg-[#BA9901] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
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
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-blue-500 dark:text-yellow-400" />
                </div>
                <select
                  value={selectedChainId}
                  onChange={(e) => setSelectedChainId(e.target.value as SupportedChainId | "all")}
                  className="pl-10 pr-4 py-3 rounded-xl bg-white/80 dark:bg-[#1a1400]/70 border border-[#bfdbfe] dark:border-yellow-400/20 text-gray-800 dark:text-yellow-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-yellow-400 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer"
                >
                  <option value="all">All Chains</option>
                  {Object.entries(CHAIN_NAMES).map(([chainId, name]) => (
                    <option key={chainId} value={chainId}>
                      {name} ({chainId})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-500 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </motion.div>

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
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-300 dark:from-[#FFD600] dark:to-blue-400 flex items-center justify-center text-white font-bold text-xl">
                              {cat.tokenSymbol.slice(0, 2)}
                            </div>
                            <div>
                              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-300 dark:from-[#FFD600] dark:to-blue-400">
                                {cat.tokenName || cat.address}
                              </h2>
                              <p className="text-sm text-[#1e40af] dark:text-yellow-100">
                                {cat.tokenSymbol}
                              </p>
                            </div>
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
                            <span className="text-sm text-[#1e40af] dark:text-yellow-100">Chain ID</span>
                            <span className="text-sm font-medium text-blue-500 dark:text-yellow-400">{cat.chainId}</span>
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
