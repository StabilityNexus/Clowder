"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Info, Coins, Settings, Unlock, Copy, ArrowUp, Target, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { Card,  CardContent } from "@/components/ui/card";
import { getPublicClient } from "@wagmi/core";
import { config } from "@/utils/config";
import { useSearchParams } from "next/navigation";
import { CONTRIBUTION_ACCOUNTING_TOKEN_ABI } from "@/contractsABI/ContributionAccountingTokenABI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { showTransactionToast } from "@/components/ui/transaction-toast";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingState } from "@/components/ui/loading-state";
import { ButtonLoadingState } from "@/components/ui/button-loading-state";
import toast from "react-hot-toast";
import { catExplorer } from "@/utils/catExplorer";
import { useCATStorage } from "@/hooks/useCATStorage";
import { SupportedChainId } from "@/utils/indexedDB";

// Define supported chain IDs - use imported type from IndexedDB
// type SupportedChainId = 137 | 534351 | 5115 | 61 | 8453;

// Chain names mapping
const CHAIN_NAMES: Record<SupportedChainId, string> = {
  // 137: "Polygon",
  // 534351: "Scroll Sepolia",
  5115: "Citrea Testnet",
  // 61: "Ethereum Classic",
  // 8453: "Base"
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
  const { switchChain } = useSwitchChain();

  const decimals = 18;

  // IndexedDB storage hook
  const {
    saveTokenDetails,
    getTokenDetails: getStoredTokenDetails,
    saveUserRole,
    getUserRole,
    saveCache,
    getCache,
    isInitialized,
    error: storageError
  } = useCATStorage();

  // Helper function to format numbers with limited decimals and full precision on hover
  const formatNumber = (num: number, decimals: number = 4): string => {
    if (num === 0) return "0";
    if (num < 0.0001) return num.toExponential(2);
    
    // Format with specified decimals
    const formatted = num.toFixed(decimals);
    
    // Remove trailing zeros after decimal point
    if (formatted.includes('.')) {
      return formatted.replace(/\.?0+$/, '');
    }
    
    return formatted;
  };
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mintAmount, setMintAmount] = useState("");
  const [newMaxSupply, setNewMaxSupply] = useState("");
  const [newThresholdSupply, setNewThresholdSupply] = useState("");
  const [newMaxExpansionRate, setNewMaxExpansionRate] = useState("");
  const [transferRestricted, setTransferRestricted] = useState<boolean>(true);
  const [mintToAddress, setMintToAddress] = useState<string>("");
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Add new state for minting mode toggle
  // 'mint' mode: user enters amount to mint, shows amount they'll receive
  // 'receive' mode: user enters amount to receive, shows amount that will be minted
  const [mintingMode, setMintingMode] = useState<'mint' | 'receive'>('mint');
  const [receiveAmount, setReceiveAmount] = useState("");
  const [calculatedMintAmount, setCalculatedMintAmount] = useState<number>(0);
  const [isCalculatingMintAmount, setIsCalculatingMintAmount] = useState<boolean>(false);

  const [tokenAddress, setTokenAddress] = useState<`0x${string}`>("0x0");
  const [chainId, setChainId] = useState<SupportedChainId | null>(null);

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
  // Simple math: if fee is 0.5%, then userAmount = mintAmount * 0.995
  const calculateUserAmountAfterFees = useCallback((amount: string) => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setUserAmountAfterFees(0);
      return;
    }

    const mintAmount = Number(amount);
    
    // Simple calculation: userAmount = mintAmount * (1 - 0.005)
    const userAmount = mintAmount * 0.995;
    
    // Round to 6 decimal places for better UX
    const roundedUserAmount = Math.round(userAmount * 1000000) / 1000000;
    
    setUserAmountAfterFees(roundedUserAmount);
  }, []);

  // Function to calculate mint amount needed to achieve desired receive amount
  // Simple math: if fee is 0.5%, then receiveAmount = mintAmount * 0.995
  // Therefore: mintAmount = receiveAmount / 0.995
  const calculateMintAmountFromReceive = useCallback((desiredReceiveAmount: string) => {
    if (!desiredReceiveAmount || isNaN(Number(desiredReceiveAmount)) || Number(desiredReceiveAmount) <= 0) {
      setCalculatedMintAmount(0);
      return;
    }

    const receiveAmount = Number(desiredReceiveAmount);
    
    // Simple calculation: mintAmount = receiveAmount / (1 - 0.005)
    const mintAmount = receiveAmount / 0.995;
    
    // Round to 6 decimal places for better UX
    const roundedMintAmount = Math.round(mintAmount * 1000000) / 1000000;
    
    setCalculatedMintAmount(roundedMintAmount);
  }, []);

  // Add new state for transaction signing
  const [isSigning, setIsSigning] = useState(false);

  const [minterAddress, setMinterAddress] = useState<string>("");
  const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false);
  const [isUserMinter, setIsUserMinter] = useState<boolean>(false);
  const [userAmountAfterFees, setUserAmountAfterFees] = useState<number>(0);
  const [isCalculatingFees, setIsCalculatingFees] = useState<boolean>(false);
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

  // Monitor online/offline status
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

  // Type guard for chain ID validation
  const isValidChainId = useCallback((chainId: number): chainId is SupportedChainId => {
    // const validChainIds: SupportedChainId[] = [ 137, 534351, 5115, 61, 8453];
    const validChainIds: SupportedChainId[] = [ 5115];
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

  // Fetch token details from blockchain
  const fetchTokenDetailsFromBlockchain = useCallback(async (): Promise<boolean> => {
    if (!tokenAddress || !chainId || !address) return false;

    try {
      setIsSyncing(true);
      console.log('Fetching token details from blockchain...', { tokenAddress, chainId });
      
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

      // Batch 3: Transfer restrictions
      const restricted = await makeContractCallWithRetry(publicClient, {
        address: tokenAddress,
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        functionName: "transferRestricted",
      });
      await delay(300);

      // Batch 4: User roles
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

      // Update state with fresh data
      const newTokenDetails = {
        tokenName: name as string,
        tokenSymbol: symbol as string,
        maxSupply: Number(formatUnits(maxSupply as bigint, decimals)),
        thresholdSupply: Number(formatUnits(threshold as bigint, decimals)),
        maxExpansionRate: Number(expansionRate as bigint) / 100,
        currentSupply: Number(formatUnits(currentSupply as bigint, decimals)),
        lastMintTimestamp: Number(lastMint as bigint),
        maxMintableAmount: Number(formatUnits(maxMintable as bigint, decimals)),
      };

      setTokenDetails(newTokenDetails);
      setTransferRestricted(restricted as boolean);
      setIsUserAdmin(hasAdminRole as boolean);
      setIsUserMinter(hasMinterRole as boolean);

      // Save to IndexedDB
      try {
        console.log('Saving token details to IndexedDB...', newTokenDetails.tokenName);
        
        await saveTokenDetails({
          chainId,
          address: tokenAddress,
          tokenName: newTokenDetails.tokenName,
          tokenSymbol: newTokenDetails.tokenSymbol,
          maxSupply: newTokenDetails.maxSupply,
          thresholdSupply: newTokenDetails.thresholdSupply,
          maxExpansionRate: newTokenDetails.maxExpansionRate,
          currentSupply: newTokenDetails.currentSupply,
          lastMintTimestamp: newTokenDetails.lastMintTimestamp,
          maxMintableAmount: newTokenDetails.maxMintableAmount,
          transferRestricted: restricted as boolean,
          userAddress: address
        });

        await saveUserRole({
          chainId,
          tokenAddress,
          userAddress: address,
          isAdmin: hasAdminRole as boolean,
          isMinter: hasMinterRole as boolean
        });

        // Update cache timestamp
        await saveCache('tokenDetails_lastSync', Date.now(), 30); // 30 minutes TTL
        setLastSyncTime(new Date());
        
        console.log('Successfully saved token details to IndexedDB');
      } catch (storageError) {
        console.error('Error saving to IndexedDB:', storageError);
        // Don't fail the entire operation if storage fails
        toast.error('Failed to cache data locally, but blockchain sync succeeded');
      }

      return true;
    } catch (error) {
      console.error("Error fetching token details from blockchain:", error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [tokenAddress, chainId, address, makeContractCallWithRetry, saveTokenDetails, saveUserRole, saveCache]);

  // Load token details from storage (offline-first approach)
  const loadTokenDetailsFromStorage = useCallback(async (): Promise<boolean> => {
    if (!isInitialized || !address || !tokenAddress || !chainId) return false;

    try {
      const [storedTokenDetails, storedUserRole] = await Promise.all([
        getStoredTokenDetails(chainId, tokenAddress),
        getUserRole(chainId, tokenAddress)
      ]);

      if (storedTokenDetails) {
        // Load from storage immediately
        setTokenDetails({
          tokenName: storedTokenDetails.tokenName,
          tokenSymbol: storedTokenDetails.tokenSymbol,
          maxSupply: storedTokenDetails.maxSupply,
          thresholdSupply: storedTokenDetails.thresholdSupply,
          maxExpansionRate: storedTokenDetails.maxExpansionRate,
          currentSupply: storedTokenDetails.currentSupply,
          lastMintTimestamp: storedTokenDetails.lastMintTimestamp,
          maxMintableAmount: storedTokenDetails.maxMintableAmount,
        });

        setTransferRestricted(storedTokenDetails.transferRestricted);
        
        if (storedUserRole) {
          setIsUserAdmin(storedUserRole.isAdmin);
          setIsUserMinter(storedUserRole.isMinter);
        }

        console.log('Loaded token details from storage:', storedTokenDetails.tokenName);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error loading token details from storage:', error);
      return false;
    }
  }, [isInitialized, address, tokenAddress, chainId, getStoredTokenDetails, getUserRole]);

  // Main initialization function with offline-first approach  
  const initializeTokenDetails = useCallback(async () => {
    if (!tokenAddress || !chainId || !address) {
      setError("Invalid token address, chain ID, or user not connected");
      setIsLoading(false);
      return;
    }

    if (!isInitialized) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(storageError);

      // First, try to load from IndexedDB (offline-first)
      const hasStoredData = await loadTokenDetailsFromStorage();
      
      if (hasStoredData) {
        // Show data immediately from storage
        setIsLoading(false);
        
        // Then sync with blockchain in background if online
        if (isOnline) {
          const lastSync = await getCache('tokenDetails_lastSync');
          const shouldSync = !lastSync || Date.now() - (lastSync as number) > 5 * 60 * 1000; // 5 minutes

          if (shouldSync) {
            console.log('Starting background sync...');
            // Background sync
            fetchTokenDetailsFromBlockchain().catch(error => {
              console.error('Background sync failed:', error);
              // Don't show error for background sync failures
            });
          } else {
            console.log('Recent sync found, skipping blockchain fetch');
          }
        }
      } else {
        // No stored data, must fetch from blockchain
        if (isOnline) {
          console.log('No cached data, fetching from blockchain...');
          await fetchTokenDetailsFromBlockchain();
        } else {
          setError("No cached data available. Please connect to the internet to load token details.");
        }
      }
    } catch (error) {
      console.error("Error initializing token details:", error);
      setError(error instanceof Error ? error.message : "Failed to load token details");
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, chainId, address, isInitialized, storageError, loadTokenDetailsFromStorage, isOnline, getCache, fetchTokenDetailsFromBlockchain]);

  // Manual sync function for force refresh
  const handleManualSync = useCallback(async () => {
    if (!tokenAddress || !chainId || !address || !isOnline) return;
    
    try {
      await fetchTokenDetailsFromBlockchain();
      toast.success('Token details synced successfully');
      // Force re-initialization to refresh all data
      await initializeTokenDetails();
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast.error('Failed to sync token details. Please try again.');
    }
  }, [tokenAddress, chainId, address, isOnline, fetchTokenDetailsFromBlockchain, initializeTokenDetails]);

  useEffect(() => {
    if (isInitialized && tokenAddress && chainId && address) {
      initializeTokenDetails();
    }
  }, [isInitialized, tokenAddress, chainId, address, initializeTokenDetails]);



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
      // Force refresh token details to get updated data
      fetchTokenDetailsFromBlockchain().catch(console.error);
      setIsSigning(false);
    }
  }, [mintData, chainId, fetchTokenDetailsFromBlockchain]);

  useEffect(() => {
    if (reduceMaxSupplyData) {
      showTransactionToast({
        hash: reduceMaxSupplyData,
        chainId: chainId!,
        message: "Max supply updated successfully!",
      });
      // Force refresh token details
      fetchTokenDetailsFromBlockchain().catch(console.error);
      setIsSigning(false);
    }
  }, [reduceMaxSupplyData, chainId, fetchTokenDetailsFromBlockchain]);

  useEffect(() => {
    if (reduceThresholdSupplyData) {
      showTransactionToast({
        hash: reduceThresholdSupplyData,
        chainId: chainId!,
        message: "Threshold supply updated successfully!",
      });
      // Force refresh token details
      fetchTokenDetailsFromBlockchain().catch(console.error);
      setIsSigning(false);
    }
  }, [reduceThresholdSupplyData, chainId, fetchTokenDetailsFromBlockchain]);

  useEffect(() => {
    if (reduceMaxExpansionRateData) {
      showTransactionToast({
        hash: reduceMaxExpansionRateData,
        chainId: chainId!,
        message: "Max expansion rate updated successfully!",
      });
      // Force refresh token details
      fetchTokenDetailsFromBlockchain().catch(console.error);
      setIsSigning(false);
    }
  }, [reduceMaxExpansionRateData, chainId, fetchTokenDetailsFromBlockchain]);

  useEffect(() => {
    if (disableTransferRestrictionData) {
      showTransactionToast({
        hash: disableTransferRestrictionData,
        chainId: chainId!,
        message: "Transfer restriction disabled successfully!",
      });
      // Force refresh token details
      fetchTokenDetailsFromBlockchain().catch(console.error);
      setIsSigning(false);
    }
  }, [disableTransferRestrictionData, chainId, fetchTokenDetailsFromBlockchain]);

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

  // Calculate amounts based on minting mode
  useEffect(() => {
    if (mintingMode === 'mint') {
      calculateUserAmountAfterFees(mintAmount);
    }
  }, [mintAmount, calculateUserAmountAfterFees, mintingMode]);

  useEffect(() => {
    if (mintingMode === 'receive') {
      calculateMintAmountFromReceive(receiveAmount);
    }
  }, [receiveAmount, calculateMintAmountFromReceive, mintingMode]);

  const handleMint = async () => {
    try {
      setIsSigning(true);
      
      // Use the appropriate amount based on minting mode
      const amountToMint = mintingMode === 'mint' ? mintAmount : calculatedMintAmount.toString();
      
      await mint({
        abi: CONTRIBUTION_ACCOUNTING_TOKEN_ABI,
        address: tokenAddress,
        functionName: "mint",
        args: [mintToAddress as `0x${string}`, parseUnits(amountToMint, decimals)]
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

          {/* Status indicators */}
          <div className="flex justify-center items-center gap-4 mt-6">
            {/* Online/Offline Status */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 dark:bg-black/20 border border-white/30 dark:border-yellow-400/30">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-yellow-200">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Database Status */}
            {/* <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 dark:bg-black/20 border border-white/30 dark:border-yellow-400/30">
              <Database className={`h-4 w-4 ${isInitialized ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-yellow-200">
                {isInitialized ? 'Database Ready' : 'Database Error'}
              </span>
            </div> */}

            {/* Sync Button and Status */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing || !tokenAddress || !chainId || !address}
                size="sm"
                className="h-8 px-3 bg-blue-500 dark:bg-yellow-600 hover:bg-blue-600 dark:hover:bg-yellow-700 text-white text-sm rounded-full disabled:opacity-50"
              >
                {isSyncing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  "Sync"
                )}
              </Button>
              {lastSyncTime && (
                <span className="text-xs text-gray-500 dark:text-yellow-300">
                  Last sync: {lastSyncTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Simple Network Switch Banner */}
        {isWrongChain && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mb-6"
          >
            <div className="bg-gradient-to-r from-orange-50/90 to-red-50/90 dark:from-yellow-900/80 dark:to-amber-900/80 backdrop-blur-sm rounded-2xl border-2 border-orange-200/60 dark:border-yellow-400/40 p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-500 dark:from-red-500 dark:to-red-600 flex items-center justify-center shadow-lg">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-orange-800 dark:text-yellow-200">
                      Wrong Network
                    </h3>
                    <p className="text-sm text-orange-600 dark:text-yellow-300">
                      Please switch to <span className="font-semibold">{CHAIN_NAMES[chainId!]}</span> to continue
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    try {
                      switchChain({ chainId: chainId! });
                      toast.success(`Switching to ${CHAIN_NAMES[chainId!]}...`);
                    } catch (error) {
                      console.error('Failed to switch network:', error);
                      toast.error('Failed to switch network. Please switch manually in your wallet.');
                    }
                  }}
                  className="h-10 px-6 bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 hover:from-red-600 hover:to-red-700 dark:hover:from-red-600 dark:hover:to-red-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 whitespace-nowrap"
                >
                  Switch Network
                </Button>
              </div>
            </div>
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
                    <p className="text-lg font-bold text-blue-400 dark:text-yellow-200">{formatNumber(tokenDetails.maxSupply)} {tokenDetails.tokenSymbol}</p>
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
                    <p className="text-lg font-bold text-blue-400 dark:text-yellow-200">{formatNumber(tokenDetails.thresholdSupply)} {tokenDetails.tokenSymbol}</p>
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
                    <p className="text-lg font-bold text-blue-400 dark:text-yellow-200">{formatNumber(tokenDetails.maxExpansionRate)}%</p>
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
                          Max Mintable Amount: <span 
                            className="font-bold cursor-help" 
                            title={`${tokenDetails.maxMintableAmount} ${tokenDetails.tokenSymbol}`}
                          >
                            {formatNumber(tokenDetails.maxMintableAmount)} {tokenDetails.tokenSymbol}
                          </span>
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-yellow-200">
                        Current Supply: <span 
                          className="font-bold cursor-help" 
                          title={`${tokenDetails.currentSupply} ${tokenDetails.tokenSymbol}`}
                        >
                          {formatNumber(tokenDetails.currentSupply)} {tokenDetails.tokenSymbol}
                        </span>
                      </p>
                    </div>
                    {/* Minting Mode Toggle */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-center">
                        <div className="flex bg-gray-100 dark:bg-[#2a1a00] rounded-xl p-1 border border-gray-200 dark:border-yellow-400/20">
                          <Button
                            type="button"
                            onClick={() => setMintingMode('mint')}
                            className={`h-8 px-3 text-xs rounded-lg transition-all ${
                              mintingMode === 'mint'
                                ? 'bg-[#5cacc5] dark:bg-[#BA9901] text-white shadow-sm'
                                : 'bg-transparent text-gray-600 dark:text-yellow-200 hover:bg-gray-50 dark:hover:bg-[#1a1400]'
                            }`}
                          >
                            Mint by Amount
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setMintingMode('receive')}
                            className={`h-8 px-3 text-xs rounded-lg transition-all ${
                              mintingMode === 'receive'
                                ? 'bg-[#5cacc5] dark:bg-[#BA9901] text-white shadow-sm'
                                : 'bg-transparent text-gray-600 dark:text-yellow-200 hover:bg-gray-50 dark:hover:bg-[#1a1400]'
                            }`}
                          >
                            Mint by Receive
                          </Button>
                        </div>
                      </div>

                      {/* Mint Mode: User enters amount to mint */}
                      {mintingMode === 'mint' && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              id="mintAmount"
                              type="number"
                              placeholder="Enter amount to mint"
                              value={mintAmount}
                              onChange={(e) => setMintAmount(Math.min(Number(e.target.value), tokenDetails.maxMintableAmount).toString())}
                              className="h-10 text-sm bg-white/60 dark:bg-[#2a1a00] border-2 border-gray-200 dark:border-yellow-400/20 text-gray-600 dark:text-yellow-200"
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                const safeMaxAmount = Math.max(0, tokenDetails.maxMintableAmount);
                                setMintAmount(safeMaxAmount.toFixed(6));
                              }}
                              disabled={tokenDetails.maxMintableAmount === 0}
                              className="h-10 px-3 text-sm bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-xl whitespace-nowrap"
                            >
                              Max
                            </Button>
                          </div>
                          {mintAmount && !isNaN(Number(mintAmount)) && Number(mintAmount) > 0 && (
                            <div className="mt-2 p-2 rounded-xl bg-blue-50 dark:bg-yellow-400/10 border border-blue-200 dark:border-yellow-400/20">
                              <p className="text-xs text-blue-600 dark:text-yellow-200">
                                You will receive: <span 
                                  className="font-bold cursor-help" 
                                  title={`${userAmountAfterFees || 0} ${tokenDetails.tokenSymbol}`}
                                >
                                                                  {!isNaN(userAmountAfterFees) && userAmountAfterFees !== null ? (
                                  formatNumber(userAmountAfterFees)
                                ) : (
                                  "0"
                                )} {tokenDetails.tokenSymbol}
                                </span>
                                <br />
                                Clowder fee: <span 
                                  className="font-bold cursor-help" 
                                  title={`${!isNaN(userAmountAfterFees) && userAmountAfterFees !== null ? Number(mintAmount) - userAmountAfterFees : 0} ${tokenDetails.tokenSymbol}`}
                                >
                                                                  {!isNaN(userAmountAfterFees) && userAmountAfterFees !== null ? (
                                  formatNumber(Number(mintAmount) - userAmountAfterFees)
                                ) : (
                                  "0"
                                )} {tokenDetails.tokenSymbol}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Receive Mode: User enters amount to receive */}
                      {mintingMode === 'receive' && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              id="receiveAmount"
                              type="number"
                              placeholder="Enter amount recipent should receive"
                              value={receiveAmount}
                              onChange={(e) => setReceiveAmount(e.target.value)}
                              className="h-10 text-sm bg-white/60 dark:bg-[#2a1a00] border-2 border-gray-200 dark:border-yellow-400/20 text-gray-600 dark:text-yellow-200"
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                // Set a reasonable max receive amount (slightly less than max mintable due to fees)
                                const safeMaxReceiveAmount = Math.max(0, tokenDetails.maxMintableAmount * 0.99);
                                setReceiveAmount(safeMaxReceiveAmount.toFixed(6));
                              }}
                              disabled={tokenDetails.maxMintableAmount === 0}
                              className="h-10 px-3 text-sm bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-xl whitespace-nowrap"
                            >
                              Max
                            </Button>
                          </div>
                          {receiveAmount && !isNaN(Number(receiveAmount)) && Number(receiveAmount) > 0 && (
                            <div className="mt-2 p-2 rounded-xl bg-green-50 dark:bg-green-400/10 border border-green-200 dark:border-green-400/20">
                              <p className="text-xs text-green-600 dark:text-green-200">
                                Amount to mint: <span 
                                  className="font-bold cursor-help" 
                                  title={`${calculatedMintAmount || 0} ${tokenDetails.tokenSymbol}`}
                                >
                                                                  {!isNaN(calculatedMintAmount) && calculatedMintAmount !== null ? (
                                  formatNumber(calculatedMintAmount)
                                ) : (
                                  "0"
                                )} {tokenDetails.tokenSymbol}
                                </span>
                                <br />
                                Clowder fee: <span 
                                  className="font-bold cursor-help" 
                                  title={`${!isNaN(calculatedMintAmount) && calculatedMintAmount !== null ? calculatedMintAmount - Number(receiveAmount) : 0} ${tokenDetails.tokenSymbol}`}
                                >
                                                                  {!isNaN(calculatedMintAmount) && calculatedMintAmount !== null ? (
                                  formatNumber(calculatedMintAmount - Number(receiveAmount))
                                ) : (
                                  "0"
                                )} {tokenDetails.tokenSymbol}
                                </span>
                              </p>
                            </div>
                          )}
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
                      disabled={
                        !mintToAddress || 
                        isMinting || 
                        isSigning || 
                        (!isUserMinter && !isUserAdmin) ||
                        (mintingMode === 'mint' && (!mintAmount || isNaN(Number(mintAmount)) || Number(mintAmount) <= 0)) ||
                        (mintingMode === 'receive' && (!receiveAmount || isNaN(Number(receiveAmount)) || Number(receiveAmount) <= 0 || calculatedMintAmount <= 0))
                      }
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
