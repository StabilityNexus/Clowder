"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Info, Coins, Settings, Unlock, Copy, ArrowUp, Target, AlertTriangle } from "lucide-react";
import { Card,  CardContent } from "@/components/ui/card";
import { getPublicClient } from "@wagmi/core";
import { config } from "@/utils/config";
import { useSearchParams } from "next/navigation";
import { CONTRIBUTION_ACCOUNTING_TOKEN_ABI } from "@/contractsABI/ContributionAccountingTokenABI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { showTransactionToast } from "@/components/ui/transaction-toast";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingState } from "@/components/ui/loading-state";
import { ButtonLoadingState } from "@/components/ui/button-loading-state";
import toast from "react-hot-toast";
import { catExplorer } from "@/utils/catExplorer";

// Define supported chain IDs
type SupportedChainId = 137 | 534351 | 5115 | 61 | 8453;

// Chain names mapping
const CHAIN_NAMES: Record<SupportedChainId, string> = {
  137: "Polygon",
  534351: "Scroll Sepolia",
  5115: "Citrea Testnet",
  61: "Ethereum Classic",
  8453: "Base"
};



interface TokenDetailsState {
  tokenName: string;
  tokenSymbol: string;
  maxSupply: number;
  thresholdSupply: number;
  maxExpansionRate: number;
  currentSupply: number;
  lastMintTimestamp: number;
  maxMintableAmount: number;
}

export default function InteractionClient() {
  const searchParams = useSearchParams();
  const { isConnected, address } = useAccount();
  const currentChainId = useChainId();

  // Helper function to format numbers with limited decimals and full precision on hover
  const formatNumber = (num: number, decimals: number = 4): string => {
    if (num === 0) return "0";
    if (num < 0.0001) return num.toExponential(2);
    return num.toFixed(decimals);
  };
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mintAmount, setMintAmount] = useState("");
  const [newMaxSupply, setNewMaxSupply] = useState("");
  const [newThresholdSupply, setNewThresholdSupply] = useState("");
  const [newMaxExpansionRate, setNewMaxExpansionRate] = useState("");
  const [transferRestricted, setTransferRestricted] = useState<boolean>(true);
  const [mintToAddress, setMintToAddress] = useState<string>("");
  const [decimals, setDecimals] = useState<number>(18);

  const [tokenAddress, setTokenAddress] = useState<`0x${string}`>("0x0");
  const [chainId, setChainId] = useState<SupportedChainId | null>(null);

  // Helper function to add delays between requests
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper function to make contract calls with retry logic
  const makeContractCallWithRetry = useCallback(async (
    publicClient: ReturnType<typeof getPublicClient>,
    contractCall: Parameters<NonNullable<ReturnType<typeof getPublicClient>>['readContract']>[0],
    maxRetries: number = 3
  ): Promise<unknown> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await publicClient!.readContract(contractCall);
      } catch (error: unknown) {
        const errorObj = error as { message?: string; status?: number; code?: number };
        const isRateLimit = errorObj?.message?.includes('rate limit') || 
                           errorObj?.status === 429 ||
                           errorObj?.code === -32016;
        
        if (attempt === maxRetries - 1) {
          throw error; // Final attempt failed
        }
        
        if (isRateLimit) {
          const delayMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          console.log(`Rate limit hit, retrying in ${delayMs}ms... (attempt ${attempt + 1})`);
          await delay(delayMs);
        } else {
          throw error; // Non-rate-limit error
        }
      }
    }
  }, []);

  // Function to calculate user amount after fees
  const calculateUserAmountAfterFees = useCallback(async (amount: string) => {
    if (!amount || !tokenAddress || !chainId || isNaN(Number(amount)) || Number(amount) <= 0) {
      setUserAmountAfterFees(0);
      return;
    }

    try {
      const publicClient = getPublicClient(config, { chainId });
      if (!publicClient) return;

      const userAmount = await makeContractCallWithRetry(publicClient, {
        address: tokenAddress,
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        functionName: "userAmountAfterFees",
        args: [parseUnits(amount, decimals)],
      });

      setUserAmountAfterFees(Number(formatUnits(userAmount as bigint, decimals)));
    } catch (error) {
      console.error("Error calculating user amount after fees:", error);
      // Fallback calculation
      setUserAmountAfterFees(Number(amount) * 0.995);
    }
  }, [tokenAddress, chainId, decimals, makeContractCallWithRetry]);

  const [tokenDetails, setTokenDetails] = useState<TokenDetailsState>({
    tokenName: "",
    tokenSymbol: "",
    maxSupply: 0,
    thresholdSupply: 0,
    maxExpansionRate: 0,
    currentSupply: 0,
    lastMintTimestamp: 0,
    maxMintableAmount: 0,
  });

  // Add new state for transaction signing
  const [isSigning, setIsSigning] = useState(false);

  const [minterAddress, setMinterAddress] = useState<string>("");
  const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false);
  const [isUserMinter, setIsUserMinter] = useState<boolean>(false);
  const [userAmountAfterFees, setUserAmountAfterFees] = useState<number>(0);
  const { writeContract: grantMinterRole, data: grantMinterRoleData } = useWriteContract();
  const { writeContract: revokeMinterRole, data: revokeMinterRoleData } = useWriteContract();

  const { isLoading: isGrantingMinterRole } = useWaitForTransactionReceipt({
    hash: grantMinterRoleData,
  });

  const { isLoading: isRevokingMinterRole } = useWaitForTransactionReceipt({
    hash: revokeMinterRoleData,
  });

  // Add dialog open states
  const [activeModal, setActiveModal] = useState<'maxSupply' | 'threshold' | 'expansionRate' | null>(null);

  // Check if user is on wrong chain
  const isWrongChain = isConnected && chainId && currentChainId ? currentChainId !== chainId : false;

  // Type guard for chain ID validation
  const isValidChainId = useCallback((chainId: number): chainId is SupportedChainId => {
    const validChainIds: SupportedChainId[] = [ 137, 534351, 5115, 61, 8453];
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
    if (!tokenAddress || !chainId || !address) {
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

      // Batch 1: Basic token info (with delays between calls)
      const name = await makeContractCallWithRetry(publicClient, {
        address: tokenAddress,
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        functionName: "name",
      });
      await delay(200);

      const symbol = await makeContractCallWithRetry(publicClient, {
        address: tokenAddress,
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        functionName: "symbol",
      });
      await delay(200);

      // Fetch decimals
      const tokenDecimals = await makeContractCallWithRetry(publicClient, {
        address: tokenAddress,
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        functionName: "decimals",
      });
      await delay(200);

      if (!name || !symbol) {
        throw new Error("Invalid token contract");
      }

      // Set decimals state
      const decimalsValue = Number(tokenDecimals as bigint);
      setDecimals(decimalsValue);

      // Batch 2: Token parameters (small batches with delays)
      const [maxSupply, threshold] = await Promise.all([
        makeContractCallWithRetry(publicClient, {
          address: tokenAddress,
          abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
          functionName: "maxSupply",
        }),
        makeContractCallWithRetry(publicClient, {
          address: tokenAddress,
          abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
          functionName: "thresholdSupply",
        }),
      ]);
      await delay(300);

      const [expansionRate, currentSupply] = await Promise.all([
        makeContractCallWithRetry(publicClient, {
          address: tokenAddress,
          abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
          functionName: "maxExpansionRate",
        }),
        makeContractCallWithRetry(publicClient, {
          address: tokenAddress,
          abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
          functionName: "totalSupply",
        }),
      ]);
      await delay(300);

      const [lastMint, maxMintable] = await Promise.all([
        makeContractCallWithRetry(publicClient, {
          address: tokenAddress,
          abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
          functionName: "lastMintTimestamp",
        }),
        makeContractCallWithRetry(publicClient, {
          address: tokenAddress,
          abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
          functionName: "maxMintableAmount",
        }),
      ]);
      await delay(300);

      setTokenDetails({
        tokenName: name as string,
        tokenSymbol: symbol as string,
        maxSupply: Number(formatUnits(maxSupply as bigint, decimalsValue)),
        thresholdSupply: Number(formatUnits(threshold as bigint, decimalsValue)),
        maxExpansionRate: Number(expansionRate as bigint) / 100,
        currentSupply: Number(formatUnits(currentSupply as bigint, decimalsValue)),
        lastMintTimestamp: Number(lastMint as bigint),
        maxMintableAmount: Number(formatUnits(maxMintable as bigint, decimalsValue)),
      });

      // Batch 3: Transfer restrictions
      const restricted = await makeContractCallWithRetry(publicClient, {
        address: tokenAddress,
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        functionName: "transferRestricted",
      });
      setTransferRestricted(restricted as boolean);
      await delay(300);

      // Batch 4: User roles (if address is available)
      if (address) {
        const adminRole = await makeContractCallWithRetry(publicClient, {
          address: tokenAddress,
          abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
          functionName: "DEFAULT_ADMIN_ROLE",
        });
        await delay(300);

        const hasAdminRole = await makeContractCallWithRetry(publicClient, {
          address: tokenAddress,
          abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
          functionName: "hasRole",
          args: [adminRole as `0x${string}`, address as `0x${string}`],
        });
        setIsUserAdmin(hasAdminRole as boolean);
        await delay(300);

        const minterRole = await makeContractCallWithRetry(publicClient, {
          address: tokenAddress,
          abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
          functionName: "MINTER_ROLE",
        });
        await delay(300);

        const hasMinterRole = await makeContractCallWithRetry(publicClient, {
          address: tokenAddress,
          abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
          functionName: "hasRole",
          args: [minterRole as `0x${string}`, address as `0x${string}`],
        });
        setIsUserMinter(hasMinterRole as boolean);
      }
      
    } catch (error) {
      console.error("Error fetching token details:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch token details");
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, chainId, address, makeContractCallWithRetry]);

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
      // Refresh token details
      getTokenDetails();
      setIsSigning(false);
    }
  }, [reduceMaxSupplyData, chainId, getTokenDetails]);

  useEffect(() => {
    if (reduceThresholdSupplyData) {
      showTransactionToast({
        hash: reduceThresholdSupplyData,
        chainId: chainId!,
        message: "Threshold supply updated successfully!",
      });
      // Refresh token details
      getTokenDetails();
      setIsSigning(false);
    }
  }, [reduceThresholdSupplyData, chainId, getTokenDetails]);

  useEffect(() => {
    if (reduceMaxExpansionRateData) {
      showTransactionToast({
        hash: reduceMaxExpansionRateData,
        chainId: chainId!,
        message: "Max expansion rate updated successfully!",
      });
      // Refresh token details
      getTokenDetails();
      setIsSigning(false);
    }
  }, [reduceMaxExpansionRateData, chainId, getTokenDetails]);

  useEffect(() => {
    if (disableTransferRestrictionData) {
      showTransactionToast({
        hash: disableTransferRestrictionData,
        chainId: chainId!,
        message: "Transfer restriction disabled successfully!",
      });
      // Refresh token details
      getTokenDetails();
      setIsSigning(false);
    }
  }, [disableTransferRestrictionData, chainId, getTokenDetails]);

  useEffect(() => {
    if (grantMinterRoleData) {
      showTransactionToast({
        hash: grantMinterRoleData,
        chainId: chainId!,
        message: "Minter role granted successfully!",
      });
      setMinterAddress("");
      setIsSigning(false);
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
      setIsSigning(false);
    }
  }, [revokeMinterRoleData, chainId]);

  // Calculate user amount after fees when mint amount changes
  useEffect(() => {
    calculateUserAmountAfterFees(mintAmount);
  }, [mintAmount, calculateUserAmountAfterFees]);

  const handleMint = async () => {
    try {
      setIsSigning(true);
      await mint({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "mint",
        args: [mintToAddress as `0x${string}`, parseUnits(mintAmount, decimals)]
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

  const handleReduceMaxSupply = async () => {
    try {
      setIsSigning(true);
      await reduceMaxSupply({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "reduceMaxSupply",
        args: [parseUnits(newMaxSupply, decimals)]
      });
    } catch (error) {
      console.error("Error reducing max supply:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: chainId!,
        success: false,
        message: "Failed to update max supply",
      });
      setIsSigning(false);
    }
  };

  const handleReduceThresholdSupply = async () => {
    try {
      setIsSigning(true);
      await reduceThresholdSupply({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "reduceThresholdSupply",
        args: [parseUnits(newThresholdSupply, decimals)]
      });
    } catch (error) {
      console.error("Error reducing threshold supply:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: chainId!,
        success: false,
        message: "Failed to update threshold supply",
      });
      setIsSigning(false);
    }
  };

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
      setIsSigning(false);
    }
  };

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
      setIsSigning(false);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    toast.success("Address copied to clipboard!");
  };

  // Update modal state handlers
  const openMaxSupplyModal = () => setActiveModal('maxSupply');
  const openThresholdModal = () => setActiveModal('threshold');
  const openExpansionRateModal = () => setActiveModal('expansionRate');
  const closeModal = () => setActiveModal(null);

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
      {/* Combined Modal - moved outside main content for full screen coverage */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-[201] w-full max-w-[425px] mx-4 bg-white/90 dark:bg-[#1a1400]/95 border-2 border-blue-200 dark:border-yellow-400/30 backdrop-blur-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-visible"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-blue-400 dark:text-yellow-200">
                      {activeModal === 'maxSupply' && 'Reduce Max Supply'}
                      {activeModal === 'threshold' && 'Reduce Threshold Supply'}
                      {activeModal === 'expansionRate' && 'Reduce Max Expansion Rate'}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-yellow-200 mt-2">
                      {activeModal === 'maxSupply' && `Current max supply: ${tokenDetails.maxSupply} ${tokenDetails.tokenSymbol}`}
                      {activeModal === 'threshold' && `Current threshold: ${tokenDetails.thresholdSupply} ${tokenDetails.tokenSymbol}`}
                      {activeModal === 'expansionRate' && `Current rate: ${tokenDetails.maxExpansionRate}%`}
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4 py-4 relative z-[202]">
                  <div className="space-y-2">
                    {activeModal === 'maxSupply' && (
                      <>
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
                        <Button
                          onClick={() => {
                            handleReduceMaxSupply();
                            closeModal();
                          }}
                          disabled={!newMaxSupply || isReducingMaxSupply || isSigning}
                          className="w-full h-10 bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                        >
                          {isReducingMaxSupply || isSigning ? (
                            <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                          ) : (
                            "Update Max Supply"
                          )}
                        </Button>
                      </>
                    )}
                    {activeModal === 'threshold' && (
                      <>
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
                        <Button
                          onClick={() => {
                            handleReduceThresholdSupply();
                            closeModal();
                          }}
                          disabled={!newThresholdSupply || isReducingThresholdSupply || isSigning}
                          className="w-full h-10 bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                        >
                          {isReducingThresholdSupply || isSigning ? (
                            <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                          ) : (
                            "Update Threshold Supply"
                          )}
                        </Button>
                      </>
                    )}
                    {activeModal === 'expansionRate' && (
                      <>
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
                        <Button
                          onClick={() => {
                            handleReduceMaxExpansionRate();
                            closeModal();
                          }}
                          disabled={!newMaxExpansionRate || isReducingMaxExpansionRate || isSigning}
                          className="w-full h-10 bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
                        >
                          {isReducingMaxExpansionRate || isSigning ? (
                            <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                          ) : (
                            "Update Max Expansion Rate"
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

        {/* Chain Warning Banner */}
        {isWrongChain && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <Card className="border-2 border-red-500/50 bg-gradient-to-r from-red-50/90 to-red-100/90 dark:from-red-900/30 dark:to-red-800/30 backdrop-blur-sm shadow-lg hover:shadow-red-500/10 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400 flex-shrink-0 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-500 dark:from-red-400 dark:to-red-300">
                        Wrong Network Detected
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded-full">
                        Action Required
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-red-600 dark:text-red-300">
                        This token is deployed on <span className="font-semibold">{CHAIN_NAMES[chainId!]}</span> (Chain ID: {chainId})
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        You are currently connected to Chain ID: <span className="font-semibold">{currentChainId}</span>
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-300 mt-2">
                        Please switch to the correct network to interact with this token.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Combined Token Overview and Admin Functions Card */}
        <Card className={`group relative rounded-2xl p-8 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400 ${isWrongChain ? 'opacity-60 pointer-events-none' : ''}`}>
          
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
                  <Button 
                    onClick={openMaxSupplyModal}
                    disabled={isWrongChain || !isUserAdmin}
                    className="w-full h-8 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!isUserAdmin ? "Admin Only" : "Reduce Max Supply"}
                  </Button>
                </div>

                <div className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-400 dark:text-[#FFD600]" />
                      <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Threshold Supply</h3>
                    </div>
                    <p className="text-lg font-bold text-blue-400 dark:text-yellow-200">{tokenDetails.thresholdSupply} {tokenDetails.tokenSymbol}</p>
                  </div>
                  <Button 
                    onClick={openThresholdModal}
                    disabled={isWrongChain || !isUserAdmin}
                    className="w-full h-8 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!isUserAdmin ? "Admin Only" : "Reduce Threshold"}
                  </Button>
                </div>

                <div className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-5 w-5 text-purple-500 dark:text-[#FFD600]" />
                      <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Expansion Rate</h3>
                    </div>
                    <p className="text-lg font-bold text-blue-400 dark:text-yellow-200">{tokenDetails.maxExpansionRate} %</p>
                  </div>
                  <Button 
                    onClick={openExpansionRateModal}
                    disabled={isWrongChain || !isUserAdmin}
                    className="w-full h-8 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!isUserAdmin ? "Admin Only" : "Reduce Rate"}
                  </Button>
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
                          disabled={isDisablingTransferRestriction || isSigning || isWrongChain || !isUserAdmin}
                          className="w-full h-10 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {!isUserAdmin ? (
                            "Admin Only"
                          ) : isDisablingTransferRestriction || isSigning ? (
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
                      <>
                        <p className="text-sm text-gray-600 dark:text-yellow-200">
                          Transfers to any address are already enabled
                        </p>
                      </>
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
                  
                  {!isUserMinter && !isUserAdmin && (
                    <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200 dark:border-yellow-400/20">
                      <p className="text-sm text-yellow-700 dark:text-yellow-200 font-medium">
                        ⚠️ Either you don&apos;t have minter role or it has been revoked
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 dark:text-yellow-200">
                          Max Mintable Amount: 
                          <span 
                            className="font-bold cursor-help" 
                            title={`${tokenDetails.maxMintableAmount} ${tokenDetails.tokenSymbol}`}
                          >
                            {formatNumber(tokenDetails.maxMintableAmount)} {tokenDetails.tokenSymbol}
                          </span>
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-yellow-200">
                        Current Supply: 
                        <span 
                          className="font-bold cursor-help" 
                          title={`${tokenDetails.currentSupply} ${tokenDetails.tokenSymbol}`}
                        >
                          {formatNumber(tokenDetails.currentSupply)} {tokenDetails.tokenSymbol}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mintAmount" className="text-sm font-bold text-gray-600 dark:text-yellow-200">Amount to Mint</Label>
                      <div className="flex gap-2">
                        <Input
                          id="mintAmount"
                          type="number"
                          placeholder="Enter amount"
                          value={mintAmount}
                          onChange={(e) => setMintAmount(e.target.value)}
                          className="h-10 text-sm bg-white/60 dark:bg-[#2a1a00] border-2 border-gray-200 dark:border-yellow-400/20 text-gray-600 dark:text-yellow-200"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            // Set max mintable amount (fees will be deducted from this amount)
                            const safeMaxAmount = Math.max(0, tokenDetails.maxMintableAmount - 0.000001);
                            setMintAmount(safeMaxAmount.toFixed(6));
                          }}
                          disabled={tokenDetails.maxMintableAmount === 0}
                          className="h-10 px-3 text-sm bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-xl whitespace-nowrap"
                        >
                          Max
                        </Button>
                      </div>
                      {mintAmount && !isNaN(Number(mintAmount)) && Number(mintAmount) > 0 && (
                        <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-yellow-400/10 border border-blue-200 dark:border-yellow-400/20">
                          <p className="text-xs text-blue-600 dark:text-yellow-200">
                            You will receive: 
                            <span 
                              className="font-bold cursor-help" 
                              title={`${userAmountAfterFees} ${tokenDetails.tokenSymbol}`}
                            >
                              {formatNumber(userAmountAfterFees)} {tokenDetails.tokenSymbol}
                            </span>
                            <br />
                            Clowder fee: 
                            <span 
                              className="font-bold cursor-help" 
                              title={`${Number(mintAmount) - userAmountAfterFees} ${tokenDetails.tokenSymbol}`}
                            >
                              {formatNumber(Number(mintAmount) - userAmountAfterFees)} {tokenDetails.tokenSymbol}
                            </span>
                          </p>
                        </div>
                      )}
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
                      disabled={!mintAmount || !mintToAddress || isMinting || isSigning || (!isUserMinter && !isUserAdmin)}
                      className="w-full h-10 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {!isUserMinter && !isUserAdmin ? (
                        "Minter Role Required"
                      ) : isMinting || isSigning ? (
                        <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Processing..."} />
                      ) : (
                        "Mint Tokens"
                      )}
                    </Button>
                  </div>
                </div>

                <div className={`group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)] dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)] hover:border-blue-400 dark:hover:border-yellow-400 ${!isUserAdmin ? 'opacity-75' : ''}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-5 w-5 text-gray-500 dark:text-[#FFD600]" />
                    <h3 className="text-lg font-semibold text-blue-400 dark:text-yellow-200">Minter Role Management</h3>
                  </div>
                  
                  {!isUserAdmin && (
                    <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200 dark:border-yellow-400/20">
                      <p className="text-sm text-yellow-700 dark:text-yellow-200 font-medium">
                        ⚠️ Only administrators can grant or revoke minter roles
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="minterAddress" className="text-sm font-bold text-gray-600 dark:text-yellow-200">Minter Address</Label>
                      <Input
                        id="minterAddress"
                        type="text"
                        placeholder="Enter minter address"
                        value={minterAddress}
                        onChange={(e) => setMinterAddress(e.target.value)}
                        disabled={!isUserAdmin}
                        className="h-10 text-sm bg-white/60 dark:bg-[#2a1a00] border-2 border-gray-200 dark:border-yellow-400/20 text-gray-600 dark:text-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleGrantMinterRole}
                        disabled={!isUserAdmin || !minterAddress || isGrantingMinterRole || isSigning}
                        className="flex-1 h-10 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {!isUserAdmin ? "Admin Only" : "Grant Minter Role"}
                      </Button>
                      <Button
                        onClick={handleRevokeMinterRole}
                        disabled={!isUserAdmin || !minterAddress || isRevokingMinterRole || isSigning}
                        className="flex-1 h-10 text-sm bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {!isUserAdmin ? "Admin Only" : "Revoke Minter Role"}
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
