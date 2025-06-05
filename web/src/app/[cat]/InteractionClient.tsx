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
import { showTransactionToast } from "@/components/ui/transaction-toast";
import { motion } from "framer-motion";
import { LoadingState } from "@/components/ui/loading-state";
import { ButtonLoadingState } from "@/components/ui/button-loading-state";

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
  const [transferRestricted, setTransferRestricted] = useState<boolean>(true);


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

  // Add new state for transaction signing
  const [isSigning, setIsSigning] = useState(false);

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

      const restricted = (await publicClient.readContract({
        address: tokenAddress,
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        functionName: "transferRestricted",
      })) as boolean;
      setTransferRestricted(restricted);
      
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
  }, [tokenAddress, chainId, getTokenDetails]);

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

  useEffect(() => {
    if (mintData) {
      showTransactionToast({
        hash: mintData,
        chainId: chainId!,
        message: "Tokens minted successfully!",
      });
    }
  }, [mintData, chainId]);

  useEffect(() => {
    if (reduceMaxSupplyData) {
      showTransactionToast({
        hash: reduceMaxSupplyData,
        chainId: chainId!,
        message: "Max supply updated successfully!",
      });
    }
  }, [reduceMaxSupplyData, chainId]);

  useEffect(() => {
    if (reduceThresholdSupplyData) {
      showTransactionToast({
        hash: reduceThresholdSupplyData,
        chainId: chainId!,
        message: "Threshold supply updated successfully!",
      });
    }
  }, [reduceThresholdSupplyData, chainId]);

  useEffect(() => {
    if (reduceMaxExpansionRateData) {
      showTransactionToast({
        hash: reduceMaxExpansionRateData,
        chainId: chainId!,
        message: "Max expansion rate updated successfully!",
      });
    }
  }, [reduceMaxExpansionRateData, chainId]);

  useEffect(() => {
    if (disableTransferRestrictionData) {
      showTransactionToast({
        hash: disableTransferRestrictionData,
        chainId: chainId!,
        message: "Transfer restriction disabled successfully!",
      });
    }
  }, [disableTransferRestrictionData, chainId]);

  // Update the mint function
  const handleMint = async () => {
    try {
      setIsSigning(true);
      await mint({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "mint",
        args: [address, parseEther(mintAmount)]
      });
    } catch (error) {
      console.error("Error minting tokens:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: chainId!,
        success: false,
        message: "Failed to mint tokens",
      });
    } finally {
      setIsSigning(false);
    }
  };

  // Update the reduceMaxSupply function
  const handleReduceMaxSupply = async () => {
    try {
      setIsSigning(true);
      await reduceMaxSupply({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "reduceMaxSupply",
        args: [parseEther(newMaxSupply)]
      });
    } catch (error) {
      console.error("Error reducing max supply:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: chainId!,
        success: false,
        message: "Failed to update max supply",
      });
    } finally {
      setIsSigning(false);
    }
  };

  // Update the reduceThresholdSupply function
  const handleReduceThresholdSupply = async () => {
    try {
      setIsSigning(true);
      await reduceThresholdSupply({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "reduceThresholdSupply",
        args: [parseEther(newThresholdSupply)]
      });
    } catch (error) {
      console.error("Error reducing threshold supply:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: chainId!,
        success: false,
        message: "Failed to update threshold supply",
      });
    } finally {
      setIsSigning(false);
    }
  };

  // Update the reduceMaxExpansionRate function
  const handleReduceMaxExpansionRate = async () => {
    try {
      setIsSigning(true);
      await reduceMaxExpansionRate({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "reduceMaxExpansionRate",
        args: [Number(newMaxExpansionRate) * 100]
      });
    } catch (error) {
      console.error("Error reducing max expansion rate:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: chainId!,
        success: false,
        message: "Failed to update max expansion rate",
      });
    } finally {
      setIsSigning(false);
    }
  };

  // Update the disableTransferRestriction function
  const handleDisableTransferRestriction = async () => {
    try {
      setIsSigning(true);
      await disableTransferRestriction({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "disableTransferRestriction",
      });
    } catch (error) {
      console.error("Error disabling transfer restriction:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: chainId!,
        success: false,
        message: "Failed to disable transfer restriction",
      });
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Loading Token Details"
        message="Please wait while we fetch your token information..."
      />
    );
  }

  if (error) {
    return (
      <LoadingState
        type="error"
        errorMessage={error}
      />
    );
  }

  return (
    <div className="min-h-screen mx-auto">
      <div className="max-w-7xl mx-auto space-y-8 px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.h1 
            className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-white mb-4 md:mb-0 drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {tokenDetails.tokenSymbol} Token Management
          </motion.h1>
          <motion.p 
            className="text-lg text-gray-600 font-bold dark:text-yellow-100 mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {tokenDetails.tokenName}
          </motion.p>
        </div>

        {/* Token Overview Card */}
        <Card className="group relative rounded-2xl p-8 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400 before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-blue-200/30 before:to-transparent dark:before:from-yellow-400/20 dark:before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-3xl text-blue-400 dark:text-yellow-200">
              <Info className="h-6 w-6 text-blue-400 dark:text-[#FFD600]" />
              Token Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-5 w-5 text-green-500 dark:text-[#FFD600]" />
                  <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Max Supply</h3>
                </div>
                <p className="text-3xl font-semibold text-gray-600 dark:text-yellow-200">
                  {tokenDetails.maxSupply}
                </p>
              </div>
              <div className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="h-5 w-5 text-blue-400 dark:text-[#FFD600]" />
                  <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Threshold Supply</h3>
                </div>
                <p className="text-3xl font-semibold text-gray-600 dark:text-yellow-200">
                  {tokenDetails.thresholdSupply}
                </p>
              </div>
              <div className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownRight className="h-5 w-5 text-purple-500 dark:text-[#FFD600]" />
                  <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Max Expansion Rate</h3>
                </div>
                <p className="text-3xl font-semibold text-gray-600 dark:text-yellow-200">
                  {tokenDetails.maxExpansionRate}%
                </p>
              </div>
            </div>
            <div className="mt-6 group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-gray-500 dark:text-[#FFD600]" />
                <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Contract Address</h3>
              </div>
              <p className="text-sm font-mono text-gray-600 dark:text-yellow-100 break-all">
                {tokenDetails.transactionHash}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mint Tokens Card */}
        <Card className="group relative rounded-2xl p-8 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-3xl text-blue-400 dark:text-yellow-200">
              <Coins className="h-6 w-6 text-green-500 dark:text-[#FFD600]" />
              Mint Tokens
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="max-w-md mx-auto space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mintAmount" className="text-lg font-bold text-gray-600  dark:text-yellow-200">Amount to Mint</Label>
                <Input
                  id="mintAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  className="h-12 text-lg bg-white/60 dark:bg-[#1a1400]/70 border-2 border-gray-200 dark:border-yellow-400/20 text-gray-600 dark:text-yellow-200"
                />
              </div>
              <Button
                onClick={handleMint}
                disabled={!mintAmount || isMinting || isSigning}
                className="w-full h-12 text-lg bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
              >
                {isMinting || isSigning ? (
                  <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                ) : (
                  "Mint Tokens"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Admin Functions Card */}
        <Card className="group relative rounded-2xl p-8 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-3xl text-blue-400 dark:text-yellow-200">
              <Settings className="h-6 w-6 text-blue-400 dark:text-[#FFD600]" />
              Admin Functions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newMaxSupply" className="text-lg font-bold text-gray-600 dark:text-yellow-200">New Max Supply</Label>
                  <Input
                    id="newMaxSupply"
                    type="number"
                    placeholder="Enter new max supply"
                    value={newMaxSupply}
                    onChange={(e) => setNewMaxSupply(e.target.value)}
                    className="h-12 text-lg bg-white/60 dark:bg-[#1a1400]/70 border-2 border-gray-200 dark:border-yellow-400/20 text-gray-600 dark:text-yellow-200"
                  />
                  <Button
                    onClick={handleReduceMaxSupply}
                    disabled={!newMaxSupply || isReducingMaxSupply || isSigning}
                    className="w-full h-12 text-lg bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                  >
                    {isReducingMaxSupply || isSigning ? (
                      <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                    ) : (
                      "Update Max Supply"
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newThresholdSupply" className="text-lg font-bold text-gray-600 dark:text-yellow-200">New Threshold Supply</Label>
                  <Input
                    id="newThresholdSupply"
                    type="number"
                    placeholder="Enter new threshold supply"
                    value={newThresholdSupply}
                    onChange={(e) => setNewThresholdSupply(e.target.value)}
                    className="h-12 text-lg bg-white/60 dark:bg-[#1a1400]/70 border-2 border-gray-200 dark:border-yellow-400/20 text-gray-600 dark:text-yellow-200"
                  />
                  <Button
                    onClick={handleReduceThresholdSupply}
                    disabled={!newThresholdSupply || isReducingThresholdSupply || isSigning}
                    className="w-full h-12 text-lg bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                  >
                    {isReducingThresholdSupply || isSigning ? (
                      <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                    ) : (
                      "Update Threshold Supply"
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newMaxExpansionRate" className="text-lg font-bold text-gray-600 dark:text-yellow-200">New Max Expansion Rate (%)</Label>
                  <Input
                    id="newMaxExpansionRate"
                    type="number"
                    placeholder="Enter new max expansion rate"
                    value={newMaxExpansionRate}
                    onChange={(e) => setNewMaxExpansionRate(e.target.value)}
                    className="h-12 text-lg bg-white/60 dark:bg-[#1a1400]/70 border-2 border-gray-200 dark:border-yellow-400/20 text-gray-600 dark:text-yellow-200"
                  />
                  <Button
                    onClick={handleReduceMaxExpansionRate}
                    disabled={!newMaxExpansionRate || isReducingMaxExpansionRate || isSigning}
                    className="w-full h-12 text-lg bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                  >
                    {isReducingMaxExpansionRate || isSigning ? (
                      <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                    ) : (
                      "Update Max Expansion Rate"
                    )}
                  </Button>
                </div>

                {transferRestricted ? (
                  <div className="space-y-2">
                    <Label className="text-lg font-bold text-gray-600 dark:text-yellow-200">Transfer Restriction</Label>
                    <Button
                      onClick={handleDisableTransferRestriction}
                      disabled={isDisablingTransferRestriction || isSigning}
                      className="w-full h-12 text-lg bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                    >
                      {isDisablingTransferRestriction || isSigning ? (
                        <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Unlock className="h-5 w-5" />
                          Disable Transfer Restriction
                        </div>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-lg font-bold text-gray-600 dark:text-yellow-200">Transfer Restriction</Label>
                    <p className="text-lg text-gray-600 dark:text-yellow-200">Transfer restriction is already disabled</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
