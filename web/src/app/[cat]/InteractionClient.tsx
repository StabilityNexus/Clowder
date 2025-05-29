"use client";

import React, { useEffect, useState } from "react";
import { Info, Coins, Settings, ArrowUpRight, ArrowDownRight, Unlock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPublicClient } from "@wagmi/core";
import { config } from "@/utils/config";
import { useSearchParams } from "next/navigation";
import { CONTRIBUTION_ACCOUNTING_TOKEN_ABI } from "@/contractsABI/ContributionAccountingTokenABI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";

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
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mintAmount, setMintAmount] = useState("");
  const [newMaxSupply, setNewMaxSupply] = useState("");
  const [newThresholdSupply, setNewThresholdSupply] = useState("");
  const [newMaxExpansionRate, setNewMaxExpansionRate] = useState("");

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

  // Contract write hooks
  const { writeContract: mint, data: mintData } = useWriteContract();

  const { writeContract: reduceMaxSupply, data: reduceMaxSupplyData } = useWriteContract();

  const { writeContract: reduceThresholdSupply, data: reduceThresholdSupplyData } = useWriteContract();

  const { writeContract: reduceMaxExpansionRate, data: reduceMaxExpansionRateData } = useWriteContract();

  const { writeContract: disableTransferRestriction, data: disableTransferRestrictionData } = useWriteContract();

  // Transaction hooks
  const { isLoading: isMinting } = useWaitForTransactionReceipt({
    hash: mintData,
  });

  const { isLoading: isReducingMaxSupply } = useWaitForTransactionReceipt({
    hash: reduceMaxSupplyData,
  });

  const { isLoading: isReducingThresholdSupply } = useWaitForTransactionReceipt({
    hash: reduceThresholdSupplyData,
  });

  const { isLoading: isReducingMaxExpansionRate } = useWaitForTransactionReceipt({
    hash: reduceMaxExpansionRateData,
  });

  const { isLoading: isDisablingTransferRestriction } = useWaitForTransactionReceipt({
    hash: disableTransferRestrictionData,
  });

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
    <div className="min-h-screen bg-gradient-to-b">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl text-gray-600 dark:text-gray-400">
            {tokenDetails.tokenSymbol} Token Management
          </h1>
        </div>

        {/* Token Overview Card */}
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-800 shadow-xl">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Info className="h-6 w-6 text-blue-500" />
              Token Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Max Supply</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tokenDetails.maxSupply}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Threshold Supply</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tokenDetails.thresholdSupply}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownRight className="h-5 w-5 text-purple-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Max Expansion Rate</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tokenDetails.maxExpansionRate}%
                </p>
              </div>
            </div>
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contract Address</h3>
              </div>
              <p className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all">
                {tokenDetails.transactionHash}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mint Tokens Card */}
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-800 shadow-xl">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Coins className="h-6 w-6 text-green-500" />
              Mint Tokens
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mintAmount" className="text-lg">Amount to Mint</Label>
                <Input
                  id="mintAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <Button
                onClick={() => mint({
                  abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
                  address: tokenAddress,
                  functionName: "mint",
                  args: [address, parseEther(mintAmount)]
                })}
                disabled={!mintAmount || isMinting}
                className="w-full h-12 text-lg"
              >
                {isMinting ? "Minting..." : "Mint Tokens"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Admin Functions Card */}
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-800 shadow-xl">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Settings className="h-6 w-6 text-blue-500" />
              Admin Functions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newMaxSupply" className="text-lg">New Max Supply</Label>
                  <Input
                    id="newMaxSupply"
                    type="number"
                    placeholder="Enter new max supply"
                    value={newMaxSupply}
                    onChange={(e) => setNewMaxSupply(e.target.value)}
                    className="h-12 text-lg"
                  />
                  <Button
                    onClick={() => reduceMaxSupply({
                      abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
                      address: tokenAddress,
                      functionName: "reduceMaxSupply",
                      args: [parseEther(newMaxSupply)]
                    })}
                    disabled={!newMaxSupply || isReducingMaxSupply}
                    className="w-full h-12 text-lg"
                  >
                    {isReducingMaxSupply ? "Updating..." : "Update Max Supply"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newThresholdSupply" className="text-lg">New Threshold Supply</Label>
                  <Input
                    id="newThresholdSupply"
                    type="number"
                    placeholder="Enter new threshold supply"
                    value={newThresholdSupply}
                    onChange={(e) => setNewThresholdSupply(e.target.value)}
                    className="h-12 text-lg"
                  />
                  <Button
                    onClick={() => reduceThresholdSupply({
                      abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
                      address: tokenAddress,
                      functionName: "reduceThresholdSupply",
                      args: [parseEther(newThresholdSupply)]
                    })}
                    disabled={!newThresholdSupply || isReducingThresholdSupply}
                    className="w-full h-12 text-lg"
                  >
                    {isReducingThresholdSupply ? "Updating..." : "Update Threshold Supply"}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newMaxExpansionRate" className="text-lg">New Max Expansion Rate (%)</Label>
                  <Input
                    id="newMaxExpansionRate"
                    type="number"
                    placeholder="Enter new max expansion rate"
                    value={newMaxExpansionRate}
                    onChange={(e) => setNewMaxExpansionRate(e.target.value)}
                    className="h-12 text-lg"
                  />
                  <Button
                    onClick={() => reduceMaxExpansionRate({
                      abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
                      address: tokenAddress,
                      functionName: "reduceMaxExpansionRate",
                      args: [Number(newMaxExpansionRate) * 100]
                    })}
                    disabled={!newMaxExpansionRate || isReducingMaxExpansionRate}
                    className="w-full h-12 text-lg"
                  >
                    {isReducingMaxExpansionRate ? "Updating..." : "Update Max Expansion Rate"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-lg">Transfer Restriction</Label>
                  <Button
                    onClick={() => disableTransferRestriction({
                      abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
                      address: tokenAddress,
                      functionName: "disableTransferRestriction"
                    })}
                    disabled={isDisablingTransferRestriction}
                    className="w-full h-12 text-lg"
                  >
                    {isDisablingTransferRestriction ? (
                      "Disabling..."
                    ) : (
                      <div className="flex items-center gap-2">
                        <Unlock className="h-5 w-5" />
                        Disable Transfer Restriction
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
