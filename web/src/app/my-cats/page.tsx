"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ClowderVaultFactories } from "@/utils/address";
import { config } from "@/utils/config";
import { getPublicClient } from "@wagmi/core";
import { CAT_FACTORY_ABI } from "@/contractsABI/CatFactoryABI";
import detectEthereumProvider from "@metamask/detect-provider";
import { CONTRIBUTION_ACCOUNTING_TOKEN_ABI } from "@/contractsABI/ContributionAccountingTokenABI";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { showTransactionToast } from "@/components/ui/transaction-toast";

// Define supported chain IDs
type SupportedChainId = 1 | 137 | 534351 | 5115 | 61 | 2001;

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
  const { address } = useAccount();

  const { writeContract: fetchCATs, data: fetchData } = useWriteContract();
  const { isLoading: isFetching } = useWaitForTransactionReceipt({
    hash: fetchData,
  });

  useEffect(() => {
    if (fetchData) {
      showTransactionToast({
        hash: fetchData,
        chainId: config.state.chainId,
        message: "CATs fetched successfully!",
      });
    }
  }, [fetchData]);

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
  }, [address]);

  return (
    <Layout>
      <div className="w-full min-h-screen ">
        <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <motion.h1
            className="text-4xl font-extrabold text-center text-[#5cacc5] dark:text-[#BA9901] mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            My CATs
          </motion.h1>
          {isLoading ? (
            <div className="flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-2 text-lg text-gray-700 dark:text-gray-300">
                Loading your CATs...
              </span>
            </div>
          ) : error ? (
            <motion.div
              className="flex items-center justify-center p-4 bg-red-100 dark:bg-red-900 rounded-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </motion.div>
          ) : ownedCATs?.length ? (
            <motion.ul
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
            >
              {ownedCATs.map((cat) => (
                <motion.li
                  key={`${cat.chainId}-${cat.address}`}
                  className="border border-gray-600 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={`/c?vault=${cat.address}&chainId=${cat.chainId}`}
                    className="block p-6"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {cat.tokenName || cat.address}
                    </h2>
                    <p className="text-md text-gray-600 dark:text-gray-400 mb-4">
                      Symbol: {cat.tokenSymbol}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-400 dark:text-yellow-400 bg-blue-100 dark:bg-gray-600 px-2 py-1 rounded-full">
                        Chain: {cat.chainId}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        View Details →
                      </span>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          ) : (
            <motion.div
              className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xl text-gray-700 dark:text-gray-300">
                You don&apos;t own any CATs yet.
              </p>
              <Link
                href="/create"
                className="mt-4 inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
              >
                Create a CAT
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
