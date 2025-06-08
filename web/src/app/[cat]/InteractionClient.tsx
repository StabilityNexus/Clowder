"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Info, Coins, Settings, Unlock, Copy, ArrowUp, Target } from "lucide-react";
import { Card,  CardContent } from "@/components/ui/card";
import { getPublicClient } from "@wagmi/core";
import { config } from "@/utils/config";
import { useSearchParams } from "next/navigation";
import { CONTRIBUTION_ACCOUNTING_TOKEN_ABI } from "@/contractsABI/ContributionAccountingTokenABI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { showTransactionToast } from "@/components/ui/transaction-toast";
import { motion } from "framer-motion";
import { LoadingState } from "@/components/ui/loading-state";
import { ButtonLoadingState } from "@/components/ui/button-loading-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { catExplorer } from "@/utils/catExplorer";

// Define supported chain IDs
type SupportedChainId = 1 | 137 | 534351 | 5115 | 61 | 2001;

interface TokenDetailsState {
  tokenName: string;
  tokenSymbol: string;
  maxSupply: number;
  thresholdSupply: number;
  maxExpansionRate: number;
  currentSupply: number;
  transactionHash: string;
  tokenAddress: string;
  timestamp: string;
  lastMintTimestamp: number;
  maxMintableAmount: number;
}

export default function InteractionClient() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mintAmount, setMintAmount] = useState("");
  const [newMaxSupply, setNewMaxSupply] = useState("");
  const [newThresholdSupply, setNewThresholdSupply] = useState("");
  const [newMaxExpansionRate, setNewMaxExpansionRate] = useState("");
  const [transferRestricted, setTransferRestricted] = useState<boolean>(true);
  const [mintToAddress, setMintToAddress] = useState<string>("");

  const [tokenAddress, setTokenAddress] = useState<`0x${string}`>("0x0");
  const [chainId, setChainId] = useState<SupportedChainId | null>(null);

  const [tokenDetails, setTokenDetails] = useState<TokenDetailsState>({
    tokenName: "",
    tokenSymbol: "",
    maxSupply: 0,
    thresholdSupply: 0,
    maxExpansionRate: 0,
    currentSupply: 0,
    transactionHash: "",
    tokenAddress: "",
    timestamp: "",
    lastMintTimestamp: 0,
    maxMintableAmount: 0,
  });

  // Add new state for transaction signing
  const [isSigning, setIsSigning] = useState(false);

  const [minterAddress, setMinterAddress] = useState<string>("");
  const { writeContract: grantMinterRole, data: grantMinterRoleData } = useWriteContract();
  const { writeContract: revokeMinterRole, data: revokeMinterRoleData } = useWriteContract();

  const { isLoading: isGrantingMinterRole } = useWaitForTransactionReceipt({
    hash: grantMinterRoleData,
  });

  const { isLoading: isRevokingMinterRole } = useWaitForTransactionReceipt({
    hash: revokeMinterRoleData,
  });

  // Type guard for chain ID validation
  const isValidChainId = useCallback((chainId: number): chainId is SupportedChainId => {
    const validChainIds: SupportedChainId[] = [1, 137, 534351, 5115, 61, 2001];
    return validChainIds.includes(chainId as SupportedChainId);
  }, []);

  // Get vault address and chainId from URL parameters
  useEffect(() => {
    const vault = searchParams.get("vault");
    const chain = searchParams.get("chainId");

    if (!vault || !chain) {
      setError("Missing vault address or chain ID");
      setIsLoading(false);
      return;
    }

    try {
      if (!/^0x[a-fA-F0-9]{40}$/.test(vault)) {
        throw new Error("Invalid vault address format");
      }

      const parsedChainId = Number(chain);
      if (!isValidChainId(parsedChainId)) {
        throw new Error(`Unsupported chain ID: ${chain}`);
      }

      setTokenAddress(vault as `0x${string}`);
      setChainId(parsedChainId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid parameters");
      setIsLoading(false);
    }
  }, [searchParams, isValidChainId]);

  const getTokenDetails = useCallback(async () => {
    if (!tokenAddress || !chainId) {
      setError("Invalid token address or chain ID");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const publicClient = getPublicClient(config, { chainId });
      if (!publicClient) {
        throw new Error(`No public client available for chain ${chainId}`);
      }

      const [name, symbol, maxSupply, threshold, expansionRate, currentSupply, lastMint, maxMintable] =
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
          publicClient.readContract({
            address: tokenAddress,
            abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
            functionName: "totalSupply",
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
            functionName: "lastMintTimestamp",
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
            functionName: "maxMintableAmount",
          }),
        ])) as [string, string, bigint, bigint, bigint, bigint, bigint, bigint];

      if (!name || !symbol) {
        throw new Error("Invalid token contract");
      }

      setTokenDetails({
        tokenName: name,
        tokenSymbol: symbol,
        maxSupply: Number(maxSupply) / 10 ** 18,
        thresholdSupply: Number(threshold) / 10 ** 18,
        maxExpansionRate: Number(expansionRate) / 100,
        currentSupply: Number(currentSupply) / 10 ** 18,
        transactionHash: tokenAddress,
        tokenAddress: tokenAddress,
        timestamp: new Date().toISOString(),
        lastMintTimestamp: Number(lastMint),
        maxMintableAmount: Number(maxMintable) / 10 ** 18,
      });

      const restricted = (await publicClient.readContract({
        address: tokenAddress,
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        functionName: "transferRestricted",
      })) as boolean;
      setTransferRestricted(restricted);
      
    } catch (error) {
      console.error("Error fetching token details:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch token details");
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, chainId]);

  useEffect(() => {
    if (tokenAddress && chainId) {
      getTokenDetails();
      // Set the token address in the details
      setTokenDetails(prev => ({
        ...prev,
        tokenAddress: tokenAddress
      }));
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
      // Refresh token details to get updated lastMintTimestamp and supply
      getTokenDetails();
      setIsSigning(false);
    }
  }, [mintData, chainId, getTokenDetails]);

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

  // Update the mint function to only show toast after transaction
  const handleMint = async () => {
    try {
      setIsSigning(true);
      await mint({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "mint",
        args: [mintToAddress as `0x${string}`, parseEther(mintAmount)]
      });
    } catch (error) {
      console.error("Error minting tokens:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: chainId!,
        success: false,
        message: "Failed to mint tokens",
      });
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

  const handleGrantMinterRole = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to grant minter role to ${minterAddress}?`
    );
    if (!confirmed) return;

    try {
      setIsSigning(true);
      await grantMinterRole({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "grantMinterRole",
        args: [minterAddress as `0x${string}`]
      });
    } catch (error) {
      console.error("Error granting minter role:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: chainId!,
        success: false,
        message: "Failed to grant minter role",
      });
    } finally {
      setIsSigning(false);
    }
  };

  const handleRevokeMinterRole = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to revoke minter role from ${minterAddress}?`
    );
    if (!confirmed) return;

    try {
      setIsSigning(true);
      await revokeMinterRole({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "revokeMinterRole",
        args: [minterAddress as `0x${string}`]
      });
    } catch (error) {
      console.error("Error revoking minter role:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: chainId!,
        success: false,
        message: "Failed to revoke minter role",
      });
    } finally {
      setIsSigning(false);
    }
  };

  useEffect(() => {
    if (grantMinterRoleData) {
      showTransactionToast({
        hash: grantMinterRoleData,
        chainId: chainId!,
        message: "Minter role granted successfully!",
      });
      setMinterAddress("");
    }
  }, [grantMinterRoleData, chainId]);

  useEffect(() => {
    if (revokeMinterRoleData) {
      showTransactionToast({
        hash: revokeMinterRoleData,
        chainId: chainId!,
        message: "Minter role revoked successfully!",
      });
      setMinterAddress("");
    }
  }, [revokeMinterRoleData, chainId]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    toast.success("Address copied to clipboard!");
  };

  // Add a polling effect to keep max mintable amount up to date
  useEffect(() => {
    if (tokenDetails.currentSupply >= tokenDetails.thresholdSupply) {
      const interval = setInterval(() => {
        getTokenDetails();
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [tokenDetails.currentSupply, tokenDetails.thresholdSupply, getTokenDetails]);

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
      <div className="max-w-7xl mx-auto space-y-8 px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <motion.h1 
            className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-white mb-4 md:mb-0 drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {tokenDetails.tokenSymbol} Token Management
          </motion.h1>
        </div>

        {/* Combined Token Overview and Admin Functions Card */}
        <Card className="group relative rounded-2xl p-8 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
          
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Token Stats */}
              <div className="space-y-6">
                <div className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-green-500 dark:text-[#FFD600]" />
                      <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Max Supply</h3>
                    </div>
                    <p className="text-lg font-bold text-blue-400 dark:text-yellow-200">{tokenDetails.maxSupply} {tokenDetails.tokenSymbol}</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full h-8 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl">
                        Reduce Max Supply
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400 before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-blue-200/30 before:to-transparent dark:before:from-yellow-400/20 dark:before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-blue-400 dark:text-yellow-200">Reduce Max Supply</DialogTitle>
                        <p className="text-sm text-gray-600 dark:text-yellow-200 mt-2">
                          Current max supply: {tokenDetails.maxSupply} {tokenDetails.tokenSymbol}
                        </p>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Input
                            id="newMaxSupply"
                            type="number"
                            placeholder="Enter new max supply"
                            value={newMaxSupply}
                            onChange={(e) => setNewMaxSupply(e.target.value)}
                            className="h-10"
                          />
                          <p className="text-xs text-gray-500 dark:text-yellow-200/70">
                            Must be less than current max supply
                          </p>
                        </div>
                        <Button
                          onClick={handleReduceMaxSupply}
                          disabled={!newMaxSupply || isReducingMaxSupply || isSigning}
                          className="w-full h-10 bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                        >
                          {isReducingMaxSupply || isSigning ? (
                            <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                          ) : (
                            "Update Max Supply"
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-400 dark:text-[#FFD600]" />
                      <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Threshold Supply</h3>
                    </div>
                    <p className="text-lg font-bold text-blue-400 dark:text-yellow-200">{tokenDetails.thresholdSupply} {tokenDetails.tokenSymbol}</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full h-8 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl">
                        Reduce Threshold
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400 before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-blue-200/30 before:to-transparent dark:before:from-yellow-400/20 dark:before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-blue-400 dark:text-yellow-200">Reduce Threshold Supply</DialogTitle>
                        <p className="text-sm text-gray-600 dark:text-yellow-200 mt-2">
                          Current threshold: {tokenDetails.thresholdSupply} {tokenDetails.tokenSymbol}
                        </p>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Input
                            id="newThresholdSupply"
                            type="number"
                            placeholder="Enter new threshold supply"
                            value={newThresholdSupply}
                            onChange={(e) => setNewThresholdSupply(e.target.value)}
                            className="h-10"
                          />
                          <p className="text-xs text-gray-500 dark:text-yellow-200/70">
                            Must be less than current threshold supply
                          </p>
                        </div>
                        <Button
                          onClick={handleReduceThresholdSupply}
                          disabled={!newThresholdSupply || isReducingThresholdSupply || isSigning}
                          className="w-full h-10 bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                        >
                          {isReducingThresholdSupply || isSigning ? (
                            <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                          ) : (
                            "Update Threshold Supply"
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-5 w-5 text-purple-500 dark:text-[#FFD600]" />
                      <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Expansion Rate</h3>
                    </div>
                    <p className="text-lg font-bold text-blue-400 dark:text-yellow-200">{tokenDetails.maxExpansionRate} %</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full h-8 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl">
                        Reduce Rate
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400 before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-blue-200/30 before:to-transparent dark:before:from-yellow-400/20 dark:before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-blue-400 dark:text-yellow-200">Reduce Max Expansion Rate</DialogTitle>
                        <p className="text-sm text-gray-600 dark:text-yellow-200 mt-2">
                          Current rate: {tokenDetails.maxExpansionRate}%
                        </p>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Input
                            id="newMaxExpansionRate"
                            type="number"
                            placeholder="Enter new max expansion rate"
                            value={newMaxExpansionRate}
                            onChange={(e) => setNewMaxExpansionRate(e.target.value)}
                            className="h-10"
                          />
                          <p className="text-xs text-gray-500 dark:text-yellow-200/70">
                            Must be less than current expansion rate
                          </p>
                        </div>
                        <Button
                          onClick={handleReduceMaxExpansionRate}
                          disabled={!newMaxExpansionRate || isReducingMaxExpansionRate || isSigning}
                          className="w-full h-10 bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                        >
                          {isReducingMaxExpansionRate || isSigning ? (
                            <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                          ) : (
                            "Update Max Expansion Rate"
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-5 w-5 text-gray-500 dark:text-[#FFD600]" />
                    <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Transferability</h3>
                  </div>
                  <div className="space-y-2">
                    {transferRestricted ? (
                      <>
                        <p className="text-sm text-gray-600 dark:text-yellow-200">
                          Only transfers to address that already hold {tokenDetails.tokenSymbol} are currently enabled.
                        </p>
                        <Button
                          onClick={handleDisableTransferRestriction}
                          disabled={isDisablingTransferRestriction || isSigning}
                          className="w-full h-10 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                        >
                          {isDisablingTransferRestriction || isSigning ? (
                            <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Unlock className="h-4 w-4" />
                              Enable Transfers to Any Address
                            </div>
                          )}
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-yellow-200">
                        Transfers to any address are already enabled
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Minting and Transfer Restriction */}
              <div className="space-y-6">
                <div className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
                  <div className="flex items-center gap-2 mb-4">
                    <Coins className="h-5 w-5 text-green-500 dark:text-[#FFD600]" />
                    <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Mint Tokens</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-600 dark:text-yellow-200">Max Mintable Amount: <span className="font-bold">{tokenDetails.maxMintableAmount} {tokenDetails.tokenSymbol}</span></p>
                      <p className="text-sm text-gray-600 dark:text-yellow-200">Current Supply: <span className="font-bold">{tokenDetails.currentSupply} {tokenDetails.tokenSymbol}</span></p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mintAmount" className="text-sm font-bold text-gray-600 dark:text-yellow-200">Amount to Mint</Label>
                      <Input
                        id="mintAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={mintAmount}
                        onChange={(e) => setMintAmount(e.target.value)}
                        className="h-10 text-sm bg-white/60 dark:bg-[#2a1a00] border-2 border-gray-200 dark:border-yellow-400/20 text-gray-600 dark:text-yellow-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mintTo" className="text-sm font-bold text-gray-600 dark:text-yellow-200">Mint To Address</Label>
                      <Input
                        id="mintTo"
                        type="text"
                        placeholder="Enter recipient address"
                        value={mintToAddress}
                        onChange={(e) => setMintToAddress(e.target.value)}
                        className="h-10 text-sm bg-white/60 dark:bg-[#2a1a00] border-2 border-gray-200 dark:border-yellow-400/20 text-gray-600 dark:text-yellow-200"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button
                      onClick={handleMint}
                      disabled={!mintAmount || !mintToAddress || isMinting || isSigning}
                      className="w-full h-10 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                    >
                      {isMinting || isSigning ? (
                        <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                      ) : (
                        "Mint Tokens"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-5 w-5 text-gray-500 dark:text-[#FFD600]" />
                    <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Minter Role Management</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="minterAddress" className="text-sm font-bold text-gray-600 dark:text-yellow-200">Minter Address</Label>
                      <Input
                        id="minterAddress"
                        type="text"
                        placeholder="Enter minter address"
                        value={minterAddress}
                        onChange={(e) => setMinterAddress(e.target.value)}
                        className="h-10 text-sm bg-white/60 dark:bg-[#2a1a00] border-2 border-gray-200 dark:border-yellow-400/20 text-gray-600 dark:text-yellow-200"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleGrantMinterRole}
                        disabled={!minterAddress || isGrantingMinterRole || isSigning}
                        className="flex-1 h-10 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                      >
                        Grant Minter Role
                      </Button>
                      <Button
                        onClick={handleRevokeMinterRole}
                        disabled={!minterAddress || isRevokingMinterRole || isSigning}
                        className="flex-1 h-10 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                      >
                        Revoke Minter Role
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Address at the bottom */}
            <div className="mt-8 flex items-center justify-center gap-2">
              <a
                href={catExplorer(tokenAddress as `0x${string}`, chainId!)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-mono text-gray-600 dark:text-yellow-100 hover:text-blue-500 dark:hover:text-yellow-400 transition-colors"
              >
                {tokenAddress}
              </a>
              <Button
                onClick={handleCopyAddress}
                variant="default"
                size="icon"
                className="h-8 w-8"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
