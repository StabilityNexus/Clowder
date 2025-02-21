"use client";

import React, { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPublicClient } from "@wagmi/core";
import { config } from "@/utils/config";
import { useSearchParams } from "next/navigation";
import { CONTRIBUTION_ACCOUNTING_TOKEN_ABI } from "@/contractsABI/ContributionAccountingTokenABI";

// Define supported chain IDs
type SupportedChainId = 1 | 137 | 534351 | 5115 | 61 | 2001;

interface TokenDetailsState {
  tokenName: string;
  tokenSymbol: string;
  maxSupply: number;
  thresholdSupply: number;
  maxExpansionRate: number;
  transactionHash: string;
  timestamp: string;
}

export default function InteractionClient() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tokenAddress, setTokenAddress] = useState<`0x${string}`>("0x0");
  const [chainId, setChainId] = useState<SupportedChainId | null>(null);

  const [tokenDetails, setTokenDetails] = useState<TokenDetailsState>({
    tokenName: "",
    tokenSymbol: "",
    maxSupply: 0,
    thresholdSupply: 0,
    maxExpansionRate: 0,
    transactionHash: "",
    timestamp: "",
  });

  // Get vault address and chainId from URL parameters
  useEffect(() => {
    const vault = searchParams.get("vault");
    const chain = searchParams.get("chainId");

    if (vault && chain) {
      setTokenAddress(vault as `0x${string}`);
      const parsedChainId = Number(chain) as SupportedChainId;
      // Validate chain ID
      if (isValidChainId(parsedChainId)) {
        setChainId(parsedChainId);
      } else {
        setError(`Unsupported chain ID: ${chain}`);
      }
    }
  }, [searchParams]);

  // Type guard for chain ID validation
  const isValidChainId = (chainId: number): chainId is SupportedChainId => {
    const validChainIds: SupportedChainId[] = [1, 137, 534351, 5115, 61, 2001];
    return validChainIds.includes(chainId as SupportedChainId);
  };

  const getTokenDetails = async () => {
    if (!tokenAddress || !chainId) {
      setError("Invalid token address or chain ID");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const publicClient = getPublicClient(config, { chainId });

      if (!publicClient) {
        throw new Error(`No public client available for chain ${chainId}`);
      }

      const [name, symbol, maxSupply, threshold, expansionRate] =
        (await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
            functionName: "name",
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
            functionName: "symbol",
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
            functionName: "maxSupply",
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
            functionName: "thresholdSupply",
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
            functionName: "maxExpansionRate",
          }),
        ])) as [string, string, bigint, bigint, bigint];

      setTokenDetails({
        tokenName: name,
        tokenSymbol: symbol,
        maxSupply: Number(maxSupply) / 10 ** 18,
        thresholdSupply: Number(threshold) / 10 ** 18,
        maxExpansionRate: Number(expansionRate) / 100,
        transactionHash: tokenAddress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching token details:", error);
      setError("Failed to fetch token details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tokenAddress && chainId) {
      getTokenDetails();
    }
  }, [tokenAddress, chainId]);

  // Rest of the component remains the same...
  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-xl text-gray-900 dark:text-white">
          Loading token details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-xl text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full pt-14">
      <Card className="w-full mt-8 mx-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">
            <div className="flex items-center space-x-2">
              <Info className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              <span>Token Information</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-md p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Token Name
                </div>
                <div className="text-lg text-gray-900 dark:text-white">
                  {tokenDetails.tokenName}
                </div>
              </div>
              <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-md p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Token Symbol
                </div>
                <div className="text-lg text-gray-900 dark:text-white">
                  {tokenDetails.tokenSymbol}
                </div>
              </div>
              <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-md p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Max Supply
                </div>
                <div className="text-lg text-gray-900 dark:text-white">
                  {tokenDetails.maxSupply}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-md p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Threshold Supply
                </div>
                <div className="text-lg text-gray-900 dark:text-white">
                  {tokenDetails.thresholdSupply}
                </div>
              </div>
              <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-md p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Max Expansion Rate
                </div>
                <div className="text-lg text-gray-900 dark:text-white">
                  {tokenDetails.maxExpansionRate}%
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-800 rounded-md p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
              Transaction Hash
            </div>
            <div className="text-sm text-gray-900 dark:text-white font-mono break-all">
              {tokenDetails.transactionHash}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
