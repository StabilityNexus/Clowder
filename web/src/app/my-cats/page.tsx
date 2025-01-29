"use client";

import { useCallback, useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ClowderVaultFactories } from "@/utils/address";
import { config } from "@/utils/config";
import { getPublicClient } from "@wagmi/core";
import { CAT_FACTORY_ABI } from "@/contractsABI/CatFactoryABI";
import detectEthereumProvider from "@metamask/detect-provider";
import CONTRIBUTION_ACCOUNTING_TOKEN_ABI from "@/contractsABI/ContributionAccountingTokenABI";

interface CatDetails {
  chainId: string;
  address: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
}

// Helper function to create a timeout promise
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
};

export default function MyCATsPage() {
  const [ownedCATs, setOwnedCATs] = useState<CatDetails[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();

  const fetchCATsFromAllChains = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let allCATs: CatDetails[] = [];

      const chainPromises = Object.entries(ClowderVaultFactories).map(
        ([chainId, factoryAddress]) =>
          fetchCATsForChain(chainId, factoryAddress)
      );

      const results = await Promise.all(chainPromises);
      allCATs = results.flat().filter((cat): cat is CatDetails => cat !== null);

      setOwnedCATs(allCATs);
    } catch (error) {
      console.error("Error fetching CATs:", error);
      setError("Failed to fetch CATs. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCATsForChain = async (
    chainId: string,
    factoryAddress: string
  ): Promise<CatDetails[]> => {
    try {
      const publicClient = getPublicClient(config as any, {
        chainId: parseInt(chainId),
      });

      if (!publicClient || !address) {
        console.error(`No public client available for chain ${chainId}`);
        return [];
      }

      console.log(chainId);
      console.log(factoryAddress);

      const catAddresses = await withTimeout(
        publicClient.readContract({
          address: factoryAddress as `0x${string}`,
          abi: CAT_FACTORY_ABI,
          functionName: "getCATAddresses",
          args: [address as `0x${string}`],
        }),
        10000 // 10 second timeout
      ) as `0x${string}`[];

      console.log(catAddresses);

      const provider = await detectEthereumProvider();
      if (!provider) {
        throw new Error("Provider not found");
      }

      const catPromises = catAddresses.map(async (catAddress) => {
        try {
          const [tokenName, tokenSymbol] = await Promise.all([
            withTimeout(
              publicClient.readContract({
                address: catAddress,
                abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
                functionName: "tokenName",
              }),
              5000 // 5 second timeout
            ) as Promise<string>,
            withTimeout(
              publicClient.readContract({
                address: catAddress,
                abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
                functionName: "tokenSymbol",
              }),
              5000 // 5 second timeout
            ) as Promise<string>,
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
      <div className="w-full">
        <div className="container mx-auto py-8 mt-9 justify-center text-center">
          <h1 className="text-3xl font-bold mb-6">My CATs</h1>
          {isLoading ? (
            <p>Loading your CATs...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : ownedCATs?.length ? (
            <ul className="space-y-4">
              {ownedCATs.map((cat) => (
                <li
                  key={`${cat.chainId}-${cat.address}`}
                  className="border p-4 rounded-lg"
                >
                  <Link
                    href={`/c?vault=${cat.address}&chainId=${cat.chainId}`}
                    className="text-blue-500 hover:underline"
                  >
                    {cat.tokenName || cat.address} ({cat.tokenSymbol})
                    <span className="ml-2 text-sm text-zinc-500">
                      (Chain: {cat.chainId})
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>You don&apos;t own any CATs yet.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}